# 누리지음 디자인 키트 (20261116)

개발 서버의 **실제 구현 화면**(누리지음 v1.1.0)을 판별로 떠 온 퍼블리싱 키트입니다. 지난번(11/04) 키트는 시안이었고, 이번은 완료된 화면입니다.
서버 없이 `index.html` 을 더블클릭해 엽니다.

- 저장소: https://github.com/jseonae/nurijieum-design-kit
- 화면 하나 = 그 순간의 HTML 한 장. 탭 · 패널 · 창 · 더보기 메뉴를 연 상태는 따로 한 장씩입니다.
- 데이터는 개발 서버의 시험 데이터이고, IP · 전자우편 · 휴대전화는 가렸습니다.

## 1. 구성

| 폴더 · 파일 | 내용 | 수정 |
|---|---|---|
| `index.html` | 전체 화면 목록(판 → 구역 → 화면 · 상태 · 원래 주소 · 실화면 링크) | 불필요 |
| `pages.json` | 같은 목록의 데이터(651항목: 판 · 구역 · 제목 · 상태 · 원래 주소 · HTML · 캡처 경로) | 불필요 |
| `pages/<판>/<구역>/` | 화면 · 상태별 HTML 575장. 머리 주석에 판 · 화면 · 원래 주소 · 원래 스크립트 순서가 있습니다 | 가능 |
| `static/` | 서버와 같은 경로의 실제 CSS · JS · 글꼴 · 아이콘 · 그림 전부(누리지음 공통 + 공개 테마 + SEDIS 앱 자산) | 가능(`vendor/` 제외) |
| `static/_kit/` | 키트 전용. 실제 화면에 들어가지 않습니다 — 영상 자리 그림, 화면 연결 스크립트 `kit.js`, 화면 지도 `kit-map.js`(`pages.json` 에서 자동 생성), 지도 생성 `build-kit-map.py` | 불필요 |
| `shots/<판>/` | 같은 순간의 실화면 캡처(jpg 575장, 대조용) | 불필요 |

> 목록 항목은 651개, HTML 은 575장입니다. 게시판별 「게시판 · 게시글 관리」처럼 같은 화면을 여러 항목이 함께 씁니다.

### 화면 수(목록 항목 기준)

| 구역 | 누리지음 기본 | SEDIS |
|---|---|---|
| 콘솔(관리자) | 200 | 319 |
| 공개 화면 | 32 | 70 |
| 게시판 스킨(임시 게시판) | 7 | 7 |
| 매뉴얼 · 설명서 | 5 | 5 |
| 로그인 | 3 | 3 |
| **합계** | **247** | **404** |

## 2. 판 두 개

| | 누리지음 기본 | SEDIS |
|---|---|---|
| 공개 화면 테마 | 누리지음 기본(`public-ui/cms-public.css` · `board-skin.css`) | `krds-sedis`(`public-ui/themes/krds-sedis/`) |
| 콘솔 메뉴 | 누리지음 전체(프로그램관리 · 새 사이트 등록 보임) | SEDIS 관리 메뉴 18개가 맨 위, 프로그램관리 숨김, 새 사이트 등록 끔 |
| SEDIS 통계 화면 | 「연결 서비스 꺼짐」 안내 | 시계열 · 특수교육 현황 · 핵심데이터 · 교차분석 · 조사 변천사 |

- **콘솔 공통 화면:** 대시보드, 만족도 현황, 메뉴관리, 내 담당 메뉴, 콘텐츠 관리, 게시판 관리, 게시판 · 게시글 관리, 팝업존, 통합회원, 부서 및 조직, 사이트 관리, 공통코드, 권한, 관리자메뉴관리, 접속기록, 점검 현황, 이미지, 미디어, 운영 진단, 내 계정, 스타일가이드
- **SEDIS 콘솔 추가 화면:** 통계표(원본 · 통합), 그래프 · 그래프 시각화, 데이터 그룹 · 데이터 주제, 라벨 사전, 조사 변천사 관리, 용어해설 관리

## 3. 게시판 스킨 다섯

| 스킨 | 게시판 유형 | 어디에 |
|---|---|---|
| 목록형 | 공지사항 · 자료실 · 일반 | 공개 화면(실제 게시판) |
| 동영상형 | 동영상게시판(종단연구) | 공개 화면(실제 게시판). 유튜브 영상 자리는 그림으로 바꿨습니다 |
| 갤러리형 · FAQ형 · QNA형 | 갤러리 · 자주 묻는 질문 · 묻고 답하기 | `pages/<판>/board-skins/` — 캡처용으로 잠깐 만든 게시판(지금은 지움). 글은 예시입니다 |

## 4. 디자인 토큰 · CSS 구조

콘솔 CSS 는 3단계로 쌓여 있습니다.

1. **KRDS 원본** `--krds-*` — `static/vendor/krds/` (고치지 않음)
2. **제품 토큰** `--cms-*` — `static/shared/nuri-tokens.css` 한 파일(테마 `data-theme="nuri"`, 고대비 모드 값 포함)
3. **컴포넌트** — `shared/cms-design-system.css` · `admin-ui/v2/cms-admin-v2.css` · `admin-ui/v2/admin-parts.css` · 화면별 `admin-ui/v2/pages/*.css`

| 항목 | 값 |
|---|---|
| 서체 | Pretendard 400 · 600 · 700 (`static/shared/fonts`) |
| 단위 | rem(1rem = 10px). 글자 크기 설정(`data-cms-fontscale`)이 그대로 먹습니다 |
| 글자 크기 | 11 · 12 · 13 · 14 · 15 · 17 · 18 · 20 · 24 · 32px |
| 간격 | 4px 그리드: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 |
| 모서리 | 4 · 6 · 8 · 10 · 12 · 16 · 24px, pill |
| 주요 색 | 기본 KRDS primary-50 `#256ef4`, 헤더 네이비 `#0033a9`(실측), 페이지 배경 `#f6f8fc`(실측) |
| 화면 치수(1920 기준) | 헤더 66 · 사이드바 240 · 슬라이드 패널 476 / 516 · 표 행 50 · 표 머리 44 · 입력 34 / 40 |

- 시안 색 중 명도 대비 4.5:1 이 안 되는 값은 KRDS 한 단계 진한 색으로 바꿨고, 근거는 `nuri-tokens.css` 주석에 있습니다.
- 공개 화면은 기본 판 `public-ui/cms-public.css`, SEDIS 판 `public-ui/themes/krds-sedis/`(`theme.css` · `krds-custom.css` · `main.css`)를 씁니다.

## 5. 수정 규칙

1. `nv-*` 클래스 이름과 `data-*` 속성을 유지합니다. 스크립트가 여기에 걸려 있습니다.
2. `static/vendor/`(KRDS · 차트 · 편집기)는 고치지 않습니다.
3. 콘솔 CSS(`admin-ui/v2/cms-admin-v2.css` · `shared/cms-design-system.css`)에는 색상값을 직접 쓰지 않고 `--cms-*` 토큰만 씁니다. 새 값은 `shared/nuri-tokens.css` 에 더합니다.
4. 공개 화면 SEDIS 테마는 `static/public-ui/themes/krds-sedis/`, 누리지음 기본은 `static/public-ui/` 의 css 를 고칩니다.
5. 고친 `static/` 과 `pages/` 를 그대로 돌려주세요. 개발팀이 경로대로 비교해 반영하고, HTML 은 서버 템플릿(Thymeleaf)으로 옮깁니다.

## 6. 알아 둘 점

- 키트 화면에는 서버 스크립트를 넣지 않았습니다(빼고 주석으로 남김). 그래서 펼침 · 탭 전환 같은 움직임은 없고, 상태마다 따로 한 장씩 있습니다. 실제 JS 파일은 `static/` 에 그대로 있습니다.
- 차트(그림판)는 찍은 순간의 그림, 유튜브 영상은 그 자리 그림입니다.
- **화면 사이 이동(키트 전용 `kit.js`):** 목록으로 돌아가지 않고 화면 안에서 이어서 볼 수 있습니다.
  - 왼쪽 메뉴 · 상단 경로 · 표 안 링크는 같은 판의 키트 화면으로 이어집니다. 원래 주소가 똑같은 화면이 없으면 같은 경로의 기본 화면으로 잇습니다(예: 콘텐츠 행 링크 → 콘텐츠 관리).
  - 더보기 · 패널 · 창 · 탭 단추를 누르면 그 상태를 찍은 화면으로 넘어갑니다(453개 중 409개). 상태 화면에서 닫기 · 바깥 클릭 · Esc · 첫 탭을 누르면 기본 화면으로 돌아옵니다.
  - 상태 화면으로 이어지지 않는 44개는 기본 화면에 그 행이 없는 행 작업 메뉴입니다(다른 게시판 글, SEDIS 통계표 통합 · 데이터 그룹 일부). 목록에서 여세요.
  - 편집 · 미리보기 · 내려받기처럼 키트에 없는 화면은 누르면 「키트에 없는 화면」 알림만 뜹니다. 저장 단추도 동작하지 않습니다.
  - `pages.json` 을 바꾸면 저장소 맨 위에서 `python3 static/_kit/build-kit-map.py` 로 화면 지도를 다시 만듭니다.
- KRDS `component.css` 는 라벨 안의 맨몸 체크박스를 `!important` 로 숨깁니다. 콘솔 CSS 에 표 칸 · 칩 체크박스를 되살리는 규칙이 있으니 지우지 마세요.
- 교차분석은 연구원 로그인이 필요한 화면이라 로그인 안내 상태로 찍혔습니다.
- 콘솔 왼쪽 메뉴는 실제 화면에선 스크립트가 지금 메뉴까지 내려 보여 주지만, 키트에선 메뉴 목록 맨 위부터 보입니다(SEDIS 판은 메뉴가 길어 아래 메뉴는 메뉴 칸을 내려야 보임).
- `shots/` 의 긴 캡처 중 창 · 패널을 연 스타일가이드 몇 장은 페이지를 내린 채 찍혀 창과 머리가 중간에 걸려 있습니다. 키트 HTML 쪽(창이 화면 맨 위)이 실제로 열었을 때 모양입니다.
- 어느 키트 화면도 불러오지 않는 CSS 가 있습니다(옛 콘솔 `admin-ui/cms-admin.css`, `sedis/assets/sedis.css`, `xa-crosstab.css`, `onboarding-tour.css`). 고쳐도 키트에서 결과를 확인할 수 없습니다.
- 맥에서 받은 한글 파일 이름은 저장소에 NFC 로 들어 있습니다. 다른 환경에서 git 으로 추가할 때 같은 파일이 두 번 들어가지 않게 주의합니다.

## 7. 저장소 작업 방식

1. 작업마다 `claude/<작업이름>` 브랜치를 만들어 커밋합니다. `main` 에 바로 올리지 않습니다.
2. 깃허브에 PR 을 열고, PR 설명에 **변경 내용(작업 폴더별 표) · 확인** 을 적습니다.
3. 같은 내용을 아래 **8. 작업 기록** 맨 위에 한 건 추가합니다(같은 PR 안에서).
4. 검토 뒤 병합 요청이 있으면 `main` 에 병합하고, 작업 브랜치를 정리합니다.

기록 한 건의 형식: 제목 · 날짜 · PR · 커밋 · 상태(검토 중 / 병합됨) → **작업 폴더별 변경**(폴더 · 파일 · 내용 표) → **왜** → **확인** → **개발팀 참고**

## 8. 작업 기록

최신 기록이 위에 옵니다.

