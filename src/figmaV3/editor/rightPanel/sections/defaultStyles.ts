export const INITIAL_STYLE_DEFAULTS: Record<string, string> = {
    // ── Layout: Display & Flow
    display: 'block',
    overflow: 'visible',

    // Flex container (display:flex일 때 기본)
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    flexWrap: 'nowrap',
    gap: '0',

    // Grid container (display:grid일 때 기본)
    gridTemplateColumns: 'auto',
    gridTemplateRows: 'auto',
    justifyItems: 'stretch',
    // alignItems는 flex와 공유 키이므로 위 값 재사용('stretch')

    // Flex/Grid item (부모 컨테이너일 때 기본)
    alignSelf: 'auto',
    order: '0',
    flex: '0 1 auto',
    gridColumn: 'auto',
    gridRow: 'auto',
    justifySelf: 'auto',

    // ── Layout: Position
    position: 'relative',

    // ── Layout: Sizing
    width: 'auto',
    minWidth: '',
    maxWidth: '',
    height: 'auto',
    minHeight: '',
    maxHeight: '',
    aspectRatio: '',
    boxSizing: 'content-box',

    // ── Layout: Spacing
    padding: '0',
    paddingTop: '0',
    paddingRight: '0',
    paddingBottom: '0',
    paddingLeft: '0',

    margin: '0',
    marginTop: '0',
    marginRight: '0',
    marginBottom: '0',
    marginLeft: '0',

    // gap은 위에 이미 '0'

    // ── Typography: Font
    fontFamily: 'Inter',
    fontSize: '14',        // 칩 옵션이 숫자 문자열이므로 px 없이 저장
    fontStyle: 'normal',
    fontWeight: '400',
    color: '#000000',

    // ── Typography: Text
    textAlign: 'left',
    textTransform: 'none',
    textDecoration: 'none',
    lineHeight: '1.5',
    letterSpacing: '0',

    // ── Typography: Content Flow
    whiteSpace: 'normal',
    wordBreak: 'normal',
    textOverflow: 'clip',

    // ── Appearance: Fill (background)
    backgroundColor: 'transparent',
    background: '',               // 셔트핸드: 비워두고 상세 열때 롱핸드 기본 주입
    backgroundImage: 'none',
    backgroundSize: 'auto',       // 이미지 있을 때 ensureLonghandDefaults 가 'cover'로 보정
    backgroundRepeat: 'repeat',
    backgroundPosition: '50% 50%',
    backgroundClip: 'border-box',
    backgroundOrigin: 'padding-box',
    backgroundAttachment: 'scroll',

    // ── Appearance: Border & Outline
    border: '',                   // 셔트핸드
    borderWidth: '0',             // 칩 옵션 일관성(숫자 문자열)
    borderStyle: 'none',
    borderColor: 'currentColor',

    borderRadius: '0',
    borderTopLeftRadius: '0',
    borderTopRightRadius: '0',
    borderBottomRightRadius: '0',
    borderBottomLeftRadius: '0',

    outline: '',                  // 셔트핸드
    outlineWidth: '0',
    outlineStyle: 'none',
    outlineColor: 'currentColor',

    // ── Effects
    opacity: '1',
    filter: '',
    mixBlendMode: 'normal',
    transform: '',
    transformOrigin: '50% 50%',
    perspective: '',

    transition: '',
    transitionProperty: '',
    transitionDuration: '200ms',
    transitionTimingFunction: 'ease',
    transitionDelay: '0ms',

    // ── Interactivity
    cursor: 'auto',
    pointerEvents: 'auto',
    userSelect: 'auto',

    // ── 내부 컨텍스트(편집기 주입)
    __parentDisplay: '',          // 편집기에서 필요 시 주입
};