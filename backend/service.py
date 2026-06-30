import uuid
import re
from typing import List
from presidio_analyzer import AnalyzerEngine, RecognizerResult
from presidio_anonymizer import AnonymizerEngine
from models import EntityExplanation, AnonymizeResponse

analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()

CONFIDENCE_THRESHOLD = 0.5

def get_context_tokens(text: str, start: int, end: int, window: int = 3) -> List[str]:
    """Extract up to `window` words before and after the entity."""
    words = re.findall(r'\b\w+\b', text)
    # Find the index of the word that contains the entity start
    # Simple approach: split into tokens by whitespace and punctuation
    # We'll just capture the surrounding characters
    # For a hackathon, we can approximate by using the substring around the entity
    before = text[max(0, start - 50):start]
    after = text[end:min(len(text), end + 50)]
    tokens = before.split()[-window:] + after.split()[:window]
    return tokens

def process_document(text: str) -> AnonymizeResponse:
    # 1. Detect entities
    results: List[RecognizerResult] = analyzer.analyze(text=text, language="en")

    # 2. Anonymize (replace with placeholders)
    anonymized = anonymizer.anonymize(
        text=text,
        analyzer_results=results,
        operators={"DEFAULT": {"type": "replace", "new_value": "[REDACTED]"}}
    )
    sanitized_text = anonymized.text

    # 3. Build spans covering the entire text
    spans = []
    last_end = 0
    # Sort results by start index
    sorted_results = sorted(results, key=lambda x: x.start)

    for entity in sorted_results:
        # KEPT segment before this entity
        if entity.start > last_end:
            kept_text = text[last_end:entity.start]
            if kept_text.strip():  # skip empty
                spans.append(EntityExplanation(
                    id=str(uuid.uuid4()),
                    text_segment=kept_text,
                    entity_type="SAFE_TEXT",
                    action="KEPT_VISIBLE",
                    confidence=1.0,
                    logic_reason="No sensitive pattern matched in this segment.",
                    context_tokens=[]
                ))

        # Decide action based on confidence threshold
        action = "REDACTED" if entity.confidence >= CONFIDENCE_THRESHOLD else "KEPT_VISIBLE"
        if action == "REDACTED":
            reason = f"Identified as {entity.entity_type} with confidence {entity.confidence:.2f} (above threshold)."
        else:
            reason = f"Confidence {entity.confidence:.2f} below threshold ({CONFIDENCE_THRESHOLD}); kept visible."

        context = get_context_tokens(text, entity.start, entity.end)

        spans.append(EntityExplanation(
            id=str(uuid.uuid4()),
            text_segment=text[entity.start:entity.end],
            entity_type=entity.entity_type,
            action=action,
            confidence=entity.confidence,
            logic_reason=reason,
            context_tokens=context
        ))

        last_end = entity.end

    # KEPT segment after last entity
    if last_end < len(text):
        kept_text = text[last_end:]
        if kept_text.strip():
            spans.append(EntityExplanation(
                id=str(uuid.uuid4()),
                text_segment=kept_text,
                entity_type="SAFE_TEXT",
                action="KEPT_VISIBLE",
                confidence=1.0,
                logic_reason="No sensitive pattern matched in this segment.",
                context_tokens=[]
            ))

    return AnonymizeResponse(sanitized_text=sanitized_text, spans=spans)