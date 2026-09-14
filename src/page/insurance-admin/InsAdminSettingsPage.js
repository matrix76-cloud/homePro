import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import styled from "styled-components";
import { CATEGORIES, CATEGORY_GROUPS } from "../../config/homeproConfig";
import {
    fetchInsuranceSettings, saveInsuranceSettings, fetchRecentAdminLogs, formatDateTime, rateForCategory,
    RISK_GROUP_KEYS,
} from "../../service/InsuranceAdminService";
import {
    Page, PageHead, PageTitle, PageDesc, HeadRight, Btn, SmallBtn, Loading,
    Section, SectionHead, SectionTitle, SectionDesc, SectionBody,
    FormGrid, Field, FieldLabel, Input, Textarea, CheckLabel, Hint, SavedText, ErrorText, Select, Note,
    TableWrap, Table, Th, Td, Tr, Empty, Mono, LINE, FILL_SOFT,
} from "./insAdminUi";

const PlanRow = styled.div`
    display: grid; grid-template-columns: 150px 1fr 1fr 1fr 140px; gap: 20px 24px; align-items: end;
    padding: 18px 0; & + & { border-top: 1px solid ${LINE}; }
`;
const PlanName = styled.div`font-size: 15px; font-weight: 700; color: #14181F; padding-bottom: 10px;`;
const ContactRow = styled.div`display: grid; grid-template-columns: 1fr 1fr 100px; gap: 12px 24px; align-items: center; & + & { margin-top: 12px; }`;
const NoticeBar = styled.div`
    border: 1px solid ${LINE}; background: #fff; padding: 12px 16px; font-size: 15px; color: #14181F; line-height: 1.5;
`;
const GroupGrid = styled.div`display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px 24px;`;
const GroupBox = styled.div`border: 1px solid ${LINE}; padding: 16px 18px; display: flex; flex-direction: column; gap: 12px;`;
const GroupKey = styled.div`font-size: 15px; font-weight: 700; color: #14181F;`;
const CatTable = styled.table`
    width: 100%; border-collapse: collapse; border: 1px solid ${LINE};
    th { text-align: left; padding: 10px 14px; font-size: 14px; font-weight: 600; background: ${FILL_SOFT}; border-bottom: 1px solid ${LINE}; }
    td { padding: 8px 14px; font-size: 15px; border-bottom: 1px solid #e9ecf1; vertical-align: middle; }
    td.grp { font-weight: 700; background: ${FILL_SOFT}; width: 120px; }
`;

const LOG_ACTION = { excel_download: "CSV 다운로드", unmask: "전화번호 보기" };
const LOG_TAB = { policies: "가입자·배서", settlement: "정산 대사", claims: "사고 접수" };

