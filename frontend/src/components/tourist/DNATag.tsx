import React from 'react';

export interface DNATagProps {
  dnaType: string;
}

const DNATag: React.FC<DNATagProps> = ({ dnaType }) => {
  return (
    <span
      data-testid="dna-tag"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 12px',
        backgroundColor: 'var(--color-primary-bg)',
        color: 'var(--color-primary)',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 600,
        border: '1px solid var(--color-primary)',
      }}
    >
      🧬 {dnaType}
    </span>
  );
};

export default DNATag;
