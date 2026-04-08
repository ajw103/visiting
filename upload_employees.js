(async () => {
    console.log("🚀 임직원 데이터(보안 강화 버전) 업로드 시작...");

    // 브라우저 콘솔에서 실행 가능하도록 동적 로드
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js");
    const { getFirestore, collection, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

    const firebaseConfig = {
        apiKey: "AIzaSyDRRORZeAxarCsaziQzbfiUtbxNlM8OIgY",
        authDomain: "nm-dev-gb-vertexai-ga.firebaseapp.com",
        projectId: "nm-dev-gb-vertexai-ga",
        storageBucket: "nm-dev-gb-vertexai-ga.firebasestorage.app",
        messagingSenderId: "875291608176",
        appId: "1:875291608176:web:82d79794fd900abccee0b5",
        measurementId: "G-E27BW46NV1"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    /* ==========================================================
       [임직원 정보 수정 구역 - 보안 강화 버전]
       - A열:성함, B열:부서명, C열:이메일, D열:직책, E열:핸드폰, F열:사번
       - 아래 엑셀 수식을 F열(또는 G열)에 넣고 결과를 [ ] 사이에 붙여넣으세요.
       
       엑셀 수식: 
       ="{name: """&A2&""", dept: """&B2&""", email: """&C2&""", position: """&D2&""", phone: """&E2&""", empId: """&F2&""" },"
       ========================================================== */
    const employees = [
        // 사번(empId)이 추가된 데이터 예시 (직접 수정해서 사용하세요)
        {name: "김우일", dept: "총무실", email: "woo1woo1@netmarble.com", position: "실장", phone: "010-3194-6568", empId: "NM0001" },
        {name: "김용태", dept: "총무실", email: "kyt5612@netmarble.com", position: "팀원", phone: "010-4442-3005", empId: "NM0002" },
        {name: "이문재", dept: "총무팀", email: "sixmj@netmarble.com", position: "팀장", phone: "010-8300-3598", empId: "NM0003" },
        {name: "안재우", dept: "총무팀", email: "ajw103@netmarble.com", position: "팀원", phone: "010-5674-5812", empId: "NM0004" },
        // ... 나머지 데이터도 위 엑셀 수식을 이용해서 'empId'가 포함되도록 다시 업로드해야 로그인이 가능합니다.
    ];
    /* ========================================================== */

    for (const emp of employees) {
        try {
            // 성함과 사번을 조합하거나 사번을 단독 ID로 사용하여 보안성 강화
            // 사번이 영문/숫자 혼합이어도 안전하게 ID로 사용 가능합니다.
            const docId = emp.empId ? `EMP_${emp.empId}` : emp.email.split('@')[0]; 
            await setDoc(doc(db, "employees", docId), emp);
            console.log(`✅ 등록 성공: ${emp.name} (사번: ${emp.empId || '미입력'})`);
        } catch (e) {
            console.error(`❌ 오류 발생 (${emp.name}):`, e);
        }
    }
    console.log("🎊 모든 데이터 업로드가 완료되었습니다!");
    console.log("🔒 이제 관리자 페이지에서 해당 성함과 사번으로 로그인이 가능합니다.");
})();
