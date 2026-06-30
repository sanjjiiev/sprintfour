from pydantic import BaseModel
from typing import List, Optional

class EntityExplanation(BaseModel):
    id: str
    text_segment: str
    entity_type: str
    action: str          # "REDACTED" or "KEPT_VISIBLE"
    confidence: float
    logic_reason: str
    context_tokens: List[str]

class AnonymizeResponse(BaseModel):
    sanitized_text: str
    spans: List[EntityExplanation]