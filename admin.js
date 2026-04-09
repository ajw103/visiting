import { db } from './firebase-config.js';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import {
  IS_API_CONNECTED,
  syncAllParkingLogs,
} from './parking-api.js';

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
  
  // 오늘 날짜를 기본값으로 설정
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('dateFilter').value = today;

  updateApiStatusBadge();
  await loadVisits();
  bindEvents();
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
    await updateDoc(doc(db, 'visitRequests', id), { adminConfirmed: next });
    const visit = allVisits.find(v => v.id === id);
    if (visit) visit.adminConfirmed = next;
    btn.className = `confirm-toggle ${next ? 'confirmed' : 'unconfirmed'}`;
    btn.dataset.confirmed = String(next);
    btn.textContent = next ? '담당자 확인' : '담당자 확인중';
    showToast(next ? '담당자 확인 처리했습니다.' : '확인을 취소했습니다.');
  } catch (err) {
    console.error(err);
    showToast('업데이트 실패. 다시 시도해 주세요.', 'error');
  } finally {
    btn.disabled = false;
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
        entryTime: raw.entryTime?.toDate?.()  ?? null,
        exitTime:  raw.exitTime?.toDate?.()   ?? null,
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

    applyFilter('today'); // 기본적으로 오늘 방문 예정 건을 먼저 보여줌
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
  const todayStr = now.toISOString().split('T')[0];
  const monthPrefix = todayStr.substring(0, 7);

  filteredVisits = allVisits.filter(v => {
    // 1. 기간 필터링 (카드 클릭 시)
    if (type === 'today') {
      if (v.visitDate !== todayStr) return false;
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
    const label = type === 'today' ? '오늘 방문' : (type === 'month' ? '이번 달 방문' : '전체 검색 결과');
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
    return `
      <tr>
        <td>
          <button class="confirm-toggle ${confirmed ? 'confirmed' : 'unconfirmed'}"
                  data-id="${v.id}" data-confirmed="${confirmed}">
            ${confirmed ? '담당자 확인' : '방문 승인하기'}
          </button>
        </td>
        <td>${formatDateTime(v.timestamp)}</td>
        <td class="visitor-info-cell">
          <div class="v-name">${esc(v.visitorName)}</div>
          ${v.company ? `<div class="v-company">(${esc(v.company)})</div>` : ''}
        </td>
        <td>${esc(v.company) || '-'}</td>
        <td>${esc(v.contact)}</td>
        <td>${esc(carDisplay)}</td>
        <td>${visitSchedule}</td>
        <td>${esc(v.visitPurpose) || '-'}</td>
        <td>${esc(v.hostInfo ?? v.hostName) || '-'}</td>
        <td class="time-cell ${v.entryTime ? 'has-time' : 'no-time'}">
          ${v.entryTime ? formatDateTime(v.entryTime) : '<span class="awaiting">대기중</span>'}
        </td>
        <td class="time-cell ${v.exitTime ? 'has-time' : 'no-time'}">
          ${v.exitTime ? formatDateTime(v.exitTime) : '<span class="awaiting">-</span>'}
        </td>
        <td><span class="status-badge ${STATUS_CLASS[status]}">${STATUS_LABEL[status]}</span></td>
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
// 유틸리티
// ──────────────────────────────────────────────
function formatDateTime(date) {
  if (!date) return '-';
  return date.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setLoading(on) {
  document.getElementById('loadingOverlay').style.display = on ? 'flex' : 'none';
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}
