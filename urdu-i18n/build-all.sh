#!/usr/bin/env bash
# Build ALL Urdu translation artifacts from source, sync them into the app, and
# validate. Run manually with `npm run urdu:build` (or `bash urdu-i18n/build-all.sh`).
#
# What it does:
#   1. Rebuild the data dictionary  → urdu-i18n/shrine-translations.seed.json
#   2. Sync the runtime seed        → src/data/urdu-seed.json  (what the app loads)
#   3. Rebuild the article content  → src/data/urdu-content.json
#   4. Refresh the translation log  → urdu-i18n/TRANSLATION_LOG.md
# Each builder prints a coverage report and FAILS on any Latin-script leak.

set -euo pipefail

# repo root = parent of this script's dir
cd "$(dirname "$0")/.."

echo "▶ [1/4] Building Urdu data dictionary…"
python3 urdu-i18n/build_dictionary.py

echo "▶ [2/4] Syncing runtime seed → src/data/urdu-seed.json"
mkdir -p src/data
cp urdu-i18n/shrine-translations.seed.json src/data/urdu-seed.json

echo "▶ [3/4] Building Urdu article content → src/data/urdu-content.json"
python3 urdu-i18n/build_urdu_content.py

echo "▶ [4/4] Refreshing translation log → urdu-i18n/TRANSLATION_LOG.md"
python3 urdu-i18n/update_log.py

echo "✅ Urdu translations built and synced."
