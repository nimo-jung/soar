# Admin UI Coding Rules

이 문서는 frontend-admin 디자인 일관성을 위한 코드 규칙이다.

## 1) 페이지 레이아웃

- 페이지 루트는 admin-page를 사용한다.
- 페이지 헤더는 admin-page-header를 사용한다.
- 페이지 제목은 h1 또는 admin-page-title을 사용한다.
- 부제목은 admin-page-subtitle을 사용한다.
- 헤더 우측 액션 버튼 그룹은 admin-actions-row를 사용한다.

## 2) 버튼 규칙

- 페이지 대표 액션(Create/Register 등)은 admin-primary-action을 사용한다.
- 아이콘 전용 소형 버튼은 admin-icon-button-xs를 사용한다.
- 헤더 버튼은 높이/폰트 규칙을 admin-page-header .p-button 기준으로 통일한다.

## 3) 카드 규칙

- 일반 카드 컨테이너는 admin-card를 사용한다.
- KPI/요약 카드에는 admin-card + admin-stat-card를 함께 사용한다.
- 테이블 래퍼 카드는 admin-table-shell을 사용한다.

## 4) 테이블 규칙

- CommonDataTable을 기본 사용한다.
- CommonDataTable은 기본적으로 admin-table 클래스를 포함한다.
- 페이지에서 테이블 커스터마이징이 필요하면 admin-table에 추가 클래스를 병행한다.
- 헤더+필터 툴바는 admin-table-toolbar를 사용한다.

## 5) 폼 규칙

- 라벨은 admin-form-label을 사용한다.
- 인풋은 w-full을 기본 적용한다.
- 다이얼로그/페이지 폼에서 개별 label 폰트/간격 하드코딩을 지양한다.

## 6) 마이그레이션 규칙

- 기존 tenants-* 클래스는 유지하되, 신규/수정 코드는 admin-* 클래스를 우선한다.
- 대규모 리팩터링 시 시각적 회귀를 막기 위해 tenants-*와 admin-*를 단계적으로 교체한다.

## 7) 금지 사항

- 페이지별 임의 폰트 크기/버튼 높이/카드 테두리를 개별 지정하지 않는다.
- p-datatable-sm 단독 사용으로 테이블 스타일을 분기하지 않는다.
- 레이아웃 여백을 p-4 등으로 페이지마다 제각각 지정하지 않는다.
