import { useCallback, useRef, useState } from 'react';

// 语音录制Hook返回值接口
export interface VoiceRecordReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  getAudioBlob: () => Blob | null;
  isRecording: boolean;
  error: string | null;
}

/**
 * 语音录制Hook
 * 使用MediaRecorder API实现录音功能
 */
export const useVoiceRecord = (): VoiceRecordReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  /**
   * 开始录音
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 创建MediaRecorder实例
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // 收集音频数据
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // 录音停止时的处理
      mediaRecorder.onstop = () => {
        // 停止所有音频轨道
        stream.getTracks().forEach((track) => track.stop());
      };

      // 开始录音
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setError(err.message || '无法访问麦克风');
      setIsRecording(false);
    }
  }, []);

  /**
   * 停止录音
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  /**
   * 获取录音文件
   */
  const getAudioBlob = useCallback((): Blob | null => {
    if (chunksRef.current.length === 0) {
      return null;
    }

    // 合并音频数据
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    chunksRef.current = [];

    return blob;
  }, []);

  return {
    startRecording,
    stopRecording,
    getAudioBlob,
    isRecording,
    error,
  };
};

/**
 * Convert an audio Blob (e.g. WebM/Opus from MediaRecorder) to a 16kHz mono WAV Blob.
 * The ASR endpoint expects 16kHz 16bit mono WAV.
 */
export async function convertBlobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  const targetSampleRate = 16000;
  const numFrames = Math.max(1, Math.round(audioBuffer.duration * targetSampleRate));
  const offlineCtx = new OfflineAudioContext(1, numFrames, targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();

  const channelData = rendered.getChannelData(0);
  const wavBuffer = new ArrayBuffer(44 + channelData.length * 2);
  const view = new DataView(wavBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + channelData.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, channelData.length * 2, true);

  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

export default useVoiceRecord;
