/* eslint-disable */
import { db } from "../api/config";
import { collection, getDocs, query } from "firebase/firestore";

export const ReadVersion = async () => {
  const VERSIONREF = collection(db, "VERSION");
  try {
    const querySnapshot = await getDocs(query(VERSIONREF));
    let version = {};
    querySnapshot.forEach((doc) => {
      version = doc.data();
    });
    return version;
  } catch (e) {
    console.error("버전 조회 오류:", e.message);
    return { version: null };
  }
};
