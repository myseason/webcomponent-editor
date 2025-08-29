/**
 * figmaV4/editor/right/Inspector.tsx
 * Inspector container: hooks current selection & renders StylesSection and Cascade.
 */
import React from 'react';
import { StylesSection } from './sections/StylesSection';
import { CascadeView } from './sections/CascadeView';

export const Inspector: React.FC = () => {
  return (
    <div style={{ width: 360, height: '100%', borderLeft: '1px solid #e5e7eb', background:'#fff', display:'grid', gridTemplateRows:'1fr auto' }}>
      <div style={{ overflowY:'auto' }}>
        <StylesSection />
      </div>
      <div style={{ borderTop:'1px solid #e5e7eb', background:'#fafafa' }}>
        <CascadeView />
      </div>
    </div>
  );
};
