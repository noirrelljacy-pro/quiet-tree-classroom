import { copyFile } from 'node:fs/promises';

// Keep notices with standalone dist distributions, including Vite's preload helper.
await copyFile(
  new URL('../LICENSE', import.meta.url),
  new URL('../dist/LICENSE.txt', import.meta.url),
);
await copyFile(
  new URL('../THIRD_PARTY_NOTICES.md', import.meta.url),
  new URL('../dist/THIRD_PARTY_NOTICES.txt', import.meta.url),
);
await copyFile(
  new URL('../node_modules/vite/LICENSE.md', import.meta.url),
  new URL('../dist/VITE_LICENSE.txt', import.meta.url),
);
