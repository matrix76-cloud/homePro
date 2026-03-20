/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { THEME, CATEGORIES, COLLECTIONS } from "../../config/homeproConfig";
import { db, storage } from "../../api/config";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    addDoc,
    collection,
    query,
    where,
    getDocs,
    deleteDoc,
    serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import {
    IoDocumentTextOutline,
    IoNotificationsOutline,
    IoPersonOutline,
    IoBusinessOutline,
    IoCheckmarkCircle,
    IoLockClosedOutline,
    IoSaveOutline,
    IoSparklesOutline,
    IoFlaskOutline,
    IoTrashOutline,
} from "react-icons/io5";

// ─── 약관 타입 정의 ───
const POLICY_TYPES = [
    { key: "terms", label: "이용약관" },
    { key: "privacy", label: "개인정보처리방침" },
    { key: "location", label: "위치기반서비스" },
];

// ─── 알림 타입 정의 ───
const NOTIFICATION_TYPES = [
    { key: "order", label: "주문알림" },
    { key: "chat", label: "채팅알림" },
    { key: "notice", label: "공지알림" },
    { key: "marketing", label: "마케팅알림" },
];

// ─── 회사 정보 기본값 ───
const DEFAULT_COMPANY = {
    companyName: "홈프로",
    ceo: "",
    bizNumber: "",
    address: "",
    phone: "",
    email: "",
};

// ─── 컴포넌트 ───
const SECTION_LABELS = { all: "앱 푸시알림 설정", policies: "정관/약관 설정", ai: "AI 설정", test: "테스트 데이터" };

