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

export default useVoiceRecord;
