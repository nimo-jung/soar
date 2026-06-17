FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

ARG CONVERT_ONNX=0
ARG MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2

# ------ Builder stage: prepare ONNX model (optional) ------
FROM python:3.11-slim AS builder
WORKDIR /src
RUN apt-get update && apt-get install -y --no-install-recommends build-essential gcc git && rm -rf /var/lib/apt/lists/*
COPY requirements-build.txt ./
RUN pip install --no-cache-dir -r requirements-build.txt
COPY tools ./tools
ARG MODEL_NAME
ARG CONVERT_ONNX
RUN if [ "${CONVERT_ONNX}" = "1" ]; then \
            python3 tools/export_to_onnx.py --model "${MODEL_NAME}" --out /src/model || true; \
        fi

# ------ Runtime stage: smaller image with runtime deps + model artifacts ------
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libsndfile1 && rm -rf /var/lib/apt/lists/*

# Runtime requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy converted model artifacts from builder if present
ARG CONVERT_ONNX
COPY --from=builder /src/model /app/model

COPY app ./app
COPY tools ./tools

EXPOSE 8000

# If PYTHON_ENV=production, run with Gunicorn+Uvicorn workers, else use uvicorn for dev
CMD if [ "${PYTHON_ENV:-development}" = "production" ]; then \
            exec gunicorn -k uvicorn.workers.UvicornWorker -w ${GUNICORN_WORKERS:-2} app.main:app -b 0.0.0.0:8000; \
        else \
            exec uvicorn app.main:app --host 0.0.0.0 --port 8000; \
        fi
