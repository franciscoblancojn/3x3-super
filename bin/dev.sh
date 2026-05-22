#!/usr/bin/env bash
source ~/.nvm/nvm.sh
nvm use 22.12

echo "🚀 Iniciando servidor WebSocket..."
node server/index.js &
WS_PID=$!

echo "🌐 Iniciando Vite dev server (LAN)..."
vite --host

kill $WS_PID 2>/dev/null