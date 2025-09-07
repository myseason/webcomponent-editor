// core/utils.ts
import { VIEWPORTS, type Viewport } from './types';
import { HUB_TABS, type HubTab } from './constants';

export const isViewport = (v: string): v is Viewport =>
    (VIEWPORTS as readonly string[]).includes(v as any);

export const isHubTab = (t: string): t is HubTab =>
    (HUB_TABS as readonly string[]).includes(t as any);