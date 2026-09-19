/* eslint-disable */
/**
 * 랜딩(/intro) 그림 부품 — 폰 목업 대신 쓰는 그림들. 랜딩 본문과 시안 랩(/lab?tab=landing)이 같이 쓴다.
 *  · Piece*  : 앱 화면을 통째로 찍지 않고 핵심 조각만 새로 그린 것 (금액·이름은 전부 예시)
 *  · Diagram*: 누가 누구와 무엇을 주고받는지 그린 도식
 *  · IconPanel: 큰 아이콘 + 낱말 셋
 */
import React from 'react';
import {
  FiArrowRight, FiArrowDown, FiCheck, FiShare2, FiCreditCard, FiShield, FiRepeat, FiUser, FiUsers, FiHome, FiLink,
} from 'react-icons/fi';

export const ART = {
  P: '#00963F', P_DEEP: '#007A33', TINT: '#E6F7EE', INK: '#14181F', BODY: '#2b2f36', LINE: '#dfe3e8', ALT: '#F7F8FA',
};
const { P, P_DEEP, TINT, INK, BODY, LINE, ALT } = ART;

const stage = { width: '100%', maxWidth: 460, margin: '0 auto', boxSizing: 'border-box' };
const card = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, boxSizing: 'border-box' };
const eg = { fontSize: 13, color: BODY, marginTop: 12, textAlign: 'right' };

/* ---------- 화면 조각 ---------- */
const OrderRow = ({ date, state, stateColor, way, name, last }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '64px 58px 52px 1fr', alignItems: 'center', padding: '14px 18px', borderBottom: last ? 'none' : `1px solid ${LINE}`, fontSize: 15, color: INK }}>
    <span>{date}</span>
    <span style={{ color: stateColor, fontWeight: 700 }}>{state}</span>
    <span>{way}</span>
    <span style={{ fontWeight: 600 }}>{name}</span>
  </div>
);

export const PieceOrder = () => (
  <div style={stage}>
    <div style={{ ...card, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', fontSize: 16, fontWeight: 800, color: INK, borderBottom: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between' }}>
        <span>오더목록</span><span style={{ fontWeight: 600, color: BODY }}>9건</span>
      </div>
      <OrderRow date="오늘" state="접수" stateColor="#653A80" way="빠른" name="누수탐지" />
      <OrderRow date="오늘" state="대기" stateColor={BODY} way="지정" name="가전분해청소" />
      <OrderRow date="07/21" state="접수" stateColor="#653A80" way="0/3" name="도배" last />
    </div>
    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
      <div style={{ ...card, flex: 1, padding: '15px 0', textAlign: 'center', fontSize: 16, fontWeight: 700, color: INK }}>오더 받기</div>
      <div style={{ flex: 1, padding: '15px 0', textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#fff', background: P, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><FiShare2 />오더 공유</div>
    </div>
    <div style={eg}>화면 일부를 옮겨 그린 예시입니다</div>
  </div>
);

const MoneyLine = ({ k, v, strong, last }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '15px 0', borderBottom: last ? 'none' : `1px solid ${LINE}` }}>
    <span style={{ fontSize: 16, color: INK, fontWeight: strong ? 800 : 500 }}>{k}</span>
    <span style={{ fontSize: strong ? 24 : 17, fontWeight: strong ? 800 : 600, color: strong ? P : INK }}>{v}</span>
  </div>
);

export const PieceReferral = () => (
  <div style={stage}>
    <div style={{ ...card, padding: '20px 22px' }}>
      <div style={{ fontSize: 15, color: BODY }}>내가 공유한 오더</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: INK, margin: '4px 0 8px' }}>욕실 누수공사</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: INK, padding: '12px 14px', background: ALT, borderRadius: 10, marginBottom: 6 }}>
        <FiUser /> 나 <FiArrowRight color={P} /> <FiUsers /> 누수 전문사업자
      </div>
      <MoneyLine k="작업 상태" v="작업 완료" />
      <MoneyLine k="소개수수료 수익" v="+ 50,000원" strong last />
    </div>
    <div style={eg}>금액은 예시입니다</div>
  </div>
);

