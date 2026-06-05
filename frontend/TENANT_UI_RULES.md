# Tenant UI Coding Rules

이 문서는 frontend 디자인 일관성을 위한 코드 규칙이다.

## 1) 페이지 레이아웃

- 페이지 루트는 tenant-page를 사용한다.
- 페이지 헤더는 tenant-page-header를 사용한다.
- 제목은 tenant-page-title 또는 h1을 사용한다.
- 부제목은 tenant-page-subtitle을 사용한다.
- 헤더 액션 버튼 그룹은 tenant-actions-row를 사용한다.

## 2) 버튼 규칙

- 대표 액션 버튼은 tenant-primary-action을 사용한다.
- 버튼 높이와 폰트는 tenant-page-header .p-button 기준으로 통일한다.

## 3) 카드/테이블 규칙

- 카드 컨테이너는 tenant-card를 사용한다.
- 테이블 래퍼는 tenant-table-shell을 사용한다.
- 테이블은 CommonDataTable을 기본 사용하고 tenant-table 클래스를 병행한다.

## 4) 폼 규칙

- 라벨은 tenant-form-label을 사용한다.
- 입력 컴포넌트는 w-full을 기본 적용한다.

## 5) 날짜 규칙

- 날짜만 표시: YYYY-MM-DD
- 날짜+초 표시: YYYY-MM-DD HH:mm:ss
- 페이지에서 new Date(...).toLocaleDateString() 직접 사용을 지양하고 utils/date 포맷 함수를 사용한다.

## 6) 금지 사항

- 페이지별 임의 폰트 크기/버튼 높이/테이블 스타일을 개별로 하드코딩하지 않는다.
- DataTable 직접 사용으로 스타일 기준이 분기되지 않도록 한다.
