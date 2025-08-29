/**
 * figmaV4/editor/right/sections/StylesSection.tsx
 * Rule-based style editor: calls ensureRule + setDecl under the hood.
 */
import React, { useMemo, useState } from 'react';
import { useV4Store } from '../../../store/editStore';

function parseValue(input: string): any {
  if (!input.length) return undefined;
  if (input.startsWith('token:')) return { token: input.slice('token:'.length) };
  if (!Number.isNaN(Number(input))) return Number(input);
  return input;
}

// Simple Token Picker
const TokenPicker: React.FC<{ label:string; value:any; onPick:(tokenId:string)=>void; filter?:(t:any)=>boolean }> = ({ label, value, onPick, filter }) => {
  const tokens = useV4Store(s => s.project.tokens || []);
  const list = (filter ? tokens.filter(filter) : tokens);
  return (
    <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:8, alignItems:'center' }}>
      <div style={{ color:'#6b7280' }}>{label}</div>
      <div style={{ display:'flex', gap:8 }}>
        <select value={(value && value.token) ? value.token : ''} onChange={e => onPick(e.target.value)}>
          <option value="">(none)</option>
          {list.map((t:any) => <option key={t.id} value={t.id}>{t.id}</option>)}
        </select>
        <span style={{ color:'#9ca3af' }}>{(value && value.token) ? `token:${value.token}` : ''}</span>
      </div>
    </div>
  );
};


const Row: React.FC<{ label:string, value:any, onChange:(v:string)=>void, placeholder?:string }> = ({ label, value, onChange, placeholder }) => {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:8, alignItems:'center' }}>
      <div style={{ color:'#6b7280' }}>{label}</div>
      <input
        value={typeof value === 'object' && value?.token ? `token:${value.token}` : (value ?? '')}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || ''}
      />
    </div>
  );
};

export const StylesSection: React.FC = () => {
  const nodeId = useV4Store(s => s.ui.selection);
  const variants = useV4Store(s => s.ui.variants);
  const ensureRule = useV4Store(s => s.ensureRule);
  const setDecl = useV4Store(s => s.setDecl);
  const project = useV4Store(s => s.project);
  const getEffectiveDecl = useV4Store(s => s.getEffectiveDecl);

  const decl = useMemo(() => nodeId ? getEffectiveDecl(nodeId) : {}, [nodeId, getEffectiveDecl, variants]);

  if (!nodeId) return <div style={{ padding:12, color:'#6b7280' }}>Select a node to edit styles.</div>;

  const patch = (kv: Record<string, any>) => {
    const ruleId = ensureRule({ by:'node', ref: nodeId }, { screen: variants.screen, theme: variants.theme, state: variants.state });
    setDecl(ruleId, kv);
  };

  return (
    <div style={{ display:'grid', gap:8, padding:12 }}>
      <div style={{ fontWeight:600, marginBottom:4 }}>Styles (screen: {variants.screen})</div>
      <Row label="width" value={(decl as any).width} onChange={(v)=>patch({ width: parseValue(v) })} />
      <Row label="height" value={(decl as any).height} onChange={(v)=>patch({ height: parseValue(v) })} />
      <Row label="paddingX" value={(decl as any).paddingX} onChange={(v)=>patch({ paddingX: parseValue(v) })} />
      <Row label="paddingY" value={(decl as any).paddingY} onChange={(v)=>patch({ paddingY: parseValue(v) })} />
      <TokenPicker label="bg" value={(decl as any).bg} onPick={(id)=>patch({ bg: id ? { token:id } : undefined })} filter={(t:any)=>t.type==='color'} />
      <TokenPicker label="color" value={(decl as any).color} onPick={(id)=>patch({ color: id ? { token:id } : undefined })} filter={(t:any)=>t.type==='color'} />
      <TokenPicker label="radius" value={(decl as any).radius} onPick={(id)=>patch({ radius: id ? { token:id } : undefined })} filter={(t:any)=>t.type==='radius'} />
      <Row label="borderWidth" value={(decl as any).borderWidth} onChange={(v)=>patch({ borderWidth: parseValue(v) })} />
      <Row label="borderColor" value={(decl as any).borderColor} onChange={(v)=>patch({ borderColor: parseValue(v) })} />
      <TokenPicker label="shadow" value={(decl as any).shadow} onPick={(id)=>patch({ shadow: id ? { token:id } : undefined })} filter={(t:any)=>t.type==='shadow'} />
    </div>
  );
};
