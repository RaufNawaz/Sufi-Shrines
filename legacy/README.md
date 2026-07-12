# Legacy Vanilla-JS App

This directory contains the original vanilla-JS version of the Sufi Shrines of Pakistan site, retained for reference only. It is **not built, imported, or deployed**. The live app is the React/Vite/TypeScript project in `src/`.

## Files

| File | Purpose |
|---|---|
| `app.js` | Main entry point — map init, marker rendering, event handling |
| `shrine.js` | Shrine detail page logic |
| `shrine.html` | Shrine detail page HTML template |
| `style.css` | Global stylesheet |
| `data-source.js` | CSV fetch + PapaParse, buildShrine model |
| `editor-config.js` | Admin/editor config form |
| `translations.js` | i18n strings (English, Urdu) |
| `map.geojson` | Static GeoJSON snapshot (superseded by live CSV) |
| `data.csv` | 1-row data stub (superseded by live Google Sheets CSV) |

## History

The app was rewritten as a Vite + React 18 + TypeScript SPA (entry: `src/main.tsx`). See `CHANGELOG.md` in the project root for details.
