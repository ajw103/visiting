import { db } from './firebase-config.js';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
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
// 초기화
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  updateApiStatusBadge();
  await loadVisits();
  bindEvents();
});

function bindEvents() {
  document.getElementById('searchInput').addEventListener('input', applyFilter);
  document.getElementById('dateFilter').addEventListener('change', applyFilter);
  document.getElementById('statusFilter').addEventListener('change', applyFilter);
  document.getElementById('refreshBtn').addEventListener('click', handleRefresh);
  document.getElementById('exportBtn').addEventListener('click', exportCsv);
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
    const q = query(collection(db, 'visitRequests'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    allVisits = snapshot.docs.map(d => {
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

    // 주차관제 API가 연결된 경우 입출차 데이터 동기화
    if (IS_API_CONNECTED) {
      await mergeParkingLogs();
    }

    applyFilter();
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
function applyFilter() {
  const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
  const dateVal  = document.getElementById('dateFilter').value;        // "YYYY-MM-DD"
  const statusVal = document.getElementById('statusFilter').value;     // "" | "pending" | "entered" | "exited"

  filteredVisits = allVisits.filter(v => {
    // 키워드 검색 (이름, 회사, 차량번호, 담당직원)
    if (keyword) {
      const haystack = [v.visitorName, v.company, v.carPlate, v.hostName]
        .join(' ').toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    // 날짜 필터 (방문 예정일 기준)
    if (dateVal && v.visitDate) {
      if (v.visitDate !== dateVal) return false;
    }

    // 상태 필터
    if (statusVal) {
      const status = getStatus(v);
      if (status !== statusVal) return false;
    }

    return true;
  });

  renderTable();
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
        <td>${formatDateTime(v.timestamp)}</td>
        <td>${esc(v.visitorName)}</td>
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
        <td>
          <button class="confirm-toggle ${confirmed ? 'confirmed' : 'unconfirmed'}"
                  data-id="${v.id}" data-confirmed="${confirmed}">
            ${confirmed ? '✓ 확인' : '미확인'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ──────────────────────────────────────────────
// 요약 카드 업데이트
// ──────────────────────────────────────────────
function updateSummary() {
  const today = new Date().toISOString().split('T')[0];
  const todayVisits = allVisits.filter(v => v.visitDateTime?.startsWith(today));

  document.getElementById('totalCount').textContent  = allVisits.length;
  document.getElementById('todayCount').textContent  = todayVisits.length;
  document.getElementById('enteredCount').textContent = allVisits.filter(v => v.entryTime && !v.exitTime).length;
  document.getElementById('exitedCount').textContent  = allVisits.filter(v => v.exitTime).length;
}

// ──────────────────────────────────────────────
// CSV 내보내기
// ──────────────────────────────────────────────
function exportCsv() {
  const headers = ['신청일시', '방문객성명', '회사명', '연락처', '차량번호', '방문예정일자', '방문시간대', '방문목적', '담당직원소속및성명', '입차시간', '출차시간', '상태'];
  const rows = filteredVisits.map(v => [
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
