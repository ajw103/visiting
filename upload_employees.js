(async () => {
    console.log("🚀 데이터베이스 중복 제거 및 최신 명단 업로드 시작...");

    // 브라우저 콘솔에서 실행 가능하도록 동적 로드
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js");
    const { getFirestore, collection, doc, setDoc, getDocs, deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

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

    // 1단계: 기존 employees 컬렉션의 모든 데이터 삭제 (중복 제거용)
    console.log("🧹 기존 명단 삭제 중...");
    const querySnapshot = await getDocs(collection(db, "employees"));
    const deletePromises = querySnapshot.docs.map(d => deleteDoc(doc(db, "employees", d.id)));
    await Promise.all(deletePromises);
    console.log("✨ 기존 명단 삭제 완료.");

    /* ==========================================================
       [임직원 정보 수정 구역]
       엑셀 수식: 
       ="{name: """&A2&""", dept: """&B2&""", email: """&C2&""", position: """&D2&""", phone: """&E2&""", empId: """&F2&""" },"
       ========================================================== */
    const employees = [
        {name: "김우일", dept: "총무실", email: "woo1woo1@netmarble.com", position: "실장", phone: "010-3194-6568", empId: "NM11206003" },
        {name: "김용태", dept: "총무실", email: "kyt5612@netmarble.com", position: "팀원", phone: "010-4442-3005", empId: "NM11106002" },
        {name: "김성진", dept: "총무실", email: "netthru@netmarble.com", position: "팀원", phone: "010-3322-7891", empId: "NM11911018" },
        {name: "김민혁", dept: "총무실", email: "illinois1215@netmarble.com", position: "팀원", phone: "010-4751-8309", empId: "NM12506014" },
        {name: "김재성", dept: "구매팀", email: "jake.kim@netmarble.com", position: "팀장", phone: "010-8553-3292", empId: "NM11904012" },
        {name: "장승영", dept: "구매팀", email: "ricewater85@netmarble.com", position: "팀원", phone: "010-6642-8831", empId: "NM12506018" },
        {name: "박영신", dept: "구매팀", email: "yspark@netmarble.com", position: "팀원", phone: "010-2621-2992", empId: "NM11506009" },
        {name: "선병훈", dept: "구매팀", email: "shygood@netmarble.com", position: "팀원", phone: "010-8620-8704", empId: "NM12310007" },
        {name: "김정한", dept: "구매팀", email: "junghan_kim@netmarble.com", position: "팀원", phone: "010-3430-1452", empId: "NM12510015" },
        {name: "김민규", dept: "구매팀", email: "minq@netmarble.com", position: "팀원", phone: "010-9736-1789", empId: "NM12411004" },
        {name: "정의훈", dept: "구매팀", email: "uihoon_jeong@netmarble.com", position: "팀원", phone: "010-9415-3681", empId: "NM12509002" },
        {name: "박태순", dept: "안전환경보건팀", email: "mark01@netmarble.com", position: "팀장", phone: "010-3461-4603", empId: "NM12305003" },
        {name: "이혜경", dept: "안전환경보건팀", email: "hk88love@netmarble.com", position: "팀원", phone: "010-6773-8579", empId: "NM12001004" },
        {name: "김종혁", dept: "안전환경보건팀", email: "jonghyuk.kim@netmarble.com", position: "팀원", phone: "010-4802-8390", empId: "NM12304006" },
        {name: "이예림", dept: "안전환경보건팀", email: "yelim0116@netmarble.com", position: "팀원", phone: "010-2396-8569", empId: "NM11804003" },
        {name: "황서현", dept: "안전환경보건팀", email: "standhyun@netmarble.com", position: "팀원", phone: "010-8519-5192", empId: "NM12602003" },
        {name: "이문재", dept: "총무팀", email: "sixmj@netmarble.com", position: "팀장", phone: "010-8300-3598", empId: "NM11308003" },
        {name: "이창환", dept: "총무팀", email: "haeboy7235@netmarble.com", position: "팀원", phone: "010-9395-3355", empId: "NM11107023" },
        {name: "이민규", dept: "총무팀", email: "andu0401@netmarble.com", position: "팀원", phone: "010-3886-3696", empId: "NM11904001" },
        {name: "박슬기", dept: "총무팀", email: "psg@netmarble.com", position: "팀원", phone: "010-2799-4736", empId: "NM12001003" },
        {name: "김은솔", dept: "총무팀", email: "elly@netmarble.com", position: "팀원", phone: "010-8139-0903", empId: "NM12309003" },
        {name: "최재훈", dept: "총무팀", email: "cjaeh90@netmarble.com", position: "팀원", phone: "010-9052-0344", empId: "NM11706007" },
        {name: "조철희", dept: "총무팀", email: "choch@netmarble.com", position: "팀원", phone: "010-2755-3462", empId: "NM11706016" },
        {name: "신대형", dept: "총무팀", email: "emg56@netmarble.com", position: "팀원", phone: "010-5811-8552", empId: "NM12201001" },
        {name: "안재우", dept: "총무팀", email: "ajw103@netmarble.com", position: "팀원", phone: "010-5674-5812", empId: "NM12011004" },
        {name: "조영균", dept: "총무팀", email: "evancho@netmarble.com", position: "팀원", phone: "010-2232-7685", empId: "NM12206022" },
        {name: "조성철", dept: "총무팀", email: "jo8810@netmarble.com", position: "팀원", phone: "010-3916-8810", empId: "NM12505007" },
        {name: "양우선", dept: "총무팀", email: "jd134218@netmarble.com", position: "팀원", phone: "010-5132-2016", empId: "NM12411006" },
        {name: "김승연", dept: "총무팀", email: "syryan@netmarble.com", position: "팀원", phone: "010-5769-1837", empId: "NM12512001" },
    ];
    /* ========================================================== */

    for (const emp of employees) {
        try {
            // 사번을 기반으로 문서 ID 생성 (영문/숫자 혼용 가능)
            const docId = `EMP_${emp.empId}`; 
            await setDoc(doc(db, "employees", docId), emp);
            console.log(`✅ 등록 성공: ${emp.name} (사번: ${emp.empId})`);
        } catch (e) {
            console.error(`❌ 오류 발생 (${emp.name}):`, e);
        }
    }
    console.log("🎊 모든 데이터 업로드가 완료되었습니다!");
    console.log("🔒 이제 깨끗하게 중복 없이 검색 및 로그인이 가능합니다.");
})();