### 2026-11-25 · 스타일가이드 견본을 개발 화면 마크업으로 — 2차 (모양은 피그마)
- **브랜치:** `design/jseonae` · **상태:** 검토 대기 · **파일:** `static/admin-ui/v2/sedis-sg.css` 16 · 17-1 · 19 · 20 · 21 · 24 · 25 · 26 · 27, `styleguide/index.html`
- **방식:** 마크업은 개발 콘솔 화면 그대로(스타일가이드 견본에서는 개발 스크립트용 `data-*` · 숨은 값만 뺌), 모양은 피그마 디자인스타일 · 디자인모음 값
- **작업 폴더별 변경**

  | 견본 · 컴포넌트 | 개발 마크업 | sedis-sg.css | 피그마 기준 |
  |---|---|---|---|
  | 토스트 | `.nv-toast` · `.ntoast`(+ `--error` · `--warning` · `--info`) | 17-1 | 디자인스타일 cms/toast |
  | 아코디언 | `details.nv-form-group.nv-details` | 19 | 디자인스타일 cms/accordion Size=M |
  | 트리 item · 트리 ⋮ 단추 | `.nv-tree__row` · `.nv-tree__toggle` · `.nv-tree .nv-dropmenu` | 16 | 디자인스타일 cms/tree-item |
  | 메뉴 트리 | `.nv-table.nv-nav-table` · `.nv-nav-menu--d1~d4`(`__grip` · `__depth` · `__name`) · `.mtree__lock` · `.mtree__tag` · `.list-legend` | 20 | 디자인모음 menu-tree-row |
  | 접근 권한 표 | `.ptable.acc-table`(`ptable__who` · `cellcheck` · `tr.is-unsaved` · `tag-new` · `xbtn`) | 21 | 디자인모음 access-row |
  | 메뉴 편집 머리 | `.edx-card__head`(`edx-card__title` · `lvl` · `edx-card__name` · `edx-site` · `edx-steps`) | 24 | 디자인모음 누리지음/menu-edit-header (2552:40143) |
  | 상위 설정 따르기 | `.acc-same`(`label.nv-check` + `#inherit-hint`) | 25 | 디자인모음 누리지음/inherit-bar (2549:38413) |
  | 고르기 목록 항목 | `.pick__list`(`pick__search` · `pick__row` · `pick__id` · `pick__meta` · `pick__sep` · `pick__foot`) | 26 | 디자인모음 누리지음/picker-item (2550:38541) |
  | 권한 항목 | `ul.mgrcards > li.mgr`(`mgr__icon` · `mgr__who` · `nv-badge` · `xbtn`) | 27 | 디자인모음 누리지음/permission-item (2549:38396) |
  | 사이드 메뉴 · 상단 바 | `aside.nv-sidebar` · `header.nv-header` | (cms-admin-v2.css 그대로) | 디자인스타일 Layout |

- **주요 값**
  - 메뉴 편집 머리: 안쪽 24 28 8 · 메뉴명 24 Bold · 유형 배지 Tertiary Outline · 노출 배지 Primary Solid-light · 이전/다음 34 상자(가운데 구분선 1 × 16)
  - 상위 설정 따르기: 안쪽 12 16 · 모서리 8 · surface/gray-subtler · 체크 16 · 제목 14 SemiBold · 설명 13 subtle
  - 고르기 목록 항목: 줄 40 · 안쪽 0 14 · 이름 14 · 코드 · 정보 13 disabled · 마우스 올림 gray-subtle + 이름 SemiBold · 비활성 subtle-inverse · 맨 아래 줄(Action) text/basic
  - 권한 항목: 안쪽 12 8 12 16 · 모서리 8 · 아이콘 칸 36 원 · 이름 14 SemiBold · 코드 13 disabled · 설명 13 subtle · 빼기 28(바탕 없음, 마우스 올림 검정 5%)
- **왜:** 스타일가이드 견본과 개발 화면의 마크업이 달라 견본을 그대로 옮겨 쓸 수 없었음. 클래스를 개발과 같게 하고 모양만 피그마로 맞춤
- **확인:** 스타일가이드 각 섹션과 개발 콘솔 화면(메뉴 수정 · 접근권한 탭)을 그려 피그마 값(높이 · 여백 · 모서리 · 글자)과 계산 스타일 비교
- **개발팀 참고**
  - `admin-parts.css` · `navigation.css` 가 `sedis-sg.css` 뒤에 읽혀서, 같은 클래스를 덮는 규칙은 선택자를 한 단계 높였음(`.edx-card__head.edx-card__head` · `.acc-same.acc-same` · `.mgrcards.mgrcards` · `.pick__list:not(.owner-search .pick__list)` 등)
  - 고르기 목록의 맨 아래 줄(`.pick__foot`, 예: 「새 권한그룹 만들기」 · 「권한그룹관리」) 글자가 파란 링크색에서 피그마 Action 의 text/basic 으로 바뀜
  - 메뉴 편집 머리 이전/다음 화살표는 개발 마크업(chevron-right)을 그대로 써서 피그마 삼각 화살표와 모양이 조금 다름
  - 사이드 메뉴 · 상단 바는 개발 화면이 이미 피그마 값이라 CSS 를 바꾸지 않음(상단 바 알림 · 사용자 IP 줄은 개발 마크업에 없어 피그마와 다름)
- **스타일가이드만:** 코드 칸에서 견본 배치용 코드(`sg-*` 감싸개 · 견본에서만 쓴 style)를 빼고 들여쓰기 2칸으로 정렬

### 2026-11-25 · 메뉴 단계 번호 색 변경
- **브랜치:** `design/jseonae` · **상태:** 검토 대기
- **작업 폴더별 변경**

  | 폴더 · 파일 | 내용 |
  |---|---|
  | `static/shared/nuri-tokens.css` | 새 토큰 `--nuri-color-depth-1~4-surface` · `-text` |
  | `static/admin-ui/v2/sedis-sg.css` 20 · 24 | 메뉴 트리 `.nv-nav-menu__depth`, 메뉴 편집 머리 `.lvl` 이 새 토큰을 씀 |
  | `static/shared/nuri-components.css` | `.nuri-depth-badge` 가 새 토큰을 씀 |

- **값:** 1단계 `#18378c` 바탕 · 흰 숫자 / 2단계 `#3a6cec` · 흰 숫자 / 3단계 `#d3def5` · `#234fc8` 숫자 / 4단계 `#eff2f6` · `#364153` 숫자 (예전 secondary-80 · 60 · 50 · gray-50 은 쓰지 않음)
- **왜:** 단계가 깊어질수록 연해지는 색을 디자인에서 새로 정함(캡처 기준). 3 · 4단계는 바탕이 연해 숫자를 진한 색으로
- **확인:** 스타일가이드 메뉴 트리 · 단계 번호 · 메뉴 편집 머리에서 1~4단계 계산 색 확인
- **개발팀 참고:** 단계 번호 색은 이제 토큰 4쌍으로만 바꿈. 새 토큰은 기본(밝은) 테마에만 있음

### 2026-11-25 · 메뉴 수정 화면 탭 · 본문 구분선 정리
- **브랜치:** `design/jseonae` · **상태:** 검토 대기
- **작업 폴더별 변경**

  | 폴더 · 파일 | 내용 |
  |---|---|
  | `static/admin-ui/v2/admin-parts.css` | `.edx-body` 위 구분선(`border-top: 1px solid var(--cms-border)`) 주석 처리 |
  | `static/admin-ui/v2/sedis-sg.css` | `.nv-tabs { gap }` · `.gtabs { gap; border-bottom }` 규칙 삭제 — 탭 간격 · 밑줄은 `cms-admin-v2.css` 규칙을 따름 |

- **왜:** 메뉴 수정 화면에서 탭 줄 아래와 본문 위에 선이 겹쳐 보여 하나로 정리
- **개발팀 참고:** `.gtabs` 를 쓰는 다른 화면에서도 탭 줄 아래 선 · 간격이 `cms-admin-v2.css` 값으로 돌아감

### 2026-11-25 · 쪽 번호(nv-pagination)를 피그마 cms/pagination 모양으로
- **브랜치:** `design/jseonae` · **상태:** 검토 대기 · **파일:** `static/admin-ui/v2/sedis-sg.css` 「10. 쪽 번호」(마크업은 KRDS 그대로)
- **기준:** 피그마 디자인스타일 14. Pagination 의 cms/pagination-item(2423:1195) · cms/pagination(2423:1196)
- **값:** 칸 높이 24 · 최소 너비 24 · 좌우 4 · 모서리 4 · 글자 13 Regular · 칸 사이 4 · 가운데 정렬 / 마우스 올림 action/gray-hover · 누름 action/gray-pressed · 선택 pagination/selected + 흰 글자 SemiBold · 비활성(aria-disabled) 회색 글자 · 아이콘 / 이전 · 다음 꺾쇠 Phosphor caret-left · caret-right 16(KRDS 화살표 대신) / 생략(link-dot) text/subtle
- KRDS CSS 를 안 읽는 스타일가이드에서도 같게 보이도록 배치(display · 정렬)도 이 규칙에 넣음. 쪽 번호가 가운데로 옴(예: 만족도 현황은 오른쪽 → 가운데)

### 2026-11-25 · 트리(nv-tree)를 피그마 cms/tree · cms/tree-item 모양으로
- **브랜치:** `design/jseonae` · **상태:** 검토 대기 · **파일:** `static/admin-ui/v2/sedis-sg.css` 「16. 상세 정보표 · 트리」의 트리 부분(마크업은 그대로)
- **기준:** 피그마 디자인스타일 22. Accordion 의 cms/tree-item(2455:1712) · cms/tree(2455:1713)
- **1단** `.nv-tree__row--root`: 높이 48 · 좌우 16 · tree/root-surface 바탕 · 16 Bold(선택돼도 같은 모양) / **2단** `details > summary.nv-tree__row`: 44 · 좌우 16 · 14 SemiBold · 펼침 표시 펼침 파랑 · 접힘 회색 / **3단** 그 밖의 `.nv-tree__row`: 36 · 14 Regular, 마우스 올림 tree/item-hover, 선택(`.is-active` · `aria-current`) tree/item-selected + 파랑 SemiBold
- **연결선:** li 안의 ul(3단 목록)은 왼쪽 32 칸에 세로선 · 가지 8, 마지막 항목은 아래 선 없음. 예전 점선 세로선 · 들여쓰기는 없앰
- 조직도 화면(organization.css 의 `.org-tree div.nv-tree__row` 색 · 여백)보다 앞서도록 선택자를 한 단계 높임

### 2026-11-25 · 편집 도구 막대(nv-editor__toolbar)를 피그마 디자인모음 04-B 모양으로
- **브랜치:** `design/jseonae` · **상태:** 검토 대기 · **파일:** `static/admin-ui/v2/sedis-sg.css` 「18. 편집 도구 막대」
- **기준:** 피그마 디자인모음 「04-B 메뉴 수정 - 소스 수정 탭 (카드형)」의 editor-toolbar(노드 2473:3752). 마크업은 개발 그대로
- **값:** 막대 높이 48 · 좌우 12 · 칸 사이 4 · 바탕 background/gray-subtler · 테두리 border/gray-light · 모서리 8 / 단추 32 · 모서리 4 · 아이콘 16 / 구분선 1 × 20 surface/secondary-subtler / 오른쪽 보기 전환(편집 · 분할 · 미리보기) 바탕 gray-subtle · 안 여백 3 · 칸 24 · 글자 13, 고른 칸 button/primary-light + 파랑 글자
- **그대로:** nv-editor 의 제목 · 본문 등 나머지, SunEditor 가 그리는 도구 단추(.se-*), 콘텐츠 편집 화면의 막대 바탕(content.css `.ct-editor .cms-admin-editor__toolbar` 가 앞섬)

