# CHAMPIONS LAB · 챔피언스 랩

포켓몬 챔피언스의 스피드와 데미지를 실시간으로 계산하는 한국어 웹 앱입니다. React 19, TypeScript, Vite로 만들었으며 서버·로그인·API 키 없이 동작합니다. 포켓몬 데이터, 아트워크, 글꼴은 프로젝트에 포함되어 있습니다.

## 실행

Node.js 22.18 이상을 사용하세요. 이 클라우드 환경에서는 Node.js 24와 시스템 Chromium을 사용합니다.

```sh
cd /workspace/pokemonp
npm ci --cache /tmp/champions-npm-cache --no-audit --no-fund
npm run dev -- --port 5173
```

각 클라우드 작업은 이미 격리되어 있습니다. 기존 체크아웃을 사용하고 별도 Git worktree를 생성하지 마세요.

## 기능

- 한국어·영문·초성 검색과 타입 필터. Reg M-C 382개 폼, Reg M-B 347개 폼.
- 폼별 종족값, 한국어 포켓몬·기술·특성·도구 이름과 342개 아트워크 파일.
- 챔피언스 능력 포인트: 능력당 0–32, 총 66. 숫자 입력과 슬라이더, 공격형·내구형 배분.
- 최속·구애스카프 원클릭 토글. 메가 폼은 전용 메가스톤으로 고정.
- 성격 25종, 능력 랭크, 상태 이상, 현재 HP, 순풍, 날씨, 필드, 트릭룸.
- 스피드 비교, 현재 성격·도구 기준 추월에 필요한 최소 투자량, 최속 스피드 티어 검색.
- 배울 수 있는 공격 기술만 선택. 위력·타입 변경은 챔피언스 전용 데이터 반영.
- 급소, 물리·특수, 싱글·더블, 광역기 대상 수, 리플렉터·빛의장막·도우미.
- 16개 난수, 최소·최대 데미지, 확정·난수 타수, 1–4타 KO 확률. 연속기의 타격 난수도 독립 합성.
- 멀티스케일·섀도실드는 첫 공격 후 해제된 조건으로 반복 타수 계산. HP 의존 기술은 남은 HP 상태별 재계산.
- 매치업 브라우저 저장·복원·삭제와 모바일 대응. 키보드로 검색·모달 닫기·티어 선택 가능.

## 검증

```sh
npm test          # 능력치·계산·데이터 무결성 단위 테스트
npm run test:e2e  # Chromium 실제 브라우저 기능 테스트
npm run build    # TypeScript 검사 및 프로덕션 빌드
npm run preview  # 빌드 결과 실행
```

브라우저 테스트는 시스템 `/usr/bin/chromium`이 있으면 사용합니다. 다른 컴퓨터에서는 `npx playwright install chromium`으로 브라우저를 설치하세요.

## 규칙과 출처

자료 확인일: **2026-10-13**. 기본 규칙은 Pokémon Showdown의 `[Gen 9 Champions] VGC 2026 Reg M-C` 및 BSS Flat Rules입니다. `isNonstandard` 종, 환상·제한 전설, 사용 불가능한 기본 종에 종속된 배틀 폼을 제외하고, 폼별 기술·위력·종족값을 가져왔습니다. 레벨 50, 개체값 31 기준이며 테라스탈·다이맥스는 제공하지 않습니다.

**공식 사이트는 현재 실행 환경의 네트워크 정책에서 403으로 차단되어 공식 시즌 공지를 직접 대조하지 못했습니다.** 공식 공지로 검증됐다는 주장은 하지 않습니다. 이 앱은 현재 커뮤니티 데이터 스냅샷이며, 대회에 사용하기 전 공식 공지를 확인해야 합니다. 화면의 ‘커뮤니티 기준’ 및 ‘데이터 출처 및 계산 기준’에 출처와 제한을 명시했습니다.

- 종족값·사용 가능 목록·기술·위력·규칙: [Pokémon Showdown Champions](https://github.com/smogon/pokemon-showdown/tree/3a766f2cfb5e51c1e428cfe87d0dba91a8f01640/data/mods/champions)
- 한국어 이름: [PokeAPI CSV](https://github.com/PokeAPI/pokeapi/tree/81d20919845b6a445969b9265aab5cec6b04cece/data/v2/csv)
- 이미지: [PokeAPI sprites](https://github.com/PokeAPI/sprites/tree/0dc105d5b12416932f29b594078282ab4be045f5/sprites/pokemon/other/official-artwork)
- 데미지: [@smogon/calc 0.12.0](https://github.com/smogon/damage-calc) + 챔피언스 능력 포인트/종족값/기술 위력 어댑터
- 글꼴: [Pretendard](https://github.com/orioncactus/pretendard), SIL Open Font License

종족값이 B, 능력 포인트가 P일 때 HP는 B+P+75, 다른 능력치는 `floor((B+P+20) × 성격 보정)`입니다. 데미지 엔진에는 동등한 레벨 50 노력치로 변환해 전달합니다. P=0일 때 EV=0, 그 외에는 EV=8P−4로 계산하며 실제 챔피언스 포인트 제한은 앱이 별도로 적용합니다.

## 계산 범위

KO 확률은 **명중 조건**, 지정한 환경과 능력 랭크를 유지하는 반복 공격 기준입니다. 턴 사이의 회복·반동·상태 피해·기술 사용 후 능력 변화, 기합의띠/기합의머리띠/옹골참/탈/아이스페이스의 생존 효과는 포함하지 않습니다. 해당 조건이 선택되면 결과에 경고를 표시합니다. 연속기 횟수는 선택한 횟수로 고정하며 2–5회 횟수 자체의 발생 확률은 모델링하지 않습니다.

스피드 비교는 기술 우선도, 선공의 발톱 등 행동 순서 효과를 제외합니다. 최소 투자량은 현재 성격·도구·상태·날씨·잔여 포인트 기준입니다. 다른 능력의 배분을 유지하며, 최속 토글만 예외적으로 다른 능력 포인트를 줄여 총 66P를 유지합니다. 토글을 다시 해제하면 이전 배분을 복원합니다.

메타몽은 변신 전 능력치를 보여주며 변신 후 능력 복사는 아직 지원하지 않습니다. 전용 폼 아트워크가 없는 55개 폼은 기본 폼 이미지를 사용합니다. 신규 이름은 한국어 번역이 없으면 영어로 표시합니다. 데이터 자동 실시간 갱신이나 공식 시즌 API 연동은 없습니다.

## 데이터 스냅샷 재생성

일반 실행·빌드에는 다운로드가 필요하지 않습니다. 포함된 스냅샷을 재생성하려면 Python 3 + Pillow, Git이 필요합니다.

```sh
npm run data:refresh
```

이 명령은 `scripts/refresh-data.mjs` 및 `scripts/fetch-assets.py`에 기록된 **고정된 커밋**을 사용합니다. `/tmp/champions-lab-sources`에 출처와 CSV를 캐시하고 `public/data/champions.json`과 `public/pokemon/`을 재생성합니다. GitHub HTTPS 인증, TLS 검증을 유지합니다. 새로운 시즌으로 갱신하려면 원본의 공식 규칙을 대조한 후 소스 커밋·확인일을 업데이트하고 전체 검증을 다시 실행해야 합니다.

Pokémon 및 관련 이미지는 Nintendo / Creatures / GAME FREAK의 자산입니다. 본 프로젝트는 공식 서비스와 관계가 없습니다. 외부 자료의 고지는 `THIRD_PARTY_NOTICES.md`를 확인하세요.
