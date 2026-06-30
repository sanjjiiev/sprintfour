import io
import fitz
from docx import Document
from docx.shared import RGBColor
from docx.enum.text import WD_COLOR_INDEX
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()
CONFIDENCE_THRESHOLD = 0.5

def redact_pdf(pdf_bytes: bytes, overrides: dict = None) -> bytes:
    """
    Redact PII from PDF, applying overrides if provided.
    overrides: dict mapping text_segment -> "REDACTED" or "KEPT_VISIBLE"
    """
    overrides = overrides or {}
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    # Extract full text for detection
    full_text = ""
    page_texts = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        page_text = page.get_text("text")
        page_texts.append(page_text)
        full_text += page_text + "\n"

    if not full_text.strip():
        doc.close()
        raise ValueError("PDF contains no selectable text.")

    # Detect entities
    results = analyzer.analyze(text=full_text, language="en")

    # 1. Redact detected entities unless overridden to KEPT_VISIBLE
    for entity in results:
        entity_text = full_text[entity.start:entity.end]
        # Check if overridden
        if entity_text in overrides and overrides[entity_text] == "KEPT_VISIBLE":
            continue  # skip redaction
        # Redact all occurrences on all pages
        for page_num, page in enumerate(doc):
            quads = page.search_for(entity_text, quads=True)
            if quads:
                for quad in quads:
                    rect = quad.rect
                    page.add_redact_annot(rect, fill=(0, 0, 0))

    # 2. Apply forced redactions from overrides (entities not detected)
    for text_segment, action in overrides.items():
        if action == "REDACTED":
            # Try to redact this text everywhere it appears
            for page_num, page in enumerate(doc):
                quads = page.search_for(text_segment, quads=True)
                if quads:
                    for quad in quads:
                        rect = quad.rect
                        page.add_redact_annot(rect, fill=(0, 0, 0))

    # Apply redactions
    for page in doc:
        page.apply_redactions()

    output = io.BytesIO()
    doc.save(output, garbage=4, deflate=True)
    doc.close()
    return output.getvalue()


def redact_docx(docx_bytes: bytes, overrides: dict = None) -> bytes:
    """
    Redact PII from DOCX, applying overrides.
    overrides: dict mapping text_segment -> "REDACTED" or "KEPT_VISIBLE"
    """
    overrides = overrides or {}
    doc = Document(io.BytesIO(docx_bytes))

    full_text = "\n".join(p.text for p in doc.paragraphs)
    if not full_text.strip():
        return docx_bytes

    results = analyzer.analyze(text=full_text, language="en")

    # Build a set of text segments that should be redacted
    redact_set = set()
    keep_visible_set = set()

    for entity in results:
        entity_text = full_text[entity.start:entity.end]
        if entity_text in overrides and overrides[entity_text] == "KEPT_VISIBLE":
            keep_visible_set.add(entity_text)
        else:
            redact_set.add(entity_text)

    # Also add any forced redactions from overrides (text not detected)
    for text_segment, action in overrides.items():
        if action == "REDACTED":
            redact_set.add(text_segment)

    # Now apply redactions to the document
    # We'll iterate over paragraphs and runs, and replace matching text with [REDACTED]
    # For each paragraph, we'll build a list of replacements
    for paragraph in doc.paragraphs:
        # We'll process the whole paragraph text
        para_text = paragraph.text
        # Check if any redact_set text is in this paragraph
        replacements = []
        for target in redact_set:
            if target in para_text:
                # Replace all occurrences
                # We need to preserve formatting: we'll use a similar approach as before
                # Since we have multiple replacements, we'll do them in order
                # We'll keep it simple: if any target is found, we replace the whole paragraph content
                # and apply black highlight.
                # But we might want to replace only specific parts.
                # For simplicity, we'll replace the entire paragraph text with the redacted version.
                # We'll keep the first run's formatting.
                if paragraph.runs:
                    template_run = paragraph.runs[0]
                    new_text = para_text
                    for target in redact_set:
                        new_text = new_text.replace(target, "[REDACTED]")
                    paragraph.clear()
                    new_run = paragraph.add_run(new_text)
                    new_run.bold = template_run.bold
                    new_run.italic = template_run.italic
                    new_run.underline = template_run.underline
                    new_run.font.color.rgb = RGBColor(255, 255, 255)
                    new_run.font.highlight_color = WD_COLOR_INDEX.BLACK
                else:
                    # No runs, just set text
                    for target in redact_set:
                        paragraph.text = paragraph.text.replace(target, "[REDACTED]")
                break  # we already replaced, skip other targets in this paragraph

    output = io.BytesIO()
    doc.save(output)
    return output.getvalue()