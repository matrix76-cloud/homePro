/* eslint-disable */
/**
 * 현장 작업기록 — 체크인(Before) / 작업 중 특이사항 / 체크아웃(After)
 *
 * 대표님 지시(2026-08-04 리뷰 order-create) 구현 화면.
 *  - 기록은 배정된 홈프로만 등록, 접수자와 홈프로 둘 다 열람 (양쪽의 불안 해소가 목적)
 *  - 체크인 없이는 체크아웃 불가 = Before/After 짝 강제
 *  - 체크아웃 화면에는 체크인 사진을 같이 띄워 같은 위치·각도로 찍도록 유도
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { useAuth } from "../../context/AuthContext";
import { getOrder, addOrderLog, updateOrderStatus } from "../../service/OrderService";
import {
  WORKLOG_TYPES, WORKLOG_LABELS, WORKLOG_PHOTO_HINT, GEO_ERROR_TEXT,
  addWorkLog, getWorkLogs, summarizeLogs, compressEvidencePhoto, getCurrentGeo,
} from "../../service/WorkLogService";
import {
  IoCameraOutline, IoLocationOutline, IoTimeOutline, IoCloseOutline,
  IoCheckmarkCircle, IoAlertCircleOutline, IoShieldCheckmarkOutline,
} from "react-icons/io5";

const MAX_PHOTOS = 5;

const fmtTime = (v) => {
  if (!v) return "";
  const d = v?.toDate?.() || (typeof v === "string" ? new Date(v) : v);
  if (!d || Number.isNaN(d.getTime?.())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const WorkLogPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, userData } = useAuth();
  const uid = userData?.uid || user?.uid;
  const myName = userData?.nickname || userData?.name || "사용자";

  const [order, setOrder] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // 등록 시트
  const [sheetType, setSheetType] = useState(null);   // WORKLOG_TYPES | null
  const [photos, setPhotos] = useState([]);           // { blob, url, capturedAt }
  const [note, setNote] = useState("");
  const [geoState, setGeoState] = useState(null);     // { geo, geoError }
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const fileRef = useRef(null);
  const [viewer, setViewer] = useState(null);

  const showToast = useCallback((m) => { setToast(m); setTimeout(() => setToast(""), 2200); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [o, ls] = await Promise.all([getOrder(orderId), getWorkLogs(orderId)]);
    setOrder(o);
    setLogs(ls);
    setLoading(false);
    return { o, ls };
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const { checkIn, checkOut } = useMemo(() => summarizeLogs(logs), [logs]);
  const isWorker = !!order && order.matchedProUid === uid;
  const isOwner = !!order && order.createdBy === uid;
  const canWrite = isWorker && !checkOut;

  // 카드에서 넘어올 때 열 시트를 지정(?open=checkin) — 버튼 한 번으로 바로 등록 흐름 진입
  const requested = params.get("open");
  useEffect(() => {
    if (loading || !requested || sheetType) return;
    if (!isWorker) return;
    if (requested === WORKLOG_TYPES.CHECKIN && !checkIn) openSheet(WORKLOG_TYPES.CHECKIN);
    if (requested === WORKLOG_TYPES.CHECKOUT && checkIn && !checkOut) openSheet(WORKLOG_TYPES.CHECKOUT);
  }, [loading, requested, isWorker, checkIn, checkOut]); // eslint-disable-line

  const openSheet = async (type) => {
    // 체크인은 캐시백 입금 확인·보험 적용과 무관하게 열어 둔다 (대표 9/14 카톡). 좌표 없음만 막는다
    setSheetType(type);
    setPhotos([]);
    setNote("");
    setGeoState(null);
    // 위치는 시트를 여는 즉시 백그라운드로 취득 — 등록 버튼에서 기다리지 않게
    const g = await getCurrentGeo();
    setGeoState(g);
  };

  const closeSheet = () => {
    if (busy) return;
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setSheetType(null);
    setPhotos([]);
    setNote("");
  };

  const handleFiles = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) { showToast(`사진은 최대 ${MAX_PHOTOS}장까지 첨부됩니다`); return; }
    setPreparing(true);
    try {
      const next = [];
      for (const f of files.slice(0, room)) {
        const blob = await compressEvidencePhoto(f);
        next.push({ blob, url: URL.createObjectURL(blob), capturedAt: new Date(f.lastModified || Date.now()).toISOString() });
      }
      setPhotos((prev) => [...prev, ...next]);
      if (files.length > room) showToast(`사진은 최대 ${MAX_PHOTOS}장까지 첨부됩니다`);
    } catch (err) {
      showToast(err.message || "사진 처리에 실패했습니다");
    }
    setPreparing(false);
  };

  const removePhoto = (idx) => {
    setPhotos((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const submit = async () => {
    if (busy) return;
    const needPhoto = sheetType !== WORKLOG_TYPES.PROGRESS;
    if (needPhoto && photos.length === 0) { showToast("사진을 최소 1장 첨부해 주세요"); return; }
    if (sheetType === WORKLOG_TYPES.PROGRESS && photos.length === 0 && !note.trim()) {
      showToast("사진 또는 내용을 입력해 주세요"); return;
    }
    if (sheetType === WORKLOG_TYPES.CHECKOUT && !checkIn) {
      showToast("현장 체크인을 먼저 등록해 주세요"); return;
    }

    setBusy(true);
    try {
      // 시트를 여는 사이 위치를 못 받았으면 여기서 한 번 더 시도
      const g = geoState || await getCurrentGeo();
      // 좌표 없는 체크인·체크아웃 차단 (대표 9/12 회신) — 보험 증빙에 위치가 필수
      if ((sheetType === WORKLOG_TYPES.CHECKIN || sheetType === WORKLOG_TYPES.CHECKOUT) && !g?.geo) {
        showToast(g?.geoError === "denied" ? "위치 권한을 허용해야 체크인·체크아웃할 수 있어요" : "위치를 확인하지 못했어요. 잠시 후 다시 시도해 주세요");
        setBusy(false); return;
      }
      await addWorkLog(orderId, {
        type: sheetType,
        byUid: uid,
        byName: myName,
        note,
        photos,
        geo: g.geo,
        geoError: g.geoError,
      });
      await addOrderLog(orderId, {
        type: "worklog",
        message: `${WORKLOG_LABELS[sheetType]} 등록 (사진 ${photos.length}장${g.geo ? ", 위치 기록됨" : ""})`,
        byUid: uid, byName: myName, byRole: "홈프로",
      });

      // 체크아웃 = 작업완료. 기존 완료 처리와 어긋나지 않게 상태도 함께 넘긴다.
      if (sheetType === WORKLOG_TYPES.CHECKOUT) {
        try {
          await updateOrderStatus(orderId, "완료");
          await addOrderLog(orderId, {
            type: "status", message: "상태 변경 → 완료 (체크아웃)",
            byUid: uid, byName: myName, byRole: "홈프로",
          });
        } catch (err) {
          console.warn("체크아웃 상태 변경 실패:", err.message);
        }
      }

      photos.forEach((p) => URL.revokeObjectURL(p.url));
      setSheetType(null);
      setPhotos([]);
      setNote("");
      await load();
      showToast(sheetType === WORKLOG_TYPES.CHECKOUT ? "작업완료로 처리되었습니다" : "기록이 등록되었습니다");
    } catch (err) {
      showToast(err.message || "등록에 실패했습니다");
    }
    setBusy(false);
  };

  if (loading) {
    return (
      <SimpleBackLayout NAME="현장기록" hideFooter>
        <Wrap><Placeholder>불러오는 중...</Placeholder></Wrap>
      </SimpleBackLayout>
    );
  }

  if (!order) {
    return (
      <SimpleBackLayout NAME="현장기록" hideFooter>
        <Wrap><Placeholder>오더를 찾을 수 없습니다.</Placeholder></Wrap>
      </SimpleBackLayout>
    );
  }

  if (!isWorker && !isOwner) {
    return (
      <SimpleBackLayout NAME="현장기록" hideFooter>
        <Wrap><Placeholder>이 오더의 현장기록을 볼 권한이 없습니다.</Placeholder></Wrap>
      </SimpleBackLayout>
    );
  }

  return (
    <SimpleBackLayout NAME="현장기록" hideFooter>
      <Wrap>
        {/* 오더 요약 */}
        <Card>
          <OrderTitle>{order.title || order.categoryName || "오더"}</OrderTitle>
          {order.address && <OrderSub>{order.address}</OrderSub>}
          <StepRow>
            <Step $done={!!checkIn}>
              {checkIn ? <IoCheckmarkCircle size={17} color={THEME.primary} /> : <Dot />}
              체크인
            </Step>
            <StepLine $done={!!checkIn} />
            <Step $done={!!checkOut}>
              {checkOut ? <IoCheckmarkCircle size={17} color={THEME.primary} /> : <Dot />}
              체크아웃
            </Step>
          </StepRow>
        </Card>

        {/* 증빙 안내 */}
        <NoticeCard>
          <NoticeHead>
            <IoShieldCheckmarkOutline size={17} color={THEME.plum} />
            현장기록은 이렇게 쓰입니다
          </NoticeHead>
          <NoticeText>
            사진과 함께 촬영 시각·위치가 기록되어, 작업 중 파손이나 분쟁이 생겼을 때 증빙 자료로 활용됩니다.
            작업 전(Before)과 작업 후(After) 사진을 같은 위치에서 찍어 주세요.
          </NoticeText>
        </NoticeCard>

        {/* 타임라인 */}
        {logs.length === 0 ? (
          <EmptyCard>
            <EmptyTitle>아직 등록된 현장기록이 없습니다</EmptyTitle>
            <EmptyDesc>
              {isWorker
                ? "현장에 도착하시면 체크인으로 작업 전 상태를 남겨 주세요."
                : "홈프로가 현장에 도착해 체크인하면 여기에 표시됩니다."}
            </EmptyDesc>
          </EmptyCard>
        ) : (
          <Timeline>
            {logs.map((log) => (
              <LogCard key={log.id}>
                <LogHead>
                  <LogType $type={log.type}>{WORKLOG_LABELS[log.type] || "기록"}</LogType>
                  <LogTime>{fmtTime(log.at) || fmtTime(log.capturedAt)}</LogTime>
                </LogHead>
                <LogMeta>
                  <MetaLine>
                    <IoTimeOutline size={14} color={THEME.muted} />
                    촬영·등록 {fmtTime(log.capturedAt)}
                  </MetaLine>
                  <MetaLine>
                    <IoLocationOutline size={14} color={THEME.muted} />
                    {log.geo
                      ? `${log.geo.lat}, ${log.geo.lng} (오차 약 ${log.geo.accuracy}m)`
                      : (GEO_ERROR_TEXT[log.geoError] || "위치 정보 없음")}
                  </MetaLine>
                </LogMeta>
                {log.note && <LogNote>{log.note}</LogNote>}
                {(log.photos || []).length > 0 && (
                  <PhotoStrip>
                    {log.photos.map((p, i) => (
                      <Thumb key={i} src={p.url} alt="" onClick={() => setViewer(p.url)} />
                    ))}
                  </PhotoStrip>
                )}
                <LogBy>{log.byName}</LogBy>
              </LogCard>
            ))}
          </Timeline>
        )}

        {/* 액션 */}
        {canWrite && (
          <ActionArea>
            {!checkIn ? (
              <PrimaryBtn onClick={() => openSheet(WORKLOG_TYPES.CHECKIN)}>작업시작 (체크인)</PrimaryBtn>
            ) : (
              <>
                <SecondaryBtn onClick={() => openSheet(WORKLOG_TYPES.PROGRESS)}>작업 중 기록 추가</SecondaryBtn>
                <PrimaryBtn onClick={() => openSheet(WORKLOG_TYPES.CHECKOUT)}>작업완료 (체크아웃)</PrimaryBtn>
              </>
            )}
          </ActionArea>
        )}
        {isWorker && checkOut && (
          <DoneNote>
            <IoCheckmarkCircle size={17} color={THEME.primary} />
            체크아웃까지 완료되었습니다. 기록은 수정할 수 없습니다.
          </DoneNote>
        )}
      </Wrap>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFiles}
      />

      {/* 등록 시트 */}
      {sheetType && (
        <SheetBg onClick={closeSheet}>
          <Sheet onClick={(e) => e.stopPropagation()}>
            <SheetHead>
              <SheetTitle>{WORKLOG_LABELS[sheetType]}</SheetTitle>
              <CloseBtn onClick={closeSheet}><IoCloseOutline size={24} color={THEME.muted} /></CloseBtn>
            </SheetHead>

            <SheetHint>{WORKLOG_PHOTO_HINT[sheetType]}</SheetHint>

            {/* 체크아웃 — 체크인 사진을 나란히 보여줘 같은 구도로 찍게 유도 */}
            {sheetType === WORKLOG_TYPES.CHECKOUT && checkIn && (checkIn.photos || []).length > 0 && (
              <BeforeBox>
                <BeforeLabel>체크인(Before) 사진</BeforeLabel>
                <PhotoStrip>
                  {checkIn.photos.map((p, i) => (
                    <Thumb key={i} src={p.url} alt="" onClick={() => setViewer(p.url)} />
                  ))}
                </PhotoStrip>
              </BeforeBox>
            )}

            <FieldLabel>
              사진 {sheetType === WORKLOG_TYPES.PROGRESS ? "(선택)" : "(필수)"}
              <FieldCount>{photos.length}/{MAX_PHOTOS}</FieldCount>
            </FieldLabel>
            <PhotoGrid>
              {photos.map((p, i) => (
                <PhotoSlot key={i}>
                  <SlotImg src={p.url} alt="" />
                  <RemoveBtn onClick={() => removePhoto(i)}><IoCloseOutline size={15} color="#fff" /></RemoveBtn>
                </PhotoSlot>
              ))}
              {photos.length < MAX_PHOTOS && (
                <AddSlot onClick={() => !preparing && fileRef.current?.click()}>
                  {preparing ? <SlotHint>처리 중</SlotHint> : (
                    <>
                      <IoCameraOutline size={22} color={THEME.muted} />
                      <SlotHint>사진 추가</SlotHint>
                    </>
                  )}
                </AddSlot>
              )}
            </PhotoGrid>

            <FieldLabel>내용 (선택)</FieldLabel>
            <NoteInput
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={sheetType === WORKLOG_TYPES.PROGRESS
                ? "추가 작업이 필요한 부분, 파손 발견 등 특이사항을 적어주세요"
                : "현장 상태에 대해 남길 내용이 있으면 적어주세요"}
              rows={3}
            />

            <GeoBox>
              <IoLocationOutline size={15} color={geoState?.geo ? THEME.primary : THEME.muted} />
              {!geoState
                ? "위치 확인 중..."
                : geoState.geo
                  ? `위치 확인됨 (오차 약 ${geoState.geo.accuracy}m)`
                  : GEO_ERROR_TEXT[geoState.geoError] || "위치 정보 없음"}
            </GeoBox>
            {geoState && !geoState.geo && (
              <GeoWarn>
                <IoAlertCircleOutline size={14} color={THEME.accent} />
                위치가 없으면 증빙 효력이 약해집니다. 가능하면 위치 권한을 켜고 다시 시도해 주세요.
              </GeoWarn>
            )}

            <SubmitBtn onClick={submit} disabled={busy}>
              {busy ? "등록 중..." : `${WORKLOG_LABELS[sheetType]} 등록`}
            </SubmitBtn>
            {sheetType === WORKLOG_TYPES.CHECKOUT && (
              <SubmitNote>등록하면 오더가 완료 상태로 변경됩니다.</SubmitNote>
            )}
          </Sheet>
        </SheetBg>
      )}

      {viewer && (
        <ViewerBg onClick={() => setViewer(null)}>
          <ViewerImg src={viewer} alt="" onClick={(e) => e.stopPropagation()} />
        </ViewerBg>
      )}

      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default WorkLogPage;

