/**
 * figmaV4/runtime/renderer.tsx
 * Renders CNode tree to React elements. Styling is applied via CSS (StyleGraph).
 */

import React from 'react';
import type { CNodeId, Project } from '../core/types';

type RegistryEl = React.FC<{ nodeId: CNodeId; props: Record<string, unknown>; children?: React.ReactNode }>;

const Box: RegistryEl = ({ nodeId, props, children }) => {
  return <div data-cnode-id={nodeId} data-component-id="Box" {...props}>{children}</div>;
};
const Text: RegistryEl = ({ nodeId, props, children }) => {
  return <span data-cnode-id={nodeId} data-component-id="Text" {...props}>{children}</span>;
};
const Button: RegistryEl = ({ nodeId, props, children }) => {
  return <button data-cnode-id={nodeId} data-component-id="Button" {...props}>{children}</button>;
};
const ImageEl: RegistryEl = ({ nodeId, props }) => {
  const { src, alt, ...rest } = props as any;
  return <img data-cnode-id={nodeId} data-component-id="Image" src={String(src || '')} alt={String(alt || '')} {...rest} />;
};
const Card: RegistryEl = ({ nodeId, props, children }) => {
  return <div data-cnode-id={nodeId} data-component-id="Card" {...props}>{children}</div>;
};
const Stack: RegistryEl = ({ nodeId, props, children }) => {
  return <div data-cnode-id={nodeId} data-component-id="Stack" style={{ display:'flex', gap: undefined }} {...props}>{children}</div>;
};

const REGISTRY: Record<string, RegistryEl> = {
  Box, Text, Button, Image: ImageEl, Card, Stack
};

export function renderTree(project: Project, rootId: CNodeId): React.ReactElement | null {
  const node = project.nodes[rootId];
  if (!node) return null;
  const Comp = REGISTRY[node.componentId] || Box;
  const renderedChildren = (node.children || []).map((cid) => renderTree(project, cid));
  return <Comp key={node.id} nodeId={node.id} props={node.props}>{renderedChildren}</Comp>;
}