const AdminSettingsPage = () => {
    const { filter } = useParams();
    const section = filter || "all";

    // 약관
    const [policies, setPolicies] = useState({
        terms: "",
        privacy: "",
        location: "",
    });
    const [policySaving, setPolicySaving] = useState({});
    const [policySuccess, setPolicySuccess] = useState({});

    // 알림
    const [notifications, setNotifications] = useState({
        order: true,
        chat: true,
        notice: true,
        marketing: false,
    });
    const [notiSaving, setNotiSaving] = useState(false);
    const [notiSuccess, setNotiSuccess] = useState(false);

    // 관리자
    const [adminInfo, setAdminInfo] = useState(null);
    const [pwForm, setPwForm] = useState({
        current: "",
        newPw: "",
        confirm: "",
    });
    const [pwError, setPwError] = useState("");
    const [pwSaving, setPwSaving] = useState(false);
    const [pwSuccess, setPwSuccess] = useState(false);

    // 회사 정보
    const [company, setCompany] = useState({ ...DEFAULT_COMPANY });
    const [companySaving, setCompanySaving] = useState(false);
    const [companySuccess, setCompanySuccess] = useState(false);

    // AI 설정
    const [aiSettings, setAiSettings] = useState({
        enabled: true,
        model: "gpt-4o",
        estimatePrompt: "",
        maxTokens: 2000,
    });
    const [aiSaving, setAiSaving] = useState(false);
    const [aiSuccess, setAiSuccess] = useState(false);

    // ─── 초기 로드 ───
    useEffect(() => {
        if (section === "all") { loadNotifications(); }
        if (section === "policies") { loadPolicies(); loadCompanyInfo(); }
        if (section === "ai") { loadAiSettings(); }
        loadAdminInfo();
    }, [section]);

    // ─── 약관 로드 ───
    const loadPolicies = async () => {
        try {
            const result = {};
            for (const p of POLICY_TYPES) {
                const snap = await getDoc(doc(db, "policies", p.key));
                result[p.key] = snap.exists() ? snap.data().content || "" : "";
            }
            setPolicies(result);
        } catch (e) {
            console.error("약관 로드 실패:", e);
        }
    };

    // ─── 약관 저장 ───
    const savePolicy = async (type) => {
        setPolicySaving((prev) => ({ ...prev, [type]: true }));
        setPolicySuccess((prev) => ({ ...prev, [type]: false }));
        try {
            await setDoc(
                doc(db, "policies", type),
                { content: policies[type], updatedAt: new Date() },
                { merge: true }
            );
            setPolicySuccess((prev) => ({ ...prev, [type]: true }));
            setTimeout(() => {
                setPolicySuccess((prev) => ({ ...prev, [type]: false }));
            }, 2000);
        } catch (e) {
            console.error("약관 저장 실패:", e);
        } finally {
            setPolicySaving((prev) => ({ ...prev, [type]: false }));
        }
    };

    // ─── 알림 설정 로드 ───
    const loadNotifications = async () => {
        try {
            const snap = await getDoc(doc(db, "settings", "notifications"));
            if (snap.exists()) {
                setNotifications((prev) => ({ ...prev, ...snap.data() }));
            }
        } catch (e) {
            console.error("알림 설정 로드 실패:", e);
        }
    };

    // ─── 알림 설정 저장 ───
    const saveNotifications = async () => {
        setNotiSaving(true);
        setNotiSuccess(false);
        try {
            await setDoc(doc(db, "settings", "notifications"), notifications, {
                merge: true,
            });
            setNotiSuccess(true);
            setTimeout(() => setNotiSuccess(false), 2000);
        } catch (e) {
            console.error("알림 설정 저장 실패:", e);
        } finally {
            setNotiSaving(false);
        }
    };

    // ─── 관리자 정보 로드 ───
    const loadAdminInfo = () => {
        try {
            const session = localStorage.getItem("adminSession");
            if (session) {
                setAdminInfo(JSON.parse(session));
            }
        } catch (e) {
            console.error("관리자 정보 로드 실패:", e);
        }
    };

    // ─── 비밀번호 변경 ───
    const changePassword = async () => {
        setPwError("");
        setPwSuccess(false);

        if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) {
            setPwError("모든 항목을 입력해주세요.");
            return;
        }
        if (pwForm.newPw !== pwForm.confirm) {
            setPwError("새 비밀번호가 일치하지 않습니다.");
            return;
        }
        if (pwForm.newPw.length < 6) {
            setPwError("새 비밀번호는 6자 이상이어야 합니다.");
            return;
        }

        setPwSaving(true);
        try {
            const adminId = adminInfo?.id || adminInfo?.adminId;
            if (!adminId) {
                setPwError("관리자 정보를 찾을 수 없습니다.");
                return;
            }
            const snap = await getDoc(doc(db, "admin", adminId));
            if (!snap.exists()) {
                setPwError("관리자 계정을 찾을 수 없습니다.");
                return;
            }
            const data = snap.data();
            if (data.password !== pwForm.current) {
                setPwError("현재 비밀번호가 일치하지 않습니다.");
                return;
            }
            await updateDoc(doc(db, "admin", adminId), {
                password: pwForm.newPw,
                updatedAt: new Date(),
            });
            setPwSuccess(true);
            setPwForm({ current: "", newPw: "", confirm: "" });
            setTimeout(() => setPwSuccess(false), 2000);
        } catch (e) {
            console.error("비밀번호 변경 실패:", e);
            setPwError("비밀번호 변경에 실패했습니다.");
        } finally {
            setPwSaving(false);
        }
    };

    // ─── 회사 정보 로드 ───
    const loadCompanyInfo = async () => {
        try {
            const snap = await getDoc(doc(db, "settings", "companyInfo"));
            if (snap.exists()) {
                setCompany((prev) => ({ ...prev, ...snap.data() }));
            }
        } catch (e) {
            console.error("회사 정보 로드 실패:", e);
        }
    };

    // ─── 회사 정보 저장 ───
    const saveCompanyInfo = async () => {
        setCompanySaving(true);
        setCompanySuccess(false);
        try {
            await setDoc(doc(db, "settings", "companyInfo"), company, {
                merge: true,
            });
            setCompanySuccess(true);
            setTimeout(() => setCompanySuccess(false), 2000);
        } catch (e) {
            console.error("회사 정보 저장 실패:", e);
        } finally {
            setCompanySaving(false);
        }
    };

    // ─── AI 설정 로드 ───
    const loadAiSettings = async () => {
        try {
            const snap = await getDoc(doc(db, "settings", "ai"));
            if (snap.exists()) {
                setAiSettings((prev) => ({ ...prev, ...snap.data() }));
            }
        } catch (e) {
            console.error("AI 설정 로드 실패:", e);
        }
    };

    // ─── AI 설정 저장 ───
    const saveAiSettings = async () => {
        setAiSaving(true);
        setAiSuccess(false);
        try {
            await setDoc(doc(db, "settings", "ai"), aiSettings, { merge: true });
            setAiSuccess(true);
            setTimeout(() => setAiSuccess(false), 2000);
        } catch (e) {
            console.error("AI 설정 저장 실패:", e);
        } finally {
            setAiSaving(false);
        }
    };

    // ─── 테스트 데이터 ───
    const [testStatus, setTestStatus] = useState("");
    const [testLoading, setTestLoading] = useState(false);
    const proFileInputRef = React.useRef(null);

    const REGIONS = [
        { sido: "서울특별시", gu: "강남구" }, { sido: "서울특별시", gu: "마포구" },
        { sido: "서울특별시", gu: "용산구" }, { sido: "서울특별시", gu: "서초구" },
        { sido: "경기도", gu: "수원시" }, { sido: "경기도", gu: "성남시" },
        { sido: "대구광역시", gu: "수성구" }, { sido: "부산광역시", gu: "해운대구" },
    ];
    const NAMES = ["김민수", "이영희", "박지훈", "최서연", "정우성", "강다은", "조현우", "윤서준", "장예진", "한도윤"];
    const STATUSES = ["접수", "지원", "배차", "대기", "완료", "취소"];
    const SCHEDULES = ["flexible", "asap", "within_week", "specific"];
    const SPACE_TYPES = ["아파트", "빌라", "단독주택", "오피스텔", "상가"];

    const seedOrders = async () => {
        setTestLoading(true);
        setTestStatus("오더 생성 중...");
        try {
            for (let i = 0; i < 20; i++) {
                const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
                const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
                const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
                const daysAgo = Math.floor(Math.random() * 14);
                const createdAt = new Date(Date.now() - daysAgo * 86400000);
                const useDirectPrice = Math.random() > 0.4;
                const directPrice = useDirectPrice ? (Math.floor(Math.random() * 49) + 1) * 100000 : 0;
                const subs = cat.subcategories?.slice(0, Math.floor(Math.random() * 3) + 1) || [];

                await addDoc(collection(db, COLLECTIONS.ORDERS), {
                    categoryId: cat.id,
                    categoryName: cat.shortName,
                    subcategories: subs.map((s) => s.name || s),
                    subcategory: subs.map((s) => s.name || s).join(", "),
                    title: `${cat.shortName} ${subs[0]?.name || subs[0] || ""} 요청`,
                    description: `${cat.shortName} 관련 작업 요청합니다. 상세 내용은 채팅으로 안내드리겠습니다.`,
                    spaceType: SPACE_TYPES[Math.floor(Math.random() * SPACE_TYPES.length)],
                    schedule: SCHEDULES[Math.floor(Math.random() * SCHEDULES.length)],
                    address: `${region.sido} ${region.gu}`,
                    location: `${region.sido} ${region.gu} 테스트동 ${Math.floor(Math.random() * 100) + 1}호`,
                    contactType: "self",
                    customerPhone: "",
                    priceType: useDirectPrice ? "direct" : "estimate",
                    directPrice,
                    price: useDirectPrice ? `${(directPrice).toLocaleString()}원` : "견적요청",
                    commissionType: "none",
                    commissionAmount: "",
                    matchType: Math.random() > 0.5 ? "우선" : "다중",
                    createdBy: `test_user_${i % 5}`,
                    writer: NAMES[i % NAMES.length],
                    photos: [],
                    orderStatus: status,
                    createdAt: new Date(createdAt),
                    isTest: true,
                });
            }
            setTestStatus("오더 20개 생성 완료!");
        } catch (err) {
            setTestStatus("오더 생성 실패: " + err.message);
        } finally {
            setTestLoading(false);
        }
    };

    const TEST_PROS = [
        { name: "김건축", catId: "partial_interior", sido: "서울특별시", gu: "강남구", intro: "15년 경력 인테리어 전문가", rating: 4.9, reviewCount: 127, experience: "15", subs: ["부분 인테리어", "실내 디자인"] },
        { name: "박설비", catId: "plumbing", sido: "경기도", gu: "수원시", intro: "배관 전문 20년 경력", rating: 4.8, reviewCount: 89, experience: "20", subs: ["배관 수리", "보일러"] },
        { name: "이전기", catId: "electrical", sido: "서울특별시", gu: "용산구", intro: "전기기사 자격증 보유", rating: 4.7, reviewCount: 64, experience: "12", subs: ["전기 수리", "조명 설치"] },
        { name: "최인테", catId: "professional_cleaning", sido: "대구광역시", gu: "수성구", intro: "꼼꼼한 시공 보장", rating: 4.8, reviewCount: 156, experience: "10", subs: ["도배", "장판"] },
        { name: "정클린", catId: "appliance_cleaning", sido: "서울특별시", gu: "마포구", intro: "친환경 청소 전문", rating: 4.9, reviewCount: 203, experience: "8", subs: ["에어컨 청소", "세탁기 청소"] },
    ];

    const seedPros = async (files) => {
        if (!files || files.length < 5) {
            setTestStatus("프로필 사진 5장을 선택해주세요.");
            return;
        }
        setTestLoading(true);
        setTestStatus("프로 생성 중...");
        try {
            for (let i = 0; i < 5; i++) {
                const pro = TEST_PROS[i];
                const uid = `test_pro_${i}`;

                // 사진 업로드
                let profileImage = "";
                if (files[i]) {
                    const storageRef = ref(storage, `homepro/pros/test_${i}/profile.jpg`);
                    await uploadBytes(storageRef, files[i]);
                    profileImage = await getDownloadURL(storageRef);
                }

                // users 문서 (권한 에러 시 스킵)
                try {
                    await setDoc(doc(db, "users", uid), {
                        name: pro.name,
                        role: "user",
                        profileImage,
                        intro: pro.intro,
                        phoneE164: `+8210${String(1000 + i).slice(1)}0000`,
                        phoneVerified: true,
                        isTest: true,
                        createdAt: serverTimestamp(),
                    });
                } catch (e) {
                    console.warn(`users/${uid} 생성 스킵 (권한):`, e.message);
                }

                // homepro_pros 문서
                const proDocId = `${uid}_${pro.catId}`;
                await setDoc(doc(db, COLLECTIONS.PROS, proDocId), {
                    uid,
                    categoryId: pro.catId,
                    licenseUrl: "",
                    photoUrls: profileImage ? [profileImage] : [],
                    detail: {
                        subcategories: pro.subs,
                        experience: pro.experience,
                        intro: pro.intro,
                    },
                    status: "approved",
                    region: { sido: pro.sido, gu: pro.gu },
                    rating: pro.rating,
                    reviewCount: pro.reviewCount,
                    appliedAt: serverTimestamp(),
                    approvedAt: serverTimestamp(),
                    isTest: true,
                });
            }
            setTestStatus("프로 5명 생성 완료!");
        } catch (err) {
            setTestStatus("프로 생성 실패: " + err.message);
        } finally {
            setTestLoading(false);
        }
    };

    const deleteTestData = async () => {
        if (!window.confirm("테스트 데이터를 모두 삭제하시겠습니까?")) return;
        setTestLoading(true);
        setTestStatus("테스트 데이터 삭제 중...");
        try {
            // orders
            const oSnap = await getDocs(query(collection(db, COLLECTIONS.ORDERS), where("isTest", "==", true)));
            for (const d of oSnap.docs) await deleteDoc(d.ref);

            // pros
            const pSnap = await getDocs(query(collection(db, COLLECTIONS.PROS), where("isTest", "==", true)));
            for (const d of pSnap.docs) await deleteDoc(d.ref);

            // users (권한 에러 시 스킵)
            let uSize = 0;
            try {
                const uSnap = await getDocs(query(collection(db, "users"), where("isTest", "==", true)));
                uSize = uSnap.size;
                for (const d of uSnap.docs) { try { await deleteDoc(d.ref); } catch {} }
            } catch {}

            // storage
            for (let i = 0; i < 5; i++) {
                try {
                    const folderRef = ref(storage, `homepro/pros/test_${i}`);
                    const list = await listAll(folderRef);
                    for (const item of list.items) await deleteObject(item);
                } catch {}
            }

            setTestStatus(`삭제 완료 (오더 ${oSnap.size}건, 프로 ${pSnap.size}건, 유저 ${uSize}건)`);
        } catch (err) {
            setTestStatus("삭제 실패: " + err.message);
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <Container>
            <PageTitle>{SECTION_LABELS[section] || "설정"}</PageTitle>

            {/* ── 앱 푸시알림 설정 ── */}
            {section === "all" && (
                <>
                    <Card>
                        <CardHeader>
                            <HeaderLeft>
                                <IoNotificationsOutline size={20} />
                                <HeaderTitle>알림 설정</HeaderTitle>
                            </HeaderLeft>
                        </CardHeader>
                        <CardBody>
                            {NOTIFICATION_TYPES.map((n) => (
                                <ToggleRow key={n.key}>
                                    <ToggleLabel>{n.label}</ToggleLabel>
                                    <ToggleSwitch
                                        $active={notifications[n.key]}
                                        onClick={() =>
                                            setNotifications((prev) => ({
                                                ...prev,
                                                [n.key]: !prev[n.key],
                                            }))
                                        }
                                    >
                                        <ToggleKnob $active={notifications[n.key]} />
                                    </ToggleSwitch>
                                </ToggleRow>
                            ))}
                            <SaveRow>
                                {notiSuccess && (
                                    <SuccessText>
                                        <IoCheckmarkCircle size={16} />
                                        저장되었습니다
                                    </SuccessText>
                                )}
                                <SaveButton onClick={saveNotifications} disabled={notiSaving}>
                                    <IoSaveOutline size={16} />
                                    {notiSaving ? "저장 중..." : "저장"}
                                </SaveButton>
                            </SaveRow>
                        </CardBody>
                    </Card>

                    {/* 관리자 계정 */}
                    <Card>
                        <CardHeader>
                            <HeaderLeft>
                                <IoPersonOutline size={20} />
                                <HeaderTitle>관리자 계정</HeaderTitle>
                            </HeaderLeft>
                        </CardHeader>
                        <CardBody>
                            {adminInfo && (
                                <AdminInfoBox>
                                    <InfoRow>
                                        <InfoLabel>관리자 ID</InfoLabel>
                                        <InfoValue>{adminInfo.id || adminInfo.adminId || "-"}</InfoValue>
                                    </InfoRow>
                                    <InfoRow>
                                        <InfoLabel>이름</InfoLabel>
                                        <InfoValue>{adminInfo.name || adminInfo.adminName || "-"}</InfoValue>
                                    </InfoRow>
                                </AdminInfoBox>
                            )}
                            <Divider />
                            <SubTitle><IoLockClosedOutline size={16} />비밀번호 변경</SubTitle>
                            <FormGroup>
                                <FormLabel>현재 비밀번호</FormLabel>
                                <FormInput type="password" value={pwForm.current}
                                    onChange={(e) => setPwForm((prev) => ({ ...prev, current: e.target.value }))}
                                    placeholder="현재 비밀번호 입력" />
                            </FormGroup>
                            <FormGroup>
                                <FormLabel>새 비밀번호</FormLabel>
                                <FormInput type="password" value={pwForm.newPw}
                                    onChange={(e) => setPwForm((prev) => ({ ...prev, newPw: e.target.value }))}
                                    placeholder="새 비밀번호 입력 (6자 이상)" />
                            </FormGroup>
                            <FormGroup>
                                <FormLabel>새 비밀번호 확인</FormLabel>
                                <FormInput type="password" value={pwForm.confirm}
                                    onChange={(e) => setPwForm((prev) => ({ ...prev, confirm: e.target.value }))}
                                    placeholder="새 비밀번호 다시 입력" />
                            </FormGroup>
                            {pwError && <ErrorText>{pwError}</ErrorText>}
                            <SaveRow>
                                {pwSuccess && (
                                    <SuccessText><IoCheckmarkCircle size={16} />비밀번호가 변경되었습니다</SuccessText>
                                )}
                                <SaveButton onClick={changePassword} disabled={pwSaving}>
                                    <IoSaveOutline size={16} />
                                    {pwSaving ? "변경 중..." : "비밀번호 변경"}
                                </SaveButton>
                            </SaveRow>
                        </CardBody>
                    </Card>
                </>
            )}

            {/* ── 정관/약관 설정 ── */}
            {section === "policies" && (
                <>
                    <Card>
                        <CardHeader>
                            <HeaderLeft>
                                <IoDocumentTextOutline size={20} />
                                <HeaderTitle>약관 관리</HeaderTitle>
                            </HeaderLeft>
                        </CardHeader>
                        <CardBody>
                            {POLICY_TYPES.map((p) => (
                                <PolicyBlock key={p.key}>
                                    <PolicyLabel>{p.label}</PolicyLabel>
                                    <PolicyTextarea
                                        value={policies[p.key]}
                                        onChange={(e) => setPolicies((prev) => ({ ...prev, [p.key]: e.target.value }))}
                                        placeholder={`${p.label} 내용을 입력하세요...`}
                                        rows={8}
                                    />
                                    <PolicyActions>
                                        {policySuccess[p.key] && (
                                            <SuccessText><IoCheckmarkCircle size={16} />저장되었습니다</SuccessText>
                                        )}
                                        <SaveButton onClick={() => savePolicy(p.key)} disabled={policySaving[p.key]}>
                                            <IoSaveOutline size={16} />
                                            {policySaving[p.key] ? "저장 중..." : "저장"}
                                        </SaveButton>
                                    </PolicyActions>
                                </PolicyBlock>
                            ))}
                        </CardBody>
                    </Card>

                    {/* 회사 정보 */}
                    <Card>
                        <CardHeader>
                            <HeaderLeft>
                                <IoBusinessOutline size={20} />
                                <HeaderTitle>회사 정보</HeaderTitle>
                            </HeaderLeft>
                        </CardHeader>
                        <CardBody>
                            <FormGroup>
                                <FormLabel>회사명</FormLabel>
                                <FormInput value={company.companyName}
                                    onChange={(e) => setCompany((prev) => ({ ...prev, companyName: e.target.value }))}
                                    placeholder="회사명" />
                            </FormGroup>
                            <FormGroup>
                                <FormLabel>대표자</FormLabel>
                                <FormInput value={company.ceo}
                                    onChange={(e) => setCompany((prev) => ({ ...prev, ceo: e.target.value }))}
                                    placeholder="대표자명" />
                            </FormGroup>
                            <FormGroup>
                                <FormLabel>사업자번호</FormLabel>
                                <FormInput value={company.bizNumber}
                                    onChange={(e) => setCompany((prev) => ({ ...prev, bizNumber: e.target.value }))}
                                    placeholder="000-00-00000" />
                            </FormGroup>
                            <FormGroup>
                                <FormLabel>주소</FormLabel>
                                <FormInput value={company.address}
                                    onChange={(e) => setCompany((prev) => ({ ...prev, address: e.target.value }))}
                                    placeholder="회사 주소" />
                            </FormGroup>
                            <FormGroup>
                                <FormLabel>대표전화</FormLabel>
                                <FormInput value={company.phone}
                                    onChange={(e) => setCompany((prev) => ({ ...prev, phone: e.target.value }))}
                                    placeholder="02-0000-0000" />
                            </FormGroup>
                            <FormGroup>
                                <FormLabel>이메일</FormLabel>
                                <FormInput value={company.email}
                                    onChange={(e) => setCompany((prev) => ({ ...prev, email: e.target.value }))}
                                    placeholder="info@example.com" />
                            </FormGroup>
                            <SaveRow>
                                {companySuccess && (
                                    <SuccessText><IoCheckmarkCircle size={16} />저장되었습니다</SuccessText>
                                )}
                                <SaveButton onClick={saveCompanyInfo} disabled={companySaving}>
                                    <IoSaveOutline size={16} />
                                    {companySaving ? "저장 중..." : "저장"}
                                </SaveButton>
                            </SaveRow>
                        </CardBody>
                    </Card>
                </>
            )}

            {/* ── AI 설정 ── */}
            {section === "ai" && (
                <Card>
                    <CardHeader>
                        <HeaderLeft>
                            <IoSparklesOutline size={20} />
                            <HeaderTitle>AI 설정</HeaderTitle>
                        </HeaderLeft>
                    </CardHeader>
                    <CardBody>
                        <ToggleRow>
                            <ToggleLabel>AI 견적 기능 활성화</ToggleLabel>
                            <ToggleSwitch
                                $active={aiSettings.enabled}
                                onClick={() => setAiSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
                            >
                                <ToggleKnob $active={aiSettings.enabled} />
                            </ToggleSwitch>
                        </ToggleRow>

                        <FormGroup style={{ marginTop: 20 }}>
                            <FormLabel>AI 모델</FormLabel>
                            <FormSelect
                                value={aiSettings.model}
                                onChange={(e) => setAiSettings((prev) => ({ ...prev, model: e.target.value }))}
                            >
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                                <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                                <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
                            </FormSelect>
                        </FormGroup>

                        <FormGroup>
                            <FormLabel>최대 토큰 수</FormLabel>
                            <FormInput
                                type="number"
                                value={aiSettings.maxTokens}
                                onChange={(e) => setAiSettings((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) || 0 }))}
                                placeholder="2000"
                            />
                        </FormGroup>

                        <FormGroup>
                            <FormLabel>AI 견적 시스템 프롬프트</FormLabel>
                            <PolicyTextarea
                                value={aiSettings.estimatePrompt}
                                onChange={(e) => setAiSettings((prev) => ({ ...prev, estimatePrompt: e.target.value }))}
                                placeholder="AI 견적 생성에 사용될 시스템 프롬프트를 입력하세요..."
                                rows={10}
                            />
                        </FormGroup>

                        <SaveRow>
                            {aiSuccess && (
                                <SuccessText><IoCheckmarkCircle size={16} />저장되었습니다</SuccessText>
                            )}
                            <SaveButton onClick={saveAiSettings} disabled={aiSaving}>
                                <IoSaveOutline size={16} />
                                {aiSaving ? "저장 중..." : "저장"}
                            </SaveButton>
                        </SaveRow>
                    </CardBody>
                </Card>
            )}
            {/* ── 테스트 데이터 ── */}
            {section === "test" && (
                <Card>
                    <CardHeader>
                        <HeaderLeft>
                            <IoFlaskOutline size={20} />
                            <HeaderTitle>테스트 데이터 시딩</HeaderTitle>
                        </HeaderLeft>
                    </CardHeader>
                    <CardBody>
                        <TestDesc>테스트 오더 20개, 프로 5명을 생성하거나 삭제합니다. 생성된 데이터에는 isTest: true가 표시됩니다.</TestDesc>

                        <TestBtnRow>
                            <TestBtn onClick={seedOrders} disabled={testLoading}>
                                오더 20개 생성
                            </TestBtn>

                            <TestBtn onClick={() => proFileInputRef.current?.click()} disabled={testLoading}>
                                프로 5명 생성 (사진 선택)
                            </TestBtn>
                            <input
                                ref={proFileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                style={{ display: "none" }}
                                onChange={(e) => seedPros(Array.from(e.target.files))}
                            />

                            <TestDeleteBtn onClick={deleteTestData} disabled={testLoading}>
                                <IoTrashOutline size={16} />
                                테스트 데이터 삭제
                            </TestDeleteBtn>
                        </TestBtnRow>

                        {testStatus && (
                            <TestStatus>{testStatus}</TestStatus>
                        )}

                        <Divider />
                        <SubTitle>생성될 프로 목록</SubTitle>
                        <TestProList>
                            {TEST_PROS.map((p, i) => (
                                <TestProItem key={i}>
                                    <TestProName>{p.name}</TestProName>
                                    <TestProMeta>
                                        {CATEGORIES.find((c) => c.id === p.catId)?.shortName || p.catId} · {p.sido} {p.gu} · {p.intro}
                                    </TestProMeta>
                                </TestProItem>
                            ))}
                        </TestProList>
                    </CardBody>
                </Card>
            )}
        </Container>
    );
};

