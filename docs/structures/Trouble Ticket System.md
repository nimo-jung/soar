## 질문
Trouble Ticket System 를 추가하려고 하는데

---

차세대 AI-TMS / SOAR 시스템에 트러블 티켓 시스템(Trouble Ticket System / TTS)을 추가하는 것은 신의 한 수입니다!

SOAR의 궁합에서 트러블 티켓 시스템은 "보안 사고의 라이프사이클(발생 ➡️ AI 분석 ➡️ 차단 ➡️ 종결 보고)을 추적하고 기록하는 협업 워크플로우 레이어"가 됩니다. AI가 실시간으로 차단한 내역이 진짜 맞는지, 관제 요원이 사후 검증(Human-in-the-loop)을 하고 결재를 올리는 핵심 창구가 되는 것이죠.

기존에 빌드해 둔 고성능 기술 스택(NestJS, React, RedPanda, MariaDB)을 해치지 않고, **개발 인력과 일정을 고려하여 트러블 티켓 시스템을 가장 영리하게 추가하는 설계 전략과 구현 방법**을 가이드해 드립니다.

---

## 1. 트러블 티켓 시스템 추가를 위한 2가지 전략 선택지

### 💡 1안. 오픈소스 ITS/티켓 시스템 연동 (추천: 빠른 출시 목적)

* **대상 솔루션**: **Redmine (REST API 제공)** 또는 **Zammad**, **GLPI**
* **연동 방식**: NestJS 백엔드가 AI 위협을 감지하면, 오픈소스 티켓 시스템의 외부 API를 호출하여 자동으로 티켓을 발행시킵니다. 관제 요원은 오픈소스가 제공하는 완성도 높은 웹 화면에서 티켓을 처리합니다.
* **장점**: 6~7달 차에 발생하는 웹 화면 구현 공수가 거의 제로에 가깝습니다. SLA(서비스 수준 계약) 시간 계산, 담당자 지정, 댓글 기능이 이미 완성되어 있습니다.
* **단점**: 우리 React 대시보드 UI와 디자인 톤앤매너가 완벽히 일치하지 않아 화면 이동 시 이질감이 들 수 있습니다.

### 🛠️ 2안. 자체 DB 테이블 구현 및 전용 UI 양산 (추천: 완벽한 SOAR 제품화 목적)

* **연동 방식**: 우리가 가진 **MariaDB**에 `tickets`, `ticket_histories` 테이블을 추가하고, **React + PrimeReact** 컴포넌트로 결재/티켓 화면을 직접 코딩합니다.
* **장점**: SOAR 플레이북(대응 절차) 화면에서 클릭 한 번으로 티켓 상태가 변경되는 등 제품의 일체감과 가치가 극대화됩니다. B2B 패키징 시 외부 솔루션 라이선스 문제를 신경 쓸 필요가 없습니다.
* **단점**: 초·중급 개발자들의 CRUD 화면 양산 업무가 늘어납니다.

---

## 🗄️ 2. 자체 구현(2안) 시 MariaDB 티켓 테이블 설계 (DDL 명세)

MariaDB는 관계형 데이터 무결성을 보장하므로, 테넌트 격리와 AI 분석 ID 연동을 명확히 한 티켓 스키마 설계가 필수적입니다.

```sql
CREATE TABLE tickets (
    ticket_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '티켓 고유 ID',
    tenant_id VARCHAR(50) NOT NULL COMMENT '고객 테넌트 ID',
    title VARCHAR(255) NOT NULL COMMENT '티켓 제목 (예: [Critical] 랜섬웨어 탐지 및 차단)',
    status ENUM('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN' COMMENT '티켓 상태',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM' COMMENT '위험도/우선순위',
    
    -- AI 및 로그 연동 외래키 영역
    clickhouse_log_cluster_id VARCHAR(100) COMMENT 'ClickHouse 연동용 핵심 로그 식별자',
    ai_analysis_summary TEXT COMMENT 'Python Agentic AI가 작성한 위협 요약 내용',
    qdrant_context_id VARCHAR(100) COMMENT 'Qdrant 벡터 DB에 저장된 유사 매핑 레퍼런스 ID',
    
    assigned_to VARCHAR(100) COMMENT '담당 관제 요원 ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant_status (tenant_id, status) -- 멀티테넌트 대시보드 조회 최적화 인덱스
);

```

