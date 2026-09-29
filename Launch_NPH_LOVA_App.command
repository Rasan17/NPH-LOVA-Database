#!/bin/bash
# ==============================================================================
# NPH & LOVA CLINICAL DATABASE LAUNCHER
# Conceived & designed for Clinical Biostatistics, Neurosurgery & Hydrocephalus
# Research by Dr G Narenthiran MB ChB BSc(MedSci)(Hons) MRCS(Ed.) FEBNS FRCS(SN)
# Dedicated to Mrs Nirmaladevy Ganesalingam BSc
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "===================================================================="
echo "    NPH & LOVA CLINICAL REGISTRY & TAURI / SQLITE DATABASE"
echo "===================================================================="
echo "Directory: $DIR"
echo ""

# Source cargo if present
if [ -f "$HOME/.cargo/env" ]; then
    . "$HOME/.cargo/env"
fi

export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.cargo/bin:$PATH"

echo "Select launch mode:"
echo "  1) Launch Native Tauri Desktop App (macOS Cocoa / WebKit + SQLite)"
echo "  2) Launch Web Browser Interface (Safari / Chrome)"
echo "  3) Build Production macOS .app & .dmg Installer"
echo ""
read -t 10 -p "Enter choice [1-3] (Default: 1 in 10s): " choice || choice=1
echo ""

case "$choice" in
    2)
        echo "Opening in default browser..."
        open "$DIR/index.html"
        ;;
    3)
        echo "Building native macOS application bundle..."
        npx tauri build
        echo "Build complete. Check src-tauri/target/release/bundle/"
        ;;
    *)
        echo "Starting Tauri Desktop Application..."
        if command -v cargo >/dev/null 2>&1; then
            npx tauri dev
        else
            echo "Rust/Cargo not found in immediate PATH. Opening in web browser mode..."
            open "$DIR/index.html"
        fi
        ;;
esac