export const PiecePay = () => (
  <div style={stage}>
    <div style={{ ...card, padding: '20px 22px' }}>
      <div style={{ fontSize: 15, color: BODY }}>결제 요청</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: INK, margin: '4px 0 2px', letterSpacing: '-0.02em' }}>330,000원</div>
      <div style={{ fontSize: 15, color: INK, marginBottom: 16 }}>에어컨 분해청소 2대 · 김○○ 고객</div>
      <div style={{ background: P, color: '#fff', borderRadius: 10, padding: '15px 0', textAlign: 'center', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><FiLink />카드결제 링크 보내기</div>
    </div>
    <div style={{ ...card, padding: '16px 22px', marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 30, height: 30, borderRadius: '50%', background: TINT, color: P, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><FiCheck /></span>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: INK }}>고객 카드결제 완료</div>
        <div style={{ fontSize: 15, color: P_DEEP, fontWeight: 600 }}>사업자 본인 계좌로 직접정산</div>
      </div>
    </div>
    <div style={eg}>금액·이름은 예시입니다</div>
  </div>
);

export const PieceInsurance = () => (
  <div style={stage}>
    <div style={{ ...card, padding: '22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ width: 46, height: 46, borderRadius: 12, background: TINT, color: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23 }}><FiShield /></span>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: INK }}>홈프로 안심전문가</div>
          <div style={{ fontSize: 15, color: BODY }}>도급업자배상책임보험 연계</div>
        </div>
      </div>
      {['배상책임보험', '물적손해 확대담보', '사고 대응 지원'].map((t, i) => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 0', borderTop: `1px solid ${LINE}`, fontSize: 16, fontWeight: 600, color: INK }}>
          <FiCheck color={P} />{t}
        </div>
      ))}
    </div>
  </div>
);

/* ---------- 도식 ---------- */
const Node = ({ icon, title, sub, on }) => (
  <div style={{ ...card, padding: '18px 12px', textAlign: 'center', background: on ? P : '#fff', borderColor: on ? P : LINE, color: on ? '#fff' : INK, flex: 1, minWidth: 0, wordBreak: 'keep-all' }}>
    <div style={{ fontSize: 24, marginBottom: 6, display: 'flex', justifyContent: 'center' }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.35 }}>{title}</div>
    {sub && <div style={{ fontSize: 14, marginTop: 3, lineHeight: 1.4 }}>{sub}</div>}
  </div>
);
const Between = ({ top, bottom }) => (
  <div style={{ flex: '0 0 74px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: P_DEEP, lineHeight: 1.3 }}>
    <div>{top}</div>
    <div style={{ fontSize: 20, color: P, display: 'flex', justifyContent: 'center', margin: '2px 0' }}>{bottom ? <FiRepeat /> : <FiArrowRight />}</div>
    <div>{bottom}</div>
  </div>
);

export const DiagramOrder = () => (
  <div style={{ ...stage, maxWidth: 500 }}>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Node icon={<FiUser />} title="나" sub="내 전문분야" />
      <Between top="받는 오더" bottom="주는 오더" />
      <Node icon={<FiHome />} title="홈프로" on />
      <Between top="받는 오더" bottom="주는 오더" />
      <Node icon={<FiUsers />} title="다른 전문가" sub="다른 분야" />
    </div>
  </div>
);
export const DiagramReferral = () => (
  <div style={{ ...stage, maxWidth: 500 }}>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Node icon={<FiUser />} title="고객" sub="누수공사 요청" />
      <Between top="오더" />
      <Node icon={<FiUser />} title="나" sub="에어컨 전문" />
      <Between top="오더 공유" />
      <Node icon={<FiUsers />} title="누수 전문사업자" sub="작업 진행" />
    </div>
    <div style={{ margin: '14px auto 0', width: '66%', borderTop: `2px dashed ${P}`, paddingTop: 10, textAlign: 'center', fontSize: 17, fontWeight: 800, color: P }}>소개수수료 수익이 나에게</div>
  </div>
);
export const DiagramPay = () => (
  <div style={{ ...stage, maxWidth: 500 }}>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Node icon={<FiLink />} title="결제 링크" sub="고객에게 발송" />
      <Between top="" />
      <Node icon={<FiCreditCard />} title="고객 카드결제" />
      <Between top="" />
      <Node icon={<FiHome />} title="내 계좌" sub="직접정산" on />
    </div>
  </div>
);
export const DiagramInsurance = () => (
  <div style={{ ...stage, maxWidth: 500 }}>
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
      <div style={{ width: 170 }}><Node icon={<FiShield />} title="홈프로 안심전문가" on /></div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', color: P, fontSize: 20, marginBottom: 12 }}><FiArrowDown /></div>
    <div style={{ display: 'flex', gap: 10 }}>
      <Node icon={<FiCheck />} title="배상책임보험" />
      <Node icon={<FiCheck />} title="물적손해 확대담보" />
      <Node icon={<FiCheck />} title="사고 대응 지원" />
    </div>
  </div>
);

/* ---------- 큰 아이콘 판 ---------- */
export const IconPanel = ({ icon, words }) => (
  <div style={stage}>
    <div style={{ background: TINT, borderRadius: 20, padding: '46px 24px 34px', textAlign: 'center' }}>
      <div style={{ width: 112, height: 112, borderRadius: 28, background: '#fff', color: P, fontSize: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 26px' }}>{icon}</div>
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px 22px', fontSize: 17, fontWeight: 700, color: P_DEEP }}>
        {words.map((w) => <span key={w}>{w}</span>)}
      </div>
    </div>
  </div>
);
export const ICON_SET = {
  order: { icon: <FiRepeat />, words: ['받는 오더', '주는 오더', '서로 연결'] },
  referral: { icon: <FiShare2 />, words: ['오더 공유', '전문가 연결', '소개수익'] },
  pay: { icon: <FiCreditCard />, words: ['결제 링크', '카드결제', '직접정산'] },
  insurance: { icon: <FiShield />, words: ['배상책임', '확대담보', '사고 대응'] },
};

/* ---------- 묶음 — 섹션 id 로 꺼내 쓴다 ---------- */
export const PIECES = { order: <PieceOrder />, referral: <PieceReferral />, pay: <PiecePay />, insurance: <PieceInsurance /> };
export const DIAGRAMS = { order: <DiagramOrder />, referral: <DiagramReferral />, pay: <DiagramPay />, insurance: <DiagramInsurance /> };
export const ICONS = Object.fromEntries(Object.entries(ICON_SET).map(([k, v]) => [k, <IconPanel key={k} {...v} />]));

/* ---------- 첫 화면(히어로) 그림 ---------- */
// 실제 화면 한 장 — 폰 틀 없이 화면만. 위쪽만 잘라 보여 준다
export const HeroScreen = ({ height = 520, width = 320 }) => (
  <div style={{ width, maxWidth: '100%', height, overflow: 'hidden', border: `1px solid ${LINE}`, borderRadius: 18, boxShadow: '0 18px 44px rgba(20,24,31,0.12)', background: '#fff' }}>
    <img src="/assets/landing/orders.png" alt="홈프로 오더목록 화면" style={{ display: 'block', width: '100%' }} />
  </div>
);
// 실제 화면 한 장 + 옆에 걸친 조각 둘
export const HeroScreenWithPieces = () => (
  <div style={{ position: 'relative', width: '100%', maxWidth: 480, height: 540, margin: '0 auto' }}>
    <div style={{ position: 'absolute', left: 0, top: 0 }}><HeroScreen height={540} width={300} /></div>
    <div style={{ ...card, position: 'absolute', right: 0, top: 56, width: 236, padding: '16px 18px', boxShadow: '0 14px 34px rgba(20,24,31,0.14)' }}>
      <div style={{ fontSize: 14, color: BODY }}>소개수수료 수익</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: P }}>+ 50,000원</div>
    </div>
    <div style={{ ...card, position: 'absolute', right: 12, top: 300, width: 250, padding: '16px 18px', boxShadow: '0 14px 34px rgba(20,24,31,0.14)', display: 'flex', gap: 12, alignItems: 'center' }}>
      <span style={{ width: 30, height: 30, borderRadius: '50%', background: TINT, color: P, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><FiCheck /></span>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>고객 카드결제 완료</div>
        <div style={{ fontSize: 14, color: P_DEEP, fontWeight: 600 }}>본인 계좌로 직접정산</div>
      </div>
    </div>
  </div>
);
// 화면 없이 — 네 가지 기능을 한 판에
export const HeroBoard = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 440, margin: '0 auto' }}>
    {[
      { i: <FiRepeat />, t: '오더 공유', s: '받고, 공유하고' },
      { i: <FiShare2 />, t: '소개수익', s: '연결이 수익으로' },
      { i: <FiCreditCard />, t: 'PG 결제', s: '본인 계좌로 직접정산' },
      { i: <FiShield />, t: '배상책임보험', s: '사고위험까지 관리' },
    ].map((x, n) => (
      <div key={x.t} style={{ ...card, padding: '26px 20px', background: n === 0 ? P : '#fff', borderColor: n === 0 ? P : LINE, color: n === 0 ? '#fff' : INK }}>
        <div style={{ fontSize: 30, marginBottom: 14, color: n === 0 ? '#fff' : P }}>{x.i}</div>
        <div style={{ fontSize: 19, fontWeight: 800 }}>{x.t}</div>
        <div style={{ fontSize: 15, marginTop: 4 }}>{x.s}</div>
      </div>
    ))}
  </div>
);
