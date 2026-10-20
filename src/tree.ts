import type { TreeState } from './engine';
import { DEFAULT_SPECIES, speciesById, type SpeciesId } from './species';
import { setAttribute, setStyle, setText } from './dom';
import { STAGES, treeVisual } from './visual-model';
// Original deterministic illustration. Columns: anchor, angle, size, growth cohort.
const LEAVES = [
  [225, 278, -53, 1, 1],
  [266, 266, -22, 1.06, 1],
  [374, 269, 42, 1.05, 1],
  [410, 275, 65, 0.94, 1],
  [299, 236, -30, 1.02, 0],
  [342, 231, 27, 1.07, 0],
  [181, 251, -66, 0.91, 1],
  [214, 225, -42, 1.1, 1],
  [258, 217, -18, 1.12, 1],
  [379, 211, 28, 1.2, 1],
  [426, 225, 56, 1.06, 1],
  [460, 249, 73, 0.86, 1],
  [298, 185, -29, 1.12, 0],
  [346, 180, 22, 1.17, 0],
  [207, 182, -61, 0.96, 2],
  [248, 165, -31, 1.15, 2],
  [286, 143, -26, 1.1, 0],
  [333, 132, 12, 1.13, 0],
  [379, 148, 39, 1.1, 2],
  [422, 178, 58, 0.98, 2],
  [251, 119, -40, 0.87, 2],
  [296, 102, -17, 1, 0],
  [348, 95, 19, 0.95, 0],
  [386, 113, 42, 0.88, 2],
  [170, 212, -61, 0.77, 3],
  [458, 203, 68, 0.77, 3],
  [221, 132, -52, 0.8, 3],
  [269, 77, -28, 0.84, 3],
  [318, 64, -6, 0.88, 0],
  [365, 67, 27, 0.82, 3],
  [408, 139, 54, 0.76, 3],
] as const;

const LEAF_PATHS: Record<SpeciesId, string> = {
  camphor: 'M0 12C-29 6-43-15-34-34C-26-51-6-54 7-45C24-33 24-7 0 12Z',
  maple:
    'M0 12L-8-5-28 0-23-14-43-28-23-31-28-47-10-38 0-62 10-38 28-47 23-31 43-28 23-14 28 0 8-5Z',
  cherry:
    'M0 3C-21 20-38-3-22-16C-47-28-25-51-9-35C-12-65 19-65 14-36C39-54 53-27 29-17C51 3 25 22 11 3Q5 10 0 3Z',
  ginkgo: 'M0 12Q-9-5-36-21Q-43-30-36-42Q-18-55-3-42L0-36 4-42Q21-57 39-42Q47-30 38-21Q10-4 0 12Z',
  pine: 'M0 12L-35 0-22-6-43-18-26-22-38-35-17-32-21-48-7-39 0-65 8-39 23-48 18-32 39-35 28-22 44-18 23-6 36 0Z',
};
function leafGraphic(id: SpeciesId, fill: string) {
  return (
    '<path d="' +
    LEAF_PATHS[id] +
    '" fill="' +
    fill +
    '"/>' +
    (id === 'cherry'
      ? '<circle cx="5" cy="-21" r="4.5" fill="#c89563"/><g stroke="#f5ebcb" stroke-width="1.3"><path d="M5-21v-9m0 9 8-4m-8 4 6 6m-6-6-7 6m7-6-8-4"/></g>'
      : '<path d="M0 8V-35M0-6-17-27M0-5 18-27" stroke="#fff8d8" stroke-width="1.1" opacity=".48" fill="none" stroke-linecap="round"/>')
  );
}
function leafPosition(
  id: SpeciesId,
  x: number,
  y: number,
  angle: number,
): [number, number, number] {
  if (id === 'cherry') return [320 + (x - 320) * 1.12, y * 0.67 + 76, angle * 0.7];
  if (id === 'ginkgo') return [320 + (x - 320) * 0.86, y, angle * 0.8];
  if (id === 'maple') return [320 + (x - 320) * 1.03, y * 0.92 + 12, angle * 0.65];
  if (id === 'pine') return [320 + (x - 320) * (0.25 + (0.8 * y) / 278), y, angle * 0.18];
  return [x, y, angle];
}
function foliageMarkup(id: SpeciesId, preview = false) {
  const colors = speciesById(id).colors;
  return LEAVES.map(([x, y, angle, size, group], i) => {
    const [px, py, turn] = leafPosition(id, x, y, angle);
    const graphic = leafGraphic(
      id,
      preview ? colors[[2, 4, 0][i % 3]] : 'url(#leaf-' + ['mid', 'deep', 'light'][i % 3] + ')',
    );
    return (
      '<g transform="translate(' +
      px +
      ' ' +
      py +
      ') rotate(' +
      turn +
      ') scale(' +
      size * (id === 'cherry' ? 0.78 : 1) +
      ')"><g' +
      (preview
        ? ''
        : ' class="leaf-motion" data-cohort="' +
          group +
          '" data-direction="' +
          (x < 320 ? -1 : 1) +
          '"') +
      '>' +
      graphic +
      '</g></g>'
    );
  }).join('');
}
export function speciesPreview(id: SpeciesId) {
  return (
    '<svg viewBox="60 0 520 410" aria-hidden="true" focusable="false"><ellipse cx="320" cy="366" rx="213" ry="23" fill="#dce6ca"/><path d="M310 368Q322 267 315 119L322 110Q327 263 332 368Z" fill="#aa8b60"/>' +
    foliageMarkup(id, true) +
    '</svg>'
  );
}
function fruitGraphic(id: SpeciesId) {
  if (id === 'pine')
    return '<ellipse cy="2" rx="10" ry="17" fill="url(#fruit)"/><path d="M-8-6 8 4M-9 1 6 11M-7 9 4 15M8-6-8 4M9 1-6 11" stroke="#e1bf8d" stroke-width="1.2" fill="none"/>';
  if (id === 'maple')
    return '<path d="M0 3Q-32-27-29-3Q-25 14 0 3Q26 14 29-3Q32-27 0 3Z" fill="url(#fruit)"/><path d="M-20 0 0 3 20 0" stroke="#f7dfac" fill="none"/>';
  return '<circle r="13" fill="url(#fruit)"/><ellipse cx="-4" cy="-4" rx="3" ry="4" fill="#ffe6a2" opacity=".6"/>';
}

