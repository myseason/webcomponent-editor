// 개발 모드에 따른 상단 보더 색상 클래스 (공통 유틸)
import type {EditorUI} from "@/figmaV3/core/types";

export function modeBorderClass(mode?: string) {
    return mode === 'Page' ? 'border-t-blue-500' : 'border-t-purple-500';
}
