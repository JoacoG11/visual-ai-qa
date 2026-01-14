from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from datetime import datetime, timezone
import uuid
from typing import Optional

from ultralytics import YOLO
from PIL import Image

from .db import init_db, get_conn

APP_DIR = Path(__file__).resolve().parent
STORAGE_DIR = APP_DIR / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Visual AI QA", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir imágenes subidas
app.mount("/files", StaticFiles(directory=str(STORAGE_DIR)), name="files")

# Cargamos modelo
model = YOLO("yolov8n.pt")

@app.on_event("startup")
def _startup():
    init_db()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/images")
async def upload_image(file: UploadFile = File(...), conf: float = 0.35):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes.")

    # Guardar archivo
    ext = Path(file.filename or "").suffix.lower() or ".jpg"
    safe_name = f"{uuid.uuid4().hex}{ext}"
    stored_path = STORAGE_DIR / safe_name

    content = await file.read()
    stored_path.write_bytes(content)

    # Abrir con PIL para asegurar formato válido
    try:
        img = Image.open(stored_path)
        img.verify()
    except Exception:
        stored_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Imagen inválida o corrupta.")

    # Inferencia (ultralytics lee path)
    results = model.predict(source=str(stored_path), conf=conf, verbose=False)
    r0 = results[0]

    detections = []
    if r0.boxes is not None and len(r0.boxes) > 0:
        names = r0.names  # dict: class_id -> label
        for b in r0.boxes:
            cls_id = int(b.cls[0].item())
            label = names.get(cls_id, str(cls_id))
            confidence = float(b.conf[0].item())
            x1, y1, x2, y2 = [float(x) for x in b.xyxy[0].tolist()]
            detections.append({
                "label": label,
                "confidence": confidence,
                "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2}
            })

    created_at = datetime.now(timezone.utc).isoformat()

    # Guardar en DB
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO images (filename, stored_path, created_at) VALUES (?, ?, ?)",
        (file.filename or safe_name, safe_name, created_at)
    )
    image_id = cur.lastrowid

    for d in detections:
        bb = d["bbox"]
        cur.execute(
            """INSERT INTO detections
               (image_id, label, confidence, x1, y1, x2, y2)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (image_id, d["label"], d["confidence"], bb["x1"], bb["y1"], bb["x2"], bb["y2"])
        )

    conn.commit()
    conn.close()

    tags = sorted(list({d["label"] for d in detections}))
    return {
        "image": {
            "id": image_id,
            "original_filename": file.filename,
            "url": f"http://localhost:8000/files/{safe_name}",
            "created_at": created_at
        },
        "tags": tags,
        "detections": detections
    }

@app.get("/images")

def list_images(tag: Optional[str] = None, min_conf: float = 0.0, limit: int = 20):
    conn = get_conn()
    cur = conn.cursor()

    if tag:
        cur.execute(
            """
            SELECT DISTINCT i.id, i.filename, i.stored_path, i.created_at
            FROM images i
            JOIN detections d ON d.image_id = i.id
            WHERE d.label = ? AND d.confidence >= ?
            ORDER BY i.id DESC
            LIMIT ?
            """,
            (tag, min_conf, limit)
        )
    else:
        cur.execute(
            """
            SELECT i.id, i.filename, i.stored_path, i.created_at
            FROM images i
            ORDER BY i.id DESC
            LIMIT ?
            """,
            (limit,)
        )

    rows = [dict(r) for r in cur.fetchall()]
    conn.close()

    for r in rows:
        r["url"] = f"http://localhost:8000/files/{r['stored_path']}"
    return {"items": rows}

@app.get("/images/{image_id}")
def get_image(image_id: int):
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("SELECT * FROM images WHERE id = ?", (image_id,))
    img = cur.fetchone()
    if not img:
        conn.close()
        raise HTTPException(status_code=404, detail="No existe esa imagen")

    cur.execute(
        "SELECT label, confidence, x1, y1, x2, y2 FROM detections WHERE image_id = ? ORDER BY confidence DESC",
        (image_id,)
    )
    dets = []
    for d in cur.fetchall():
        dets.append({
            "label": d["label"],
            "confidence": d["confidence"],
            "bbox": {"x1": d["x1"], "y1": d["y1"], "x2": d["x2"], "y2": d["y2"]}
        })

    conn.close()
    return {
        "image": {
            "id": img["id"],
            "filename": img["filename"],
            "url": f"http://localhost:8000/files/{img['stored_path']}",
            "created_at": img["created_at"]
        },
        "tags": sorted(list({x["label"] for x in dets})),
        "detections": dets
    }
