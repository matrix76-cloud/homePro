/* eslint-disable */
import { useEffect, useState } from "react";
import localforage from "localforage";
import { ReadVersion } from "../service/VersionService";

export const useForceReloadIfVersionChanged = () => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [versionName, setVersionName] = useState("");

  useEffect(() => {
    const checkAndReload = async () => {
      try {
        const current = await ReadVersion();
        if (!current?.version) return;

        const isFirstInstall = await localforage.getItem("is_first_install");

        // 최초 설치 시 버전만 저장하고 스킵
        if (!isFirstInstall) {
          await localforage.setItem("web_version", current.version);
          await localforage.setItem("is_first_install", "done");
          return;
        }

        // 저장된 버전과 비교
        const saved = await localforage.getItem("web_version");
        if (saved !== current.version) {
          await localforage.setItem("web_version", current.version);
          setVersionName(current.version);
          setShowUpdateBanner(true);

          const url = new URL(window.location.href);
          url.searchParams.set("v", Date.now().toString());
          setTimeout(() => {
            window.location.replace(url.toString());
          }, 1200);
        }
      } catch (err) {
        console.error("버전 체크 오류:", err);
      }
    };

    checkAndReload();
  }, []);

  return { showUpdateBanner, versionName };
};
