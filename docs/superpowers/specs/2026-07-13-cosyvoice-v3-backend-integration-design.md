# CosyVoice v3 后端统一接入设计

## 目标

将百炼 `cosyvoice-v3-flash` 作为项目的首选高质量 TTS 音源，使 `/api/tts/cache` 与 `/api/tts/stream` 使用同一套合成逻辑。首页、聊天、景点和路线等调用现有 TTS API 的页面因此获得一致音色；百炼不可用时继续降级到 Edge TTS，避免页面完全失声。

## 已确认现状

- 项目根目录及 `backend/.env` 均已配置非空的 `QWEN_API_KEY`。
- 使用该 Key 直连百炼 `cosyvoice-v3-flash` 和兼容音色可生成有效 MP3。
- 当前正式 `synthesize()` 只调用 Azure 或 Edge TTS，没有调用百炼。
- 当前 `synthesize_stream()` 固定调用 Edge TTS。
- 配置仍使用旧模型 `cosyvoice-v1`，旧音色 ID 与 v3 系统音色不兼容。
- 本地 `localhost:5001` CosyVoice 服务未启动，本次接入不依赖该服务。

## 方案选择

采用“统一合成入口”方案：缓存接口和流式接口都复用 `synthesize()`，由它依次尝试百炼 CosyVoice、Azure（若配置）和 Edge TTS。与分别维护两套供应商调用相比，该方案能避免页面之间出现不同音色、不同降级规则和重复故障处理。

本次不实现百炼真正的逐块实时流式传输。`/api/tts/stream` 会先完成一次 CosyVoice 合成，再按现有 SSE 协议切分 MP3 字节发送。这样无需修改前端协议，改动范围较小，并能优先保证所有页面听到同一高质量声音。

## 配置与音色

- 默认模型改为 `cosyvoice-v3-flash`。
- 预设音色映射使用 v3 支持的系统音色：
  - `mandarin` → `longxiaochun_v3`（知性积极女声）
  - `female` → `longanhuan`（欢脱元气女声）
  - `liaoning` → `longlaotie_v3`（东北话男声）
  - `shaanxi` → `longshange_v3`（陕西话男声）
  - `male` → `longcheng_v3`（智慧青年男声）
- 页面继续传递既有 `voice_id`，不直接依赖供应商音色 ID。
- Key 只从 `settings.qwen_api_key` 读取，不记录、不返回，也不写入日志。

## 模块与数据流

### 百炼适配器

在 `backend/app/core/tts.py` 增加一个内部异步合成函数：

1. 接收文本和项目级 `voice_id`。
2. 将 `voice_id` 映射为 CosyVoice v3 音色。
3. 在线程中调用同步的 DashScope SDK，避免阻塞 FastAPI 事件循环。
4. 将返回音频规范化为 MP3 字节。
5. 根据音频时长生成现有口型时间戳，返回 `TTSResult`。

### 统一合成顺序

`synthesize()` 的顺序为：

1. 空文本直接返回空结果。
2. 配置了 `QWEN_API_KEY` 时尝试百炼 CosyVoice v3。
3. 百炼失败或返回空音频时记录不含密钥的警告并继续。
4. 配置了 Azure 时尝试 Azure。
5. 最后尝试 Edge TTS。
6. 所有音源失败时保留现有空音频降级结果，让前端使用浏览器语音。

### 缓存接口

`/api/tts/cache` 继续调用 `synthesize_cached()`：先查内存/Redis，未命中时调用统一的 `synthesize()`。合成成功后缓存音频与口型数据并返回 base64 音频。

### 流式接口

`/api/tts/stream` 的缓存命中行为不变。缓存未命中时调用统一的 `synthesize()`，将完整 MP3 按块编码为 SSE `audio` 事件，随后发送 `phonemes` 和 `done`。若最终无音频，发送现有错误事件供前端降级。

## 错误处理

- 百炼调用设置有限超时，错误不会阻塞后续音源。
- 日志包含模型、音色、耗时、音频字节数及脱敏错误信息，不包含 Key。
- Redis 不可用不影响合成，继续使用现有内存缓存或直接返回结果。
- 旧音色或未知 `voice_id` 自动回落到 `mandarin`。
- 本地 5001 服务仍保留为配置项，但不进入本次主调用链。

## 测试策略

先写失败测试，再实现：

1. 配置 Key 时，`synthesize()` 优先返回 CosyVoice 音频，不调用 Edge TTS。
2. CosyVoice 抛错或返回空音频时，正确降级到 Edge TTS。
3. 未配置 Key 时跳过 CosyVoice。
4. 项目预设音色全部映射到有效的 v3 音色 ID。
5. `synthesize_stream()` 使用统一合成结果并产生音频、口型及完成事件。
6. `/api/tts/cache` 的回归测试确认返回非空 base64、正时长和口型数据。

自动化测试使用 mock 隔离外部付费 API；完成后再使用真实 Key 做一次短文本冒烟测试，并验证返回 MP3 非空。测试和日志都不得输出 Key。

## 验收标准

- 真实请求 `/api/tts/cache` 返回 `cached: true` 且音频字节数大于 0。
- 真实请求 `/api/tts/stream` 至少产生一个 `audio` 事件，最终 `duration_ms > 0`。
- 百炼正常时不调用 Edge TTS。
- 百炼异常时页面仍能通过 Edge TTS 或浏览器语音降级。
- 后端相关测试全部通过，重启后的 8000 端口使用新配置。
- 代码、日志和接口响应中均不出现 API Key。

## 范围外事项

- 不部署本地 CosyVoice 5001 服务。
- 不实现供应商原生实时音频流或字级时间戳。
- 不重新设计前端播放协议或数字人口型系统。
- 不提交、轮换或展示用户的 API Key。
