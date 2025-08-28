'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import type { NodeId, Node, SupportedEvent, ActionStep, CSSDict, Viewport } from '../../core/types';
import type { EditorStoreState } from '../../store/editStore';
import { useEditor } from '../useEditor';
import { getRenderer } from '../../core/registry';
import { evalWhenExpr } from '../../runtime/expr';
import { runActions } from '../../runtime/actions';
import { findEdges, applyEdge, checkWhen } from '../../runtime/flow';
import { toReactStyle } from '../../runtime/styleUtils';

const VOID_ELEMENTS = new Set([
    'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr',
]);

const NON_CONTAINER_HOSTS = new Set(['button','a','textarea','select']);

type HostProps = Record<string, unknown> & {
    style?: React.CSSProperties;
    className?: string;
    onClick?: React.MouseEventHandler;
    children?: React.ReactNode;
    'data-node-id'?: string;
};

function chainClick(a?: React.MouseEventHandler, b?: React.MouseEventHandler): React.MouseEventHandler | undefined {
    if (!a && !b) return undefined;
    return (e) => {
        a?.(e);
        b?.(e);
    };
}

function getResponsiveStyles(node: Node, activeViewport: Viewport): React.CSSProperties {
    const baseStyle = node.styles?.element?.base ?? {};
    const tabletStyle = node.styles?.element?.tablet ?? {};
    const mobileStyle = node.styles?.element?.mobile ?? {};

    let merged: CSSDict = { ...baseStyle };
    if (activeViewport === 'tablet') {
        merged = { ...merged, ...tabletStyle };
    } else if (activeViewport === 'mobile') {
        // Mobile inherits tablet styles, which inherit base styles
        merged = { ...merged, ...tabletStyle, ...mobileStyle };
    }

    return toReactStyle(merged);
}

function RenderNode({ id, state }: { id: NodeId; state: EditorStoreState }) {
    const node = state.project.nodes[id];
    if (!node || (node.isVisible === false)) {
        return null; // Do not render if not visible
    }

    const renderer = getRenderer(node.componentId);
    const selected = state.ui.selectedId === id;

    const fire = (evt: SupportedEvent) => {
        const bag = (node.props as any).__actions as Record<SupportedEvent, { when?: { expr?: string }; steps?: ActionStep[] }> | undefined;
        const whenExpr = bag?.[evt]?.when?.expr;
        if (whenExpr && !evalWhenExpr(whenExpr, { data: state.data, node, project: state.project })) {
            return;
        }

        const steps = (bag?.[evt]?.steps ?? []) as ActionStep[];
        void runActions(steps, {
            alert: (msg) => alert(msg),
            setData: state.setData,
            setProps: state.updateNodeProps,
            navigate: (toPageId) => state.selectPage(toPageId),
            openFragment: (fid) => state.openFragment(fid),
            closeFragment: (fid) => state.closeFragment(fid),
            http: async (m, url, body, headers) => {
                const res = await fetch(url, { method: m, headers, body: body ? JSON.stringify(body) : undefined });
                try { return await res.json(); } catch { return await res.text(); }
            },
            emit: () => {},
        });

        findEdges(state, node.id, evt).forEach((edge) => {
            if (checkWhen(edge, state)) {
                applyEdge(edge, {
                    navigate: state.selectPage,
                    openFragment: state.openFragment,
                    closeFragment: state.closeFragment,
                });
            }
        });
    };

    if (!renderer) {
        return <div className="p-2 text-xs text-red-600">Unknown component: {node.componentId}</div>;
    }

    const childrenFromTree = (node.children ?? []).map((cid) => <RenderNode key={cid} id={cid} state={state} />);
    const hostNode = renderer({ node, fire });
    const styleFromNode = getResponsiveStyles(node, state.ui.canvas.activeViewport);

    const onSelect: React.MouseEventHandler = (e) => {
        e.stopPropagation();
        if (!node.locked) {
            state.select(id);
        }
    };

    if (React.isValidElement<HostProps>(hostNode)) {
        const el = hostNode;
        const prev = el.props;
        const hostName = typeof el.type === 'string' ? el.type.toLowerCase() : '';
        const isVoid = hostName ? VOID_ELEMENTS.has(hostName) : false;
        const isNonContainer = hostName ? NON_CONTAINER_HOSTS.has(hostName) : false;
        const isContainer = node.componentId === 'box';

        let outlineClass = '';
        if (selected) outlineClass = ' outline outline-2 outline-blue-500 outline-offset-[-1px]';
        if (node.locked) outlineClass += ' ring-2 ring-red-500 ring-inset';

        const nextStyle: React.CSSProperties = { ...(prev.style ?? {}), ...styleFromNode };
        const nextClass = (prev.className ?? '') + outlineClass;
        const nextOnClick = chainClick(prev.onClick, onSelect);

        const finalProps = { ...prev, style: nextStyle, className: nextClass, onClick: nextOnClick, 'data-node-id': id };

        if (!isContainer || isVoid || isNonContainer) {
            return <>{React.cloneElement(el, finalProps)}{childrenFromTree}</>;
        }

        return React.cloneElement(el, finalProps, <>{prev.children}{childrenFromTree}</>);
    }

    return (
        <div data-node-id={id} onClick={onSelect} style={styleFromNode}>
            {hostNode}
            {childrenFromTree}
        </div>
    );
}

