import { db } from './firebase-config.js';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import {
  IS_API_CONNECTED,
  syncAllParkingLogs,
} from './parking-api.js';

// ──────────────────────────────────────────────
// 알림 설정 (향후 SMS/카카오톡으로 전환 시 이 부분만 수정)
// ──────────────────────────────────────────────
const NOTIFICATION_CONFIG = {
  // 현재 사용 중인 알림 채널: 'email' | 'sms' | 'kakao'
  channel: 'email',
  // Google Apps Script 엔드포인트 (이메일 발송 담당)
  gasUrl: 'https://script.google.com/macros/s/AKfycbxKYYQylpr7JmdVcePhaqMLFpif7CdObpRVtBKimIFQ3Q1XfSFDd3mXhCiXaMMD2l1wXg/exec',
};

// ──────────────────────────────────────────────
// 상태
// ──────────────────────────────────────────────
let allVisits = [];          // Firestore에서 불러온 전체 방문 신청 목록
let filteredVisits = [];     // 검색/필터 적용 후 표시할 목록

// ──────────────────────────────────────────────
// 초기화 및 인증 체크
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const isAuthenticated = sessionStorage.getItem('admin_authenticated') === 'true';
  
  if (isAuthenticated) {
    showDashboard();
  } else {
    showLogin();
  }

  // 로그인 버튼 이벤트
  document.getElementById('adminLoginBtn').addEventListener('click', handleLogin);
  // 엔터 키 로그인 지원
  document.getElementById('adminEmpIdInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  // 로그아웃 버튼 이벤트
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
});

function showLogin() {
  document.body.classList.remove('authenticated');
}

async function showDashboard() {
  const role = sessionStorage.getItem('admin_role') || 'staff';
  document.body.classList.add('authenticated');
  document.body.classList.add(`role-${role}`); // 역할별 클래스 추가 (UI 제어용)

  updateApiStatusBadge();
  await loadVisits();
  bindEvents();

  // API 연결 시에만 30초마다 주차 데이터 자동 갱신
  if (IS_API_CONNECTED) {
    setInterval(() => loadVisits(), 30000);
  }
}

async function handleLogin() {
    const name = document.getElementById('adminNameInput').value.trim();
    const password = document.getElementById('adminEmpIdInput').value.trim();
    const loginBtn = document.getElementById('adminLoginBtn');

    if (!name || !password) {
        alert('성함과 비밀번호(사번)를 모두 입력해 주세요.');
        return;
    }

    // 1. 총관리자 체크
    if (name === 'admin' && password === 'netmarble1!') {
        sessionStorage.setItem('admin_authenticated', 'true');
        sessionStorage.setItem('admin_role', 'super');
        sessionStorage.setItem('admin_name', '총관리자');
        showToast(`총관리자님, 환영합니다.`);
        showDashboard();
        return;
    }

    // 2. 일반 담당자 체크 (사번 대소문자 미구분)
    loginBtn.disabled = true;
    loginBtn.textContent = '인증 중...';

    try {
        // 이름으로 먼저 검색
        const q = query(
            collection(db, 'employees'),
            where('name', '==', name)
        );
        const snap = await getDocs(q);

        let authenticated = false;
        let empData = null;

        snap.forEach(doc => {
            const data = doc.data();
            // 사번 비교 시 양쪽 모두 대문자로 변환하여 대소문자 미구분 처리
            if (data.empId && data.empId.toUpperCase() === password.toUpperCase()) {
                authenticated = true;
                empData = data;
            }
        });

        if (authenticated) {
            sessionStorage.setItem('admin_authenticated', 'true');
            sessionStorage.setItem('admin_role', 'staff');
            sessionStorage.setItem('admin_name', name);
            sessionStorage.setItem('admin_empId', empData.empId);
            showToast(`${name} 담당자님, 환영합니다.`);
            showDashboard();
        } else {
            alert('인증에 실패했습니다. 성함과 사번을 다시 확인해 주세요.');
        }
    } catch (err) {
        console.error('Login Error:', err);
        alert('인증 과정에서 오류가 발생했습니다.');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = '로그인';
    }
}

function handleLogout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        // 모든 세션 정보 삭제
        sessionStorage.clear();
        
        // 입력 필드 초기화
        document.getElementById('adminNameInput').value = '';
        document.getElementById('adminEmpIdInput').value = '';
        
        // 즉시 화면 전환 및 페이지 새로고침
        showLogin();
        window.location.replace(window.location.pathname);
    }
}

