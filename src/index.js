import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { UserProvider } from './context/User';

// 초대 딥링크 캡처 — 라우팅(BrowserRouter) 마운트 전에 동기 실행해야 한다.
// App 내부 useEffect 로 처리하면 로그아웃 상태에서 "/" → 로그인 리다이렉트(child Navigate)가
// 먼저 실행돼 ?code 가 사라진다(신규 초대 유입은 항상 로그아웃 → 추천 유실). 여기서 먼저 저장한다.
// 카카오 OAuth ?code= 와 구분: 추천코드는 영대문자 2 + 숫자 6 고정 포맷만 캡처 후 URL 에서 제거.
(function captureReferralCode() {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = (params.get('code') || '').trim().toUpperCase();
    if (/^[A-Z]{2}\d{6}$/.test(code)) {
      localStorage.setItem('homepro.pendingReferralCode', code);
      params.delete('code');
      const rest = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash);
    }
  } catch (e) { /* ignore */ }
})();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <App />
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