export function treeMarkup(id: SpeciesId = DEFAULT_SPECIES): string {
  const { colors, fruit } = speciesById(id);
  return `<svg data-species="${id}" class="landscape" viewBox="0 0 640 420" role="img" aria-labelledby="tree-title">
  <title id="tree-title">幼苗，成长 0%，叶片舒展</title>
  <defs>
    <linearGradient id="leaf-light" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient>
    <linearGradient id="leaf-mid" x2="1" y2="1"><stop stop-color="${colors[2]}"/><stop offset="1" stop-color="${colors[3]}"/></linearGradient>
    <linearGradient id="leaf-deep" x2="1" y2="1"><stop stop-color="${colors[4]}"/><stop offset="1" stop-color="${colors[5]}"/></linearGradient>
    <linearGradient id="bark" x2="1" y2="0"><stop stop-color="#997d56"/><stop offset=".65" stop-color="#bc9b68"/><stop offset="1" stop-color="#94794f"/></linearGradient>
    <linearGradient id="island" x2="0" y2="1"><stop stop-color="#d0dfad"/><stop offset="1" stop-color="#e2e9cd"/></linearGradient>
    <linearGradient id="fruit" x2="1" y2="1"><stop stop-color="${fruit[0]}"/><stop offset="1" stop-color="${fruit[1]}"/></linearGradient>
  </defs>
  <g class="scene-sky" aria-hidden="true">
    <circle cx="479" cy="97" r="53" fill="#f0e5ba" opacity=".18"/><circle cx="479" cy="97" r="38" fill="#eadba8" opacity=".62"/>
    <g fill="none" stroke="#b8cdbb" stroke-width="1.5" stroke-linecap="round" opacity=".65"><path d="M90 147h51m-37 8h20M493 186h48m-29 8h15"/><path d="M139 94q7-5 13 1 5-7 12-4"/></g>
    <path d="M50 343Q138 302 247 334Q415 296 594 346" fill="#e4ecdb"/>
  </g>
  <path d="M80 365Q104 347 169 345H465Q537 348 560 366Q528 401 321 405Q128 401 80 365Z" fill="#d9e3c4"/>
  <ellipse cx="320" cy="363" rx="240" ry="33" fill="url(#island)"/>
  <ellipse cx="320" cy="367" rx="68" ry="8" fill="#8da173" opacity=".18"/>
  <g id="adult-tree" class="adult">
    <path d="M307 368Q315 314 310 258Q318 201 315 119L322 110Q324 187 327 250Q322 312 332 368Z" fill="url(#bark)"/>
    <g id="branches" fill="none" stroke="#a68a5b" stroke-linecap="round" stroke-linejoin="round">
      <path d="M317 307Q265 285 225 254M321 290Q378 283 418 251" stroke-width="8"/>
      <path d="M318 257Q263 228 230 195M322 231Q379 212 411 180M319 210Q289 176 283 142M320 178Q345 142 349 103" stroke-width="6"/>
      <path d="M262 279L181 236M378 277L456 235M264 228L251 162M374 211L379 147M291 170L266 81M320 139L318 67" stroke-width="3.5"/>
    </g>
    <g id="leaves">${foliageMarkup(id)}</g>
    <g id="tree-fruits" class="fruits">${[
      [253, 253],
      [387, 236],
      [321, 169],
    ]
      .map(
        ([x, y]) =>
          `<g transform="translate(${x} ${y})"><path d="M0-10q-2-9 3-13" fill="none" stroke="#55764e" stroke-width="2"/><path d="M2-18q11-8 15-2-8 7-15 2" fill="#72925b"/>${fruitGraphic(id)}</g>`,
      )
      .join('')}</g>
  </g>
  <g id="seedling" class="seedling"><path d="M320 367Q326 319 315 276" stroke="#a28d5e" stroke-width="5" fill="none" stroke-linecap="round"/>
    <g class="sprout-motion" data-direction="-1" style="transform-origin:318px 311px"><path d="M318 311C279 316 252 285 260 264C289 253 320 280 318 311Z" fill="url(#leaf-mid)"/><path d="M314 307l-37-30" stroke="#dce8b7" stroke-width="1.3" fill="none"/></g>
    <g class="sprout-motion" data-direction="1" style="transform-origin:318px 294px"><path d="M318 294C313 260 339 238 364 245C374 270 345 295 318 294Z" fill="url(#leaf-light)"/><path d="M322 290l29-33" stroke="#edf0c7" stroke-width="1.3" fill="none"/></g>
  </g>
  <g aria-hidden="true" fill="none" stroke="#8ba56d" stroke-linecap="round" stroke-width="1.8"><path d="M145 362l-4-11m4 11 5-7M465 365l3-13m-3 13-5-6M226 384l-3-8m3 8 4-5M392 382l4-8"/></g>
  <g fill="#faf8df" aria-hidden="true"><circle cx="148" cy="351" r="2.5"/><circle cx="469" cy="351" r="2.5"/><circle cx="220" cy="376" r="2"/></g>
  <g id="celebration" class="celebration" fill="#d4b15d" aria-hidden="true"><path d="M190 127l3 8 8 3-8 3-3 8-3-8-8-3 8-3ZM448 112l2 6 6 2-6 2-2 6-2-6-6-2 6-2ZM470 284l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/></g>
  </svg>`;
}
export function createTreeRenderer(element: HTMLElement, id: SpeciesId = DEFAULT_SPECIES) {
  const adult = element.querySelector<SVGElement>('#adult-tree')!;
  const sprout = element.querySelector<SVGElement>('#seedling')!;
  const branches = element.querySelector<SVGElement>('#branches')!;
  const leaves = [...element.querySelectorAll<SVGElement>('.leaf-motion')];
  const sproutLeaves = [...element.querySelectorAll<SVGElement>('.sprout-motion')];
  const fruits = element.querySelector<SVGElement>('#tree-fruits')!;
  const celebration = element.querySelector<SVGElement>('#celebration')!;
  const title = element.querySelector('title')!;
  let last = '';
  return (state: TreeState) => {
    const signature = `${state.phase}|${state.progress.toFixed(3)}|${state.health.toFixed(2)}`;
    if (signature === last) return;
    last = signature;
    const v = treeVisual(state);
    setStyle(branches, 'opacity', v.foliage[1].toFixed(3));
    setStyle(adult, 'transform', `scale(${v.adultScale.toFixed(3)})`);
    setStyle(adult, 'opacity', v.adultOpacity.toFixed(3));
    setStyle(sprout, 'transform', `scale(${v.seedlingScale.toFixed(3)})`);
    setStyle(sprout, 'opacity', v.seedlingOpacity.toFixed(3));
    for (const leaf of leaves) {
      const growth = v.foliage[Number(leaf.dataset.cohort)];
      const droop = v.droop * Number(leaf.dataset.direction);
      setStyle(
        leaf,
        'transform',
        `rotate(${droop.toFixed(1)}deg) scale(${(0.12 + 0.88 * growth).toFixed(3)})`,
      );
      setStyle(leaf, 'opacity', growth.toFixed(3));
    }
    for (const leaf of sproutLeaves)
      setStyle(
        leaf,
        'transform',
        `rotate(${(v.droop * Number(leaf.dataset.direction) * 0.6).toFixed(1)}deg)`,
      );
    for (const node of [fruits, celebration]) {
      setStyle(node, 'opacity', v.fruit ? '1' : '0');
      setStyle(node, 'transform', `scale(${v.fruit ? 1 : 0.85})`);
    }
    setAttribute(element, 'data-stage', String(v.stage));
    setText(
      title,
      `${speciesById(id).name} · ${STAGES[v.stage]}，成长 ${Math.floor(state.progress * 100)}%，${state.health < 1 ? '叶片正在恢复或下垂' : '叶片舒展'}`,
    );
  };
}
