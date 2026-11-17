# Moon Tools for Notion

블로그와 별개로 실행하는 Notion용 회로 스케메틱 작업 공간입니다. 블로그 DB, 로그인, 게시물, Sites 설정, 환경변수는 포함하지 않습니다.

## 실행 / Vercel 배포

Node.js 22.18 이상을 사용합니다.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

별도 Git 저장소로 올린 다음 Vercel에서 그 저장소를 Import 하세요. Framework는 Next.js, Build Command는 `npm run build`, Output Directory는 `vercel.json`에서 `.next`로 명시합니다. Vercel 대시보드의 수동 Override는 꺼두세요. 로컬 정적 내보내기 결과는 `out/`에 생성되지만, Vercel의 Next.js 어댑터가 이를 처리하므로 Output Directory에 `out`을 직접 지정하지 않습니다. 환경변수 없이 실행됩니다. `vercel.json`에 Notion iframe 허용 정책이 있습니다. 배포 후 실제 Notion 웹/앱에서 embed 호환성을 확인해야 합니다. Notion의 URL 길이 제한 및 도메인 정책에 따라 긴 링크는 거절될 수 있습니다.

## 사용

1. `/`에 들어가면 빈 회로 편집기가 바로 열립니다. **프로젝트 저장**으로 브라우저에 저장합니다.
2. 편집기의 **embed 링크**를 복사하여 노션 `/embed`에 붙여 넣습니다. 링크는 현재 상태의 고정 스냅샷입니다.
3. embed는 제목이나 도구 모음 없이 회로 전체를 프레임 크기에 맞춥니다. 프레임 자체에는 스크롤바가 없습니다.
4. embed에 마우스를 올리거나 키보드로 포커스하면 오른쪽 위 연필 아이콘이 나타납니다. 새 탭에서 사본을 편집합니다. 수정 후 새 링크로 교체해야 노션에 반영됩니다.
5. **프로젝트**에서 저장한 회로를 열거나 JSON으로 내보내고 가져올 수 있습니다.

## 저장과 보안: 반드시 구분할 것

- 프로젝트는 이 앱의 origin에 속한 브라우저 localStorage에 저장됩니다. 계정 기반 클라우드 저장이 아닙니다. 브라우저 데이터 삭제, 시크릿 창 종료, 도메인 변경에 대비해 JSON을 내보내세요.
- JSON 가져오기는 새 ID를 부여하여 기존 프로젝트를 덮어쓰지 않습니다.
- embed 데이터는 URL fragment에 들어가며 암호화되지 않습니다. **링크를 아는 사람은 내용을 읽고 복사할 수 있습니다.** 비밀키나 민감한 소스를 넣지 마세요. Notion 페이지 접근 권한과 별개입니다.
- 노션에는 링크가 저장됩니다. embed는 localStorage나 로그인을 요구하지 않습니다.
- 링크는 24,000자로 제한합니다. 큰 프로젝트는 JSON으로 이동하세요. 짧은 공유 링크와 대형 프로젝트는 후속 DB 연동이 필요합니다.
- 이미 공유된 스냅샷은 회수할 수 없습니다. 삭제는 현재 브라우저 사본만 제거합니다.

## 현재 도구 범위

- 소자 목록은 검색과 All / Source / Analog / Digital 필터를 제공합니다. 기호를 보고 선택할 수 있습니다.
- RLC, GND, VDC, IDC, VSIN, VPULSE, 스위치, 다이오드, NPN/PNP, NMOS/PMOS, OPAMP(3핀/전원 포함 5핀), Comparator 및 논리 게이트를 배치하고 연결할 수 있습니다.
- 도형과 배선은 20 단위 그리드를 따릅니다. 소자 이름과 값은 별도로 자유롭게 드래그하고, 속성에서 내용을 수정합니다.
- 회로도 작성 전용입니다. 시뮬레이션 UI, 계산 엔진, 계산 Worker는 포함하지 않습니다.
- 이전 다이어그램/Pulse 데이터와 원본 코드·라이선스는 보존하지만 새 작업 화면은 회로만 제공합니다.

## 구조

- `app/`: 독립 작업 공간과 embed 경로
- `components/Workspace.tsx`: 프로젝트 목록과 도구 연결
- `components/diagram`, `schematic`, `verilog`: 복사해서 독립 관리하는 편집기
- `lib/projects.ts`: JSON 검증, 저장 이름, 스냅샷 포맷
- `lib/schematic.ts`: 소자, 핀, 배선 및 회로 데이터 검증
- `scripts/`: 배포에서 사용하지 않는 생성 자산 정리 및 기존 데이터 호환 테스트 지원
- `tests/`: 도형·배선·소자·스냅샷 검증 및 기존 언어 데이터 호환 테스트

블로그 폴더를 import하거나 symlink하지 않습니다. 출처: My-Blog commit `c8125e78c675bc06d77f29a170ce37a23db6343d`. 기존 Pulse 코드의 출처와 라이선스는 `lib/verilog/SOURCE.md`, `lib/verilog/LICENSE`를 유지했습니다.

## 다음 단계: 같은 링크에서 계속 갱신하기

별도 Supabase 프로젝트 또는 별도 서버 DB에 `projects(id, owner_id, kind, data, revision)`와 `shares(token_hash, project_id, revision, revoked_at)`를 둡니다. 작성자 인증과 소유자만 허용하는 RLS가 필요합니다. 공개 embed는 토큰을 검증하는 서버 API에서 허용된 프로젝트만 읽고, 저장 API와 분리합니다. 서비스 키는 서버에만 둡니다. 고정 버전/최신 버전, 공유 철회, 충돌 검사와 백업을 지원해야 합니다. 기존 블로그 DB에는 아직 연결하지 않았습니다.

이 준비본은 배포 가능한 로컬 저장·스냅샷 버전이며, 계정/클라우드 저장/자동 동기화 완성본은 아닙니다.
