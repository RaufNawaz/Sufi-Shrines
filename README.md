# Shrine Map Translation (No Paid APIs)

This project can run Urdu translation without any paid API dependency.

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