---

## 🏗️ 3. 트러블 티켓 시스템 추가 시 최종 데이터 파이프라인 흐름

티켓 시스템이 유기적으로 맞물려 돌아가는 차세대 AI-TMS의 완성된 시나리오 구조입니다.

1. **위협 탐지**: GoLang 엔진이 로그 적재 중 이상 징후 발견 ➡️ **Python FastAPI**가 Qdrant 벡터 DB를 참조하여 위협 최종 확정 및 조치 방안 결정.
2. **티켓 자동 발행**: Python AI 엔진이 조치 결과와 분석 보고서 원문을 **NestJS 백엔드 API**로 전송.
3. **영속성 저장**: NestJS는 전달받은 AI 요약문과 위험도를 기반으로 **MariaDB `tickets` 테이블에 `[OPEN]` 상태의 티켓을 자동으로 Insert**.
4. **실시간 알림**: NestJS가 관제 요원의 **React UI** 화면에 웹소켓(WebSocket) 또는 SSE로 "새로운 AI 대응 티켓이 발부되었습니다" 알림을 팝업으로 전달.
5. **Human-in-the-loop (사후 승인)**: 관제 요원이 티켓을 열어 AI의 차단 조치 보고서를 검토한 뒤 `[RESOLVED]` 또는 `[CLOSED]` 버튼을 누르면 모든 라이프사이클이 종결됨.

---

## 👥 4. 개발 인원 역할 업데이트 및 일정 영향도

자체 구현(2안)으로 트러블 티켓 시스템을 구축할 경우, 기존 산정한 **7명 팀 구성** 내에서 다음과 같이 업무가 분배되며 일정에 무리를 주지 않고 흡수할 수 있습니다.

* **백엔드 중급 (NestJS)**: MariaDB 티켓 CRUD API 개발 및 AI 비동기 결과 수신 엔드포인트 연동 (**3주 소요**)
* **프론트 초급 (React)**: PrimeReact의 `DataTable` 및 `Timeline` 컴포넌트를 활용하여 티켓 목록, 상태 변경 가젯, 타임라인 히스토리 화면 양산 (**4주 소요**)
* **출시 일정**: 기존 **8개월 로드맵 구조를 그대로 유지**할 수 있습니다. 3~4달 차 코어 기능 개발 단계에 '티켓 스키마 및 API 구현' 일감을 병렬로 배치하고, **5달 차 MVP 출시 단계**에서 "로그 수집 ➡️ AI 판단 ➡️ **티켓 자동 생성**" 종단간 테스트 항목으로 묶어 검증하면 완벽합니다.

`copilot.md` 파일의 비즈니스 로직 규격에 "모든 AI 자율 대응 결과는 추적 가능성을 위해 MariaDB 티켓 테이블에 비동기식 트러블 티켓으로 자동 발행되어야 한다"는 지침을 추가하여 AI 개발 기준을 공고히 하시는 것을 권장합니다!

---

## 질문
"2안. 자체 DB 테이블 구현 및 전용 UI 양산 (추천: 완벽한 SOAR 제품화 목적)" 에 대한 좀 더 상세한 설계 및 방법을 알려주세요.

---

자체 DB 테이블 구현 및 전용 UI 양산(**2안**)은 SOAR 시스템의 완성도와 상용 제품으로서의 가치를 결정짓는 가장 중요한 파트입니다. 오픈소스를 가져다 쓰면 초기 개발은 빠르지만, 결국 보안 관제 요원의 동선에 최적화된 화면을 만들 수 없고 멀티테넌시 격리가 까다로워집니다.

React(PrimeReact)와 NestJS, MariaDB를 활용하여 **보안 관제 및 자동 대응에 최적화된 트러블 티켓 시스템(TTS)을 빌드하는 상세 설계 및 구현 방안**을 단계별로 안내해 드립니다.

---

## 🗄️ 1. 관계형 데이터베이스(MariaDB) 스키마 상세 설계

