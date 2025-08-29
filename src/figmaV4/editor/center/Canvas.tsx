/**
 * figmaV4/editor/center/Canvas.tsx
 * ShadowRoot-based canvas + CSS injection
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useV4Store } from '../../store/editStore';
import { compileToCSS, injectCSS } from '../../style/styleRuntime';
import { renderTree } from '../../runtime/renderer';

export const Canvas: React.FC = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);

  const project = useV4Store(s => s.project);
  const ui = useV4Store(s => s.ui);

  // Setup shadow root
  useEffect(() => {
    if (!rootRef.current) return;
    const root = rootRef.current;
    const host: any = root as any;
    const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    setShadow(shadowRoot);
    return () => { while (shadowRoot.firstChild) shadowRoot.removeChild(shadowRoot.firstChild); };
  }, []);

  // Build CSS (tokens + sheets)
  const css = useMemo(() => compileToCSS(project.stylesheets, ui.variants, project.tokens || []), [project.stylesheets, ui.variants, project.tokens]);

  // Inject CSS
  useEffect(() => {
    if (!shadow) return;
    injectCSS(shadow, css, 'v4-style');
    // also apply theme attr to host
    (shadow.host as HTMLElement).setAttribute('data-theme', String(ui.variants.theme || 'light'));
    const st = ui.variants.state ? String(ui.variants.state) : '';
    if (st) (shadow.host as HTMLElement).setAttribute('data-state', st); else (shadow.host as HTMLElement).removeAttribute('data-state');
  }, [shadow, css, ui.variants.theme]);

  const page = project.routing.pages.find(p => p.id === project.routing.entryPageId);
  const tree = page ? renderTree(project, page.rootId) : null;

  return (
    <div style={{ display:'grid', placeItems:'center', width:'100%', height:'100%', background:'#f0f2f5' }}>
      <div
        ref={rootRef}
        style={{
          width: ui.canvas.width,
          height: ui.canvas.height,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 10px 30px rgba(0,0,0,0.08)',
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden'
        }}
      >
        {shadow ? createPortal(tree, shadow as any) : null}
      </div>
    </div>
  );
};
