# 누리지음 CMS 디자인 규칙

> 피그마 「[프로젝트]26-102CMS(누리지음) UIUX 분석」(fileKey `xUurKXDIggSMDwSQdKZDXz`)의 **디자인스타일 · 디자인모음 · 아이콘** 페이지를 분석해 정리한 규칙입니다.
> 작성 2026-11-23. 피그마가 바뀌면 이 문서도 함께 고칩니다.

---

## 0. 기준 페이지와 우선순위

| 페이지 | 노드 | 역할 |
|---|---|---|
| 디자인스타일 | `2308:26762` | **공통(common) 컴포넌트·변수·스타일의 원본.** 새 컴포넌트는 여기에만 만듭니다. |
| 디자인모음 | `2471:116387` | 디자인·추가기능·게시판 스킨(CMS)·단위기능(확정) 화면을 **공통 컴포넌트로 다시 조립**해 메뉴·흐름 순서로 모은 페이지. 화면 전용 반복 요소는 「00 디자인모음 컴포넌트」 섹션의 파생 컴포넌트로 둡니다. |
| 아이콘 | `2282:65235` | Phosphor Icons v2.1.1(MIT) 1,512종 × 선·채움 = 3,024개 컴포넌트. |

- 앞으로 피그마 분석·작업은 이 세 페이지를 기준으로 합니다.
- 「디자인」「추가기능」「단위기능」「게시판 스킨」 페이지는 **원본 보관용**입니다. 고치지 않고, 디자인모음으로 옮길 때 참고만 합니다.
- 「스타일표준화」 페이지는 없앨 예정이라 참조만 합니다.
- 우선순위는 ① 이 문서(디자인스타일) → ② 디자인모음 화면 → ③ KRDS 기본값 순서입니다.
- 원본 시안과 규칙이 다르면 **규칙에 맞춰 고칩니다.** 고친 내용은 디자인스타일 각 장의 설명 글에 「원본 ○ → ○」로 남깁니다.

---

## 1. 변수(Variables) 구조

KRDS 변수 체계(primitive → semantic / mode → responsive)를 따릅니다. 화면 요소에는 **primitive를 직접 쓰지 않습니다.**

| 컬렉션 | 모드 | 개수 | 쓰임 |
|---|---|---|---|
| 누리지음 primitive | value-set | 155 | 원본 색·숫자·서체 값. 선택 목록에서 숨김 |
| 누리지음 semantic | value-set | 46 | gap · padding · size-height · radius |
| 누리지음 mode | light · high-contrast | 303 | 역할별 색(배경·글자·테두리·버튼 등) |
| 누리지음 responsive | pc · mobile | 18 | 글자 크기 |

이전 컬렉션 `semantic` · `mode` · `Icon` · `Icon Color` · `Icon Stroke` · `누리지음 표준` · `게시판 스킨 전용 / 기본 스타일`은 이전 시안용입니다. 새 작업에는 쓰지 않습니다.

### 1-1. 색 팔레트 (primitive)

- 단계는 5 · 10 · 20 … 90 · 95 · 100입니다.
- 연한 구간을 촘촘하게 쓰려고 KRDS보다 한 칸 밀려 있습니다(KRDS primary/50 = 누리지음 primary/60).

| 단계 | gray (주 회색) | primary | secondary | point | danger | warning | success | information |
|---|---|---|---|---|---|---|---|---|
| 5 | `#f6f8fc` | `#fafcff` | `#f5faff` | `#fbfffd` | `#fffaf9` | `#fffbf2` | `#f7fcf9` | `#f6fbff` |
| 10 | `#eef2f7` | `#ecf2fe` | `#e4edfe` | `#e8faf1` | `#fdefec` | `#fff3db` | `#eaf6ec` | `#e7f4fe` |
| 20 | `#e2e8f0` | `#d0def7` | `#ceddf8` | `#ccf1df` | `#fcdfd9` | `#ffe0a3` | `#d9eedd` | `#d3ebfd` |
| 30 | `#cbd5e1` | `#afcaf9` | `#a3bcea` | `#ace8cd` | `#f7afa0` | `#ffc95c` | `#acdbb6` | `#9fd2fa` |
| 40 | `#afbccd` | `#86aff9` | `#7a9bdb` | `#86e0ba` | `#f48771` | `#fab406` | `#81c994` | `#60b5f7` |
| 50 | `#94a3b8` | `#4b87f6` | `#4879c9` | `#51d8aa` | `#f05f44` | `#c38800` | `#3da864` | `#1199f2` |
| 60 | `#64748b` | `#256ef4` | `#1f5ac7` | `#27c590` | `#de3412` | `#9d6b00` | `#1f8a4c` | `#0079ca` |
| 70 | `#55647a` | `#0b50d0` | `#0033a9` | `#00986b` | `#bd2c0f` | `#8a5c00` | `#267444` | `#096ab3` |
| 80 | `#475569` | `#083891` | `#03317a` | `#007f5a` | `#8a2411` | `#624001` | `#2a5e3b` | `#0b5691` |
| 90 | `#334155` | `#062561` | `#052254` | `#115b41` | `#5c180b` | `#432b01` | `#21482d` | `#083961` |
| 95 | `#1e293b` | `#04163a` | `#031230` | `#144230` | `#390d06` | `#301e01` | `#142c1c` | `#062440` |
| 100 | `#0f172a` | `#030e27` | `#020b1f` | `#143427` | `#260904` | `#261701` | `#102115` | `#05192d` |

