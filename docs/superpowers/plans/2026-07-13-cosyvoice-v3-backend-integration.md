# CosyVoice v3 Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make DashScope CosyVoice v3 the preferred TTS provider for both cache and SSE endpoints while preserving Azure, Edge TTS, and browser-speech fallbacks.

**Architecture:** Add one internal DashScope adapter that returns the existing `TTSResult` model. Route both cached and SSE synthesis through the existing `synthesize()` provider chain so every frontend surface receives the same configured voice and fallback behavior.

**Tech Stack:** Python 3.12, FastAPI, DashScope Python SDK, edge-tts, pytest, pytest-asyncio.

---

## File map

- Modify `backend/app/core/config.py`: select `cosyvoice-v3-flash` and valid v3 system voices.
- Modify `backend/app/core/tts.py`: add the DashScope adapter, provider priority, and callback-driven SSE streaming.
- Modify `backend/tests/test_tts.py`: cover v3 mappings, CosyVoice priority, and fallback.
- Modify `backend/tests/test_tts_streaming.py`: cover uncached CosyVoice audio arriving before synthesis completion.
- Modify `README.md`: document configuration, fallback, and secret handling.

### Task 1: Lock down CosyVoice v3 configuration

**Files:**
- Modify: `backend/tests/test_tts.py`
- Modify: `backend/app/core/config.py`

- [x] **Step 1: Write the failing voice-mapping test**

Import `_resolve_cosyvoice_speaker` and `settings`, then add:

```python
def test_cosyvoice_uses_v3_model_and_supported_voices():
    assert settings.cosyvoice_model == "cosyvoice-v3-flash"
    assert _resolve_cosyvoice_speaker("mandarin") == "longxiaochun_v3"
    assert _resolve_cosyvoice_speaker("female") == "longanhuan"
    assert _resolve_cosyvoice_speaker("liaoning") == "longlaotie_v3"
    assert _resolve_cosyvoice_speaker("shaanxi") == "longshange_v3"
    assert _resolve_cosyvoice_speaker("male") == "longcheng_v3"
    assert _resolve_cosyvoice_speaker("unknown") == "longxiaochun_v3"
```

- [x] **Step 2: Verify RED**

Run:

```powershell
backend\venv\Scripts\pytest.exe backend\tests\test_tts.py::TestTTS::test_cosyvoice_uses_v3_model_and_supported_voices -q
```

Expected: FAIL because the current model and voice IDs are from v1.

- [x] **Step 3: Update configuration**

Set `cosyvoice_model` to `cosyvoice-v3-flash`. Set the project voice mappings to `longxiaochun_v3`, `longanhuan`, `longlaotie_v3`, `longshange_v3`, and `longcheng_v3`. Keep Edge TTS IDs unchanged.

- [x] **Step 4: Verify GREEN**

Run the Step 2 command. Expected: PASS.

### Task 2: Add the DashScope provider and priority chain

**Files:**
- Modify: `backend/tests/test_tts.py`
- Modify: `backend/app/core/tts.py`

- [x] **Step 1: Write failing provider tests**

Add three async tests:

```python
@pytest.mark.asyncio
async def test_synthesize_prefers_cosyvoice_when_key_is_configured():
    cosy = TTSResult(audio_bytes=b"cosy", phoneme_timestamps=[], duration_ms=120)
    with patch.object(settings, "qwen_api_key", "configured"), \
         patch("app.core.tts._synthesize_dashscope", new_callable=AsyncMock, return_value=cosy) as mock_cosy, \
         patch("app.core.tts._synthesize_edge_with_retry", new_callable=AsyncMock) as mock_edge:
        result = await synthesize("你好", "female")
    assert result.audio_bytes == b"cosy"
    mock_cosy.assert_awaited_once_with("你好", "female")
    mock_edge.assert_not_awaited()

@pytest.mark.asyncio
async def test_synthesize_falls_back_to_edge_when_cosyvoice_fails():
    empty = TTSResult(audio_bytes=b"", phoneme_timestamps=[], duration_ms=0)
    with patch.object(settings, "qwen_api_key", "configured"), \
         patch("app.core.tts._synthesize_dashscope", new_callable=AsyncMock, return_value=empty), \
         patch("app.core.tts._synthesize_edge_with_retry", new_callable=AsyncMock,
               return_value=(b"edge-audio", [])) as mock_edge:
        result = await synthesize("你好", "female")
    assert result.audio_bytes == b"edge-audio"
    mock_edge.assert_awaited_once()

@pytest.mark.asyncio
async def test_synthesize_skips_cosyvoice_without_key():
    with patch.object(settings, "qwen_api_key", ""), \
         patch("app.core.tts._synthesize_dashscope", new_callable=AsyncMock) as mock_cosy, \
         patch("app.core.tts._synthesize_edge_with_retry", new_callable=AsyncMock,
               return_value=(b"edge-audio", [])):
        result = await synthesize("你好", "female")
    assert result.audio_bytes == b"edge-audio"
    mock_cosy.assert_not_awaited()
```

