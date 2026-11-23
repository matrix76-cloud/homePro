/* eslint-disable */
/* 관리자 — 숨김 · 삭제 관리 (대표 리뷰 11/22)
 *  허위 오더 · 도배 · 타 플랫폼 유도 · 사기성 글을 운영자가 바로 숨기거나 지운다.
 *   - 숨김이 기본값: 글은 남기고 다른 회원에게만 안 보이게 한다. 작성자에게는 "운영자에 의해 숨김 처리되었습니다"로 보인다.
 *   - 삭제는 원본 전체를 처리 기록에 담은 뒤에 지운다.
 *   - 모든 처리는 [처리 기록] 탭에 언제 · 누가 · 무엇을 · 왜 로 남는다.
 *  주소: /admin/moderation · /admin/moderation/:filter (order · community · supplies · marketplace · training · brokerage · logs) */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import {
  MODERATION_TARGETS, getModerationTarget, listModerationItems, isHiddenForAdmin, getModerationLogs, ACTION_LABEL,
} from "../../service/ModerationService";
import ModerationDialog from "../../components/admin/ModerationDialog";

const PAGE_SIZE = 15;
const TABS = [...MODERATION_TARGETS.map((t) => ({ key: t.key, label: t.label })), { key: "logs", label: "처리 기록" }];
const HIDDEN_FILTERS = [
  { key: "all", label: "전체" },
  { key: "visible", label: "보이는 글" },
  { key: "hidden", label: "숨긴 글" },
];
const ACTION_FILTERS = [{ key: "all", label: "전체" }, { key: "hide", label: "숨김" }, { key: "unhide", label: "숨김 해제" }, { key: "delete", label: "삭제" }];
const ACTION_COLOR = { hide: "#B45309", unhide: THEME.primaryDark, delete: "#C62828" };
const USER_TYPE_LABEL = { business: "사업자", freelancer: "프리랜서", customer: "일반고객", guest: "둘러보기" };

