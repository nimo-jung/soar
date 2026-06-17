#!/usr/bin/env python3
"""
Attempt to export a sentence-transformers model to ONNX using Optimum if available.

Usage:
  python tools/export_to_onnx.py --model sentence-transformers/all-MiniLM-L6-v2 --out /app/model

Note: This script is best-effort — exporting models reliably may require specific tokenizers
and conversion flags. If Optimum is not installed, the script will print instructions.
"""
import argparse
import os
import sys
import shutil

def try_optimum_export(model_name: str, out_dir: str) -> bool:
    try:
        from optimum.onnxruntime import ORTModelForFeatureExtraction
        print(f"[export] Using Optimum ORTModelForFeatureExtraction to fetch and save: {model_name}")
        ort_model = ORTModelForFeatureExtraction.from_pretrained(model_name)
        ort_model.save_pretrained(out_dir)
        print("[export] Saved ONNX model and assets to:", out_dir)
        return True
    except Exception as e:
        print("[export] Optimum export failed:", e)
        return False


def try_transformers_onnx_export(model_name: str, out_dir: str) -> bool:
    try:
        # Use transformers.onnx (requires transformers>=4.34) CLI-like API
        from transformers import AutoTokenizer, AutoModel
        print(f"[export] Downloading model/tokenizer: {model_name}")
        tok = AutoTokenizer.from_pretrained(model_name)
        model = AutoModel.from_pretrained(model_name)

        # Save a local copy (transformers.onnx CLI or optimum is preferred for real exports)
        tmp_dir = out_dir + "/_pt_tmp"
        os.makedirs(tmp_dir, exist_ok=True)
        tok.save_pretrained(tmp_dir)
        model.save_pretrained(tmp_dir)

        print("[export] Saved PyTorch model to temporary dir. For ONNX conversion, use optimum or transformers.onnx CLI with proper flags.")
        # Leave artifacts for manual conversion
        if not os.path.exists(out_dir):
            os.makedirs(out_dir, exist_ok=True)
        # move tokenizer and model to out_dir for convenience
        for name in os.listdir(tmp_dir):
            shutil.move(os.path.join(tmp_dir, name), os.path.join(out_dir, name))
        shutil.rmtree(tmp_dir, ignore_errors=True)
        print("[export] Downloaded assets placed into:", out_dir)
        return True
    except Exception as e:
        print("[export] transformers export step failed:", e)
        return False


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--model", required=True)
    p.add_argument("--out", required=True)
    args = p.parse_args()

    model_name = args.model
    out_dir = args.out
    os.makedirs(out_dir, exist_ok=True)

    # 1) Try optimum ONNX export
    if try_optimum_export(model_name, out_dir):
        print("[export] Optimum ONNX export succeeded")
        return 0

    # 2) Try transformers-based export (download assets for manual conversion)
    if try_transformers_onnx_export(model_name, out_dir):
        print("[export] Downloaded model/tokenizer for manual ONNX conversion")
        return 0

    print("\n[export] No export path succeeded. Install optimum[onnxruntime] or follow README for manual conversion.")
    return 2


if __name__ == '__main__':
    sys.exit(main())
