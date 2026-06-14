import { auth, api } from "./firebase.js";
import { state } from "./state.js";
import { ensureDefaultUsers, loadProfile, subscribeAll, profileFromEmail, applyPendingPasswordReset, recordSessionStart, recordSessionHeartbeat, recordSessionEnd, SESSION_TIMEOUT_MS } from "./data.js";
import { renderLogin, renderApp } from "./ui.js?v=20260613-v2191-tablet-action-edge";

function bootLoading(){
  const tpl = document.getElementById("loading-template");
  document.getElementById("app").innerHTML = tpl.innerHTML;
}

bootLoading();

api.onAuthStateChanged(auth, async (user) => {
  state.user = user;
  state.guest = false;
  state.profile = null;
  state.unsub.forEach(fn => fn());
  state.unsub = [];

  if (!user) {
    stopIdleLogout();
    renderLogin();
    return;
  }

  try {
    await ensureDefaultUsers(user);
    await applyPendingPasswordReset(user).catch(err => console.warn("Pending password reset could not be applied", err));
    const profile = await loadProfile(user.uid, user.email);
    const fallback = profileFromEmail(user.email);
    state.profile = profile || fallback || { username: user.email, role: "usuario", email: user.email, activo: true };
    if (state.profile.activo === false) throw new Error("This user is inactive. Contact the administrator.");
    await recordSessionStart();
    startIdleLogout();
    subscribeAll(renderApp);
    renderApp();
  } catch (err) {
    console.error(err);
    renderLogin(err.message || "Unable to connect to Firebase");
  }
});

window.addEventListener("error", e => console.error(e.error || e.message));


let idleLogoutTimer = null;
let heartbeatTimer = null;
let idleLogoutBusy = false;
const idleEvents = ["click","touchstart","keydown","scroll","mousemove"];
function resetIdleLogout(){
  if(!state.user || state.guest) return;
  clearTimeout(idleLogoutTimer);
  idleLogoutTimer = setTimeout(async()=>{
    if(idleLogoutBusy || !state.user) return;
    idleLogoutBusy = true;
    try{ await recordSessionEnd("timeout"); await api.signOut(auth); }
    finally{ idleLogoutBusy = false; }
  }, SESSION_TIMEOUT_MS);
}
function startIdleLogout(){
  stopIdleLogout();
  idleEvents.forEach(ev=>window.addEventListener(ev, resetIdleLogout, { passive:true }));
  heartbeatTimer = setInterval(()=>recordSessionHeartbeat(), 60 * 1000);
  recordSessionHeartbeat();
  resetIdleLogout();
}
function stopIdleLogout(){
  clearTimeout(idleLogoutTimer);
  clearInterval(heartbeatTimer);
  idleLogoutTimer = null;
  heartbeatTimer = null;
  idleEvents.forEach(ev=>window.removeEventListener(ev, resetIdleLogout));
}
