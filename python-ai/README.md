# Python AI (FastAPI) scaffold

This is a minimal Python FastAPI service intended to act as the Agentic AI layer (Qdrant integration).

Quick start (from repo root):

```bash
docker build -t tms-python-ai:local ./python-ai
docker run --rm -p 8000:8000 --name tms-python-ai -e QDRANT_HOST=qdrant -e QDRANT_PORT=6333 tms-python-ai:local
```

Endpoints:
- `/health` — simple liveness
- `/qdrant/ping` — returns list of collections from Qdrant
 - `/ready` — readiness: validates Qdrant connectivity and embedding model
 - `/embed_upsert` — POST: upsert text as embedding into a collection (protected by API key if `API_KEY` set)
 - `/search` — POST: semantic search with tenant filter

ONNX model (optional):
- Place an ONNX model file at `python-ai/model/model.onnx` and set `USE_ONNX=1` and `ONNX_MODEL_PATH=/app/model/model.onnx` in the service env to prefer ONNX inference.
- For production, convert a sentence-transformers model to ONNX/ORT format and ensure input/output shapes match your model's expectations. The current ONNX path is a placeholder and may require a custom preprocessor.

API key:
- Build-time conversion helper:
	- You can convert a model during the docker build by passing build-arg `CONVERT_ONNX=1` and optionally `MODEL_NAME`.
	- Example: `docker build --build-arg CONVERT_ONNX=1 --build-arg MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2 -t tms-python-ai:with-onnx ./python-ai`
	- The build will attempt to install `optimum[onnxruntime]` and run `tools/export_to_onnx.py` to place converted files into `/app/model`.

API key:
- Set `API_KEY` env var for the `python-ai` service to require `x-api-key` header on protected endpoints (`/embed_upsert`, `/search`).
