from fastapi import FastAPI, HTTPException, File, UploadFile, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from service import process_document
from models import AnonymizeResponse
from file_service import redact_pdf, redact_docx
import traceback

app = FastAPI(title="Glassbox API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnonymizeRequest(BaseModel):
    text: str

@app.post("/api/v1/anonymize", response_model=AnonymizeResponse)
async def anonymize(req: AnonymizeRequest):
    try:
        return process_document(req.text)
    except Exception as e:
        print("\n" + "="*60)
        traceback.print_exc()
        print("="*60 + "\n")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}

@app.post("/api/v1/redact-pdf")
async def redact_pdf_endpoint(file: UploadFile = File(...)):
    try:
        pdf_bytes = await file.read()
        redacted = redact_pdf(pdf_bytes)
        return Response(content=redacted, media_type="application/pdf",
                        headers={"Content-Disposition": "attachment; filename=redacted.pdf"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/redact-docx")
async def redact_docx_endpoint(file: UploadFile = File(...)):
    try:
        docx_bytes = await file.read()
        redacted = redact_docx(docx_bytes)
        return Response(content=redacted,
                        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        headers={"Content-Disposition": "attachment; filename=redacted.docx"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))