export default AdminSettingsPage;

// ─── 스타일 ───
const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const PageTitle = styled.h1`
    font-size: 22px;
    font-weight: 700;
    color: ${THEME.text};
    margin: 0 0 8px 0;
`;

const Card = styled.div`
    background: ${THEME.surface};
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    overflow: hidden;
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    cursor: pointer;
    user-select: none;

    &:hover {
        background: ${THEME.background};
    }
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    color: ${THEME.text};
`;

const HeaderTitle = styled.span`
    font-size: 16px;
    font-weight: 600;
    color: ${THEME.text};
`;

const CardBody = styled.div`
    padding: 20px;
    border-top: 1px solid ${THEME.border};
`;

// ─── 약관 ───
const PolicyBlock = styled.div`
    margin-bottom: 24px;

    &:last-child {
        margin-bottom: 0;
    }
`;

const PolicyLabel = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: ${THEME.text};
    margin-bottom: 8px;
`;

const PolicyTextarea = styled.textarea`
    width: 100%;
    min-height: 160px;
    padding: 12px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    font-size: 13px;
    line-height: 1.6;
    color: ${THEME.text};
    background: ${THEME.background};
    resize: vertical;
    box-sizing: border-box;
    font-family: inherit;

    &:focus {
        outline: none;
        border-color: ${THEME.primary};
    }

    &::placeholder {
        color: ${THEME.muted};
    }
