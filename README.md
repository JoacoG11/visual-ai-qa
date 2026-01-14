# visual-ai-qa# Visual AI QA (FastAPI + React)

MVP end-to-end: subís una imagen, corre detección con YOLOv8 y te devuelve tags/detecciones. Persistencia simple en SQLite.

## Run backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install fastapi uvicorn python-multipart pillow ultralytics
uvicorn app.main:app --reload --port 8000
```

Backend docs: http://localhost:8000/docs

```bash
## Run frontend
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173
