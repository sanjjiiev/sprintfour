import uuid
import re
from typing import List
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from models import EntityExplanation, AnonymizeResponse

analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()

CONFIDENCE_THRESHOLD = 0.5

def get_context_tokens(text: str, start: int, end: int, window: int = 3) -> List[str]:
    # For now, return empty list to avoid errors
    return []

def process_document(text: str) -> AnonymizeResponse:
    # 1. Detect entities
    results = analyzer.analyze(text=text, language="en")

    # 2. Anonymize using default behavior
    anonymized = anonymizer.anonymize(
        text=text,
        analyzer_results=results
    )
    sanitized_text = anonymized.text

    # 3. Build spans covering the entire document
    spans = []
    last_end = 0
    sorted_results = sorted(results, key=lambda x: x.start)

    for entity in sorted_results:
        # KEPT segment before this entity
        if entity.start > last_end:
            kept_text = text[last_end:entity.start]
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

        # Get confidence score (Presidio uses `score`)
        # Fallback: if no score, use 0.0
        score = getattr(entity, 'score', getattr(entity, 'confidence', 0.0))

        # Decide action based on threshold
        action = "REDACTED" if score >= CONFIDENCE_THRESHOLD else "KEPT_VISIBLE"
        if action == "REDACTED":
            reason = f"Identified as {entity.entity_type} with confidence {score:.2f} (above threshold)."
        else:
            reason = f"Confidence {score:.2f} below threshold ({CONFIDENCE_THRESHOLD}); kept visible."

        spans.append(EntityExplanation(
            id=str(uuid.uuid4()),
            text_segment=text[entity.start:entity.end],
            entity_type=entity.entity_type,
            action=action,
            confidence=score,
            logic_reason=reason,
            context_tokens=get_context_tokens(text, entity.start, entity.end)
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