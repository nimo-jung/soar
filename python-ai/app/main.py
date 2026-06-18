from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
import os
import hashlib
from typing import Optional, Dict, Any, List
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct, Filter, FieldCondition, MatchValue

# Optional sentence-transformers model
MODEL_NAME = os.getenv("MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
USE_MODEL = os.getenv("USE_EMBED_MODEL", "1")
_encoder = None

app = FastAPI(title="TMS Python AI (minimal)")

QDRANT_HOST = os.getenv("QDRANT_HOST", "qdrant")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
EMBED_DIM = int(os.getenv("EMBED_DIM", "64"))


def get_qdrant_client() -> QdrantClient:
    return QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)


def deterministic_embedding(text: str, dim: int = EMBED_DIM) -> List[float]:
    """
    Lightweight deterministic embedding for demo purposes.
    Produces a fixed-length float vector from a SHA-256 digest.
    Not suitable for production semantic embeddings — replace with a real model.
    """
    vec: List[float] = []
    cur = hashlib.sha256(text.encode("utf-8")).digest()
    while len(vec) < dim:
        for i in range(0, len(cur), 8):
            if len(vec) >= dim:
                break
            chunk = cur[i:i+8]
            val = int.from_bytes(chunk, "big", signed=False)
            f = (val / (2**64 - 1)) * 2 - 1
            vec.append(float(f))
        if len(vec) < dim:
            cur = hashlib.sha256(cur).digest()
    return vec[:dim]


def model_embed(text: str) -> List[float]:
    """
    Embedding pipeline (in priority order):
      1. ONNX model (if USE_ONNX=1 and model files exist)
      2. sentence-transformers (if USE_EMBED_MODEL=1)
      3. deterministic SHA-256 fallback (always available, not semantic)
    """
    global _encoder

    # ---- Fast path: no ML at all ----
    use_ml = os.getenv("USE_EMBED_MODEL", "1") == "1"

    # ONNX path takes precedence when enabled
    if os.getenv("USE_ONNX", "0") == "1":
        try:
            import onnxruntime as ort
            import numpy as np
            from transformers import AutoTokenizer

            model_dir = os.getenv("ONNX_MODEL_PATH", "/app/model")
            # Prefer directory with tokenizer + model files
            if os.path.isdir(model_dir):
                sess = None
                # try to find a .onnx file
                onnx_file = None
                for f in os.listdir(model_dir):
                    if f.endswith('.onnx'):
                        onnx_file = os.path.join(model_dir, f)
                        break
                if onnx_file and os.path.exists(onnx_file):
                    sess = ort.InferenceSession(onnx_file, providers=["CPUExecutionProvider"])

                if sess is not None:
                    # load tokenizer from model_dir if available
                    try:
                        tokenizer = AutoTokenizer.from_pretrained(model_dir)
                        toks = tokenizer(text, return_tensors='np', truncation=True, padding='max_length', max_length=128)
                        inputs = {}
                        # map tokenizer outputs to session input names
                        for inp in sess.get_inputs():
                            name = inp.name
                            if name in toks:
                                inputs[name] = toks[name]
                        # fallback: use input_ids only
                        if not inputs and 'input_ids' in toks:
                            inputs = {sess.get_inputs()[0].name: toks['input_ids']}

                        out = sess.run(None, inputs)
                        vec = np.asarray(out[0]).reshape(-1)
                        v = vec.tolist()
                        if len(v) < EMBED_DIM:
                            v = v + [0.0] * (EMBED_DIM - len(v))
                        return [float(x) for x in v[:EMBED_DIM]]
                    except Exception:
                        # tokenizer/onnx signature mismatch — fallback
                        pass
        except Exception:
            pass
        except Exception:
            pass

    # ---- sentence-transformers path (CPU only) ----
    if use_ml and os.getenv("USE_EMBED_MODEL", "1") == "1":
        try:
            if _encoder is None:
                from sentence_transformers import SentenceTransformer
                _encoder = SentenceTransformer(MODEL_NAME)
            emb = _encoder.encode(text, convert_to_numpy=True)
            # Ensure length matches EMBED_DIM; pad/truncate as needed
            v = emb.tolist()
            if len(v) < EMBED_DIM:
                v = v + [0.0] * (EMBED_DIM - len(v))
            return [float(x) for x in v[:EMBED_DIM]]
        except Exception:
            # fallback
            pass
    # Always fallback to deterministic embedding
    return deterministic_embedding(text, EMBED_DIM)


class UpsertRequest(BaseModel):
    tenant_id: str
    collection: str
    text: str
    metadata: Optional[Dict[str, Any]] = None
    point_id: Optional[str] = None


class SearchRequest(BaseModel):
    tenant_id: str
    collection: str
    text: str
    top_k: Optional[int] = 5


def require_api_key(x_api_key: Optional[str] = Header(None)):
    """Simple API key check. Set API_KEY env var to enable."""
    expected = os.getenv("API_KEY", "")
    if expected:
        if not x_api_key or x_api_key != expected:
            raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return True


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/qdrant/ping")
def qdrant_ping():
    try:
        client = get_qdrant_client()
        cols = client.get_collections()
        return {"qdrant_collections": [c.name for c in cols.collections]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed_upsert")
def embed_upsert(req: UpsertRequest, _auth=Depends(require_api_key)):
    try:
        client = get_qdrant_client()
        coll_names = [c.name for c in client.get_collections().collections]
        if req.collection not in coll_names:
            client.create_collection(collection_name=req.collection,
                                     vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE))

        embedding = model_embed(req.text)
        payload = {"tenant_id": req.tenant_id}
        if req.metadata:
            payload.update(req.metadata)

        point_id = req.point_id or None
        point = PointStruct(id=point_id, vector=embedding, payload=payload)
        client.upsert(collection_name=req.collection, points=[point])
        return {"status": "ok", "point_id": point.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search")
def search(req: SearchRequest, _auth=Depends(require_api_key)):
    try:
        client = get_qdrant_client()
        embedding = model_embed(req.text)

        flt = Filter(must=[
            FieldCondition(key="tenant_id", match=MatchValue(value=req.tenant_id))
        ])

        hits = client.search(collection_name=req.collection, query_vector=embedding, limit=req.top_k or 5, filter=flt)
        results = []
        for h in hits:
            results.append({"id": h.id, "score": h.score, "payload": h.payload})
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ready")
def readiness():
    """Readiness: checks Qdrant connectivity and model availability (if enabled)."""
    # Qdrant
    try:
        client = get_qdrant_client()
        _ = client.get_collections()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Qdrant unreachable: {e}")

    # Model
    if USE_MODEL == "1":
        try:
            _ = model_embed("health check")
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Embedding model failed: {e}")

    return {"status": "ready"}
