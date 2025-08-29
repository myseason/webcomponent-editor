/**
 * figmaV4/editor/ProjectHome.tsx
 * Placeholder dashboard for environments/data/publish overview.
 */
import React from 'react';
import { useV4Store } from '../store/editStore';

export const ProjectHome: React.FC = () => {
  const project = useV4Store(s => s.project);
  const ui = useV4Store(s => s.ui);
  return (
    <div style={{ padding: 16 }}>
      <h2>Project: {project.name}</h2>
      <div>Theme: {ui.variants.theme || 'light'} / Screen: {ui.variants.screen || 'base'}</div>
      <pre style={{ background:'#f9fafb', padding:12, border:'1px solid #e5e7eb', borderRadius:8 }}>
        {JSON.stringify({ pages: project.routing.pages.map(p => ({ id:p.id, name:p.name, path:p.path })) }, null, 2)}
      </pre>
    </div>
  );
};
