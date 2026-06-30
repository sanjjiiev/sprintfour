
## **Glassbox**

**Glassbox** is a full‑stack document anonymization tool designed to solve **both Problem 1 (Trust) and Problem 3 (Correction)** . For Marcus, who refuses to trust a black‑box redaction service, Glassbox **explains every decision** – every token (redacted or visible) is clickable, revealing the entity type, confidence score, and a plain‑English reason. The inspector panel answers his constant question: *“Why this, and why not that?”*

For Sam, who must quickly correct the tool’s mistakes, Glassbox provides a **correction‑first experience**. The **Risk Summary** shows redacted/visible counts and overrides at a glance. The **Entity Filter** lets Sam focus on high‑risk categories (e.g., emails, phone numbers) to spot missed PII. Clicking any token immediately shows why it was hidden or kept, and the **one‑click override** lets him flip a decision instantly – all overrides are applied to the downloaded file, ensuring his corrections are final.

**What makes Glassbox unique** is the fusion of trust and correction workflows:

- **Copy Redacted** – copy the final redacted text to the clipboard with one click.
- **Format‑preserving input/output** – upload `.txt`, `.docx`, or `.pdf`; the backend extracts text for preview and **downloads a permanently redacted file** in the original format (PDF with black rectangles, DOCX with `[REDACTED]` and black highlight).
- **Manual overrides persist to download** – Sam’s fixes are honoured in the final file.

**Security is paramount** – raw text never leaves the backend; only the redacted version and metadata are transmitted. PDF redactions use PyMuPDF’s permanent annotations, making text unrecoverable.

**Why Presidio instead of an LLM** – this is a deliberate design choice, not a limitation. Sending sensitive documents to a cloud LLM (OpenAI, Gemini, Claude) is self‑defeating: you are transmitting the very data you are trying to protect to a third‑party server *before* it has been anonymised. Presidio processes everything **100% locally**, so no raw PII ever leaves the deployment environment. Beyond privacy, LLMs are **non‑deterministic** – the same document can produce different redactions on different runs, which is unacceptable in compliance and legal contexts. Presidio uses **rule‑based recognisers (regex, Luhn checksums) and spaCy NER** that give consistent, auditable results every time; every decision maps directly to a named recogniser with a confidence score and character offsets. This structural explainability is what powers Glassbox's inspector – the reason text is a property of the detection algorithm, not a generated afterthought. Finally, LLM inference adds latency and per‑token API cost that scales with document size; Presidio runs in‑process with sub‑100 ms response times and zero marginal cost per analysis. The one area where an LLM would outperform Presidio is *contextual or implicit* PII (e.g., a nickname that is only sensitive given surrounding text); a future hybrid – Presidio for structured PII, an on‑device LLM for edge cases – would offer the best of both worlds without sacrificing privacy.

**What we deliberately left out**:

- **Batch processing** – unnecessary for trust and correction; both users need to focus on one document at a time.
- **User accounts / persistence** – the core value is interactive clarity, not storage.
- **Custom rule creation** – Presidio’s detectors suffice; adding a rule editor would distract from explainability.
- **OCR for scanned PDFs** – would add heavy dependencies; we warn users and suggest text‑based files.

These choices prioritise **clarity, speed, and control** – Marcus gains confidence through transparency, while Sam catches and fixes mistakes effortlessly. Glassbox transforms a skeptical user into a confident one and turns a rushed reviewer into an effective editor.

