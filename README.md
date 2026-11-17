# Moon Tools for Notion

블로그와 별개로 실행하는 다이어그램·회로·Pulse 작업 공간입니다. 블로그 DB, 로그인, 게시물, Sites 설정, 환경변수는 포함하지 않습니다.

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

1. `/`에서 도구를 선택해 프로젝트를 만들고 편집기에서 저장합니다.
2. 목록의 **embed 링크**를 복사합니다. 링크 내용은 현재 프로젝트의 고정 스냅샷입니다.
3. 노션 `/embed`에 링크를 붙여 넣습니다.
4. `/embed/`에서는 도형·회로를 내용에 맞춰 보여줍니다. 회로는 임시 시뮬레이션도 가능합니다. Pulse는 소스 미리보기를 제공합니다.
5. **편집기로 열기**는 새 탭에서 사본을 엽니다. 원본 링크는 바뀌지 않습니다. 수정된 내용을 노션에 반영하려면 새 링크로 교체합니다.

## 저장과 보안: 반드시 구분할 것

- 프로젝트는 이 앱의 origin에 속한 브라우저 localStorage에 저장됩니다. 계정 기반 클라우드 저장이 아닙니다. 브라우저 데이터 삭제, 시크릿 창 종료, 도메인 변경에 대비해 JSON을 내보내세요.
- JSON 가져오기는 새 ID를 부여하여 기존 프로젝트를 덮어쓰지 않습니다.
- embed 데이터는 URL fragment에 들어가며 암호화되지 않습니다. **링크를 아는 사람은 내용을 읽고 복사할 수 있습니다.** 비밀키나 민감한 소스를 넣지 마세요. Notion 페이지 접근 권한과 별개입니다.
- 노션에는 링크가 저장됩니다. embed는 localStorage나 로그인을 요구하지 않습니다.
- 링크는 24,000자로 제한합니다. 큰 프로젝트는 JSON으로 이동하세요. 짧은 공유 링크와 대형 프로젝트는 후속 DB 연동이 필요합니다.
- 이미 공유된 스냅샷은 회수할 수 없습니다. 삭제는 현재 브라우저 사본만 제거합니다.

## 현재 도구 범위

- 블록 다이어그램: 도형, 크기 조절, 배선, 텍스트/속성 편집, 가져오기/내보내기.
- 회로: 기존 스키메틱 편집기와 브라우저 계산 Worker를 재사용합니다. 지원 범위는 RLC/DC 중심이며 범용 SPICE 호환을 보장하지 않습니다.
- Pulse: Verilog/SystemVerilog 편집, 언어별 자동완성, 파일 트리, VCD 파형 보기. **Verilog 시뮬레이션 컴파일러는 연결되지 않았습니다.** 회로 계산기와 별개입니다.

## 구조

- `app/`: 독립 작업 공간과 embed 경로
- `components/Workspace.tsx`: 프로젝트 목록과 도구 연결
- `components/diagram`, `schematic`, `verilog`: 복사해서 독립 관리하는 편집기
- `lib/projects.ts`: JSON 검증, 저장 이름, 스냅샷 포맷
- `lib/circuit`, `lib/verilog`: 계산 및 언어/파형 처리
- `scripts/`: Monaco와 Web Worker 빌드
- `tests/`: 재사용한 계산/언어 테스트 및 스냅샷 검증

블로그 폴더를 import하거나 symlink하지 않습니다. 출처: My-Blog commit `c8125e78c675bc06d77f29a170ce37a23db6343d`. 기존 Pulse 코드의 출처와 라이선스는 `lib/verilog/SOURCE.md`, `lib/verilog/LICENSE`를 유지했습니다.

## 다음 단계: 같은 링크에서 계속 갱신하기

별도 Supabase 프로젝트 또는 별도 서버 DB에 `projects(id, owner_id, kind, data, revision)`와 `shares(token_hash, project_id, revision, revoked_at)`를 둡니다. 작성자 인증과 소유자만 허용하는 RLS가 필요합니다. 공개 embed는 토큰을 검증하는 서버 API에서 허용된 프로젝트만 읽고, 저장 API와 분리합니다. 서비스 키는 서버에만 둡니다. 고정 버전/최신 버전, 공유 철회, 충돌 검사와 백업을 지원해야 합니다. 기존 블로그 DB에는 아직 연결하지 않았습니다.

이 준비본은 배포 가능한 로컬 저장·스냅샷 버전이며, 계정/클라우드 저장/자동 동기화 완성본은 아닙니다.
