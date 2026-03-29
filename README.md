# Shrine Map Translation (No Paid APIs)

This project can run Urdu translation without any paid API dependency.

## Website Editing

The shrine page now supports two save modes directly on the website:

- `Save Locally` keeps edits in this browser using `localStorage`.
- `Save to Google Sheet` sends edits back to your sheet through a Google Apps Script web app.

There is still no separate admin dashboard.

### How it works

- Shrine data still starts from the Google Sheet CSV.
- Local edits are saved in this browser using `localStorage`.
- The map page and shrine page both read those local overrides.
- If you configure the Google Apps Script endpoint, the editor can also write back to the sheet.

### Local save behavior

- Edits only exist in the browser where you made them.
- Other devices and visitors will not see local-only changes.
- Clearing browser storage will remove local-only edits.

### Google Sheet save behavior

- `Save to Google Sheet` is disabled until you add a Google Apps Script web app URL in `editor-config.js`.
- After a sheet save, the site can also mirror that change locally so you see it immediately while the published CSV catches up.
- This is still a lightweight system. The password and any script key you place in frontend config are not a hardened security model.

### Article section columns

To make the shrine page read like a Wikipedia article, add these columns to your sheet:

- `Description`
- `History`
- `Architecture`
- `Rituals`
- `Saint Biography`
- `Events & Urs`
- `Visiting Info`
- `Sources`

You can also use a single `Description` cell with headings instead of separate section columns.

Accepted heading styles include:

- `## History`
- `## Architecture`
- `## Rituals`
- `## Saint Biography`
- `## Events & Urs`
- `## Visiting Info`
- `## Sources`
- `## Overview`
- `## Historical Background`
- `## Modern Challenges`
- `History:`
- `Architecture:`

When headings are present inside `Description`, the shrine page will:

- use the text before the first heading as the lead/intro
- turn each heading into its own article section automatically
- still use separate section columns as fallback if a heading-based section is missing
- accept custom markdown-style headings, not just the preset section names

How to format them:

- Put long text directly inside each cell.
- Separate paragraphs with a blank line inside the cell.
- In Google Sheets, use `Alt+Enter` while editing a cell to create a new line.
- If you want a list, put each item on its own line starting with `- ` or `1. `.

Urdu versions:

- Add matching Urdu columns like `History Urdu`, `Architecture Urdu`, `Rituals Urdu`, `Saint Biography Urdu`, and so on.
- The site will prefer the Urdu column when the page is switched to Urdu.

### Gallery columns

For the image gallery, use repeatable column pairs like:

- `Gallery 1 Image`
- `Gallery 1 Caption`
- `Gallery 2 Image`
- `Gallery 2 Caption`
- `Gallery 3 Image`
- `Gallery 3 Caption`

You can keep going with `Gallery 4`, `Gallery 5`, and so on.

Gallery rules:

- Put a direct image URL in each `Gallery N Image` column.
- Put the matching caption in `Gallery N Caption`.
- Urdu captions can be added as `Gallery 1 Caption Urdu`, `Gallery 2 Caption Urdu`, and so on.
- The page will render any numbered gallery columns it finds.
- The page also accepts simpler column names like `Image 1`, `Image 2`, `Image 1 Caption`, and `Image 2 Caption`.
- If there is no main `Image Link`, the first numbered image is used in the infobox automatically.

### Setup

1. Edit `editor-config.js`.
2. Set your local editor password.
3. If you only want local saves, you can stop there.
4. If you want Google Sheet saves too, open `google-apps-script/Code.gs` in Google Apps Script.
5. Set `SCRIPT_API_KEY` in that file to a long secret.
6. Deploy it as a web app bound to your spreadsheet.
7. Copy the web app URL into `editor-config.js` as `googleSheets.endpointUrl`.
8. Copy the same secret into `editor-config.js` as `googleSheets.apiKey`.
9. Optionally set `googleSheets.sheetName` if your data is not on the first sheet.
10. Open any shrine page, click `Admin Login`, and choose either save button.

### Files used

- `editor-config.js` - local password plus optional Google Sheet save settings
- `data-source.js` - CSV loader, local overrides, and Google Sheet save requests
- `shrine.js` - inline edit controls on the shrine page
- `google-apps-script/Code.gs` - sample Apps Script backend for sheet writes

## Runtime behavior

1. Manual Urdu columns are preferred (`Name Urdu`, `Description Urdu`, etc.).
2. If not present, the app checks `translations.js` (`window.SHRINE_TRANSLATIONS`).
3. If not found, the app falls back to English text.

No third-party translation API calls are made at runtime.

## Generate `translations.js` once (optional)

You can generate a translation dictionary once, then commit it to this repo.

1. Run a self-hosted LibreTranslate server (example endpoint: `http://127.0.0.1:5000/translate`).
2. Run:

```powershell
python build_translation_cache.py --output translations.js
```

Optional flags:

```powershell
python build_translation_cache.py --csv-url "<YOUR_CSV_URL>" --libre-url "http://127.0.0.1:5000/translate" --output translations.js
```

This keeps the site fully open source and avoids payment-linked translation services.