function bindEvents() {
  document.getElementById('refreshBtn').addEventListener('click', loadVisits);
  document.getElementById('exportBtn').addEventListener('click', exportCsv);
  document.getElementById('visitTableBody').addEventListener('click', handleConfirmToggle);
  document.getElementById('visitTableBody').addEventListener('click', handleParkingToggle);

  // 임직원 업로드 버튼 (총관리자만 보임)
  const empUploadBtn = document.getElementById('empUploadBtn');
  if (empUploadBtn) empUploadBtn.addEventListener('click', openEmpUploadModal);
  
  // 조회 버튼 및 엔터키 이벤트
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => applyFilter('search'));
  }
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') applyFilter('search');
    });
  }

  // 요약 카드 클릭 이벤트
  const todayCard = document.getElementById('todayCard');
  if (todayCard) todayCard.addEventListener('click', () => applyFilter('today'));
  const monthCard = document.getElementById('monthCard');
  if (monthCard) monthCard.addEventListener('click', () => applyFilter('month'));
}

async function handleConfirmToggle(e) {
  const btn = e.target.closest('.confirm-toggle');
  if (!btn) return;

  const id = btn.dataset.id;
  const current = btn.dataset.confirmed === 'true';

  // 이미 확인된 건을 다시 누를 때(취소 시도)만 컨펌창 표시
  if (current) {
    if (!confirm('방문 예약을 취소하시겠습니까?')) return;
  }

  const next = !current;

  btn.disabled = true;
  try {
    const updateData = { adminConfirmed: next };

    // 승인 시 QR 코드 생성, 취소 시 무효화
    let qrCode = null;
    if (next) {
      qrCode = generateQRCode();
      updateData.qrCode = qrCode;
      updateData.qrIssuedAt = new Date().toISOString();
      updateData.qrStatus = 'active';
    } else {
      updateData.qrStatus = 'revoked';
    }

    await updateDoc(doc(db, 'visitRequests', id), updateData);
    const visit = allVisits.find(v => v.id === id);
    if (visit) {
      visit.adminConfirmed = next;
      if (next) { visit.qrCode = qrCode; visit.qrStatus = 'active'; }
      else { visit.qrStatus = 'revoked'; }
    }
    btn.className = `confirm-toggle ${next ? 'confirmed' : 'unconfirmed'}`;
    btn.dataset.confirmed = String(next);
    btn.textContent = next ? '승인 완료' : '방문 승인하기';

    // 승인 완료 시 회의실 예약 버튼 추가, 취소 시 제거
    const cell = btn.closest('td');
    const existingLink = cell.querySelector('.room-booking-btn');
    if (existingLink) existingLink.remove();
    if (next) {
      const link = document.createElement('a');
      link.href = buildCalendarUrl(visit);
      link.target = '_blank';
      link.className = 'room-booking-btn';
      link.textContent = '회의실 예약 →';
      cell.appendChild(link);
    }

    showToast(next ? '방문 승인 처리했습니다.' : '승인을 취소했습니다.');

    // 승인 처리 시 방문객에게 알림 발송
    if (next === true && visit?.visitorEmail) {
      sendApprovalNotification(visit);
    }
  } catch (err) {
    console.error(err);
    showToast('업데이트 실패. 다시 시도해 주세요.', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ──────────────────────────────────────────────
// 입차 / 주차 등록 (API 미연결 시 수동 처리)
// ──────────────────────────────────────────────
async function handleParkingToggle(e) {
  const entryBtn    = e.target.closest('.parking-entry-btn');
  const registerBtn = e.target.closest('.parking-register-btn');
  if (!entryBtn && !registerBtn) return;

  const btn = entryBtn || registerBtn;
  const id  = btn.dataset.id;
  const now = new Date();
  btn.disabled = true;

  try {
    if (entryBtn) {
      await updateDoc(doc(db, 'visitRequests', id), { entryTime: now, parkingRegisteredAt: now });
      const visit = allVisits.find(v => v.id === id);
      if (visit) { visit.entryTime = now; visit.parkingRegisteredAt = now; }
      showToast('입차 및 주차 등록이 완료되었습니다.');
    } else if (registerBtn) {
      await updateDoc(doc(db, 'visitRequests', id), { parkingRegisteredAt: now });
      const visit = allVisits.find(v => v.id === id);
      if (visit) visit.parkingRegisteredAt = now;
      showToast('주차 등록이 완료되었습니다.');
    }
    renderTable();
  } catch (err) {
    console.error(err);
    showToast('업데이트 실패. 다시 시도해 주세요.', 'error');
    btn.disabled = false;
  }
}

// ──────────────────────────────────────────────
// 회의실 예약 Google Calendar URL 생성
// ──────────────────────────────────────────────
function buildCalendarUrl(v) {
  const title = encodeURIComponent(`[${v.company || ''}] ${v.visitorName || ''} - ${v.visitPurpose || ''}`);
  let datesParam = '';
  if (v.visitDate && v.visitTimeSlot) {
    const dateStr = v.visitDate.replace(/-/g, '');
    const [hour, minute] = v.visitTimeSlot.split(':').map(Number);
    const startH = String(hour).padStart(2, '0');
    const startM = String(minute).padStart(2, '0');
    const endH  = String(hour + 1).padStart(2, '0');
    datesParam = `&dates=${dateStr}T${startH}${startM}00/${dateStr}T${endH}${startM}00`;
  }
  return `https://calendar.google.com/calendar/u/0/r/eventedit?text=${title}${datesParam}&state=%5Bnull%2Cnull%2Cnull%2Cnull%2C%5B13%5D%5D`;
}

// ──────────────────────────────────────────────
// 승인 안내 이메일 HTML 템플릿 생성
// ──────────────────────────────────────────────
function buildApprovalEmailHtml(visit) {
  const v = (s) => s || '-';
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9f6f4;font-family:Arial,'Malgun Gothic','맑은 고딕',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6f4;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(69,47,39,0.10);">

      <!-- 헤더 -->
      <tr>
        <td style="background:#452f27;padding:32px;text-align:center;">
          <div style="color:#ffffff;font-size:28px;font-weight:bold;letter-spacing:-0.5px;">netmarble</div>
          <div style="color:#c5ae9e;font-size:13px;margin-top:6px;letter-spacing:0.06em;">방문객 예약 관리 시스템</div>
        </td>
      </tr>

      <!-- 승인 배지 -->
      <tr>
        <td style="padding:32px 40px 0;text-align:center;">
          <span style="display:inline-block;background:#f0ebe7;color:#452f27;padding:8px 22px;border-radius:20px;font-size:13px;font-weight:bold;">✅ &nbsp;방문 승인 완료</span>
        </td>
      </tr>

      <!-- 인사말 -->
      <tr>
        <td style="padding:24px 40px 0;">
          <h2 style="color:#2d1f1a;font-size:20px;margin:0 0 10px;font-weight:bold;">안녕하세요, ${v(visit.visitorName)}님.</h2>
          <p style="color:#7a6560;font-size:14px;line-height:1.8;margin:0;">
            넷마블 방문 신청이 <strong style="color:#452f27;">승인</strong>되었습니다.<br>
            아래 방문 일정을 확인하시고, 방문 당일 1층 안내데스크에서 입실 수속을 진행해 주세요.
          </p>
          <div style="border-top:1px solid #e8ddd9;margin:24px 0 0;"></div>
        </td>
      </tr>

      <!-- 방문 정보 -->
      <tr>
        <td style="padding:24px 40px 0;">
          <div style="background:#f9f6f4;border-radius:10px;padding:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:9px 0;color:#7a6560;font-size:13px;width:110px;vertical-align:top;">📅&nbsp; 방문 일자</td>
                <td style="padding:9px 0;color:#2d1f1a;font-size:13px;font-weight:bold;">${v(visit.visitDate)}</td>
              </tr>
              <tr>
                <td style="padding:9px 0;color:#7a6560;font-size:13px;border-top:1px solid #e8ddd9;vertical-align:top;">⏰&nbsp; 방문 시간</td>
                <td style="padding:9px 0;color:#2d1f1a;font-size:13px;font-weight:bold;border-top:1px solid #e8ddd9;">${v(visit.visitTimeSlot)}</td>
              </tr>
              <tr>
                <td style="padding:9px 0;color:#7a6560;font-size:13px;border-top:1px solid #e8ddd9;vertical-align:top;">👤&nbsp; 담당자</td>
                <td style="padding:9px 0;color:#2d1f1a;font-size:13px;font-weight:bold;border-top:1px solid #e8ddd9;">${v(visit.hostInfo ?? visit.hostName)}</td>
              </tr>
              <tr>
                <td style="padding:9px 0;color:#7a6560;font-size:13px;border-top:1px solid #e8ddd9;vertical-align:top;">📋&nbsp; 방문 목적</td>
                <td style="padding:9px 0;color:#2d1f1a;font-size:13px;font-weight:bold;border-top:1px solid #e8ddd9;">${v(visit.visitPurpose)}</td>
              </tr>
            </table>
          </div>
        </td>
      </tr>

      <!-- 방문 장소 -->
      <tr>
        <td style="padding:20px 40px 0;">
          <div style="border-left:4px solid #452f27;padding:16px 20px;background:#faf8f7;border-radius:0 10px 10px 0;">
            <div style="color:#452f27;font-size:13px;font-weight:bold;margin-bottom:6px;">📍 &nbsp;방문 장소</div>
            <div style="color:#2d1f1a;font-size:13px;line-height:1.7;">
              서울 구로구 디지털로26길 38<br>지타워 (G-Tower) 넷마블
            </div>
          </div>
        </td>
      </tr>

      <!-- QR 코드 -->
      <tr>
        <td style="padding:24px 40px 0;text-align:center;">
          <div style="background:#f9f6f4;border-radius:12px;padding:24px;display:inline-block;width:100%;box-sizing:border-box;">
            <div style="color:#452f27;font-size:13px;font-weight:bold;margin-bottom:4px;">📱 &nbsp;입장 QR 코드</div>
            <div style="color:#7a6560;font-size:12px;margin-bottom:16px;">1층 스피드게이트 QR 리더기에 태깅해 주세요.</div>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${visit.qrCode}" alt="입장 QR코드" width="180" height="180" style="display:block;margin:0 auto;border-radius:8px;" />
            <div style="margin-top:12px;font-family:monospace;font-size:15px;font-weight:bold;color:#2d1f1a;letter-spacing:2px;">${visit.qrCode}</div>
          </div>
        </td>
      </tr>

      <!-- 안내 문구 -->
      <tr>
        <td style="padding:20px 40px 32px;">
          <p style="color:#7a6560;font-size:13px;line-height:1.7;margin:0;background:#fffdf9;border:1px solid #e8ddd9;border-radius:8px;padding:14px 16px;">
            💡 &nbsp;방문 당일 신분증을 지참해 주시기 바랍니다.<br>
            문의사항은 담당자에게 직접 연락해 주세요.
          </p>
        </td>
      </tr>

      <!-- 구분선 -->
      <tr><td style="border-top:1px solid #f0ebe7;"></td></tr>

      <!-- 푸터 -->
      <tr>
        <td style="padding:20px 40px;text-align:center;">
          <p style="color:#c5ae9e;font-size:11px;margin:0;line-height:1.7;">
            본 메일은 넷마블 방문예약 시스템에서 자동 발송된 메일입니다.<br>
            ©2026 Netmarble Corp. All rights reserved.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ──────────────────────────────────────────────
// QR 코드 생성 (13자리 숫자: 앞 7자리 타임스탬프 + 뒤 6자리 랜덤)
// ──────────────────────────────────────────────
function generateQRCode() {
  const timestamp = String(Math.floor(Date.now() / 1000)).slice(0, 7);
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return timestamp + random;
}

// ──────────────────────────────────────────────
// 방문객 승인 알림 발송
// (향후 SMS/카카오톡 전환 시 NOTIFICATION_CONFIG.channel 값과 이 함수만 수정)
// ──────────────────────────────────────────────
async function sendApprovalNotification(visit) {
  try {
    if (NOTIFICATION_CONFIG.channel === 'email') {
      // 현재 채널: 이메일 (GAS를 통해 발송)
      const payload = {
        type:        'approval',                          // GAS에서 승인 알림으로 구분하는 타입
        to:          visit.visitorEmail,                  // 방문객 이메일
        visitor:     visit.visitorName,                   // 방문객 성명
        company:     visit.company,                       // 방문객 소속
        date:        visit.visitDate,                     // 방문 예정 날짜
        time:        visit.visitTimeSlot,                 // 방문 예정 시간
        purpose:     visit.visitPurpose,                  // 방문 목적
        hostInfo:    visit.hostInfo,                      // 담당자 정보
        subject:     `[넷마블 방문예약] 방문이 승인되었습니다. (${visit.visitDate})`, // 메일 제목
        htmlBody:    buildApprovalEmailHtml(visit),       // HTML 이메일 본문 (GAS에서 사용)
      };
      await fetch(NOTIFICATION_CONFIG.gasUrl, {
        method:    'POST',
        mode:      'no-cors',
        cache:     'no-cache',
        keepalive: true,
        headers:   { 'Content-Type': 'text/plain' },
        body:      JSON.stringify(payload),
      });
      console.log('📬 방문객 승인 알림 발송 완료:', visit.visitorEmail);
    }
    // 향후 SMS 전환 시: else if (NOTIFICATION_CONFIG.channel === 'sms') { ... }
    // 향후 카카오 전환 시: else if (NOTIFICATION_CONFIG.channel === 'kakao') { ... }
  } catch (err) {
    console.error('❌ 방문객 승인 알림 발송 실패:', err);
  }
}

// ──────────────────────────────────────────────
// API 연결 상태 표시
// ──────────────────────────────────────────────
function updateApiStatusBadge() {
  const badge = document.getElementById('apiStatus');
  if (IS_API_CONNECTED) {
    badge.textContent = '주차관제 API 연결됨';
    badge.classList.add('connected');
  } else {
    badge.textContent = '주차관제 API 미연결';
    badge.classList.add('disconnected');
  }
}

// ──────────────────────────────────────────────
// Firebase에서 방문 신청 데이터 로드
// ──────────────────────────────────────────────
async function loadVisits() {
  setLoading(true);
  try {
    const role = sessionStorage.getItem('admin_role');
    const myEmpId = sessionStorage.getItem('admin_empId');

    const q = query(collection(db, 'visitRequests'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    const rawData = snapshot.docs.map(d => {
      const raw = d.data();
      return {
        id: d.id,
        ...raw,
        // Firestore Timestamp → Date 변환
        timestamp: raw.timestamp?.toDate?.() ?? null,
        entryTime:           raw.entryTime?.toDate?.()           ?? null,
        exitTime:            raw.exitTime?.toDate?.()            ?? null,
        parkingRegisteredAt: raw.parkingRegisteredAt?.toDate?.() ?? null,
        // 구버전 호환: visitDateTime → visitDate 파싱
        visitDate: raw.visitDate ?? raw.visitDateTime?.split('T')[0] ?? null,
      };
    });

    // 권한별 필터링
    if (role === 'super') {
        allVisits = rawData;
    } else {
        const myName = sessionStorage.getItem('admin_name');
        allVisits = rawData.filter(v => {
            const matchEmpId = v.hostEmpId && myEmpId && v.hostEmpId.toUpperCase() === myEmpId.toUpperCase();
            const matchName = v.hostInfo && v.hostInfo.includes(myName);
            return matchEmpId || matchName;
        });
    }

    // 최신순 정렬 (이미 쿼리에 orderBy가 있지만, 혹시 모를 로컬 데이터 동기화를 위해 보장)
    allVisits.sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));

    // 주차관제 API가 연결된 경우 입출차 데이터 동기화
    if (IS_API_CONNECTED) {
      await mergeParkingLogs();
    }

    applyFilter('upcoming'); // 기본적으로 오늘 이후 예정 건을 모두 보여줌
    updateSummary();
  } catch (err) {
    console.error('데이터 로드 실패:', err);
    showToast('데이터를 불러오는 데 실패했습니다.', 'error');
  } finally {
    setLoading(false);
  }
}

// ──────────────────────────────────────────────
// 주차관제 API 동기화 및 Firestore 업데이트
// ──────────────────────────────────────────────
async function mergeParkingLogs() {
  const parkingMap = await syncAllParkingLogs(allVisits);

  // API에서 받아온 입출차 시간을 메모리 목록과 Firestore에 반영
  for (const visit of allVisits) {
    const log = parkingMap.get(visit.id);
    if (!log) continue;

    const changed =
      log.entryTime?.getTime() !== visit.entryTime?.getTime() ||
      log.exitTime?.getTime()  !== visit.exitTime?.getTime();

    if (changed) {
      visit.entryTime = log.entryTime;
      visit.exitTime  = log.exitTime;

      // Firestore에도 저장 (다음번 로드 시 활용)
      await updateDoc(doc(db, 'visitRequests', visit.id), {
        entryTime: log.entryTime,
        exitTime:  log.exitTime,
      });
    }
  }
}

// ──────────────────────────────────────────────
// 새로고침 버튼
// ──────────────────────────────────────────────
async function handleRefresh() {
  await loadVisits();
  showToast(IS_API_CONNECTED ? '주차관제 데이터와 동기화했습니다.' : '데이터를 새로고침했습니다.');
}

// ──────────────────────────────────────────────
// 필터 / 검색
// ──────────────────────────────────────────────
function applyFilter(type = 'search') {
  const searchInput = document.getElementById('searchInput');
  const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';
  
  const now = new Date();
  const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const todayStr = now.toISOString().split('T')[0];
  const monthPrefix = todayStr.substring(0, 7);

  const role = sessionStorage.getItem('admin_role');

  filteredVisits = allVisits.filter(v => {
    // 총관리자는 승인된 건만 표시
    if (role === 'super' && !v.adminConfirmed) return false;

    // 1. 기간 필터링
    if (type === 'today') {
      if (v.visitDate !== todayStr) return false;
    } else if (type === 'upcoming') {
      if (!v.visitDate || v.visitDate < todayStr) return false;
    } else if (type === 'month') {
      if (!v.visitDate || !v.visitDate.startsWith(monthPrefix)) return false;
    }
    // 'search' 타입은 전체 데이터를 기준으로 함 (기간 필터 무시)

    // 2. 통합 검색 필터링
    if (searchVal) {
      const matchName = v.visitorName?.toLowerCase().includes(searchVal);
      const matchComp = v.company?.toLowerCase().includes(searchVal);
      const matchCar  = Array.isArray(v.carPlates) 
                        ? v.carPlates.some(p => p?.toLowerCase().includes(searchVal))
                        : v.carPlate?.toLowerCase().includes(searchVal);
      const matchHost = (v.hostInfo ?? v.hostName)?.toLowerCase().includes(searchVal);
      
      if (!matchName && !matchComp && !matchCar && !matchHost) return false;
    }

    return true;
  });

  renderTable();
  
  // 기록 건수 업데이트
  const recordCountEl = document.getElementById('recordCount');
  if (recordCountEl) {
    let label = '전체 검색 결과';
    if (type === 'today') label = '오늘 방문 예정';
    else if (type === 'upcoming') label = '진행 및 예정된 전체 방문';
    else if (type === 'month') label = '이번 달 방문';
    
    recordCountEl.textContent = `${label}: ${filteredVisits.length}건`;
  }
}

// ──────────────────────────────────────────────
// 상태 계산
// ──────────────────────────────────────────────
function getStatus(visit) {
  if (visit.exitTime)  return 'exited';
  if (visit.entryTime) return 'entered';
  return 'pending';
}

const STATUS_LABEL = {
  pending: '신청됨',
  entered: '입차중',
  exited:  '출차완료',
};

const STATUS_CLASS = {
  pending: 'status-pending',
  entered: 'status-entered',
  exited:  'status-exited',
};

// ──────────────────────────────────────────────
// 테이블 렌더링
// ──────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('visitTableBody');
  const empty = document.getElementById('emptyState');

  if (filteredVisits.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = filteredVisits.map(v => {
    const status = getStatus(v);
    const visitSchedule = v.visitDate
      ? `${v.visitDate}${v.visitTimeSlot ? '<br><small>' + esc(v.visitTimeSlot) + '</small>' : ''}`
      : formatDateTime(v.visitDateTime ? new Date(v.visitDateTime) : null);
    const confirmed = v.adminConfirmed === true;
    const carDisplay = Array.isArray(v.carPlates)
      ? v.carPlates.filter(Boolean).join(', ')
      : (v.carPlate || '-');
    // 입차 셀: API 미연결 시 수동 입차 버튼, 입차 후 주차 등록 버튼 표시
    let entryCell;
    if (IS_API_CONNECTED) {
      entryCell = `<td class="time-cell ${v.entryTime ? 'has-time' : 'no-time'}">${v.entryTime ? formatDateTime(v.entryTime) : '<span class="awaiting">대기중</span>'}</td>`;
    } else if (!v.entryTime) {
      entryCell = `<td class="time-cell no-time"><button class="parking-entry-btn" data-id="${v.id}">입차</button></td>`;
    } else {
      const parkingStatus = v.parkingRegisteredAt
        ? `<span class="parking-registered">✅ 주차등록 ${formatTime(v.parkingRegisteredAt)}</span>`
        : `<button class="parking-register-btn" data-id="${v.id}">주차 등록</button>`;
      entryCell = `<td class="time-cell has-time">${formatDateTime(v.entryTime)}<br>${parkingStatus}</td>`;
    }

    // 출차 셀: 시간만 표시 (버튼 없음)
    const exitCell = `<td class="time-cell ${v.exitTime ? 'has-time' : 'no-time'}">${v.exitTime ? formatDateTime(v.exitTime) : '<span class="awaiting">-</span>'}</td>`;

    return `
      <tr>
        <td>
          <button class="confirm-toggle ${confirmed ? 'confirmed' : 'unconfirmed'}"
                  data-id="${v.id}" data-confirmed="${confirmed}">
            ${confirmed ? '승인 완료' : '방문 승인하기'}
          </button>
          ${confirmed ? `<a href="${buildCalendarUrl(v)}" target="_blank" class="room-booking-btn">회의실 예약 →</a>` : ''}
        </td>
        <td class="visitor-info-cell">
          <div class="v-name">${esc(v.visitorName)}</div>
          ${v.company ? `<div class="v-company">(${esc(v.company)})</div>` : ''}
        </td>
        <td>${esc(carDisplay)}</td>
        ${entryCell}
        ${exitCell}
        <td>${visitSchedule}</td>
        <td>${esc(v.visitPurpose) || '-'}</td>
        <td>${esc(v.hostInfo ?? v.hostName) || '-'}</td>
        <td>${esc(v.contact)}</td>
        <td><span class="status-badge ${STATUS_CLASS[status]}">${STATUS_LABEL[status]}</span></td>
        <td>${esc(v.company) || '-'}</td>
        <td>${formatDateTime(v.timestamp)}</td>
      </tr>
    `;
  }).join('');
}

// ──────────────────────────────────────────────
// 요약 카드 업데이트
// ──────────────────────────────────────────────
function updateSummary() {
  const now = new Date();
  const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // KST 기준 보정 (필요시)
  const todayStr = now.toISOString().split('T')[0];
  const monthPrefix = todayStr.substring(0, 7); // YYYY-MM

  const todayVisits = allVisits.filter(v => v.visitDate === todayStr);
  const monthVisits = allVisits.filter(v => v.visitDate && v.visitDate.startsWith(monthPrefix));

  const todayCountEl = document.getElementById('todayCount');
  const monthCountEl = document.getElementById('monthCount');
  
  if (todayCountEl) todayCountEl.textContent = todayVisits.length;
  if (monthCountEl) monthCountEl.textContent = monthVisits.length;
}

// ──────────────────────────────────────────────
// CSV 내보내기
// ──────────────────────────────────────────────
function exportCsv() {
  const headers = ['신청일시', '방문객성명', '회사명', '연락처', '차량번호', '방문예정일자', '방문시간대', '방문목적', '담당직원소속및성명', '입차시간', '출차시간', '상태'];
  // 나에게 신청한 모든 데이터(allVisits) 내보내기
  const rows = allVisits.map(v => [
    formatDateTime(v.timestamp),
    v.visitorName,
    v.company,
    v.contact,
    v.carPlate,
    v.visitDate ?? v.visitDateTime?.split('T')[0] ?? '',
    v.visitTimeSlot ?? '',
    v.visitPurpose ?? '',
    v.hostInfo ?? v.hostName ?? '',
    v.entryTime ? formatDateTime(v.entryTime) : '',
    v.exitTime  ? formatDateTime(v.exitTime)  : '',
    STATUS_LABEL[getStatus(v)],
  ].map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`));

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `방문신청_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────────
// 임직원 CSV 업로드
// ──────────────────────────────────────────────
let selectedEmpFile = null;

function openEmpUploadModal() {
  selectedEmpFile = null;
  document.getElementById('selectedFileName').textContent = '';
  document.getElementById('empUploadProgress').textContent = '';
  document.getElementById('empUploadConfirmBtn').disabled = true;
  document.getElementById('empCsvInput').value = '';
  document.getElementById('empUploadModal').classList.add('open');

  const dropArea = document.getElementById('fileDropArea');
  const fileInput = document.getElementById('empCsvInput');

  dropArea.onclick = () => fileInput.click();

  fileInput.onchange = (e) => {
    if (e.target.files[0]) selectEmpFile(e.target.files[0]);
  };

  dropArea.ondragover = (e) => { e.preventDefault(); dropArea.classList.add('dragover'); };
  dropArea.ondragleave = () => dropArea.classList.remove('dragover');
  dropArea.ondrop = (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    if (e.dataTransfer.files[0]) selectEmpFile(e.dataTransfer.files[0]);
  };

  document.getElementById('empUploadCancelBtn').onclick = closeEmpUploadModal;
  document.getElementById('empUploadConfirmBtn').onclick = runEmpUpload;
}

function closeEmpUploadModal() {
  document.getElementById('empUploadModal').classList.remove('open');
}

function selectEmpFile(file) {
  if (!file.name.endsWith('.csv')) {
    showToast('CSV 파일만 업로드 가능합니다.', 'error');
    return;
  }
  selectedEmpFile = file;
  document.getElementById('selectedFileName').textContent = `✅ ${file.name}`;
  document.getElementById('empUploadConfirmBtn').disabled = false;
}

function parseEmployeeCsv(text) {
  // BOM 제거 (엑셀 CSV 저장 시 포함될 수 있음)
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('데이터가 없습니다.');

  // 첫 행이 헤더인지 확인 (이름/name 포함 시 헤더로 처리)
  const firstRow = lines[0].toLowerCase();
  const startIdx = (firstRow.includes('이름') || firstRow.includes('name')) ? 1 : 0;

  return lines.slice(startIdx).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const [name, dept, email, position, phone, empId] = cols;
    if (!name || !empId) return null;
    return { name, dept: dept || '', email: email || '', position: position || '', phone: phone || '', empId };
  }).filter(Boolean);
}

async function runEmpUpload() {
  if (!selectedEmpFile) return;

  const confirmBtn = document.getElementById('empUploadConfirmBtn');
  const cancelBtn = document.getElementById('empUploadCancelBtn');
  const progress = document.getElementById('empUploadProgress');

  confirmBtn.disabled = true;
  cancelBtn.disabled = true;
  progress.textContent = '파일 읽는 중...';

  try {
    // UTF-8 BOM 있으면 UTF-8, 없으면 한국어 엑셀 기본값인 EUC-KR로 디코딩
    const buffer = await selectedEmpFile.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const isUtf8Bom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
    const encoding = isUtf8Bom ? 'utf-8' : 'euc-kr';
    const text = new TextDecoder(encoding).decode(buffer);
    const employees = parseEmployeeCsv(text);

    if (employees.length === 0) throw new Error('유효한 데이터가 없습니다.');

    // 1단계: 기존 명단 삭제
    progress.textContent = `기존 명단 삭제 중...`;
    const snap = await getDocs(collection(db, 'employees'));
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'employees', d.id))));

    // 2단계: 새 명단 업로드
    let done = 0;
    for (const emp of employees) {
      await setDoc(doc(db, 'employees', `EMP_${emp.empId}`), emp);
      done++;
      progress.textContent = `업로드 중... (${done}/${employees.length})`;
    }

    showToast(`임직원 ${employees.length}명 업로드 완료!`);
    closeEmpUploadModal();
  } catch (err) {
    console.error('임직원 업로드 오류:', err);
    progress.textContent = `오류: ${err.message}`;
    showToast('업로드 실패. 파일 형식을 확인해 주세요.', 'error');
  } finally {
    confirmBtn.disabled = false;
    cancelBtn.disabled = false;
  }
}

// ──────────────────────────────────────────────
// 유틸리티
// ──────────────────────────────────────────────
function formatDateTime(date) {
  if (!date) return '-';
  return date.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatTime(date) {
  if (!date) return '';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setLoading(on) {
  document.getElementById('loadingOverlay').style.display = on ? 'flex' : 'none';
}

function showToast(message, type = 'success', actionUrl = null, actionLabel = null) {
  const toast = document.getElementById('toast');
  if (actionUrl && actionLabel) {
    toast.innerHTML = `${message} <a href="${actionUrl}" target="_blank" class="toast-action">${actionLabel}</a>`;
  } else {
    toast.textContent = message;
  }
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), actionUrl ? 6000 : 3000);
}