티켓 시스템은 사고의 이력을 완벽히 추적해야 하므로, 티켓의 현재 상태를 나타내는 `tickets` 테이블과 상태 변경 및 댓글, AI 행동 이력을 기록하는 `ticket_histories` 테이블로 **1:N 관계**를 맺어 설계합니다.

### ① `tickets` (티켓 마스터 테이블)

```sql
CREATE TABLE tickets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL COMMENT '고객사 테넌트 식별자',
    ticket_num VARCHAR(30) NOT NULL UNIQUE COMMENT '티켓 관리 번호 (예: TKT-20260617-001)',
    title VARCHAR(255) NOT NULL COMMENT '티켓 제목',
    status VARCHAR(20) DEFAULT 'OPEN' COMMENT 'OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED',
    priority VARCHAR(20) DEFAULT 'MEDIUM' COMMENT 'LOW, MEDIUM, HIGH, CRITICAL',
    category VARCHAR(50) COMMENT '공격 유형 (예: SQL_INJECTION, DDOS, RANSOMWARE)',
    
    -- 데이터 파이프라인 연동 외래 키 및 컨텍스트
    clickhouse_query_key VARCHAR(100) COMMENT 'ClickHouse 원본 로그 추적용 인덱스/키',
    qdrant_point_id VARCHAR(100) COMMENT 'Qdrant 벡터 DB에 저장된 유사도 매핑 ID',
    ai_summary TEXT COMMENT 'Python Agentic AI가 1차 요약한 내용',
    
    assigned_user_id VARCHAR(100) COMMENT '담당 관제 요원 ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

```

### ② `ticket_histories` (티켓 타임라인 및 워크플로우 테이블)

```sql
CREATE TABLE ticket_histories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    actor_type VARCHAR(20) NOT NULL COMMENT 'SYSTEM, AI, USER',
    actor_id VARCHAR(100) NOT NULL COMMENT '시스템명, AI 에전트명, 또는 관제 요원 사번',
    action_type VARCHAR(50) NOT NULL COMMENT 'CREATE, STATUS_CHANGE, COMMENT, AUTO_BLOCK, MANUAL_RELEASE',
    message TEXT NOT NULL COMMENT '활동 내역 요약 또는 댓글 본문',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    INDEX idx_ticket_timeline (ticket_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

```

---

## 🏗️ 2. 백엔드(NestJS) 아키텍처 및 핵심 API 구현

NestJS에서는 TypeORM(또는 Sequelize)을 사용하여 **멀티테넌트 가드**를 적용하고, AI 엔진으로부터 비동기 분석 결과가 들어오는 순간 **티켓 생성과 실시간 웹소켓 이벤트 전송**을 동시에 처리해야 합니다.

### ① 티켓 생성 및 실시간 브로드캐스팅 서비스 로직 (`tickets.service.ts`)

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketHistory } from './entities/ticket-history.entity';
import { Gateway } from '../websocket/gateway'; // 실시간 알림용 웹소켓 게이트웨이

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket) private ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketHistory) private historyRepo: Repository<TicketHistory>,
    private readonly websocketGateway: Gateway,
  ) {}

  // Python AI 엔진 또는 Go 파이프라인 호출에 의해 자동 티켓 생성
  async createAutoTicket(dto: any, tenantId: string): Promise<Ticket> {
    // 1. 티켓 마스터 생성
    const ticketNum = `TKT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const ticket = this.ticketRepo.create({
      ...dto,
      tenant_id: tenantId,
      ticket_num: ticketNum,
      status: 'OPEN',
    });
    const savedTicket = await this.ticketRepo.save(ticket);

    // 2. AI 분석 시작 이력 타임라인에 누적
    await this.historyRepo.save({
      ticket_id: savedTicket.id,
      actor_type: 'AI',
      actor_id: 'Agentic-AI-01',
      action_type: 'CREATE',
      message: dto.ai_summary || 'AI 자율 탐지 엔진에 의해 위협 티켓이 자동 생성되었습니다.',
    });

    // 3. [핵심] 현재 접속 중인 해당 테넌트의 React 관제 화면으로 실시간 알림 슛
    this.websocketGateway.server.to(tenantId).emit('NEW_TICKET_ALERT', {
      ticketId: savedTicket.id,
      title: savedTicket.title,
      priority: savedTicket.priority,
    });

    return savedTicket;
  }
}

```

---

## 🎨 3. 프론트엔드(React + PrimeReact) UI/UX 구현 방안

전용 UI를 양산할 때 관제 요원이 가장 오랜 시간 보게 될 화면은 1) 티켓 종합 대시보드(칸반/리스트)와 **2) 티켓 상세 보기(타임라인 기반)** 두 가지입니다. PrimeReact는 엔터프라이즈 컴포넌트가 풍부하여 코딩 양을 획기적으로 줄여줍니다.