`;

const PolicyActions = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 8px;
`;

// ─── 토글 ───
const ToggleRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid ${THEME.border};

    &:last-of-type {
        border-bottom: none;
    }
`;

const ToggleLabel = styled.span`
    font-size: 14px;
    font-weight: 500;
    color: ${THEME.text};
`;

const ToggleSwitch = styled.div`
    width: 44px;
    height: 24px;
    border-radius: 12px;
    background: ${(props) => (props.$active ? THEME.primary : THEME.border)};
    cursor: pointer;
    position: relative;
    transition: background 0.2s;
`;

const ToggleKnob = styled.div`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${THEME.surface};
    position: absolute;
    top: 2px;
    left: ${(props) => (props.$active ? "22px" : "2px")};
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
`;

// ─── 관리자 ───
const AdminInfoBox = styled.div`
    background: ${THEME.background};
    border-radius: 4px;
    padding: 16px;
`;

const InfoRow = styled.div`
    display: flex;
    align-items: center;
    padding: 6px 0;
`;

const InfoLabel = styled.span`
    font-size: 13px;
    color: ${THEME.muted};
    width: 100px;
    flex-shrink: 0;
`;

const InfoValue = styled.span`
    font-size: 14px;
    font-weight: 500;
    color: ${THEME.text};
