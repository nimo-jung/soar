---
applyTo: "frontend-admin/**,frontend-tenant/**"
---

# 프론트엔드 디자인 컨셉 규칙

두 앱은 서로 다른 PrimeReact 템플릿 컨셉을 따른다. 새 페이지·컴포넌트·레이아웃을 추가할 때 반드시 아래 규칙을 준수한다.

---

## 1. 앱별 디자인 컨셉 분리

| 앱 | 디렉토리 | 디자인 컨셉 | 레퍼런스 |
|----|----------|------------|---------|
| Master Admin UI | `frontend-admin/` | **Sakai** | https://sakai.primereact.org/ |
| Tenant UI | `frontend-tenant/` | **Verona** | https://verona.primereact.org/ |

두 앱의 레이아웃 CSS는 **절대로 공유하지 않는다.** 각 앱은 독립적인 `src/layout/layout.css`를 유지한다.

---

## 2. PrimeReact 테마

두 앱 모두 `lara-dark-blue` 테마를 기본으로 사용한다.

```tsx
// main.tsx (두 앱 공통)
import 'primereact/resources/themes/lara-dark-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import './layout/layout.css';   // 반드시 테마 import 이후에 위치
```

테마를 변경할 경우 두 앱을 동시에 변경하고, Tenant 앱의 화이트라벨링(`--brand-primary` CSS 변수)이 정상 동작하는지 함께 검증한다.

---

## 3. Admin — Sakai 레이아웃 규칙 (`frontend-admin/`)

### 레이아웃 구조

```
layout-wrapper  (layout-static [layout-static-inactive] [layout-mobile-active])
  layout-sidebar
    layout-sidebar-logo        ← 아이콘 + 앱 이름
    ul.layout-menu             ← flat 리스트 (NavLink)
    layout-sidebar-footer      ← 로그아웃 버튼
  layout-main-container
    layout-topbar              ← 좌: 햄버거, 우: 레이블
    layout-main                ← <Outlet />
  layout-mask                  ← 모바일 오버레이
```

### 사이드바 메뉴 추가 방법

`AdminLayout.tsx`의 `navItems` 배열에 항목을 추가한다.

```tsx
const navItems = [
  { label: '새 메뉴', path: '/new-path', icon: 'pi pi-xxx' },
];
```

- 메뉴는 **flat 구조**만 허용한다. Sakai는 카테고리 그룹을 사용하지 않는다.
- 활성 메뉴: `NavLink`의 `isActive`가 `active-route` 클래스를 자동으로 부여한다.
- 아이콘은 반드시 PrimeIcons(`pi pi-*`)를 사용한다.

### 새 페이지 추가 시 구조 예시

```tsx
// frontend-admin/src/pages/new-feature/NewPage.tsx
const NewPage: React.FC = () => (
  <div className="p-4">
    <div className="page-header">
      <h1>페이지 제목</h1>
      <Button label="액션" icon="pi pi-plus" />
    </div>
    {/* PrimeReact DataTable, Card 등 */}
  </div>
);
```

- 페이지 최상위 래퍼는 `p-4` 또는 `p-6` padding을 사용한다.
- 제목 + 액션 영역은 `page-header` 클래스를 사용한다.

---

## 4. Tenant — Verona 레이아웃 규칙 (`frontend-tenant/`)

### 레이아웃 구조

```
layout-wrapper  (layout-static [layout-static-inactive] [layout-mobile-active])
  layout-sidebar
    layout-sidebar-header      ← 브랜드 로고/아이콘 + 이름
    layout-menu-container      ← 스크롤 영역
      ul.layout-menu           ← 카테고리 그룹 (layout-menu-category + NavLink)
    layout-sidebar-profile     ← 프로필 아바타 + role + 로그아웃
  layout-main-container
    layout-topbar
      layout-topbar-left       ← 햄버거 + breadcrumb
      layout-topbar-right      ← 알림·검색·프로필 chip
    layout-main                ← <Outlet />
  layout-mask
```

### 사이드바 메뉴 추가 방법

`TenantLayout.tsx`의 `navModel` 배열에서 적절한 카테고리를 선택하거나 새 카테고리를 추가한다.

```tsx
const navModel = [
  {
    category: '보안 운영',
    items: [
      { label: '새 메뉴', path: '/new-path', icon: 'pi pi-xxx' },
    ],
  },
  // 새 카테고리 추가 예시
  {
    category: '새 카테고리',
    items: [
      { label: '항목', path: '/path', icon: 'pi pi-xxx' },
    ],
  },
];
```

- 메뉴는 반드시 **카테고리 그룹** 구조를 유지한다. flat 리스트를 사용하지 않는다.
- `breadcrumb`은 `getBreadcrumb()` 함수가 `navModel`을 순회하여 자동 생성한다. 새 항목 추가 시 별도 수정이 불필요하다.
- 활성 메뉴: `active-route` 클래스 → 좌측 accent bar + 반투명 그라데이션 배경.

### 새 페이지 추가 시 구조 예시

```tsx
// frontend-tenant/src/pages/new-feature/NewPage.tsx
const NewPage: React.FC = () => (
  <div>
    <div className="page-header">
      <div>
        <h1>페이지 제목</h1>
        <p className="page-subtitle">부제목 또는 설명</p>
      </div>
      <Button label="액션" icon="pi pi-plus" />
    </div>
    {/* PrimeReact DataTable, Card 등 */}
  </div>
);
```

- `layout-main`이 이미 `padding: 2rem`을 가지므로 페이지 내부에 추가 padding을 중복 적용하지 않는다.
- `page-header` + `page-subtitle` 클래스를 활용한다.

