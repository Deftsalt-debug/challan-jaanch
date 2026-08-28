#!/bin/zsh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
ASSET_DIR="$PROJECT_DIR/submission/video-assets"
OUTPUT="$PROJECT_DIR/submission/challan-jaanch-submission.mp4"

swift "$PROJECT_DIR/submission/video-production/compose_silent_demo.swift" "$ASSET_DIR" "$OUTPUT"
