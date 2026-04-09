# 넷마블 방문객 + 주차 관리 시스템

## 프로젝트 개요
넷마블(주) 강남 지타워 사무실의 방문객 사전 등록 및 주차 관리 통합 웹 시스템.
방문객이 현장에서 수동 등록하는 불편함을 없애고, 체계적인 출입/주차 관리를 구현한다.

## 기술 스택
- **프론트엔드**: HTML5, CSS3, JavaScript ES6+ (Web Components / Shadow DOM)
- **데이터베이스**: Firebase Firestore
- **알림**: Google Apps Script (이메일 발송)
- **개발 환경**: Google Firebase Studio (IDX)
- **배포**: GitHub Pages (https://github.com/ajw103/visiting)

## 파일 구조
```
visiting-main/
├── index.html          # 통합 허브 (메인 네비게이션)
├── register.html       # 방문 신청 페이지
├── lookup.html         # 신청 내역 조회
├── admin.html          # 관리자 대시보드
├── complete.html       # 신청 완료 페이지
├── main.js             # 방문 신청 폼 (Web Component)
├── admin.js            # 관리자 기능 로직
├── parking-api.js      # 주차관제 API 연동 모듈 (미완성)
├── firebase-config.js  # Firebase 초기화
├── style.css           # 공통 스타일
├── hosts.json          # 임직원 샘플 데이터
└── upload_employees.js # Firestore 임직원 일괄 업로드 스크립트
```

## Firebase 설정
- **Project ID**: `nm-dev-gb-vertexai-ga`
- **Firestore 컬렉션**:
  - `visitRequests` — 방문 신청 데이터
  - `employees` — 임직원 정보 (사번, 직급, 부서, 연락처, 이메일)

## 구현 완료 기능
- 방문 신청 폼 (다중 차량 등록, 임직원 모달 검색, 개인정보 동의)
- 연락처 기반 신청 내역 조회
- 관리자 대시보드 (이중 인증, 역할 기반 권한, 승인/취소, CSV 내보내기)
- 담당자/방문객 이메일 알림 (GAS 연동)
- 완료 페이지 (구글 맵 안내)

## 미완성 기능
- **주차관제 API 연동** (`parking-api.js`) — `IS_API_CONNECTED = false` 상태. 업체 API URL/인증키 필요
- **SMS/카카오톡 알림** — 구조만 준비됨 (`NOTIFICATION_CONFIG.channel = 'email'`)

## 관리자 계정
- 총관리자: ID `admin` / PW `netmarble1!` (전체 조회 가능)
- 일반 담당자: 성명 + 사번으로 로그인 (본인 담당 방문만 조회)

## 개발 규칙
- `visiting-main/` 폴더가 git 루트 (루트 디렉토리 아님)
- 코드 수정 시 자동으로 GitHub master 브랜치에 push됨
- `auto_upload.ps1`은 .gitignore 처리 (GitHub PAT 토큰 보안 문제)