---

## 5. 화이트라벨링 (Tenant 전용)

Tenant 앱은 로그인 응답의 `brandingConfig`를 기반으로 CSS 변수를 동적으로 주입한다.

```
--brand-primary        : 주요 액센트 컬러 (메뉴 활성·버튼·avatar 등에 사용)
--brand-gradient-from  : 로그인 좌측 패널 그라데이션 시작색
--brand-gradient-to    : 로그인 좌측 패널 그라데이션 종료색
```

### 규칙

- 브랜딩 컬러가 필요한 CSS 속성은 반드시 `var(--brand-primary)` 변수를 사용한다. 하드코딩된 색상값을 사용하지 않는다.
- `TenantLayout.tsx`의 `useEffect` 내에서만 CSS 변수를 `document.documentElement.style.setProperty`로 설정한다. 그 외 컴포넌트에서 직접 주입하지 않는다.
- Admin 앱(`frontend-admin/`)에는 브랜딩 변수를 절대 적용하지 않는다.
- 브랜딩 설정이 없을 경우 `:root`에 정의된 기본값(`--brand-primary: var(--primary-color)`)이 폴백으로 동작한다.

---

## 6. 로그인 페이지 규칙

### Admin 로그인 (Sakai 스타일)

- `layout-login` → `layout-login-card` 단일 카드 구조를 유지한다.
- 카드 상단에 `pi pi-shield` 아이콘 + "Sniper TMS Master Console" 제목을 표시한다.
- 브랜딩 변수를 적용하지 않는다.

### Tenant 로그인 (Verona 스플릿 스타일)

- `layout-login-verona` → `layout-login-left` + `layout-login-right` 좌우 분리 구조를 유지한다.
- **좌측 패널**: 그라데이션 배경 + 로고 + tagline + feature list (장식용, 반응형에서 숨김).
- **우측 패널**: 로그인 폼. `login-form` > `.field` 구조를 사용한다.
- 모바일(`max-width: 900px`) 에서는 좌측 패널이 자동으로 숨겨진다.
- `gradientStyle` inline 변수로 브랜딩 그라데이션을 주입하되, CSS 변수 외의 inline style 사용은 최소화한다.

---

## 7. 로그인 폼 필드 공통 규칙

두 앱의 로그인 폼 입력창은 **동일한 구조와 CSS 패턴**을 사용한다.

### 필드 래퍼 구조

모든 로그인 폼 입력 필드는 `className="field"` 래퍼로 감싼다.

```tsx
<div className="field">
  <label htmlFor="input-id">레이블</label>
  <InputText id="input-id" className="w-full" ... />
</div>

<div className="field">
  <label htmlFor="password">비밀번호</label>
  <Password inputId="password" className="w-full" inputClassName="w-full" ... />
</div>
```

### 필드 CSS 규칙 (각 앱의 `layout.css`에 동일하게 적용)

```css
/* 폼 컨테이너: 필드 간 간격 */
.layout-login-form,   /* Admin (Sakai) */
.login-form {         /* Tenant (Verona) */
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

/* 필드 래퍼: 레이블-입력창 수직 정렬, 완전 너비 보장 */
.layout-login-form .field,
.login-form .field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;   /* 레이블과 입력창 사이 간격 */
    width: 100%;
}

/* 레이블 */
.layout-login-form .field label,
.login-form .field label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color-secondary);
}

/* PrimeReact Password 컴포넌트: 외부 래퍼 → 내부 p-icon-field 전체 체인 full-width 강제 */
.layout-login-form .field .p-password,
.layout-login-form .field .p-password .p-icon-field,
.login-form .field .p-password,
.login-form .field .p-password .p-icon-field {
    width: 100%;
    display: flex;
}
```

### 규칙 요약

- 필드 래퍼는 반드시 `className="field"`를 사용한다. 클래스 없는 `<div>` 래퍼를 사용하지 않는다.
- 레이블과 입력창 사이 간격은 `margin-bottom` 대신 래퍼의 `gap: 0.375rem`으로 제어한다.
- 모든 `InputText`에 `className="w-full"`을 적용한다.
- `Password` 컴포넌트는 `className="w-full"` + `inputClassName="w-full"`을 **함께** 적용한다.
- CSS에서 `.p-password { width: 100% }` 오버라이드를 통해 PrimeReact 기본 `inline-flex`를 재정의한다.
- 입력창 너비, 레이블 폰트 크기(`0.875rem`), 폰트 굵기(`500`), 색상(`var(--text-color-secondary)`)은 두 앱에서 동일하게 유지한다.

---

## 8. UI 상호작용 공통 규칙 (중요)

- `window.alert`, `window.confirm`, `window.prompt`는 두 앱에서 **절대 사용하지 않는다**.
- 사용자 확인/경고/에러 안내는 PrimeReact 컴포넌트로 구현한다.
- 확인이 필요한 액션: `ConfirmDialog` 또는 커스텀 `Dialog` 사용.
- 알림성 피드백: `Toast` 또는 `Message` 사용.
- 코드 리뷰 기준: 브라우저 기본 다이얼로그 API 사용 코드가 있으면 반려한다.

---

## 8. CSS 작성 규칙
- 페이지·컴포넌트 레벨의 스타일은 PrimeFlex 유틸리티 클래스 또는 PrimeReact 컴포넌트 내장 스타일을 우선 사용한다.
- Tailwind CSS는 PrimeFlex로 표현 불가능한 경우에 한해 보조적으로 사용한다.
- `layout.css`에 새 클래스를 추가할 경우 해당 앱의 파일에만 추가하며, 두 앱의 `layout.css`를 동기화하지 않는다.
