/*import { getAuth, onAuthStateChanged } from "firebase/auth";

let currentUid = null;

export const initFirebaseListener = () => {
  const auth = getAuth();
  onAuthStateChanged(auth, (user) => {
    currentUid = user ? user.uid : null;
    console.log("🔥 UID actual:", currentUid);
  });
};

export const getCurrentUid = () => currentUid;*/