/* ===================== styles ===================== */

const Wrap = styled.div`
  padding: 12px;
  padding-bottom: 40px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 520px;
`;

const Placeholder = styled.div`
  padding: 60px 20px;
  text-align: center;
  font-size: 16px;
  color: ${THEME.muted};
`;

const Card = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

const OrderTitle = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  word-break: keep-all;
`;

const OrderSub = styled.div`
  margin-top: 4px;
  font-size: 15px;
  color: ${THEME.muted};
  word-break: keep-all;
`;

const StepRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
`;

const Step = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 15px;
  font-weight: ${({ $done }) => ($done ? 700 : 500)};
  color: ${({ $done }) => ($done ? THEME.text : THEME.muted)};
`;

const Dot = styled.span`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${THEME.border};
  border: 1px solid #DDDDE3;
  display: inline-block;
`;

const StepLine = styled.div`
  flex: 1;
  height: 2px;
  background: ${({ $done }) => ($done ? THEME.button : THEME.border)};
`;

const NoticeCard = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: ${THEME.cardShadow};
`;

const NoticeHead = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
`;

const NoticeText = styled.div`
  margin-top: 6px;
  font-size: 15px;
  line-height: 1.6;
  color: ${THEME.textSecondary};
  word-break: keep-all;
`;

const EmptyCard = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
  padding: 44px 24px;
  text-align: center;
`;

const EmptyTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
`;

const EmptyDesc = styled.div`
  margin-top: 6px;
  font-size: 15px;
  color: ${THEME.muted};
  line-height: 1.6;
  word-break: keep-all;
`;

const Timeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const LogCard = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 16px 18px;
  box-shadow: ${THEME.cardShadow};
`;

const LogHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const LogType = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ $type }) => ($type === "checkout" ? THEME.primaryDark : THEME.text)};
`;

const LogTime = styled.div`
  font-size: 14px;
  color: ${THEME.muted};
  flex-shrink: 0;
`;

const LogMeta = styled.div`
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MetaLine = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: ${THEME.muted};
`;

const LogNote = styled.div`
  margin-top: 10px;
  font-size: 15px;
  line-height: 1.6;
  color: ${THEME.textSecondary};
  white-space: pre-wrap;
  word-break: break-word;
`;

const PhotoStrip = styled.div`
  margin-top: 10px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  &::-webkit-scrollbar { display: none; }
`;

const Thumb = styled.img`
  width: 92px;
  height: 92px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  background: ${THEME.background};
  cursor: pointer;
`;

const LogBy = styled.div`
  margin-top: 10px;
  font-size: 13px;
  color: ${THEME.muted};
`;

const ActionArea = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;
`;

const PrimaryBtn = styled.button`
  flex: 1;
  padding: 15px;
  border: none;
  border-radius: 10px;
  background: ${THEME.button};
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  &:active { background: ${THEME.buttonDark}; }
`;

