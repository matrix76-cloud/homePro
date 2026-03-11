/**
 * 홈프로 앱 설정 파일
 *
 * 홈프로 플랫폼 전용 설정
 * - 각 분야의 홈프로들이 "거래의 당사자"로 참여
 * - 일감 공유, 소개수수료 수익, 안정적 일감 확보
 */

// ─── 앱 기본 정보 ───
export const APP_NAME = "홈프로";
export const APP_LABEL = "홈프로";
export const APP_DESCRIPTION = "각 분야 전문가를 연결하는 실전형 플랫폼";
export const PLATFORM_TYPE = "homepro";

// ─── Firestore 컬렉션명 ───
export const COLLECTIONS = {
    USERS: "users",
    PHONES: "phones",
    ORDERS: "homepro_orders",
    PROS: "homepro_pros",
    SUBSCRIPTIONS: "homepro_subscriptions",
    SETTLEMENTS: "homepro_settlements",
    REVIEWS: "homepro_reviews",
    REFERRALS: "homepro_referrals",
    CASH: "homepro_cash",
    CHAT: "homepro_chat",
};

// ─── 로컬 스토리지 / 세션 키 ───
export const STORAGE_KEYS = {
    SESSION: "homepro.session",
    FAVORITES: "homepro_favorites",
};

// ─── 채팅 ───
export const CHAT_CONFIG = {
    FIXED_PREFIX: "homepro_fixed_",
};

// ─── 스토리지 경로 접두사 ───
export const STORAGE_PATH_PREFIX = "homepro";

// ─── 테마 색상 (숨고 스타일 기반) ───
export const THEME = {
    primary: "#2563EB",        // 홈프로 블루
    primaryLight: "#60A5FA",   // 밝은 버전
    primaryDark: "#1D4ED8",    // 어두운 버전
    accent: "#F59E0B",         // 포인트 (골드/오렌지)
    purple: "#7C5CFC",        // 보라 CTA
    purpleLight: "#EDE9FE",   // 보라 배경
    danger: "#EF4444",         // 위험/삭제
    success: "#10B981",        // 성공/완료
    text: "#191F28",           // 진한 텍스트
    textSecondary: "#4E5968",  // 보조 텍스트
    textLight: "#6B7280",
    muted: "#8B95A1",          // 비활성 텍스트
    background: "#F2F4F6",     // 페이지 배경 (연회색)
    surface: "#FFFFFF",        // 카드 배경
    border: "#E5E8EB",         // 구분선
    cardShadow: "0 2px 8px rgba(0,0,0,0.04)",
};

// ─── 구독료 ───
export const SUBSCRIPTION = {
    MONTHLY_PRICE: 16500,      // 월 구독료 (부가세 포함)
    CURRENCY: "KRW",
};

// ─── 추천인 보상 ───
export const REFERRAL = {
    SIGNUP_COUPON: 5000,         // 추천/피추천 가입 시 쿠폰 금액
    TRANSACTION_RATE: 0.03,      // 거래 참여 시 추천인 보상 비율 (3%)
    NETWORK_FEE_RATE: 0.05,      // 네트워크 운영비 공제 비율 (5%)
};

// ─── 소개수수료 설정 옵션 ───
export const COMMISSION_TYPES = {
    NONE: "none",                // 미적용
    FIXED: "fixed",              // 정액설정
    CONTRACT: "contract",        // 계약성사
    INFO: "info",                // 정보제공
};

export const COMMISSION_PRESETS = {
    FIXED: [10000, 15000, 20000, 25000, 30000],
    INFO: [1000, 1500, 2000, 2500, 3000],
};

// ─── 프로 선택 방식 ───
export const MATCH_TYPES = {
    PRIORITY: "priority",        // 우선 배정호출
    MULTI: "multi",              // 다중 비교호출
};

// ─── 회원 유형 ───
export const USER_TYPES = {
    GUEST: "guest",              // 비회원
    MEMBER: "member",            // 일반회원
    PRO: "pro",                  // 홈프로 (구독회원)
};

// ─── 일정 선택 옵션 ───
export const SCHEDULE_OPTIONS = [
    { key: "flexible", label: "협의가능해요!" },
    { key: "asap", label: "가능한 빨리 진행 원해요" },
    { key: "within_week", label: "일주일 이내 진행 원해요" },
    { key: "specific", label: "희망날짜지정" },
];

