import type { Project } from '../core/types';
import type { StyleGraph } from './styleGraphV4';

export type ProjectWithGraph = Project & { styleGraphV4?: StyleGraph };

export function saveProjectWithGraph(project: Project, v4: StyleGraph): ProjectWithGraph {
    const cloned = JSON.parse(JSON.stringify(project)) as ProjectWithGraph;
    (cloned as any).styleGraphV4 = JSON.parse(JSON.stringify(v4));
    return cloned;
}

export function loadProjectWithGraph(obj: any): { project: Project; v4: StyleGraph } {
    const project = obj as ProjectWithGraph;
    const v4 = (project.styleGraphV4 ?? { sheets: [{ id:'sheet-0', name:'Default', rules: [] }], tokens: [] }) as StyleGraph;
    if ('styleGraphV4' in project) delete (project as any).styleGraphV4;
    return { project: project as Project, v4 };
}