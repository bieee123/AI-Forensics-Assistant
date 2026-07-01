from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class AnalyzeRequest(BaseModel):
    upload_id: str

@router.post("/")
async def analyze_log(request: AnalyzeRequest):
    # TODO: panggil agent untuk analisis
    return {"timeline": [], "ioc_explanation": "not implemented yet", "severity": "unknown"}