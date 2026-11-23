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
