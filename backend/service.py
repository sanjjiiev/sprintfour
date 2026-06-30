import uuid
from typing import List
from presidio_analyzer import AnalyzerEngine, RecognizerResult
from presidio_anonymizer import AnonymizerEngine
from .models import EntityExplanation, AnonymizeResponse

analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()

CONFIDENCE_THRESHOLD = 0.5

def get_entity_priority(entity: RecognizerResult) -> int:
    """
    Return a priority for entity types – higher means preferred when overlapping.
    """
    priority = {
        "EMAIL_ADDRESS": 3,
        "PHONE_NUMBER": 2,
        "PERSON": 2,
        "LOCATION": 2,
        "URL": 1,          # lower priority than EMAIL_ADDRESS
    }
    return priority.get(entity.entity_type, 0)

def merge_overlapping_entities(results: List[RecognizerResult]) -> List[RecognizerResult]:
    """
    Merge overlapping or contained entities, keeping the most relevant one.
    Priority: higher confidence > higher entity priority > longer span.
    """
    if not results:
        return []
    # Sort by start, then by end (shorter first)
    sorted_results = sorted(results, key=lambda x: (x.start, x.end))
    merged = []
    for entity in sorted_results:
        if not merged:
            merged.append(entity)
            continue
        last = merged[-1]
        if entity.start < last.end:
            # Overlap or containment – decide which to keep
            # Compare confidence first
            if entity.score > last.score:
                merged[-1] = entity
            elif entity.score == last.score:
                # Same confidence: use priority
                if get_entity_priority(entity) > get_entity_priority(last):
                    merged[-1] = entity
                elif get_entity_priority(entity) == get_entity_priority(last):
                    # Same priority: keep longer span
                    if (entity.end - entity.start) > (last.end - last.start):
                        merged[-1] = entity
        else:
            merged.append(entity)
    return merged

def process_document(text: str) -> AnonymizeResponse:
    # 1. Detect entities
    raw_results = analyzer.analyze(text=text, language="en")

    # 2. Merge overlapping entities
    results = merge_overlapping_entities(raw_results)

    # 3. Anonymize (using default anonymizer)
    anonymized = anonymizer.anonymize(
        text=text,
        analyzer_results=results
    )
    sanitized_text = anonymized.text

    # 4. Build spans covering the entire document
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

        # Use `score` (Presidio's confidence)
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
            context_tokens=[]
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