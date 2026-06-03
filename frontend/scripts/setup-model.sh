#!/bin/bash
# Download free Live2D Cubism SDK sample model (Hiyori) for development
# Usage: bash scripts/setup-model.sh

MODEL_DIR="public/models/hiyori"
CUBISM_SDK_URL="https://cdn.jsdelivr.net/gh/niconi233/live2d_models@master"
ALTERNATIVE_URL="https://raw.githubusercontent.com/niconi233/live2d_models/master"

echo "Setting up Live2D sample model..."

mkdir -p "$MODEL_DIR"

# Try downloading Hiyori model files
FILES=(
  "hiyori_pro_t10.model3.json"
  "hiyori_pro_t10.moc3"
  "hiyori_pro_t10.physics3.json"
  "hiyori.4096/texture_00.png"
  "hiyori.4096/texture_01.png"
  "hiyori_m01.motion3.json"
  "hiyori_m02.motion3.json"
  "hiyori_m03.motion3.json"
  "hiyori_m04.motion3.json"
  "hiyori_m05.motion3.json"
  "hiyori_m06.motion3.json"
  "hiyori_m07.motion3.json"
  "hiyori_m08.motion3.json"
  "hiyori_m09.motion3.json"
  "hiyori_m10.motion3.json"
  "hiyori_h01.motion3.json"
  "hiyori_h02.motion3.json"
  "hiyori_h03.motion3.json"
  "hiyori_s01.motion3.json"
  "hiyori_s02.motion3.json"
  "hiyori_s03.motion3.json"
  "hiyori_t01.motion3.json"
  "hiyori_t02.motion3.json"
  "hiyori_t03.motion3.json"
)

for file in "${FILES[@]}"; do
  # Create subdirectories if needed
  mkdir -p "$MODEL_DIR/$(dirname "$file")"

  if [ ! -f "$MODEL_DIR/$file" ]; then
    echo "Downloading $file..."
    curl -sL "$ALTERNATIVE_URL/hiyori/$file" -o "$MODEL_DIR/$file" 2>/dev/null
    if [ ! -s "$MODEL_DIR/$file" ]; then
      curl -sL "$CUBISM_SDK_URL/hiyori/$file" -o "$MODEL_DIR/$file" 2>/dev/null
    fi
    if [ ! -s "$MODEL_DIR/$file" ]; then
      echo "  WARNING: Failed to download $file - model may not work correctly"
    fi
  else
    echo "  $file already exists, skipping"
  fi
done

echo ""
echo "Setup complete! Model files are in $MODEL_DIR"
echo "If downloads failed, manually download from:"
echo "  https://github.com/niconi233/live2d_models/tree/master/hiyori"
echo "  or use any Cubism 4 (.moc3) model"
