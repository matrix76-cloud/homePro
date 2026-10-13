/**
 * 보험 1:1 문의 /insurance/inquiry (대표 리뷰 2026-10-06)
 *   문의 유형·제목·내용을 적어 등록 → 문의마다 채팅방이 하나 생기고 그 방으로 바로 들어간다.
 *   관리자 답변은 그 채팅방(채팅 목록의 '보험문의')으로 온다. 아래에는 내가 남긴 문의 목록.
 */
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { useAuth } from "../../context/AuthContext";
import {
  INQUIRY_TYPES, createInsuranceInquiry, listMyInsuranceInquiries, isInquiryUnanswered,
} from "../../service/InsuranceInquiryService";
import {
  Wrap, Card, CardTitle, CardText, PrimaryBtn, FixedBar, Toast, Label, Input, Textarea, Field, Empty,
} from "./insuranceStyles";
import usePcWide from "../../hooks/usePcWide";

const BODY_MAX = 2000;

const fmt = (v) => {
  const d = v?.toDate ? v.toDate() : v?.seconds ? new Date(v.seconds * 1000) : null;
  if (!d) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
};

const InsuranceInquiryPage = () => {
  const navigate = useNavigate();
  const pcWide = usePcWide();
  const { userData } = useAuth();
  const uid = userData?.uid;

  const [type, setType] = useState(INQUIRY_TYPES[0]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState(null); // null = 불러오는 중
  const [toast, setToast] = useState("");
  const showToast = useCallback((m) => { setToast(m); setTimeout(() => setToast(""), 2400); }, []);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    listMyInsuranceInquiries(uid).then((l) => { if (alive) setMine(l); }).catch(() => { if (alive) setMine([]); });
    return () => { alive = false; };
  }, [uid]);

  const submit = async () => {
    if (busy) return;
    if (!title.trim()) { showToast("제목을 입력해 주세요"); return; }
    if (!body.trim()) { showToast("문의 내용을 입력해 주세요"); return; }
    setBusy(true);
    try {
      const roomId = await createInsuranceInquiry({
        uid,
        name: userData?.companyName || userData?.nickname || userData?.name || "홈프로",
        photo: userData?.photoURL || userData?.profileImage || "",
        type, title, body,
      });
      navigate(`/chat/${roomId}`, { replace: true });
    } catch (e) {
      showToast(e?.message || "문의를 등록하지 못했습니다");
      setBusy(false);
    }
  };

  const submitBtn = (
    <PrimaryBtn type="button" onClick={submit} disabled={busy}>{busy ? "등록하는 중..." : "문의 등록"}</PrimaryBtn>
  );

  return (
    <SimpleBackLayout NAME="보험 1:1 문의" hideFooter>
      <Wrap $bottom={110} className={pcWide ? "ins-pc" : undefined}>
        <Card>
          <CardTitle>문의하기</CardTitle>
          <CardText>보장 범위, 가입, 사고 접수 등 보험에 관해 궁금한 점을 남겨 주세요. 답변은 채팅 목록의 '보험문의'로 옵니다.</CardText>
          <div style={{ marginTop: 18 }}>
            <Field>
              <Label>문의 유형</Label>
              <TypeGrid>
                {INQUIRY_TYPES.map((t) => (
                  <TypeBtn key={t} type="button" $on={type === t} onClick={() => setType(t)}>{t}</TypeBtn>
                ))}
              </TypeGrid>
            </Field>
            <Field>
              <Label htmlFor="inq-title">제목</Label>
              <Input id="inq-title" value={title} maxLength={60} placeholder="문의 제목" onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field>
              <Label htmlFor="inq-body">내용</Label>
              <Textarea id="inq-body" value={body} maxLength={BODY_MAX} placeholder="문의 내용을 적어 주세요" onChange={(e) => setBody(e.target.value)} />
            </Field>
          </div>
          {pcWide && <div style={{ marginTop: 18, maxWidth: 260 }}>{submitBtn}</div>}
        </Card>

        <Card>
          <CardTitle>내 문의</CardTitle>
          {mine === null ? (
            <Empty>불러오는 중...</Empty>
          ) : mine.length === 0 ? (
            <Empty>아직 남긴 문의가 없습니다.</Empty>
          ) : (
            mine.map((r) => (
              <MineRow key={r.id} type="button" onClick={() => navigate(`/chat/${r.id}`)}>
                <MineTitle>{r.inquiryTitle || "보험 문의"}</MineTitle>
                <MineMeta>
                  {r.inquiryType} · {fmt(r.createdAt)} ·{" "}
                  <b style={{ color: isInquiryUnanswered(r) ? "#B45309" : THEME.primaryDark }}>{isInquiryUnanswered(r) ? "답변 대기" : "답변 완료"}</b>
                </MineMeta>
              </MineRow>
            ))
          )}
        </Card>
      </Wrap>
      {!pcWide && <FixedBar>{submitBtn}</FixedBar>}
      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default InsuranceInquiryPage;

const TypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`;
const TypeBtn = styled.button`
  min-height: 52px;
  padding: 10px 8px;
  border: 1px solid ${({ $on }) => ($on ? THEME.primary : "#d9dde3")};
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${({ $on }) => ($on ? THEME.primaryDark : THEME.text)};
  font-size: 15px;
  font-weight: ${({ $on }) => ($on ? 700 : 500)};
  font-family: inherit;
  word-break: keep-all;
  cursor: pointer;
`;
const MineRow = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: 14px 0;
  background: none;
  border: none;
  border-top: 1px solid ${THEME.border};
  font-family: inherit;
  cursor: pointer;
  &:first-of-type { border-top: none; }
`;
const MineTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
  word-break: keep-all;
`;
const MineMeta = styled.div`
  margin-top: 4px;
  font-size: 14px;
  color: ${THEME.text};
  b { font-weight: 700; }
`;
