#!/bin/bash
cd "$(dirname "$0")" || exit 1

if command -v python3 >/dev/null 2>&1; then
    exec python3 server.py
fi

if command -v python >/dev/null 2>&1; then
    exec python server.py
fi

if command -v ruby >/dev/null 2>&1; then
    exec ruby server.rb
fi

osascript -e 'display alert "Falta Python 3" message "Instala Python 3 desde python.org y vuelve a abrir este archivo."'
exit 1
