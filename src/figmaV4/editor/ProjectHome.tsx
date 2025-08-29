/**
 * figmaV4/editor/ProjectHome.tsx
 * Environment switcher + basic overview.
 */
import React, { useMemo, useState } from 'react';
import { useV4Store } from '../store/editStore';

export const ProjectHome: React.FC = () => {
  const project = useV4Store(s => s.project);
  const ui = useV4Store(s => s.ui);
  const setActiveEnv = useV4Store(s => s.setActiveEnv);
  const setEnvVar = useV4Store(s => s.setEnvVar);

  const envNames = useMemo(() => Object.keys(project.environments || {}), [project.environments]);
  const env = ui.activeEnv && project.environments ? project.environments[ui.activeEnv] : undefined;

  const [kv, setKv] = useState<{k:string; v:string}>({ k:'PUBLIC_HELLO', v:'world' });

  return (
    <div style={{ padding: 16, display:'grid', gap:12 }}>
      <h2 style={{ margin:0 }}>Project: {project.name}</h2>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div>Environment:</div>
        <select value={ui.activeEnv} onChange={e => setActiveEnv(e.target.value)}>
          {envNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <h3 style={{ margin:'12px 0 6px' }}>Variables ({ui.activeEnv})</h3>
          <pre style={{ background:'#f9fafb', padding:12, border:'1px solid #e5e7eb', borderRadius:8 }}>
            {JSON.stringify(env?.variables || {}, null, 2)}
          </pre>
        </div>
        <div>
          <h3 style={{ margin:'12px 0 6px' }}>Quick Edit Var</h3>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input placeholder="Key" value={kv.k} onChange={e => setKv({ ...kv, k: e.target.value })} />
            <input placeholder="Value" value={kv.v} onChange={e => setKv({ ...kv, v: e.target.value })} />
            <button onClick={() => setEnvVar(ui.activeEnv, kv.k, kv.v)}>Set</button>
          </div>
        </div>
      </div>

      <h3 style={{ margin:'12px 0 6px' }}>Pages</h3>
      <pre style={{ background:'#f9fafb', padding:12, border:'1px solid #e5e7eb', borderRadius:8 }}>
        {JSON.stringify({ pages: project.routing.pages.map(p => ({ id:p.id, name:p.name, path:p.path })) }, null, 2)}
      </pre>
    </div>
  );
};