const SecondaryBtn = styled.button`
  flex: 1;
  padding: 15px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.textSecondary};
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const DoneNote = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
  padding: 14px;
  font-size: 15px;
  color: ${THEME.textSecondary};
`;

/* ── 시트 ── */

const SheetBg = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 1200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

const Sheet = styled.div`
  width: 100%;
  max-width: var(--app-max, 400px);
  background: ${THEME.surface};
  border-radius: 20px 20px 0 0;
  padding: 20px 20px calc(24px + env(safe-area-inset-bottom, 0px));
  max-height: 88vh;
  overflow-y: auto;
`;

const SheetHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SheetTitle = styled.div`
  font-size: 19px;
  font-weight: 700;
  color: ${THEME.text};
`;

const CloseBtn = styled.button`
  border: none;
  background: none;
  padding: 0;
  display: flex;
  cursor: pointer;
`;

const SheetHint = styled.div`
  margin-top: 8px;
  font-size: 15px;
  color: ${THEME.textSecondary};
  line-height: 1.6;
  word-break: keep-all;
`;

const BeforeBox = styled.div`
  margin-top: 14px;
  padding: 14px;
  background: ${THEME.background};
  border-radius: 12px;
`;

const BeforeLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.textSecondary};
`;

const FieldLabel = styled.div`
  margin-top: 18px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