// ─── 카테고리 ───
export const CATEGORIES = [
    {
        id: "professional_cleaning",
        name: "전문청소",
        shortName: "전문청소",
        icon: "🧹",
        description: "이사청소, 입주청소, 거주청소, 사업장청소, 특수청소 등",
        subcategories: ["이사청소", "입주청소(신축)", "거주청소", "사무실청소", "상가청소", "공장청소", "특수청소", "유품정리"],
    },
    {
        id: "plumbing",
        name: "하수구.누수.설비",
        shortName: "하수구/누수",
        icon: "💧",
        description: "하수구 막힘, 배관 누수, 설비 수리 등",
        subcategories: ["하수구 막힘", "배관누수 점검", "싱크대 배관", "변기 막힘", "세면대 배관", "하수구 악취", "배관 동파수리", "설비교체"],
    },
    {
        id: "appliance_cleaning",
        name: "가전분해.클리닝",
        shortName: "가전클리닝",
        icon: "❄️",
        description: "에어컨, 세탁기, 냉장고, 주방후드 분해 청소",
        subcategories: ["에어컨청소", "세탁기청소", "냉장고청소", "주방후드청소", "건조기청소"],
    },
    {
        id: "home_repair",
        name: "집수리",
        shortName: "집수리",
        icon: "🔨",
        description: "각종 집수리, 거울교체, 선반설치, 소규모 보수",
        subcategories: ["거울교체", "선반설치", "문손잡이교체", "실리콘작업", "타일보수", "도배보수", "방충망교체", "도어락교체"],
    },
    {
        id: "electrical",
        name: "전기고장",
        shortName: "전기고장",
        icon: "⚡",
        description: "전원, 차단기, 콘센트, 조명 등 전기 문제",
        subcategories: ["전원.차단기", "콘센트.스위치", "조명고장", "누전.과부하", "배선문제"],
    },
    {
        id: "mattress_care",
        name: "침대메트리스케어",
        shortName: "매트리스",
        icon: "🛏️",
        description: "침대매트리스, 소파, 카펫 전문 케어",
        subcategories: ["침대매트리스", "소파청소", "카펫청소", "진드기제거", "UV살균"],
    },
    {
        id: "aircon_install",
        name: "에어컨설치",
        shortName: "에어컨설치",
        icon: "🌀",
        description: "에어컨 신규설치, 이전설치, 철거",
        subcategories: ["신규설치", "이전설치", "철거", "배관작업", "실외기설치"],
    },
    {
        id: "appliance_install",
        name: "가전설치",
        shortName: "가전설치",
        icon: "🔧",
        description: "세탁기, 냉장고, TV, 비데 등 가전 설치/수리",
        subcategories: ["세탁기/건조기", "냉장고", "TV.벽걸이", "비데.정수기", "인덕션/후드", "CCTV"],
    },
    {
        id: "boiler",
        name: "난방.보일러",
        shortName: "난방/보일러",
        icon: "🔥",
        description: "보일러 수리, 교체, 점검, 난방 배관",
        subcategories: ["보일러 수리", "보일러교체", "보일러 점검", "기름보일러 청소", "난방배관", "온수 미작동"],
    },
    {
        id: "worker_call",
        name: "현장인력호출",
        shortName: "인력호출",
        icon: "👷",
        description: "일용직, 전문기술자, 현장 인력 호출",
        subcategories: ["일용직", "전문기술자", "청소인력", "이사인력", "철거인력"],
    },
    {
        id: "partial_interior",
        name: "부분 인테리어",
        shortName: "부분인테리어",
        icon: "🏠",
        description: "도배, 장판, 욕실, 주방, 창호, 타일 등 부분 시공",
        subcategories: ["도배", "장판/마루", "욕실시공", "주방시공", "창호교체", "타일시공", "문짝교체", "도어락"],
    },
    {
        id: "full_remodel",
        name: "종합 리모델링",
        shortName: "종합리모델링",
        icon: "🏗️",
        description: "아파트, 주택, 상업공간 종합 리모델링",
        subcategories: ["아파트인테리어", "주택리모델링", "상업공간", "주방리모델링", "욕실리모델링", "전체리모델링"],
    },
    {
        id: "heavy_equipment",
        name: "고소작업.중장비",
        shortName: "고소작업",
        icon: "🏗️",
        description: "스카이차, 고소작업차, 크레인 등 중장비 작업",
        subcategories: ["스카이차", "고소작업차", "크레인", "비계작업", "로프작업", "외벽작업"],
    },
    {
        id: "waste",
        name: "폐기물처리",
        shortName: "폐기물",
        icon: "🗑️",
        description: "생활폐기물, 사업장 폐기물, 대형폐기물 수거",
        subcategories: ["생활폐기물", "사업장폐기물", "대형폐기물", "특수폐기물", "건축폐기물"],
    },
    {
        id: "demolition",
        name: "철거",
        shortName: "철거",
        icon: "💥",
        description: "인테리어 철거, 구조물 철거, 부분 철거",
        subcategories: ["인테리어철거", "구조물철거", "부분철거", "석면철거", "외부철거"],
    },
    {
        id: "pest_control",
        name: "해충방역",
        shortName: "해충방역",
        icon: "🐛",
        description: "바퀴벌레, 개미, 쥐, 빈대 등 해충 방역",
        subcategories: ["방역소독", "정기방역", "살균소독", "바퀴벌레", "개미", "쥐", "빈대", "벌집제거"],
    },
    {
        id: "mold",
        name: "곰팡이재발방지",
        shortName: "곰팡이",
        icon: "🍄",
        description: "곰팡이 제거, 재발 방지, 결로 방지, 단열 시공",
        subcategories: ["곰팡이제거+항균코팅", "결로방지 단열페인트", "바이오코트 시공", "단열재 시공", "환기시스템"],
    },
    {
        id: "auto",
        name: "자동차",
        shortName: "자동차",
        icon: "🚗",
        description: "출장세차, 광택, 코팅, 덴트, 출장정비 등",
        subcategories: ["출장세차", "광택/코팅", "덴트", "출장정비", "타이어교체", "배터리교체"],
    },
    {
        id: "moving",
        name: "이사",
        shortName: "이사",
        icon: "🚚",
        description: "가정이사, 원룸이사, 보관이사, 용달이사 등",
        subcategories: ["가정이사", "원룸이사", "보관이사", "용달이사", "기업이사", "사무실이사"],
    },
    {
        id: "computer",
        name: "컴퓨터.프린터",
        shortName: "컴퓨터",
        icon: "💻",
        description: "컴퓨터 수리, 프린터 수리, 네트워크 설치 등",
        subcategories: ["컴퓨터수리", "프린터수리", "네트워크설치", "데이터복구", "포맷/설치", "조립/업그레이드"],
    },
    {
        id: "inspection",
        name: "현장.점검대행",
        shortName: "점검대행",
        icon: "📋",
        description: "현장 점검, 하자 점검, 준공 검사 대행 등",
        subcategories: ["하자점검", "준공검사", "안전점검", "시설점검", "현장실사"],
    },
    {
        id: "supplies",
        name: "자재.장비.소모품",
        shortName: "자재/장비",
        icon: "📦",
        description: "건축자재, 장비 렌탈, 소모품 공급 등",
        subcategories: ["건축자재", "장비렌탈", "소모품공급", "공구대여", "안전장비"],
    },
    {
        id: "training",
        name: "기술전수.창업교육",
        shortName: "기술전수",
        icon: "🎓",
        description: "청소 기술, 시공 기술, 창업 교육 등",
        subcategories: ["청소기술교육", "시공기술교육", "창업컨설팅", "자격증취득", "실무교육"],
    },
    {
        id: "electrical_work",
        name: "전기공사",
        shortName: "전기공사",
        icon: "🔌",
        description: "전기 배선, 증설, 분전반, 조명 공사 등",
        subcategories: ["전기배선공사", "전기증설", "분전반교체", "조명공사", "동력설비", "EV충전기설치"],
    },
    {
        id: "realestate",
        name: "부동산 구해줘",
        shortName: "부동산",
        icon: "🏠",
        description: "원하는 매물 찾기 어렵다면, 홈프로 전문가들에게 빠르게 도움 받아보세요",
        noSubscription: true,
        noCommission: true,
    },
    {
        id: "insurance",
        name: "기업.단체보험",
        shortName: "기업보험",
        icon: "🛡️",
        description: "기업보험, 단체보험, 산재보험, 배상책임보험 등",
        subcategories: ["기업보험", "단체보험", "산재보험", "배상책임보험", "화재보험"],
    },
    {
        id: "fortune",
        name: "사주.작명",
        shortName: "사주/작명",
        icon: "🔮",
        description: "사주, 작명, 택일, 풍수 상담 등",
        subcategories: ["사주상담", "작명", "택일", "풍수", "궁합"],
    },
];

