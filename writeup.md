
## **Glassbox**

**Glassbox** is a full‑stack document anonymization tool designed to solve **both Problem 1 (Trust) and Problem 3 (Correction)** . For Marcus, who refuses to trust a black‑box redaction service, Glassbox **explains every decision** – every token (redacted or visible) is clickable, revealing the entity type, confidence score, and a plain‑English reason. The inspector panel answers his constant question: *“Why this, and why not that?”*

For Sam, who must quickly correct the tool’s mistakes, Glassbox provides a **correction‑first experience**. The **Risk Summary** shows redacted/visible counts and overrides at a glance. The **Entity Filter** lets Sam focus on high‑risk categories (e.g., emails, phone numbers) to spot missed PII. Clicking any token immediately shows why it was hidden or kept, and the **one‑click override** lets him flip a decision instantly – all overrides are applied to the downloaded file, ensuring his corrections are final.

**What makes Glassbox unique** is the fusion of trust and correction workflows:

- **Copy Redacted** – copy the final redacted text to the clipboard with one click.
- **Format‑preserving input/output** – upload `.txt`, `.docx`, or `.pdf`; the backend extracts text for preview and **downloads a permanently redacted file** in the original format (PDF with black rectangles, DOCX with `[REDACTED]` and black highlight).
- **Manual overrides persist to download** – Sam’s fixes are honoured in the final file.

**Security is paramount** – raw text never leaves the backend; only the redacted version and metadata are transmitted. PDF redactions use PyMuPDF’s permanent annotations, making text unrecoverable.

**What we deliberately left out**:

- **Batch processing** – unnecessary for trust and correction; both users need to focus on one document at a time.
- **User accounts / persistence** – the core value is interactive clarity, not storage.
- **Custom rule creation** – Presidio’s detectors suffice; adding a rule editor would distract from explainability.
- **OCR for scanned PDFs** – would add heavy dependencies; we warn users and suggest text‑based files.

These choices prioritise **clarity, speed, and control** – Marcus gains confidence through transparency, while Sam catches and fixes mistakes effortlessly. Glassbox transforms a skeptical user into a confident one and turns a rushed reviewer into an effective editor.

