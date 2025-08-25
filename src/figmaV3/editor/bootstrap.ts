/**
 * 에디터 부팅 로직
 * - 컴포넌트 기본 4종을 레지스트리에 등록
 * - 초기 상태/설정 등을 확장하려면 이 파일에서 처리
 */
import '../editor/components/registerBasics';

export function bootstrapEditor(): void {
    // 현재는 사이드 이펙트 import만으로 충분.
    // 추후: 서버에서 프로젝트 로드, 데이터 바인딩 초기화 등 추가 가능.
}