### 2026-11-25 · 버튼 스타일을 cms-button.css 한 파일로
- **브랜치:** `design/jseonae` · **상태:** 검토 대기 · **스크립트:** `_to_delete/mkbtn.py`
- **새 파일:** `static/admin-ui/v2/cms-button.css` — 버튼(`nv-btn` 색 · 스타일 · 크기 · 상태 · 아이콘 단추), 묶음(`nv-btn-group` · `nv-row-actions`), 글자 단추(`nv-link--btn`), 행 ⋮ 아이콘 크기
- **옮긴 것:** `sedis-sg.css` 「1. 버튼」 전부(최종 모양) + `cms-admin-v2.css` 에서 sedis-sg 가 덮지 않던 구조 값(display · 정렬 · 줄바꿈 없음 · 커서 · 전환 · `aria-disabled` 포인터 막기 · `--block` · `--lg` 최소 너비 78)
- **지운 것(중복 · 덮이던 값):** `cms-admin-v2.css` 「3. 버튼」 전체(옛 색 · a 단추 글자색 보정 · opacity .45 등), `.nv-row-actions .nv-btn--icon` 28 규칙(마크업 `nv-btn--xs` 로 — 132곳), 고대비의 `.nv-btn--primary` 테두리(테두리를 안 써서 효과 없던 줄)
- **영역 쪽에 남긴 것:** 목록 도구 막대 · 측면 패널 바닥(sedis-sg.css), 편집 도구 막대 · 조직도 바닥(cms-admin-v2.css) 안의 버튼 배치 규칙, 페이지 머리 제목 줄 높이(sedis-sg.css)
- **연결:** 버튼을 쓰는 html 3,141장 — sedis-sg.css 를 쓰는 화면은 그 바로 앞(겹침 순서 그대로, 3,127장), 로그인 · 매뉴얼 14장은 cms-admin-v2.css 바로 뒤. 스타일가이드도 연결
- **확인:** 기본 판 607장 + SEDIS 표본 66장(미리보기 6 포함) + 스타일가이드의 버튼 15,094개 계산 스타일을 옮기기 전후 비교 — 콘솔 · 스타일가이드는 행 아이콘 묶음(의도) 말고 같음. 로그인 · 매뉴얼은 sedis-sg 를 안 쓰던 화면이라 이번에 스타일가이드 버튼 모양으로 바뀜(로그인 큰 단추 48 → L 44 등)

### 2026-11-25 · 버튼을 피그마 cms/button 규칙으로 (색 + 스타일 + 크기 두 클래스 체계 · Ghost 안 씀)
- **브랜치:** `design/jseonae` · **상태:** 검토 대기
- **규칙(피그마 디자인스타일 6. Button):** 색 8(primary · secondary · tertiary · point · danger · warning · success · info) × 스타일 4(Solid · Solid-light · Outline · Outline-fill) × 크기 5(XS 28 · S 32 · M 40 · L 44 · XL 48) × 상태 4. Ghost 는 쓰지 않음
- **클래스:** `nv-btn` + `nv-btn--{색}` + `nv-btn--{light|outline|outline-fill}` + `nv-btn--{xs|sm|lg|xl}`. 스타일 없으면 Solid, 색 없으면 Tertiary, 둘 다 없으면 Tertiary Outline. 아이콘만 `nv-btn--icon`(XS 28 · S 32 · M 40). 글자 단추 `nv-link nv-link--btn`(+ `--neutral` · `--danger` · `--sm`)
- **CSS:** `static/admin-ui/v2/sedis-sg.css` 「1. 버튼」 다시 씀 — 색은 팔레트 변수(--p-*), 스타일이 모양(--b-*)을 고름. 상태 규칙은 `.nv-btn[class]` 로 화면 CSS 보다 앞서게. 옛 이름은 별칭으로 남김(primary-outline · soft · danger-solid · warn · ghost · outline-strong · muted · excel)
- **마크업 바꿈(스크립트 `_to_delete/btnmig.py`, 콘솔 · 매뉴얼 2,164장 + JS 6개, 사용자 화면 미리보기 제외):** primary-outline → primary outline 3,559 · ghost → outline 3,328 · danger(빨강 테두리) → danger outline 1,880 · 목록 도구 막대의 danger → danger outline-fill 419 · danger-solid → danger 53 · warn → warning outline-fill 4 · outline-strong → outline 8 · 아이콘 단추 크기 (32) → sm 533 · sm(28) → xs 1,690(크기는 그대로)
  - `sedis-sg.css` 의 「목록 도구 막대 danger」 · 「아이콘 단추 danger/outline」 덧씌움 규칙은 마크업으로 옮겨 지움
- **스타일가이드:** 9. Button 섹션을 피그마 규칙대로 — 색 × 스타일 × 상태 32줄, 크기 5, 아이콘 켜기, 아이콘 단추(색 × 스타일, Ghost 없음) · 크기, 계층(페이지 머리 · 하위 목록 · 수정 · 모달), 글자 단추. 다른 섹션 견본의 옛 버튼 이름도 새 이름으로
- **행 작업 ⋮:** main PR #8 의 `nuri-button-icon`(Tertiary · Outline · XS) 그대로 — 모양은 `nv-btn nv-btn--icon nv-btn--xs` 와 같음
- **보이는 변화:** Ghost 이던 단추(카드 더보기 꺾쇠, 파일 지우기, 버전 이력의 작은 단추 등)와 아이콘 단추(행 수정 · 삭제 등)에 회색 테두리가 생김. S 단추 안 아이콘 14 → 16(피그마 S)
- **확인(1600 폭):** 기본 판 607장 + SEDIS 표본 40장 바꾸기 전후 — JS 오류 · 불러오기 실패 · 가로 넘침 · 줄바꿈된 단추 변화 0. 대표 화면(권한 · 부서 및 직원 · 콘텐츠 수정 · 게시글 관리) 비교
- **되돌리기:** 바꾸기 전 묶음 `_to_delete/btn-before.tgz`

### 2026-11-25 · 스타일가이드 견본을 개발 화면 마크업(.nv-*)으로 — 1차
- **브랜치:** `design/jseonae` · **상태:** 검토 대기 · **파일:** `styleguide/index.html` (바꾼 스크립트 `_to_delete/sgnv.py`, 바꾸기 전 `_to_delete/styleguide-before-nv.html`)
- **방향:** 스타일가이드를 개발 마크업에 맞춤. 견본 마크업 = 키트 화면과 같은 `.nv-*` 클래스, 모양 = `cms-admin-v2.css` + `sedis-sg.css`. 행 작업 ⋮ 는 main PR #8 의 `nuri-button-icon`(tertiary · outline · xs) 그대로
- **기준 마크업:** 개발 쪽 견본 화면 `pages/default/console/console-스타일가이드-d5b9ca.html` + 실제 콘솔 화면
- **바꾼 섹션(18 + 화면 틀 일부):** 9 Button(`nv-btn` 스타일 6 × 상태 4, 크기 sm 32 · 기본 40 · lg 44, 아이콘 · `nv-btn--icon` · ⋮, `nv-link`) · 10 Input(`nv-input` 상태 7 · 크기, `nv-select`, 글자형 셀렉트 `nv-filter__label`, `nv-check` · `nv-radio` · `nv-switch`) · 11 Form field(`nv-form-group` · `nv-field` · `--row` · `nv-textarea`) · 13 Modal · Panel · 14 Tab · Menu(`nv-tabs` · `--auto` · `gtabs` · `nv-dropmenu`) · 15 Table · 16 Pagination(`krds-pagination`) · 17 Badge · 18 Feedback(`nv-alert` · `nv-toast`) · 19 Empty(9종) · 20 Date(`type=date` · `nv-date-range`) · 21 File(`nv-dropzone` · `nv-file`) · 22 Tag · 23 Segmented · 24 Accordion · Tree(`nv-details` · `nv-tree`) · 25 정보 표(`nv-dl`) · 27 요약 카드(`nv-summary`) · 29 편집 도구 막대(`nv-editor`) · 8 Layout 의 page-header 3종(`nv-page-header` · `--sub` · `nv-editor-header`) · footer · top
- **상태 견본:** 개발 클래스에 상태 클래스가 없어, 스타일가이드 전용 보조 `sg-is-hover` · `sg-is-pressed` · `sg-is-focus` 로 고정해 보여 줌(개발 마크업에는 넣지 않음). 모달 · 패널 · 토스트 · 맨 위로 · 펼친 더보기 메뉴는 견본 틀 안에 놓으려고 위치만 바꿈(설명에 적음)
- **아이콘:** 스타일가이드 첫머리 스프라이트를 키트 화면의 `nv-i-*` 전체(97개)로 바꿈
- **아직 스타일가이드 전용 마크업인 섹션:** 기초(1~7 색 · 글자 · 간격 · 그림자 · 아이콘 · 로고), 8 Layout 의 사이드 메뉴 · 머리 막대, 12 Select list, 26 단계 번호, 28 Key value, 30 List item, 31 Field card, 32 Inline notice, 33~43 패턴, 44 Breadcrumb — 개발 마크업과 대응을 정해야 함
- **개발 마크업에 없어 견본에서 빠진 것:** 버튼 XS · XL 크기와 secondary · success 등 추가 색, 배지 크기 3단계 · 스타일 4종, 달력(브라우저 기본 달력 사용), 셀렉트 L 크기

### 2026-11-25 · 스타일가이드 list-toolbar 견본을 개발 화면 마크업(nv-filter)으로
- **브랜치:** `design/jseonae` · **상태:** 검토 대기 · **파일:** `styleguide/index.html`
- **왜:** 견본이 스타일가이드 전용 클래스(`nuri-list-toolbar` · `nuri-button` · `nuri-select-text` …)라 개발 화면 마크업과 달랐음
- **마크업:** SEDIS 「통계표 통합 · 시각화」(`console-통계표-통합-시각화-ff5106.html`)의 `form.nv-filter` 와 같은 클래스 · 구조 — `nv-filter__left/right` · `nv-filter__total`(`<b>` 숫자) · `label.nv-filter__label` 안 `select.nv-select` · `nv-filter__divider` · `nv-filter__selected`(`data-selected-count`) · `nv-btn nv-btn--sm nv-btn--danger`(`data-needs-selection`) · `a.nv-btn nv-btn--sm nv-btn--outline` · `nv-sr-only` 라벨 + `nv-select nv-select--sm` · `nv-input-wrap` + `nv-input nv-input--sm nv-input--search` + `svg.nv-icon`. 화면별 data-*(API 주소 등)와 id 는 견본용 이름으로
- **모양:** 지금 디자인 그대로 — 스타일가이드에 `cms-admin-v2.css` · `sedis-sg.css` 를 `nuri-components.css` 앞에 연결, 아이콘 스프라이트(`nv-i-trash` · `download` · `search`)를 body 첫머리에 넣음. 두 줄 견본: 선택 0개(「선택 삭제」 꺼짐) · 선택 1개(켜짐)
- **다른 섹션 영향:** 1600 폭 화면 비교 — 차이는 글자 가장자리 정도(밝기 차 16 이하)뿐. 화면 제목(KIMM_Bold)은 이제 `cms-admin-v2.css` 의 글꼴 선언으로 실제 KIMM 으로 그려짐(견본 설명의 「Pretendard 로 대신」 문구 삭제)

