/**
 * constants
 */
export const HUB_TABS = ['layers','pages','components','assets','templates','stylesheets','palette'] as const;
export type HubTab = typeof HUB_TABS[number];
