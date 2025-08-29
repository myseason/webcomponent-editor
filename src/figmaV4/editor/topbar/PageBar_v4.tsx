/**
 * figmaV4/editor/topbar/PageBar_v4.tsx
 * Controls for screen/theme/state preview.
 */
import React from 'react';
import { useV4Store } from '../../store/editStore';

export const PageBarV4: React.FC = () => {
  const setActiveVariant = useV4Store(s => s.setActiveVariant);
  const ui = useV4Store(s => s.ui);

  return (
    <div style={{ height:48, borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', gap:12, padding:'0 12px', background:'#fff' }}>
      <div style={{ fontWeight:600 }}>Preview</div>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ color:'#6b7280' }}>Screen</span>
        <select value={String(ui.variants.screen||'base')} onChange={(e)=>setActiveVariant('screen', e.target.value)}>
          <option value="base">Base</option>
          <option value="tablet">Tablet</option>
          <option value="mobile">Mobile</option>
        </select>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ color:'#6b7280' }}>Theme</span>
        <select value={String(ui.variants.theme||'light')} onChange={(e)=>setActiveVariant('theme', e.target.value)}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ color:'#6b7280' }}>State</span>
        <select value={String(ui.variants.state||'')} onChange={(e)=>setActiveVariant('state', e.target.value)}>
          <option value="">(none)</option>
          <option value="hover">hover</option>
          <option value="focus">focus</option>
          <option value="active">active</option>
        </select>
      </div>
    </div>
  );
};
