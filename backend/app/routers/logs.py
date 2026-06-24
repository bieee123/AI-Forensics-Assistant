from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_logs(upload_id: str = None):
    # TODO: ambil dari database, filter by upload_id jika ada
    return []