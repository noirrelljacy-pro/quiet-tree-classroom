import { defineConfig } from 'vite';

// Verified public repository: https://github.com/noirrelljacy-pro/quiet-tree-classroom
// A separate mode keeps ordinary static exports portable.
export default defineConfig(({ mode }) => ({
  base: mode === 'github-pages' ? '/quiet-tree-classroom/' : './',
}));