const InsAdminSettingsPage = () => {
    const { admin } = useOutletContext();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [itemsText, setItemsText] = useState("");
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const s = await fetchInsuranceSettings();
                setSettings(s);
                setItemsText((s.coverage.items || []).join("\n"));
                setLogs(await fetchRecentAdminLogs(20));
            } catch (e) {
                console.error(e);
                setError("설정 불러오기 실패: " + e.message);
            }
            setLoading(false);
        })();
    }, []);

    const touch = (updater) => { setSaved(false); setSettings(updater); };
    const setPlan = (key, field, value) => touch((prev) => ({ ...prev, plans: { ...prev.plans, [key]: { ...prev.plans[key], [field]: value } } }));
    const setPerOrder = (field, value) => touch((prev) => ({ ...prev, perOrder: { ...prev.perOrder, [field]: value } }));
    const setGroup = (g, field, value) => touch((prev) => ({
        ...prev, perOrder: { ...prev.perOrder, groups: { ...prev.perOrder.groups, [g]: { ...prev.perOrder.groups[g], [field]: value } } },
    }));
    const setCategoryGroup = (categoryId, g) => touch((prev) => {
        const next = { ...prev.perOrder.categoryGroup };
        if (!g) delete next[categoryId]; else next[categoryId] = g;
        return { ...prev, perOrder: { ...prev.perOrder, categoryGroup: next } };
    });
    const setCoverage = (field, value) => touch((prev) => ({ ...prev, coverage: { ...prev.coverage, [field]: value } }));
    const setMaxByGroup = (g, value) => touch((prev) => ({ ...prev, coverage: { ...prev.coverage, maxByGroup: { ...prev.coverage.maxByGroup, [g]: value } } }));
    const setContact = (idx, field, value) => touch((prev) => {
        const list = [...prev.agencyContacts];
        list[idx] = { ...list[idx], [field]: value };
        return { ...prev, agencyContacts: list };
    });
    const addContact = () => touch((prev) => ({ ...prev, agencyContacts: [...prev.agencyContacts, { name: "", phone: "" }] }));
    const removeContact = (idx) => touch((prev) => ({ ...prev, agencyContacts: prev.agencyContacts.filter((_, i) => i !== idx) }));

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        setError("");
        try {
            const payload = { ...settings, coverage: { ...settings.coverage, items: itemsText.split("\n") } };
            await saveInsuranceSettings(payload, admin);
            setSettings((prev) => ({ ...prev, coverage: { ...prev.coverage, items: itemsText.split("\n").map((s) => s.trim()).filter(Boolean) } }));
            setSaved(true);
        } catch (e) {
            console.error(e);
            setError("저장 실패: " + e.message);
        }
        setSaving(false);
    };

    // 카테고리를 앱 화면 순서(CATEGORY_GROUPS)대로 묶어서 배정표에 그린다
    const categoryRows = useMemo(() => {
        const byId = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
        const used = new Set();
        const rows = CATEGORY_GROUPS.map((g) => ({
            label: g.label,
            cats: g.categoryIds.map((id) => { used.add(id); return byId[id]; }).filter(Boolean),
        }));
        const rest = CATEGORIES.filter((c) => !used.has(c.id));
        if (rest.length) rows.push({ label: "기타", cats: rest });
        return rows;
    }, []);

    if (loading) return <Page><Loading>불러오는 중...</Loading></Page>;
    if (!settings) return <Page><Empty>{error || "설정을 불러오지 못했습니다."}</Empty></Page>;

    const { plans, perOrder, coverage, agencyContacts } = settings;

    return (
        <Page>
            <PageHead>
                <div>
                    <PageTitle>설정</PageTitle>
                    <PageDesc>보험료·보장 문구·대리점 담당자를 편집합니다. 저장하면 사용자 안심케어 화면과 건당 보험료 계산에 바로 반영됩니다.</PageDesc>
                </div>
                <HeadRight>
                    {saved && <SavedText>저장되었습니다</SavedText>}
                    {error && <ErrorText>{error}</ErrorText>}
                    <Btn $primary onClick={handleSave} disabled={saving}>{saving ? "저장 중..." : "저장"}</Btn>
                </HeadRight>
            </PageHead>

            <NoticeBar>
                보험대리점 관리자는 기본 2명입니다. 권한은 홈프로 운영자가 회원 목록에서 부여하고, 전화번호 마스킹 해제도 운영자 승인 뒤에 풀립니다.
            </NoticeBar>

            <Section>
                <SectionHead>
                    <SectionTitle>1년 · 월 구독형 보험료</SectionTitle>
                    <SectionDesc>대표 확정 전 임시값입니다. 부가세 포함 원 단위. 연 보험료는 월보다 할인되게 잡습니다.</SectionDesc>
                </SectionHead>
                <SectionBody style={{ paddingTop: 4, paddingBottom: 4 }}>
                    <PlanRow>
                        <PlanName>1년 단체보험</PlanName>
                        <Field><FieldLabel>표시 이름</FieldLabel><Input value={plans.yearly.label} onChange={(e) => setPlan("yearly", "label", e.target.value)} /></Field>
                        <Field><FieldLabel>보험료 (원/년)</FieldLabel><Input type="number" min="0" value={plans.yearly.price} onChange={(e) => setPlan("yearly", "price", e.target.value)} /></Field>
                        <Field><Hint>결제일 +1년 · 토스 일반결제 1회</Hint></Field>
                        <CheckLabel><input type="checkbox" checked={!!plans.yearly.active} onChange={(e) => setPlan("yearly", "active", e.target.checked)} />판매 중</CheckLabel>
                    </PlanRow>
                    <PlanRow>
                        <PlanName>월 구독형 보험</PlanName>
                        <Field><FieldLabel>표시 이름</FieldLabel><Input value={plans.monthly.label} onChange={(e) => setPlan("monthly", "label", e.target.value)} /></Field>
                        <Field><FieldLabel>보험료 (원/월)</FieldLabel><Input type="number" min="0" value={plans.monthly.price} onChange={(e) => setPlan("monthly", "price", e.target.value)} /></Field>
                        <Field><Hint>매월 자동결제 · 결제일 +1개월 연장</Hint></Field>
                        <CheckLabel><input type="checkbox" checked={!!plans.monthly.active} onChange={(e) => setPlan("monthly", "active", e.target.checked)} />판매 중</CheckLabel>
                    </PlanRow>
                    <PlanRow>
                        <PlanName>건당 단기보험</PlanName>
                        <Field><FieldLabel>표시 이름</FieldLabel><Input value={plans.perOrder.label} onChange={(e) => setPlan("perOrder", "label", e.target.value)} /></Field>
                        <Field><FieldLabel>최소 보험료 (원)</FieldLabel><Input type="number" min="0" value={perOrder.minPrice} onChange={(e) => setPerOrder("minPrice", e.target.value)} /></Field>
                        <Field><Hint>요율은 아래 위험도 그룹에서 정합니다 (시공단가 × 그룹 요율)</Hint></Field>
                        <CheckLabel><input type="checkbox" checked={!!plans.perOrder.active} onChange={(e) => setPlan("perOrder", "active", e.target.checked)} />판매 중</CheckLabel>
                    </PlanRow>
                </SectionBody>
            </Section>

            <Section>
                <SectionHead>
                    <SectionTitle>건당 보험 위험도 그룹 요율</SectionTitle>
                    <SectionDesc>카테고리를 위험도 4그룹으로 나눠 그룹별 요율(%)을 적용합니다. 임시값 1.0 / 1.3 / 1.6 / 2.0%. 보장 한도가 그룹마다 다르면 여기에 적습니다.</SectionDesc>
                </SectionHead>
                <SectionBody>
                    <GroupGrid>
                        {RISK_GROUP_KEYS.map((g) => (
                            <GroupBox key={g}>
                                <GroupKey>{g.toUpperCase()}</GroupKey>
                                <Field><FieldLabel>그룹 이름</FieldLabel><Input value={perOrder.groups[g].label} onChange={(e) => setGroup(g, "label", e.target.value)} /></Field>
                                <Field><FieldLabel>요율 (%)</FieldLabel><Input type="number" min="0" step="0.1" value={perOrder.groups[g].rate} onChange={(e) => setGroup(g, "rate", e.target.value)} /></Field>
                                <Field><FieldLabel>보장 한도 문구</FieldLabel><Input value={coverage.maxByGroup[g] || ""} onChange={(e) => setMaxByGroup(g, e.target.value)} placeholder="예: 사고당 최대 1억원" /></Field>
                            </GroupBox>
                        ))}
                    </GroupGrid>
                    <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
                        <FieldLabel>배정 안 한 카테고리 기본 그룹</FieldLabel>
                        <Select value={perOrder.defaultGroup} onChange={(e) => setPerOrder("defaultGroup", e.target.value)}>
                            {RISK_GROUP_KEYS.map((g) => <option key={g} value={g}>{perOrder.groups[g].label} ({perOrder.groups[g].rate}%)</option>)}
                        </Select>
                    </div>
                </SectionBody>
            </Section>

            <Section>
                <SectionHead>
                    <SectionTitle>카테고리 → 그룹 배정표</SectionTitle>
                    <SectionDesc>대표가 배정표를 주기 전까지는 전부 기본 그룹입니다. "미지정"은 기본 그룹을 따릅니다.</SectionDesc>
                </SectionHead>
                <SectionBody>
                    <CatTable>
                        <thead>
                            <tr><th>분류</th><th>카테고리</th><th style={{ width: 260 }}>그룹</th><th style={{ width: 120 }}>적용 요율</th></tr>
                        </thead>
                        <tbody>
                            {categoryRows.map((row) => row.cats.map((c, i) => {
                                const assigned = perOrder.categoryGroup[c.id] || "";
                                const { rate } = rateForCategory(settings, c.id);
                                return (
                                    <tr key={c.id}>
                                        {i === 0 && <td className="grp" rowSpan={row.cats.length}>{row.label}</td>}
                                        <td>{c.name}</td>
                                        <td>
                                            <Select style={{ height: 36, width: "100%" }} value={assigned} onChange={(e) => setCategoryGroup(c.id, e.target.value)}>
                                                <option value="">미지정 (기본 {perOrder.groups[perOrder.defaultGroup].label})</option>
                                                {RISK_GROUP_KEYS.map((g) => <option key={g} value={g}>{perOrder.groups[g].label}</option>)}
                                            </Select>
                                        </td>
                                        <td style={{ fontWeight: 700 }}>{rate}%</td>
                                    </tr>
                                );
                            }))}
                        </tbody>
                    </CatTable>
                </SectionBody>
            </Section>

            <Section>
                <SectionHead>
                    <SectionTitle>보장 내용</SectionTitle>
                    <SectionDesc>보험사 확정 전에는 비워 둬도 됩니다. 비어 있으면 사용자 화면에 "보험사 확정 후 안내"로 나갑니다. 자기부담금은 공통 30만원이 기본입니다.</SectionDesc>
                </SectionHead>
                <SectionBody>
                    <FormGrid $cols={3}>
                        <Field>
                            <FieldLabel>보장 한도 문구 (공통)</FieldLabel>
                            <Input value={coverage.maxText} onChange={(e) => setCoverage("maxText", e.target.value)} placeholder="예: 사고당 최대 1억원" />
                            <Hint>그룹별 한도가 비어 있을 때 대신 보여 줍니다.</Hint>
                        </Field>
                        <Field>
                            <FieldLabel>자기부담금 문구</FieldLabel>
                            <Input value={coverage.deductibleText} onChange={(e) => setCoverage("deductibleText", e.target.value)} placeholder="30만원 (공통)" />
                        </Field>
                        <Field>
                            <FieldLabel>보장 항목 (한 줄에 하나)</FieldLabel>
                            <Textarea $h="120px" value={itemsText} onChange={(e) => { setItemsText(e.target.value); setSaved(false); }} placeholder={"작업 중 고객 재물 파손 배상\n작업 중 대인 피해 배상"} />
                        </Field>
                    </FormGrid>
                </SectionBody>
            </Section>

            <Section>
                <SectionHead>
                    <SectionTitle>대리점 담당자</SectionTitle>
                    <SectionDesc>사고가 접수되면 알림을 받을 담당자입니다. (알림톡 연동 전까지는 기록만 됩니다)</SectionDesc>
                </SectionHead>
                <SectionBody>
                    {agencyContacts.length === 0 ? (
                        <Note>등록된 담당자가 없습니다. 아래 버튼으로 추가하세요.</Note>
                    ) : (
                        <>
                            <ContactRow style={{ marginBottom: 2 }}>
                                <FieldLabel>이름</FieldLabel><FieldLabel>전화번호</FieldLabel><span />
                            </ContactRow>
                            {agencyContacts.map((c, i) => (
                                <ContactRow key={i}>
                                    <Input value={c.name || ""} onChange={(e) => setContact(i, "name", e.target.value)} placeholder="담당자 이름" />
                                    <Input value={c.phone || ""} onChange={(e) => setContact(i, "phone", e.target.value)} placeholder="010-0000-0000" />
                                    <SmallBtn onClick={() => removeContact(i)}>삭제</SmallBtn>
                                </ContactRow>
                            ))}
                        </>
                    )}
                    <div style={{ marginTop: 14 }}>
                        <SmallBtn onClick={addContact}>+ 행 추가</SmallBtn>
                    </div>
                </SectionBody>
            </Section>

            <Section>
                <SectionHead>
                    <SectionTitle>최근 조회 기록 20건</SectionTitle>
                    <SectionDesc>전화번호 보기(승인 건)·CSV 다운로드는 누가 언제 했는지 남습니다.</SectionDesc>
                </SectionHead>
                <TableWrap style={{ border: "none" }}>
                    <Table $minW="700px">
                        <thead>
                            <tr><Th>일시</Th><Th>관리자</Th><Th>행위</Th><Th>탭</Th><Th>대상</Th><Th>건수</Th><Th>승인</Th></tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr><Td colSpan={7}><Empty>기록이 없습니다.</Empty></Td></tr>
                            ) : logs.map((l) => (
                                <Tr key={l.id}>
                                    <Td>{formatDateTime(l.at)}</Td>
                                    <Td>{l.adminName || l.adminUid || "-"}</Td>
                                    <Td>{LOG_ACTION[l.action] || l.action}</Td>
                                    <Td>{LOG_TAB[l.tab] || l.tab || "-"}</Td>
                                    <Td>{l.target ? <Mono>{String(l.target).slice(0, 24)}</Mono> : "-"}</Td>
                                    <Td>{l.rows ?? "-"}</Td>
                                    <Td>{l.approvedBy || "-"}</Td>
                                </Tr>
                            ))}
                        </tbody>
                    </Table>
                </TableWrap>
            </Section>

            {settings.updatedAt && <Hint>마지막 저장: {formatDateTime(settings.updatedAt)}</Hint>}
        </Page>
    );
};

export default InsAdminSettingsPage;