// ─── 공간유형 ───
export const SPACE_TYPES = ["아파트", "빌라", "단독주택", "오피스텔", "상가", "사무실", "공장", "기타"];

// ─── 주거형태 ───
export const HOUSING_TYPES = ["아파트", "빌라 연립 다세대", "단독주택", "오피스텔", "원룸", "투룸"];

// ─── 카테고리별 전문가 상세 필드 ───
export const PRO_DETAIL_FIELDS = {
    professional_cleaning: [
        { key: "equipment", type: "chips", label: "보유 장비", options: ["스팀청소기", "업소용 진공청소기", "고압세척기", "바닥광택기", "오존발생기"] },
        { key: "crewSize", type: "number", label: "작업 인원 수", placeholder: "예: 2" },
    ],
    plumbing: [
        { key: "certifications", type: "text", label: "관련 자격증", placeholder: "예: 배관기능사" },
        { key: "equipment", type: "chips", label: "보유 장비", options: ["누수탐지기", "배관카메라", "고압세척기", "동파해빙기"] },
        { key: "emergencyAvail", type: "chips", label: "긴급출동", options: ["당일출동 가능", "24시간 긴급출동", "예약제만 가능"] },
    ],
    appliance_cleaning: [
        { key: "equipment", type: "chips", label: "보유 장비", options: ["고압세척기", "스팀청소기", "분해공구 세트", "전용 세정제"] },
        { key: "certifications", type: "text", label: "관련 자격증", placeholder: "보유 자격증이 있으면 입력" },
    ],
    home_repair: [
        { key: "skills", type: "chips", label: "전문 분야", options: ["거울/유리", "선반/가구", "타일", "실리콘", "도배보수", "방충망", "도어락"] },
        { key: "emergencyAvail", type: "chips", label: "긴급출동", options: ["당일출동 가능", "24시간 긴급출동", "예약제만 가능"] },
    ],
    electrical: [
        { key: "certifications", type: "text", label: "전기 관련 자격증", placeholder: "예: 전기기능사, 전기산업기사" },
        { key: "emergencyAvail", type: "chips", label: "긴급출동", options: ["당일출동 가능", "24시간 긴급출동", "예약제만 가능"] },
    ],
    mattress_care: [
        { key: "equipment", type: "chips", label: "보유 장비", options: ["UV살균기", "스팀청소기", "진드기제거기", "탈취기"] },
    ],
    aircon_install: [
        { key: "certifications", type: "text", label: "관련 자격증", placeholder: "예: 냉동기계기능사" },
        { key: "brands", type: "text", label: "취급 브랜드", placeholder: "예: 삼성, LG, 캐리어" },
    ],
    appliance_install: [
        { key: "certifications", type: "text", label: "관련 자격증", placeholder: "예: 전자기기기능사" },
        { key: "brands", type: "text", label: "취급 브랜드", placeholder: "예: 삼성, LG" },
    ],
    boiler: [
        { key: "certifications", type: "text", label: "관련 자격증", placeholder: "예: 에너지관리기능사, 가스기능사" },
        { key: "brands", type: "text", label: "취급 브랜드", placeholder: "예: 경동나비엔, 린나이, 귀뚜라미" },
        { key: "emergencyAvail", type: "chips", label: "긴급출동", options: ["당일출동 가능", "24시간 긴급출동", "예약제만 가능"] },
    ],
    worker_call: [
        { key: "skills", type: "textarea", label: "가능 작업 상세", placeholder: "수행 가능한 작업을 상세히 적어주세요" },
        { key: "availableTime", type: "chips", label: "작업 가능 시간", options: ["주간(09~18시)", "야간(18시~)", "새벽", "주말/공휴일", "상시가능"] },
    ],
    partial_interior: [
        { key: "scope", type: "chips", label: "시공 범위", options: ["도배", "장판/마루", "욕실", "주방", "창호", "타일", "문짝"] },
        { key: "materials", type: "chips", label: "취급 자재", options: ["실크벽지", "합지벽지", "친환경벽지", "장판", "마루"] },
    ],
    full_remodel: [
        { key: "portfolio", type: "textarea", label: "시공 사례 소개", placeholder: "대표 시공 사례를 소개해주세요" },
        { key: "designService", type: "chips", label: "디자인 서비스", options: ["3D 설계 가능", "도면 제공", "디자인 컨설팅"] },
    ],
    heavy_equipment: [
        { key: "equipment", type: "chips", label: "보유 장비", options: ["스카이차", "고소작업차", "크레인", "비계", "굴삭기"] },
        { key: "certifications", type: "text", label: "관련 자격증", placeholder: "예: 고소작업차 운전면허" },
    ],
    waste: [
        { key: "permits", type: "text", label: "폐기물 관련 허가증", placeholder: "예: 폐기물수집운반업 허가번호" },
        { key: "vehicles", type: "chips", label: "보유 차량", options: ["1톤", "2.5톤", "5톤", "암롤차"] },
    ],
    demolition: [
        { key: "equipment", type: "chips", label: "보유 장비", options: ["굴삭기", "브레이커", "집게차", "덤프트럭"] },
        { key: "crewSize", type: "number", label: "작업 인원 수", placeholder: "예: 4" },
    ],
    pest_control: [
        { key: "certifications", type: "text", label: "방역 관련 자격증/면허", placeholder: "예: 방역업 등록증" },
        { key: "methods", type: "chips", label: "방역 방식", options: ["약제살포", "훈증소독", "트랩설치", "친환경방역", "열처리"] },
    ],
    mold: [
        { key: "certifications", type: "text", label: "관련 자격증", placeholder: "보유 자격증이 있으면 입력" },
        { key: "methods", type: "chips", label: "시공 방식", options: ["항균코팅", "단열페인트", "바이오코트", "단열재시공", "환기시스템"] },
    ],
    auto: [
        { key: "services", type: "chips", label: "서비스 종류", options: ["출장세차", "광택", "코팅", "덴트", "출장정비", "타이어"] },
        { key: "equipment", type: "chips", label: "보유 장비", options: ["고압세척기", "폴리셔", "스팀기", "공구세트"] },
    ],
    moving: [
        { key: "vehicles", type: "chips", label: "보유 차량", options: ["다마스", "라보", "1톤", "2.5톤", "5톤", "8톤 이상"] },
        { key: "crewSize", type: "number", label: "작업 인원 수", placeholder: "예: 3" },
    ],
    computer: [
        { key: "skills", type: "chips", label: "전문 분야", options: ["PC수리", "프린터수리", "네트워크", "데이터복구", "조립/업그레이드"] },
        { key: "brands", type: "text", label: "취급 브랜드", placeholder: "예: HP, 삼성, LG" },
    ],
    inspection: [
        { key: "certifications", type: "text", label: "관련 자격증", placeholder: "예: 건축기사, 안전관리사" },
        { key: "scope", type: "chips", label: "점검 범위", options: ["하자점검", "준공검사", "안전점검", "시설점검"] },
    ],
    supplies: [
        { key: "categories", type: "chips", label: "취급 품목", options: ["건축자재", "전기자재", "배관자재", "도구/공구", "안전장비", "소모품"] },
        { key: "delivery", type: "chips", label: "배송 방식", options: ["직접배송", "택배", "현장배달", "매장픽업"] },
    ],
    training: [
        { key: "programs", type: "chips", label: "교육 분야", options: ["청소기술", "시공기술", "창업교육", "자격증취득", "실무교육"] },
        { key: "experience", type: "text", label: "강사 경력", placeholder: "교육/강의 경력을 입력해주세요" },
    ],
    electrical_work: [
        { key: "certifications", type: "text", label: "전기공사 관련 자격증", placeholder: "예: 전기공사기사" },
        { key: "scope", type: "chips", label: "공사 범위", options: ["배선공사", "전기증설", "분전반", "조명공사", "동력설비", "EV충전기"] },
    ],
    realestate: [
        { key: "officeName", type: "text", label: "중개사무소명", placeholder: "예: ○○공인중개사사무소" },
        { key: "licenseNumber", type: "text", label: "자격증 번호", placeholder: "공인중개사 자격증번호" },
        { key: "specialties", type: "chips", label: "전문 분야", options: ["아파트 매매", "아파트 전월세", "빌라/다세대", "상가/사무실", "토지/건물", "경매/공매"] },
    ],
    insurance: [
        { key: "company", type: "text", label: "소속 보험사", placeholder: "예: 삼성화재, 현대해상" },
        { key: "products", type: "chips", label: "취급 상품", options: ["기업보험", "단체보험", "산재보험", "배상책임", "화재보험"] },
    ],
    fortune: [
        { key: "services", type: "chips", label: "상담 종류", options: ["사주", "작명", "택일", "풍수", "궁합"] },
        { key: "experience", type: "text", label: "상담 경력", placeholder: "상담 경력을 입력해주세요" },
    ],
};

// ─── Cloud Functions URL ───
export const APP_CONFIG = {
    sms: {
        cfUrl: "https://asia-northeast3-homepro-43f7f.cloudfunctions.net/api/AuthCodeSend",
        label: "홈프로",
    },
    resetPasswordUrl: "https://asia-northeast3-homepro-43f7f.cloudfunctions.net/resetPassword",
};

// ─── 결제수단 ───
export const PAYMENT_METHODS = ["카드결제", "계좌이체", "쿠폰결제", "캐시", "Pi"];
