// ============================================================
// 주차관제 API 연동 모듈
// 주차관제 업체에서 API 정보를 전달받으면 아래 CONFIG를 업데이트하고
// 각 함수의 TODO 블록 주석을 해제하여 실제 API 호출로 교체하세요.
// ============================================================

export const PARKING_API_CONFIG = {
  baseUrl: 'https://YOUR_PARKING_API_URL',  // TODO: 주차관제 업체 API URL
  apiKey: 'YOUR_API_KEY',                    // TODO: API 인증 키
  endpoints: {
    getVehicleLog:  '/vehicle/log',          // 차량 입출차 기록 단건 조회
    getAllLogs:      '/vehicle/logs',         // 전체 차량 기록 조회
    getCurrentIn:   '/vehicle/current',      // 현재 입차 중인 차량 목록
  }
};

/** API가 실제로 연결되어 있는지 여부 */
export const IS_API_CONNECTED = false; // TODO: API 연동 완료 후 true 로 변경

/**
 * 특정 차량의 입출차 기록을 조회합니다.
 *
 * @param {string} carPlate  차량번호 (예: "12가 3456")
 * @param {string} visitDate 방문 예정 날짜 (ISO 문자열, 예: "2026-04-06")
 * @returns {Promise<{ entryTime: Date|null, exitTime: Date|null }>}
 */
export async function fetchVehicleLog(carPlate, visitDate) {
  if (!IS_API_CONNECTED) {
    return { entryTime: null, exitTime: null };
  }

  // TODO: 아래 주석을 해제하여 실제 API 호출로 교체하세요.
  /*
  try {
    const response = await fetch(
      `${PARKING_API_CONFIG.baseUrl}${PARKING_API_CONFIG.endpoints.getVehicleLog}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PARKING_API_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ carPlate, date: visitDate }),
      }
    );

    if (!response.ok) throw new Error(`API 오류: ${response.status}`);

    const data = await response.json();
    return {
      entryTime: data.entryTime ? new Date(data.entryTime) : null,
      exitTime:  data.exitTime  ? new Date(data.exitTime)  : null,
    };
  } catch (err) {
    console.error('[주차관제 API] fetchVehicleLog 실패:', err);
    return { entryTime: null, exitTime: null };
  }
  */

  return { entryTime: null, exitTime: null };
}

/**
 * 방문 신청 목록 전체에 대해 입출차 기록을 일괄 조회합니다.
 * 관리자 페이지의 "새로고침" 버튼에서 호출됩니다.
 *
 * @param {Array<{ id: string, carPlate: string, visitDateTime: string }>} visitList
 * @returns {Promise<Map<string, { entryTime: Date|null, exitTime: Date|null }>>}
 *          key: visitRequest 문서 ID
 */
export async function syncAllParkingLogs(visitList) {
  if (!IS_API_CONNECTED) {
    return new Map();
  }

  // TODO: 업체 API가 일괄 조회를 지원하면 단일 호출로 최적화하세요.
  /*
  const results = new Map();
  await Promise.all(
    visitList
      .filter(v => v.carPlate)
      .map(async (v) => {
        const log = await fetchVehicleLog(v.carPlate, v.visitDateTime?.split('T')[0]);
        results.set(v.id, log);
      })
  );
  return results;
  */

  return new Map();
}

/**
 * 현재 주차장에 입차 중인 차량 목록을 조회합니다.
 *
 * @returns {Promise<Array<{ carPlate: string, entryTime: Date }>>}
 */
export async function fetchCurrentParkedVehicles() {
  if (!IS_API_CONNECTED) {
    return [];
  }

  // TODO: 아래 주석을 해제하여 실제 API 호출로 교체하세요.
  /*
  try {
    const response = await fetch(
      `${PARKING_API_CONFIG.baseUrl}${PARKING_API_CONFIG.endpoints.getCurrentIn}`,
      {
        headers: { 'Authorization': `Bearer ${PARKING_API_CONFIG.apiKey}` },
      }
    );
    if (!response.ok) throw new Error(`API 오류: ${response.status}`);
    const data = await response.json();
    return data.vehicles.map(v => ({
      carPlate:  v.carPlate,
      entryTime: new Date(v.entryTime),
    }));
  } catch (err) {
    console.error('[주차관제 API] fetchCurrentParkedVehicles 실패:', err);
    return [];
  }
  */

  return [];
}
