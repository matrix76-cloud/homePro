/**
 * 홈프로 앱 설정 파일
 *
 * 홈프로 플랫폼 전용 설정
 * - 각 분야의 홈프로들이 "거래의 당사자"로 참여
 * - 일감 공유, 소개수수료 수익, 안정적 일감 확보
 */

// ─── 앱 기본 정보 ───
// 배포할 때마다 이 버전을 올린다 (마이페이지에 표시됨)
export const APP_VERSION = "1.1.2";
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
    BLOCKS: "homepro_blocks",
    BLACKLIST: "homepro_blacklist",
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
    primary: "#2571e3",        // 홈프로 퍼플
    primaryLight: "#6ba3f0",   // 밝은 버전
    primaryDark: "#1b54b8",    // 어두운 버전
    accent: "#F59E0B",         // 포인트 (골드/오렌지)
    purple: "#2571e3",        // 보라 CTA
    purpleLight: "#e7f0fd",   // 보라 배경
    danger: "#EF4444",         // 위험/삭제
    success: "#10B981",        // 성공/완료
    text: "#191F28",           // 진한 텍스트
    textSecondary: "#4E5968",  // 보조 텍스트
    textLight: "#6B7280",
    muted: "#8B95A1",          // 비활성 텍스트
    background: "#F7F8FA",     // 페이지 배경 (더 밝게)
    surface: "#FFFFFF",        // 카드 배경
    border: "#F0F0F4",         // 구분선 (더 연하게)
    cardShadow: "0 1px 3px rgba(0,0,0,0.04)",
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
    PRIORITY: "priority",        // 우선배정호출
    COMPARE: "compare",          // 다중비교호출
    DIRECT: "direct",            // 지정배정
};

// ─── 오더 상태 (표준 저장값) ───
// 저장은 이 6개로만. 표시 단계 normalizeStatus가 레거시값(요청/진행/결제/리뷰/업체선택대기)을 흡수.
export const ORDER_STATUS = {
    REGISTERED: "접수",           // 홈프로 수락 대기, 누구나 지원 가능
    WAITING: "대기",              // 오더 수정/재접수 전 보류 (메인에 안 올라감)
    SELECTING: "선정대기",         // 다중비교호출 진행 중 (3명 모집 후 접수자 선정 대기)
    ASSIGNED: "배정",             // 홈프로 매칭 완료
    COMPLETED: "완료",            // 홈프로가 작업완료 클릭
    CANCELLED: "취소",            // 접수자 취소 또는 시간초과 자동취소
    REJECTED: "거부",             // 거부 등록 (블랙리스트 — 표시상 취소 취급)
};

// ─── 취소 사유 ───
export const CANCEL_REASONS = [
    "잘못접수",
    "일정변경",
    "오더수정",
    "기타",
];

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

// ─── 카테고리 대분류 그룹 ───
export const CATEGORY_GROUPS = [
    { id: "cleaning", label: "청소", categoryIds: ["professional_cleaning", "appliance_cleaning", "mattress_care", "pest_control", "mold"] },
    { id: "repair", label: "설비/수리", categoryIds: ["drain_pipe", "home_repair", "boiler", "electrical_work"] },
    { id: "install", label: "설치", categoryIds: ["aircon_install", "appliance_install"] },
    { id: "construction", label: "시공/철거", categoryIds: ["demolition", "waste", "paint_waterproof", "partial_interior", "full_remodel", "supplies", "heavy_equipment"] },
    { id: "life", label: "생활/기타", categoryIds: ["worker_call", "moving", "auto", "appliance_rental", "computer", "insurance", "fortune"] },
];

