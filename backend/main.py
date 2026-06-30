from fastapi import FastAPI, HTTPException, File, UploadFile, Response, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import traceback
import fitz
import json
import os

# --- Relative imports (for backend package) ---
from .service import process_document
from .models import AnonymizeResponse
from .file_service import redact_pdf, redact_docx

app = FastAPI(title="Glassbox API", version="1.0")

# --- CORS Configuration ---
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]
if os.getenv("ENVIRONMENT") == "production":
    ALLOWED_ORIGINS.append("*")   # or add your specific Space URL

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class AnonymizeRequest(BaseModel):
    text: str

class ExtractTextResponse(BaseModel):
    text: str

# --- API Endpoints ---
@app.post("/api/v1/anonymize", response_model=AnonymizeResponse)
async def anonymize(req: AnonymizeRequest):
    try:
        return process_document(req.text)
    except Exception as e:
        print("\n" + "=" * 60)
        traceback.print_exc()
        print("=" * 60 + "\n")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}

@app.post("/api/v1/redact-pdf")
async def redact_pdf_endpoint(
    file: UploadFile = File(...),
    overrides: str = Form(None)
):
    try:
        pdf_bytes = await file.read()
        overrides_dict = json.loads(overrides) if overrides else {}
        redacted = redact_pdf(pdf_bytes, overrides_dict)
        return Response(
            content=redacted,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=redacted.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/redact-docx")
async def redact_docx_endpoint(
    file: UploadFile = File(...),
    overrides: str = Form(None)
):
    try:
        docx_bytes = await file.read()
        overrides_dict = json.loads(overrides) if overrides else {}
        redacted = redact_docx(docx_bytes, overrides_dict)
        return Response(
            content=redacted,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=redacted.docx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/extract-pdf-text", response_model=ExtractTextResponse)
async def extract_pdf_text(file: UploadFile = File(...)):
    try:
        pdf_bytes = await file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        full_text = ""
        for page in doc:
            full_text += page.get_text("text") + "\n"
        doc.close()
        if not full_text.strip():
            raise HTTPException(status_code=400, detail="No text found in PDF.")
        return {"text": full_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Serve Static Frontend (for production deployment) ---
if os.getenv("ENVIRONMENT") == "production":
    frontend_dir = "/app/frontend/dist"
    if os.path.exists(frontend_dir):
        app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
        print(f"Serving frontend from {frontend_dir}")
    else:
        print(f"Warning: Frontend directory {frontend_dir} not found. API only.")

# --- Catch-all route for SPA (must be last) ---
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    frontend_dir = "/app/frontend/dist"
    if os.getenv("ENVIRONMENT") == "production" and os.path.exists(frontend_dir):
        index_path = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
    return {"message": "Glassbox API is running. Frontend not available."}