# Phase 4 规划文档：ASR + TTS 语音服务（A-004）

## 模块概述

封装语音识别（ASR）和语音合成（TTS）能力，为语音交互链路提供文本↔音频转换。当前环境无 GPU/模型文件，采用「接口封装 + 模拟 fallback」策略，确保代码结构完整，接入真实模型只需替换实现。

---

## 架构设计

```
语音输入（WebSocket 二进制音频流）
    │
    ▼
┌─────────────┐
│  ASR 模块   │  faster-whisper (medium) 识别中文语音 → 文本
│  core/asr.py │  Fallback: 返回提示文本（环境不可用时）
└──────┬──────┘
       │ 文本
       ▼
┌─────────────┐
│ 对话服务    │  process_chat (已有)
│  (A-003)    │
└──────┬──────┘
       │ 文本回答
       ▼
┌─────────────┐
│  TTS 模块   │  CosyVoice 合成音频 + 音素时间戳
│  core/tts.py │  Redis 缓存（相同文本不重复合成）
│             │  Fallback: 返回空音频 + 文本提示
└─────────────┘
```

---

## 文件清单

### 新增文件

| 文件路径 | 职责 |
|---------|------|
| `app/core/asr.py` | faster-whisper 封装 + 音频预处理（VAD/降噪） |
| `app/core/tts.py` | CosyVoice 封装 + 音素时间戳 + Redis 缓存 |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `app/api/ws.py` | 接收音频二进制流 → ASR → 对话 → TTS → 返回音频+时间戳 |
| `app/core/config.py` | 补充 whisper/cosyvoice 配置（已存在，确认完整） |

---

## 接口定义

### ASR

```python
async def transcribe(
    audio_bytes: bytes,
    language: str = "zh",
) -> str:
    """Transcribe audio bytes to text."""

async def transcribe_file(
    file_path: str,
    language: str = "zh",
) -> str:
    """Transcribe audio file to text."""
```

### TTS

```python
class TTSResult(BaseModel):
    audio_bytes: bytes
    phoneme_timestamps: list[dict]  # [{"phoneme": "a", "start": 0.0, "end": 0.15}, ...]
    sample_rate: int
    duration_ms: int

async def synthesize(
    text: str,
    voice_id: str | None = None,
) -> TTSResult:
    """Synthesize text to speech with phoneme timestamps."""

async def synthesize_cached(
    text: str,
    voice_id: str | None = None,
) -> TTSResult:
    """Synthesize with Redis cache check."""
```

---

## 假设清单

1. **faster-whisper 模型未安装**：接口封装完整，真实环境需下载 medium 模型（~5GB）
2. **CosyVoice 服务未启动**：接口封装完整，真实环境需启动 CosyVoice gRPC/HTTP 服务
3. **音频格式**：输入统一为 16kHz, 16bit, mono WAV（WebSocket 前端负责转码）
4. **Redis 用于 TTS 缓存**：相同文本+音色直接返回缓存音频，跳过合成

---

## 风险点

| 风险 | 影响 | 预案 |
|------|------|------|
| faster-whisper 模型文件缺失 | ASR 无法识别 | Fallback 返回提示文本，前端显示"请使用文字输入" |
| CosyVoice 服务未启动 | TTS 无法合成 | Fallback 返回空音频，前端显示文字回复 |
| 音素时间戳精度不足 | 数字人口型同步偏差 | 使用字符级时间戳作为保底 |
| 音频流延迟高 | 端到端 > 5s | 分句触发 TTS，流水线并行（后续优化） |
