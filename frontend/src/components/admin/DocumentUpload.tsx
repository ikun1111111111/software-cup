import React, { useCallback, useRef, useState } from 'react';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import { uploadFile as uploadFileApi } from '../../api/knowledge';

export interface UploadResult {
  filename: string;
  file_path: string;
  file_type: string;
  url: string;
}

export interface DocumentUploadProps {
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // in MB
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onSuccess,
  onError,
  accept = '.pdf,.doc,.docx,.txt,.md',
  maxSize = 10,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const validateFile = useCallback((file: File): boolean => {
    if (file.size > maxSize * 1024 * 1024) {
      onError?.(`文件大小超过${maxSize}MB限制`);
      return false;
    }
    return true;
  }, [maxSize, onError]);

  const uploadFile = useCallback(async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    setFileName(file.name);
    setUploadProgress(0);

    // 模拟进度（真实上传无进度回调，用定时器模拟）
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    try {
      const result = await uploadFileApi(file);
      clearInterval(interval);
      setUploadProgress(100);
      setIsUploading(false);
      onSuccess?.(result);
    } catch (err: any) {
      clearInterval(interval);
      setIsUploading(false);
      setUploadProgress(0);
      onError?.(err?.message || '文件上传失败');
    }
  }, [validateFile, onSuccess, onError]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  }, [uploadFile]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  }, [uploadFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div data-testid="document-upload">
      <div
        data-testid="drop-zone"
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${isDragging ? '#1A5FB4' : '#D4D0C8'}`,
          borderRadius: '14px',
          padding: '40px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragging ? '#E8F0FE' : '#FAFAF8',
          transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          data-testid="file-input"
        />

        {isUploading ? (
          <div data-testid="upload-progress">
            <UploadOutlined style={{ fontSize: '32px', color: '#1A5FB4', marginBottom: '12px' }} />
            <p style={{ color: '#1A1614', fontWeight: 500, marginBottom: '12px' }}>正在上传: {fileName}</p>
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#E8E5DF',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                data-testid="progress-bar"
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  backgroundColor: '#1A5FB4',
                  transition: 'width 300ms',
                  borderRadius: '3px',
                }}
              />
            </div>
            <p style={{ fontSize: '13px', color: '#A8A198', marginTop: '8px' }}>{uploadProgress}%</p>
          </div>
        ) : (
          <div>
            <InboxOutlined style={{ fontSize: '40px', color: isDragging ? '#1A5FB4' : '#D4D0C8', marginBottom: '12px' }} />
            <p style={{ fontSize: '15px', color: '#5C554C', fontWeight: 500, marginBottom: '4px' }}>
              点击或拖拽文件到此处上传
            </p>
            <p style={{ fontSize: '12px', color: '#A8A198' }}>
              支持格式: {accept} (最大{maxSize}MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;
