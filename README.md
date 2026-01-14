# visual-ai-qa# Visual AI QA (FastAPI + React)

MVP end-to-end: subís una imagen, corre detección con YOLOv8 y te devuelve tags/detecciones. Persistencia simple en SQLite.

El objetivo del proyecto es demostrar integración real de **Visual AI en un producto**, ownership end-to-end y buenas prácticas de arquitectura.

---

## Features
- Upload de imágenes
- Detección de objetos (YOLOv8)
- Configuración de confidence threshold
- Persistencia de imágenes y detecciones
- Gallery con filtros por tag y confianza
- Frontend servido en modo producción con Nginx
- Dockerización completa (frontend + backend)

---

## Tech Stack
- **Backend:** Python, FastAPI, YOLOv8 (Ultralytics)
- **Frontend:** React, Vite
- **Database:** SQLite
- **Infra:** Docker, Docker Compose, Nginx

---

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

## Run with Docker (recommended)

Requisitos:
- Docker
- Docker Compose

Desde la raíz del proyecto:

```bash
docker compose up --build
```