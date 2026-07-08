from pathlib import Path
from tempfile import NamedTemporaryFile

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.report_generator import generate_marketing_report
from app.services.behavior_analytics import (
    behavior_overview,
    consumption_analysis,
    invalidate_behavior_analysis_cache,
    marketing_analysis,
    route_preference_analysis,
    satisfaction_analysis,
)
from app.tasks.behavior_import_task import get_behavior_import_status, import_behavior_file_task

router = APIRouter(prefix="/api/behavior", tags=["behavior"])


@router.get("/overview")
async def get_behavior_overview(db: AsyncSession = Depends(get_db)):
    return await behavior_overview(db)


@router.get("/consumption")
async def get_behavior_consumption(db: AsyncSession = Depends(get_db)):
    return await consumption_analysis(db)


@router.get("/route-preference")
async def get_behavior_route_preference(
    limit: int = Query(8000, ge=100, le=50000),
    db: AsyncSession = Depends(get_db),
):
    return await route_preference_analysis(db, limit=limit)


@router.get("/satisfaction")
async def get_behavior_satisfaction(db: AsyncSession = Depends(get_db)):
    return await satisfaction_analysis(db)


@router.get("/marketing")
async def get_behavior_marketing(db: AsyncSession = Depends(get_db)):
    result = await marketing_analysis(db)
    result["report"] = await generate_marketing_report(db, result)
    return result


@router.post("/upload")
async def upload_behavior_data(
    file: UploadFile = File(...),
    strategy: str = Query("append", pattern="^(append|overwrite)$"),
):
    invalidate_behavior_analysis_cache()
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".xlsx", ".xls", ".csv"}:
        raise HTTPException(status_code=400, detail="仅支持 xlsx/xls/csv")

    with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    await file.close()

    task = import_behavior_file_task.delay(tmp_path, strategy)
    return {"task_id": task.id, "status": "queued", "strategy": strategy}


@router.get("/upload/status/{task_id}")
async def get_upload_status(task_id: str):
    cached = await get_behavior_import_status(task_id)
    if cached:
        if cached.get("status") in {"done", "failed"}:
            invalidate_behavior_analysis_cache()
        return cached
    result = AsyncResult(task_id)
    if result.state == "PENDING":
        return {"task_id": task_id, "status": "pending", "progress": 0}
    if result.state == "STARTED":
        return {"task_id": task_id, "status": "running", "progress": 10}
    if result.state == "FAILURE":
        return {"task_id": task_id, "status": "failed", "progress": 100, "error": str(result.result)}
    return {"task_id": task_id, "status": result.state.lower(), "progress": 0}
