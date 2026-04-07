import { db } from './firebase-config.js';
import { collection, addDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

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
    '비즈니스 미팅',
    '업무 협의',
    '계약 및 서류 처리',
    '시설 견학',
    '기타 방문',
];

class VisitorRegistrationForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

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
                        • 수집 목적: 방문객 사전 등록 및 출입 관리<br>
                        • 수집 항목: 방문객 성명, 소속, 연락처, 차량번호<br>
                        • 보유 및 이용 기간: 방문 목적 달성 시 즉시 파기
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
                    <div class="form-group">
                        <label for="visitDate">방문 예정 일자</label>
                        <input type="date" id="visitDate" name="visitDate" required>
                    </div>
                    <div class="form-group">
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
                    <div class="form-group">
                        <label for="visitPurpose">방문 목적</label>
                        <select id="visitPurpose" name="visitPurpose" required>
                            <option value="" disabled selected>방문 목적을 선택하세요</option>
                            ${purposeOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="hostInfo">담당직원 소속 및 성명</label>
                        <input type="text" id="hostInfo" name="hostInfo" placeholder="예) 넷마블 총무팀 홍길동" required>
                    </div>
                </div>

                <button type="submit" class="submit-btn" style="margin-top: 1rem;">방문 신청</button>
            </form>
        `;

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(formContainer);

        this.shadowRoot.querySelector('#visitorForm').addEventListener('submit', this._handleSubmit.bind(this));
        this.shadowRoot.querySelector('#addCarBtn').addEventListener('click', this._addCarRow.bind(this));
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
            carPlates,
            visitDate:     formData.get('visitDate'),
            visitTimeSlot: `${visitHour}:${visitMinute}`,
            visitPurpose:  formData.get('visitPurpose'),
            hostInfo:      formData.get('hostInfo'),
            timestamp:     new Date(),
        };

        btn.disabled = true;
        btn.textContent = '등록 중...';

        try {
            // Firebase 저장이 완료될 때까지 대기
            const docRef = await addDoc(collection(db, 'visitRequests'), data);
            console.log('Document written with ID:', docRef.id);
        } catch (e) {
            console.warn('Firebase 저장 실패 (설정 확인 필요):', e);
            alert('저장 중 오류가 발생했습니다. 파이어베이스 권한이나 인터넷을 확인해주세요.');
        }

        // 저장이 완료된 후 완료 페이지로 이동
        window.location.href = 'complete.html';
    }
}

customElements.define('visitor-registration-form', VisitorRegistrationForm);
