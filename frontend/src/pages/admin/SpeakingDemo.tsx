import React, { useState, useCallback, useRef, useEffect } from 'react';
import DigitalHuman from '../../components/DigitalHuman/DigitalHuman';
import { COSTUMES } from '../../config/costumeMap';

const DEMO_TEXTS = [
  '你好！欢迎来到灵山景区，我是你的数字人导游。今天让我带你领略这里的美丽风光和悠久历史。',
  '灵山梵宫是景区的核心景点，建筑气势恢宏，内部装饰精美绝伦，融合了众多传统文化元素。',
  '你知道吗？灵山大佛高八十八米，是世界上最高的青铜佛像之一，非常壮观！',
  '每年的春节期间，灵山景区都会举办盛大的庙会活动，吸引了成千上万的游客前来参观。',
];

const SpeakingDemo: React.FC = () => {
  const [text, setText] = useState(DEMO_TEXTS[0]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | undefined>();
  const [selectedCostume, setSelectedCostume] = useState('festival-spring');
  const [mode, setMode] = useState<'tts' | 'browser' | 'silent'>('silent');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const startSilentSpeaking = useCallback(() => {
    // Simulate speaking duration based on text length (Chinese: ~5 chars/sec)
    const durationMs = Math.max(2000, (text.length / 4) * 1000);
    setIsSpeaking(true);
    timerRef.current = setTimeout(() => {
      setIsSpeaking(false);
    }, durationMs);
  }, [text]);

  const startBrowserSpeaking = useCallback(() => {
    if (!window.speechSynthesis) {
      startSilentSpeaking();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [text, startSilentSpeaking]);

  const startTtsSpeaking = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id: 'voice-1', speed: 1.0 }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setIsSpeaking(true);
        const audio = new Audio(url);
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          setAudioUrl(undefined);
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          setAudioUrl(undefined);
        };
        await audio.play();
      } else {
        startSilentSpeaking();
      }
    } catch {
      startSilentSpeaking();
    }
  }, [text, startSilentSpeaking]);

  const handleSpeak = useCallback(() => {
    if (!text.trim()) return;

    // Stop any current speaking
    window.speechSynthesis?.cancel();
    if (timerRef.current) clearTimeout(timerRef.current);

    if (mode === 'tts') startTtsSpeaking();
    else if (mode === 'browser') startBrowserSpeaking();
    else startSilentSpeaking();
  }, [text, mode, startTtsSpeaking, startBrowserSpeaking, startSilentSpeaking]);

  const handleStop = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsSpeaking(false);
    setAudioUrl(undefined);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      padding: '32px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
    }}>
      <h1 style={{
        color: '#F3EFE6',
        fontFamily: 'var(--font-serif)',
        fontSize: '24px',
        fontWeight: 700,
        margin: 0,
        letterSpacing: '0.1em',
      }}>
        🎭 数字人语音 · 表情 · 动作 演示
      </h1>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start' }}>
        {/* Left: Digital Human */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '20px',
          padding: '20px',
          border: '1px solid rgba(201, 169, 110, 0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <DigitalHuman
            width={340}
            height={460}
            emotion="neutral"
            isSpeaking={isSpeaking}
            speakingText={text}
            audioUrl={audioUrl}
            costumeId={selectedCostume}
          />
          {/* Status indicator */}
          <div style={{
            textAlign: 'center',
            marginTop: '12px',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 500,
            color: isSpeaking ? '#4ade80' : '#94a3b8',
            background: isSpeaking ? 'rgba(74, 222, 128, 0.1)' : 'rgba(148, 163, 184, 0.05)',
            border: `1px solid ${isSpeaking ? 'rgba(74, 222, 128, 0.3)' : 'rgba(148, 163, 184, 0.15)'}`,
            transition: 'all 300ms',
          }}>
            {isSpeaking ? '● 说话中' : '○ 待机'}
          </div>
        </div>

        {/* Right: Controls */}
        <div style={{
          width: '380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {/* Mode selector */}
          <div style={{
            padding: '16px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ fontSize: '12px', color: '#C8A951', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.05em' }}>
              语音模式
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'silent' as const, label: '纯演示', desc: '无声音，只看动作表情' },
                { id: 'browser' as const, label: '浏览器语音', desc: '使用系统TTS' },
                { id: 'tts' as const, label: '后端TTS', desc: '需要后端服务' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  title={m.desc}
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    borderRadius: '8px',
                    border: mode === m.id ? '1.5px solid #C8A951' : '1px solid rgba(255,255,255,0.12)',
                    background: mode === m.id ? 'rgba(200, 169, 81, 0.15)' : 'transparent',
                    color: mode === m.id ? '#C8A951' : 'rgba(243,239,230,0.6)',
                    fontSize: '12px',
                    fontWeight: mode === m.id ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Costume selector */}
          <div style={{
            padding: '16px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ fontSize: '12px', color: '#C8A951', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.05em' }}>
              服装选择
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {Object.values(COSTUMES).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCostume(c.id)}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '8px',
                    border: selectedCostume === c.id ? '1.5px solid #C8A951' : '1px solid rgba(255,255,255,0.12)',
                    background: selectedCostume === c.id ? 'rgba(200, 169, 81, 0.15)' : 'transparent',
                    color: selectedCostume === c.id ? '#C8A951' : 'rgba(243,239,230,0.6)',
                    fontSize: '11px',
                    fontWeight: selectedCostume === c.id ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 200ms',
                    fontFamily: 'var(--font-serif)',
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Text input */}
          <div style={{
            padding: '16px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ fontSize: '12px', color: '#C8A951', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.05em' }}>
              说话内容
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="输入要说的话..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(201, 169, 110, 0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#F3EFE6',
                fontSize: '14px',
                lineHeight: 1.6,
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            {/* Preset texts */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
              {DEMO_TEXTS.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setText(t)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent',
                    color: 'rgba(243,239,230,0.5)',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  示例{i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSpeak}
              disabled={isSpeaking || !text.trim()}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: isSpeaking
                  ? 'rgba(100,100,100,0.3)'
                  : 'linear-gradient(135deg, #C84B31 0%, #E8A040 100%)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: isSpeaking ? 'not-allowed' : 'pointer',
                transition: 'all 200ms',
                boxShadow: isSpeaking ? 'none' : '0 4px 15px rgba(200, 75, 49, 0.3)',
                fontFamily: 'var(--font-serif)',
                letterSpacing: '0.1em',
              }}
            >
              {isSpeaking ? '⏳ 说话中...' : '▶ 开始说话'}
            </button>
            {isSpeaking && (
              <button
                onClick={handleStop}
                style={{
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#F3EFE6',
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                ⏹
              </button>
            )}
          </div>

          {/* Feature list */}
          <div style={{
            padding: '14px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: '11px', color: 'rgba(243,239,230,0.4)', lineHeight: 1.8 }}>
              <strong style={{ color: 'rgba(200, 169, 81, 0.7)' }}>演示内容：</strong><br />
              👄 唇形同步 — 嘴巴跟随节奏开合<br />
              😐 表情变化 — 根据文本情感切换表情<br />
              👤 头部点头 — 说话时的自然点头动作<br />
              💪 手臂微动 — 自然的手势摆动<br />
              🧍 身体摇摆 — 脊柱轻微晃动
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeakingDemo;
