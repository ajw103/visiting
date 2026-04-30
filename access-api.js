// ============================================================
// 에스원 출입 시스템 연동 모듈 (스피드게이트 QR 카드 등록/삭제)
//
// 에스원 담당자에게 아래 항목을 요청하세요:
//   1. API 엔드포인트 경로 (예: /api/card/register)
//   2. 인증 방식 및 계정 정보 (API Key 또는 ID/PW)
//   3. 요청 데이터 필드명 (카드번호, 만료일, 방문객명 등)
//   4. 응답 데이터 구조
//
// 정보를 받으면 아래 CONFIG와 TODO 항목만 채우면 됩니다.
// ============================================================

const ACCESS_API_CONFIG = {
  // 에스원 출입 시스템 주소 (사내 내부망)
  baseUrl: 'http://172.27.250.199:2450',

  // TODO: 에스원 담당자에게 받은 인증 정보 입력
  apiKey: 'YOUR_API_KEY',       // API Key 방식일 경우
  username: 'YOUR_USERNAME',    // ID/PW 방식일 경우
  password: 'YOUR_PASSWORD',

  // TODO: 에스원 담당자에게 받은 실제 경로로 교체
  endpoints: {
    registerCard: '/api/card/register',  // 카드(QR) 등록
    revokeCard:   '/api/card/revoke',    // 카드(QR) 삭제/비활성화
  },
};

/**
 * 에스원 API가 실제로 연결되어 있는지 여부
 * 에스원 API 연동 완료 후 true 로 변경하세요.
 */
export const IS_ACCESS_API_CONNECTED = false;

/**
 * 방문객 QR 카드를 에스원 출입 시스템에 등록합니다.
 * 관리자가 방문 신청을 승인할 때 자동 호출됩니다.
 *
 * 에스원에 전달하는 데이터:
 *   - cardNumber : 13자리 QR 코드 숫자
 *   - visitorName: 방문객 성명
 *   - company    : 방문객 소속 회사
 *   - validFrom  : 유효 시작일시 (승인 시각)
 *   - validUntil : 유효 만료일시 (방문 당일 자정)
 *   - visitDate  : 방문 예정 날짜
 *
 * @param {object} visit - Firestore visitRequests 문서 데이터
 * @returns {Promise<boolean>} 등록 성공 여부
 */
export async function registerVisitorCard(visit) {
  if (!IS_ACCESS_API_CONNECTED) return false;

  // 에스원에 전달할 데이터 (에스원 API 스펙에 맞게 필드명 수정 필요)
  const payload = {
    // TODO: 에스원 API 문서의 실제 필드명으로 교체하세요
    cardNumber:  visit.qrCode,
    visitorName: visit.visitorName,
    company:     visit.company     || '',
    validFrom:   new Date().toISOString(),
    validUntil:  visit.qrExpiresAt || null,
    visitDate:   visit.visitDate,
  };

  try {
    const response = await fetch(
      `${ACCESS_API_CONFIG.baseUrl}${ACCESS_API_CONFIG.endpoints.registerCard}`,
      {
        method: 'POST',
        headers: {
          // TODO: 에스원 인증 방식에 맞게 헤더 수정
          'Authorization': `Bearer ${ACCESS_API_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) throw new Error(`에스원 API 오류: ${response.status}`);
    console.log(`[에스원] QR 카드 등록 완료: ${visit.qrCode} (${visit.visitorName})`);
    return true;
  } catch (err) {
    console.error('[에스원] QR 카드 등록 실패:', err);
    return false;
  }
}

/**
 * 방문객 QR 카드를 에스원 출입 시스템에서 삭제(비활성화)합니다.
 * 관리자가 방문 승인을 취소할 때 자동 호출됩니다.
 *
 * @param {string} qrCode - 삭제할 13자리 QR 코드 숫자
 * @returns {Promise<boolean>} 삭제 성공 여부
 */
export async function revokeVisitorCard(qrCode) {
  if (!IS_ACCESS_API_CONNECTED) return false;

  // TODO: 에스원 API 문서의 실제 필드명으로 교체하세요
  const payload = {
    cardNumber: qrCode,
  };

  try {
    const response = await fetch(
      `${ACCESS_API_CONFIG.baseUrl}${ACCESS_API_CONFIG.endpoints.revokeCard}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_API_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) throw new Error(`에스원 API 오류: ${response.status}`);
    console.log(`[에스원] QR 카드 삭제 완료: ${qrCode}`);
    return true;
  } catch (err) {
    console.error('[에스원] QR 카드 삭제 실패:', err);
    return false;
  }
}