### 2026-11-25 · 스타일가이드 글자형 셀렉트(cms/select-text)를 진짜 셀렉트로
- **브랜치:** `design/jseonae` · **상태:** 검토 대기
- **왜:** 「목록 표시 개수 15개 ∨」는 모양만 글자 버튼이고 기능은 셀렉트인데, 견본이 `<button>` 으로 되어 있었음
- **마크업:** `<span class="nuri-select-text"><select class="nuri-select-text__control">…</select><span class="nuri-icon i-caret-down"></span></span>` — 꺾쇠를 select 오른쪽 여백 위에 겹쳐 꺾쇠를 눌러도 select 가 열림. 라벨은 `<label>` 로 묶거나 `aria-label`
- **파일:** `static/shared/nuri-components.css` 「글자형 셀렉트」 · `styleguide/index.html` — 「Input › cms/select-text」 견본 6개와 「Layout › cms/list-toolbar」(라벨 「목록 표시 개수」와 `<label class="nuri-list-toolbar__group">` 로 묶음), 코드 보기도 같이
- **확인:** 모양(크기 · 색 · 마우스 올림 · 비활성) 바꾸기 전과 같음. 키트 화면의 「목록 표시 개수」(`nv-filter__label` 안 `<select>`)는 이미 셀렉트라 그대로

### 2026-11-25 · 목록 도구 막대(nv-filter)를 스타일가이드 cms/list-toolbar 값으로
- **브랜치:** `design/jseonae` · **상태:** 검토 대기 · **파일:** `static/admin-ui/v2/sedis-sg.css` 「7. 목록 도구 막대」 (두 판 공통)
- **높이 72:** 막대 안 단추를 모두 S(32 · 13 SemiBold)로 — 「새 게시글」 같은 40 단추가 막대를 81 로 키우던 것 정리. 아래 선은 inset 그림자로(높이에 더해지지 않게)
- **간격:** 묶음 사이 16 · 묶음 안 8(「선택 0개」와 뒤 단추들, 단추 묶음 `nv-btn-group`). 세로 구분선 `nv-filter__divider` 는 스타일가이드에 없어 숨김(마크업은 그대로)
- **「목록 표시 개수」 셀렉트:** 글자형 셀렉트(cms/select-text) — 테두리 없음 · 14 Regular · 꺾쇠 16 · 라벨과 사이 8
- **총 개수:** 숫자 `<b>` 굵기 900(가짜 굵기) → 600. 숫자 파랑은 유지
- **그대로 둔 것:** 입력 · 셀렉트 글자 13(스타일가이드 S 는 14 — 키우면 날짜 · 검색 칸이 넓어져 1600 폭에서 막대가 두 줄로 넘어감), 검색 단추가 오른쪽에 있는 키트 검색 칸 구조
- **확인(1600 폭):** 기본 판 607장 + SEDIS 판 표본 40장 — JS 오류 · 가로 넘침 · 줄바꿈된 단추 변화 0. 막대 높이: 73 → 72(330곳) · 81 → 72(96곳) · 81 → 80(18곳), 높아진 곳 0

### 2026-11-25 · 누리지음 기본 판 관리자 화면에도 스타일가이드 적용
- **브랜치:** `design/jseonae` · **상태:** 검토 대기
- **작업 폴더별 변경**
  - `pages/default/console/` 607장: `</head>` 앞에 `static/admin-ui/v2/sedis-sg.css` 연결(SEDIS 판과 같은 파일)
  - 버튼 클래스 정리(597장): `nv-btn--outline-strong` · `nv-btn--muted` · `nv-btn--excel` → `nv-btn--outline`, `nv-btn--soft` → `nv-btn--primary-outline`
  - 행 ⋮ 단추는 main 의 PR #8(min3076, `nuri-button-icon` 으로 교체)을 따름 — 이 작업에서는 건드리지 않음
  - `static/admin-ui/v2/pages/group-panel.js`: 스크립트가 만드는 「파일 올리기」 단추 `nv-btn--soft` → `nv-btn--primary-outline`
  - `static/admin-ui/v2/sedis-sg.css`: 머리 주석을 두 판 공통으로 고침(파일 이름은 그대로)
- **이미 기본 판에 들어가 있던 것:** 페이지 머리 버튼 계층 · 하위 목록 머리(`nv-page-header--sub`) · 브레드크럼 삭제 · Phosphor 아이콘 · 빈 상태 컴포넌트 · `main` tabindex 삭제
- **그대로 둔 것:** 로그인 · 매뉴얼 · 게시판 스킨 · 공개 화면(SEDIS 판과 같은 범위)
- **확인:** 기본 판 콘솔 607장 전부 1600 폭에서 바꾸기 전후 비교 — JS 오류 · 불러오기 실패 · 가로 넘침 · 줄바꿈된 단추 모두 0, 변화 없음. 대표 화면(공통코드 · 게시글 관리 · 권한 · 코드 관리) 화면 비교
- **되돌리기:** `git checkout -- pages/default/console static/admin-ui/v2` (커밋 전). main 받기 전 작업은 `git stash list` 의 「jseonae 2026-11-25 …」에 보관

### 2026-11-23 · SEDIS 특수교육 현황(통계표 원본 · 통계표 통합 · 그래프) 스타일가이드 적용
- **파일:** `static/sedis/assets/admin/trd-admin.css` 끝에 「스타일가이드 적용」 묶음 추가(마크업 그대로, `--nuri-*` 토큰)
- **통계표 원본:** 「올린 파일은 바로 반영되지 않습니다」 안내를 표 위로(보이는 순서만) · 줄마다 반복되던 파란 「새 파일 올리기」를 보조(테두리) 단추로 · 파일명 열 넓힘(13 subtle) · 「이전 파일」 접기 표시를 caret 아이콘으로
- **통계표 통합:** 행 ⋮ 단추를 테두리 없는 아이콘 단추로
- **통계표 통합 상세:** 머리를 흰 막대(등록 · 수정형 머리)로 · 연도 표 머리 첫 칸 바탕 · 고정 열 구분선 · 가로로 넘치는 표에 좌우 그림자(더 있음 표시) · 구획 번호 20 원
- **그래프:** 통계표 목록을 고르기 목록(36 · 모서리 4, 선택 nav/item-selected, 개수 작은 배지)으로 · 정보 카드 제목 18 · 사용자 화면 미리보기 본문은 사용자 화면 그대로 둠

### 2026-11-23 · 키트 화면 공통 틀(머리 · 사이드 메뉴 · 로고) 스타일가이드 적용
- **파일:** `static/admin-ui/v2/cms-admin-v2.css` — 「1. 앱셸」 뒤에 「1-1. 머리 · 사이드 메뉴 · 로고」 덮어쓰기 묶음 추가(마크업 · 클래스 · data-* 그대로, 값은 `--nuri-*` 토큰)
- **로고:** 판에 따라 자동 — 누리지음 기본 `logo/nurijieum-cms.svg`, SEDIS(설치 판 PROJECT 눌림) 기관로고 `logo/nise-cms.svg`. 기존 PNG `<img>` · 「CMS」 꼬리표는 화면에서만 숨김(alt 유지)
- **사이드 메뉴:** 1차 48 · 2차 36(앞 6px 줄 블릿) · 모서리 8 · 선택 nav/item-selected + SemiBold · 도움말 카드 point-subtler
- **머리:** 높이 66 · 좌우 40 · 사이트 선택 · 검색 pill(흰 10% 바탕 + 흰 25% 테두리, 40) · 오른쪽 단추 13 SemiBold · 아바타 header/avatar-surface
- **아이콘:** 머리 · 사이드 메뉴의 kit 아이콘 16종을 Phosphor 로(마스크). 다른 영역 아이콘은 다음 단계
- **머리 셀렉트 · 검색 원본 기준 수정:** 사이트 선택 = 테두리만(새 토큰 `--nuri-color-header-site-border` 흰 40%), 검색 = 바탕만(`--nuri-color-header-search-surface` 흰 12%, 425×40). 새 원본 색 `--nuri-alpha-white40` · `white12`. 피그마 `cms/header-bar` 에 사이트 선택 추가(백업 있음) · 스타일가이드 `.nuri-header-bar__site` 추가
- **시안에 있으나 키트에 없는 것:** 머리의 「알림」(종) — 마크업이 없어 넣지 않음

### 2026-11-23 · 디자인모음 컴포넌트 · 패턴 추가 (스타일가이드)
- **컴포넌트 5종** (`nuri-components.css` 끝에 추가): `.nuri-depth-badge`(1~4단계) · `.nuri-summary-card` · `.nuri-key-value`(디자인모음 summary-row) · `.nuri-editor-toolbar` · `.nuri-list-item`(디자인모음 picker-item, Group · Action · Person)
- **패턴 11종** (새 파일 `static/shared/nuri-patterns.css`, 클래스 `.nuri-p-*`): 사이드 메뉴(누리지음 판 · SEDIS 판 따로) · 요약 영역 · 메뉴 트리 행 · 메뉴 편집 머리 · 담당자 선택 · 접근 권한 표 · 권한 항목 · 상위 설정 따르기 · 민원 처리 상태 카드 · 민원 처리 기한 카드
- **결정:** 권한 항목(permission-item)과 상위 설정 따르기(inherit-bar)는 컴포넌트로 합치지 않고 별도 패턴. 사이드 메뉴 두 판은 합치지 않음
- **스타일가이드:** 상황별 컴포넌트 25~29, 새 「패턴」 묶음 30~40, 현재 위치(예비) 41. 불러오는 순서 cms-base → nuri-tokens → nuri-components → nuri-patterns → nuri-icons
- **반복 패턴 컴포넌트화:** 피그마 디자인모음의 반복 덩어리를 컴포넌트로 묶고 스타일가이드에 추가 — `.nuri-field-card`(토글 · 입력 · 라디오, 133곳) · `.nuri-inline-notice`(링크 있음 · `--subtle`, 42곳) · 패턴 `.nuri-p-apply-summary`(26곳) · 메뉴 트리 `menu-tree-head` · `menu-tree-more`. 바닥글 139곳은 `cms/footer` 인스턴스로 바꿈
- **스타일가이드 정리(2):** 패턴의 사이드 메뉴를 누리지음 판 하나로 합침(SEDIS 판 삭제, 누리지음이 기본). 로고 2종을 SVG 로 추가 — `static/shared/logo/nurijieum-cms.svg`(누리지음, 130×20) · `nise-cms.svg`(기관로고 · 특수원 CMS, 163×30), 클래스 `.nuri-logo-img`(`--nise`), 스타일가이드 「화면 틀 › Logo」. 메뉴 트리 섹션에 표 머리 · 상태 3가지 · 표기 아이콘 · 표 아래 안내 · 더보기 메뉴를 나눠 넣음. 민원 처리 상태 카드 9가지 · 기한 카드 8가지를 피그마 상태 전부로 채움
- **메뉴 트리 표기 정리:** 「개별」 · 「변경」 글자 배지를 없애고 아이콘과 행 상태로 바꿈 — 접근 통제 `i-lock-simple`(icon/gray) · 개별 설정 `i-link-simple-break`(모두 icon/gray) · 저장 안 함 = 표 행 상태 `table/row-changed` 배경 + 글자 `text/warning`(`.is-changed`) · 미노출 = 글자 disabled + 노출여부 「미노출」(`.is-unused`, 노출여부는 노출 · 미노출 두 가지). 표 아래 설명 `.nuri-p-legend`. 키트 화면(`mtree__tag`)에는 아직 적용 전
- **단계 번호 색 수정:** 2·3단계 색이 같던 것을 단계마다 다르게 — 1 secondary/80 · 2 secondary/60 · 3 secondary/50 · 4 gray/50 (피그마 컴포넌트도 같이 수정, 수정 전은 백업). 메뉴 트리 들여쓰기는 피그마와 같게 단계마다 24

