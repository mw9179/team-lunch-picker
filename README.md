# 오늘 점심 뭐 먹지? — 팀 공동 웹앱

기본 식당 **23곳**, 카테고리 **15개**. 실시간 식당 목록, 1일 1인 1표(한국시간), **직원 선정 식당 룰렛 / 오늘 신규 등록 식당 룰렛**, 카테고리 추가(새 식당 등록 시), 삭제, 모바일 홈 화면 설치를 지원합니다.

## 1. Supabase 데이터베이스 만들기
1. https://supabase.com/dashboard 에 가입/로그인 → **New project** → 무료 프로젝트 생성.
2. 왼쪽 **Authentication → Sign In / Providers → Anonymous Sign-Ins** 를 **Enable** (익명 로그인이므로 별도 회원가입 없이 참여).
3. 왼쪽 **SQL Editor** → New query → `schema.sql` 파일의 내용 전체를 붙여넣고 **Run**. 이미 한번 실행했다면 정책 중복 오류가 날 수 있으니 재실행 전 확인하세요.
4. **Project Settings → API Keys**(또는 API)에서 `Project URL`, `Publishable key`를 복사. 구형 프로젝트에서 `anon public` 키도 동작합니다.
5. `config.js` 파일의 `SUPABASE_URL` 및 `SUPABASE_PUBLISHABLE_KEY` 값을 두 값으로 교체 후 저장. **service_role/secret key는 절대 입력 금지**.

## 2. 무료 웹사이트로 게시하기
1. https://app.netlify.com 에 가입 → **Add new project → Deploy manually** (화면 이름은 달라질 수 있음).
2. `index.html`, `app.js`, `style.css`, `config.js`, `schema.sql`, `manifest.webmanifest`, `icon.svg`가 들어 있는 **lunch-team-app 폴더 전체**를 끌어다 놓습니다. 다운로드가 ZIP이라면 먼저 압축을 풉니다.
3. 발급된 `https://...netlify.app` 주소를 카카오톡에 공유. 이후 수정 시 같은 사이트의 Deploys에서 다시 업로드.

웹 호스팅에 올려야 공유 및 PWA 설치가 정상 작동합니다. 단순 HTML 파일을 아이폰 '파일' 앱에서 열면 외부 모듈 및 인증 때문에 실행되지 않을 수 있습니다.

## 3. 휴대폰 홈 화면에 앱 추가
- 아이폰: Safari에서 게시 주소 열기 → 공유 → **홈 화면에 추가**.
- 갤럭시: Chrome에서 주소 열기 → 메뉴(⋮) → **홈 화면에 추가 / 앱 설치**.

## 꼭 알아두세요
- **첫 배포 전** 두 서비스의 계정 생성과 1회 설정은 필요합니다. 이 패키지는 사전 제작된 코드이며 아직 온라인 배포된 것은 아닙니다.
- 링크를 가진 누구나 익명으로 식당 추가/삭제/투표/룰렛이 가능합니다. 내부 업무 기밀이나 개인정보는 넣지 마세요. 팀 외부에 공개해선 안 되는 데이터라면 이메일 로그인 + 멤버 권한 모델로 바꿔야 합니다.
- 같은 기기/브라우저에서 익명 로그인 계정이 유지되는 동안 하루 1인 1표입니다. 브라우저 데이터 삭제/다른 브라우저 사용 시 별도 계정으로 중복 투표할 수 있습니다. 엄격한 투표 통제가 필요하면 로그인 방식으로 변경하세요.
- 팀별 여러 방이 아니라 하나의 공유 팀 공간입니다. 별도 팀을 추가하려면 데이터베이스 팀 분리 기능이 필요합니다.
- 무료 요금제 제공 범위 및 비활성 프로젝트 일시정지 정책은 서비스 정책에 따라 변할 수 있습니다.
- Supabase와 웹 호스팅이 정상 연결된 상태에서 수정 사항이 실시간 반영됩니다. 네트워크 중단 시 앱을 다시 열면 새로 동기화합니다.
- `supabase-js`를 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 4. NEW — 학동역 2km 네이버 식당 검색

식당 관리 탭 → **학동역 2km 식당 찾기**에서 한식·중식·일식·양식·분식·베트남식·기타를 고르고 검색합니다. 결과는 학동역 5번 출구 인근 좌표(37.5135731, 127.0301492)로부터 **직선거리 2,000m** 안에 있는 검색 결과만 보여줍니다. 실제 도보 거리는 더 길 수 있습니다.