export function Canvas() {
    const state = useEditor();
    const rootId = state.project.rootId;
    const { activeViewport } = state.ui.canvas;

    const boardWidth = activeViewport === 'mobile' ? 375 : activeViewport === 'tablet' ? 768 : state.ui.canvas.width;
    const boardMinHeight = 800;

    const hostRef = React.useRef<HTMLDivElement | null>(null);
    const shadowRef = React.useRef<ShadowRoot | null>(null);
    const rootElRef = React.useRef<HTMLElement | null>(null);

    React.useLayoutEffect(() => {
        if (!hostRef.current || shadowRef.current) return;

        const sr = hostRef.current.attachShadow({ mode: 'open' });
        shadowRef.current = sr;

        const baseStyle = document.createElement('style');
        baseStyle.textContent = `
            :host, .wcd-canvas-root { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
            .wcd-canvas-root { display: block; min-height: 100%; }
            * { box-sizing: border-box; }
        `;
        sr.appendChild(baseStyle);

        const root = document.createElement('div');
        root.className = 'wcd-canvas-root';
        sr.appendChild(root);
        rootElRef.current = root;

        // This is a workaround to ensure re-renders happen inside the portal target
        set((s) => ({ ...s }));
    }, []);

    React.useEffect(() => {
        const sr = shadowRef.current;
        if (!sr) return;

        Array.from(sr.querySelectorAll('link[data-wcd], style[data-wcd]')).forEach(el => el.remove());

        const sheets = state.project.stylesheets?.filter(s => s.enabled) ?? [];
        for (const s of sheets) {
            if (s.source === 'url' && s.url) {
                const link = document.createElement('link');
                link.setAttribute('data-wcd', '1');
                link.rel = 'stylesheet';
                link.href = s.url;
                sr.appendChild(link);
            } else if (s.source === 'inline' && s.content) {
                const st = document.createElement('style');
                st.setAttribute('data-wcd', '1');
                st.textContent = s.content;
                sr.appendChild(st);
            }
        }
    }, [state.project.stylesheets]);

    // Dummy state to force re-render after shadow root is created
    const [, set] = React.useState({});

    return (
        <div className="w-full h-full overflow-auto bg-neutral-200 p-8">
            <div
                className="min-h-full mx-auto my-8 bg-white shadow-lg relative transition-all duration-300"
                style={{ width: boardWidth, minHeight: boardMinHeight }}
                onClick={() => state.select(null)}
            >
                <div ref={hostRef} className="absolute inset-0" />
                {rootElRef.current && createPortal(
                    <RenderNode id={rootId} state={state} />,
                    rootElRef.current
                )}
            </div>
        </div>
    );
}