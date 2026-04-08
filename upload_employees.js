(async () => {
    console.log("🚀 임직원 데이터 데이터베이스 업로드 시작...");

    // 브라우저 콘솔에서도 에러 없이 작동하도록 동적 임포트 사용
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
       [임직원 정보 수정 구역]
       - 엑셀에서 만든 수식 결과값을 아래 [ ] 사이에 붙여넣으세요.
       ========================================================== */
    const employees = [
        {name: "김우일", dept: "총무실", email: "woo1woo1@netmarble.com", position: "실장", phone: "010-3194-6568" },
        {name: "김용태", dept: "총무실", email: "kyt5612@netmarble.com", position: "팀원", phone: "010-4442-3005" },
        {name: "김성진", dept: "총무실", email: "netthru@netmarble.com", position: "팀원", phone: "010-3322-7891" },
        {name: "김민혁", dept: "총무실", email: "illinois1215@netmarble.com", position: "팀원", phone: "010-4751-8309" },
        {name: "김재성", dept: "구매팀", email: "jake.kim@netmarble.com", position: "팀장", phone: "010-8553-3292" },
        {name: "장승영", dept: "구매팀", email: "ricewater85@netmarble.com", position: "팀원", phone: "010-6642-8831" },
        {name: "박영신", dept: "구매팀", email: "yspark@netmarble.com", position: "팀원", phone: "010-2621-2992" },
        {name: "선병훈", dept: "구매팀", email: "shygood@netmarble.com", position: "팀원", phone: "010-8620-8704" },
        {name: "김정한", dept: "구매팀", email: "junghan_kim@netmarble.com", position: "팀원", phone: "010-3430-1452" },
        {name: "김민규", dept: "구매팀", email: "minq@netmarble.com", position: "팀원", phone: "010-9736-1789" },
        {name: "정의훈", dept: "구매팀", email: "uihoon_jeong@netmarble.com", position: "팀원", phone: "010-9415-3681" },
        {name: "박태순", dept: "안전환경보건팀", email: "mark01@netmarble.com", position: "팀장", phone: "010-3461-4603" },
        {name: "이혜경", dept: "안전환경보건팀", email: "hk88love@netmarble.com", position: "팀원", phone: "010-6773-8579" },
        {name: "김종혁", dept: "안전환경보건팀", email: "jonghyuk.kim@netmarble.com", position: "팀원", phone: "010-4802-8390" },
        {name: "이예림", dept: "안전환경보건팀", email: "yelim0116@netmarble.com", position: "팀원", phone: "010-2396-8569" },
        {name: "황서현", dept: "안전환경보건팀", email: "standhyun@netmarble.com", position: "팀원", phone: "010-8519-5192" },
        {name: "이문재", dept: "총무팀", email: "sixmj@netmarble.com", position: "팀장", phone: "010-8300-3598" },
        {name: "이창환", dept: "총무팀", email: "haeboy7235@netmarble.com", position: "팀원", phone: "010-9395-3355" },
        {name: "이민규", dept: "총무팀", email: "andu0401@netmarble.com", position: "팀원", phone: "010-3886-3696" },
        {name: "박슬기", dept: "총무팀", email: "psg@netmarble.com", position: "팀원", phone: "010-2799-4736" },
        {name: "김은솔", dept: "총무팀", email: "elly@netmarble.com", position: "팀원", phone: "010-8139-0903" },
        {name: "최재훈", dept: "총무팀", email: "cjaeh90@netmarble.com", position: "팀원", phone: "010-9052-0344" },
        {name: "조철희", dept: "총무팀", email: "choch@netmarble.com", position: "팀원", phone: "010-2755-3462" },
        {name: "신대형", dept: "총무팀", email: "emg56@netmarble.com", position: "팀원", phone: "010-5811-8552" },
        {name: "안재우", dept: "총무팀", email: "ajw103@netmarble.com", position: "팀원", phone: "010-5674-5812" },
        {name: "조영균", dept: "총무팀", email: "evancho@netmarble.com", position: "팀원", phone: "010-2232-7685" },
        {name: "조성철", dept: "총무팀", email: "jo8810@netmarble.com", position: "팀원", phone: "010-3916-8810" },
        {name: "양우선", dept: "총무팀", email: "jd134218@netmarble.com", position: "팀원", phone: "010-5132-2016" },
        {name: "김승연", dept: "총무팀", email: "syryan@netmarble.com", position: "팀원", phone: "010-5769-1837" },
    ];
    /* ========================================================== */

    for (const emp of employees) {
        try {
            // 이메일 앞자리를 문서 ID로 사용
            const docId = emp.email.split('@')[0]; 
            await setDoc(doc(db, "employees", docId), emp);
            console.log(`✅ 등록 성공: ${emp.name} (${emp.dept})`);
        } catch (e) {
            console.error(`❌ 오류 발생 (${emp.name}):`, e);
        }
    }
    console.log("🎊 모든 데이터 업로드가 완료되었습니다!");
})();
