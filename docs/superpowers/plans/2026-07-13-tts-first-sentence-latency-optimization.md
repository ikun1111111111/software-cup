# TTS First-Sentence Latency Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the repeated Redis failure delay and prefetch the first complete chat sentence so audible TTS starts earlier without replacing the existing MP3 player or fallback chain.

**Architecture:** Add a process-local circuit breaker around Redis rate-limit checks, then add a small Promise-based TTS cache and first-sentence parsing helpers on mobile. The chat stream starts one prefetch when the first sentence closes; the final answer reuses that Promise and queues the remaining text through the existing single pending-speech slot.

**Tech Stack:** Python 3.12, FastAPI/Starlette middleware, Redis asyncio client, React Native/Expo Web, TypeScript, Jest, pytest.

**Repository note:** The current `main` working tree contains pre-existing user changes. Execute and verify the plan in place, but do not create commits unless the user separately requests them.

---

## File map

- Create `backend/tests/test_rate_limiter.py`: circuit-breaker unit coverage.
- Modify `backend/app/core/rate_limiter.py`: resilient Redis check shared by middleware and route dependencies.
- Create `software/mobile/utils/ttsPromiseCache.ts`: bounded Promise cache that deduplicates prefetch/play requests and evicts failed loads.
- Create `software/mobile/__tests__/ttsPromiseCache.test.ts`: real behavioral tests for deduplication and retry.
- Modify `software/mobile/hooks/useVRMSync.ts`: use the Promise cache and expose `prefetchSpeech()`.
- Modify `software/mobile/hooks/useDigitalHumanDriver.ts`: pass `prefetchSpeech()` to page callers.
- Create `software/mobile/utils/firstSentencePrefetch.ts`: extract and validate the prefetched first sentence.
- Create `software/mobile/__tests__/firstSentencePrefetch.test.ts`: sentence parsing and final-answer matching tests.
- Modify `software/mobile/app/(tabs)/chat.tsx`: start prefetch during token streaming and queue the remainder at completion.
- Modify `software/mobile/__tests__/vrmSpeechCleanup.test.ts`: guard Promise-cache and prefetch wiring.
- Modify `software/mobile/__tests__/chatPressResponsiveness.test.ts`: guard token-stage prefetch and done-stage split playback.
- Modify `docs/vrm-digital-human/mobile-performance-sync.md`: record latency behavior and fallback constraints.

### Task 1: Add Redis rate-limit failure circuit breaker

**Files:**
- Create: `backend/tests/test_rate_limiter.py`
- Modify: `backend/app/core/rate_limiter.py`

- [ ] **Step 1: Write failing circuit-breaker tests**

Create `backend/tests/test_rate_limiter.py`:

```python
from unittest.mock import AsyncMock

import pytest

from app.core import rate_limiter


@pytest.fixture(autouse=True)
def reset_circuit():
    rate_limiter._reset_redis_rate_limit_circuit()
    yield
    rate_limiter._reset_redis_rate_limit_circuit()


@pytest.mark.asyncio
async def test_redis_failure_opens_circuit_and_skips_repeated_check(monkeypatch):
    clock = iter([100.0, 100.0, 101.0])
    monkeypatch.setattr(rate_limiter.time, "monotonic", lambda: next(clock))
    check = AsyncMock(side_effect=TimeoutError("redis down"))

    first = await rate_limiter._check_rate_limit_resilient(check)
    second = await rate_limiter._check_rate_limit_resilient(check)

    assert first is None
    assert second is None
    assert check.await_count == 1


@pytest.mark.asyncio
async def test_circuit_retries_after_cooldown(monkeypatch):
    now = 100.0
    monkeypatch.setattr(rate_limiter.time, "monotonic", lambda: now)
    check = AsyncMock(side_effect=[TimeoutError("redis down"), True])

    assert await rate_limiter._check_rate_limit_resilient(check) is None
    now += rate_limiter._REDIS_RATE_LIMIT_COOLDOWN_SECONDS + 0.1
    assert await rate_limiter._check_rate_limit_resilient(check) is True
    assert check.await_count == 2
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
backend\venv\Scripts\pytest.exe backend\tests\test_rate_limiter.py -q -p no:cacheprovider
```