- **중요 — API 방식 변경(2026):** 신규 검색 API 신청은 기존 네이버 개발자센터가 아니라 **NAVER CLOUD PLATFORM → NAVER API HUB → Search API(지역)** 를 이용합니다. API HUB에서 발급한 Client ID/Secret이 필요하며, 다른 네이버 지도 SDK 키와 호환되지 않습니다.
- Netlify 사이트 → **Project configuration / Environment variables**에 아래 변수를 **사이트 빌드 및 Functions 런타임에서 사용 가능하도록** 등록하고 재배포합니다.
  - `NAVER_CLIENT_ID` : NAVER API HUB의 Client ID
  - `NAVER_CLIENT_SECRET` : NAVER API HUB의 Client Secret
- 이 키들은 `config.js`, HTML, GitHub 공개 저장소에 넣지 마세요. 브라우저 → Netlify Function (`/api/naver-restaurants`) → 네이버 API HUB 순으로 요청합니다.
- Netlify **Functions가 포함된 폴더를 배포**해야 합니다. `netlify.toml`과 `netlify/functions/naver-restaurants.mjs`를 빠뜨리지 마세요. Netlify 웹 콘솔의 단순 폴더 드래그 업로드 환경에서는 Functions 빌드가 지원되지 않거나 기대와 다르게 동작할 수 있습니다. **권장: GitHub 저장소를 Netlify `Import from Git`로 연결해 배포**하세요. 저장소에는 API 비밀키를 올리지 않습니다.
- 네이버 지역 검색은 **검색어당 최대 5개 결과**만 반환하며 모든 식당을 나열하는 API는 아닙니다. 여러 지역·음식 키워드를 조회하므로 최대 28회 요청을 보낼 수 있습니다. 무료 사용량 및 과금 설정은 NAVER API HUB에서 확인하세요.
- 결과 목록은 해당 검색 화면에서만 일시적으로 보관하며 주소·거리·출처 링크를 보여줍니다. 기존 팀 목록과 이름이 같은 식당은 비활성화하고, 등록 과정에서도 Supabase `restaurants.name` UNIQUE 제약 및 `upsert(..., {onConflict:'name',ignoreDuplicates:true})`로 중복을 막습니다. **표기법이 다른 동일 식당**은 완전히 판별할 수 없으니 등록 전 검토하세요.
- **네이버 이용약관 유의:** 검색 API 결과 및 그 가공·파생 데이터의 복사·저장·재사용은 원칙적으로 금지되며, 서비스 장애 대비 등의 제한적 임시 캐시 예외만 있습니다. 팀 식당 DB에 이름을 장기간 저장하는 데 이 API 데이터를 사용할 권한이 있는지 먼저 확인해야 합니다. 해당 허용 범위를 확보하지 못했다면 결과를 참고·검토하는 용도로만 사용하고, 직접 확보한 식당명은 기존 **새 식당 추가**에 별도로 입력하세요. 앱의 동의 체크는 **권한을 부여하지 않습니다**.
- 검색 결과 상세 조회는 결과별 네이버 원본 링크를 이용합니다. 좌표는 2023년 변경된 WGS84 형식(1e7 스케일) 기준입니다. 좌표 누락/범위 밖 결과는 제외합니다.
- 팀원에게 검색 기능까지 제공하려면 Netlify Functions 서비스가 사용 가능해야 하며, Supabase SQL은 기존 `schema.sql`에서 추가 변경할 필요가 없습니다.

참고 공식 문서:
- https://api.ncloud-docs.com/docs/naver-api-hub-search-local
- https://docs.netlify.com/build/functions/configuration/
- https://developers.naver.com/products/intro/terms/terms.md

## 5. 두 가지 룰렛 모드

앱 첫 화면의 버튼으로 룰렛 대상을 전환합니다.

1. **👥 직원들이 고른 식당**: 공유 Supabase `restaurants` 전체(처음 23곳 포함)에서 랜덤 선택. `뽑기 방식`을 전체·카테고리별·오늘 득표 식당으로 조절할 수 있습니다.
2. **📍 오늘 새로 추가한 식당**: 한국 시간 기준 **오늘 `restaurants.created_at`이 생성된** 식당만 대상으로 선택. 「식당 관리 → 학동역 2km 새 식당 찾기 → 검색 → 선택 → 일괄 추가」 후 이 모드로 돌립니다. 식당을 직접 등록한 경우도 오늘 등록했다면 포함됩니다. **네이버 검색 결과만 단독으로 뽑는 기능은 아닙니다**.

룰렛 결과는 두 모드 모두 Supabase `draws`에 기록되어 팀원에게 실시간 공유됩니다. `created_at` 필드는 원본 `schema.sql`에 포함되어 있으므로 기존 DB를 사용하더라도 스키마 추가는 필요 없습니다.
