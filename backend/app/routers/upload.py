from fastapi import APIRouter, UploadFile, File
import uuid

router = APIRouter()

@router.post("/")
async def upload_log(file: UploadFile = File(...)):
    upload_id = str(uuid.uuid4())
    # TODO: simpan file, panggil parser
    return {"upload_id": upload_id, "filename": file.filename, "status": "received"}