const toDate = (v) => {
  if (!v) return null;
  const d = v.toDate ? v.toDate() : v.seconds ? new Date(v.seconds * 1000) : new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const p2 = (n) => String(n).padStart(2, "0");
const fmtDate = (v) => { const d = toDate(v); return d ? `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())}` : "-"; };
const fmtDateTime = (v) => { const d = toDate(v); return d ? `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}` : "-"; };
const ms = (v) => { const d = toDate(v); return d ? d.getTime() : 0; };

/** 원본 보기 — 값 하나를 글로 */
const showValue = (v) => {
  if (v == null || v === "") return "-";
  const d = (v?.toDate || v?.seconds) ? toDate(v) : null;
  if (d) return fmtDateTime(v);
  if (typeof v === "object") { try { return JSON.stringify(v, (k, x) => (x && typeof x === "object" && typeof x.seconds === "number" && typeof x.nanoseconds === "number" ? fmtDateTime(x) : x), 1); } catch (e) { return String(v); } }
  return String(v);
};
const imagesOf = (d) => [d?.images, d?.photos].find((a) => Array.isArray(a) && a.length) || [];

const AdminModerationPage = () => {
  const { filter } = useParams();
  const navigate = useNavigate();
  const tab = TABS.some((t) => t.key === filter) ? filter : "order";
  const target = getModerationTarget(tab);

  const [itemsByType, setItemsByType] = useState({});
  const [logs, setLogs] = useState(null);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hiddenFilter, setHiddenFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [sort, setSort] = useState({ key: "date", dir: "desc" });
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState({});
  const [dialog, setDialog] = useState(null);   // { action, items }
  const [detail, setDetail] = useState(null);   // 글 상세
  const [history, setHistory] = useState(null); // { item, logs } 글 하나의 처리 기록
  const [original, setOriginal] = useState(null); // 처리 기록의 원본
  const [member, setMember] = useState(null);   // 회원 상세 uid

  // 회원 이름 — 한 번만
  useEffect(() => {
    getDocs(collection(db, "users"))
      .then((snap) => { const m = {}; snap.docs.forEach((d) => { m[d.id] = d.data(); }); setUsers(m); })
      .catch(() => {});
  }, []);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      if (tab === "logs") {
        if (force || logs === null) setLogs(await getModerationLogs());
      } else if (force || !itemsByType[tab]) {
        const list = await listModerationItems(tab);
        setItemsByType((prev) => ({ ...prev, [tab]: list }));
      }
    } catch (e) {
      console.error("숨김 · 삭제 관리 조회 실패:", e);
      if (tab === "logs") setLogs((prev) => prev || []); else setItemsByType((prev) => ({ ...prev, [tab]: prev[tab] || [] }));
    }
    setLoading(false);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [tab, itemsByType, logs]);

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab]);
  // 탭 · 걸러 보기가 바뀌면 첫 쪽으로, 체크는 비운다
  useEffect(() => { setPage(1); setChecked({}); }, [tab, search, hiddenFilter, actionFilter]);
  useEffect(() => { setSearch(""); setHiddenFilter("all"); setActionFilter("all"); setSort({ key: "date", dir: "desc" }); }, [tab]);

  const authorOf = useCallback((item) => {
    if (!target) return "-";
    const uid = item[target.authorField];
    const u = users[uid] || {};
    return u.companyName || u.nickname || u.name || target.authorName(item) || (uid ? String(uid).slice(0, 8) : "-");
  }, [target, users]);

  /* ── 글 목록 ── */
  const items = itemsByType[tab] || [];
  const rows = useMemo(() => {
    if (!target) return [];
    const q = search.trim().toLowerCase();
    let list = items.filter((it) => {
      const hidden = isHiddenForAdmin(tab, it);
      if (hiddenFilter === "visible" && hidden) return false;
      if (hiddenFilter === "hidden" && !hidden) return false;
      if (q) {
        const hay = `${target.title(it)} ${target.body(it)} ${authorOf(it)} ${target.kind(it)} ${target.extra(it)} ${it.contactPhone || it.contact || it.phone || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const val = (it) => (
      sort.key === "date" ? ms(it.createdAt)
        : sort.key === "kind" ? target.kind(it)
        : sort.key === "title" ? target.title(it)
        : sort.key === "author" ? authorOf(it)
        : sort.key === "state" ? (isHiddenForAdmin(tab, it) ? 1 : 0)
        : 0
    );
    list = [...list].sort((a, b) => {
      const x = val(a); const y = val(b);
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "ko");
      return sort.dir === "asc" ? c : -c;
    });
    return list;
  }, [items, tab, target, search, hiddenFilter, sort, authorOf]);

  /* ── 처리 기록 ── */
  const logRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (logs || []).filter((l) => {
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (q) {
        const hay = `${l.targetTitle || ""} ${l.targetLabel || ""} ${l.authorName || ""} ${l.reason || ""} ${l.memo || ""} ${l.byAdmin?.name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, actionFilter]);

  const all = tab === "logs" ? logRows : rows;
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = all.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const checkedItems = tab === "logs" ? [] : rows.filter((it) => checked[it.id]);
  const pageAllChecked = tab !== "logs" && paged.length > 0 && paged.every((it) => checked[it.id]);

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "date" ? "desc" : "asc" }));
  const sortMark = (key) => (sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "");

  /* 처리 뒤 화면 맞추기 */
  const handleDone = ({ done, action }) => {
    if (!done.length) return;
    setItemsByType((prev) => {
      const cur = prev[tab] || [];
      if (action === "delete") {
        const gone = new Set(done.map((d) => d.item.id));
        return { ...prev, [tab]: cur.filter((it) => !gone.has(it.id)) };
      }
      const patch = {}; done.forEach((d) => { patch[d.item.id] = d.result; });
      return { ...prev, [tab]: cur.map((it) => (patch[it.id] ? { ...it, ...patch[it.id] } : it)) };
    });
    setChecked({});
    setLogs(null); // 처리 기록은 다음에 열 때 새로 읽는다
    setDetail((d) => {
      if (!d) return d;
      const hit = done.find((x) => x.item.id === d.id);
      if (!hit) return d;
      return action === "delete" ? null : { ...d, ...hit.result };
    });
  };

  const openHistory = async (item) => {
    setHistory({ item, logs: null });
    try { setHistory({ item, logs: await getModerationLogs({ targetType: tab, targetId: item.id }) }); }
    catch (e) { setHistory({ item, logs: [] }); }
  };

  const openDialog = (action, list, e) => { if (e) e.stopPropagation(); if (list.length) setDialog({ action, items: list }); };

  const memberData = member ? { uid: member, ...(users[member] || {}) } : null;

  return (
    <Wrap>
      <Header>
        <Title>숨김 · 삭제 관리</Title>
        <WhiteBtn type="button" onClick={() => load(true)}>새로고침</WhiteBtn>
      </Header>

      <TabBar>
        {TABS.map((t) => (
          <TabItem key={t.key} type="button" $active={tab === t.key} onClick={() => navigate(`/admin/moderation/${t.key}`)}>{t.label}</TabItem>
        ))}
      </TabBar>

      <Card>
        {/* 걸러 보는 줄 */}
        <FilterRow>
          <SearchInput
            placeholder={tab === "logs" ? "대상 · 사유 · 메모 · 처리자 검색" : "제목 · 내용 · 작성자 · 연락처 검색"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <SegBox>
            {(tab === "logs" ? ACTION_FILTERS : HIDDEN_FILTERS).map((f) => {
              const on = (tab === "logs" ? actionFilter : hiddenFilter) === f.key;
              return <SegItem key={f.key} type="button" $active={on} onClick={() => (tab === "logs" ? setActionFilter(f.key) : setHiddenFilter(f.key))}>{f.label}</SegItem>;
            })}
          </SegBox>
          <Total>총 {all.length.toLocaleString()}건</Total>
          {tab !== "logs" && (
            <BulkBtn type="button" disabled={!checkedItems.some((it) => !isHiddenForAdmin(tab, it))}
              onClick={() => openDialog("hide", checkedItems.filter((it) => !isHiddenForAdmin(tab, it)))}>
              선택한 {checkedItems.filter((it) => !isHiddenForAdmin(tab, it)).length}건 숨김
            </BulkBtn>
          )}
        </FilterRow>

        <TableWrap>
          {tab === "logs" ? (
            <Table style={{ minWidth: 1180 }}>
              <thead>
                <tr>
                  <Th style={{ width: 56 }}>번호</Th>
                  <Th style={{ width: 150 }}>처리 일시</Th>
                  <Th style={{ width: 90 }}>처리</Th>
                  <Th style={{ width: 100 }}>구분</Th>
                  <Th>대상</Th>
                  <Th style={{ width: 130 }}>작성자</Th>
                  <Th style={{ width: 130 }}>사유</Th>
                  <Th>메모</Th>
                  <Th style={{ width: 100 }}>처리자</Th>
                  <Th style={{ width: 96 }}>원본</Th>
                </tr>
              </thead>
              <tbody>
                {paged.map((l, i) => (
                  <tr key={l.id}>
                    <Td>{all.length - ((safePage - 1) * PAGE_SIZE + i)}</Td>
                    <Td>{fmtDateTime(l.at)}</Td>
                    <Td style={{ color: ACTION_COLOR[l.action] || THEME.text, fontWeight: 500 }}>{ACTION_LABEL[l.action] || l.action}{l.failed ? " (실패)" : ""}</Td>
                    <Td>{l.targetLabel || l.targetType}</Td>
                    <Td $wrap>{l.targetTitle || l.targetId}</Td>
                    <Td $wrap>
                      {l.authorUid
                        ? <NameBtn type="button" onClick={() => setMember(l.authorUid)}>{users[l.authorUid]?.companyName || users[l.authorUid]?.nickname || users[l.authorUid]?.name || l.authorName || String(l.authorUid).slice(0, 8)}</NameBtn>
                        : (l.authorName || "-")}
                    </Td>
                    <Td $wrap>{l.reason || "-"}</Td>
                    <Td $wrap>{l.memo || "-"}</Td>
                    <Td>{l.byAdmin?.name || "-"}</Td>
                    <Td>{l.snapshot ? <RowBtn type="button" onClick={() => setOriginal(l)}>원본 보기</RowBtn> : "-"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Table style={{ minWidth: 1100 }}>
              <thead>
                <tr>
                  <Th style={{ width: 44 }}>
                    <input type="checkbox" checked={pageAllChecked} onChange={(e) => {
                      const on = e.target.checked;
                      setChecked((prev) => { const next = { ...prev }; paged.forEach((it) => { if (on) next[it.id] = true; else delete next[it.id]; }); return next; });
                    }} />
                  </Th>
                  <Th style={{ width: 56 }}>번호</Th>
                  <SortTh style={{ width: 104 }} onClick={() => toggleSort("date")}>등록일{sortMark("date")}</SortTh>
                  <SortTh style={{ width: 130 }} onClick={() => toggleSort("kind")}>구분{sortMark("kind")}</SortTh>
                  <SortTh onClick={() => toggleSort("title")}>제목{sortMark("title")}</SortTh>
                  <SortTh style={{ width: 140 }} onClick={() => toggleSort("author")}>작성자{sortMark("author")}</SortTh>
                  <SortTh style={{ width: 150 }} onClick={() => toggleSort("state")}>상태{sortMark("state")}</SortTh>
                  <Th style={{ width: 236 }}>관리</Th>
                </tr>
              </thead>
              <tbody>
                {paged.map((it, i) => {
                  const hidden = isHiddenForAdmin(tab, it);
                  const uid = it[target.authorField];
                  return (
                    <Tr key={it.id} onClick={() => setDetail(it)}>
                      <Td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={!!checked[it.id]} onChange={(e) => {
                          const on = e.target.checked;
                          setChecked((prev) => { const next = { ...prev }; if (on) next[it.id] = true; else delete next[it.id]; return next; });
                        }} />
                      </Td>
                      <Td>{all.length - ((safePage - 1) * PAGE_SIZE + i)}</Td>
                      <Td>{fmtDate(it.createdAt)}</Td>
                      <Td $wrap>{target.kind(it) || "-"}</Td>
                      <Td $wrap>
                        <RowTitle>{target.title(it)}</RowTitle>
                        {target.extra(it) && <RowSub>{target.extra(it)}</RowSub>}
                      </Td>
                      <Td $wrap onClick={(e) => e.stopPropagation()}>
                        {uid ? <NameBtn type="button" onClick={() => setMember(uid)}>{authorOf(it)}</NameBtn> : authorOf(it)}
                      </Td>
                      <Td $wrap>
                        {hidden ? (
                          <>
                            <StateText $hidden>숨김</StateText>
                            <RowSub>{it.adminHiddenReason || (it.adminHidden ? "" : "신고 처리로 가림")}</RowSub>
                          </>
                        ) : <StateText>보임</StateText>}
                      </Td>
                      <Td onClick={(e) => e.stopPropagation()}>
                        {hidden
                          ? <RowBtn type="button" onClick={(e) => openDialog("unhide", [it], e)}>숨김 해제</RowBtn>
                          : <RowBtn type="button" onClick={(e) => openDialog("hide", [it], e)}>숨김</RowBtn>}
                        <RowBtn type="button" $danger onClick={(e) => openDialog("delete", [it], e)}>삭제</RowBtn>
                        <RowBtn type="button" onClick={() => openHistory(it)}>기록</RowBtn>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          {loading && <Empty><Ring /></Empty>}
          {!loading && all.length === 0 && (
            <Empty>{tab === "logs" ? "처리 기록이 없습니다." : hiddenFilter === "hidden" ? "숨긴 글이 없습니다." : "글이 없습니다."}</Empty>
          )}
        </TableWrap>

        <PagerRow>
          <span />
          <Pager>
            <WhiteBtn type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>이전</WhiteBtn>
            <PageNo>{safePage} / {totalPages}</PageNo>
            <WhiteBtn type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>다음</WhiteBtn>
          </Pager>
          <Total style={{ textAlign: "right" }}>총 {all.length.toLocaleString()}건</Total>
        </PagerRow>
      </Card>

      {/* 글 상세 */}
      {detail && target && (
        <Overlay onClick={() => setDetail(null)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHead>
              <h2>{target.label} 상세</h2>
              <WhiteBtn type="button" onClick={() => setDetail(null)}>닫기</WhiteBtn>
            </ModalHead>
            <ModalBody>
              <InfoRow><em>제목</em><span>{target.title(detail)}</span></InfoRow>
              <InfoRow><em>구분</em><span>{target.kind(detail) || "-"}</span></InfoRow>
              <InfoRow><em>요약</em><span>{target.extra(detail) || "-"}</span></InfoRow>
              <InfoRow>
                <em>작성자</em>
                <span>{detail[target.authorField] ? <NameBtn type="button" onClick={() => setMember(detail[target.authorField])}>{authorOf(detail)}</NameBtn> : authorOf(detail)}</span>
              </InfoRow>
              <InfoRow><em>연락처</em><span>{detail.contactPhone || detail.contact || detail.phone || detail.authorPhone || "-"}</span></InfoRow>
              <InfoRow><em>등록일</em><span>{fmtDateTime(detail.createdAt)}</span></InfoRow>
              <InfoRow>
                <em>상태</em>
                <span>
                  {isHiddenForAdmin(tab, detail)
                    ? <StateText $hidden>숨김{detail.adminHiddenReason ? ` — ${detail.adminHiddenReason}` : detail.adminHidden ? "" : " — 신고 처리로 가림"}{detail.adminHiddenBy ? ` · ${detail.adminHiddenBy} · ${fmtDateTime(detail.adminHiddenAt)}` : ""}</StateText>
                    : <StateText>보임</StateText>}
                </span>
              </InfoRow>
              <InfoRow $top><em>내용</em><span style={{ whiteSpace: "pre-wrap" }}>{target.body(detail) || "-"}</span></InfoRow>
              {imagesOf(detail).length > 0 && (
                <InfoRow $top>
                  <em>사진</em>
                  <Photos>{imagesOf(detail).map((src, i) => <a key={i} href={src} target="_blank" rel="noreferrer"><img src={src} alt="" /></a>)}</Photos>
                </InfoRow>
              )}
              <InfoRow><em>앱 화면</em><span><a href={target.appPath(detail.id)} target="_blank" rel="noreferrer">{target.appPath(detail.id)}</a> (숨긴 글은 작성자 계정으로만 열립니다)</span></InfoRow>
            </ModalBody>
            <ModalFoot>
              <WhiteBtn type="button" onClick={() => openHistory(detail)}>처리 기록</WhiteBtn>
              <span style={{ flex: 1 }} />
              <WhiteBtn type="button" $danger onClick={() => openDialog("delete", [detail])}>삭제</WhiteBtn>
              {isHiddenForAdmin(tab, detail)
                ? <WhiteBtn type="button" onClick={() => openDialog("unhide", [detail])}>숨김 해제</WhiteBtn>
                : <SolidBtn type="button" onClick={() => openDialog("hide", [detail])}>숨김</SolidBtn>}
            </ModalFoot>
          </Modal>
        </Overlay>
      )}

      {/* 글 하나의 처리 기록 */}
      {history && target && (
        <Overlay onClick={() => setHistory(null)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHead>
              <h2>처리 기록</h2>
              <WhiteBtn type="button" onClick={() => setHistory(null)}>닫기</WhiteBtn>
            </ModalHead>
            <ModalBody>
              <InfoRow><em>대상</em><span>{target.title(history.item)}</span></InfoRow>
              {history.logs === null && <Empty><Ring /></Empty>}
              {history.logs && history.logs.length === 0 && <Empty>이 글에 남은 처리 기록이 없습니다.</Empty>}
              {history.logs && history.logs.map((l) => (
                <LogLine key={l.id}>
                  <b style={{ color: ACTION_COLOR[l.action] || THEME.text }}>{ACTION_LABEL[l.action] || l.action}</b>
                  <span>{fmtDateTime(l.at)} · {l.byAdmin?.name || "-"}</span>
                  <p>{l.reason ? `사유: ${l.reason}` : "사유 없음"}{l.memo ? `\n메모: ${l.memo}` : ""}</p>
                  {l.snapshot && <RowBtn type="button" onClick={() => setOriginal(l)}>그때의 원본 보기</RowBtn>}
                </LogLine>
              ))}
            </ModalBody>
          </Modal>
        </Overlay>
      )}

      {/* 처리 기록에 담아 둔 원본 */}
      {original && (
        <Overlay onClick={() => setOriginal(null)} style={{ zIndex: 1150 }}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHead>
              <h2>보관된 원본 — {original.targetLabel} · {ACTION_LABEL[original.action]} {fmtDateTime(original.at)}</h2>
              <WhiteBtn type="button" onClick={() => setOriginal(null)}>닫기</WhiteBtn>
            </ModalHead>
            <ModalBody>
              <InfoRow><em>문서 번호</em><span>{original.targetId}</span></InfoRow>
              {Object.keys(original.snapshot || {}).sort().map((k) => (
                <InfoRow key={k} $top><em>{k}</em><span style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{showValue(original.snapshot[k])}</span></InfoRow>
              ))}
            </ModalBody>
          </Modal>
        </Overlay>
      )}

      {/* 회원 상세 */}
      {memberData && (
        <Overlay onClick={() => setMember(null)} style={{ zIndex: 1160 }}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHead>
              <h2>회원 상세</h2>
              <WhiteBtn type="button" onClick={() => setMember(null)}>닫기</WhiteBtn>
            </ModalHead>
            <ModalBody>
              <InfoRow><em>상호</em><span>{memberData.companyName || "-"}</span></InfoRow>
              <InfoRow><em>이름</em><span>{memberData.name || "-"}</span></InfoRow>
              <InfoRow><em>대화명</em><span>{memberData.nickname || "-"}</span></InfoRow>
              <InfoRow><em>연락처</em><span>{memberData.phone || memberData.phoneNumber || "-"}</span></InfoRow>
              <InfoRow><em>회원 유형</em><span>{USER_TYPE_LABEL[memberData.userType] || (memberData.role === "pro" ? "사업자(프로)" : memberData.userType || "-")}</span></InfoRow>
              <InfoRow><em>가입일</em><span>{fmtDateTime(memberData.createdAt)}</span></InfoRow>
              <InfoRow><em>오더 차단</em><span>{memberData.orderBlocked ? "권한 차단 중" : "-"}</span></InfoRow>
              <InfoRow><em>회원 번호</em><span style={{ wordBreak: "break-all" }}>{memberData.uid}</span></InfoRow>
            </ModalBody>
            <ModalFoot>
              <span style={{ flex: 1 }} />
              <WhiteBtn type="button" onClick={() => navigate("/admin/users")}>회원 관리로 가기</WhiteBtn>
            </ModalFoot>
          </Modal>
        </Overlay>
      )}

      {dialog && (
        <ModerationDialog
          action={dialog.action}
          targetKey={tab}
          items={dialog.items}
          onClose={() => setDialog(null)}
          onDone={handleDone}
        />
      )}
    </Wrap>
  );
};

export default AdminModerationPage;

/* ─── Styled ─── */
const LINE = "#D9DDE3";
const spin = keyframes` to { transform: rotate(360deg); } `;

const Wrap = styled.div` color: ${THEME.text}; `;
const Header = styled.div` display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; `;
const Title = styled.h1` font-size: 24px; font-weight: 600; margin: 0; `;

const WhiteBtn = styled.button`
  height: 38px; padding: 0 14px; font-size: 15px; font-family: inherit; cursor: pointer;
  color: ${(p) => (p.$danger ? "#C62828" : THEME.text)}; background: #fff; border: 1px solid ${LINE}; border-radius: 4px;
  &:hover { border-color: ${(p) => (p.$danger ? "#C62828" : THEME.text)}; }
  &:disabled { opacity: 0.45; cursor: default; border-color: ${LINE}; }
`;
const SolidBtn = styled.button`
  height: 38px; min-width: 84px; padding: 0 16px; font-size: 15px; font-weight: 500; font-family: inherit; cursor: pointer;
  color: #fff; background: ${THEME.primaryDark}; border: none; border-radius: 4px;
`;

/* 탭 — 한 박스로 묶고 사이에만 세로선, 열린 탭은 연회색 면 + 굵은 글씨 */
const TabBar = styled.div` display: inline-flex; flex-wrap: wrap; border: 1px solid ${LINE}; margin-bottom: 16px; background: #fff; `;
const TabItem = styled.button`
  padding: 10px 18px; font-size: 15px; font-family: inherit; cursor: pointer; border: none;
  font-weight: ${(p) => (p.$active ? 600 : 400)}; color: ${THEME.text};
  background: ${(p) => (p.$active ? "#e9ecf1" : "#fff")};
  & + & { border-left: 1px solid ${LINE}; }
`;

const Card = styled.div` background: #fff; border: 1px solid ${LINE}; border-radius: 4px; `;
const FilterRow = styled.div` display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 14px 16px; border-bottom: 1px solid ${LINE}; `;
const SearchInput = styled.input`
  width: 320px; max-width: 100%; height: 38px; box-sizing: border-box; padding: 0 12px;
  font-size: 15px; font-family: inherit; color: ${THEME.text}; border: 1px solid ${LINE}; border-radius: 4px; outline: none;
  &:focus { border-color: ${THEME.primaryDark}; }
`;
const SegBox = styled.div` display: inline-flex; border: 1px solid ${LINE}; `;
const SegItem = styled.button`
  height: 36px; padding: 0 14px; font-size: 15px; font-family: inherit; cursor: pointer; border: none;
  font-weight: ${(p) => (p.$active ? 600 : 400)}; color: ${THEME.text};
  background: ${(p) => (p.$active ? "#e9ecf1" : "#fff")};
  & + & { border-left: 1px solid ${LINE}; }
`;
const Total = styled.div` font-size: 15px; margin-left: auto; `;
const BulkBtn = styled(WhiteBtn)``;

/* 줄 수가 달라져도 표 자리가 흔들리지 않게 최소 높이를 잡아 둔다 */
const TableWrap = styled.div` overflow-x: auto; min-height: 560px; `;
const Table = styled.table` width: 100%; border-collapse: collapse; `;
const Th = styled.th`
  text-align: left; padding: 10px 12px; font-size: 14px; font-weight: 500; color: ${THEME.text};
  background: ${THEME.background}; border-bottom: 1px solid ${LINE}; white-space: nowrap;
`;
const SortTh = styled(Th)` cursor: pointer; user-select: none; `;
const Tr = styled.tr` cursor: pointer; &:hover td { background: #FAFBFC; } `;
const Td = styled.td`
  padding: 10px 12px; font-size: 15px; line-height: 1.5; color: ${THEME.text}; border-bottom: 1px solid #E5E7EB; vertical-align: top;
  white-space: ${(p) => (p.$wrap ? "normal" : "nowrap")}; word-break: keep-all;
`;
const RowTitle = styled.div` font-size: 15px; `;
const RowSub = styled.div` font-size: 14px; margin-top: 2px; `;
const StateText = styled.span` font-size: 15px; font-weight: 500; color: ${(p) => (p.$hidden ? "#C62828" : THEME.primaryDark)}; `;
const NameBtn = styled.button`
  padding: 0; border: none; background: none; cursor: pointer; font-size: 15px; font-family: inherit; text-align: left;
  color: ${THEME.text}; text-decoration: underline; text-underline-offset: 3px; word-break: keep-all;
`;
const RowBtn = styled.button`
  height: 32px; padding: 0 10px; margin-right: 6px; font-size: 14px; font-family: inherit; cursor: pointer;
  color: ${(p) => (p.$danger ? "#C62828" : THEME.text)}; background: #fff; border: 1px solid ${LINE}; border-radius: 4px;
  &:hover { border-color: ${(p) => (p.$danger ? "#C62828" : THEME.text)}; }
`;
const Empty = styled.div` display: flex; align-items: center; justify-content: center; padding: 70px 0; font-size: 15px; `;
const Ring = styled.i`
  width: 22px; height: 22px; border-radius: 50%; border: 2px solid ${LINE}; border-top-color: ${THEME.primaryDark};
  animation: ${spin} 0.8s linear infinite;
`;
const PagerRow = styled.div` display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 14px 16px; border-top: 1px solid ${LINE}; `;
const Pager = styled.div` display: flex; align-items: center; gap: 12px; `;
const PageNo = styled.span` font-size: 15px; min-width: 64px; text-align: center; `;

const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 1100; background: rgba(20, 24, 31, 0.45);
  display: flex; align-items: center; justify-content: center; padding: 24px;
`;
/* 창 높이는 어떤 내용이든 같게 — 넘치면 안에서 스크롤 */
const Modal = styled.div`
  width: 720px; max-width: 100%; height: 680px; max-height: calc(100vh - 48px);
  background: #fff; border: 1px solid ${LINE}; border-radius: 4px; display: flex; flex-direction: column; color: ${THEME.text};
`;
const ModalHead = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; border-bottom: 1px solid ${LINE};
  h2 { margin: 0; font-size: 18px; font-weight: 600; word-break: keep-all; }
`;
const ModalBody = styled.div` flex: 1; min-height: 0; overflow-y: auto; padding: 8px 20px 16px; `;
const ModalFoot = styled.div` display: flex; align-items: center; gap: 8px; padding: 14px 20px; border-top: 1px solid ${LINE}; `;
const InfoRow = styled.div`
  display: flex; align-items: ${(p) => (p.$top ? "flex-start" : "center")}; gap: 16px; padding: 11px 0; border-bottom: 1px solid #EEF0F3;
  em { flex: 0 0 96px; font-style: normal; font-size: 14px; }
  > span { flex: 1; min-width: 0; font-size: 15px; line-height: 1.55; word-break: keep-all; }
  a { color: ${THEME.primaryDark}; }
`;
const Photos = styled.div`
  flex: 1; display: flex; flex-wrap: wrap; gap: 8px;
  img { width: 96px; height: 96px; object-fit: cover; display: block; border: 1px solid ${LINE}; }
`;
const LogLine = styled.div`
  padding: 14px 0; border-bottom: 1px solid #EEF0F3;
  b { font-size: 15px; font-weight: 600; margin-right: 10px; }
  > span { font-size: 14px; }
  p { margin: 6px 0 8px; font-size: 15px; line-height: 1.55; white-space: pre-wrap; word-break: keep-all; }
`;