Expected: FAIL because `_check_rate_limit_resilient`, `_reset_redis_rate_limit_circuit`, and `_REDIS_RATE_LIMIT_COOLDOWN_SECONDS` do not exist.

- [ ] **Step 3: Implement the minimal circuit breaker**

In `backend/app/core/rate_limiter.py`, add imports and process-local state:

```python
from collections.abc import Awaitable, Callable as AsyncCallable

_REDIS_RATE_LIMIT_COOLDOWN_SECONDS = 30.0
_redis_rate_limit_retry_after = 0.0


def _reset_redis_rate_limit_circuit() -> None:
    global _redis_rate_limit_retry_after
    _redis_rate_limit_retry_after = 0.0


async def _check_rate_limit_resilient(
    check: AsyncCallable[[], Awaitable[bool]],
) -> bool | None:
    global _redis_rate_limit_retry_after
    now = time.monotonic()
    if now < _redis_rate_limit_retry_after:
        return None
    try:
        allowed = await check()
    except Exception as exc:
        _redis_rate_limit_retry_after = time.monotonic() + _REDIS_RATE_LIMIT_COOLDOWN_SECONDS
        logger.warning("Rate limiter Redis check failed; bypassing for %.0fs: %s",
                       _REDIS_RATE_LIMIT_COOLDOWN_SECONDS, exc)
        return None
    _redis_rate_limit_retry_after = 0.0
    return allowed
```

Replace both direct `_check_sliding_window(...)` calls with closures passed to `_check_rate_limit_resilient()`:

```python
allowed = await _check_rate_limit_resilient(
    lambda: _check_sliding_window(key, self.requests, self.window, redis_client)
)
if allowed is None:
    return await call_next(request)
```

For `rate_limit_dependency()`, use the same helper and return when `allowed is None`.

- [ ] **Step 4: Verify GREEN and existing limiter behavior**

Run:

```powershell
backend\venv\Scripts\pytest.exe backend\tests\test_rate_limiter.py -q -p no:cacheprovider
backend\venv\Scripts\python.exe -m compileall -q backend\app\core\rate_limiter.py
```

Expected: 2 tests pass and compile exits 0.

### Task 2: Add a bounded Promise cache for TTS prefetch

**Files:**
- Create: `software/mobile/utils/ttsPromiseCache.ts`
- Create: `software/mobile/__tests__/ttsPromiseCache.test.ts`

- [ ] **Step 1: Write failing Promise-cache tests**

Create `software/mobile/__tests__/ttsPromiseCache.test.ts`:

```typescript
import { TTSPromiseCache } from '../utils/ttsPromiseCache';

describe('TTSPromiseCache', () => {
  test('deduplicates an in-flight prefetch and playback request', async () => {
    const cache = new TTSPromiseCache<number>(2);
    const loader = jest.fn().mockResolvedValue(42);

    const first = cache.getOrCreate('hello', loader);
    const second = cache.getOrCreate('hello', loader);

    expect(first).toBe(second);
    await expect(second).resolves.toBe(42);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  test('removes rejected requests so a later playback can retry', async () => {
    const cache = new TTSPromiseCache<number>(2);
    const loader = jest.fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce(7);

    await expect(cache.getOrCreate('hello', loader)).rejects.toThrow('temporary');
    await expect(cache.getOrCreate('hello', loader)).resolves.toBe(7);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npm test -- --runInBand __tests__/ttsPromiseCache.test.ts
```

from `software/mobile`.

Expected: FAIL because `TTSPromiseCache` does not exist.

- [ ] **Step 3: Implement `TTSPromiseCache`**

Create `software/mobile/utils/ttsPromiseCache.ts`:

