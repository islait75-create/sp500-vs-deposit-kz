#!/bin/zsh
# Полное воспроизведение исследования: данные → анализ → сайт → презентация
set -e
cd "$(dirname "$0")"
.venv/bin/python analysis/build_dataset.py
.venv/bin/python analysis/analyze.py
(cd presentation && node build_deck.js)
echo "Готово. Сайт: node site/serve.js → http://localhost:8765"
