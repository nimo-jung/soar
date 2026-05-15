
# SOAR Project Architecture (copilot-instructions.md)

## 1. 프로젝트 개요

이 프로젝트는 보안 위협 대응 자동화(Security Orchestration, Automation and Response) 시스템이다.
목표는 **테넌트별 물리적 데이터 격리**와 **고성능 로그 분석**을 구현하는 것이다.

## 2. 기술 스택 및 핵심 규칙

### Backend - NestJS

* ORM은 반드시 **TypeORM**을 사용한다.
* Domain-Driven Design(DDD) 구조를 지향하고, Module 단위로 기능을 격리한다.
* 멀티테넌시는 테넌트별 독립 MariaDB 스키마 `tenant_db_{id}`를 기준으로 구현한다.
* 요청 헤더 `x-tenant-id` 또는 JWT 기반 **Tenant Context**를 통해 런타임에 DB 연결을 동적으로 전환한다.
* 테넌트 메타데이터와 연결 정보는 관리용 DB `soar_admin`에서 관리한다.

### Frontend - React

* UI 구성 시 **PrimeReact**를 최우선으로 사용한다.
* 레이아웃 및 커스텀 스타일링은 **Tailwind CSS**를 사용한다.
* 전역 상태 관리는 **Zustand**를 사용한다.
* PrimeReact 컴포넌트 사용 시 DataTable, Chart 등 복잡한 UI 요소에 대해 공식 모범 사례를 우선 적용한다.

### Analysis Engine - GoLang

* 대용량 로그 처리는 **Goroutine과 Channel**을 활용한 비동기 병렬 처리 구조를 기본으로 한다.
* 메시지 브로커는 **RedPanda**를 사용한다.
* Kafka 호환 연동에는 `segmentio/kafka-go` 사용을 권장한다.

### Database - MariaDB & ClickHouse

* **MariaDB**: 관리 데이터와 테넌트별 설정 저장용. 모든 테이블에는 `created_at`, `updated_at` 필드를 반드시 포함한다.
* **ClickHouse**: 로그 적재 및 분석용 OLAP 저장소. 테넌트별 별도 Database를 생성해 물리적으로 격리한다.
* **Optimization**: ClickHouse 적재 로직에는 반드시 **Batch 처리 전략**을 포함한다.

### Schema Visibility & Documentation (중요)

* **Mandatory Comments**: 모든 Entity의 `@Entity` 및 `@Column` 데코레이터에는 반드시 `comment` 속성을 작성하여 DB 상에서 용도를 즉시 확인할 수 있게 한다.
* 예: `@Column({ comment: '사용자 이메일 주소' })`


* **Naming Convention**:
* 테이블명은 복수형(`snake_case`)으로 작성한다.
* 불리언 필드는 `is_`, `has_` 접두사를 사용한다.


* **Auto-ERD Generation**: 스키마 변경 시 `npm run db:visualize` 스크립트를 통해 `docs/erd.svg`를 갱신하도록 구성한다.
* **Migration Documentation**: 마이그레이션 파일 상단에 해당 변경 건의 목적과 영향도를 주석으로 상세히 기술한다.

### Cache - Redis

* Redis는 멀티테넌트 세션 관리, DB 연결 정보 캐싱, 실시간 경보 이벤트 큐에 사용한다.
* Redis 키 네이밍은 `tenant:{id}:key_name` 패턴을 사용한다.

### Backend - Migration & Schema

* **TypeORM CLI**: 마이그레이션 파일 생성 시 반드시 TypeORM CLI를 사용하며, 파일명은 목적을 명확히 한다. (예: `CreateUserTable`, `AddColumnToLogs`)
* **Dual-Track Migration**:
1. **Admin Migration**: 시스템 관리용 테이블(`soar_admin`)은 표준 마이그레이션 절차를 따른다.
2. **Tenant Migration**: 테넌트 공통 스키마는 별도의 디렉토리(`migrations/tenant`)에서 관리한다.


* **Dynamic Provisioning**: 신규 테넌트 생성 시 `QueryRunner`를 사용하여 실시간으로 DB 스키마를 생성(`CREATE DATABASE`)하고, 테넌트 전용 마이그레이션 파일들을 해당 DB에 순차적으로 실행한다.
* **Data Integrity**: MariaDB DDL은 트랜잭션 롤백이 불가능하므로, `down` 스크립트를 필수로 작성하고 멱등성(Idempotency)을 보장하는 방식으로 실패 복구를 처리한다.

### Backend - Database Initialization & Seeding

* **Bootstrap Script**: 프로젝트 초기 세팅을 위한 `npm run setup` 스크립트를 제공한다.
* **Admin Seeding**: `soar_admin` DB 생성 후 최초 1회 시딩을 통해 최고 관리자 계정과 필수 권한(Roles)을 생성한다. 이미 데이터가 존재할 경우 중복 실행되지 않도록 처리한다.
* **Auto-Migration**: `NODE_ENV=development` 환경에서만 서버 구동 시 마이그레이션을 자동 실행한다. **운영 환경에서는 반드시 명시적으로 실행한다.**

## 3. 데이터 흐름

1. **Ingestion**: Log Source -> GoLang Engine -> RedPanda
2. **Processing**: RedPanda -> GoLang Analysis -> ClickHouse (Tenant Database)
3. **Serving**: React UI <-> NestJS (Tenant Resolver) <-> MariaDB/ClickHouse (Tenant Database)

## 4. 코드 생성 지침

* **동적 연결**: DB 관련 코드 생성 시, Tenant Context를 통한 동적 연결 로직을 기본 패턴으로 제안하라.
* **격리 검증**: API 및 Service 작성 시 테넌트 식별자 검증 및 데이터 접근 범위 제한을 항상 포함하라.
* **주석 준수**: 모든 Entity 생성 시 `@Column({ comment: '...' })`을 빠뜨리지 마라.
* **UI 일관성**: PrimeReact 중심으로 화면을 구성하고 Tailwind CSS는 보조적으로 사용하라.
* **배치 처리**: 로그 관련 코드는 고처리량을 위해 병렬성 및 배치 처리 로직을 우선 고려하라.

## 5. 금지 사항

* 테넌트 구분 없이 공용 스키마에 고객 데이터를 저장하지 않는다.
* 요청 컨텍스트와 무관한 전역 고정 DB 연결을 기본값으로 두지 않는다.
* 문자열 결합 기반 SQL을 금지한다. (TypeORM Query Builder 또는 Parameterized Query 사용)
* 운영(production) 환경에서 Auto-Migration을 활성화하지 않는다.
* ClickHouse 적재 시 단건 위주의 Insert 패턴을 사용하지 않는다.