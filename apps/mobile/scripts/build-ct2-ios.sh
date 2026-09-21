#!/usr/bin/env bash
# Build CTranslate2 + SentencePiece as xcframeworks for iOS (device + simulator).
# Run this once on your dev Mac. Output goes to ios/CTranslate2/{frameworks,include}.
#
# Prerequisites: Xcode, CMake (brew install cmake)
# Usage: bash apps/mobile/scripts/build-ct2-ios.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_ROOT="$MOBILE_DIR/.ct2-build"
OUTPUT_DIR="$MOBILE_DIR/ios/CTranslate2"

IOS_DEPLOYMENT_TARGET="15.1"

echo "=== CTranslate2 iOS Build (device + simulator) ==="
echo "Build dir: $BUILD_ROOT"
echo "Output dir: $OUTPUT_DIR"
echo "Deployment target: $IOS_DEPLOYMENT_TARGET"
echo ""

mkdir -p "$BUILD_ROOT"

# Platforms to build for
PLATFORMS=("OS64" "SIMULATORARM64")
PLATFORM_LABELS=("iphoneos" "iphonesimulator")

########################################
# Clone sources (once)
########################################
SP_SRC="$BUILD_ROOT/sentencepiece"
CT2_SRC="$BUILD_ROOT/CTranslate2"

if [ ! -d "$SP_SRC" ]; then
  echo "Cloning SentencePiece..."
  git clone --depth 1 https://github.com/google/sentencepiece.git "$SP_SRC"
fi

if [ ! -d "$CT2_SRC" ]; then
  echo "Cloning CTranslate2 (with submodules)..."
  git clone --depth 1 --recurse-submodules --shallow-submodules \
    https://github.com/OpenNMT/CTranslate2.git "$CT2_SRC"
fi

########################################
# Build for each platform
########################################
for i in "${!PLATFORMS[@]}"; do
  PLATFORM="${PLATFORMS[$i]}"
  LABEL="${PLATFORM_LABELS[$i]}"

  echo ""
  echo "========================================"
  echo "Building for $LABEL ($PLATFORM)"
  echo "========================================"

  # --- SentencePiece ---
  SP_BUILD="$BUILD_ROOT/sp-build-$LABEL"
  SP_PREFIX="$BUILD_ROOT/sp-install-$LABEL"

  rm -rf "$SP_BUILD" "$SP_PREFIX"
  mkdir -p "$SP_BUILD"

  cmake -S "$SP_SRC" -B "$SP_BUILD" \
    -DCMAKE_TOOLCHAIN_FILE="$SP_SRC/cmake/ios.toolchain.cmake" \
    -DPLATFORM=$PLATFORM \
    -DDEPLOYMENT_TARGET=$IOS_DEPLOYMENT_TARGET \
    -DENABLE_BITCODE=OFF \
    -DCMAKE_INSTALL_PREFIX="$SP_PREFIX" \
    -DSPM_ENABLE_SHARED=OFF \
    -DSPM_BUILD_TEST=OFF \
    -DSPM_USE_BUILTIN_PROTOBUF=ON \
    -DBUILD_SHARED_LIBS=OFF \
    -DCMAKE_BUILD_TYPE=Release

  cmake --build "$SP_BUILD" --config Release -j$(sysctl -n hw.logicalcpu)
  cmake --install "$SP_BUILD" --config Release

  echo "SentencePiece ($LABEL) built: $SP_PREFIX/lib/"

  # --- CTranslate2 ---
  CT2_BUILD="$BUILD_ROOT/ct2-build-$LABEL"
  CT2_PREFIX="$BUILD_ROOT/ct2-install-$LABEL"

  rm -rf "$CT2_BUILD" "$CT2_PREFIX"
  mkdir -p "$CT2_BUILD"

  cmake -S "$CT2_SRC" -B "$CT2_BUILD" \
    -DCMAKE_TOOLCHAIN_FILE="$SP_SRC/cmake/ios.toolchain.cmake" \
    -DPLATFORM=$PLATFORM \
    -DDEPLOYMENT_TARGET=$IOS_DEPLOYMENT_TARGET \
    -DENABLE_BITCODE=OFF \
    -DCMAKE_INSTALL_PREFIX="$CT2_PREFIX" \
    -DCMAKE_CXX_STANDARD=17 \
    -DBUILD_SHARED_LIBS=OFF \
    -DCMAKE_BUILD_TYPE=Release \
    -DWITH_MKL=OFF \
    -DWITH_DNNL=OFF \
    -DWITH_CUDA=OFF \
    -DWITH_CUDNN=OFF \
    -DWITH_OPENBLAS=OFF \
    -DWITH_ACCELERATE=ON \
    -DWITH_RUY=OFF \
    -DOPENMP_RUNTIME=NONE \
    -DBUILD_CLI=OFF \
    -DWITH_TESTS=OFF \
    -DENABLE_CPU_DISPATCH=OFF \
    -DCMAKE_PREFIX_PATH="$SP_PREFIX" \
    -DCMAKE_FIND_ROOT_PATH="$SP_PREFIX" \
    -DCMAKE_FIND_ROOT_PATH_MODE_PACKAGE=BOTH

  cmake --build "$CT2_BUILD" --config Release -j$(sysctl -n hw.logicalcpu)
  cmake --install "$CT2_BUILD" --config Release

  echo "CTranslate2 ($LABEL) built: $CT2_PREFIX/lib/"
