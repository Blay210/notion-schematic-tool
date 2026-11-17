# Moon Schematic for Notion

블로그와 별개로 실행하는 회로도 작성 도구입니다. 로그인, 서버 저장소, 프로젝트 목록 없이 **편집 가능한 PNG**를 만들고 다시 엽니다.

## 사용

1. `/`에 접속하면 빈 회로 편집기가 열립니다.
2. 소자를 배치하고 배선한 뒤 **PNG 내보내기**를 누릅니다.
3. 다운로드한 PNG 파일을 Notion에 이미지로 넣습니다.
4. 수정할 때는 그 원본 PNG를 편집기로 끌어다 놓거나 **PNG 열기**로 선택합니다.
5. 수정한 PNG를 다시 내보내 Notion 이미지를 교체합니다. 자동 동기화는 없습니다.

PNG에는 회로 그림과 압축한 편집 원본(이름·소자·배선·텍스트 위치)이 함께 들어갑니다. 격자나 선택 표시는 내보내지 않습니다. 회로 범위에 맞춰 잘라내고 기본 2배 해상도, 최대 한 변 4096픽셀로 출력합니다.

**원본 PNG를 보관하세요.** 스크린샷·클립보드 이미지 복사·이미지 최적화는 편집 데이터를 제거할 수 있습니다. Notion의 업로드/원본 다운로드에서 메타데이터가 유지되는지는 아직 검증하지 않았습니다. 일반 PNG에 없는 회로를 이미지 인식으로 복구하는 기능은 아닙니다.

## 데이터와 호환성

- 새 회로는 메모리에서만 편집하며 서버나 localStorage에 저장하지 않습니다. PNG를 내보내지 않고 페이지를 종료하면 변경 내용을 잃습니다.
- PNG의 `zTXt` 청크 `MoonSchematic`에 버전이 있는 JSON을 zlib으로 압축하여 기록합니다. 원본을 암호화하지 않으므로 PNG를 공유하면 편집 데이터도 공유됩니다.
- PNG 입력은 20MiB, 압축 해제된 원본은 1MiB까지 허용합니다. PNG 청크 CRC와 회로 스키마를 검사합니다.
- 이전 `/embed/#...` 링크는 읽기 호환성을 유지합니다. 새 임베드 링크는 생성하지 않습니다.
- 이전 버전이 저장한 브라우저 프로젝트 데이터는 자동 삭제하지 않습니다. 새 화면에서는 프로젝트 목록을 제공하지 않습니다.

## 기능 범위

- Source / Analog / Digital 검색 및 기호 목록.
- RLC, GND, VDC/IDC, VSIN/VPULSE, 스위치, 다이오드, NPN/PNP, NMOS/PMOS, OPAMP, Comparator, 논리 게이트.
- 배선은 처음 8 화면 픽셀 이상 움직인 가로/세로 방향을 유지합니다. 빈 공간 클릭으로 경로를 확정하면 다음 구간은 새 방향을 선택합니다. 미리보기와 저장 경로가 동일하며 소자/배선 장애물 자동 회피는 하지 않습니다.
- 20 단위 그리드 배치·배선, 90도 회전, 자유로운 이름/값 위치 이동, 속성 편집, 실행 취소.
- 회로도 작성 전용이며 시뮬레이션은 포함하지 않습니다.

## 실행 및 배포

Node.js 22.18 이상:

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

Vercel Framework는 Next.js, Build Command는 `npm run build`, Output Directory는 `vercel.json`의 `.next`입니다. 대시보드 수동 Override는 끕니다. 정적 출력은 `out/`에 생성되지만 Vercel Next.js 어댑터가 처리합니다. 환경변수나 DB 설정은 필요하지 않습니다.

## 구조

- `components/schematic/`: 편집기, 소자 기호, 회로 렌더링
- `lib/schematic.ts`: 회로 데이터, 배선, 좌표 검증
- `lib/schematic-png.ts`: 압축 원본의 PNG 삽입·복원
- `lib/export-schematic-png.ts`: 화면과 무관한 회로 이미지 출력
- `lib/projects.ts`: 이전 링크의 읽기 호환성
- `tests/`: PNG 왕복·손상 검사, 소자·배선·이전 데이터 호환 테스트

블로그 폴더를 import하거나 symlink하지 않습니다. 출처: My-Blog commit `c8125e78c675bc06d77f29a170ce37a23db6343d`. 이전 도구 원본과 Pulse 라이선스(`lib/verilog/SOURCE.md`, `lib/verilog/LICENSE`)는 보존합니다.
