#!/bin/sh
# Sirve docs/ en http://localhost:8765 (modo local: ?local=1)
cd "$(dirname "$0")/../docs" && exec python3 -m http.server 8765 --bind 127.0.0.1
