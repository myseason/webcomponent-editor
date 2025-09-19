/* scripts/refactor-leftpanel-useEditor-to-controller.cjs
 *
 * LeftPanel 하위의 useEditor 의존을 Controller(Facade)로 치환합니다.
 * - UI/JSX 변경 없음
 * - import 한 줄 교체 + state 어댑터 블럭 삽입
 * - 이미 Controller 기반이면 자동 skip
 * - --slim: 파일별 최소 표면으로 어댑터 구성 (기본은 넓은 표면: 안전)
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const SLIM = args.includes('--slim');

const ROOT_ARG = args.find(a => a.startsWith('--root='));
const ROOT = ROOT_ARG ? ROOT_ARG.split('=')[1] : process.cwd();

// 기본 대상 디렉터리
const LEFT_DIR = path.join(ROOT, 'src', 'figmaV3', 'editor', 'leftPanel');

const TARGET_EXT = /\.(tsx|ts|jsx|js)$/i;

const relImportToFacade = (absFile) => {
    // file: src/figmaV3/editor/leftPanel/(...)/Some.tsx
    // facade: src/figmaV3/controllers/left/LeftPanelFacadeController
    const fromDir = path.dirname(absFile);
    const facadeAbs = path.join(ROOT, 'src', 'figmaV3', 'controllers', 'left', 'LeftPanelFacadeController.ts');
    let rel = path.relative(fromDir, path.dirname(facadeAbs));
    if (!rel || rel === '.') rel = './';
    else rel = rel.replace(/\\/g, '/');
    return `${rel}/LeftPanelFacadeController`;
};

function listFiles(dir, acc = []) {
    if (!fs.existsSync(dir)) return acc;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) listFiles(p, acc);
        else if (TARGET_EXT.test(ent.name)) acc.push(p);
    }
    return acc;
}

function hasUseEditorImport(src) {
    return /import\s*\{\s*useEditor\s*\}\s*from\s*['"][^'"]*\/useEditor['"]\s*;?/.test(src)
        || /const\s+state\s*=\s*useEditor\s*\(\s*\)\s*;/.test(src);
}

function alreadyUsesFacade(src) {
    return /useLeftPanelFacadeController\s*\(/.test(src) || /from\s*['"][^'"]*LeftPanelFacadeController['"]/.test(src);
}

function removeUseEditorImport(src) {
    return src.replace(/import\s*\{\s*useEditor\s*\}\s*from\s*['"][^'"]*\/useEditor['"]\s*;?\s*/g, '');
}

function ensureFacadeImport(src, relPath) {
    if (/from\s*['"][^'"]*LeftPanelFacadeController['"]/.test(src)) return src;
    // 첫 import 뒤에 삽입
    const line = `import { useLeftPanelFacadeController } from '${relPath}';\n`;
    if (/^import[\s\S]*?;/.test(src)) {
        return src.replace(/(^\s*import[^\n]*\n)/, (m) => m + line);
    }
    return line + src;
}

function buildWideAdapter(relPath) {
    // 넓은 표면: 대부분의 Left 패널에서 무리 없이 동작(사용 안 하는 키는 그냥 무시됨)
    return `
const { reader, writer, layers, pages, palette, components, assets, templates, stylesheets, sidebar } = useLeftPanelFacadeController();
const state = {
  // 공통
  ui: reader.ui(),
  project: reader.project(),
  setNotification: writer.setNotification,

  // Layers (Layers.tsx / 드래그/토글/선택)
  outline: layers.reader.outline(),
  nodeById: (id) => reader.project()?.nodes?.[id],
  getNode: (id) => reader.project()?.nodes?.[id],
  setSelectedNodeId: layers.writer.setSelectedNodeId,
  moveNode: layers.writer.moveNode,
  appendChild: layers.writer.appendChild,
  removeCascade: layers.writer.removeCascade,
  toggleHidden: layers.writer.toggleHidden,
  toggleLocked: layers.writer.toggleLocked,

  // Pages (PagesPanel.tsx)
  pages: pages.reader.pages(),
  currentPageId: pages.reader.currentPageId(),
  addPage: pages.writer.addPage,
  removePage: pages.writer.removePage,
  renamePage: pages.writer.renamePage,
  setCurrentPage: pages.writer.setCurrentPage,

  // Palette / Components / Assets / Templates / Stylesheets
  createNode: palette.writer.createNode,
  components: components.reader.components,
  publishComponent: components.writer.publishComponent,

  assets: assets.reader.assets,
  addAsset: assets.writer.addAsset,
  removeAsset: assets.writer.removeAsset,

  templates: templates.reader.templates,
  addTemplate: templates.writer.addTemplate,
  removeTemplate: templates.writer.removeTemplate,

  stylesheets: stylesheets.reader.stylesheets,
  addStylesheet: stylesheets.writer.addStylesheet,
  updateStylesheet: stylesheets.writer.updateStylesheet,
  removeStylesheet: stylesheets.writer.removeStylesheet,
};
`.trim();
}

