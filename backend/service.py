import uuid
from typing import List
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig
from models import EntityExplanation, AnonymizeResponse

analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()

CONFIDENCE_THRESHOLD = 0.5

def get_context_tokens(text: str, start: int, end: int, window: int = 3) -> List[str]:
    # For now, return empty list (can be improved later)
    return []

def process_document(text: str) -> AnonymizeResponse:
    # 1. Detect entities
    results = analyzer.analyze(text=text, language="en")

    # 2. Anonymize with explicit replace operator
    operators = {
        "DEFAULT": OperatorConfig("replace", {"new_value": "[REDACTED]"})
    }
    anonymized = anonymizer.anonymize(
        text=text,
        analyzer_results=results,
        operators=operators
    )
    sanitized_text = anonymized.text

    # 3. Build spans for the interactive UI
    spans = []
    last_end = 0
    sorted_results = sorted(results, key=lambda x: x.start)

    for entity in sorted_results:
        # Keep segment before this entity
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

        # Use `score` attribute (Presidio uses `score`, not `confidence`)
        score = getattr(entity, 'score', 0.0)

        action = "REDACTED" if score >= CONFIDENCE_THRESHOLD else "KEPT_VISIBLE"
        reason = (
            f"Identified as {entity.entity_type} with confidence {score:.2f} (above threshold)."
            if action == "REDACTED"
            else f"Confidence {score:.2f} below threshold ({CONFIDENCE_THRESHOLD}); kept visible."
        )

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

    # Keep segment after last entity
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