- `gray/0` = `#ffffff`. 주 회색은 누리지음 화면에서 가장 많이 쓴 **푸른 회색(gray)** 입니다.
- `neutral`(`#131416`~`#f9fafb`)은 이전 중립 회색입니다. 화면을 다시 연결할 때 gray로 옮깁니다.
- 순수 검정은 `alpha/black100`, 반투명은 `alpha/black·white` 100 · 75 · 50 · 25 · 10 · 5 · 0을 씁니다.

### 1-2. 역할별 색 (누리지음 mode) — 화면에서 쓰는 이름

모든 칸의 값은 light / high-contrast 순서입니다.

| 그룹 | 주요 변수 → light 값 |
|---|---|
| background | `white` gray/0 · `gray-subtler` gray/5 **화면 바탕 #f6f8fc** · `gray-subtle` gray/10 · `inverse` gray/95 · `dim` black75 |
| surface | `white` · `gray-subtler`/`gray-subtle` · `disabled` gray/30 · `{색}-subtler` {색}/10 · `secondary` secondary/70 **헤더 바 #0033a9** · `primary-subtlest` primary/5 |
| border | `gray-light` gray/20 **기본 테두리** · `gray` gray/30 · `gray-dark` gray/70 · `gray-darker` gray/95 · `{색}-light` {색}/20 · `{색}` {색}/60 |
| divider | `gray-light` gray/20 · `gray` gray/30 · `gray-dark` gray/60 · `primary` · `error` danger/60 |
| text | `bolder` gray/95 · `basic` gray/80 · `subtle` gray/60 · `disabled` gray/50 · `placeholder` gray/60 · `primary` primary/70 · `{색}` {색}/70 · `*-inverse` |
| icon | `gray` gray/80(기본) · `gray-subtle` gray/60 · `gray-light` gray/50 · `gray-fill` gray/30 · `disabled` · `inverse` · `{색}` {색}/60 · `*-static` |
| link | `default` primary/60 · `hover` primary/70 · `pressed` primary/80 |
| action | `primary-hover` primary/10 · `primary-pressed` primary/20 · `gray-hover` gray/10 · `gray-pressed` gray/20 · `secondary-*` |
| element | 그래프·점·장식용 `{색}` · `{색}-light` · `{색}-lighter` |
| input | `surface` · `border` **gray/70 (#55647a, 진한 테두리)** · `border-light` gray/30 · `border-hover` gray/95 · `border-active` primary/60 · `border-error` danger/60 · `surface-disabled` · `surface-readonly` · `control-on` primary/60 · `control-track-off` |
| button | `{색}-solid` · `-solid-hover` · `-solid-pressed` · `-light` · `-light-hover` · `-light-pressed` · `-border` · `-border-light` · `-text`, 그리고 `outline-surface` · `text-on-solid` · `disabled-fill`/`-border`/`-text` · `ghost-surface` · `warning-text-on-solid` |
| table | `head-surface` gray/10 · `divider` gray/10 · `row-hover` gray/5 · `row-selected` secondary/5 · `row-changed` warning/5 · `row-error` danger/5 · `card-border` · `-hover` · `-selected` primary/40 |
| nav | `text` gray/90 · `text-selected` primary/70 · `item-hover` gray/5 · `item-selected` primary/10 · `border` gray/10 · `brand` secondary/70 · `item-active-border` |
| 컴포넌트 전용 | `tab/*` · `pagination/selected` gray/80 · `tag/*` · `segmented/*` · `accordion/*` · `tree/*` · `data-table/*` · `toast/*` · `header/avatar-*` · `header/notice-dot` danger/50 |
| alpha · shadow | `alpha/base*` · `alpha/inverse*` · `alpha/shadow1~3`(5 · 8 · 12%) · `shadow/y-3·y-4·blur-3·blur-4` |

**색 연결 규칙**
- 모든 채움·선·글자 색은 mode 변수에 연결합니다. 연결 안 된 색은 0곳이어야 합니다.
- 역할대로 고릅니다.
  - 글자 → `text/*`
  - 아이콘 → `icon/*`
  - 선 → `border/*` · `divider/*` · `input/*`
  - 면 → `surface/*` · `background/*`
- 투명도는 변수의 alpha로 정합니다. 레이어 투명도와 겹치지 않게 합니다. 투명 버튼에 dim 변수를 넣으면 검은 상자가 되니 주의합니다.

### 1-3. 숫자 눈금 (primitive number → semantic)

`number/0~21 · max` = 0 · 1 · 2 · 4 · 6 · 8 · 10 · 12 · 16 · 20 · 24 · 28 · 32 · 36 · 40 · 44 · 48 · 56 · 64 · 72 · 80 · 96 · 1000

| semantic | 값 |
|---|---|
| gap/1~14 | 2 · 4 · 6 · 8 · 10 · 12 · 16 · 20 · 24 · 28 · 32 · 40 · 48 · 56 |
| padding/1~13 | 2 · 4 · 6 · 8 · 10 · 12 · 16 · 20 · 24 · 28 · 32 · 40 · 48 |
| size-height/1~12 | 16 · 20 · 24 · 28 · 32 · 36 · 40 · 44 · 48 · 56 · 64 · 72 |
| radius | xsmall 2 · small 4 · medium 8 · large 12 · xlarge 16 · xxlarge 24 · max 1000 |

---

## 2. 크기 · 간격 · 모서리 규칙

- **크기·간격·여백은 4의 배수**로 맞춥니다. 2는 세밀한 간격에만 허용합니다. 소수점 값은 쓰지 않습니다.
- **모서리는 0 · 2 · 4의 배수만** 씁니다. **6 · 10은 금지**입니다(6 → 4, 10 → 8). 100 · 999 · 9999는 max로 바꿉니다.
- 눈금에 없는 값은 가까운 단계로 옮깁니다.
  - 간격 5 · 5.7 · 3 · 14 · 18 → 4 · 6 · 12 · 16 · 20
  - 여백 14 → 12 또는 16, 18 → 16 또는 20, 7 · 9 · 13 → 8 · 8 · 12, 헤더 38 → 40
- **높이:**
  - 버튼 M은 40, 표 칸은 48입니다.
  - 22 · 34 · 50처럼 글자 줄이 정하는 높이는 고정하지 않고 hug로 둡니다.
  - 상단 바 66은 예외로 유지합니다.
- **선:** 소수점 두께는 정수로 바꾸고, 0.5 이하는 0.5로 맞춥니다. 아이콘 선 두께는 건드리지 않습니다.
- **오토레이아웃:** 모든 프레임에 오토레이아웃을 씁니다.
  - 높이 1로 접힌 프레임이나 내용이 넘치는 프레임은 hug로 고칩니다.
  - 양쪽 끝 정렬(space-between) 프레임은 fill로 둡니다.
  - 화면 최상위 프레임의 세로는 hug로 둡니다.

---

## 3. 글자 (Typography)

- 서체: **Pretendard** (`typo/font/type`)
- **줄 높이는 모든 스타일 150%** 입니다.
  - 한 줄 높이: 13 → 20 · 14 → 21 · 16 → 24 · 18 → 27 · 20 → 30 · 24 → 36 · 28 → 42 · 32 → 48
- **굵기는 3단계만** 씁니다. **Medium은 쓰지 않고** SemiBold로 옮깁니다.
  - Regular: 내용(본문 · 표 데이터 · 입력값)
  - SemiBold(`-bold`): 이름표 · 버튼 · 탭 · 강조 · 선택된 메뉴
  - Bold: 16px 이상 제목 전용
- **최소 글자 크기는 13**입니다. 12(`caption/xsmall`)는 바닥글 저작권·빌드 버전, 알림 카운트, 로고 배지에만 씁니다.
- 크기·굵기·서체·자간은 `누리지음 responsive` 변수에 연결돼 있습니다(pc / mobile).

| 스타일 | 굵기 · pc/mobile | 쓰임 |
|---|---|---|
| `display/small` | Bold 32/28 | 대시보드 큰 숫자 · 통계 카드 |
| `heading/xlarge` | Bold 28/24 | 화면 큰 제목 · 로그인 · 첫 화면 |
| `heading/large` | Bold 24/20 | 화면 제목 |
| `heading/medium` | Bold 20/18 | 모달 제목 |
| `heading/small` | Bold 18/16 | 확인창 제목 · 카드 제목 |
| `heading/xsmall` | Bold 16 | 작은 제목 |
| `body/medium` · `-bold` | Regular · SemiBold 16 | 여러 줄 글 |
| `body/small` · `-bold` | Regular · SemiBold 14 | 기본 본문 |
| `body/xsmall` · `-bold` | Regular · SemiBold 13 | 보조 본문 |
| `label/medium-bold` | SemiBold 16 | 한 줄 요소(큰 버튼) |
| `label/small` · `-bold` | Regular · SemiBold 14 | 버튼 · 입력창 · 표 |
| `label/xsmall` · `-bold` | Regular · SemiBold 13 | 배지 · 작은 버튼 · 안내 |
| `navigation/depth-medium` · `-bold` | Regular · SemiBold 14 | 메뉴 기본 · 선택 |
| `caption/xsmall` | Regular 12 | 바닥글 · 카운트 (특수) |
| `brand/page-title` | KIMM_Bold 24/20 | 화면 제목 디자인 서체 |
| `brand/greeting` | KIMM_Bold 32/24 | 대시보드 인사말 |
| `brand/logo-badge` | Montserrat Bold 15 | 로고 옆 「CMS」 배지 |

- body는 여러 줄 글, label은 버튼·입력창 같은 한 줄 요소에 씁니다.
- 크기·굵기에 따라 연결할 스타일:
  - 13 → `label/xsmall(-bold)`
  - 14 → `label/small(-bold)`
  - 16 → `heading/xsmall`(Bold) · `label/medium-bold`(SemiBold) · `body/medium`
  - 18 / 20 / 24 → `heading/small` / `medium` / `large`
- `누리지음/본문·제목·1줄·읽기·강조·메모/*` 스타일은 이전 스타일입니다. 새 작업에는 KRDS 이름 스타일만 씁니다.
- 한 글자 상자 안에 굵기가 섞인 경우(대시보드 숫자 등)는 예외로 둡니다.

---

## 4. 그림자

| 스타일 | 값 | 쓰임 |
|---|---|---|
| `shadow1` | 0 1 2 · 0 0 2 (5%) | 낮게 뜬 요소 · 카드 · 요약 카드 · 세그먼트 선택 칸 |
| `shadow2` | 0 4 8 (8%) · 0 0 2 (5%) | 떠 있는 단추 · 드롭다운 · 더보기(작업) 메뉴 · 선택 목록 · 달력 |
| `shadow3` | 0 8 16 (12%) · 0 0 2 (8%) | 검색 결과 · 알림 · 팝오버 · 토스트 |
| `shadow4` | 0 16 24 (12%) · 0 0 2 (8%) | 모달 · 확인창 · 슬라이드 패널 |

- 색은 `alpha/shadow1~3`에 연결돼 있어 고대비 모드에서 자동으로 진해집니다.
- 흩어져 있던 그림자 25가지를 위 4단계로 묶었습니다. `누리지음/shadow-*` 스타일은 이전 스타일입니다.

---

## 5. 아이콘

- **Phosphor Icons**를 KRDS 이름 규칙으로 씁니다.
  - 선: `icon/{이름}`, 채움: `icon/{이름}-fill`
  - 원본 프레임 24×24, 기본 색은 `icon/gray`입니다.
- 크기는 12 · 14 · 16 · 20 · 24만 씁니다.
  - 12 · 14: 배지 · 버튼 XS · 안내 문구
  - 16: 버튼 S · M, 입력창, 메뉴 항목
  - 20: 버튼 L · XL, 아이콘 버튼 M, 토스트
  - 24: 큰 단독 아이콘
- 색은 `icon/*` 변수를 씁니다. 버튼·배지 안의 아이콘은 버튼·배지 글자색을 자동으로 따라갑니다.
- 낱개 벡터로 그린 아이콘이나 옛 아이콘 세트(`ico_system/*`, `icon_size`, `_이전 · Icon` 등)는 쓰지 않습니다. 같은 뜻의 Phosphor 인스턴스로 바꾸고, 원래 색은 유지합니다.
- 자주 쓰는 아이콘:

| 뜻 | 아이콘 | 뜻 | 아이콘 |
|---|---|---|---|
| 닫기 | `x` | 더보기(작업) | `dots-three-vertical` |
| 추가 | `plus` | 삭제 | `trash` |
| 수정 | `pencil-simple` | 미리보기 | `eye` |
| 검색 | `magnifying-glass` | 펼침 | `caret-down` |
| 이전 · 다음 | `caret-left` · `caret-right` | 뒤로 | `arrow-left` |
| 새 창 | `arrow-square-out` | 올리기 | `upload-simple` |
| 정보 | `info` | 주의 안내 | `warning-circle` |
| 사람 · 여러 사람 | `user` · `users` | 권한 | `shield` · `key` · `lock` |
| 그래프 | `chart-bar` | 메뉴 접기 | `sidebar-simple` |
| 굵게 · 제목3(편집기) | `text-b` · `text-h-three` | | |

- **그래픽 아이콘** `graphic/{이름}`(60×60, 유리 질감 10종)은 대시보드·요약 카드 전용입니다.
  - 파랑: 게시글 · 누리집
  - 초록: 완료
  - 노랑: 예약 · 점검 필요 · 경고
  - 보라: 임시저장 · 금지 · 글 · 점검 대상

---

## 6. 공통 컴포넌트 (디자인스타일)

모든 컴포넌트 이름은 `cms/{이름}`입니다. 속성 이름은 한국어(글자, 라벨, 아이콘 모양 …)이고, 변형(variant) 이름은 영어(Color, Style, Size, State …)입니다.

### 6-1. 버튼 · 배지

| 컴포넌트 | 변형 | 속성 · 규칙 |
|---|---|---|
| `cms/button` | Color 8 × Style 4 × Size XS 28 · S 32 · M 40 · L 44 · XL 48 × State 4 | 글자 · 앞/뒤 아이콘(켜기 · 모양) |
| `cms/button-icon` | Color 8 × Style 4 + Ghost × Size XS · S · M × State | 아이콘 모양. 닫기 X는 Tertiary Ghost XS |
| `cms/button-text` | Type Link · Neutral · Danger × Size S · M | 글자 · 앞/뒤 아이콘 |
| `cms/badge` | Color 8 × Style 4 × Size Small 20 · Medium 24 · Large 32 | 글자 · 점 · 아이콘. 상태 표시는 모두 배지 하나로 씁니다 |

- **Color 8:** Primary · Secondary · Tertiary · Point · Danger · Warning · Success · Info
- **Style 4:** Solid · Solid-light · Outline · Outline-fill
- **State 4:** Default · Hover · Pressed · Disabled
- 버튼 쓰임:
  - 주 버튼: Primary Solid
  - 보조 버튼: Tertiary Outline
  - 삭제: Danger Outline-fill 또는 Outline
  - 표 안 동작 버튼: S 32 Tertiary Outline
- 상태 배지는 Solid-light로 씁니다.

| 의미 | 예 | Color |
|---|---|---|
| 정상 · 진행 · 출력 | 게시, 게시중, 활성, 운영중, 출력중, 허용 | Success |
| 대기 · 작성 | 작성, 승인대기, 예약게시, 미완료 | Warning |
| 보류 · 비활성 | 비게시, 미출력, 임시저장, 미사용, 중지, 탈퇴 | Tertiary |
| 사용 · 공개 · 정보 | 사용, 공개, 사용중 | Primary 또는 Info |
| 반려 · 위험 | 반려, 이용정지, 불일치 | Danger |

- 「변경」「바로보기」처럼 **누르는 글자는 배지가 아니라 버튼(XS)** 입니다. 반대로 분류·상태 표시를 버튼으로 만들지 않습니다.

### 6-2. 입력

| 컴포넌트 | 규칙 |
|---|---|
| `cms/input` | Size S 32 · M 40 · L 44, State Default · Disabled · Error · Completed · Focused · View |
| `cms/select` | input과 같은 크기·상태. 글자는 한 줄 + 말줄임 |
| `cms/select-text` | 테두리 없는 글자형 셀렉트(목록 표시 개수 등), State Default · Hover · Pressed · Disabled |
| `cms/checkbox` · `cms/radio` | S 16 · M 20, 라벨 켜기. 꺼진 상자 테두리는 `input/border` |
| `cms/toggle` | S 20 · M 24 |
| `cms/textarea` | 기본 높이 120 · 여백 12/16 · 글자 수(13) 켜기 |
| `cms/date-input` · `cms/date-range` | 기본 너비 160 · 형식 YYYY-MM-DD, 기간 사이 8 |
| `cms/calendar` · `cms/calendar-day` | 너비 280 · 여백 16 · 모서리 8 · shadow2 / 칸 32×32 · 모서리 4 |
| `cms/select-option` · `cms/select-list` | 항목 높이 36 · 좌우 12 · 글자 14 / 목록 여백 8 · 모서리 8 · shadow2. 셀렉트 아래 4, 셀렉트와 같은 너비 |
| `cms/file-drop` · `cms/file-item` | 끌어놓기 여백 24 · 점선 · 모서리 8 / 파일 줄 높이 40. 오류는 파일 줄이나 토스트로 알림 |
| `cms/tag` | 알약형 Fill · Line, S 24 · M 28. 상태·분류 표시에는 쓰지 않음(배지 사용) |
| `cms/label` | 14 SemiBold, 필수 * 빨강, 도움말(?) 켜기 |
| `cms/form-field` | 좌우형 입력 항목. 라벨 칸 120 · 사이 24 |

- 입력 상자는 모서리 4, 여백 12/16, 글자 14(L 16)입니다.
- **입력·날짜·텍스트 영역·체크·라디오는 진한 테두리(`input/border`, `#55647a`)** 를 씁니다. 셀렉트는 연한 테두리(`input/border-light`)를 씁니다.
- 입력 중은 파랑 2px, 오류는 빨강 2px 테두리입니다. 값이 있는지 없는지로 변형을 나누지 않습니다.
- **라벨은 컴포넌트 속성으로** 씁니다.
  - 위아래형: input · select의 「라벨」「안내」를 켭니다(라벨-상자-안내 사이 8).
  - 좌우형: `cms/form-field`를 씁니다.
  - 입력창 옆에 낱개 글자로 이름표를 두지 않습니다.

### 6-3. 탭 · 메뉴 · 보기 전환 · 경로

| 컴포넌트 | 규칙 |
|---|---|
| `cms/tab` | Line(높이 48 · 선택 시 2px 밑줄 + 14 SemiBold 파랑) · Box(높이 44 · 선택 시 진한 파랑 바탕 + 흰 글자 · 모서리 8) |
| `cms/menu` · `cms/menu-item` | 흰 바탕 · 연한 테두리 · shadow2 · 모서리 8 · 여백 8. 항목 높이 36 · 14 Regular · 아이콘 16 · 마우스 올림 gray/10, 삭제는 Danger. 항목 4 · 5 켜기 |
| `cms/segmented` · `cms/segmented-item` | 같은 내용의 보기 방식만 바꿀 때(목록 · 바둑판, 편집 · 미리보기). S 틀 32 · 칸 24 / M 틀 40 · 칸 32. 다른 내용으로 넘어가면 탭 |
| `cms/breadcrumb` · `cms/breadcrumb-item` | 13 · 꺾쇠 12 · 사이 4. **누리지음 서브페이지에서는 쓰지 않고 예비로만 둠** |

### 6-4. 표 · 목록

| 컴포넌트 | 규칙 |
|---|---|
| `cms/table-cell` | Type Head · Body × Content(Text · Text-strong · Text-subtle · Link · Two-line · Badge · Checkbox · Button · Action · **Icon-text**) × Align Left · Center · Right. 높이 48 · 좌우 8 · 14(머리 SemiBold) |
| `cms/table-row` | Style Line(아래 구분선) · Card(모서리 8 · 테두리 1 · 행 사이 8) × Type Head · Body × State Default · Hover · Selected · Changed · Error |
| `cms/pagination` · `cms/pagination-item` | 높이 24 · 최소 너비 24 · 모서리 4 · 13. 선택은 gray/80 바탕 + 흰 SemiBold, 칸 사이 4. 첫 쪽에서는 이전이 비활성 |
| `cms/data-table` · `-row` · `-cell` | 이름·값 정보 표. 이름 칸 120 · gray/5 · 13 SemiBold / 값 14 · 최소 높이 44 |
| `cms/accordion` | M(머리 44 · 14 SemiBold) · L(56 · 16 Bold) |
| `cms/tree` · `cms/tree-item` | 조직도. 1단 48 · 2단 44 · 3단 36 |
| `cms/empty-img` | 빈 상태 그림 9종(검색 결과 없음 · 데이터 없음 · 파일 없음 · 권한 없음 · 오류 · 사용자 없음 · 통계 연결 전 · 담당 메뉴 없음 · 대상자 없음) |
| `cms/error-img` | 404 · 403 · 500 · 503 · 네트워크 끊김 |

- Icon-text 칸은 안내 문구용입니다. 아이콘 14(`warning-circle` 기본, 「아이콘 모양」으로 교체) + 13 흐린 글자이고, 아이콘 색은 `icon/gray-subtle`입니다.
- **목록 표 규칙**
  - 머리 줄 배경은 `table/head-surface`, 본문 줄은 흰 바탕 + 아래 1px `table/divider`입니다.
  - 마우스 올림은 `table/row-hover`, 선택은 `row-selected`, 바뀐 줄은 `row-changed`입니다.
  - 열 순서는 체크(48) → 번호(Text-subtle) → 상태(Badge) → 제목(Text-strong, fill) → … → 작업(Action ⋮, 가운데)입니다.
  - 제목 열 하나만 fill로 두고, 나머지 열은 고정 너비입니다.
  - 표 안 상태·버튼·체크는 칸 컴포넌트의 안쪽 배지·버튼·체크를 바꿔서 씁니다.
- **작업 메뉴 항목**은 아이콘 + 글자이고, 삭제하기는 맨 아래 Danger입니다.
  - 미리보기(eye) · 수정하기(pencil-simple) · 삭제하기(trash)를 기본으로 하고, 화면에 따라 항목을 더합니다(그래프 수정 chart-bar, 도메인 관리, 코드 관리, 비밀번호 재설정 등).

### 6-5. 화면 틀

| 컴포넌트 | 규칙 |
|---|---|
| `cms/side-nav` · `cms/side-nav-item` · `cms/logo` | 너비 240, 로고 영역 66(`nav/brand` #0033a9), 오른쪽 1px `nav/border` |
| `cms/header-bar` | 높이 66, `surface/secondary`(#0033a9) |
| `cms/page-header` | Type Default · Subpage · Form |
| `cms/list-toolbar` | 높이 72 |
| `cms/footer` | 56. 12px 저작권 · 빌드 버전 |
| `cms/top-button` | 40, 오른쪽 아래 고정 |

- **사이드 메뉴:**
  - 1차 메뉴는 높이 48입니다. 마우스 올림 효과가 없고, 선택 시 흰 바탕 + 모서리 8입니다. 접힘은 ›, 펼침은 ⌄로 표시합니다.
  - 하위 메뉴는 높이 36, 하이픈 블릿입니다. 선택 시 연한 파랑 바탕 + SemiBold입니다.
  - 메뉴 항목에는 테두리를 두지 않습니다.
  - 아래에 매뉴얼 바로가기를 둡니다.
- **상단 바:** 검색, 사이트 바로가기, 글자·화면 설정, 알림(빨간 점 `header/notice-dot`), 사용자(이름 + 접속 IP)가 들어갑니다.
- **화면 제목(page-header):**
  - 제목 24 Bold + 13 설명입니다.
  - 속성: 제목 · 설명 · 설명 글자 · 버튼 영역 · 버튼 1~4 · 상태 · 상태 글자 · 경로
  - Type: Default(목록) · Subpage(뒤로) · Form(등록·수정)
- **목록 도구 막대(list-toolbar):**
  - 왼쪽: 총 개수 · 목록 표시 개수 · 선택 개수 · 선택 삭제 · 버튼 1/2(상태 변경 · 엑셀 다운로드)
  - 오른쪽: 기간 · 상태 필터(체크) · 선택 1/2 · 검색 · 보기 전환 · 등록 버튼
  - 각 요소를 속성으로 켜고 끕니다. 안쪽 셀렉트·버튼 글자는 노출된 인스턴스에서 바꿉니다.

### 6-6. 창 · 알림

| 컴포넌트 | 규칙 |
|---|---|
| `cms/modal` | Type Default · Confirm × Size S 400 · M 560 · L 760(Confirm은 S). 모서리 12 · shadow4 · 여백 24, 제목 20 Bold(Confirm 18), 꼬리 버튼 M 40 오른쪽 정렬 |
| `cms/panel` | 오른쪽 슬라이드 패널. 너비 476, 바탕 `background/gray-subtler`(#f6f8fc), 왼쪽 모서리 24, 여백 18/28 |
| `cms/panel-header` · `cms/panel-footer` | 패널 머리 · 바닥(바닥 버튼 XL) |
| `cms/toast` | 짙은 바탕 · 모서리 8 · 여백 12/16 · shadow3 · 아이콘 20 + 14 흰 글자. 화면 아래 가운데에 잠깐 표시 |
| `cms/alert` | 화면·패널 안에 머무는 안내 상자. 연한 바탕 · 연한 테두리 · 모서리 8 |

- **모달**
  - 속성: 제목 · 설명 · 설명 글자 · 닫기 · 보조 버튼 · 메시지(Confirm)
  - 뒤 배경은 `background/dim`(검정 75%)이고, 화면 위에 덮을 때는 투명도 0.45로 둡니다.
- **패널**
  - 회원·직원 패널은 너비 516입니다.
  - 머리: 제목 · 설명 · 설명 글자 · 닫기
  - 몸통은 항목 묶음마다 흰 카드로 나눕니다.
  - 바닥: 오른쪽 취소(보조, 끄기 가능) · 등록/수정/확인(주) 버튼
  - 높이는 hug입니다. 머리·바닥은 1080으로 늘리지 않습니다.
  - **등록·수정 창은 모달이 아니라 측면 패널입니다.** 회원 등록, 사이트 등록, 게시판 등록, 일괄 상태 변경 등이 해당합니다.
- **알럿**
  - Type: Danger · Warning · Success · Information
  - Size: Title(제목형) · Slim(한 줄형)
  - 속성: 제목 · 내용 · 닫기
  - 「저장하지 않은 변경」 상자는 Warning, 파란 안내 상자는 Information Slim을 씁니다.

---

## 7. 화면 구성 규칙 (디자인모음 기준)

### 7-1. 기본 틀

- 화면 폭은 1920, 세로는 hug로 둡니다.
- 레이어 구조:
  - 최상위 가로 오토레이아웃 = 사이드 메뉴 인스턴스 + `body`(세로)
  - `body` = 상단 바 → `stack`(여백 32/38, 사이 24) → `footer`(좌우 40) + 맨 위로 버튼(absolute)
- 본문 폭은 1604이고, 바탕은 `background/gray-subtler`입니다.
- 목록 영역은 흰 카드 한 장에 넣습니다. 순서는 `cms/list-toolbar` → 표 stack(여백 26, 사이 12) → 쪽 번호(오른쪽 정렬)입니다.
- 작업 메뉴(`cms/menu`)는 absolute로 띄웁니다. 해당 줄 ⋮ 버튼의 오른쪽 끝에 맞추고, 버튼 아래 4에 둡니다.

### 7-2. 화면 유형

| 유형 | 구성 |
|---|---|
| 목록 | page-header(Default, 오른쪽 주 버튼) → 요약(`누리지음/summary`, 선택) → 목록 카드 |
| 하위 목록 | page-header(Subpage) → 목록 카드(카드형 표 가능) |
| 등록 · 수정(전체 화면) | page-header(Form) → 2단(왼쪽 본문 카드 + 오른쪽 설정 카드 열, 사이 24) |
| 측면 패널 | 목록 화면 + dim + 오른쪽 `cms/panel` |
| 모달 | 화면 + dim + 가운데 `cms/modal` |
| 빈 상태 | 목록 카드 안 `cms/empty-img` |

### 7-3. 파생 컴포넌트 (디자인모음 › 00 디자인모음 컴포넌트)

공통 컴포넌트만으로 조립한, 누리지음 화면 전용 반복 요소입니다.

| 컴포넌트 | 내용 |
|---|---|
| `누리지음/side-nav` | 누리지음 CMS 메뉴(사이트 관리 · 운영관리) |
| `누리지음/side-nav-sedis` | SEDIS(특수교육 실태조사 데이터 활용 플랫폼) 메뉴 전체 · 기관로고 |
| `누리지음/summary` · `summary-card` | 요약 카드 4개 묶음(사이 24) · 카드(항목 16 + 값 24 Bold + graphic 60, 모서리 12, shadow1, 여백 24/40) |
| `누리지음/depth-badge` | 메뉴 단계 번호 1~4 |
| `누리지음/menu-tree-row` | 메뉴관리 표 한 줄. 들여쓰기는 2단계 24 · 3단계 48, 경로 보조 줄 없음 |
| `누리지음/menu-edit-header` | 메뉴·게시판 수정 머리(단계 · 제목 · 유형/노출 배지 · 누리집에서 보기 · 이전/다음 · 탭 최대 4) |
| `누리지음/manager-select` | 담당자 선택(선택 전 · 선택됨) |
| `누리지음/editor-toolbar` | 글쓰기 편집 도구 막대 |
| `누리지음/status-card` · `deadline-card` | 민원 처리 상태 · 처리 기한 카드 |
| `누리지음/permission-item` | 관리자 권한 한 줄(아이콘 · 이름 · 코드 · 설명 · 배지 · 빼기) |
| `누리지음/inherit-bar` | 상위 메뉴 설정 따르기 막대 |
| `누리지음/summary-row` | 요약 한 줄(Default · Link) |
| `누리지음/access-row` | 접근권한 표 한 줄(Head · Body × Default · Changed, 열 2~5 켜기) |
| `누리지음/picker-item` | 목록 창 항목(Group · Action · Person × Default · Hover · Disabled) |

### 7-4. 디자인모음 섹션

| 섹션 | 화면 |
|---|---|
| 01 대시보드 | 누리지음 대시보드 |
| 02 메뉴 | 메뉴 리스트 · 등록 · 수정 · 일괄 등록 · 담당자 검색(모달) · 메뉴 라우트 리스트 · 등록 · 수정 |
| 03 콘텐츠 | 리스트 · 등록 · 수정 |
| 04 게시판 | 게시판 리스트 · 등록 · 수정 · 게시글 리스트 · 등록 · 수정 · 상세 |
| 05 팝업존 | 리스트 · 등록 · 수정 |
| 06 미디어 | 리스트 · 그리드 · 등록 · 수정 |
| 07 통합회원 | 리스트 · 회원 등록 · 정보 · 수정 |
| 08 부서 및 조직 | 조직도 목록 · 직원 추가 · 정보 · 수정 · 조직 변경 |
| 09 사이트 | 사이트 리스트 · 등록 · 수정 · 도메인 관리 리스트 · 등록 · 수정 |
| 10 공통코드 | 코드 그룹 리스트 · 등록 · 수정 · 코드 관리 리스트 · 등록 · 수정 |
| 11 권한 | 역할 관리 · 역할 추가/수정/배정 · 권한 관리 · 권한 부여 · 서브관리자 계정 · 관리자 등록 · 접속 IP 관리 · 허용 IP 추가 · 권한 그룹 명단 |
| 12 감사 로그 | 전체 감사 로그 · 개인정보 열람 로그 |
| 13 운영 진단 | 운영 진단 리스트 |
| 14 확장 서비스 | 리스트 · 빈 상태 |
| 15 공통 · 패널 | 패널 양식 |
| 16 통계표 통합·시각화 (디자인확정) | SEDIS 확정 목록 · 전체 미완료 |

---

## 8. 작업 규칙

1. **원본 보존.** 원본 페이지 프레임은 고치지 않습니다. 디자인 수정안은 기존 프레임을 백업(그대로 유지)하고 새 프레임에 반영합니다.
2. **공통 컴포넌트 우선.** 화면의 모든 요소를 공통 컴포넌트 인스턴스로 연결합니다.
   - 공통 컴포넌트로 안 되는 반복 요소는 파생 컴포넌트(`누리지음/*`)로 만듭니다.
   - 컴포넌트가 없는 요소만 원래 디자인대로 그립니다.
3. **속성 최대 활용.** 바깥에 둔 라벨·제목·설명 글자는 지우고, 컴포넌트의 라벨·제목·설명 속성을 켜서 넣습니다(예: 「위치」 글자 → select 라벨).
4. **피그마 Slot 기능은 쓰지 않습니다.** 안쪽 내용을 바꿔야 하면 속성(글자 · 켜기 · 인스턴스 교체)으로 만듭니다.
5. **이중 프레임을 없앱니다.** 인스턴스나 요소 하나만 감싼 의미 없는 프레임은 걷어냅니다.
6. **이름은 코드 친화적으로 짓습니다.**
   - 구조 프레임은 `stack` · `row` · `body` · `footer` · `table-head` · `table-row` 같은 역할 이름으로 짓습니다.
   - `Frame 1000004922` 같은 자동 이름은 남기지 않습니다.
   - 화면 프레임은 한국어 화면 이름으로 짓습니다.
7. **확정 디자인 우선.** 단위기능의 「통계표 통합 · 시각화」(SEDIS)가 표·틀·쪽 번호의 기준입니다. 그 요소는 디자인스타일에 반영합니다.
8. 서브페이지에는 브레드크럼을 쓰지 않습니다.

---

## 9. 검수 체크리스트

화면을 만들거나 고친 뒤 아래를 확인합니다. 지금 디자인모음 220여 화면의 기준값이며, 예외로 둔 항목은 괄호 안에 적었습니다.

- [ ] 낱개 벡터 아이콘 0개 (버전 이력 점 아이콘 7개는 예외)
- [ ] Medium 굵기 글자 0개
- [ ] 글자 스타일 연결 안 된 글자 0개 (굵기가 섞인 대시보드 숫자 9개는 예외)
- [ ] 변수 연결 안 된 색 0곳
- [ ] 모서리 6 · 10, 소수점 값 0곳
- [ ] 크기·간격·여백 4의 배수
- [ ] 높이 1 · 넘침 프레임 없음, 세로 hug
- [ ] 입력류 진한 테두리 `input/border`
- [ ] 등록·수정 창은 측면 패널
- [ ] 바깥 라벨 없이 컴포넌트 속성 사용
- [ ] Slot · 이중 프레임 · 자동 이름 없음
- [ ] 원본 프레임 그대로 유지
- [ ] 수정 후 스크린샷으로 원본과 비교