### 2026-11-23 · 피그마 디자인스타일 토큰 · 컴포넌트 코드화 + 스타일가이드 페이지(`styleguide/`)
- **브랜치:** `claude/kit-update-1117`(작업 중, 커밋 전) · **상태:** 검토 대기
- **작업 폴더별 변경**
  - `static/shared/nuri-tokens.css`: 맨 끝에 「피그마 변수」 블록 추가 — 「누리지음 primitive(neutral · alpha · number) · semantic(gap · padding · size-height · radius) · mode(색 역할 303개, light · high-contrast) · responsive(글자 크기 pc · mobile)」와 그림자 shadow1~4를 그대로 옮김. 이름 = `--nuri-` + 피그마 변수 이름(`/` → `-`), 예: `color/text/basic` → `--nuri-color-text-basic`. 고대비는 `data-krds-mode="high-contrast"`. 기존 `--cms-*`는 그대로 둠
  - `static/shared/nuri-components.css`(새 파일): 디자인스타일 6~24의 `cms/*` 컴포넌트를 클래스로 옮김(피그마 `cms/이름` → `.nuri-이름`, 변형 → `--값`). 버튼 · 아이콘 버튼 · 글자 버튼 · 배지 · 아이콘 · 입력 · 셀렉트 · 글자형 셀렉트 · 체크박스 · 라디오 · 토글 · 탭 · 메뉴 · 표(줄형 · 카드형) · 빈 목록 · 사이드 메뉴 · 상단 바 · 화면 제목 · 목록 도구 막대 · 바닥글 · 맨 위로 · 모달 · 패널 · 쪽 번호 · 선택 목록 · 날짜 입력 · 달력 · 파일 첨부 · 태그 · 보기 전환 · 현재 위치 · 라벨 · 입력 항목 · 텍스트 영역 · 아코디언 · 트리 · 정보 표 · 토스트 · 얼럿. 값은 위 피그마 변수만 씀
  - `static/shared/icons/`(새 폴더): 피그마 「아이콘」 페이지 컴포넌트와 같은 Phosphor Icons v2.1.1 전체 3,024개(Regular 1,512 · Fill 1,512, MIT). 피그마 이름 목록과 하나도 빠짐없이 같은지 확인함
  - `static/shared/nuri-icons.css`(새 파일): 아이콘 모양 클래스 3,024개 — 피그마 `icon/{이름}` → `class="nuri-icon i-{이름}"`, `icon/{이름}-fill` → `i-{이름}-fill`. 크기 · 색 클래스는 `nuri-components.css`(`nuri-icon--16`, `nuri-icon--danger` 등)
  - 스타일가이드 8. Icon: 아이콘 목록(찾기 · 분류 18개 · Regular/Fill · 미리보기 크기, 누르면 마크업 복사)
  - `styleguide/index.html`(새 파일): 섹션 1~24를 키트 CSS로 실제로 그린 견본 + 견본마다 「코드」(마크업). 색 · 간격 · 역할 색(light · 고대비 나란히) · 글자 · 그림자 표, 「고대비 보기」 버튼. 읽는 CSS는 `cms-base.css` · `nuri-tokens.css` · `nuri-components.css`뿐(KRDS 없음)
  - 스타일가이드 섹션 순서를 우선순위로 바꿈 — 기초(색 · 역할 색 · 글자 · 간격 · 그림자 · 아이콘) → 화면 틀 → 자주 쓰는 컴포넌트(키트 관리 화면에서 쓰는 화면 수가 많은 순: 버튼 · 입력 · 입력 항목 · 선택 목록 · 모달 · 패널 · 탭 · 메뉴 · 표 · 쪽 번호 · 배지 · 알림) → 상황별 컴포넌트(빈 목록 · 날짜 · 파일 · 태그 · 보기 전환 · 아코디언 · 정보 표) → 예비(현재 위치). 섹션마다 피그마 디자인스타일 원래 번호를 함께 적음
  - `index.html`: 맨 위에 스타일가이드 링크
  - 관리 화면 HTML · 기존 `.nv-*` CSS는 아직 안 바꿈 — 다음 단계에서 `.nv-*`를 이 컴포넌트 값으로 맞춤
