from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from service import process_document
from models import AnonymizeResponse
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