# 우리 팀 점심 룰렛 — OpenStreetMap 무료 검색 버전

## 이번 변경점
- 기존 **직원들이 고른 식당 룰렛** 유지
- **학동역 2km 신규 식당**을 OpenStreetMap/Overpass에서 검색하여 7개 음식 카테고리 필터, 체크박스 일괄 선택, Supabase 목록 일괄 추가
- 오늘 새로 등록한 식당을 대상으로 하는 두 번째 룰렛 유지
- 식당 등록/삭제, 당일 투표, 룰렛 결과 Supabase Realtime 공유 유지
- 네이버 API 키/결제 필요 없음. 검색은 무료 공용 Overpass 서버 이용. **공용 서버 과부하, 일시적 오류, 데이터 누락 가능**

## 이미 배포한 GitHub 저장소에 반영하기
1. 기존 GitHub 저장소 `mw9179/team-lunch-picker` → `Code` 탭 → `Add file` → `Upload files`.
2. 이 ZIP의 `lunch-team-app` 폴더 **안에 있는 파일**을 업로드. GitHub의 최상위에 `index.html`, `app.js`, `style.css`, `netlify.toml`이 보여야 함.
3. 수정된 `config.js`는 **예시값만 들어 있으므로 그대로 덮어쓰면 안 됩니다.** GitHub에 이미 정상 설정된 `config.js`는 유지하세요. 업로드 목록에서 `config.js`는 반드시 제외하세요.
4. `netlify/functions/osm-restaurants.mjs`를 폴더 구조를 유지하여 추가합니다. GitHub 업로드에서 폴더 드래그를 이용하세요.
5. `netlify.toml`을 새 파일로 교체하고 `app.js`, `index.html`, `README.md`도 교체. `schema.sql`은 기존 DB가 잘 작동한다면 다시 실행할 필요 없고 GitHub 기존 파일 유지 가능.
6. `Commit changes` 클릭 → Netlify `Deploys`에서 자동 재배포가 `Published`가 된 후 웹앱 새로고침(Ctrl+Shift+R).
7. 새 기능 확인: `식당 관리` → `학동역 2km 새 식당 찾기` → 유형 선택 → `무료 주변 식당 검색` → 선택 → `팀 목록에 일괄 추가` → `오늘 새로 추가한 식당` 룰렛.
8. 예전 네이버 키가 Netlify 환경변수에 있으면 `NAVER_CLIENT_ID`와 `NAVER_CLIENT_SECRET`은 더 이상 필요하지 않으므로 제거해도 됩니다.

### 교체할 파일만 정리
- `app.js` (교체)
- `index.html` (교체)
- `netlify.toml` (교체)
- `netlify/functions/osm-restaurants.mjs` (추가)
- `README.md` (선택적 교체)
- 기존 `config.js`, `schema.sql`, `style.css`, `icon.svg`, `manifest.webmanifest`는 변경할 필요 없음.

### 중요
- Netlify Functions에 요청하는 서버리스 방식으로 무료 Overpass API를 호출합니다. 별도 인증키는 필요하지 않습니다.
- 공용 서비스는 상업적 대규모 검색·고빈도 호출에 적합하지 않습니다. 코드에는 서버 함수 10분 캐시, 호출 시간 제한, 정렬/최대 300개 응답 제한을 설정했습니다. 서버 인스턴스별 메모리 캐시라 강력한 공용 캐시는 아닙니다.
- OpenStreetMap의 한국 음식 종류 태그는 누락되거나 부정확할 수 있어 `기타`로 분류된 식당이 많을 수 있습니다. 검색 결과가 없으면 `기타`도 선택해 보세요.
- OSM 결과는 OpenStreetMap 기여자들의 ODbL 라이선스 대상입니다. 앱의 식당 목록을 별도 DB에 저장하고 외부에 공개하는 형태라면 ODbL의 출처 표시 및 파생 데이터 조건을 검토하세요. 앱 화면에서 OSM 출처를 표시합니다.
- 중복 방지는 기존 DB의 식당명 unique 제약과 대소문자·공백 차이를 고려한 클라이언트 비교를 이용합니다. 거의 같은 이름이지만 표기가 다른 식당은 수동 확인이 필요합니다.
- 검색 기준 좌표: 37.5135731, 127.0301492 (학동역 5번 출구 인근), 직선거리 2,000m.
- 현재 버전은 로그인 제한 없이 익명 접근을 허용하며, 주소를 아는 누구나 식당을 추가/삭제할 수 있습니다. 팀 내부에서만 공유하거나 별도 접근 제어를 구현하세요.
- 이 패키지는 정적 문법 검사 대상으로 준비됐으며 실제 배포된 Supabase/Netlify 계정에 대한 연결 테스트는 직접 진행해야 합니다.

## 참고
- https://wiki.openstreetmap.org/wiki/Overpass_API
- https://operations.osmfoundation.org/policies/tiles/
- https://www.openstreetmap.org/copyright