- **확인:** 견본 크기를 피그마 컴포넌트와 비교 — 버튼 높이 28 · 32 · 40 · 44 · 48, 배지 20 · 24 · 32, 탭 48 · 44, 메뉴 176 · 항목 36, 쪽 번호 24, 달력 280 × 284, 모달 400 · 560, 패널 476, 토스트 높이 45, 태그 24 · 28, 보기 전환 32 · 40, 상단 바 66, 도구 막대 72, 바닥글 56, 트리 48 · 36, 정보 표 120 × 44 모두 같음. 얼럿만 2px 낮음(81 · 45, 피그마 83 · 47)
- **크기별 견본 보강:** 버튼(XS~XL × 스타일 · 아이콘) · 아이콘 버튼(XS · S · M) · 배지(Small · Medium · Large) · 입력 · 셀렉트 · 날짜 입력(S · M · L) · 글자형 셀렉트(S · M · L) · 체크박스 · 라디오 · 토글(S · M) · 모달(S · M · L) · 보기 전환 · 태그(S · M) · 아코디언(M · L)을 크기별 표 + 크기별 코드로 보여 줌. CSS도 피그마 크기별 값으로 맞춤 — 입력 · 셀렉트 앞 아이콘 S 16 · M · L 20(펼침 꺾쇠는 16 고정), 날짜 입력 L 너비 176, 글자형 셀렉트 L 16(`nuri-select-text--l`)
  - `static/shared/illust/`(새 폴더): 피그마 cms/empty-img 9종 · cms/error-img 5종을 SVG로 내보낸 그림(182×160, empty-search · empty-data · empty-file · empty-permission · empty-error · empty-user · empty-stats · empty-menu · empty-target · error-404 · error-403 · error-500 · error-503 · error-network). 피그마 SVG 내보내기 결과와 글자 하나까지 같은지 확인함(좌표는 소수 1자리로 줄임, 화면에서는 차이 없음). 스타일가이드 「Empty state」 섹션(11. Table에서 따로 뺌)에 14종 견본
  - `static/shared/illust/graphic-*.png`: 피그마 graphic/* 10종(60×60 PNG, 피그마에서 직접 내보낸 파일 — 다운로드/graphic 폴더의 PNG만 가져옴, SVG는 안에 비트맵이 들어 개당 200~400KB라 쓰지 않음). `<img class="nuri-graphic" …>`. 스타일가이드 8. Icon에 견본
- **피그마와 다른 점:** 화면 제목 서체 KIMM_Bold는 글꼴 파일이 없어 Pretendard Bold로 그려짐

### 2026-11-23 · 관리 화면 기본 규칙 파일(`cms-base.css`) 추가 — KRDS CSS 없이 쓰기 위한 첫 단계
- **브랜치:** `claude/kit-update-1117`(작업 중, 커밋 전) · **상태:** 검토 대기
- **작업 폴더별 변경**
  - `static/shared/cms-base.css`(새 파일): KRDS `common.css`가 하던 기본 규칙을 피그마 디자인스타일 기준으로 옮김 — 1rem = 10px(62.5%), Pretendard · 본문 14 · 줄 높이 150% · 글자색 `--cms-text`, 초기화(여백 · box-sizing · 목록 · 링크 · 단추 · 입력 · 표), 화면에 안 보이는 요소(`caption` · `legend` · `hr` · `.sr-only` · `.blind`), 키보드 포커스 링(`--cms-focus`), 선택 영역 색
    - 모든 선택자를 `:where()`로 감싸 우선순위 0 — 컴포넌트 CSS(`.nv-*`)가 언제나 이김
    - `<b>`를 Bold 700으로 고정(SemiBold 글자 안에서 900 가짜 굵기로 그려지던 문제 해결)
    - 이름표(`label`)는 KRDS와 같이 `inline-flex` 유지(필수 * · 아이콘 정렬)
  - `static/shared/nuri-tokens.css`: `--cms-transition`(.2s) 추가. 서체를 Pretendard GOV → **Pretendard**로 바꿈(피그마 `typo/font/type`). `--cms-font` 첫 이름이 `'Pretendard'`
  - `static/shared/fonts/`(새 폴더): Pretendard v1.3.9 서브셋 Regular · SemiBold · Bold(woff2 · woff, OFL-1.1). Medium은 쓰지 않아 넣지 않음. 사용자 화면은 KRDS의 Pretendard GOV를 그대로 씀
  - HTML은 아직 고치지 않음(화면들은 지금도 KRDS 두 파일을 읽음)
- **왜:** 마크업은 그대로 두고 CSS만 피그마 규칙으로 바꾸기 위해. 개발 쪽은 관리 화면 머리의 KRDS 두 줄을 이 파일 한 줄로 바꾸면 됨
- **확인:** 대표 관리 화면 41장을 「KRDS 두 파일」 ↔ 「`cms-base.css`」로 바꿔 1920 폭 전체 캡처 · 요소별 계산 스타일 비교
  - 관리 화면 32장: 화면 차이 0(바뀐 것은 `<b>` 굵기 900 → 700뿐)
  - 서체를 Pretendard로 바꾼 뒤: 관리 화면 글자 1,721곳 모두 Pretendard 400 · 600 · 700으로 그려짐. 글자 폭이 조금 좁아 줄바꿈이 줄어든 화면 2장(콘텐츠 수정 −13px, 통계표 통합 −21px 높이)
  - 남은 차이: SEDIS 쪽 번호(`krds-pagination`) 5장 — KRDS 컴포넌트 클래스라 다음 단계에서 누리지음 CSS로 그림 / 사용자 화면 미리보기 3장(그래프 · 그래프 시각화 · 이용안내) — 새 창 방식으로 바꿀 예정이라 KRDS 유지

### 2026-11-23 · SEDIS 왼쪽 메뉴를 개발 서버 최신 메뉴로 맞춤
- **브랜치:** `claude/kit-update-1117`(작업 중, 커밋 전) · **상태:** 검토 대기
- **작업 폴더별 변경:** `pages/sedis/console/` 2,518장 — 「시계열 시각화」 묶음을 개발 서버 최신 구성(데이터 그룹 · 데이터 주제 · 통계표 원본 · **통계표 통합 · 시각화** · 라벨 사전)으로 바꿈. 「통계표 통합」 · 「그래프 시각화」 항목은 뺌(두 메뉴가 「통계표 통합 · 시각화」 하나로 합쳐짐)
  - 뺀 두 메뉴의 예전 화면 663장은 키트에 그대로 남아 목록(`index.html`)에서 열 수 있고, 그 화면들의 메뉴에서는 「통계표 통합 · 시각화」가 선택 상태로 보임
  - 새 화면의 메뉴 링크(사이트 관리 · 운영관리 묶음 10개, 매뉴얼)는 다른 키트 화면과 같은 파일 링크로 맞춤
- **왜:** 개발 서버(2026-11-23) 메뉴가 최신이라 키트 메뉴를 그에 맞춤
- **확인:** 시계열 시각화 묶음이 있는 SEDIS 관리 화면 2,518장 모두 같은 5개 항목

### 2026-11-23 · SEDIS 「통계표 통합 · 시각화」 화면 추가
- **브랜치:** `claude/kit-update-1117`(작업 중, 커밋 전) · **상태:** 검토 대기
- **작업 폴더별 변경**
  | 폴더 | 파일 | 내용 |
  |---|---|---|
  | `pages/sedis/console/` | `console-통계표-통합-시각화-ff5106.html` (새 파일) | 개발 서버 `/console-9f3a/svc/sedis/ts/intg-graphs` 1쪽(실제 데이터 15줄)을 키트 형식으로 가져옴: 스크립트 뺌 · 자산 경로 `../../../static` · 키트에 있는 화면은 파일로, 없는 화면은 `#kit-missing` · 엑셀은 `#kit-file` |
  | `static/sedis/assets/admin/` | `ts.css` · `img/ico-chart-bar.svg` (새 파일) | 목록 전용 스타일(`.sd-ts-ig*` · `.sd-ts-intg` · `.sd-ts-ico-chart`)과 그래프 아이콘을 개발 서버에서 가져와 토큰 규칙에 맞춤 |
  | `static/admin-ui/v2/` · `static/shared/` | `cms-admin-v2.css` · `nuri-tokens.css` | 「재실행 필요」 버튼 `.nv-btn--warn` · `--cms-warn-border`(warning-40) 추가 |
  | `/` · `static/_kit/` | `pages.json` · `index.html` · `kit-map.js` | 화면 목록 · 지도에 추가(SEDIS 2,920화면) |
- **왜:** 키트에 없던 개발 화면(실제 데이터 반영)을 디자인 기준 화면으로 두기 위해
- **확인:** 1440 · 1920 폭으로 그려 확인. 다른 화면 사이드 메뉴의 「통계표 통합 · 시각화」에서 이 화면으로 이동됨(kit.js 지도 연결)
- **알아 둘 점:** 통합 상세(`…/ST001`) · 그래프 화면(`…/graph`) · 미리보기 · 작업 메뉴 열린 상태 · 2~6쪽은 아직 없음. 작업 ⋮ 단추는 개발 서버 CSS 대로 가로(…)로 돌아가 있음(피그마는 세로 ⋮)

### 2026-11-23 · 상단 판 전환(누리지음 기본 · SEDIS) 링크 연결
- **브랜치:** `claude/kit-update-1117`(작업 중, 커밋 전) · **상태:** 검토 대기
- **작업 폴더별 변경**
  | 폴더 | 파일 | 내용 |
  |---|---|---|
  | `static/_kit/` | `kit.js` | 다시 내보내기 때 예전 판으로 덮인 것을 링크 · 상태 화면 연결판(23b2066)으로 되돌리고, 상단 판 전환 단추 연결 추가 |
  | `static/_kit/` | `kit-map.js` | `build-kit-map.py` 로 다시 생성(627 → 3,558건, 다시 내보내기 화면 반영) |
- **판 전환 규칙:** 같은 주소 · 같은 상태 화면 → 같은 주소의 기본 화면 → 같은 경로의 기본 화면 → 같은 파일 이름 → 대시보드 순으로 찾음
- **확인:** 관리 화면 3,125장 모두 이동할 곳 있음(같은 화면 1,128 · 비슷한 화면 261 · 대시보드 1,736 — 대부분 다른 판에 없는 SEDIS 전용 메뉴). 게시판1 화면에서 SEDIS → 누리지음 기본 왕복 클릭 확인
- **개발팀 참고:** 키트 전용 파일만 바뀜

### 2026-11-23 · 피그마 디자인스타일 규칙 전체 적용 (이전 스타일 사용 안 함)
- **브랜치:** `claude/kit-update-1117`(작업 중, 커밋 전) · **상태:** 검토 대기
- **작업 폴더별 변경**
  | 폴더 | 파일 | 내용 |
  |---|---|---|
  | `static/shared/` | `nuri-tokens.css` | 글자 크기 13 · 14 · 16 · 18 · 20 · 24 · 28 · 32(+ caption 12) · 줄 높이 150% 하나 · Medium → SemiBold · 모서리 2 · 4 · 8 · 12 · 16 · 24 · max(6 · 10 없앰) · 그림자 `--cms-shadow-1~4` · 입력 S 32 · 표 칸/머리 48. 이전 토큰 이름(xs · sm · tight · loose · radius-sm · md · shadow-sm …)은 새 값으로 연결 |
  | `static/shared/` · `static/admin-ui/v2/`(+ `pages/`) · `static/sedis/assets/admin/` | CSS 27개 | 직접 적힌 값을 토큰으로 바꿈: 글자 크기 138곳 · 줄 높이 74곳 · Medium 31곳 · 모서리 89곳 · 색 58곳 · 그림자 2곳. 굵지 않은 15px 글자는 14, 굵은 글자는 16 |
  | `static/admin-ui/v2/` | `cms-admin-v2.css` | 목록 도구 막대 좌우 여백 26 → 24, 왼쪽 묶음 사이 16 → 12(피그마 list-toolbar). 대시보드 큰 숫자 40 → 32(display/small) |
- **왜:** 피그마 「디자인스타일」 규칙만 쓰고 이전 스타일은 쓰지 않기 위해
- **확인:** 대시보드 · 콘텐츠 관리/수정 · 메뉴관리 · 서브관리자 · 권한그룹 패널 · 게시글 관리 · 민원 처리 · SEDIS 통계표 통합 · 그래프 시각화 · 원본 상세 11화면을 1440×900으로 바꾸기 전후 비교. 메뉴관리 도구 막대가 두 줄로 넘어가던 것은 여백 조정으로 해결. 1440 폭에서는 글자가 커진 표 칸 일부(권한그룹 배지 + 변경)가 두 줄이 됨. 콘텐츠 관리 도구 막대는 바꾸기 전에도 1440에서 두 줄
- **남은 것:** 이전 `static/admin-ui/cms-admin.css`(로그인 화면만 사용) · 공개 화면 CSS · 화면 HTML 안의 인라인 스타일(차트가 만든 값)은 대상 아님. `var(--토큰, 예비값)` 속 예비값과 `qa-guide.css` 의 자체 변수 색은 그대로
- **개발팀 참고:** 위 CSS를 실제 자산에 옮기면 됨. 화면 HTML 구조 변경 없음

### 2026-11-23 · 색을 피그마 디자인스타일 값으로 맞춤
- **브랜치:** `claude/kit-update-1117`(작업 중, 커밋 전) · **상태:** 검토 대기
- **작업 폴더별 변경**
  | 폴더 | 파일 | 내용 |
  |---|---|---|
  | `static/shared/` | `nuri-tokens.css` | 「누리지음 primitive」 색 8계열을 `--nuri-{색}-{단계}`로 추가. `--cms-*` 색 토큰 50개를 피그마 「누리지음 mode」 역할에 맞춰 `--nuri-*` 참조로 바꿈. 입력 토큰 `--cms-input-border` · `-light` · `-hover` · `--cms-control-track-off` 추가(고대비 값 포함) |
  | `static/admin-ui/v2/` | `cms-admin-v2.css` | 입력 · 텍스트 영역 · 체크 · 라디오는 진한 테두리(`--cms-input-border`, #55647a), 셀렉트는 연한 테두리(#cbd5e1), 마우스 올림은 `--cms-input-border-hover`, 토글 꺼짐은 `--cms-control-track-off` |
  | `/` | `NURIJIEUM-DESIGN-RULES.md` (새 파일) | 피그마 디자인스타일 · 디자인모음 · 아이콘 기준 디자인 규칙 |
- **주요 값 변화:** 회색이 중립 회색(#1e2124 · #464c53 · #e6e8ea …)에서 피그마 주 회색인 푸른 회색으로 바뀜
  - 글자 #1e293b · 설명 #475569 · 흐린 글자 #64748b
  - 테두리 #e2e8f0 · 진한 테두리 #cbd5e1 · 표 구분선 #eef2f7
  - 상태색 글자는 각 색 70단계(성공 #267444, 오류 #bd2c0f, 안내 #096ab3), 회색 배지 #eef2f7 / #334155
  - 알림 점 #00ffab → #f05f44(header/notice-dot)
  - 프라이머리 · 헤더 네이비 · 화면 바탕은 이전과 같음
- **왜:** 피그마 「디자인스타일」에서 KRDS 규칙으로 정리한 색과 키트 색을 일치시키기 위해
- **확인:** 게시판 게시글 관리 · 민원 처리 화면을 1440×900으로 그려 토큰 값과 입력 · 셀렉트 테두리 색 확인. 흐린 글자 #64748b 는 흰 바탕 4.76:1, 화면 바탕(#f6f8fc) 4.48:1. 도움말 카드 글자는 point-70(3.65:1) 대신 point-80(4.98:1)
- **남은 것:** 이전 `static/admin-ui/cms-admin.css`, 화면별 CSS에 직접 적힌 색, 글자 크기 · 모서리 토큰(6 · 10, 15px)은 이번에 바꾸지 않음
- **개발팀 참고:** `static/shared/nuri-tokens.css`, `static/admin-ui/v2/cms-admin-v2.css` 두 파일을 실제 자산에 옮기면 됨

### 2026-11-17 · 키트 화면 다시 내보내기 반영 (SEDIS 메뉴별 화면 · 게시판별 목록)
- **PR:** #5 · **브랜치:** `claude/kit-update-1117` (#3 `claude/kit-links` 위에 쌓음) · **상태:** 검토 중
- **작업 폴더별 변경**
  | 폴더 | 개수 | 내용 |
  |---|---|---|
  | `pages/sedis/console/` | 수정 228 · 추가 110 · 삭제 66 | 왼쪽 메뉴 「특수교육 현황」 · 「시계열 시각화」 · 「핵심데이터 시각화」가 메뉴마다 자기 화면(`특수교육-현황-통계표-원본` 등)으로 연결됨. 게시판별 게시글 목록(공지사항 · 실태조사 · 종단연구 · 특수교육통계 · 기타 · 디자인키트 갤러리 · 묻고 답하기 · 자주 묻는 질문 · 게시판1) 추가. 목록에서 빠진 예전 화면(`게시판-게시글-관리` 23 · `통계표-통합` 18 · `통계표-원본` 11 · `데이터-그룹` 14) 삭제 |
  | `pages/default/console/` | 수정 63 · 추가 8 | 게시판 관리 「게시글 관리」 펼침 메뉴가 게시판별 목록으로 연결됨. 메뉴 · 콘텐츠 검색 창의 빈 링크(`#kit-missing`)가 실제 화면 주소로 바뀜 |
  | `/`(저장소 맨 위) | `pages.json` · `index.html` | 화면 목록 651 → 627 |
  | `static/_kit/` | `kit-map.js` | 새 `pages.json` 으로 다시 만듦(627행) |
- **왜:** 개발 서버에서 키트 화면을 다시 내보낸 결과를 저장소에 반영
- **확인:** 화면 파일 수 = `pages.json` 627개(빠진 · 남는 파일 없음). 새 화면이 쓰는 CSS · JS · 그림 모두 있음. 한글 파일 이름은 NFC 로 넣어 중복 없음
- **개발팀 참고:** 내보내기 결과에 `static/_kit/kit.js` 가 #3 이전 원래 버전으로 들어와 있어 #3 버전으로 되돌림 — 내보내기 도구의 원본 `kit.js` 도 바꿔야 다음에 다시 덮어쓰지 않음. 깨진 링크 2종류 30곳(`/public/qa/sedis-e2e-scenario.html`, `static/manual/nurijieum-egov-l2-submission.html`)은 이전부터 있던 것으로 그대로 둠

### 2026-11-17 · 키트 화면 사이 링크 · 상태 화면 연결
- **PR:** #3 · **브랜치:** `claude/kit-links` · **상태:** 검토 중
- **작업 폴더별 변경**
  | 폴더 | 파일 | 내용 |
  |---|---|---|
  | `static/_kit/` | `kit.js` | 링크 연결(원래 주소 → 키트 파일, 없으면 같은 경로 기본 화면) · 단추 → 상태 화면 연결 · 상태 화면에서 기본 화면으로 돌아오기 추가 |
  | `static/_kit/` | `kit-map.js` (새 파일) | 화면 지도 651건(판 · 원래 주소 · 상태 · 키트 파일). `pages.json` 에서 자동 생성 |
  | `static/_kit/` | `build-kit-map.py` (새 파일) | 화면 지도 생성 스크립트 |
  | `/` | `README.md` | 1. 구성 · 6. 알아 둘 점에 화면 이동 설명, 작업 기록 추가 |
- **왜:** 화면마다 목록(`index.html`)으로 돌아가 파일을 열어야 해서 불편했음. 화면 HTML 575장은 고치지 않고 키트 전용 스크립트에서만 연결
- **확인:** 로컬 서버 + 내장 브라우저
  - 575장 모두 스크립트 정상 실행. 원래 「키트에 없는 화면」이던 링크 중 1,563개가 키트 화면으로 이어짐. 남은 링크는 편집 · 미리보기 · 내려받기 등 키트에 없는 화면
  - 상태 화면 453개를 기본 화면에서 단추를 눌러 확인: 409개 정확히 이동, 엉뚱한 화면으로 간 것 0개. 44개는 기본 화면에 그 행이 없어 연결 불가
  - 상태 화면에서 패널 닫기 · 창 바깥 · 더보기 바깥 · Esc · 첫 탭 → 기본 화면 복귀 확인. 실제 클릭(권한 → 서브관리자관리 탭) 확인
- **개발팀 참고:** 키트 전용 파일만 바뀜. 서버 템플릿 · `static/` 실제 자산에 옮길 것 없음
### 2026-11-17 · 페이지 머리 높이 통일(단추 유무 관계없이)
- **PR:** #2 · **브랜치:** `claude/page-header-min-height` · **상태:** 검토 중
- **작업 폴더별 변경**
  | 폴더 | 파일 | 내용 |
  |---|---|---|
  | `static/shared/` | `nuri-tokens.css` | 토큰 `--cms-button-h-md: 3.7rem`(37px, 기본 단추 높이) 추가 |
  | `static/admin-ui/v2/` | `cms-admin-v2.css` | `.nv-page-header` 에 `min-height: var(--cms-button-h-md)` 추가, `.nv-btn` 높이 `3.7rem` → 같은 토큰으로 교체(값 동일) |
- **왜:** 상단 경로(breadcrumb)가 없는 화면에서 머리 단추(`nv-page-header__actions`)가 있으면 37px, 없으면 25.5px 로 머리 높이가 달라 화면을 옮길 때 본문 시작 위치가 11.5px 흔들렸음. 단추가 있을 때 높이로 맞춤
- **확인:** 내장 브라우저(1920px)에서 콘솔 · 매뉴얼 기본 화면 45장 + 상태 화면 표본 78장
  | 경우 | 이전 | 이후 |
  |---|---|---|
  | 경로 없음 · 단추 없음(부서 및 조직, 이미지, SEDIS 사이트 관리) | 25.5px | **37px** |
  | 경로 없음 · 단추 있음(팝업존, 통합회원, 공통코드 등) | 37px | 37px |
  | 경로 있음(메뉴관리, 권한, 만족도 현황 등) | 51.5px | 51.5px |
  | 대시보드 54px · 게시판 · 게시글 관리 62px | 그대로 | 그대로 |
  - 기본 단추(`nv-btn`, 크기 변형 제외) 294개 모두 37px 그대로. 제목 · 설명 글자 줄 정렬(baseline) 변화 없음
- **개발팀 참고:** 제목 줄은 `.nv-page-header` 의 기존 `align-items: flex-end` 로 아래에 붙어, 단추가 있을 때와 같은 위치에 놓임. rem 이라 글자 크기 설정에 단추와 함께 커짐

### 2026-11-16 · README 갱신 · 작업 기록 합치기 · PR 작업 방식 도입
- **PR:** #1 · **브랜치:** `claude/pr-workflow` · **상태:** 병합됨(2026-11-17)
- **작업 폴더별 변경**
  | 폴더 | 파일 | 내용 |
  |---|---|---|
  | `/`(저장소 맨 위) | `README.md` | 구성 · 화면 수 · 디자인 토큰 · 알아 둘 점 갱신, 저장소 작업 방식 · 작업 기록 추가 |
  | `/`(저장소 맨 위) | `design-read.md` | 지움(내용은 README 7 · 8장으로 옮김) |
- **왜:** 작업 기록을 README 한 파일에서 보기 위해. 작업 단위마다 PR 로 검토하기 위해
- **확인:** 키트 화면(`pages/`) · 자산(`static/`) 변경 없음
- **개발팀 참고:** 없음

### 2026-11-16 · 작업 기록 파일 추가
- **커밋:** `3636f8b` (main 직접 · PR 없음) · **상태:** 반영됨
- **작업 폴더별 변경:** `/` — `design-read.md` 새로 만듦(이후 README 로 합침)

### 2026-11-16 · 공개 화면 · KRDS 아이콘 · 게시판 그림 추가
- **커밋:** `e782b52` (main 직접 · PR 없음) · **상태:** 반영됨
- **작업 폴더별 변경**
  | 폴더 | 개수 | 내용 |
  |---|---|---|
  | `pages/default/public/` | 32 | 누리지음 기본 판 공개 화면 HTML |
  | `pages/sedis/public/` | 70 | SEDIS 판 공개 화면 HTML |
  | `static/vendor/krds/img/` | 91 | KRDS 컴포넌트 아이콘(svg) |
  | `static/public/board/` | 3 | 게시판 썸네일 그림 |
- **왜:** 첫 커밋(`28de282 생성`)에서 빠져, 저장소에서 받으면 공개 화면이 없고 아이콘이 깨져 보였음
- **확인:** 저장소 파일 수 1,762개 = 로컬 폴더 파일 수(`.DS_Store` 제외). 한글 파일 이름은 기존과 같은 NFC 로 넣어 중복 없음
- **개발팀 참고:** 파일 내용 변경 없음(추가만). `.gitattributes`(`text=auto`)에 따라 svg 줄바꿈은 저장소에서 LF 로 정규화됨
- 2026-11-23 페이지 헤더 · 브레드크럼(`nv-page-header`, `nv-breadcrumb`) 스타일가이드 적용 — `cms-admin-v2.css` 「2-1」 블록. 제목 brand/page-title(KIMM_Bold 24, 작은 화면 20, @font-face는 `public-ui/…/KIMM-Bold.subset` 사용) · 설명 body/xsmall 13 text-basic · 경로 label/xsmall 13 + caret-right 12 · 현재 위치 text-bolder · 간격 gap-2/3/4/7. `pages/board.css`의 게시글 관리 제목 크기도 같은 토큰으로 바꿈.
- 2026-11-23 머리 버튼 클래스 정리(마크업) — 페이지 머리 · 등록/수정 머리(`nv-page-header__actions`, `nv-editor-header__actions`)의 버튼 클래스를 계층에 맞게 바꿈(1,826개 화면, 3,956개 버튼). 주요 동작 `nv-btn--primary` · 채움과 함께 쓰는 보조 동작 `nv-btn--primary-outline`(새 클래스, `cms-admin-v2.css`) · 버튼이 하나면 `nv-btn--primary` · 채움이 없던 묶음은 맨 오른쪽을 `nv-btn--primary` · 삭제/보관(`--danger`)은 그대로. 바뀐 클래스: outline→primary-outline 2,718 · outline→primary 618 · soft→primary-outline 343 · muted→primary-outline 277. 앞서 넣었던 색 덮어쓰기(「2-2」)는 뺌. 고치기 전 화면 묶음: `_to_delete/pages-before-header-btn.tgz`.
- 2026-11-23 페이지 머리 높이 통일 — 제목 줄 최소 높이를 머리 버튼 높이(3.7rem)와 같게(`cms-admin-v2.css` 「2-1」). 버튼이 있든 없든 경로 없는 머리 37 · 경로 있는 머리 62.5. 특수교육 현황 미리보기 머리의 경로(`sd-trd-crumb`) 아래 여백 8을 빼서 다른 화면과 같게(`trd-admin.css`).
- 2026-11-23 `<main>`의 `tabindex="-1"` 제거 — 본문을 누를 때마다 포커스가 잡히던 문제. 화면 HTML 3,111장에서 뺌(고치기 전 묶음: `_to_delete/pages-before-main-tabindex.tgz`). `static/admin-ui/admin-shell.js`가 불러올 때 다시 넣던 코드도 빼고, 「본문 바로가기」를 누를 때만 잠시 `tabindex="-1"`을 주고 포커스가 떠나면 빼도록 바꿈. **개발팀 참고:** 서버 템플릿의 `<main id="main-content" tabindex="-1">`도 같이 빼야 함.
- 2026-11-23 박스 요소의 강제 tabindex 제거 — 화면 HTML 2,943장: 표 스크롤 상자(nv-table-scroll · tbl-scroll · krds-table-wrap) · 모달 본문 스크롤(modal-conts) · AI 대화 기록(cm-ai-chat) · 안내 말풍선(reasonbar__opt · list-hint · qg-mini) · 사용 설명서 흐름(qg-flow). kd.js가 표 상자에 주던 tabindex=0도 뺌. 남긴 것: 차트 키보드 탐색(cm-chart-focus-*) · 측면 패널 대화상자(nv-panel) · 메뉴 옮기기 손잡이(nv-nav-menu__grip) · 누르는 표 줄(tr role=link) · AI 패널 제목(cm-ai-title). 고치기 전 묶음: `_to_delete/pages-before-box-tabindex.tgz`.
- 2026-11-23 통계표 원본 표 열 너비 — `trd-admin.css`. colgroup(7개)이 파일명 열(8번째 칸)을 빠뜨려 너비가 한 칸씩 밀려 걸리던 것을 머리 칸 순서로 다시 정함: 번호 6.4 · 통계표 원본 나머지 전부 · 파일명 46.8(가장 긴 파일명 한 줄) · 연도 범위 16 · 분기 10 · 반영일 11.2 · 상태 8 · 작업 17(rem). 표 최소 폭 139.6rem. **개발팀 참고:** colgroup에 파일명 열 `<col>`이 빠져 있음.
- 2026-11-23 표 열 너비 점검 · 조정 — 서로 다른 표 175종을 1920 · 1600 화면에서 열마다 실제 너비와 한 줄에 필요한 너비를 재서 비교. 다른 열이 남는데 줄바뀜이 생기던 표만 고침: `ts.css`(시계열 통계표 원본의 데이터 주제 28rem · 원본 연도 25rem · 통계표 통합 시각화 원본 연도 26rem + 표 최소 폭 142rem), `his-admin.css`(조사 구분 28 · 조사 대상자 30 · 영역 24 · 주석 26rem), `kd.css`(데이터 그룹 18.4 · 조사대상 20 · 그래프 유형 17rem + 표 최소 폭 148rem). 앞서 `trd-admin.css` 통계표 원본도 같은 방식.
- 2026-11-23 **SEDIS 관리자 화면 스타일가이드 적용(공통 컴포넌트)** — 새 파일 `static/admin-ui/v2/sedis-sg.css`를 SEDIS 콘솔 화면(`pages/sedis/console`, 2,542장)에만 연결. 누리지음 기본 판은 그대로.
  - 버튼(cms/button) · 입력칸 · 선택 · 여러 줄(cms/input) · 체크 · 라디오 · 토글 · 배지 · 태그 · 카드 · 요약 카드 · 목록 도구 막대 · 표(머리 · 줄 48) · 빈 목록 · 쪽 번호 · 더보기 메뉴 · 상자 탭 · 밑줄 탭(.gtabs) · 세그먼트 · 알림 · 측면 패널 · 모달 · 파일 올리기 · 상세 정보표 · 트리 · 말풍선을 스타일가이드 값(--nuri-* 토큰)으로.
  - 마크업 클래스 정리: 회색 버튼 `nv-btn--outline-strong` 2,551 · `--muted` 619 · `--excel` 180 → `nv-btn--outline`(tertiary 회색 테두리), `nv-btn--soft` 171 → `nv-btn--primary-outline`, 행 더보기 `rowmore` 2,420개에 `nv-btn--icon` 추가.
  - 확인: 화면 틀 237종을 1600에서 고치기 전과 비교 — 스크립트 오류 · 빠진 파일 · 가로 넘침 · 버튼 줄바뀜 새로 생긴 것 0.
  - 고치기 전 묶음: `_to_delete/pages-sedis-before-sg.tgz`.
  - **개발팀 참고:** SEDIS 관리자 화면 템플릿에 `sedis-sg.css`를 마지막 스타일시트로 연결하고, 위 버튼 클래스 정리를 템플릿 · 스크립트(`group-panel.js`의 `nv-btn--soft` 등)에도 반영해야 함.
- 2026-11-23 특수교육 현황 「통계표 통합」 상세 머리(16장)를 시계열 편집 화면과 같은 `nv-editor-header`로 바꿈(마크업): 흰 막대 · 뒤로(통계표 통합 목록) · 제목 · 사용자 화면 코드 · 「이 통계표의 그래프 보기」(단추 하나라 파랑 채움). `trd-admin.css`에서 머리를 맨 위로(order -4), 쓰지 않게 된 `sd-trd-head` 덮어쓰기 규칙 정리.
- 2026-11-23 **하위 목록 머리 · 브레드크럼 삭제** (두 판 모두, 마크업)
  - 하위 목록 머리 `nv-page-header--sub` 182곳: 게시글 관리(`bd-posts-header`) · 조사 대상자 관리 · 권한 역할 상세(`id-subhead`). 제목은 화면 제목(KIMM 24)보다 한 단계 아래인 heading/medium 20 Bold(본문 서체) — `cms-admin-v2.css` 2-1, `board.css`.
  - 머리 단추: 이전 목록 · 관리 화면으로 돌아가는 단추(「…목록으로」 · 「목록」 · 「그래프 관리」) 220개 → `nv-btn--outline`(tertiary 회색 테두리). 하위 목록 머리의 그 밖의 단추(「사용자 화면 보기(새 창)」) 6개 → `nv-btn--primary-outline`. 하위 목록 머리에는 채움 단추를 쓰지 않는다.
  - 브레드크럼 삭제: `nav.nv-breadcrumb-wrap` 1,801 · `ol.nv-breadcrumb`(편집 머리 `edh__crumb` 포함) 1,122 · `p.sd-kd-crumb` · `p.sd-his-crumb` 37. 특수교육 현황 미리보기 경로(`sd-trd-crumb`) 19개는 미리보는 통계표 이름 · 코드를 머리 설명으로 옮긴 뒤 삭제. 사용자 화면 미리보기 안의 누리집 경로(`krds-breadcrumb`)와 이미지 탐색기 폴더 경로(`im-crumbs`)는 기능이라 남김.
  - 고치기 전 묶음: `_to_delete/pages-before-subhead.tgz`. **개발팀 참고:** 서버 템플릿의 브레드크럼 조각과 위 클래스도 같이 바꿔야 함.
- 2026-11-23 사용자 화면 미리보기 화면(136장)은 고치지 않기로 해 하위 목록 머리 · 브레드크럼 작업 전으로 되돌림(`_to_delete/pages-before-subhead.tgz`에서 복원).
- 2026-11-23 사이트 관리 > 도메인 관리 머리(`st-detail__head`, 두 판 19장)를 정해진 하위 목록 머리로: `nv-page-header nv-page-header--sub` · 제목 `nv-page-header__title` · 단추 줄 `nv-page-header__actions`, 「사이트 보기」 · 「사이트 수정」 → `nv-btn--primary-outline`, 「사이트 삭제」는 빨강 테두리 그대로. 이 화면은 피그마 시안과 구성이 달라(요소 추가) 마지막에 다시 정리하기로 함.
- 2026-11-23 **아이콘을 스타일가이드(Phosphor) 아이콘으로** — 관리자 화면(두 판 콘솔 · 설명서 · 로그인, 3,140장)
  - 화면마다 든 아이콘 스프라이트(`<svg style="display:none">` 안 `#nv-i-…` 81종, 모두 자체 그림)를 Phosphor 모양(`static/shared/icons`)으로 바꿈 + 문맥용 id 15종 추가(96종). 같은 id 를 쓰는 모든 아이콘 · 스크립트가 만드는 아이콘이 함께 바뀜.
  - id 대응: activity→chart-bar · alert→warning · arrow-counter-clockwise→arrow-counter-clockwise · arrow-left→arrow-left · arrow-right→arrow-right · arrow-right-circle→arrow-circle-right · arrow-up→arrow-up · bell→bell · board→notebook · bold→text-b · book→book-open · calendar→calendar-blank · camera→camera · check→check · check-circle→check-circle · chevron-down→caret-down · chevron-right→caret-right · chevron-up→caret-up · clock→clock-counter-clockwise · close→x · code→code · columns→columns · contrast→circle-half · copy→copy · dashboard→squares-four · database→database · download→download-simple · draft→file-dashed · drag→dots-six-vertical · edit→pencil-simple · excel→microsoft-excel-logo · external→arrow-square-out · eye→eye · eye-slash→eye-slash · file→file · file-code→file-code · file-text→file-text · filter→funnel-simple · folder→folder · folder-plus→folder-plus · font→text-aa · globe→globe · globe-simple→globe-simple · grid→squares-four · h1→text-h-one · h2→text-h-two · help→question · help-chat→chat-circle-dots · home→house · image→image · image-inline→image-square · info→info · italic→text-italic · key→key · link→link · list→list-bullets · list-dashes→list-dashes · lock-simple→lock-simple · logout→sign-out · menu→list · message→chat-circle-dots · minus→minus · minus-circle→minus-circle · more→dots-three-vertical · move→arrow-bend-down-right · ol→list-numbers · paper-plane-tilt→paper-plane-tilt · pause-circle→pause-circle · pencil→pencil-simple · plus→plus · popup→app-window · prohibit→prohibit · puzzle→puzzle-piece · redo→arrow-counter-clockwise · refresh→arrows-clockwise · reset-password→password · search→magnifying-glass · server→hard-drives · settings→gear-six · shield→shield-check · sidebar→sidebar-simple · sitemap→tree-structure · star→star · swap→swap · trash→trash · ul→list-bullets · underline→text-underline · upload→upload-simple · user→user · user-edit→user-gear · users→users · warning-circle→warning-circle · wrench→wrench · x-circle→x-circle · monitor · chat-circle-dots-fill
  - 같은 id 가 다른 뜻으로 쓰인 곳은 `<use href>` 를 바꿈: 맨 위로 caret-up→arrow-up · 콘솔 권한 key→shield-check · 접근권한 · 메뉴 접근 통제 key→lock-simple · 비밀번호 초기화 key→password · 코드 관리 key→list-dashes · 누리집 접근권한 eye→globe-simple · 회원 정보 eye→user · 편집기 분할 grid→columns · 부서 이동 redo→arrow-bend-down-right · 폐기 해제 refresh→arrow-counter-clockwise · 중지하기→pause-circle · XML생성→file-code · 상태변경→swap · 비공개 x-circle→eye-slash · 비활성화 · 미사용→prohibit · 오류 알림→warning-circle · 발행 upload→paper-plane-tilt · ZIP 반입 upload→file-zip · 부서삭제 minus→trash · 머리 글자·화면 설정→monitor · 도움말 카드→chat-circle-dots-fill · 직원 확인 shield→check-circle. 대시보드는 운영관리(톱니)와 겹치지 않게 squares-four.
  - CSS: 머리 · 사이드 메뉴 아이콘 마스크 덮어쓰기 블록 삭제(`cms-admin-v2.css`), 선택 상자 꺾쇠 · 이미지 고르기 체크를 Phosphor 모양으로(`cms-admin-v2.css` · `admin-parts.css`), 그래프 아이콘 `img/ico-chart-bar.svg` → `shared/icons/chart-bar.svg`(`ts.css`), SEDIS 행 ⋮ 아이콘 20(`sedis-sg.css`).
  - 남긴 것: 편집기(SunEditor) 도구 막대 아이콘(외부 라이브러리 — 편집기 설정 icons 옵션으로 바꿔야 함), 사용자 화면 미리보기 안 누리집 아이콘, 대시보드 · 요약 카드 그래픽(그래픽 묶음).
  - 고치기 전 묶음: `_to_delete/pages-before-icons.tgz`. **개발팀 참고:** 서버의 아이콘 스프라이트 조각을 이 96종으로 바꾸고, 위 문맥 id 를 템플릿에 반영해야 함. 대응표는 `_to_delete/iconmap.py`.
- 2026-11-23 하위 목록 머리 제목을 화면 머리와 같은 글자(brand/page-title, KIMM_Bold 24)로 — `cms-admin-v2.css` · `board.css`. 게시글 관리 머리의 게시판 종류 배지(133곳)를 단추 영역에서 제목 옆(`nv-page-header__text` 안 제목 뒤)으로 옮김(마크업).
- 2026-11-23 **빈 목록을 스타일가이드 cms/empty 로** — 두 판 콘솔 782장(사용자 화면 미리보기 제외)
  - 마크업: `nv-empty` 23종 + 표 안 빈 줄(만족도 응답 · 부가 파일) + 권한 패널 「되살릴 권한그룹이 없습니다」를 그림 + 제목 + 설명 한 틀로. 종류 클래스 `nv-empty--{data|search|file|permission|error|user|stats|menu|target}` 를 붙이고 옛 아이콘은 뺌. 제목은 마침표 없이, 설명이 없던 곳은 할 일 한 문장을 더함(예: 찾는 메뉴가 없습니다 → 「검색어를 바꿔 다시 찾아 보세요.」). 단추 · 링크(확장 서비스 등록 · GA 바로가기)는 그대로.
  - CSS(`cms-admin-v2.css`): 그림은 `static/shared/illust/empty-*.svg`(182×160)를 종류 클래스로 붙임. 제목 body/medium 16 SemiBold · 설명 body/xsmall 13. 표 · 패널 · 트리 안에서는 여백만 줄임.
  - 스크립트가 만드는 빈 안내 3곳도 같은 틀로: `menu-edit.js`(찾은 서브관리자) · `board-qna-process.js`(찾은 담당자) · `group-panel.js`(파일에 넣을 사람).
  - 고치기 전 묶음: `_to_delete/pages-before-empty.tgz`.
