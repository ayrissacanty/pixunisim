# Deploy

This project is only [pixunisim](https://github.com/ayrissacanty/pixunisim). Do not push it to unify-campus-quest.

Live site: https://pixunisim.netlify.app
Netlify project: `pixunisim` (`c07e1691-0c64-4413-a07c-730e1cedd4aa`)

Build command: `npm run typecheck && npm run build && (pip install --quiet pillow || true) && python3 tools/build_netlify.py dist`
Publish: `dist` · Functions: `dist/netlify/functions` · Node 20
Base directory: repo root