done

########################################
# Create XCFrameworks
########################################
echo ""
echo "=== Creating XCFrameworks ==="

XCFW_DIR="$OUTPUT_DIR/frameworks"
rm -rf "$XCFW_DIR"
mkdir -p "$XCFW_DIR"

# CTranslate2 xcframework
xcodebuild -create-xcframework \
  -library "$BUILD_ROOT/ct2-install-iphoneos/lib/libctranslate2.a" \
  -library "$BUILD_ROOT/ct2-install-iphonesimulator/lib/libctranslate2.a" \
  -output "$XCFW_DIR/libctranslate2.xcframework"

echo "Created libctranslate2.xcframework"

# SentencePiece xcframework
xcodebuild -create-xcframework \
  -library "$BUILD_ROOT/sp-install-iphoneos/lib/libsentencepiece.a" \
  -library "$BUILD_ROOT/sp-install-iphonesimulator/lib/libsentencepiece.a" \
  -output "$XCFW_DIR/libsentencepiece.xcframework"

echo "Created libsentencepiece.xcframework"

########################################
# Copy headers
########################################
echo ""
echo "=== Copying headers ==="
rm -rf "$OUTPUT_DIR/include"
mkdir -p "$OUTPUT_DIR/include"

CT2_INSTALL="$BUILD_ROOT/ct2-install-iphoneos"
SP_INSTALL="$BUILD_ROOT/sp-install-iphoneos"

# CTranslate2 headers
cp -R "$CT2_INSTALL/include/ctranslate2" "$OUTPUT_DIR/include/"
# nlohmann + half_float (CT2 header dependencies)
[ -d "$CT2_INSTALL/include/nlohmann" ] && cp -R "$CT2_INSTALL/include/nlohmann" "$OUTPUT_DIR/include/"
[ -d "$CT2_INSTALL/include/half_float" ] && cp -R "$CT2_INSTALL/include/half_float" "$OUTPUT_DIR/include/"

# SentencePiece headers
mkdir -p "$OUTPUT_DIR/include/sentencepiece"
cp "$SP_INSTALL"/include/sentencepiece*.h "$OUTPUT_DIR/include/sentencepiece/"

echo ""
echo "=== Output ==="
echo "Frameworks:"
ls -la "$XCFW_DIR/"
echo ""
echo "Headers:"
find "$OUTPUT_DIR/include" -name "*.h" -o -name "*.hpp" | head -20
echo ""
echo "=== Done! ==="
echo "Next: cd apps/mobile/ios && pod install"
