import type { TreeState } from './engine';

export function treeMarkup(): string {
  const leaves = [
    [238, 210, -35, 1],
    [360, 205, 30, 1],
    [203, 171, -25, 1.1],
    [397, 159, 35, 1.1],
    [246, 134, -40, 1.2],
    [352, 119, 35, 1.2],
    [294, 83, -5, 1.2],
    [173, 225, -55, 0.9],
    [425, 219, 55, 0.9],
    [212, 97, -35, 0.85],
    [386, 86, 35, 0.85],
    [288, 150, -25, 1],
    [330, 164, 45, 1],
    [259, 57, -35, 0.8],
    [333, 48, 25, 0.8],
    [153, 166, -50, 0.8],
    [441, 153, 50, 0.8],
  ];
  return `<svg class="landscape" viewBox="0 0 600 390" role="img" aria-labelledby="tree-title">
    <title id="tree-title">一棵等待成长的小树</title>
    <defs>
      <linearGradient id="leaf" x2=".8" y2="1"><stop stop-color="#8daa69"/><stop offset="1" stop-color="#49754d"/></linearGradient>
      <linearGradient id="trunk" x2="1" y2="0"><stop stop-color="#947858"/><stop offset="1" stop-color="#b59a6d"/></linearGradient>
      <linearGradient id="ground" x2="0" y2="1"><stop stop-color="#d7e1bf"/><stop offset="1" stop-color="#eaf0dc"/></linearGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <circle cx="445" cy="75" r="37" fill="#eee5b7" opacity=".7"/>
    <g fill="none" stroke="#bacbb2" stroke-width="2" stroke-linecap="round" opacity=".55"><path d="M88 111h34m-16 9h37M473 153h38m-17 10h34"/></g>
    <path d="M40 335Q130 292 236 323Q402 266 567 330" fill="#e2e8d5"/>
    <ellipse cx="300" cy="342" rx="241" ry="37" fill="url(#ground)"/>
    <ellipse cx="300" cy="337" rx="67" ry="9" fill="#9da77c" opacity=".2" filter="url(#soft)"/>
    <g class="adult" id="adult-tree">
      <g fill="none" stroke="url(#trunk)" stroke-linecap="round" stroke-linejoin="round">
        <path d="M300 333Q301 238 302 106" stroke-width="15"/>
        <path d="M299 265Q239 239 200 180M301 235Q365 219 400 165M300 207Q255 182 245 137M302 174Q344 153 353 119M302 139L287 89" stroke-width="8"/>
        <path d="M237 224L177 226M368 206L425 219M245 179L213 102M352 157L383 89M282 127L260 60M306 109L332 52M202 185L156 168M396 174L438 155" stroke-width="4"/>
      </g>
      <g id="leaves">${leaves.map(([x, y, r, s], i) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><g class="leaf" style="--i:${i}"><path d="M0 13C-46 5-46-38-6-43C22-43 36-9 0 13Z" fill="url(#leaf)"/><path d="M-2 7L-9-29" fill="none" stroke="#d3ddad" stroke-width="1.3" opacity=".5"/></g></g>`).join('')}</g>
      <g class="fruits" fill="#d79850" stroke="#bd7b37" stroke-width="1"><circle cx="237" cy="204" r="12"/><circle cx="365" cy="187" r="13"/><circle cx="304" cy="126" r="11"/><path d="M237 192l3-8m125-10 3-7m-64-53 3-7" stroke="#64794c" stroke-width="3"/></g>
    </g>
    <g id="seedling"><path d="M300 333Q304 294 298 263" stroke="#8e7854" stroke-width="6" stroke-linecap="round" fill="none"/>
      <g class="sprout-leaves"><path d="M300 290C259 296 248 257 262 252C287 249 302 268 300 290" fill="#71955b"/><path d="M302 279C300 248 331 234 343 244C347 266 322 283 302 279" fill="#91ac6c"/><path d="M300 289l-30-27m33 16 30-27" stroke="#c4d39e" fill="none" stroke-width="1.2"/></g>
    </g>
    <g fill="none" stroke="#8fa26b" stroke-width="2" stroke-linecap="round"><path d="M147 343l-3-11m3 11 6-8M449 338l1-10m-1 10-6-6M220 356l-2-7m2 7 5-5"/></g>
    <g fill="#c1bd89"><ellipse cx="198" cy="341" rx="4" ry="2"/><ellipse cx="390" cy="352" rx="5" ry="2.5"/></g>
  </svg>`;
}
export function renderTree(element: HTMLElement, state: TreeState): void {
  const adult = state.progress >= 0.25;
  element.style.setProperty('--tree-scale', String(0.54 + state.progress * 0.46));
  element.style.setProperty('--droop', `${(1 - state.health) * 55}deg`);
  element.style.setProperty('--leaf-saturation', String(0.45 + state.health * 0.55));
  element.classList.toggle('has-grown', adult);
  element.classList.toggle('has-fruit', state.phase === 'fruit');
  const stage =
    state.phase === 'fruit' ? '果实' : state.progress >= 0.65 ? '成熟树' : adult ? '小树' : '幼苗';
  element.querySelector('title')!.textContent =
    `${stage}，成长 ${Math.floor(state.progress * 100)}%，${state.health < 1 ? '叶片正在恢复或下垂' : '叶片舒展'}`;
}
