/**
 * figmaV4/editor/right/sections/CascadeView.tsx
 * Shows cascade across Base/Tablet/Mobile for a node.
 */
import React, { useMemo } from 'react';
import { useV4Store } from '../../../store/editStore';

const KEYS = ['width','height','paddingX','paddingY','bg','color','radius','borderWidth','borderColor','shadow'];

function renderVal(v:any) {
  if (v && typeof v === 'object' && v.token) return `token:${v.token}`;
  return v === undefined ? '' : String(v);
}

export const CascadeView: React.FC = () => {
  const nodeId = useV4Store(s => s.ui.selection);
  const getCascade = useV4Store(s => s.getCascadeForNode);
  const variants = useV4Store(s => s.ui.variants);

  const cas = useMemo(() => nodeId ? getCascade(nodeId) : null, [nodeId, getCascade, variants]);
  if (!nodeId || !cas) return null;

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight:600, marginBottom:6 }}>Cascade</div>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign:'left', padding:'4px 6px', borderBottom:'1px solid #e5e7eb' }}>Key</th>
            <th style={{ textAlign:'left', padding:'4px 6px', borderBottom:'1px solid #e5e7eb' }}>Base</th>
            <th style={{ textAlign:'left', padding:'4px 6px', borderBottom:'1px solid #e5e7eb' }}>Tablet</th>
            <th style={{ textAlign:'left', padding:'4px 6px', borderBottom:'1px solid #e5e7eb' }}>Mobile</th>
            <th style={{ textAlign:'left', padding:'4px 6px', borderBottom:'1px solid #e5e7eb' }}>Current({variants.screen})</th>
          </tr>
        </thead>
        <tbody>
          {KEYS.map(k => (
            <tr key={k}>
              <td style={{ padding:'4px 6px', borderBottom:'1px solid #f3f4f6', color:'#6b7280' }}>{k}</td>
              <td style={{ padding:'4px 6px', borderBottom:'1px solid #f3f4f6' }}>{renderVal((cas.base as any)[k])}</td>
              <td style={{ padding:'4px 6px', borderBottom:'1px solid #f3f4f6' }}>{renderVal((cas.tablet as any)[k])}</td>
              <td style={{ padding:'4px 6px', borderBottom:'1px solid #f3f4f6' }}>{renderVal((cas.mobile as any)[k])}</td>
              <td style={{ padding:'4px 6px', borderBottom:'1px solid #f3f4f6', fontWeight:600 }}>{renderVal((cas.current as any)[k])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
