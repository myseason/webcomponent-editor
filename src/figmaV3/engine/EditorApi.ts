'use client';

import { projectDomain } from './domains/project';
import { pagesDomain } from './domains/pages';
import { nodesDomain } from './domains/nodes';
import { uiDomain } from './domains/ui';

import { fragmentsDomain } from './domains/fragments';
import { assetsDomain } from './domains/assets';
import { stylesheetsDomain } from './domains/stylesheets';
import { dataDomain } from './domains/data';
import { actionsDomain } from './domains/actions';
import { policyDomain } from './domains/policy';
import { flowDomain } from './domains/flow';
import { selectorsDomain } from './domains/selectors';
import { historyDomain } from './domains/history';

export enum EditorDomain {
    Project = 'project',
    Pages = 'pages',
    Nodes = 'nodes',
    UI = 'ui',
    Fragment = 'fragment',
    Assets = 'assets',
    Stylesheets = 'stylesheets',
    Data = 'data',
    Actions = 'actions',
    Policy = 'policy',
    Flow = 'flow',
    Selectors = 'selectors',
    History = 'history',
}

export type DomainPack = {
    reader: Record<string, any>;
    writer: Record<string, any>;
};

const BaseEngineDomains = [EditorDomain.Project, EditorDomain.UI, EditorDomain.Pages, EditorDomain.Nodes];

function mergeWithGuard(base: Record<string, any>, ext: Record<string, any>, label: string, side: 'reader'|'writer') {
    for (const k of Object.keys(ext)) {
        if (k in base)
            throw new Error(`[useEngine] ${side} key collision ${k} from ${label}`);
        base[k] = ext[k];
    }
}

function getDomainPack(domain: EditorDomain): DomainPack {
    switch (domain) {
        // based
        case EditorDomain.Project: return projectDomain();
        case EditorDomain.Pages: return pagesDomain();
        case EditorDomain.Nodes: return nodesDomain();
        case EditorDomain.UI: return uiDomain();

        // optional
        case EditorDomain.Fragment: return fragmentsDomain();
        case EditorDomain.Assets: return assetsDomain();
        case EditorDomain.Stylesheets: return stylesheetsDomain();
        case EditorDomain.Data: return dataDomain();
        case EditorDomain.Actions: return actionsDomain();
        case EditorDomain.Policy: return policyDomain();
        case EditorDomain.Flow: return flowDomain();
        case EditorDomain.Selectors: return selectorsDomain();
        case EditorDomain.History: return historyDomain();
        default: throw new Error(`[getDomainPack] unsupported domain: ${domain}`);
    }
}

/**
 * useEngine — 기본(Project/Pages/Nodes) + 선택 도메인(0..n)
 * - 인자를 생략하거나 단일/배열로 제공 가능
 * - 항상 Project/Pages/Nodes 포함
 */
export function useEditor(domains?: EditorDomain | EditorDomain[]) {
    const reader: Record<string, any> = {};
    const writer: Record<string, any> = {};

    // 기본 도메인 병합
    for (const d of BaseEngineDomains) {
        const pack = getDomainPack(d);
        mergeWithGuard(reader, pack.reader, d, 'reader');
        mergeWithGuard(writer, pack.writer, d, 'writer');
    }

    // 선택 도메인 병합
    const list = Array.isArray(domains) ? domains : (domains ? [domains] : []);
    for (const d of list) {
        // BaseEngineDomain skipped
        if (BaseEngineDomains.includes(d))
            continue;

        const pack = getDomainPack(d);
        mergeWithGuard(reader, pack.reader, d, 'reader');
        mergeWithGuard(writer, pack.writer, d, 'writer');
    }

    return { reader, writer } as const;
}