function buildSlimAdapter(fileBase) {
    // 파일명에 따라 필요한 최소 표면만 주입
    const map = {
        'Layers.tsx': `
const { layers, reader } = useLeftPanelFacadeController();
const state = {
  ui: reader.ui(),
  project: reader.project(),
  outline: layers.reader.outline(),
  nodeById: (id) => reader.project()?.nodes?.[id],
  getNode: (id) => reader.project()?.nodes?.[id],
  setSelectedNodeId: layers.writer.setSelectedNodeId,
  moveNode: layers.writer.moveNode,
  appendChild: layers.writer.appendChild,
  removeCascade: layers.writer.removeCascade,
  toggleHidden: layers.writer.toggleHidden,
  toggleLocked: layers.writer.toggleLocked,
};`.trim(),

        'PagesPanel.tsx': `
const { pages, reader } = useLeftPanel();
const state = {
  ui: reader.ui(),
  project: reader.project(),
  pages: pages.reader.pages(),
  currentPageId: pages.reader.currentPageId(),
  addPage: pages.writer.addPage,
  removePage: pages.writer.removePage,
  renamePage: pages.writer.renamePage,
  setCurrentPage: pages.writer.setCurrentPage,
};`.trim(),

        'Palette.tsx': `
const { palette, reader } = useLeftPanelFacadeController();
const state = {
  ui: reader.ui(),
  project: reader.project(),
  createNode: palette.writer.createNode,
};`.trim(),

        'ComponentsPanel.tsx': `
const { components, reader, writer } = useLeftPanelFacadeController();
const state = {
  ui: reader.ui(),
  project: reader.project(),
  components: components.reader.components,
  publishComponent: components.writer.publishComponent,
  setNotification: writer.setNotification,
};`.trim(),

        'AssetsPanel.tsx': `
const { assets, reader } = useLeftPanelFacadeController();
const state = {
  ui: reader.ui(),
  project: reader.project(),
  assets: assets.reader.assets,
  addAsset: assets.writer.addAsset,
  removeAsset: assets.writer.removeAsset,
};`.trim(),

        'TemplatesPanel.tsx': `
const { templates, reader } = useLeftPanelFacadeController();
const state = {
  ui: reader.ui(),
  project: reader.project(),
  templates: templates.reader.templates,
  addTemplate: templates.writer.addTemplate,
  removeTemplate: templates.writer.removeTemplate,
};`.trim(),

        'ProjectStylesheets.tsx': `
const { stylesheets, reader } = useLeftPanelFacadeController();
const state = {
  ui: reader.ui(),
  project: reader.project(),
  stylesheets: stylesheets.reader.stylesheets,
  addStylesheet: stylesheets.writer.addStylesheet,
  updateStylesheet: stylesheets.writer.updateStylesheet,
  removeStylesheet: stylesheets.writer.removeStylesheet,
};`.trim(),

        'LeftSidebar.tsx': `
const { sidebar, reader } = useLeftPanelFacadeController();
const state = {
  ui: reader.ui(),
  project: reader.project(),
  toggleLeftPanel: sidebar.writer.toggleLeftPanel,
  setLeftPanelTab: sidebar.writer.setLeftPanelTab,
};`.trim(),
    };

    return map[fileBase] || null;
}

function replaceUseEditorState(src, adapterCode) {
    // 가장 안전한 패턴만 치환: "const state = useEditor();"
    const re = /const\s+state\s*=\s*useEditor\s*\(\s*\)\s*;/;
    if (re.test(src)) {
        return src.replace(re, adapterCode);
    }
    // 다른 형태로 구조분해한 경우는 주석으로 표시하고 어댑터 삽입만
    if (/useEditor\s*\(/.test(src)) {
        return src.replace(/useEditor\s*\(\s*\)/g, '/* useEditor removed */ (void 0)')
            .replace(/(^\s*import[^\n]*\n)/, (m)=> m + '\n' + adapterCode + '\n');
    }
    return src; // 없으면 그대로
}

function processFile(abs) {
    const base = path.basename(abs);
    let code = fs.readFileSync(abs, 'utf8');

    if (!hasUseEditorImport(code)) {
        // 이미 컨트롤러 기반이거나 useEditor 미사용 → skip
        return { file: abs, skipped: true, reason: 'no useEditor' };
    }
    if (alreadyUsesFacade(code)) {
        return { file: abs, skipped: true, reason: 'already uses facade' };
    }

    const rel = relImportToFacade(abs);
    let next = code;

    // 1) useEditor import 제거
    next = removeUseEditorImport(next);

    // 2) facade import 삽입
    next = ensureFacadeImport(next, rel);

    // 3) 어댑터 블럭 삽입/치환
    const adapter = SLIM ? (buildSlimAdapter(base) || buildWideAdapter(rel)) : buildWideAdapter(rel);
    next = replaceUseEditorState(next, adapter);

    if (DRY) {
        console.log('------ DRY RUN: would update', path.relative(ROOT, abs));
        console.log(next.substring(0, 500) + (next.length > 500 ? '\n... (truncated)\n' : '\n'));
        return { file: abs, skipped: false, dry: true };
    } else {
        fs.writeFileSync(abs, next, 'utf8');
        return { file: abs, skipped: false, dry: false };
    }
}

function run() {
    const files = listFiles(LEFT_DIR);
    if (!files.length) {
        console.log('[refactor] No files found under', LEFT_DIR);
        return;
    }
    const results = files.map(processFile);

    const updated = results.filter(r => !r.skipped && !r.dry);
    const skipped = results.filter(r => r.skipped);
    const preview = results.filter(r => r.dry);

    if (updated.length) {
        console.log('\n[refactor] Updated files:');
        updated.forEach(r => console.log(' -', path.relative(ROOT, r.file)));
    }
    if (preview.length) {
        console.log('\n[refactor] Previewed files (--dry):');
        preview.forEach(r => console.log(' -', path.relative(ROOT, r.file)));
    }
    if (skipped.length) {
        console.log('\n[refactor] Skipped files:');
        skipped.forEach(r => console.log(' -', path.relative(ROOT, r.file), r.reason ? `(${r.reason})` : ''));
    }
    console.log('\nDone.');
}

run();