```typescript
export class TTSPromiseCache<T> {
  private readonly entries = new Map<string, Promise<T>>();

  constructor(private readonly limit: number) {}

  getOrCreate(key: string, loader: () => Promise<T>): Promise<T> {
    const existing = this.entries.get(key);
    if (existing) return existing;

    const request = loader().catch((error) => {
      if (this.entries.get(key) === request) this.entries.delete(key);
      throw error;
    });
    this.entries.set(key, request);
    while (this.entries.size > this.limit) {
      const oldest = this.entries.keys().next().value;
      if (!oldest) break;
      this.entries.delete(oldest);
    }
    return request;
  }
}
```

- [ ] **Step 4: Verify GREEN**

Run the Step 2 command. Expected: 2 tests pass.

### Task 3: Expose TTS prefetch through the digital-human driver

**Files:**
- Modify: `software/mobile/hooks/useVRMSync.ts`
- Modify: `software/mobile/hooks/useDigitalHumanDriver.ts`
- Modify: `software/mobile/__tests__/vrmSpeechCleanup.test.ts`

- [ ] **Step 1: Write the failing wiring test**

Append to `software/mobile/__tests__/vrmSpeechCleanup.test.ts`:

```typescript
test('shares one promise between TTS prefetch and audible playback', () => {
  const syncSource = fs.readFileSync(
    path.resolve(__dirname, '../hooks/useVRMSync.ts'),
    'utf8',
  );
  const driverSource = fs.readFileSync(
    path.resolve(__dirname, '../hooks/useDigitalHumanDriver.ts'),
    'utf8',
  );

  expect(syncSource).toContain("import { TTSPromiseCache } from '../utils/ttsPromiseCache';");
  expect(syncSource).toContain('const ttsCacheRef = useRef(new TTSPromiseCache<TTSResult>(MAX_TTS_CACHE));');
  expect(syncSource).toContain('const prefetchSpeech = useCallback');
  expect(syncSource).toContain('ttsCacheRef.current.getOrCreate(cacheKey');
  expect(driverSource).toContain('prefetchSpeech');
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npm test -- --runInBand __tests__/vrmSpeechCleanup.test.ts
```

Expected: the new test fails because the hook still stores completed results and exposes no prefetch method.

- [ ] **Step 3: Replace the result cache with Promise reuse**

In `useVRMSync.ts`:

```typescript
import { fetchTTS, type Phoneme, type TTSResult } from '../api/tts';
import { TTSPromiseCache } from '../utils/ttsPromiseCache';
```

Add `prefetchSpeech` to `VRMSyncResult`. Replace the map ref with:

```typescript
const ttsCacheRef = useRef(new TTSPromiseCache<TTSResult>(MAX_TTS_CACHE));
```

Move `MAX_TTS_CACHE = 20` above the hook so it is available during ref initialization. Add:

```typescript
const getTTSResult = useCallback((text: string, voiceId: string) => {
  const cacheKey = `${text}::${voiceId}`;
  return ttsCacheRef.current.getOrCreate(
    cacheKey,
    () => fetchTTS(text, voiceId),
  );
}, []);

const prefetchSpeech = useCallback(async (text: string) => {
  const cleanText = text.trim();
  if (!cleanText || voiceModeRef.current !== 'tts') return;
  const voiceId = voiceConfigRef.current?.ttsVoiceId ?? DEFAULT_TTS_VOICE_ID;
  try {
    await getTTSResult(cleanText, voiceId);
  } catch (error) {
    console.warn('[useVRMSync] TTS prefetch failed:', error);
  }
}, [getTTSResult]);
```

In `playWithPhonemes`, replace manual map access with:

```typescript
const result = await Promise.race([
  getTTSResult(text, voiceId),
  new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error('TTS timeout')),
      Platform.OS === 'web' ? TTS_WEB_FALLBACK_MS : TTS_TIMEOUT_MS,
    );
  }),
]);
```

Return `prefetchSpeech` from `useVRMSync`. Destructure and return it from `useDigitalHumanDriver`.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
npm test -- --runInBand __tests__/ttsPromiseCache.test.ts __tests__/vrmSpeechCleanup.test.ts
npx tsc --noEmit
```

Expected: tests pass and TypeScript exits 0.

### Task 4: Parse and validate a prefetched first sentence

**Files:**
- Create: `software/mobile/utils/firstSentencePrefetch.ts`
- Create: `software/mobile/__tests__/firstSentencePrefetch.test.ts`

- [ ] **Step 1: Write failing sentence tests**

Create `software/mobile/__tests__/firstSentencePrefetch.test.ts`:

```typescript
import {
  extractFirstCompleteSentence,
  splitPrefetchedAnswer,
} from '../utils/firstSentencePrefetch';

