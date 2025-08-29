/**
 * figmaV4/core/tokens.ts
 * Seed tokens for base UI theme.
 */

import type { Token } from './types';

export const seedTokens: Token[] = [
  // color
  { id:'color.bg',      type:'color', value:'#ffffff' },
  { id:'color.surface', type:'color', value:'#f7f7f8' },
  { id:'color.text',    type:'color', value:'#111827' },
  { id:'color.muted',   type:'color', value:'#6b7280' },
  { id:'color.primary', type:'color', value:'#3b82f6' },
  { id:'color.primary-contrast', type:'color', value:'#ffffff' },
  { id:'color.border',  type:'color', value:'#e5e7eb' },

  // space (px)
  { id:'space.0', type:'space', value:0 },
  { id:'space.1', type:'space', value:4 },
  { id:'space.2', type:'space', value:8 },
  { id:'space.3', type:'space', value:12 },
  { id:'space.4', type:'space', value:16 },
  { id:'space.6', type:'space', value:24 },
  { id:'space.8', type:'space', value:32 },

  // radius
  { id:'radius.sm', type:'radius', value:6 },
  { id:'radius.md', type:'radius', value:10 },
  { id:'radius.lg', type:'radius', value:16 },

  // font (composite via CSS vars)
  { id:'font.body', type:'font', value:{ family:'Inter, system-ui, sans-serif', size:14, lineHeight:1.6, weight:400 } },
  { id:'font.h1',   type:'font', value:{ family:'Inter, system-ui, sans-serif', size:28, lineHeight:1.3, weight:700 } },
  { id:'font.h2',   type:'font', value:{ family:'Inter, system-ui, sans-serif', size:22, lineHeight:1.35, weight:600 } },

  // shadow
  { id:'shadow.sm', type:'shadow', value:'0 1px 3px rgba(0,0,0,0.08)' },
  { id:'shadow.md', type:'shadow', value:'0 4px 14px rgba(0,0,0,0.10)' },
];
