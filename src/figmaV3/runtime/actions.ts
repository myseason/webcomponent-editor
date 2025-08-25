import type { ActionStep, NodeId } from '../core/types';

export type ActionDeps = {
  alert: (msg: string) => void;
  setData: (path: string, value: unknown) => void;
  setProps: (nodeId: NodeId, patch: Record<string, unknown>) => void;
  navigate: (toPageId: string) => void;
  openFragment: (fragmentId: string) => void;
  closeFragment: (fragmentId?: string) => void;
  http: (method: 'GET'|'POST', url: string, body?: unknown, headers?: Record<string,string>) => Promise<unknown>;
  emit: (topic: string, payload?: unknown) => void;
};

export async function runActions(steps: ActionStep[], deps: ActionDeps): Promise<void> {
  for (const step of steps) {
    try {
      switch (step.kind) {
        case 'Alert':
          deps.alert(step.message);
          break;
        case 'SetData':
          deps.setData(step.path, step.value);
          break;
        case 'SetProps':
          deps.setProps(step.nodeId, step.patch);
          break;
        case 'Http':
          await deps.http(step.method, step.url, step.body, step.headers);
          break;
        case 'Emit':
          deps.emit(step.topic, step.payload);
          break;
        case 'Navigate':
          deps.navigate(step.toPageId);
          break;
        case 'OpenFragment':
          deps.openFragment(step.fragmentId);
          break;
        case 'CloseFragment':
          deps.closeFragment(step.fragmentId);
          break;
        default: {
          const _never: never = step as never;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          void _never;
        }
      }
    } catch (_err) {
      // 실패 격리: 다음 스텝으로 진행 (로깅은 추후 연결)
    }
  }
}