### ① 티켓 상세 화면: PrimeReact `Timeline` 컴포넌트 활용

보안 사고 대응 프로세스는 "시간 순서대로 누가 무엇을 했는가"를 한눈에 보는 것이 핵심입니다. PrimeReact의 `Timeline`을 활용하면 AI가 차단한 내역과 인간이 개입한 내역을 완벽히 시각화할 수 있습니다.

```jsx
import React, { useState, useEffect } from 'react';
import { Timeline } from 'primereact/timeline';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';

export const TicketDetailView = ({ ticketId }) => {
    const [ticket, setTicket] = useState(null);
    const [histories, setHistories] = useState([]);

    // NestJS API로부터 데이터 로드 및 웹소켓 실시간 리스닝 로직 생략

    // 타임라인 아이콘 커스텀 조율 (AI 요원과 인간 관제사를 직관적으로 구별)
    const customizedMarker = (item) => {
        if (item.actor_type === 'AI') {
            return <span className="p-timeline-event-marker" style={{ backgroundColor: '#9c27b0' }}><i className="pi pi-android text-white"></i></span>;
        }
        return <span className="p-timeline-event-marker" style={{ backgroundColor: '#607d8b' }}><i className="pi pi-user text-white"></i></span>;
    };

    const customizedContent = (item) => {
        return (
            <Card title={`${item.actor_id} (${item.action_type})`} subTitle={item.created_at}>
                <p>{item.message}</p>
            </Card>
        );
    };

    return (
        <div className="grid">
            {/* 좌측: 티켓 기본 정보 및 AI 분석 요약 보고서 */}
            <div className="col-4">
                <Card title={ticket?.title}>
                    <div className="mb-3">
                        <Tag value={ticket?.status} severity={ticket?.status === 'OPEN' ? 'danger' : 'success'} />
                        <Tag value={ticket?.priority} severity="warning" className="ml-2" />
                    </div>
                    <h5>AI 위협 분석 요약</h5>
                    <p className="bg-gray-100 p-3 border-round">{ticket?.ai_summary}</p>
                    <Button label="수동 차단 해제 (방화벽 룰 롤백)" severity="danger" icon="pi pi-refresh" />
                </Card>
            </div>

            {/* 우측: 실시간 연동 타임라인 이력 흐름 */}
            <div className="col-8">
                <h5>사고 조치 및 변경 이력 타임라인</h5>
                <Timeline value={histories} align="left" marker={customizedMarker} content={customizedContent} />
            </div>
        </div>
    );
};

```

---

## 🎯 4. 개발 성공을 위한 아키텍트의 팁

1. **상태 불일치 방지 (Idempotency)**:
AI가 자동으로 방화벽 IP 차단을 수행했는데 네트워크 지연으로 MariaDB에 티켓 생성이 누락되거나 중복 생성될 수 있습니다. 이를 막기 위해 ClickHouse 로그의 특정 Hash 값이나 유니크한 조합 키를 `clickhouse_query_key`에 걸어두고, NestJS에서 **Upsert(구문 검증 후 삽입)** 형태로 처리하여 중복 티켓 발행을 원천 차단해야 합니다.
2. **초급 개발자 활용 극대화**:
고급 아키텍트가 위와 같이 `tickets`와 `ticket_histories` 테이블 구조를 정의하고 NestJS 엔티티 및 기본 CRUD API 뼈대를 생성(3달 차)해 두면, **4~5달 차에 초급 개발자 2명이 React PrimeReact 컴포넌트 샘플을 받아 목록 조회, 댓글 달기, 담당자 지정 팝업 등의 화면을 엄청난 속도로 양산**해 낼 수 있어 전체 로드맵 일정에 전혀 지장을 주지 않습니다.

---