/**
 * figmaV4/style/presets.stylesheet.ts
 * Base UI presets for common components
 */
import type { StyleSheet } from '../core/types';

export const baseUIStyles: StyleSheet = {
  id: 'sheet-base-ui',
  name: 'Base UI',
  rules: [
    // Text
    { id:'r-text-base', selector:{by:'component', ref:'Text'}, conditions:{}, declarations:{
      color: { token:'color.text' },
      font:  { token:'font.body' },
    }},
    // Button
    { id:'r-btn-base', selector:{by:'component', ref:'Button'}, conditions:{}, declarations:{
      paddingX: { token:'space.4' }, paddingY: { token:'space.2' },
      radius:   { token:'radius.md' },
      bg:       { token:'color.primary' },
      color:    { token:'color.primary-contrast' },
      shadow:   { token:'shadow.sm' },
      borderColor: { token:'color.primary' }, borderWidth: 1,
    }},
    { id:'r-btn-hover', selector:{by:'component', ref:'Button'}, conditions:{ state:'hover' }, declarations:{
      shadow: { token:'shadow.md' },
    }},
    // Card
    { id:'r-card', selector:{by:'component', ref:'Card'}, conditions:{}, declarations:{
      bg: { token:'color.bg' }, radius: { token:'radius.lg' }, shadow: { token:'shadow.sm' },
      padding: { token:'space.4' }, borderColor: { token:'color.border' }, borderWidth: 1,
    }},
    // Image
    { id:'r-image', selector:{by:'component', ref:'Image'}, conditions:{}, declarations:{
      radius: { token:'radius.md' },
    }},
    // Stack
    { id:'r-stack', selector:{by:'component', ref:'Stack'}, conditions:{}, declarations:{
      gap: { token:'space.4' },
    }},
    // Responsive example
    { id:'r-btn-mobile', selector:{by:'component', ref:'Button'}, conditions:{ screen:'mobile' }, declarations:{
      paddingX: { token:'space.3' }, paddingY: { token:'space.1' },
    }},
  ],
};
