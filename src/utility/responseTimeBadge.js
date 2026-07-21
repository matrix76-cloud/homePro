/**
 * 프로 평균 응답 시간 기반 뱃지 반환
 * @param {number|null|undefined} avgResponseTime - 평균 응답 시간 (초)
 * @returns {{ label: string, color: string } | null}
 */
export function getResponseBadge(avgResponseTime) {
  if (!avgResponseTime || avgResponseTime <= 0) return null;

  if (avgResponseTime <= 600) {
    return { label: "10분 내 응답", color: "#10B981" };
  }
  if (avgResponseTime <= 1800) {
    return { label: "30분 내 응답", color: "#3B82F6" };
  }
  if (avgResponseTime <= 3600) {
    return { label: "1시간 내 응답", color: "#2571e3" };
  }

  return null;
}