- [x] **Step 2: Verify RED**

Run the three new tests. Expected: FAIL because `_synthesize_dashscope` is absent and `synthesize()` does not select it.

- [x] **Step 3: Add `_synthesize_dashscope()`**

Implement an async adapter using `dashscope.audio.tts_v2.SpeechSynthesizer` inside `asyncio.to_thread`. Set `dashscope.api_key` from `settings.qwen_api_key`, use `AudioFormat.MP3_22050HZ_MONO_256KBPS`, call with a 30-second timeout, and convert non-empty bytes into `TTSResult` with estimated duration and existing phoneme generation. Catch provider errors, log model/voice/error without the key, and return an empty result.

- [x] **Step 4: Put CosyVoice first in `synthesize()`**

Return immediately for blank text. When the Key is configured, await `_synthesize_dashscope(text, voice_id)` and return non-empty audio. Otherwise continue through existing Azure and Edge providers.

- [x] **Step 5: Verify GREEN**

Run Task 1 and Task 2 focused tests. Expected: all PASS.

### Task 3: Stream uncached CosyVoice audio through SSE

**Files:**
- Modify: `backend/tests/test_tts_streaming.py`
- Modify: `backend/app/core/tts.py`

- [x] **Step 1: Write the failing progressive-stream test**

```python
@pytest.mark.asyncio
async def test_synthesize_stream_yields_cosyvoice_audio_before_completion(monkeypatch):
    # Fake the documented DashScope ResultCallback contract: on_data emits the
    # first chunk, while call() remains blocked until the test releases it.
    stream = synthesize_stream("你好", "female")
    first_event = await asyncio.wait_for(anext(stream), timeout=0.2)
    assert first_event["type"] == "audio"
```

- [x] **Step 2: Verify RED**

Expected: FAIL with a timeout because the cache-miss branch waits for complete audio.

- [x] **Step 3: Bridge DashScope callbacks into SSE**

Run `SpeechSynthesizer.call()` in a worker thread with `ResultCallback`. Forward each `on_data` block into an `asyncio.Queue`, yield it immediately through SSE, assemble the complete audio for caching, and keep Azure/Edge fallbacks.

- [x] **Step 4: Update the no-audio test**

Patch the Edge streaming producer to return no audio and verify the existing `tts_error`, `phonemes`, and `done` fallback events.

- [x] **Step 5: Verify GREEN**

Run:

```powershell
backend\venv\Scripts\pytest.exe backend\tests\test_tts_streaming.py -q
```

Expected: zero failures.

### Task 4: Regression, documentation, and live verification

**Files:**
- Modify: `README.md`
- Verify: `backend/app/core/config.py`
- Verify: `backend/app/core/tts.py`
- Verify: `backend/tests/test_tts.py`
- Verify: `backend/tests/test_tts_streaming.py`

- [x] **Step 1: Run the TTS regression suite**

```powershell
backend\venv\Scripts\pytest.exe backend\tests\test_tts.py backend\tests\test_tts_streaming.py -q
```

Expected: zero failures.

- [x] **Step 2: Compile changed backend modules**

```powershell
backend\venv\Scripts\python.exe -m compileall -q backend\app\core\config.py backend\app\core\tts.py backend\app\api\tts.py
```

Expected: exit code 0.

- [x] **Step 3: Update README**

Document that `QWEN_API_KEY` enables DashScope `cosyvoice-v3-flash`, provider fallback order, and that secrets belong only in ignored `.env` files.

- [x] **Step 4: Restart the backend**

Stop only the process listening on port 8000. Launch `backend/run.py` with working directory `backend`, hidden window, and log redirection. Poll an HTTP endpoint until it responds.

- [x] **Step 5: Smoke-test `/api/tts/cache`**

POST a unique short Chinese string with `voice_id=female`. Assert `cached=true`, non-empty `audio_base64`, positive `duration_ms`, and non-empty phonemes.

- [x] **Step 6: Smoke-test `/api/tts/stream`**

POST another unique string. Assert at least one audio event, exactly one phoneme event, exactly one done event, no error event, and positive duration.

- [x] **Step 7: Check secret hygiene and diff scope**

Search only changed source/docs for accidental `sk-` literals or full Key values, run `git diff --check`, and inspect `git status --short`. Do not print `.env`.

- [x] **Step 8: Report completion**

Report test counts, live endpoint byte/event results, backend PID, changed files, and remaining fallback caveats. Do not commit implementation unless separately requested.
