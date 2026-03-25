/* eslint-disable */
import { useEffect, useState, useCallback } from "react";
import { ReadVersion } from "../service/VersionService";

const LS_KEY = "homepro.app.version";

export const useForceReloadIfVersionChanged = () => {
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({ version: "", content: "" });

  const checkVersion = useCallback(async () => {
    try {
      const current = await ReadVersion();
      if (!current?.version) return;

      const saved = localStorage.getItem(LS_KEY);

      // 첫 방문: 버전만 저장하고 새로고침 안 함
      if (!saved) {
        localStorage.setItem(LS_KEY, current.version);
        return;
      }

      // 버전 비교
      if (saved !== current.version) {
        localStorage.setItem(LS_KEY, current.version);
        setUpdateInfo({ version: current.version, content: current.content });
        setShowUpdateToast(true);

        // 1.5초 후 새로고침
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      console.error("버전 체크 오류:", err);
    }
  }, []);

  // 최초 마운트 시 체크
  useEffect(() => {
    checkVersion();
  }, []);

  return { showUpdateToast, updateInfo, checkVersion };
};
