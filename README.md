
# Glassbox – Trust & Explainability for Document Anonymization

**Hackathon submission for Problem 1 (Marcus).**

Glassbox is a full‑stack application that redacts PII and explains every decision to build user trust. It uses Microsoft Presidio for detection, FastAPI for the backend, and React + Tailwind for the frontend.

## Features

- **Server‑side redaction** – raw text never leaves the backend.
- **Token‑level explanations** – each segment shows why it was redacted or kept.
- **Confidence & context** – visual risk indicators and surrounding words that triggered detection.
- **Manual overrides** – users can flip any decision instantly.

## Run Locally

1. **Backend** (Python 3.10+)
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate   # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   uvicorn main:app --reload --port 8000
   ```