// ─── 카테고리 ───
export const CATEGORIES = [
    // ── 청소 ──
    {
        id: "professional_cleaning",
        name: "전문청소",
        shortName: "전문청소",
        group: "cleaning",
        description: "홈클리닝, 정기청소, 준공청소, 특수청소, 화재청소 등 전문 청소",
        subcategories: ["홈클리닝", "정기청소", "준공청소", "특수청소", "화재청소", "상업.매장청소", "바닥청소", "외벽.고소청소", "기타"],
    },
    {
        id: "appliance_cleaning",
        name: "가전분해 클리닝",
        shortName: "가전분해청소",
        group: "cleaning",
        description: "에어컨, 세탁기, 냉장고, 주방후드 분해 청소",
        subcategories: ["에어컨청소", "세탁기청소", "냉장고청소", "주방후드", "비데분해청소", "기타"],
    },
    {
        id: "mattress_care",
        name: "침대.소파.카펫",
        shortName: "침대.소파.카펫",
        group: "cleaning",
        description: "침대매트리스, 소파, 카펫 전문 케어",
        subcategories: ["침대메트리스", "소파", "카페트", "기타"],
    },
    {
        id: "pest_control",
        name: "해충방역",
        shortName: "해충방역",
        group: "cleaning",
        description: "바퀴벌레, 개미, 쥐 등 해충 방역",
        subcategories: ["바퀴벌레", "개미", "쥐", "비래해충", "기타 해충"],
    },
    {
        id: "mold",
        name: "곰팡이 재발방지",
        shortName: "곰팡이",
        group: "cleaning",
        description: "곰팡이 제거, 차단코팅, 단열 시공",
        subcategories: ["곰팡이제거", "곰팡이 차단코팅", "단열 페인트시공", "단열제 시공", "기타"],
    },
    // ── 설비/수리 ──
    {
        id: "drain_pipe",
        name: "설비.하수구.누수",
        shortName: "설비.하수구",
        group: "repair",
        description: "하수구, 배관, 설비, 누수 탐지/공사, 난방",
        subcategories: ["하수구.배관.설비", "누수탐지", "누수공사", "난방.보일러", "기타"],
    },
    {
        id: "home_repair",
        name: "집수리",
        shortName: "집수리",
        group: "repair",
        description: "창호, 욕실, 주방, 도어락 등 각종 소수리/보수",
        subcategories: ["창호 소수리", "욕실 소수리", "주방 소수리", "전기.조명(생활)", "설비연계 소수리", "벽.천장 부분보수", "가구.생활 설치", "도어락.보안 소수리", "베란다.외부 소수리", "문 소수리", "외부 소수리", "도장(페인트)", "기타"],
    },
    {
        id: "boiler",
        name: "난방.보일러",
        shortName: "난방/보일러",
        group: "repair",
        description: "가스/기름/전기 보일러, 지역난방, 온수기",
        subcategories: ["가스보일러", "기름보일러", "전기식보일러", "지역난방", "온수기", "기타"],
    },
    {
        id: "electrical_work",
        name: "전기공사",
        shortName: "전기공사",
        group: "repair",
        description: "배선, 증설, 콘센트/스위치, 조명 공사 등",
        subcategories: ["배선공사", "전기 용량.증설", "콘센트.스위치 신설", "조명공사", "가전 전용 전기공사", "상가.사무실 전기공사", "기타"],
    },
    // ── 설치 ──
    {
        id: "aircon_install",
        name: "에어컨설치",
        shortName: "에어컨설치",
        group: "install",
        description: "에어컨 신규/이전 설치, 실외기, 고장 점검",
        subcategories: ["에어컨 신규", "에어컨 이전", "에어컨실외기", "에어컨고장.점검요청", "기타"],
    },
    {
        id: "appliance_install",
        name: "가전설치",
        shortName: "가전설치",
        group: "install",
        description: "세탁기, 냉장고, TV, 비데 등 가전 설치",
        subcategories: ["세탁기", "냉장고", "TV.가구.벽걸이", "인덕션.후드", "음식물처리기", "온수기", "CCTV.네트워크", "비데.정수기", "기타"],
    },
    // ── 시공/철거 ──
    {
        id: "demolition",
        name: "철거",
        shortName: "철거",
        group: "construction",
        description: "내부/부분/원상복구 철거 등",
        subcategories: ["내부철거", "부분철거", "원상복구 철거", "욕실.주방철거", "상가.사무실철거", "소형철거", "기타"],
    },
    {
        id: "waste",
        name: "폐기물처리",
        shortName: "폐기물처리",
        group: "construction",
        description: "생활/인테리어/대형/사업장 폐기물 처리",
        subcategories: ["가정생활 폐기물", "인테리어 폐기물", "혼합 폐기물", "대형.중량폐기물", "사업장폐기물", "기타"],
    },
    {
        id: "paint_waterproof",
        name: "페인트.도장.방수",
        shortName: "페인트.도장.방수",
        group: "construction",
        description: "내외부 페인트, 도장, 방수 시공",
        subcategories: ["페인트", "도장", "방수", "기타"],
    },
    {
        id: "partial_interior",
        name: "부분 인테리어",
        shortName: "부분인테리어",
        group: "construction",
        description: "벽면, 바닥, 필름, 주방, 욕실 등 부분 인테리어",
        subcategories: ["벽면인테리어", "바닥인테리어", "필름 인테리어", "전기.조명인테리어", "가수.수납인테리어", "주방 인테리어", "욕실인테리어", "유리인테리어", "소규모 인테리어", "전체인테리어", "기타"],
    },
    {
        id: "full_remodel",
        name: "종합 리모델링",
        shortName: "종합리모델링",
        group: "construction",
        description: "욕실, 주방, 전체, 상가 리모델링",
        subcategories: ["욕실 리모델링", "주방리모델링", "부분리모델링", "전체 리모델링", "상가.사무실리모델링", "창호리모델링", "기타"],
    },
    {
        id: "supplies",
        name: "자재.장비.소모품",
        shortName: "자재.장비",
        group: "construction",
        description: "건축/배관/전기/설비/인테리어 자재, 장비, 공구, 소모품",
        subcategories: ["건축자재", "배관자재", "전기자재", "설비자재", "인테리어자재", "농자재", "장비", "공구", "안전용품", "소모품", "기타"],
    },
    {
        id: "heavy_equipment",
        name: "스카이차.장비",
        shortName: "스카이차.장비",
        group: "construction",
        description: "스카이차, 크레인, 사다리차, 굴삭기 등",
        subcategories: ["스카이차", "카고크레인", "사다리차", "유압크레인", "굴삭기", "지게차"],
    },
    // ── 생활/기타 ──
    {
        id: "worker_call",
        name: "작업자요청",
        shortName: "작업자요청",
        group: "life",
        description: "현장 작업 인력/기술자/장비 요청",
        subcategories: ["청소작업", "전문작업", "보통인부", "스페어기사", "기타"],
    },
    {
        id: "moving",
        name: "포장이사",
        shortName: "포장이사",
        group: "life",
        description: "가정/사무실/특수/보관 이사",
        subcategories: ["가정이사", "사무실.상가이사", "특수이사", "부분.추가이사", "보관이사", "기타"],
    },
    {
        id: "auto",
        name: "자동차",
        shortName: "자동차",
        group: "life",
        description: "세차, 정비, 구매상담, 렌트 등",
        subcategories: ["세차.관리", "출장정비", "전기.전자.장치설치", "베터리출장", "신차구매상담", "장기렌트상담", "내차팔기", "중고차 구매동행", "폐차"],
    },
    {
        id: "appliance_rental",
        name: "가전렌탈",
        shortName: "가전렌탈",
        group: "life",
        description: "생활/대형/주방/IT 가전 렌탈",
        subcategories: ["생활.위생가전", "대형가전", "주방.소형가전", "IT.디지털 가전", "특수목적", "기타"],
    },
    {
        id: "computer",
        name: "컴퓨터.프린터",
        shortName: "컴퓨터.프린터",
        group: "life",
        description: "컴퓨터/프린터 수리, 네트워크, 렌탈",
        subcategories: ["컴퓨터.점검수리", "소프트웨어.셋팅", "부품교체", "프린터 설치연결", "출력오류 고장점검", "네트워크.공유설정", "소모품 관리", "사무실.상가패키지", "프린터.복합기 렌탈", "기타"],
    },
    {
        id: "insurance",
        name: "기업.단체보험",
        shortName: "기업보험",
        group: "life",
        description: "기업/단체/공사/배상 보험",
        subcategories: ["특수단체보험", "책임배상보험", "공사.시공보험", "기업.법인종합", "상해.인적보험", "운송.물류보험", "건설기계보험", "재물보험", "기업.법인단체보험", "기타"],
    },
    {
        id: "fortune",
        name: "사주.작명",
        shortName: "사주/작명",
        group: "life",
        description: "사주, 작명, 운세, 상담",
        subcategories: ["승.패 분석", "작명.개명", "진로.적성", "상호.브랜드", "기타"],
    },
];

