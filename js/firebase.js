import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updatePassword, reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getDatabase, ref, get, set, update, push, remove, runTransaction, onValue, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { firebaseConfig } from "./config.js";

export const fbApp = initializeApp(firebaseConfig);
export const auth = getAuth(fbApp);
export const db = getDatabase(fbApp);

export async function createAuthUser(email, password){
  const secondary = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondary);
  try{
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await signOut(secondaryAuth).catch(()=>{});
    return cred.user;
  } finally {
    await deleteApp(secondary).catch(()=>{});
  }
}

export const api = { ref, get, set, update, push, remove, runTransaction, onValue, onDisconnect, serverTimestamp, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updatePassword, reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail, createAuthUser };
