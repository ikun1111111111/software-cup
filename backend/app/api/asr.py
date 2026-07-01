"""ASR API — REST endpoint for mobile voice input."""
import logging
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.asr import transcribe_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/asr", tags=["asr"])


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(..., description="录音文件，支持 m4a/wav 等格式"),
    language: str = Form("zh-CN", description="语言代码，如 zh-CN、en-US"),
):
    """将上传的音频文件转写为文本。"""
    if not audio.filename:
        raise HTTPException(status_code=400, detail="缺少音频文件名")

    suffix = Path(audio.filename).suffix or ".m4a"
    tmp_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            if not content:
                raise HTTPException(status_code=400, detail="音频文件为空")
            tmp.write(content)
            tmp_path = tmp.name

        # faster-whisper 语言码只需要 "zh" / "en" 等
        lang = language.split("-")[0].lower()
        text = await transcribe_file(tmp_path, language=lang)

        if text.startswith("[") and text.endswith("]"):
            logger.warning("ASR fallback result: %s", text)
            return {"text": "", "error": text}

        return {"text": text}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("ASR transcription failed: %s", e)
        raise HTTPException(status_code=500, detail="语音识别失败，请重试")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
