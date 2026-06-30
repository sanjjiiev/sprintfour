import io
import fitz  # PyMuPDF
from docx import Document
from docx.shared import RGBColor
from docx.enum.text import WD_COLOR_INDEX   # <-- correct import for highlight
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()
CONFIDENCE_THRESHOLD = 0.5

def redact_pdf(pdf_bytes: bytes) -> bytes:
    """
    Redact PII from a PDF using PyMuPDF's permanent redaction annotations.
    Text is permanently removed and replaced with black rectangles.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    # Extract full text for detection
    full_text = ""
    for page_num in range(len(doc)):
        page = doc[page_num]
        page_text = page.get_text("text")
        full_text += page_text + "\n"

    if not full_text.strip():
        doc.close()
        raise ValueError("PDF contains no selectable text. Please use a text‑based PDF.")

    # Detect entities
    results = analyzer.analyze(text=full_text, language="en")

    # For each entity, search all pages and redact every occurrence
    for entity in results:
        entity_text = full_text[entity.start:entity.end]
        for page_num, page in enumerate(doc):
            quads = page.search_for(entity_text, quads=True)
            if quads:
                for quad in quads:
                    rect = quad.rect
                    page.add_redact_annot(rect, fill=(0, 0, 0))  # black fill

    # Apply all redactions (this permanently deletes the text)
    for page in doc:
        page.apply_redactions()

    # Save to bytes
    output = io.BytesIO()
    doc.save(output, garbage=4, deflate=True)
    doc.close()
    return output.getvalue()


def redact_docx(docx_bytes: bytes) -> bytes:
    """
    Redact PII from a DOCX by replacing text with [REDACTED] and applying black background highlight.
    """
    doc = Document(io.BytesIO(docx_bytes))

    # Build full text for detection
    full_text = "\n".join(p.text for p in doc.paragraphs)
    if not full_text.strip():
        return docx_bytes

    results = analyzer.analyze(text=full_text, language="en")

    # Map entities to paragraphs and collect replacements
    replacements = {}  # paragraph index -> list of (old_text, new_text)
    for entity in results:
        entity_text = full_text[entity.start:entity.end]
        for idx, para in enumerate(doc.paragraphs):
            if entity_text in para.text:
                if idx not in replacements:
                    replacements[idx] = []
                replacements[idx].append((entity_text, "[REDACTED]"))

    # Apply replacements preserving formatting from first run
    for idx, replace_list in replacements.items():
        para = doc.paragraphs[idx]
        if para.runs:
            template_run = para.runs[0]
            new_text = para.text
            for old, new in replace_list:
                new_text = new_text.replace(old, new)
            para.clear()
            new_run = para.add_run(new_text)
            # Copy basic formatting
            new_run.bold = template_run.bold
            new_run.italic = template_run.italic
            new_run.underline = template_run.underline
            # White text with black background (using WD_COLOR_INDEX)
            new_run.font.color.rgb = RGBColor(255, 255, 255)
            new_run.font.highlight_color = WD_COLOR_INDEX.BLACK
        else:
            # If no runs, just set text (this covers all occurrences in the paragraph)
            for old, new in replace_list:
                para.text = para.text.replace(old, new)

    output = io.BytesIO()
    doc.save(output)
    return output.getvalue()