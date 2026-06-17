Qdrant(크드란트)는 대규모 벡터 데이터의 저장, 검색, 관리에 특화된 Rust 기반의 초고성능 오픈소스 벡터 데이터베이스(Vector Database)입니다.

차세대 AI-TMS / SOAR 시스템에서 **Agentic AI 요원이 보안 컨텍스트(과거 침해 이력, 플레이북 등)를 밀리초($\text{ms}$) 단위로 찾아내기 위한 핵심 지능형 창고** 역할을 수행합니다.

Qdrant의 핵심 특징, 동작 원리, 그리고 본 프로젝트에서 어떻게 활용되는지 상세히 정리해 드립니다.

---

## 1. Qdrant의 핵심 아키텍처 특징

### ① Rust 언어 기반의 압도적인 성능과 안정성

* 자바(JVM) 기반의 Milvus나 다른 도구들과 달리 가비지 컬렉션(GC)이 없습니다.
* 메모리 관리가 극도로 철저하여 초당 수만 건의 벡터 유사도 검색이 몰려도 지연 시간(Latency Spike)이 발생하지 않고 CPU/RAM 자원을 최소한으로 소모합니다.

### ② 벡터와 페이로드(Payload)의 결합 구조

* Qdrant는 고차원 벡터 데이터뿐만 아니라, 그 벡터가 어떤 데이터인지 설명하는 메타데이터(페이로드)를 한 번에 저장할 수 있습니다.
* 예를 들어, "공격 페이로드의 임베딩 값(Vector)"과 "장비 IP, 테넌트 ID, 공격 시간(Payload)"을 한 레코드(Qdrant에서는 이를 **Point**라 부름)에 묶어 저장합니다.

### ③ 필터링과 벡터 검색의 동시 처리 (HNSW 인덱싱)

* 대다수 벡터 DB는 전체 데이터에서 벡터 유사도 검색을 먼저 한 뒤 메타데이터로 필터링을 하거나 그 반대로 작동하여 성능이 떨어집니다.
* Qdrant는 **HNSW(Hierarchical Navigable Small World)** 그래프 알고리즘을 확장하여, **"특정 테넌트 ID 조건 필터링"과 "가장 유사한 공격 패턴 검색"을 인덱스 레벨에서 동시에 처리**합니다.

---

## 2. AI-TMS / SOAR 시스템 내에서의 Qdrant 구체적 활용 시나리오

Qdrant는 무거운 생로그를 저장하는 ClickHouse와 완전히 분리되어, AI의 '장기 기억 장치'로 작동합니다.

### 시나리오: 고위험 랜섬웨어 공격 탐지 및 플레이북 매핑

1. **위협 인지**: GoLang 엔진이 ClickHouse에 로그를 넣던 중, 기존 룰 기반 패턴을 벗어난 정황을 포착하고 Python FastAPI(AI 엔진)를 호출합니다.
2. **임베딩 변환**: Python AI 엔진이 유입된 비정형 로그 문장을 수치화된 벡터($\vec{v}$)로 변환합니다.
3. **Qdrant 고속 검색**: AI 엔진이 Qdrant에 이 벡터와 가장 유사한 과거 침해 사고(정밀 분석 완료된 데이터)가 있는지 쿼리를 날립니다. 이때 **현재 고객의 `tenant_id` 필터링을 동시에 적용**합니다.
4. **결과 리턴**: Qdrant는 $99\%$ 이상의 유사도를 가진 3년 전 유사 공격 사례와 당시 대응했던 '방화벽 포트 차단 플레이북 내용'을 $10\,\text{ms}$ 안에 찾아 냅니다.
5. **자율 대응 (Agentic AI)**: LLM은 이 과거 대응 정보를 컨텍스트(Context)로 삼아 오탐을 확정적으로 배제하고, NestJS 백엔드에 즉시 "이 IP를 RedPanda 정책 큐를 통해 차단하라"고 자율 판단을 내립니다.

---

## 3. Qdrant 설치 및 사용법 (Docker 기반)

본 프로젝트의 표준 인프라인 Docker 환경에서 Qdrant를 구성하고 테스트하는 방법입니다.

### ① docker-compose.yml 설정

Qdrant 역시 고성능 디스크 마운트가 성능을 좌우하므로 호스트의 NVMe SSD 경로를 직접 바인드 마운트합니다.

```yaml
version: '3.8'

services:
  qdrant:
    image: qdrant/qdrant:v1.X.X # 2026년 최신 안정 버전
    container_name: soar-qdrant
    ports:
      - "6333:6333"   # HTTP REST API 포트
      - "6334:6334"   # gRPC 포트 (Python FastAPI와 고속 통신 시 사용)
    volumes:
      - /mnt/nvme-speed/qdrant_storage:/qdrant/storage:rw
    restart: always

```

### ② Python FastAPI에서 Qdrant 연동 코드 예시 (gRPC 통신)

Python AI 레이어에서 Qdrant 고속 내장 라이브러리를 활용해 컬렉션(RDBMS의 테이블 개념)을 만들고 데이터를 검색하는 기본 구조입니다.

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, Filter, FieldCondition, MatchValue

# 1. Qdrant gRPC 클라이언트 연결 (Docker 호스트 포트 6334 활용)
client = QdrantClient(host="localhost", port=6334, grpc=True)

# 2. 보안 플레이북 저장용 컬렉션 생성 (예: 1536차원 OpenAI 임베딩 기준)
client.recreate_collection(
    collection_name="security_playbooks",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
)

# 3. 실시간 위협 매핑 및 하이브리드 검색 (필터 + 벡터 유사도)
def search_similar_threat(tenant_id: str, input_vector: list):
    search_result = client.search(
        collection_name="security_playbooks",
        query_vector=input_vector,
        # 중요: 멀티테넌트 격리를 위한 인덱스 필터링 동시 수행
        query_filter=Filter(
            must=[
                FieldCondition(key="tenant_id", match=MatchValue(value=tenant_id))
            ]
        ),
        limit=3, # 가장 유사한 과거 사례 3개 추출
        with_payload=True # 메타데이터(대응 절차, 가이드 문장) 함께 리턴
    )
    return search_result

```

---

## 🎯 기술 검토 요약: 왜 Qdrant여야 하는가?

1. **완벽한 멀티테넌시 분리**: `query_filter`를 인덱스 단계에서 결합하기 때문에, 다른 고객사(테넌트)의 침해 사고 이력이 섞여 출력되는 보안 사고를 완벽히 격리합니다.
2. **FastAPI와의 완벽한 핏**: Qdrant는 gRPC(Google Remote Procedure Call)를 지원합니다. Python FastAPI 서버와 HTTP가 아닌 바이너리 gRPC(6334 포트)로 통신하면 네트워크 오버헤드가 제로에 수렴하여, AI-TMS 가 요구하는 실시간 탐지/차단 레이턴시를 완벽히 만족시킬 수 있습니다.

따라서 `copilot.md` 파일의 **[AI & Knowledge Base Storage]** 섹션에 "AI 에이전트의 RAG 컨텍스트 서빙을 위해 gRPC가 활성화된 Rust 기반 Qdrant를 표준 Vector DB로 채택한다"고 정의하시면 됩니다.