`;

const Divider = styled.div`
    height: 1px;
    background: ${THEME.border};
    margin: 20px 0;
`;

const SubTitle = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: ${THEME.text};
    margin-bottom: 16px;
`;

// ─── 폼 ───
const FormGroup = styled.div`
    margin-bottom: 14px;
`;

const FormLabel = styled.label`
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: ${THEME.text};
    margin-bottom: 6px;
`;

const FormInput = styled.input`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    font-size: 14px;
    color: ${THEME.text};
    background: ${THEME.background};
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: ${THEME.primary};
    }

    &::placeholder {
        color: ${THEME.muted};
    }
`;

// ─── 공통 ───
const SaveRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
`;

const SaveButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    background: ${THEME.primary};
    color: #fff;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
        opacity: 0.9;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const SuccessText = styled.span`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: ${THEME.success};
    font-weight: 500;
`;

const ErrorText = styled.div`
    font-size: 13px;
    color: #ef4444;
    margin-top: 4px;
    margin-bottom: 4px;
`;

// ─── 테스트 데이터 ───
const TestDesc = styled.p`
    font-size: 13px;
    color: ${THEME.muted};
    line-height: 1.5;
    margin-bottom: 16px;
`;

const TestBtnRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
`;

const TestBtn = styled.button`
    padding: 10px 20px;
    border-radius: 4px;
    background: ${THEME.primary};
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: none;
    &:disabled { opacity: 0.5; cursor: not-allowed; }
    &:hover:not(:disabled) { opacity: 0.9; }
`;

const TestDeleteBtn = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border-radius: 4px;
    background: #FEE2E2;
    color: ${THEME.danger};
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: none;
    &:disabled { opacity: 0.5; cursor: not-allowed; }
    &:hover:not(:disabled) { opacity: 0.9; }
`;

const TestStatus = styled.div`
    margin-top: 12px;
    padding: 10px 14px;
    border-radius: 4px;
    background: ${THEME.background};
    font-size: 13px;
    color: ${THEME.text};
    font-weight: 500;
`;

const TestProList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const TestProItem = styled.div`
    padding: 10px 14px;
    background: ${THEME.background};
    border-radius: 4px;
`;

const TestProName = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: ${THEME.text};
    margin-bottom: 2px;
`;

const TestProMeta = styled.div`
    font-size: 12px;
    color: ${THEME.muted};
`;

const FormSelect = styled.select`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    font-size: 14px;
    color: ${THEME.text};
    background: ${THEME.background};
    box-sizing: border-box;
    cursor: pointer;

    &:focus {
        outline: none;
        border-color: ${THEME.primary};
    }
`;
