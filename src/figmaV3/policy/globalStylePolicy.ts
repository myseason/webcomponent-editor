// - 전역 스타일 정책: allow/deny, 태그별 allow/deny, 스타일 메타(타입/단위/프리셋) 제공
import type { GlobalStylePolicy } from '../core/types';

export const GLOBAL_STYLE_POLICY: GlobalStylePolicy = {
    // deny 우선
    deny: [
        // 보안/위험 속성은 기본 금지(필요 시 허용 전환)
        'behavior', 'filter:url', // 레거시/외부 리소스 호출형
    ],

    allow: [
        // 공통 대표 키
        'display', 'overflow',
        'position', 'z-index', 'top', 'right', 'bottom', 'left',
        'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height', 'box-sizing', 'aspect-ratio',
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'row-gap', 'column-gap', 'gap',
        'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 'text-decoration', 'text-transform', 'white-space', 'color', 'font-family', 'font-style',
        'border-width', 'border-style', 'border-color', 'border-radius',
        'outline', 'outline-offset',
        'background-color', 'background-image', 'background-size', 'background-repeat', 'background-position', 'background-clip', 'background-origin',
        'opacity', 'box-shadow', 'filter', 'backdrop-filter', 'mix-blend-mode',
        'cursor', 'pointer-events', 'user-select',
        'transition', 'transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay',
        'animation', 'animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay', 'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'animation-play-state',
        'object-fit', 'object-position',
    ],

    byTag: {
        img: { deny: ['font-size','font-weight','line-height','letter-spacing','text-align'] },
        span: { deny: ['width','height'] },
    },

    // 스타일 메타(검증/에디터 UI)
    meta: {
        display: { type: 'enum', enum: ['block','inline','inline-block','flex','grid','contents','none'] },
        overflow: { type: 'enum', enum: ['visible','hidden','scroll','auto','clip'] },
        position: { type: 'enum', enum: ['static','relative','absolute','fixed','sticky'] },
        'z-index': { type: 'number', min: -9999, max: 9999, step: 1 },
        top: { type: 'length', unit: ['px','%','vh'] }, right: { type: 'length', unit: ['px','%','vh'] },
        bottom: { type: 'length', unit: ['px','%','vh'] }, left: { type: 'length', unit: ['px','%','vh'] },

        width: { type: 'length', unit: ['px','%','vw'] }, height: { type: 'length', unit: ['px','%','vh'] },
        'min-width': { type: 'length', unit: ['px','%','vw'] }, 'max-width': { type: 'length', unit: ['px','%','vw'] },
        'min-height': { type: 'length', unit: ['px','%','vh'] }, 'max-height': { type: 'length', unit: ['px','%','vh'] },
        'box-sizing': { type: 'enum', enum: ['content-box','border-box'] },
        'aspect-ratio': { type: 'ratio' },

        margin: { type: 'length', unit: ['px','%','rem'] }, padding: { type: 'length', unit: ['px','%','rem'] },
        'margin-top': { type: 'length', unit: ['px','%','rem'] }, 'margin-right': { type: 'length', unit: ['px','%','rem'] },
        'margin-bottom': { type: 'length', unit: ['px','%','rem'] }, 'margin-left': { type: 'length', unit: ['px','%','rem'] },
        'padding-top': { type: 'length', unit: ['px','%','rem'] }, 'padding-right': { type: 'length', unit: ['px','%','rem'] },
        'padding-bottom': { type: 'length', unit: ['px','%','rem'] }, 'padding-left': { type: 'length', unit: ['px','%','rem'] },
        'row-gap': { type: 'length', unit: ['px','%','rem'] }, 'column-gap': { type: 'length', unit: ['px','%','rem'] },
        gap: { type: 'length', unit: ['px','%','rem'] },

        'font-size': { type: 'length', unit: ['px','rem','em'] },
        'font-weight': { type: 'enum', enum: ['100','200','300','400','500','600','700','800','900','normal','bold'] },
        'line-height': { type: 'number', min: 0.5, max: 3, step: 0.05 },
        'letter-spacing': { type: 'length', unit: ['px','em'] },
        'text-align': { type: 'enum', enum: ['left','center','right','justify','start','end'] },
        'text-decoration': { type: 'enum', enum: ['none','underline','line-through','overline'] },
        'text-transform': { type: 'enum', enum: ['none','uppercase','lowercase','capitalize'] },
        'white-space': { type: 'enum', enum: ['normal','nowrap','pre','pre-wrap','pre-line','break-spaces'] },
        color: { type: 'color' },
        'font-family': { type: 'string' },
        'font-style': { type: 'enum', enum: ['normal','italic','oblique'] },

        'border-width': { type: 'length', unit: ['px'] },
        'border-style': { type: 'enum', enum: ['none','solid','dashed','dotted','double','groove','ridge','inset','outset'] },
        'border-color': { type: 'color' },
        'border-radius': { type: 'length', unit: ['px','%'] },
        outline: { type: 'string' }, 'outline-offset': { type: 'length', unit: ['px'] },

        'background-color': { type: 'color' },
        'background-image': { type: 'string' },
        'background-size': { type: 'enum', enum: ['auto','cover','contain'] },
        'background-repeat': { type: 'enum', enum: ['repeat','repeat-x','repeat-y','no-repeat','space','round'] },
        'background-position': { type: 'string' },
        'background-clip': { type: 'enum', enum: ['border-box','padding-box','content-box','text'] },
        'background-origin': { type: 'enum', enum: ['border-box','padding-box','content-box'] },

        opacity: { type: 'number', min: 0, max: 1, step: 0.05 },
        'box-shadow': { type: 'string', preset: ['elevation-xs','elevation-sm','elevation-md','elevation-lg'] },
        filter: { type: 'string', preset: ['blur-sm','blur','blur-lg','grayscale','contrast','brightness'] },
        'backdrop-filter': { type: 'string' },
        'mix-blend-mode': { type: 'enum', enum: ['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion','hue','saturation','color','luminosity'] },

        cursor: { type: 'enum', enum: ['default','pointer','move','text','grab','not-allowed'] },
        'pointer-events': { type: 'enum', enum: ['auto','none'] },
        'user-select': { type: 'enum', enum: ['auto','none','text','contain','all'] },

        transition: { type: 'string' },
        'transition-property': { type: 'string' },
        'transition-duration': { type: 'string' },
        'transition-timing-function': { type: 'string' },
        'transition-delay': { type: 'string' },

        animation: { type: 'string' },
        'animation-name': { type: 'string' },
        'animation-duration': { type: 'string' },
        'animation-timing-function': { type: 'string' },
        'animation-delay': { type: 'string' },
        'animation-iteration-count': { type: 'string' },
        'animation-direction': { type: 'string' },
        'animation-fill-mode': { type: 'string' },
        'animation-play-state': { type: 'string' },

        'object-fit': { type: 'enum', enum: ['fill','contain','cover','none','scale-down'] },
        'object-position': { type: 'string' },
    },
};