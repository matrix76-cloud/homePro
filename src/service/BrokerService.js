/* eslint-disable */
/**
 * 인증 공인중개사 판정 (대표 9/10 권한 구조 · 형 확정 9/13 "개업 중개사무소 등록번호 하나로 단순하게")
 *  - 전문분야 등록에서 공동중개(brokerage) 카테고리를 개설등록번호와 함께 신청 → 관리자가 국가공간정보포털에서 확인 후 승인(status approved)
 *  - 조회는 누구나 / 글쓰기·손님공유 연결은 인증 공인중개사만 / 매물공유 연결은 회원이면 가능
 */
import { getMyProDocs } from "./ProService";

export async function isCertifiedBroker(uid) {
  if (!uid) return false;
  try {
    const docs = await getMyProDocs(uid);
    return (docs || []).some((d) => d.categoryId === "brokerage" && d.status === "approved");
  } catch {
    return false;
  }
}

export async function getBrokerStatus(uid) {
  if (!uid) return "none";
  try {
    const docs = await getMyProDocs(uid);
    const d = (docs || []).find((x) => x.categoryId === "brokerage");
    if (!d) return "none";
    return d.status === "approved" ? "approved" : "pending";
  } catch {
    return "none";
  }
}
