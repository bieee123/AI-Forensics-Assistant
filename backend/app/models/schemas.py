from pydantic import BaseModel
from datetime import datetime

class ParsedLogEntry(BaseModel):
    timestamp: datetime
    source: str
    event_type: str
    raw_message: str