`;

const FieldCount = styled.span`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const PhotoGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const PhotoSlot = styled.div`
  position: relative;
  width: 84px;
  height: 84px;
`;

const SlotImg = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 10px;
  object-fit: cover;
  background: ${THEME.background};
`;

const RemoveBtn = styled.button`
  position: absolute;
  top: -6px;
  right: -6px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
`;

const AddSlot = styled.div`
  width: 84px;
  height: 84px;
  border: 1px dashed #D8D8DE;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  background: ${THEME.background};
`;

const SlotHint = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
`;

const NoteInput = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  background: ${THEME.background};
  font-size: 16px;
  font-family: inherit;
  color: ${THEME.text};
  line-height: 1.5;
  resize: none;
  outline: none;
  &::placeholder { color: ${THEME.muted}; }
  &:focus { border-color: ${THEME.primary}; }
`;

const GeoBox = styled.div`
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  color: ${THEME.textSecondary};
`;

const GeoWarn = styled.div`
  margin-top: 6px;
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 14px;
  color: ${THEME.muted};
  line-height: 1.5;
  word-break: keep-all;
`;

const SubmitBtn = styled.button`
  width: 100%;
  margin-top: 20px;
  padding: 16px;
  border: none;
  border-radius: 10px;
  background: ${THEME.button};
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  &:disabled { opacity: 0.5; }
`;

const SubmitNote = styled.div`
  margin-top: 8px;
  text-align: center;
  font-size: 14px;
  color: ${THEME.muted};
`;

const ViewerBg = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.9);
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ViewerImg = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const Toast = styled.div`
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20,24,31,0.92);
  color: #fff;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 15px;
  z-index: 1400;
  max-width: 320px;
  text-align: center;
  word-break: keep-all;
`;