// ─── 공간유형 ───
export const SPACE_TYPES = ["아파트", "빌라", "단독주택", "오피스텔", "상가", "사무실", "공장", "기타"];

// ─── 주거형태 ───
export const HOUSING_TYPES = ["아파트", "빌라 연립 다세대", "단독주택", "오피스텔", "원룸", "투룸"];

// ─── 카테고리별 전문가 상세 필드 ───
export const PRO_DETAIL_FIELDS = {
    // 새 카테고리
    regular_cleaning: [
        { key: "equipment", type: "chips", label: "보유 장비", options: ["스팀청소기", "업소용 진공청소기", "고압세척기", "바닥광택기"] },
        { key: "crewSize", type: "number", label: "작업 인원 수", placeholder: "예: 3" },
    ],
    special_cleaning: [
        { key: "certifications", type: "text", label: "관련 자격증/면허", placeholder: "예: 특수청소업 등록" },
        { key: "equipment", type: "chips", label: "보유 장비", options: ["방역장비", "소독장비", "오존발생기", "UV살균기", "고압세척기"] },
    ],
    business_cleaning: [
        { key: "equipment", type: "chips", label: "보유 장비", options: ["스팀청소기", "업소용 진공청소기", "고압세척기", "바닥광택기"] },
        { key: "crewSize", type: "number", label: "작업 인원 수", placeholder: "예: 5" },
    ],
    leak_detection: [
        { key: "equipment", type: "chips", label: "보유 장비", options: ["열화상카메라", "음향탐지기", "배관카메라", "가압테스트기"] },
        { key: "certifications", type: "text", label: "관련 자격증", placeholder: "보유 자격증이 있으면 입력" },
    ],
    leak_construction: [
        { key: "certifications", type: "text", label: "관련 자격증", placeholder: "예: 방수기능사" },
        { key: "scope", type: "chips", label: "시공 범위", options: ["욕실방수", "베란다방수", "옥상방수", "외벽방수", "배관교체"] },
    ],
    appliance_rental: [
        { key: "brands", type: "text", label: "취급 브랜드", placeholder: "예: 코웨이, SK매직, LG" },
        { key: "products", type: "chips", label: "취급 품목", options: ["정수기", "공기청정기", "비데", "안마의자", "세탁기/건조기"] },
    ],
    move_cleaning: [
        { key: "equipment", type: "chips", label: "보유 장비", options: ["스팀청소기", "업소용 진공청소기", "고압세척기", "바닥광택기", "오존발생기"] },
        { key: "crewSize", type: "number", label: "작업 인원 수", placeholder: "예: 2" },
    ],
    drain_pipe: [
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
