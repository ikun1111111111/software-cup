import React, { type InputHTMLAttributes } from 'react';

/**
 * 水墨输入框
 * 规范文档 3.4 节
 */

interface InkInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

const InkInput: React.FC<InkInputProps> = ({
  label,
  icon,
  style,
  ...props
}) => {
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            marginBottom: 6,
            fontFamily: 'var(--font-serif)',
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--gray-400)',
              fontSize: 16,
              pointerEvents: 'none',
            }}
          >
            {icon}
          </span>
        )}
        <input
          className="input-ink"
          style={{
            paddingLeft: icon ? 40 : 16,
            ...style,
          }}
          {...props}
        />
      </div>
    </div>
  );
};

export default InkInput;
