---
title: Glassbox
emoji: 🔍
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---


# Glassbox – Trust & Explainability for Document Anonymization

**Sprintfour Hackathon 2026 – Submission for Problem 1 (Marcus) and Problem 3 (Sam)**

Glassbox is a full-stack document anonymization tool that **redacts PII** from text, PDF, and DOCX files, and **explains every decision** – why a piece was hidden and why another was left visible. It is designed to build trust with sceptical users like Marcus, while also giving fast reviewers like Sam a clear correction workflow to catch false positives and missed sensitive content.

Live Demo: [https://Sanjjiiev-glassbox.hf.space](https://huggingface.co/spaces/Sanjjiiev/glassbox)

Demo Video: [CLICK HERE](https://drive.google.com/file/d/1qxtUVePAGXL7YpsKNAUCIrXk6RoBntz5/view?usp=sharing)

---

## The Problem We Solve

Glassbox is built to address two core hackathon scenarios:

- **Problem 1: Trust and Explainability (Marcus)**Marcus is anxious about using AI tools on sensitive documents. He has heard stories of “redacted” documents where the information was still recoverable. He will not adopt a tool he cannot interrogate.

  **Glassbox answers his constant question:** *“Why this, and why not that?”*Every token shows why it was redacted or kept visible, with a confidence score, entity type, and context.
- **Problem 3: Fixing the Tool’s Mistakes (Sam)**
  Sam is moving quickly and trusts the tool a little too much. The model may hide harmless content or miss PII that should have been redacted.

  **Glassbox gives Sam a correction experience:** click a token, inspect the explanation, and instantly toggle the decision between redacted and visible. The risk summary, confidence view, and entity filter help him catch mistakes before they slip through.

---

## Features

- **Zero‑data leakage** – raw text never leaves the backend; only redacted text and metadata are sent to the client.
- **Explainable redactions for Problem 1** – every token shows why it was redacted or why it was kept visible, making the decision process inspectable.
- **Confidence gauge** – colour‑coded risk indicators (red/yellow/green) help users quickly gauge certainty.
- **Context highlights** – the inspector displays surrounding words that triggered the detection, so the user can understand the basis for the model’s decision.
- **Fast correction workflow for Problem 3** – a reviewer can identify false positives and missed PII, then toggle a token with one click.
- **Risk Summary** – at a glance: total tokens, redacted, visible, overrides, and average confidence, helping Sam spot suspicious areas quickly.
- **Entity Type Filter** – filter the document view by entity type (e.g., PERSON, EMAIL) to focus on specific categories and review mistakes faster.
- **Multi‑format input** – paste text, upload `.txt`, `.docx`, or `.pdf`. Text is extracted and anonymised.
- **Format‑preserving download** – download the redacted file in its original format (PDF with black rectangles, DOCX with `[REDACTED]` and black highlight, or plain `.txt`).
- **Copy Redacted** – copy the redacted text to your clipboard with one click.
- **Real‑time updates** – edit the text or upload a new file, and the analysis runs instantly.
- **Deployed on Hugging Face Spaces** – accessible anywhere, with a fully containerised stack.

---

## Tech Stack

| Layer                         | Technology                                                               |
| ----------------------------- | ------------------------------------------------------------------------ |
| **Backend**             | Python 3.11, FastAPI, Uvicorn                                            |
| **PII Detection**       | Microsoft Presidio (Analyzer + Anonymizer) + spaCy`en_core_web_sm`     |
| **Document Processing** | PyMuPDF (PDF),`python-docx` (DOCX), `mammoth` (DOCX text extraction) |
| **Frontend**            | React 18, Vite, Tailwind CSS                                             |
| **Communication**       | REST API (JSON for text, multipart/form-data for file uploads)           |
| **Deployment**          | Docker, Hugging Face Spaces                                              |

---

## Why Presidio Instead of an LLM?

This is a deliberate architectural decision and a core strength of Glassbox.

### Privacy-First by Design

Sending documents to a cloud-hosted LLM (OpenAI, Gemini, Claude, etc.) for redaction is **self-defeating** — you are transmitting the very sensitive data you are trying to protect to a third-party server before it has been anonymized. Presidio processes everything **100% locally**, so the raw text never leaves the user's machine or your own infrastructure.

### Deterministic & Auditable

LLMs are **non-deterministic** — the same input can produce different redactions on different runs. This is unacceptable in compliance and legal contexts where auditability is required. Presidio uses **rule-based recognisers (regex, checksums) and NLP models (spaCy NER)** that produce consistent, reproducible results every time. Every decision can be traced to a specific recogniser rule.

### Speed & Cost at Scale

LLM inference adds **hundreds of milliseconds to seconds** of latency per request and incurs **per-token API costs** that grow with document size. Presidio runs in-process with **sub-100ms response times** for typical documents and **zero marginal cost** per analysis after deployment.

### Compliance-Friendly Entities

Presidio ships with **30+ pre-built PII recognisers** covering GDPR, HIPAA, CCPA, and other regulatory frameworks — credit cards (Luhn-checked), US SSNs, IBANs, IP addresses, email, phone numbers, dates, and more. These are validated against real-world patterns, not learned probabilistically from training data.

### Explainability Is Structural, Not Promped

With an LLM, generating an explanation for each redaction would require a second prompt round-trip and still produce a natural-language justification that cannot be independently verified. Presidio's `RecognizerResult` directly exposes the **recogniser name, confidence score, matched pattern, and character offsets** — the explanation is a structural property of the detection, not a generated afterthought.

### When an LLM Would Be Better

LLMs excel at **contextual understanding** of novel or implicit PII (e.g., redacting a person's nickname only when context implies it is sensitive). A future hybrid approach — Presidio for reliable structured PII, an on-device LLM for contextual edge cases — would offer the best of both worlds without sacrificing privacy.

---

## Security Features

Glassbox is designed with a defense-in-depth security model to ensure sensitive data is never leaked, exposed, or un-redacted in transit or storage.

### 1. Zero-Data Retention & Local Processing
- **No Database or Storage**: Glassbox does not run a database, cache, or long-term file storage. The raw text and uploaded documents are parsed, processed in-memory, and returned to the client immediately.
- **Local Sandbox Execution**: Since the application uses Microsoft Presidio and spaCy, all PII detection, analysis, and redaction are performed locally within the backend server boundaries. No data is sent to external APIs or cloud services.

### 2. Permanent PDF Redaction (Not Just Visual Cover)
- **True Content Deletion**: Drawing black rectangles over text inside a PDF is insecure because the underlying raw characters remain selectable, searchable, and copyable. Glassbox uses PyMuPDF's (`fitz`) programmatic annotation and redaction engine:
  - `add_redact_annot()` identifies the physical bounding boxes of PII text.
  - `apply_redactions()` permanently deletes the text characters, images, and graphics coordinates from the PDF stream.
  - `doc.save(garbage=4, deflate=True)` scrubs the PDF metadata, structural tables, and references, ensuring the redacted contents are completely unrecoverable.

### 3. XML-Level DOCX Redaction
- **Literal Text Replacement**: DOCX files are zip archives containing raw XML files. Simply styling text with black highlights leaves the source words fully readable. Glassbox parses the document runs, completely removes the target text strings, replaces them with the string `"[REDACTED]"`, and styles the text run in white font with black highlight. The original text is completely expunged from the underlying XML structure.

### 4. Zero-Leakage Client Payload
- **Sanitized-Only Transmission**: The original raw text is never sent back to the frontend in the API response. The frontend only receives the redacted text and metadata coordinates (the span offsets, entity categories, and confidence scores).
- **Secure File Uploads**: Uploaded files are streamed directly into memory buffer bytes, avoiding any temporary file generation on the disk that could be read by other processes.

### 5. Deterministic Defense Against Prompt Injections
- **No LLM Vulnerabilities**: Because Glassbox does not rely on LLMs, it is completely immune to prompt injection attacks, system prompt leaks, or jailbreaking attempts that trick the detector into bypassing or revealing PII.

---


```text
glassbox/
├── backend/
│   ├── __init__.py          # Makes backend a Python package
│   ├── main.py              # FastAPI app & endpoints
│   ├── models.py            # Pydantic schemas
│   ├── service.py           # PII detection, anonymization, span building
│   ├── file_service.py      # PDF/DOCX redaction with overrides
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # (optional) environment variables
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── components/
│   │   │   ├── DocumentViewer.jsx
│   │   │   └── InspectorPanel.jsx
│   │   └── styles/
│   │       └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── Dockerfile               # Multi‑stage build for HF Spaces
├── README.md                # This file
└── .gitignore
```

---

## Setup & Run Locally

### Prerequisites

- **Python 3.11** (3.12 also works)
- **Node.js** 18+
- **npm** or **yarn**

### 1. Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Upgrade pip & build tools
pip install --upgrade pip setuptools wheel

# Install dependencies (Presidio installed from GitHub for reliability)
pip install -r requirements.txt

# Download spaCy model
pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1-py3-none-any.whl

# Start the server (from the project root, not inside backend/)
cd ..
uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at **http://localhost:5173**, with API requests proxied to `localhost:8000`.

---

## Deployment (Hugging Face Spaces)

This repository is configured for automatic deployment to Hugging Face Spaces via GitHub Actions. The workflow pushes the code to the Space, which builds the Docker image and serves the app on port `7860`.

The Space is live at: [https://Sanjjiiev-glassbox.hf.space](https://huggingface.co/spaces/Sanjjiiev/glassbox)

To deploy your own copy:

1. Create a Space with **Docker** SDK.
2. Add your `HF_TOKEN` as a secret in GitHub Actions.
3. Update the `repo` name in the workflow and push.

---

## How to Use

1. **Open the app** – either locally or at the live URL.
2. **Paste text** or **upload a file** (.txt, .docx, .pdf).
3. **Review the suggested redactions** – tokens are colour‑coded:
   - **REDACTED** – sensitive information removed.
   - **KEPT_VISIBLE** – safe text.
4. **Click any token** — highlighted *or* plain text — the Inspector Panel on the right shows:
   - Entity type (e.g., `EMAIL_ADDRESS`)
   - Confidence score (with colour indicator)
   - Explanation (why it was redacted or kept)
   - Context tokens that support the decision
5. **Fix mistakes quickly** – if the tool over-redacts or misses a sensitive value, use the **Unredact / Redact** button to correct it immediately.
6. **Use the summary and filters** – the risk summary and entity filters help Sam scan for suspicious areas and focus on likely false positives or missed detections.
7. **Download the redacted file** – click the **Download** button to get a redacted version in the original format (PDF, DOCX, or TXT). Your manual overrides are applied to the downloaded file.
8. **Copy redacted text** – use the **Copy** button to copy the redacted version to your clipboard.

---

## API Endpoints

| Method   | Endpoint                     | Description                                                                                         |
| -------- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `POST` | `/api/v1/anonymize`        | Accepts`{"text": "..."}` and returns `AnonymizeResponse` with `sanitized_text` and `spans`. |
| `POST` | `/api/v1/redact-pdf`       | Upload a PDF, optionally with`overrides` JSON, returns a redacted PDF.                            |
| `POST` | `/api/v1/redact-docx`      | Upload a DOCX, optionally with`overrides` JSON, returns a redacted DOCX.                          |
| `POST` | `/api/v1/extract-pdf-text` | Upload a PDF, returns extracted text (used by frontend for preview).                                |
| `GET`  | `/api/v1/health`           | Health check.                                                                                       |

**Example `POST /api/v1/anonymize` request:**

```bash
curl -X POST http://localhost:8000/api/v1/anonymize \
  -H "Content-Type: application/json" \
  -d '{"text":"My phone is 555-1234"}'
```

**Response:**

```json
{
  "sanitized_text": "My phone is [REDACTED]",
  "spans": [
    {
      "id": "...",
      "text_segment": "My phone is ",
      "entity_type": "SAFE_TEXT",
      "action": "KEPT_VISIBLE",
      "confidence": 1.0,
      "logic_reason": "No sensitive pattern matched.",
      "context_tokens": []
    },
    {
      "id": "...",
      "text_segment": "555-1234",
      "entity_type": "PHONE_NUMBER",
      "action": "REDACTED",
      "confidence": 0.85,
      "logic_reason": "Identified as PHONE_NUMBER with confidence 0.85.",
      "context_tokens": ["My", "phone", "is"]
    }
  ]
}
```

---

## Architecture Deep Dive

1. **User submits text or file** – the frontend sends it to the backend (text as JSON, files as multipart form data).
2. **Text extraction** – for PDF/DOCX, the backend extracts plain text using `PyMuPDF` or `python-docx`.
3. **PII detection** – Microsoft Presidio analyses the text using regex, checksums, and spaCy NER.
4. **Anonymization** – detected entities with confidence ≥ `CONFIDENCE_THRESHOLD` are replaced with `[REDACTED]`. Overrides are applied if provided.
5. **Span generation** – the backend builds a list of `EntityExplanation` objects covering the entire document, each with:
   - Text segment
   - Entity type or `SAFE_TEXT`
   - Action (`REDACTED` / `KEPT_VISIBLE`)
   - Confidence score
   - Human‑readable reason
   - Context tokens (surrounding words)
6. **Response** – client receives only the redacted text and span metadata (never the original raw text).
7. **Rendering** – React renders each span as a clickable element with colour coding.
8. **Inspector** – clicking a span shows detailed metadata in a side panel.
9. **Overrides** – user toggles are stored in React state and reflected in the preview and downloads.
10. **Download** – for PDF/DOCX, the backend re‑redacts the original file using the same detection and overrides, producing a permanent redacted file.

---

## What We Chose NOT to Build (Tradeoffs)

- **Batch processing** – not needed for the trust use case; Marcus wants to understand one document deeply.
- **User accounts / persistence** – the core value is the interactive transparency, not long‑term storage.
- **Custom rule creation** – Presidio’s built‑in detectors are sufficient; building a rule editor would distract from explainability.
- **OCR for scanned PDFs** – would add heavy dependencies; we alert users to use text‑based files.
- **Perfect PDF bounding‑box redaction** – we use search‑and‑replace with redaction annotations, which is effective for most use cases but may miss split‑line entities; acceptable for the hackathon.
- **Full DOCX formatting preservation** – we preserve bold/italic/underline but not all styles; sufficient for redaction.
- **Context token extraction** – we left it as an empty list for simplicity, but the architecture supports it.

---

## Configuration

- `CONFIDENCE_THRESHOLD` in `service.py` – default `0.5`. Increase to be more conservative (fewer redactions).
- `ENVIRONMENT=production` – serves the static frontend from `/app/frontend/dist` (set in Dockerfile).

---

## Troubleshooting

| Issue                                             | Solution                                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **ModuleNotFoundError** for backend modules | Ensure`backend/__init__.py` exists and all imports are relative (e.g., `from .service import ...`).                                    |
| **spaCy model not found**                   | Run`pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1-py3-none-any.whl`. |
| **PDF text extraction fails**               | Make sure the PDF is text‑based (not scanned). The backend will return an error.                                                          |
| **CORS errors**                             | Check`ALLOWED_ORIGINS` in `main.py`; add your frontend origin.                                                                         |
| **Port conflicts**                          | Change the backend port and update the Vite proxy accordingly.                                                                             |

---

## License

MIT – free to use for educational and hackathon purposes.

---

*Built with care for the Sprintfour Hackathon 2026 – making anonymisation transparent, trustworthy, and user‑friendly.*

