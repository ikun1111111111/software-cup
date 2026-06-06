import React from 'react';

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        animation: 'pageFadeIn 300ms ease-in-out both',
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
