#!/bin/bash
# ============================================================
# College Staff Daily Activity Recording System
# Linux/Mac startup script
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo " ===================================================="
echo "  College Staff Diary System — Starting Services..."
echo " ===================================================="
echo ""

# Start backend in background
echo "[1/2] Starting Backend (port 5000)..."
cd "$ROOT_DIR"
node backend/server.js &
BACKEND_PID=$!
echo "      Backend PID: $BACKEND_PID"

sleep 2

# Start frontend
echo "[2/2] Starting Frontend (port 3000)..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "      Frontend PID: $FRONTEND_PID"

echo ""
echo " ===================================================="
echo "  Services running:"
echo "  Backend API:  http://localhost:5000"
echo "  Frontend App: http://localhost:3000"
echo ""
echo "  Press Ctrl+C to stop both services."
echo " ===================================================="

# Wait and cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Services stopped.'" EXIT
wait
