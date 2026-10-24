/* 다크모드 (대표 10/14 리뷰 "다크모드 전환 설정했으나, 변경 안됨")
 * 화면마다 색을 다시 잡는 대신 문서 전체를 반전하고, 사진 · 지도 등은 다시 반전해 원래 색으로 돌린다.
 * 설정은 앱 설정의 homepro.appSettings.darkMode — 앱을 켜는 순간 바로 적용한다. */
const LS_KEY = "homepro.appSettings";
const CLASS = "hp-dark";

export const applyDarkMode = (on) => {
  try { document.documentElement.classList.toggle(CLASS, !!on); } catch {}
};

export const initDarkMode = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    applyDarkMode(raw ? !!JSON.parse(raw).darkMode : false);
  } catch {}
};
