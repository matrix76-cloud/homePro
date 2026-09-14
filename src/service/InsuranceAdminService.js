/**
 * 보험대리점 관리자(/insurance-admin) 전용 데이터 서비스
 *
 * 화면 파일에 Firestore 코드를 흩뿌리지 않고 여기에 모은다.
 * 컬렉션 구조는 docs/insurance-dev-spec.md 2절 기준.
 *   settings/insurance, insurance_policies, payments(purpose insurance_*), insurance_claims, insurance_admin_logs
 */
import {
    collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc,
    query, where, orderBy, limit, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../api/config";

// ─── 컬렉션 / 상수 ───

export const INS_COLLECTIONS = {
    SETTINGS_DOC: ["settings", "insurance"],
    POLICIES: "insurance_policies",
    PAYMENTS: "payments",
    CLAIMS: "insurance_claims",
    LOGS: "insurance_admin_logs",
    UNMASK_REQUESTS: "insurance_unmask_requests",
};

/** 건당 보험 위험도 그룹 (대표 9/12 회신 — 확정 전 임시값) */
export const RISK_GROUP_KEYS = ["g1", "g2", "g3", "g4"];
export const DEFAULT_RISK_GROUPS = {
    g1: { label: "1그룹(저위험)", rate: 1 },
    g2: { label: "2그룹", rate: 1.3 },
    g3: { label: "3그룹", rate: 1.6 },
    g4: { label: "4그룹(고위험)", rate: 2 },
};

export const UNMASK_STATUS = {
    pending: { label: "운영자 승인 대기", color: "#b45309", weight: 700 },
    approved: { label: "승인", color: "#15803d", weight: 700 },
    rejected: { label: "거절", color: "#b91c1c", weight: 700 },
};

export const INSURANCE_PURPOSES = ["insurance_yearly", "insurance_monthly", "insurance_order"];

export const PLAN_LABELS = {
    yearly: "1년 단체보험",
    monthly: "월 구독형",
    perOrder: "건당 단기",
};

export const POLICY_STATUS = {
    active: { label: "유효", color: "#15803d", weight: 700 },
    pending: { label: "결제 전", color: "#545E6B", weight: 500 },
    expired: { label: "만료", color: "#545E6B", weight: 500 },
    canceled: { label: "해지", color: "#b91c1c", weight: 700 },
};

export const PAYMENT_STATUS = {
    done: { label: "완료", color: "#15803d", weight: 700 },
    ready: { label: "대기", color: "#545E6B", weight: 500 },
    fail: { label: "실패", color: "#b91c1c", weight: 700 },
    refund: { label: "환불", color: "#b45309", weight: 700 },
};

export const PURPOSE_LABELS = {
    insurance_yearly: "1년 단체보험",
    insurance_monthly: "월 구독형",
    insurance_order: "건당 단기",
};

export const CLAIM_STATUS = {
    received: { label: "접수", color: "#b45309", weight: 700 },
    in_progress: { label: "진행 중", color: "#1d4ed8", weight: 700 },
    done: { label: "완료", color: "#15803d", weight: 700 },
};

export const CLAIM_NEXT_STATUS = { received: "in_progress", in_progress: "done", done: null };

export const DAMAGE_LABELS = {
    minor: "경미한 재물 피해",
    major: "중대한 재물 피해",
    injury: "대인 피해",
};

export const DEFAULT_INSURANCE_SETTINGS = {
    plans: {
        yearly: { label: "1년 단체보험", price: 110000, active: true },
        monthly: { label: "월 구독형 보험", price: 11000, active: true },
        perOrder: { label: "건당 단기보험", rate: 1, minPrice: 3000, active: true }, // rate 는 그룹 요율 폴백
    },
    // 건당 보험료 = 시공단가 × 그룹 요율(%) (최소 minPrice). 카테고리→그룹 배정은 대표가 줄 때까지 전부 g1.
    perOrder: {
        minPrice: 3000,
        groups: { ...DEFAULT_RISK_GROUPS },
        categoryGroup: {},
        defaultGroup: "g1",
    },
    coverage: {
        maxText: "",
        deductibleText: "30만원 (공통)",
        maxByGroup: { g1: "", g2: "", g3: "", g4: "" },
        items: ["작업 중 고객 재물 파손 배상", "작업 중 대인 피해 배상"],
    },
    agencyContacts: [],
};

// ─── 공통 유틸 ───

/** Timestamp | {seconds} | Date | string | number → Date | null */
export const toDate = (v) => {
    if (!v) return null;
    let d;
    if (v.toDate) d = v.toDate();
    else if (typeof v.seconds === "number") d = new Date(v.seconds * 1000);
    else d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
};

const pad2 = (n) => String(n).padStart(2, "0");

export const formatDate = (v) => {
    const d = toDate(v);
    if (!d) return "-";
    return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
};

export const formatDateTime = (v) => {
    const d = toDate(v);
    if (!d) return "-";
    return `${formatDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

/** 날짜를 <input type="date"> 값(YYYY-MM-DD)으로 */
export const toInputDate = (d) => {
    const x = toDate(d);
    if (!x) return "";
    return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};

export const formatMoney = (n) => `${Number(n || 0).toLocaleString()}원`;

/** 전화번호 표준화: +821012345678 / 01012345678 / 010-1234-5678 → 010-1234-5678 */
export const normalizePhone = (raw) => {
    if (!raw) return "";
    let digits = String(raw).replace(/\D/g, "");
    if (digits.startsWith("82")) digits = "0" + digits.slice(2);
    if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return String(raw);
};

/** 010-****-1234 */
export const maskPhone = (raw) => {
    const p = normalizePhone(raw);
    if (!p) return "-";
    const parts = p.split("-");
    if (parts.length === 3) return `${parts[0]}-${"*".repeat(parts[1].length)}-${parts[2]}`;
    if (p.length > 4) return `${"*".repeat(p.length - 4)}${p.slice(-4)}`;
    return p;
};

/** 기간 필터 — [from, to] (YYYY-MM-DD 문자열, 빈 값 허용) 안에 있는지 */
export const inDateRange = (v, from, to) => {
    const d = toDate(v);
    if (!d) return !from && !to;
    if (from) {
        const f = new Date(`${from}T00:00:00`);
        if (d < f) return false;
    }
    if (to) {
        const t = new Date(`${to}T23:59:59.999`);
        if (d > t) return false;
    }
    return true;
};

export const monthRange = (base = new Date()) => {
    const start = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
};

/**
 * 관리자 식별 — 로그에 남길 adminUid / adminName.
 * 회원 로그인(users.insuranceAdmin) 이면 userData, 운영자 세션(localStorage adminSession)이면 그 값.
 */
export const getAdminIdentity = (userData) => {
    if (userData?.uid) {
        return {
            adminUid: userData.uid,
            adminName: userData.name || userData.nickname || userData.companyName || "보험 관리자",
            // 운영자(role admin)는 마스킹 해제 승인권자라 요청 절차 없이 바로 본다
            isOperator: userData.role === "admin",
        };
    }
    try {
        const s = JSON.parse(localStorage.getItem("adminSession") || "null");
        if (s?.id) return { adminUid: `admin:${s.id}`, adminName: s.name || "운영자", isOperator: true };
    } catch (e) { /* ignore */ }
    return { adminUid: "unknown", adminName: "알 수 없음", isOperator: false };
};

/** 운영자 세션(localStorage adminSession) 식별 — AdminSettingsPage 승인 UI 에서 씀 */
export const getOperatorIdentity = () => {
    try {
        const s = JSON.parse(localStorage.getItem("adminSession") || "null");
        if (s?.id) return { adminUid: `admin:${s.id}`, adminName: s.name || "운영자", isOperator: true };
    } catch (e) { /* ignore */ }
    return { adminUid: "unknown", adminName: "운영자", isOperator: true };
};

/** 접근 판정 — RequireInsuranceAdmin 과 화면 양쪽에서 같은 기준을 쓴다 */
export const canAccessInsuranceAdmin = (userData) => {
    if (userData?.insuranceAdmin === true) return true;
    if (userData?.role === "admin") return true;
    try { if (localStorage.getItem("adminSession")) return true; } catch (e) { /* ignore */ }
    return false;
};

// ─── 로그 ───

/** 엑셀 다운로드 · 마스킹 해제 로그 (사양 2절 필수) */
export const logAdminAction = async ({ admin, action, tab, target = null, rows = null, approvedBy = null }) => {
    try {
        await addDoc(collection(db, INS_COLLECTIONS.LOGS), {
            adminUid: admin?.adminUid || "unknown",
            adminName: admin?.adminName || "",
            action,
            tab,
            target,
            rows,
            approvedBy,
            at: serverTimestamp(),
        });
    } catch (e) {
        console.error("[insurance-admin] 로그 기록 실패:", e);
    }
};

// ─── 마스킹 해제 요청 (대표 9/12: 대리점 관리자는 바로 못 풀고 운영자 승인 후) ───

/** 내(요청자)가 낸 요청 전부 → { [targetId]: request } (같은 대상은 가장 최근 것) */
export const fetchMyUnmaskRequests = async (requesterUid) => {
    if (!requesterUid) return {};
    const snap = await getDocs(query(collection(db, INS_COLLECTIONS.UNMASK_REQUESTS), where("requesterUid", "==", requesterUid)));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => (toDate(a.requestedAt)?.getTime() || 0) - (toDate(b.requestedAt)?.getTime() || 0));
    const map = {};
    list.forEach((r) => { if (r.targetId) map[r.targetId] = r; });
    return map;
};

/**
 * 해제 요청 생성. kind: "policy" | "claim", targetId: 문서 id, target: 표시용(이름 등)
 * 이미 pending/approved 가 있으면 새로 만들지 않고 그걸 돌려준다.
 */
export const requestUnmask = async ({ admin, kind, targetId, target, existing }) => {
    if (existing && (existing.status === "pending" || existing.status === "approved")) return existing;
    const data = {
        requesterUid: admin?.adminUid || "unknown",
        requesterName: admin?.adminName || "",
        kind,
        policyId: kind === "policy" ? targetId : null,
        claimId: kind === "claim" ? targetId : null,
        targetId,
        target: target || "",
        status: "pending",
        requestedAt: serverTimestamp(),
        decidedBy: null,
        decidedAt: null,
    };
    const ref = await addDoc(collection(db, INS_COLLECTIONS.UNMASK_REQUESTS), data);
    return { id: ref.id, ...data, requestedAt: Timestamp.now() };
};

/** 운영자용 — 대기 중 요청 목록 */
export const fetchPendingUnmaskRequests = async () => {
    const snap = await getDocs(query(collection(db, INS_COLLECTIONS.UNMASK_REQUESTS), where("status", "==", "pending")));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => (toDate(a.requestedAt)?.getTime() || 0) - (toDate(b.requestedAt)?.getTime() || 0));
    return list;
};

/** 운영자 승인/거절. 승인이면 insurance_admin_logs 에 action "unmask" 를 요청자 명의로 남긴다. */
export const decideUnmaskRequest = async (req, decision, operator) => {
    const patch = {
        status: decision, // "approved" | "rejected"
        decidedBy: operator?.adminName || operator?.adminUid || "운영자",
        decidedByUid: operator?.adminUid || null,
        decidedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, INS_COLLECTIONS.UNMASK_REQUESTS, req.id), patch);
    if (decision === "approved") {
        await logAdminAction({
            admin: { adminUid: req.requesterUid, adminName: req.requesterName },
            action: "unmask",
            tab: req.kind === "claim" ? "claims" : "policies",
            target: req.targetId,
            rows: 1,
            approvedBy: patch.decidedBy,
        });
    }
    return { ...req, ...patch, decidedAt: Timestamp.now() };
};

// ─── CSV ───

const csvCell = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** BOM 포함 CSV 다운로드. headers: string[], rows: any[][] */
export const downloadCsv = (filename, headers, rows) => {
    const lines = [headers, ...rows].map((r) => r.map(csvCell).join(","));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const csvStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}`;
};

// ─── settings/insurance ───

export const fetchInsuranceSettings = async () => {
    const snap = await getDoc(doc(db, ...INS_COLLECTIONS.SETTINGS_DOC));
    const data = snap.exists() ? snap.data() : {};
    const D = DEFAULT_INSURANCE_SETTINGS;
    const groups = {};
    RISK_GROUP_KEYS.forEach((k) => { groups[k] = { ...D.perOrder.groups[k], ...(data.perOrder?.groups?.[k] || {}) }; });
    return {
        plans: {
            yearly: { ...D.plans.yearly, ...(data.plans?.yearly || {}) },
            monthly: { ...D.plans.monthly, ...(data.plans?.monthly || {}) },
            perOrder: { ...D.plans.perOrder, ...(data.plans?.perOrder || {}) },
        },
        perOrder: {
            minPrice: data.perOrder?.minPrice ?? data.plans?.perOrder?.minPrice ?? D.perOrder.minPrice,
            groups,
            categoryGroup: { ...(data.perOrder?.categoryGroup || {}) },
            defaultGroup: RISK_GROUP_KEYS.includes(data.perOrder?.defaultGroup) ? data.perOrder.defaultGroup : D.perOrder.defaultGroup,
        },
        coverage: {
            ...D.coverage,
            ...(data.coverage || {}),
            deductibleText: data.coverage?.deductibleText ?? D.coverage.deductibleText,
            maxByGroup: { ...D.coverage.maxByGroup, ...(data.coverage?.maxByGroup || {}) },
        },
        agencyContacts: Array.isArray(data.agencyContacts) ? data.agencyContacts : [],
        updatedAt: data.updatedAt || null,
    };
};

/** 카테고리 id → 적용 요율(%) (설정 탭 미리보기용, 서버 tossPrepare 와 같은 규칙) */
export const rateForCategory = (settings, categoryId) => {
    const g = settings?.perOrder?.categoryGroup?.[categoryId] || settings?.perOrder?.defaultGroup || "g1";
    const rate = settings?.perOrder?.groups?.[g]?.rate;
    return { group: g, rate: Number(rate ?? settings?.plans?.perOrder?.rate ?? 1) };
};

export const saveInsuranceSettings = async (settings, admin) => {
    const payload = {
        plans: {
            yearly: {
                label: settings.plans.yearly.label || "",
                price: Number(settings.plans.yearly.price) || 0,
                active: !!settings.plans.yearly.active,
            },
            monthly: {
                label: settings.plans.monthly.label || "",
                price: Number(settings.plans.monthly.price) || 0,
                active: !!settings.plans.monthly.active,
            },
            perOrder: {
                label: settings.plans.perOrder.label || "",
                // 단일 요율은 폴백으로만 — 기본 그룹 요율을 따라가게 맞춰 둔다
                rate: Number(settings.perOrder?.groups?.[settings.perOrder?.defaultGroup || "g1"]?.rate ?? settings.plans.perOrder.rate) || 0,
                minPrice: Number(settings.perOrder?.minPrice ?? settings.plans.perOrder.minPrice) || 0,
                active: !!settings.plans.perOrder.active,
            },
        },
        perOrder: {
            minPrice: Number(settings.perOrder?.minPrice) || 0,
            groups: RISK_GROUP_KEYS.reduce((acc, k) => {
                const g = settings.perOrder?.groups?.[k] || {};
                acc[k] = { label: g.label || DEFAULT_RISK_GROUPS[k].label, rate: Number(g.rate) || 0 };
                return acc;
            }, {}),
            categoryGroup: Object.fromEntries(
                Object.entries(settings.perOrder?.categoryGroup || {}).filter(([, g]) => RISK_GROUP_KEYS.includes(g)),
            ),
            defaultGroup: RISK_GROUP_KEYS.includes(settings.perOrder?.defaultGroup) ? settings.perOrder.defaultGroup : "g1",
        },
        coverage: {
            maxText: settings.coverage.maxText || "",
            deductibleText: settings.coverage.deductibleText || "",
            maxByGroup: RISK_GROUP_KEYS.reduce((acc, k) => { acc[k] = settings.coverage.maxByGroup?.[k] || ""; return acc; }, {}),
            items: (settings.coverage.items || []).map((s) => String(s).trim()).filter(Boolean),
        },
        agencyContacts: (settings.agencyContacts || [])
            .map((c) => ({ name: (c.name || "").trim(), phone: (c.phone || "").trim() }))
            .filter((c) => c.name || c.phone),
        updatedAt: serverTimestamp(),
        updatedBy: admin?.adminUid || null,
    };
    await setDoc(doc(db, ...INS_COLLECTIONS.SETTINGS_DOC), payload, { merge: true });
    return payload;
};

// ─── insurance_policies ───

export const fetchPolicies = async () => {
    const snap = await getDocs(query(collection(db, INS_COLLECTIONS.POLICIES), orderBy("createdAt", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** 해지 */
export const cancelPolicy = async (policyId, admin) => {
    const patch = {
        status: "canceled",
        canceledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: admin?.adminUid || null,
    };
    await updateDoc(doc(db, INS_COLLECTIONS.POLICIES, policyId), patch);
    return { status: "canceled", canceledAt: Timestamp.now(), updatedAt: Timestamp.now() };
};

/** 연장 — unit: "month" | "year". 현재 endAt 이 지났으면 오늘부터, 아니면 endAt 부터 더한다. */
export const extendPolicy = async (policy, unit, admin) => {
    const now = new Date();
    const cur = toDate(policy.endAt);
    const base = cur && cur > now ? cur : now;
    const next = new Date(base);
    if (unit === "year") next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);
    const endAt = Timestamp.fromDate(next);
    const patch = {
        endAt,
        status: "active",
        updatedAt: serverTimestamp(),
        updatedBy: admin?.adminUid || null,
    };
    await updateDoc(doc(db, INS_COLLECTIONS.POLICIES, policy.id), patch);
    return { endAt, status: "active", updatedAt: Timestamp.now() };
};

export const policiesToCsvRows = (list) => list.map((p) => [
    p.id,
    p.userName || "",
    normalizePhone(p.userPhone),
    PLAN_LABELS[p.type] || p.type || "",
    POLICY_STATUS[p.status]?.label || p.status || "",
    formatDate(p.startAt),
    formatDate(p.endAt),
    Number(p.price || 0),
    p.orderId || "",
    p.paymentId || "",
    formatDateTime(p.createdAt),
]);
export const POLICIES_CSV_HEADERS = ["가입ID", "이름", "전화번호", "유형", "상태", "시작일", "종료일", "보험료", "오더ID", "결제ID", "가입일시"];

// ─── payments (purpose insurance_*) ───

export const fetchInsurancePayments = async () => {
    // purpose "in" 단독 조건이라 복합 인덱스 불필요 — 정렬은 클라이언트에서
    const snap = await getDocs(query(collection(db, INS_COLLECTIONS.PAYMENTS), where("purpose", "in", INSURANCE_PURPOSES)));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => (toDate(b.approvedAt || b.createdAt)?.getTime() || 0) - (toDate(a.approvedAt || a.createdAt)?.getTime() || 0));
    return list;
};

export const fetchRecentInsurancePayments = async (n = 10) => {
    const list = await fetchInsurancePayments();
    return list.slice(0, n);
};

export const paymentsToCsvRows = (list) => list.map((p) => [
    p.tossOrderId || p.id,
    p.uid || "",
    PURPOSE_LABELS[p.purpose] || p.purpose || "",
    p.orderName || "",
    Number(p.amount || 0),
    PAYMENT_STATUS[p.status]?.label || p.status || "",
    p.tossMethod || "",
    formatDateTime(p.approvedAt),
    formatDateTime(p.createdAt),
    p.meta?.policyId || "",
    p.meta?.orderId || "",
    p.receiptUrl || "",
]);
export const PAYMENTS_CSV_HEADERS = ["결제ID", "회원UID", "용도", "결제명", "금액", "상태", "결제수단", "승인일시", "생성일시", "가입ID", "오더ID", "영수증"];

// ─── insurance_claims ───

export const fetchClaims = async () => {
    const snap = await getDocs(query(collection(db, INS_COLLECTIONS.CLAIMS), orderBy("createdAt", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const updateClaimStatus = async (claimId, status, admin) => {
    const patch = {
        status,
        handledBy: admin?.adminName || admin?.adminUid || "",
        updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, INS_COLLECTIONS.CLAIMS, claimId), patch);
    return { status, handledBy: patch.handledBy, updatedAt: Timestamp.now() };
};

export const saveClaimMemo = async (claimId, agencyMemo, admin) => {
    const patch = {
        agencyMemo: agencyMemo || "",
        handledBy: admin?.adminName || admin?.adminUid || "",
        updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, INS_COLLECTIONS.CLAIMS, claimId), patch);
    return { agencyMemo: patch.agencyMemo, handledBy: patch.handledBy, updatedAt: Timestamp.now() };
};

// ─── 대시보드 ───

export const fetchDashboardData = async () => {
    const [policies, claims, payments] = await Promise.all([fetchPolicies(), fetchClaims(), fetchInsurancePayments()]);
    const { start, end } = monthRange();
    const inMonth = (v) => { const d = toDate(v); return d && d >= start && d <= end; };

    const monthPolicies = policies.filter((p) => inMonth(p.createdAt));
    const byType = { yearly: 0, monthly: 0, perOrder: 0 };
    monthPolicies.forEach((p) => { if (byType[p.type] !== undefined) byType[p.type] += 1; });

    const monthPaid = payments.filter((p) => p.status === "done" && inMonth(p.approvedAt || p.createdAt));
    const monthPremium = monthPaid.reduce((s, p) => s + Number(p.amount || 0), 0);

    const claimCounts = { received: 0, in_progress: 0, done: 0 };
    claims.forEach((c) => { if (claimCounts[c.status] !== undefined) claimCounts[c.status] += 1; });

    return {
        monthLabel: `${start.getFullYear()}년 ${start.getMonth() + 1}월`,
        monthNewCount: monthPolicies.length,
        byType,
        activeCount: policies.filter((p) => p.status === "active").length,
        monthPremium,
        monthPaidCount: monthPaid.length,
        claimCounts,
        claimTotal: claims.length,
        recentPayments: payments.slice(0, 10),
    };
};

// ─── 로그 조회 (설정 탭 하단 참고용) ───
export const fetchRecentAdminLogs = async (n = 20) => {
    try {
        const snap = await getDocs(query(collection(db, INS_COLLECTIONS.LOGS), orderBy("at", "desc"), limit(n)));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
        return [];
    }
};
