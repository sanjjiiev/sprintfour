---



# Glassbox – Trust & Explainability for Document Anonymization

**Sprintfour Hackathon 2026 – Submission for Problem 1 (Marcus)**

Glassbox is a full-stack application that redacts personally identifiable information (PII) from documents and **explains every decision**. It shows why a span was hidden and why another span was left visible, helping users trust the anonymization process.

**Live Demo**: Add the hosted URL here if available.

---

## Problem Statement

Marcus has a sensitive document that he wants to paste into an AI tool, but he does not trust a black-box redaction service. He wants to know:

- Why was this piece redacted?
- Why was that piece kept visible?
- Can he override the tool's decision?

Glassbox answers these questions with a clickable document viewer, an inspector panel that explains the reasoning, and manual override controls.

---

## Features

- **Zero-data leakage** – raw text never leaves the backend; only redacted text and metadata are sent to the client.
- **Token-level explanations** – each word or phrase is annotated with its entity type, confidence score, and a plain-English reason.
- **Confidence gauge** – color-coded indicators show how certain the model is about each decision.
- **Context highlights** – the inspector displays the surrounding words that triggered detection.
- **Manual overrides** – users can toggle any decision between redact and keep visible with one click.
- **Real-time updates** – paste new text and the analysis runs instantly.

---

## Tech Stack

| Layer                   | Technology                                             |
| ----------------------- | ------------------------------------------------------ |
| **Backend**       | Python 3.13, FastAPI, Uvicorn                          |
| **PII Detection** | Microsoft Presidio (Analyzer + Anonymizer) + spaCy NLP |
| **Frontend**      | React 18, Vite, Tailwind CSS                           |
| **Communication** | REST API (JSON), CORS for local development            |

---

## Project Structure

```text
glassbox/
├── backend/
│   ├── main.py               # FastAPI app and endpoints
│   ├── models.py             # Pydantic schemas
│   ├── service.py            # PII detection and anonymization logic
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Optional environment variables
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/
│       │   ├── DocumentViewer.jsx
│       │   └── InspectorPanel.jsx
│       └── styles/
│           └── index.css
├── README.md
└── .gitignore
```



## Setup & Run Locally

### Prerequisites

- **Python 3.13** (or 3.12 if you encounter build issues)
- **Node.js** 18+
- **npm** or **yarn**
- A C++ compiler for building native extensions, required only if installing Presidio from source

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Upgrade pip and build tools
pip install --upgrade pip setuptools wheel

# Install dependencies (including Presidio from GitHub for Python 3.13)
pip install -r requirements.txt

# Download the spaCy language model
python -m spacy download en_core_web_sm

# Start the server
uvicorn main:app --reload --port 8000
```

> **Note**: The requirements file installs Presidio directly from GitHub to support Python 3.13. If you prefer a simpler setup, use Python 3.12 and change the dependencies to `presidio-analyzer` and `presidio-anonymizer` from PyPI.

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at **http://localhost:5173**.

---

## How to Test

1. Open **http://localhost:5173** in your browser.
2. You will see a sample document pre-filled in the text area: "My email is john.doe@example.com and my phone is 555-123-4567. Also, my name is John Doe."
3. Click the **Anonymize** button (or edit the text and click again).
4. The document is rendered below as interactive tokens:
   - Red background = **REDACTED**
   - Green background = **KEPT VISIBLE**
5. Click any token. The **Inspector Panel** on the right shows the entity type, confidence score, reason, and context tokens.
6. Use the **Unredact / Redact** button to manually override the decision.

You can paste any text. The system will automatically detect names, emails, phone numbers, and other PII.

---

## API Endpoints

| Method   | Endpoint              | Description                                                                                            |
| -------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| `POST` | `/api/v1/anonymize` | Accepts`{"text": "..."}` and returns an `AnonymizeResponse` with `sanitized_text` and `spans`. |
| `GET`  | `/api/v1/health`    | Returns`{"status": "ok"}` for health checks.                                                         |

### Example Request

```bash
curl -X POST http://localhost:8000/api/v1/anonymize \
  -H "Content-Type: application/json" \
  -d '{"text":"My phone is 555-1234"}'
```

### Response Structure

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

## Configuration

You can tweak the detection threshold by editing `CONFIDENCE_THRESHOLD` in `backend/service.py` (default `0.5`). Higher values make the tool more conservative and keep more text visible.

---

## Architecture Deep Dive

1. **User submits text** – the frontend sends it to the backend through a `POST` request.
2. **PII detection** – Microsoft Presidio analyzes the text using regex, checksum-like checks, and spaCy NER.
3. **Anonymization** – all detected entities with confidence greater than or equal to the threshold are replaced with `[REDACTED]`.
4. **Span generation** – the backend builds a list of `EntityExplanation` objects that cover the entire document, each with:
   - The actual text segment
   - Entity type such as `PERSON`, `PHONE_NUMBER`, or `SAFE_TEXT`
   - Decision (`REDACTED` or `KEPT_VISIBLE`)
   - Confidence score
   - Human-readable reason
   - Surrounding context tokens for transparency
5. **Response** – the client receives only the redacted text and the span metadata, never the original raw text.
6. **Rendering** – the React app renders each span as a clickable element.
7. **Inspector** – clicking a span displays its metadata in a side panel.
8. **Overrides** – the user can toggle a decision locally; this does not affect the server, but it could be extended to persist changes.

---

## Contributing

This is a hackathon project, but feel free to fork and extend it. Some ideas include:

- Add multi-document batch processing.
- Persist user overrides with a simple database.
- Integrate a cloud LLM for more flexible detection.

---

## License

MIT – use freely for educational and hackathon purposes.

---

## Troubleshooting

| Issue                                   | Solution                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **ModuleNotFoundError: presidio** | Ensure you installed Presidio from GitHub as shown in the setup steps. Try Python 3.12 if builds fail. |
| **spaCy model missing**           | Run`python -m spacy download en_core_web_sm` again.                                                  |
| **Frontend PostCSS error**        | Make sure`postcss.config.js` uses ES module syntax with `export default`.                          |
| **CORS error**                    | Check that the backend allows`http://localhost:5173` in `main.py`.                                 |
| **Port 8000 already in use**      | Change the port with`--port 8001` and update the Vite proxy settings if needed.                      |

---

*Built with care for the Sprintfour Hackathon 2026*