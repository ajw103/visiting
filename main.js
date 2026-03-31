class VisitorRegistrationForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Component-specific styles
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
            input[type="datetime-local"] {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid var(--light-gray, #e9ecef);
                border-radius: 4px;
                font-size: 1rem;
                box-sizing: border-box;
            }
            input:focus {
                outline: none;
                border-color: var(--primary-color, #007bff);
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
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

            @media (max-width: 480px) {
                .form-container {
                    padding: 1.5rem;
                }
            }
        `;

        // HTML structure of the form
        const formContainer = document.createElement('div');
        formContainer.classList.add('form-container');
        formContainer.innerHTML = `
            <form id="visitorForm">
                <div class="form-group">
                    <label for="visitorName">방문객 성명</label>
                    <input type="text" id="visitorName" name="visitorName" required>
                </div>
                <div class="form-group">
                    <label for="company">회사명</label>
                    <input type="text" id="company" name="company">
                </div>
                <div class="form-group">
                    <label for="contact">연락처</label>
                    <input type="tel" id="contact" name="contact" required>
                </div>
                <div class="form-group">
                    <label for="carPlate">차량 번호 (예: 12가 3456)</label>
                    <input type="text" id="carPlate" name="carPlate">
                </div>
                <div class="form-group">
                    <label for="visitDateTime">방문 예정 일시</label>
                    <input type="datetime-local" id="visitDateTime" name="visitDateTime" required>
                </div>
                <div class="form-group">
                    <label for="hostName">담당 직원 성명</label>
                    <input type="text" id="hostName" name="hostName" required>
                </div>
                <button type="submit" class="submit-btn">사전 방문 신청</button>
            </form>
        `;

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(formContainer);

        this.shadowRoot.querySelector('#visitorForm').addEventListener('submit', this._handleSubmit.bind(this));
    }

    _handleSubmit(event) {
        event.preventDefault(); // Prevent page reload
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        console.log('--- 방문 신청 정보 ---');
        console.log('방문객 성명:', data.visitorName);
        console.log('회사명:', data.company);
        console.log('연락처:', data.contact);
        console.log('차량 번호:', data.carPlate);
        console.log('방문 예정 일시:', data.visitDateTime);
        console.log('담당 직원 성명:', data.hostName);
        console.log('---------------------');

        alert('방문 신청이 완료되었습니다. (개발자 콘솔에서 내용을 확인하세요)');
        form.reset();
    }
}

customElements.define('visitor-registration-form', VisitorRegistrationForm);
