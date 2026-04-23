import { db } from './firebase-config.js';
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const TIME_SLOTS = [
    '09:00 ~ 10:00',
    '10:00 ~ 11:00',
    '11:00 ~ 12:00',
    '12:00 ~ 13:00',
    '13:00 ~ 14:00',
    '14:00 ~ 15:00',
    '15:00 ~ 16:00',
    '16:00 ~ 17:00',
    '17:00 ~ 18:00',
    '18:00 ~ 19:00',
];

const VISIT_PURPOSES = [
    '회의',
    '면접',
    '정기점검',
    '기타 방문',
];

class VisitorRegistrationForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._selectedHostEmpId = null; // 선택된 담당자 사번 저장용
        this._selectedHostEmail = null; // 선택된 담당자 이메일 저장용

        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
            }
            .form-container {
                background-color: var(--form-bg-color, #ffffff);
                padding: 2rem;
                border-radius: 8px;
                box-shadow: var(--shadow, 0 4px 15px rgba(0, 0, 0, 0.1));
            }
            .form-group {
                margin-bottom: 1.5rem;
            }
            label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 600;
                color: var(--dark-gray, #343a40);
            }
            input[type="text"],
            input[type="tel"],
            input[type="email"],
            input[type="date"],
            select {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid var(--light-gray, #e9ecef);
                border-radius: 4px;
                font-size: 1rem;
                box-sizing: border-box;
                background-color: #fff;
                color: #212529;
                appearance: auto;
                -webkit-appearance: auto;
            }
            input[type="date"] {
                cursor: pointer;
            }
            select {
                cursor: pointer;
            }
            input:focus,
            select:focus {
                outline: none;
                border-color: var(--primary-color, #007bff);
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
            }
            select option[value=""] {
                color: #6c757d;
            }
            .submit-btn {
                width: 100%;
                padding: 0.85rem;
                background-color: var(--primary-color, #007bff);
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 1.1rem;
                font-weight: 600;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .submit-btn:hover {
                background-color: #0056b3;
            }
            .submit-btn:disabled {
                background-color: #ced4da;
                cursor: not-allowed;
            }
            .car-plate-list {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            .car-plate-row {
                display: flex;
                gap: 0.5rem;
                align-items: center;
            }
            .car-plate-row input {
                flex: 1;
            }
            .remove-car-btn {
                flex-shrink: 0;
                padding: 0.5rem 0.75rem;
                background: none;
                border: 1px solid #ced4da;
                border-radius: 4px;
                color: #6c757d;
                font-size: 1.1rem;
                cursor: pointer;
                line-height: 1;
            }
            .remove-car-btn:hover {
                background-color: #f8d7da;
                border-color: #dc3545;
                color: #dc3545;
            }
            .add-car-btn {
                margin-top: 0.5rem;
                padding: 0.5rem 1rem;
                background: none;
                border: 1px dashed var(--primary-color, #007bff);
                border-radius: 4px;
                color: var(--primary-color, #007bff);
                font-size: 0.9rem;
                cursor: pointer;
                width: 100%;
            }
            .add-car-btn:hover {
                background-color: #e7f1ff;
            }

            .consent-group {
                background: #fdfdfd;
                padding: 1rem;
                border: 1px solid var(--light-gray, #e9ecef);
                border-radius: 8px;
                margin-bottom: 2rem;
            }
            .consent-label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                cursor: pointer;
                font-weight: bold;
                color: #212529;
            }
            .consent-label input[type="checkbox"] {
                width: 1.1rem;
                height: 1.1rem;
                cursor: pointer;
            }
            .consent-text {
                margin-top: 0.75rem;
                padding: 0.75rem;
                background-color: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 4px;
                font-size: 0.85rem;
                color: #6c757d;
                line-height: 1.5;
            }
            .section-box {
                background: #ffffff;
                border: 1px solid var(--light-gray, #e9ecef);
                border-radius: 8px;
                padding: 1.5rem;
                margin-bottom: 1.5rem;
                box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            }
            .section-title {
                font-size: 1.1rem;
                font-weight: bold;
                color: var(--primary-color, #0056b3);
                margin-bottom: 1.25rem;
                padding-bottom: 0.5rem;
                border-bottom: 2px solid #f1f3f5;
            }
            .time-select-group {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .time-select-group select {
                flex: 1;
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 1rem;
                background-color: #fff;
            }
            .time-separator {
                font-weight: bold;
                font-size: 1.2rem;
                color: #495057;
            }

            @media (max-width: 480px) {
                .form-container {
                    padding: 1.5rem;
                }
                .section-box {
                    padding: 1.2rem;
                }
            }

            .datetime-row {
                display: flex;
                gap: 1rem;
                align-items: flex-end;
            }
            .datetime-row > .form-group {
                margin-bottom: 0;
            }
            .date-field { flex: 2; }
            .time-field { flex: 3; }

            /* 검색 모달 스타일 */
            .modal-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 1000;
                align-items: center;
                justify-content: center;
            }
            .modal-overlay.show { display: flex; }
            .modal-content {
                background: white;
                width: 90%;
                max-width: 400px;
                padding: 1.5rem;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            }
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.2rem;
            }
            .modal-header h3 { margin: 0; font-size: 1.2rem; color: #333; }
            .close-modal {
                background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999;
            }
            .search-box {
                display: flex; gap: 0.5rem; margin-bottom: 1rem;
            }
            .search-box input {
                flex: 1; padding: 0.7rem; border: 1px solid #ddd; border-radius: 6px;
            }
            .search-btn {
                padding: 0.7rem 1rem; background: var(--primary-color, #007bff); color: white; border: none; border-radius: 6px; cursor: pointer;
            }
            .search-results {
                max-height: 200px; overflow-y: auto;
                border: 1px solid #eee; border-radius: 6px;
            }
            .result-item {
                padding: 0.8rem; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;
            }
            .result-item:hover { background: #f8f9fa; }
            .result-item:last-child { border-bottom: none; }
            .result-dept { font-size: 0.8rem; color: #666; display: block; }
            .result-name { font-weight: bold; color: #333; }
            .no-result { padding: 1.5rem; text-align: center; color: #999; font-size: 0.9rem; }
        `;

        const hourOptions = Array.from({length: 24}, (_, i) => String(i).padStart(2, '0'))
            .map(h => `<option value="${h}">${h}</option>`).join('');
        
        const minOptions = ['00', '10', '20', '30', '40', '50']
            .map(m => `<option value="${m}">${m}</option>`).join('');

        const purposeOptions = VISIT_PURPOSES
            .map(p => `<option value="${p}">${p}</option>`)
            .join('');

        const formContainer = document.createElement('div');
        formContainer.classList.add('form-container');
        formContainer.innerHTML = `
            <form id="visitorForm">
                <div class="consent-group">
                    <label class="consent-label">
                        <input type="checkbox" id="privacyConsent" name="privacyConsent" required>
                        <span>[필수] 개인정보 수집 및 이용에 동의합니다.</span>
                    </label>
                    <div class="consent-text">
                        • 수집 목적: 넷마블 방문 예약 및 출입 관리<br>
                        • 수집 항목: 방문객 성명, 소속, 연락처, 차량번호<br>
                        • 보유 및 이용 기간: 수집일로부터 5년 보관 후 파기
                    </div>
                </div>

                <div class="section-box">
                    <h3 class="section-title">방문객 정보</h3>
                    <div class="form-group">
                        <label for="visitorName">방문객 성명</label>
                        <input type="text" id="visitorName" name="visitorName" required>
                    </div>
                    <div class="form-group">
                        <label for="company">소속 회사</label>
                        <input type="text" id="company" name="company">
                    </div>
                    <div class="form-group">
                        <label for="contact">연락처</label>
                        <input type="tel" id="contact" name="contact" required>
                    </div>
                    <div class="form-group">
                        <label for="visitorEmail">이메일 <span style="font-weight:normal; color:#6c757d; font-size:0.85rem;">(선택)</span></label>
                        <input type="email" id="visitorEmail" name="visitorEmail" placeholder="담당자 승인 결과가 메일로 안내 됩니다.">
                    </div>
                    <div class="form-group" id="carPlateGroup">
                        <label>차량 번호 (예: 12가 3456)</label>
                        <div class="car-plate-list" id="carPlateList">
                            <div class="car-plate-row">
                                <input type="text" name="carPlate" placeholder="차량 번호 입력">
                            </div>
                        </div>
                        <button type="button" class="add-car-btn" id="addCarBtn">+ 차량 추가</button>
                    </div>
                </div>

                <div class="section-box">
                    <h3 class="section-title">방문 정보</h3>
                    <div class="datetime-row" style="margin-bottom: 1.5rem;">
                        <div class="form-group date-field">
                            <label for="visitDate">방문 예정 일자</label>
                            <input type="date" id="visitDate" name="visitDate" required>
                        </div>
                        <div class="form-group time-field">
                            <label>방문 예정 시간</label>
                            <div class="time-select-group">
                                <select id="visitHour" required>
                                    <option value="" disabled selected>시</option>
                                    ${hourOptions}
                                </select>
                                <span class="time-separator">:</span>
                                <select id="visitMinute" required>
                                    <option value="" disabled selected>분</option>
                                    ${minOptions}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="visitPurpose">방문 목적</label>
                        <select id="visitPurpose" name="visitPurpose" required>
                            <option value="" disabled selected>방문 목적을 선택하세요</option>
                            ${purposeOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="hostInfo">담당직원</label>
                        <input type="text" id="hostInfo" name="hostInfo" placeholder="*담당 직원의 성함을 입력해 주세요" required readonly>
                    </div>
                </div>

                <button type="submit" class="submit-btn" style="margin-top: 1rem;">방문 신청</button>
            </form>

            <!-- 직원 검색 모달 -->
            <div id="hostModal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>담당 직원 검색</h3>
                        <button type="button" class="close-modal" id="closeModal">&times;</button>
                    </div>
                    <div class="search-box">
                        <input type="text" id="hostSearchInput" placeholder="직원 성명을 정확히 입력하세요">
                        <button type="button" class="search-btn" id="hostSearchBtn">검색</button>
                    </div>
                    <div class="search-results" id="hostSearchResults">
                        <div class="no-result">성명을 입력하고 검색 버튼을 누르세요.</div>
                    </div>
                </div>
            </div>
        `;

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(formContainer);

        this.shadowRoot.querySelector('#visitorForm').addEventListener('submit', this._handleSubmit.bind(this));
        this.shadowRoot.querySelector('#addCarBtn').addEventListener('click', this._addCarRow.bind(this));

        // 검색 모달 관련 이벤트 리스너
        this.shadowRoot.querySelector('#hostInfo').addEventListener('click', () => this._openModal());
        this.shadowRoot.querySelector('#hostInfo').addEventListener('focus', (e) => { e.target.blur(); this._openModal(); }); // 포커스 시에도 모달 오픈
        this.shadowRoot.querySelector('#closeModal').addEventListener('click', () => this._closeModal());
        this.shadowRoot.querySelector('#hostSearchBtn').addEventListener('click', () => this._searchHost());
        this.shadowRoot.querySelector('#hostSearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this._searchHost(); }
        });
        this.shadowRoot.querySelector('#hostModal').addEventListener('click', (e) => {
            if (e.target.id === 'hostModal') this._closeModal();
        });

        // 직원 데이터 로드 (이제 Firestore 실시간 쿼리를 사용하므로 초기 로드는 필요 없음)
        this._hosts = [];
        this._token = null;
        this._invitationDocId = null;
    }

    connectedCallback() {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (!token) {
            this._blockForm('초대 링크를 통해서만 방문 신청이 가능합니다.<br>담당자에게 초대 링크를 요청해 주세요.');
            return;
        }

        this._token = token;
        this._validateToken(token);
    }

    async _validateToken(token) {
        try {
            const q = query(collection(db, 'visitInvitations'), where('token', '==', token));
            const snap = await getDocs(q);

            if (snap.empty) {
                this._blockForm('유효하지 않은 초대 링크입니다.<br>담당자에게 새로운 링크를 요청해 주세요.');
                return;
            }

            const inviteDoc = snap.docs[0];
            const data = inviteDoc.data();

            if (data.used) {
                this._blockForm('이미 사용된 초대 링크입니다.<br>담당자에게 새로운 링크를 요청해 주세요.');
                return;
            }

            const expiresAt = data.expiresAt?.toDate?.() ?? null;
            if (expiresAt && new Date() > expiresAt) {
                this._blockForm('만료된 초대 링크입니다.<br>담당자에게 새로운 링크를 요청해 주세요.');
                return;
            }

            // 유효한 토큰: 문서 ID 저장
            this._invitationDocId = inviteDoc.id;
        } catch (err) {
            console.error('토큰 검증 오류:', err);
            this._blockForm('링크 검증 중 오류가 발생했습니다.<br>잠시 후 다시 시도해 주세요.');
        }
    }

    _blockForm(message) {
        const container = this.shadowRoot.querySelector('.form-container');
        container.innerHTML = `
            <div style="text-align:center;padding:3rem 1.5rem;">
                <div style="font-size:3rem;margin-bottom:1rem;">🔒</div>
                <h2 style="color:#343a40;margin-bottom:0.75rem;">접근 제한</h2>
                <p style="color:#6c757d;line-height:1.7;">${message}</p>
            </div>
        `;
    }

    async _openModal() {
        this.shadowRoot.querySelector('#hostModal').classList.add('show');
        this.shadowRoot.querySelector('#hostSearchInput').value = '';
        this.shadowRoot.querySelector('#hostSearchResults').innerHTML = '<div class="no-result">성명 또는 부서를 입력하세요.</div>';
        setTimeout(() => this.shadowRoot.querySelector('#hostSearchInput').focus(), 100);

        // 직원 목록 캐시 (모달 열 때 한 번만 로드)
        if (!this._employeeCache) {
            try {
                const snapshot = await getDocs(collection(db, 'employees'));
                this._employeeCache = snapshot.docs.map(d => d.data());
            } catch (e) {
                console.error('직원 목록 로드 오류:', e);
                this._employeeCache = [];
            }
        }
    }

    _closeModal() {
        this.shadowRoot.querySelector('#hostModal').classList.remove('show');
    }

    _searchHost() {
        const queryStr = this.shadowRoot.querySelector('#hostSearchInput').value.trim();
        const resultsContainer = this.shadowRoot.querySelector('#hostSearchResults');

        if (!queryStr) {
            resultsContainer.innerHTML = '<div class="no-result">성명 또는 부서를 입력하세요.</div>';
            return;
        }

        const employees = this._employeeCache || [];
        const matched = employees.filter(h => h.name === queryStr);

        if (matched.length === 0) {
            resultsContainer.innerHTML = '<div class="no-result">일치하는 직원이 없습니다.</div>';
        } else {
            resultsContainer.innerHTML = matched.map((h, i) => {
                const positionDisplay = h.position && h.position !== '팀원' ? ` ${h.position}` : '';
                return `
                    <div class="result-item" data-index="${i}">
                        <span class="result-dept">${h.dept}${positionDisplay}</span>
                        <span class="result-name">${h.name}</span>
                    </div>
                `;
            }).join('');

            resultsContainer.querySelectorAll('.result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const h = matched[item.dataset.index];
                    const pos = h.position && h.position !== '팀원' ? ` ${h.position}` : '';
                    this.shadowRoot.querySelector('#hostInfo').value = `${h.dept}${pos} ${h.name}`;
                    this._selectedHostEmpId = h.empId;
                    this._selectedHostEmail = h.email;
                    this._closeModal();
                });
            });
        }
    }

    _addCarRow() {
        const list = this.shadowRoot.querySelector('#carPlateList');
        const row = document.createElement('div');
        row.className = 'car-plate-row';
        row.innerHTML = `
            <input type="text" name="carPlate" placeholder="차량 번호 입력">
            <button type="button" class="remove-car-btn" aria-label="삭제">✕</button>
        `;
        row.querySelector('.remove-car-btn').addEventListener('click', () => row.remove());
        list.appendChild(row);
    }

    async _handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const btn = form.querySelector('.submit-btn');

        const carPlates = Array.from(this.shadowRoot.querySelectorAll('input[name="carPlate"]'))
            .map(el => el.value.trim())
            .filter(v => v !== '');

        const formData = new FormData(form);
        const visitHour = form.querySelector('#visitHour').value;
        const visitMinute = form.querySelector('#visitMinute').value;

        const data = {
            visitorName:   formData.get('visitorName'),
            company:       formData.get('company'),
            contact:       formData.get('contact'),
            visitorEmail:  formData.get('visitorEmail') || null, // 승인 결과 알림용 이메일 (선택)
            carPlates,
            visitDate:     formData.get('visitDate'),
            visitTimeSlot: `${visitHour}:${visitMinute}`,
            visitPurpose:  formData.get('visitPurpose'),
            hostInfo:      formData.get('hostInfo'),
            hostEmpId:     this._selectedHostEmpId, // 담당자 사번 정보 추가
            timestamp:     new Date(),
            expireAt:      new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5년 후 자동 삭제
        };

        btn.disabled = true;
        btn.textContent = '등록 중...';

        try {
            // Firebase 저장이 완료될 때까지 대기
            const docRef = await addDoc(collection(db, 'visitRequests'), data);
            console.log('Document written with ID:', docRef.id);

            // 초대 토큰 소모 처리 (1회 사용 후 만료)
            if (this._invitationDocId) {
                updateDoc(doc(db, 'visitInvitations', this._invitationDocId), {
                    used: true,
                    usedAt: new Date(),
                }).catch(err => console.warn('토큰 소모 처리 실패:', err));
            }

            // 담당자에게 실시간 알림 발송 (페이지 이동과 병렬로 처리)
            this._sendNotification(data);
        } catch (e) {
            console.warn('Firebase 저장 실패 (설정 확인 필요):', e);
            alert('저장 중 오류가 발생했습니다.');
        }

        // 저장이 완료된 후 완료 페이지로 이동
        window.location.href = 'complete.html';
    }

    // 구글 앱스 스크립트(GAS)를 통한 이메일 알림 발송
    async _sendNotification(data) {
        if (!this._selectedHostEmail) {
            console.warn('알림을 보낼 담당자 이메일이 없습니다.');
            return;
        }

        const GAS_URL = 'https://script.google.com/macros/s/AKfycbxKYYQylpr7JmdVcePhaqMLFpif7CdObpRVtBKimIFQ3Q1XfSFDd3mXhCiXaMMD2l1wXg/exec';
        
        // 메일 제목에 방문 예정 날짜를 포함시켜 이메일 스레드(대화 묶음) 방지
        const subject = `[넷마블 방문예약] 새로운 방문 신청이 접수되었습니다. (${data.visitDate})`;

        const payload = {
            to:      this._selectedHostEmail,
            subject: subject,     // GAS에서 메일 제목으로 사용할 필드
            visitor: data.visitorName,
            company: data.company,
            purpose: data.visitPurpose,
            date:    data.visitDate,
            time:    data.visitTimeSlot
        };

        try {
            console.log('📡 알림 전송 시작:', payload);
            
            // mode: 'no-cors' 환경에서 안전하게 전달하며, 페이지 이동 후에도 전송을 보장(keepalive)
            await fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors', // CORS 정책 우회
                cache: 'no-cache',
                keepalive: true, // 페이지 이동 후에도 요청이 취소되지 않도록 보장
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });
            
            console.log('📬 담당자 알림 전송 시도 완료 (GAS Response Received)');
        } catch (err) {
            console.error('❌ 알림 발송 중 오류 발생:', err);
        }
    }
}

customElements.define('visitor-registration-form', VisitorRegistrationForm);
