# Deploy

The live site is linked to this repository. Every push to `main` triggers a Netlify build (`netlify.toml`: typecheck + bundle + `tools/build_netlify.py dist`) and publishes `dist/` automatically.

- Build command: `npm run typecheck && npm run build && (pip install --quiet pillow || true) && python3 tools/build_netlify.py dist`
- Publish: `dist` · Functions: `dist/netlify/functions` · Node 20
- Base/package directory: repo root (leave blank in Netlify UI)

Linked: 2026-10-16. Build trigger: 3.