describe('first sentence TTS prefetch', () => {
  test('waits for a real sentence terminator', () => {
    expect(extractFirstCompleteSentence('灵山大佛高八十八米')).toBeNull();
    expect(extractFirstCompleteSentence('灵山大佛高八十八米，值得参观')).toBeNull();
    expect(extractFirstCompleteSentence('灵山大佛高八十八米。值得参观')).toBe('灵山大佛高八十八米。');
  });

  test('splits only when the final answer still matches the prefetched sentence', () => {
    expect(splitPrefetchedAnswer('第一句。第二句。', '第一句。')).toEqual({
      first: '第一句。',
      rest: '第二句。',
    });
    expect(splitPrefetchedAnswer('改写后的答案。', '第一句。')).toBeNull();
    expect(splitPrefetchedAnswer('第一句。', '第一句。')).toBeNull();
  });
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npm test -- --runInBand __tests__/firstSentencePrefetch.test.ts
```

Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Implement the pure helpers**

Create `software/mobile/utils/firstSentencePrefetch.ts`:

```typescript
const COMPLETE_SENTENCE = /^([\s\S]*?[。！？!?；;])/;

export function extractFirstCompleteSentence(text: string): string | null {
  const match = text.match(COMPLETE_SENTENCE);
  const sentence = match?.[1]?.trim();
  return sentence || null;
}

export function splitPrefetchedAnswer(
  answer: string,
  prefetchedSentence: string | null,
): { first: string; rest: string } | null {
  const cleanAnswer = answer.trim();
  const first = prefetchedSentence?.trim();
  if (!first || !cleanAnswer.startsWith(first)) return null;
  const rest = cleanAnswer.slice(first.length).trim();
  if (!rest) return null;
  return { first, rest };
}
```

- [ ] **Step 4: Verify GREEN**

Run the Step 2 command. Expected: 2 tests pass.

### Task 5: Start prefetch during chat tokens and queue the remainder

**Files:**
- Modify: `software/mobile/app/(tabs)/chat.tsx`
- Modify: `software/mobile/__tests__/chatPressResponsiveness.test.ts`

- [ ] **Step 1: Write the failing chat integration guard**

Append to `software/mobile/__tests__/chatPressResponsiveness.test.ts`:

```typescript
test('prefetches one complete first sentence and queues the matching remainder', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../app/(tabs)/chat.tsx'),
    'utf8',
  );

  expect(source).toContain('prefetchedFirstSentenceRef');
  expect(source).toContain('extractFirstCompleteSentence(nextContent)');
  expect(source).toContain('void prefetchSpeech(firstSentence);');
  expect(source).toContain('splitPrefetchedAnswer(answer, prefetchedFirstSentenceRef.current)');
  expect(source).toMatch(/speakWithDriver\(split\.first[\s\S]*?speakWithDriver\(split\.rest/);
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npm test -- --runInBand __tests__/chatPressResponsiveness.test.ts
```

Expected: the new test fails because token handling does not prefetch TTS.

- [ ] **Step 3: Add per-question prefetch state**

In `chat.tsx`, import:

```typescript
import {
  extractFirstCompleteSentence,
  splitPrefetchedAnswer,
} from '@/utils/firstSentencePrefetch';
```

Destructure `prefetchSpeech` from `useDigitalHumanDriver`. Add:

```typescript
const prefetchedFirstSentenceRef = useRef<string | null>(null);
```

Clear it in `resetConversation()`, at the start of `sendMessage()`, and in error/offline branches.

- [ ] **Step 4: Trigger one prefetch from token accumulation**

Replace the token branch with:

```typescript
const token = msg.data?.token || '';
const currentContent = useChatStore.getState().messages.find((m) => m.id === id)?.content || '';
const nextContent = currentContent + token;
useChatStore.getState().updateMessage(id, nextContent);
if (!prefetchedFirstSentenceRef.current) {
  const firstSentence = extractFirstCompleteSentence(nextContent);
  if (firstSentence) {
    prefetchedFirstSentenceRef.current = firstSentence;
    void prefetchSpeech(firstSentence);
  }
}
```

- [ ] **Step 5: Reuse the prefetched sentence at `done`**

Add a callback:

```typescript
const playReplyWithPrefetch = useCallback((replyText: string, emotion?: Emotion) => {
  const reply = stripAnswerSource(replyText);
  const split = splitPrefetchedAnswer(reply, prefetchedFirstSentenceRef.current);
  prefetchedFirstSentenceRef.current = null;
  if (!split) {
    playReply(reply, emotion);
    return;
  }
  speakWithDriver(split.first, emotion, getReplyAction(reply, emotion), { interrupt: true });
  speakWithDriver(split.rest, emotion);
}, [playReply, speakWithDriver]);
```

Use `playReplyWithPrefetch(answer, emotion)` only in the `done` branch. FAQ/cache hits, local answers, and offline answers continue using `playReply()` and clear the prefetch ref.

- [ ] **Step 6: Verify GREEN**

Run:

```powershell
npm test -- --runInBand __tests__/firstSentencePrefetch.test.ts __tests__/chatPressResponsiveness.test.ts __tests__/vrmSpeechCleanup.test.ts __tests__/vrmManagerLoadRace.test.ts
npx tsc --noEmit
```

Expected: all selected tests pass and TypeScript exits 0.

### Task 6: Regression, documentation, restart, and latency verification

**Files:**
- Modify: `docs/vrm-digital-human/mobile-performance-sync.md`
- Verify: all files above

- [ ] **Step 1: Run focused backend and mobile regression suites**

Run:

```powershell
backend\venv\Scripts\pytest.exe backend\tests\test_rate_limiter.py backend\tests\test_tts.py backend\tests\test_tts_streaming.py -q -p no:cacheprovider
cd software\mobile
npm test -- --runInBand __tests__/ttsPromiseCache.test.ts __tests__/firstSentencePrefetch.test.ts __tests__/vrmSpeechCleanup.test.ts __tests__/chatPressResponsiveness.test.ts __tests__/vrmVoiceMode.test.ts
npx tsc --noEmit
```

Expected: zero failures.

- [ ] **Step 2: Update synchronization documentation**

Append a `2026-07-13 首句延迟优化` section to `docs/vrm-digital-human/mobile-performance-sync.md` documenting:

- Redis rate-limit circuit breaker duration.
- First complete sentence delimiter set.
- Promise reuse between prefetch and playback.
- Existing single pending-speech slot for the remainder.
- Web `/api/tts/stream` now forwards CosyVoice WebSocket callback chunks through SSE; mobile incremental MP3 decoding remains a separate future change.

- [ ] **Step 3: Restart only the backend and Expo listeners**

Stop only the processes listening on ports 8000 and 8081. Restart `backend/run.py` from `backend` and `npm run web -- --port 8081` from `software/mobile`, using hidden windows and the existing `tmp/` log files. Poll `/health` and `/status` until both return successfully.

- [ ] **Step 4: Measure Redis circuit-breaker latency**

With Redis still unavailable, issue two unique short `/api/tts/cache` requests. The first may include the Redis connection timeout; the second, sent within 30 seconds, must not include another approximately 1-second rate-limiter delay. Record total milliseconds for both.

- [ ] **Step 5: Verify prefetch request timing in the browser/dev logs**

Send a streamed chat answer containing at least two sentences. Confirm the first `/api/tts/cache` request starts after the first sentence delimiter arrives and before the chat `done` event. Confirm the first sentence and remainder play in order without duplicate synthesis for the first sentence.

- [ ] **Step 6: Final hygiene**

Run:

```powershell
git diff --check
git status --short
```

Confirm no API keys, generated MP3 files, cache files, or temporary debug instrumentation were added to tracked source.
