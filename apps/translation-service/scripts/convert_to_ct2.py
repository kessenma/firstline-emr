#!/usr/bin/env python3
"""
Convert Helsinki-NLP/opus-mt models to CTranslate2 int8 format for on-device mobile translation.

Run this on your dev machine (e.g., MacBook M1 Pro), NOT on the production server.

Usage:
    pip install ctranslate2 transformers sentencepiece
    python convert_to_ct2.py

Output:
    ./output/ct2-opus-mt-ar-en.zip  (~75MB, int8 quantized)
    ./output/ct2-opus-mt-en-ar.zip  (~75MB, int8 quantized)

After conversion, upload the zip files to RustFS object storage at:
    models/translation/ct2-opus-mt-ar-en.zip
    models/translation/ct2-opus-mt-en-ar.zip
"""

import os
import shutil
import zipfile
from pathlib import Path

import ctranslate2


MODELS = [
    {
        "name": "Helsinki-NLP/opus-mt-ar-en",
        "output_dir": "ct2-opus-mt-ar-en",
        "zip_name": "ct2-opus-mt-ar-en.zip",
    },
    {
        "name": "Helsinki-NLP/opus-mt-en-ar",
        "output_dir": "ct2-opus-mt-en-ar",
        "zip_name": "ct2-opus-mt-en-ar.zip",
    },
]

OUTPUT_BASE = Path(__file__).parent / "output"
QUANTIZATION = "int8"


def convert_model(model_name: str, output_dir: str) -> Path:
    """Convert a HuggingFace MarianMT model to CTranslate2 format with int8 quantization."""
    output_path = OUTPUT_BASE / output_dir

    if output_path.exists():
        print(f"  Removing existing output: {output_path}")
        shutil.rmtree(output_path)

    # TransformersConverter handles HuggingFace model download + conversion.
    # copy_files includes the SentencePiece tokenizer files needed for inference.
    print(f"  Converting {model_name} -> {output_path} (quantization={QUANTIZATION})")
    ctranslate2.converters.TransformersConverter(
        model_name,
        copy_files=["source.spm", "target.spm", "vocab.json", "tokenizer_config.json"],
    ).convert(
        str(output_path),
        quantization=QUANTIZATION,
    )

    return output_path


def zip_directory(source_dir: Path, zip_path: Path) -> None:
    """Zip a directory into a single archive."""
    print(f"  Zipping {source_dir} -> {zip_path}")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in sorted(source_dir.rglob("*")):
            if file_path.is_file():
                arcname = file_path.relative_to(source_dir)
                zf.write(file_path, arcname)

    size_mb = zip_path.stat().st_size / (1024 * 1024)
    print(f"  Archive size: {size_mb:.1f} MB")


def main():
    OUTPUT_BASE.mkdir(parents=True, exist_ok=True)

    for model in MODELS:
        print(f"\n{'='*60}")
        print(f"Processing: {model['name']}")
        print(f"{'='*60}")

        # Convert
        output_dir = convert_model(model["name"], model["output_dir"])

        # List output files
        print("  Output files:")
        for f in sorted(output_dir.rglob("*")):
            if f.is_file():
                size_mb = f.stat().st_size / (1024 * 1024)
                print(f"    {f.relative_to(output_dir)}: {size_mb:.1f} MB")

        # Zip
        zip_path = OUTPUT_BASE / model["zip_name"]
        zip_directory(output_dir, zip_path)

    print(f"\n{'='*60}")
    print("Done! Upload these files to RustFS:")
    for model in MODELS:
        zip_path = OUTPUT_BASE / model["zip_name"]
        size_mb = zip_path.stat().st_size / (1024 * 1024)
        print(f"  {zip_path} ({size_mb:.1f} MB) -> models/translation/{model['zip_name']}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
