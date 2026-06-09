import { state, setLang, isAdmin, canManage, canDeleteProducts, canManageCatalog, canAdjust, canReadReports } from "./state.js";
import { t } from "./i18n.js";
import { APP, AUTH_ALIASES, DEFAULT_LOGIN_DOMAIN } from "./config.js";
import { metrics, filteredProducts, reportProducts, categoriesForCurrentStorage, storageValues, statusOf, statusPass, updateAgeBucket, productList, productEntries, baseProducts, saveProduct, deleteProduct, adjustStock, saveCategory, deleteCategory, saveUnit, deleteUnit, saveStorage, deleteStorage, saveUserProfile, deleteUserProfile, createUserWithAuth, setPendingPasswordReset, changeOwnPassword, importSeedToFirebase, clearV2Database, exportCurrentJson, useLocalSeed, DEFAULT_STORAGE_ICONS, setIgnoredDuplicate } from "./data.js";
import { api, auth } from "./firebase.js";

const app = document.getElementById("app");
const L = k => t(state.lang,k);
const esc = x => String(x ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const svgIcon = name => ({
  dashboard:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.8 12 3l9 7.8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`,
  inventory:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`,
  history:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  reports:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5"/><path d="M8 19v-7"/><path d="M12 19V9"/><path d="M16 19V4"/><path d="M20 19v-10"/></svg>`,
  review:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l2 2 4-5"/><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M20 4v6h-6"/></svg>`,
  settings:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3-.2-.1a1.8 1.8 0 0 0-2-.2 1.7 1.7 0 0 0-1 1.5V21h-5v-.2a1.7 1.7 0 0 0-1-1.5 1.8 1.8 0 0 0-2 .2l-.2.1-2-3 .1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.4-1H3v-4h.2a1.7 1.7 0 0 0 1.4-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3 .2.1a1.8 1.8 0 0 0 2 .2 1.7 1.7 0 0 0 1-1.5V3h5v.2a1.7 1.7 0 0 0 1 1.5 1.8 1.8 0 0 0 2-.2l.2-.1 2 3-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.4 1h.2v4h-.2a1.7 1.7 0 0 0-1.4 1Z"/></svg>`,
  package:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`,
  search:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  sliders:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></svg>`,
  meat:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.62 8.382l1.966 -1.967a2 2 0 1 1 2.828 2.828l-1.967 1.966"/><path d="M5.904 18.596a4.167 4.167 0 0 1 0 -5.892l3.864 -3.864a4 4 0 0 1 5.657 0l.735 .735a4 4 0 0 1 0 5.657l-3.864 3.864a4.167 4.167 0 0 1 -5.892 0z"/><path d="M7.5 16.5l.01 0"/><path d="M10.5 13.5l.01 0"/></svg>`,
  leaf:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21c.5 -4.5 2.5 -8 7 -10"/><path d="M9 18c6.218 0 10 -3.288 10 -10v-5h-4c-6.218 0 -10 3.288 -10 10 0 1 0 2 1 3"/></svg>`,
  bottle:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2h4"/><path d="M11 2v5l-3 3v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2 -2V10l-3 -3V2"/><path d="M8 14h8"/><path d="M8 18h8"/></svg>`,
  chili:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 4c1.5 1.5 2 3.5 1 6c-1 3 -4 6 -7 8c-2 1.333 -4.333 1.333 -7 0c2.5 -.5 4.5 -2 6 -4.5c1.5 -2.5 1.5 -5.5 3.5 -7.5c1 -1 2 -1.5 3.5 -2z"/><path d="M17 4c.5 -1 1.5 -1.5 3 -1.5"/></svg>`,
  sauce:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2h4v4h-4z"/><path d="M9 6h6l1 4v10a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2V10l1 -4z"/><path d="M9 14h6"/><path d="M10 18h4"/></svg>`,
  beverage:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10l-1 18H8L7 3z"/><path d="M8 8h8"/><path d="M10 3V1h4v2"/><path d="M9 14h6"/></svg>`,
  can:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6c0 -2 10 -2 10 0v12c0 2 -10 2 -10 0V6z"/><path d="M7 6c0 2 10 2 10 0"/><path d="M7 18c0 -2 10 -2 10 0"/><path d="M9 10h6"/><path d="M9 14h6"/></svg>`,
  cleaning:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l1 6H7l1 -6z"/><path d="M7 9h10l2 11H5L7 9z"/><path d="M9 13h6"/><path d="M10 17h4"/></svg>`,
  tag:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13 11 22 2 13V4h9l9 9Z"/><path d="M7 8h.01"/></svg>`,
  grid:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6H4z"/><path d="M14 14h6v6h-6z"/></svg>`,
  more:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>`
}[name] || "");
const nameOf = p => state.lang === "es" ? (p.nombreES || p.nombreEN || p.nombre) : (p.nombreEN || p.nombre || p.nombreES);
const trCat = c => state.lang === "es" ? c : (state.catTrans?.[c] || c);
const trUnit = u => state.lang === "es" ? u : (state.unitTrans?.[u] || u);
const storageLabel = s => state.lang === "es" ? (state.storageTrans?.[`${s}__es`] || ({congelados:L("frozen"),refrigerados:L("refrigerated"),secos:L("dry"),limpieza:L("cleaning")}[s]) || s || "-") : (state.storageTrans?.[s] || ({congelados:L("frozen"),refrigerados:L("refrigerated"),secos:L("dry"),limpieza:L("cleaning")}[s]) || s || "-");
const storageIcon = s => state.storageIcons?.[s] || DEFAULT_STORAGE_ICONS?.[s] || "";
const statusIcon = key => ({all:"◦",warning:"⚠️",critical:"⛔",lowOut:"🔴",normal:"✅"}[key] || "");
const normalizeText = x => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function compactProductName(value){
  let v = normalizeText(value)
    .replace(/\b(the|el|la|los|las|de|del|and|y)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const words = v.split(/\s+/).filter(Boolean).map(w=>{
    if(w.length > 4 && w.endsWith("ies")) return w.slice(0,-3)+"y";
    if(w.length > 4 && w.endsWith("oes")) return w.slice(0,-2);
    if(w.length > 3 && w.endsWith("es")) return w.slice(0,-2);
    if(w.length > 3 && w.endsWith("s")) return w.slice(0,-1);
    return w;
  });
  return words.join("");
}
function productNameCandidates(p){
  return [...new Set([p?.nombreEN, p?.nombre, p?.nombreES]
    .map(compactProductName)
    .filter(n=>n && n.length >= 3))];
}
function editDistance(a,b){
  if(a===b) return 0;
  if(!a) return b.length;
  if(!b) return a.length;
  const prev = Array.from({length:b.length+1},(_,i)=>i);
  const cur = new Array(b.length+1);
  for(let i=1;i<=a.length;i++){
    cur[0]=i;
    for(let j=1;j<=b.length;j++){
      const cost = a[i-1]===b[j-1] ? 0 : 1;
      cur[j] = Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+cost);
    }
    for(let j=0;j<=b.length;j++) prev[j]=cur[j];
  }
  return prev[b.length];
}
function similarName(a,b){
  if(!a || !b) return false;
  const minLen = Math.min(a.length,b.length), maxLen = Math.max(a.length,b.length);
  if(minLen < 4) return a===b;
  if(a===b || a.includes(b) || b.includes(a)) return true;
  const d = editDistance(a,b);
  const score = 1 - (d / maxLen);
  return (maxLen >= 8 && d <= 2) || score >= 0.84;
}
function categoryIconKey(c){
  const text = normalizeText(`${c} ${state.catTrans?.[c] || ""}`);
  if(/meat|meats|carne|carnes|beef|chicken|poultry|aves|cordero|lamb/.test(text)) return "meat";
  if(/vegetable|vegetables|vegetal|vegetales|verdura|verduras|produce|leaf|hoja/.test(text)) return "vegetables";
  if(/canned|can|enlatado|enlatados/.test(text)) return "canned";
  if(/container|containers|contenedor|contenedores/.test(text)) return "containers";
  if(/dairy|lacteo|lacteos|lácteo|lácteos|milk|leche|yogurt|cheese|queso/.test(text)) return "dairy";
  if(/spice|spices|especia|especias|especies|chile|pepper|condiment/.test(text)) return "spices";
  if(/sauce|salsa|salsas|dressing|aderezo/.test(text)) return "sauce";
  if(/beverage|beverages|bebida|bebidas|drink|drinks|soda|juice|jugo|agua|water/.test(text)) return "beverage";
  if(/clean|cleaning|limpieza|detergent|articulo|articulos/.test(text)) return "cleaning";
  if(/other|otros|otro|misc/.test(text)) return "other";
  return "other";
}
const CATEGORY_ICON_SPECS = {
  meat:{icon:"meat", cls:"meat"},
  vegetables:{icon:"leaf", cls:"leaf"},
  canned:{icon:"can", cls:"can"},
  containers:{icon:"package", cls:"package"},
  dairy:{icon:"bottle", cls:"bottle"},
  spices:{icon:"chili", cls:"chili"},
  sauce:{icon:"sauce", cls:"sauce"},
  beverage:{icon:"beverage", cls:"beverage"},
  cleaning:{icon:"cleaning", cls:"cleaning"},
  other:{icon:"grid", cls:"grid"}
};
function catIconHtml(c){
  const key = categoryIconKey(c);
  const spec = CATEGORY_ICON_SPECS[key] || CATEGORY_ICON_SPECS.other;
  return `<span class="category-icon category-icon-svg category-icon-${esc(spec.cls)}">${svgIcon(spec.icon)}</span>`;
}
const storageLabelEs = s => state.storageTrans?.[`${s}__es`] || ({congelados:"Congelados",refrigerados:"Refrigerados",secos:"Secos",limpieza:"Limpieza"}[s]) || s || "-";
const updateClass = p => `age-${updateAgeBucket(p)}`;
const updateTitle = p => {
  const ts = Number(p.updatedAt || 0);
  if(!ts) return state.lang === "es" ? "Sin actualización registrada" : "No update recorded";
  const diff = Date.now() - ts;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if(hours < 1) return state.lang === "es" ? "Actualizado hace menos de 1 hora" : "Updated less than 1 hour ago";
  if(hours < 24) return state.lang === "es" ? `Actualizado hace ${hours} h` : `Updated ${hours}h ago`;
  return state.lang === "es" ? `Actualizado hace ${days} días` : `Updated ${days} days ago`;
};
const updateTimeLabel = p => {
  const ts = Number(p.updatedAt || 0);
  if(!ts) return state.lang === "es" ? "Sin registro" : "No record";
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if(mins < 1) return state.lang === "es" ? "ahora" : "now";
  if(mins < 60) return state.lang === "es" ? `hace ${mins} min` : `${mins} min ago`;
  if(hours < 24) return state.lang === "es" ? `hace ${hours} h` : `${hours}h ago`;
  return state.lang === "es" ? `hace ${days} día${days===1?"":"s"}` : `${days} day${days===1?"":"s"} ago`;
};
const statusMetaHtml = p => `<small class="status-meta">${state.lang === "es" ? "Actualizado" : "Updated"} · ${esc(updateTimeLabel(p))}</small>`;
const statusDotHtml = p => `<span class="status-dot ${updateClass(p)}"></span>`;
const productUpdatedBy = p => {
  if(p?.updatedBy) return p.updatedBy;
  const pid = String(p?.id ?? "");
  const latest = Object.values(state.history || {})
    .filter(h => String(h?.productId ?? "") === pid && h?.usuario)
    .sort((a,b)=>(Number(b.ts)||0)-(Number(a.ts)||0))[0];
  return latest?.usuario || (state.lang === "es" ? "Sin registro" : "No record");
};
const productDetailHtml = p => {
  const st = statusOf(p);
  const updatedByLabel = state.lang === "es" ? "Actualizado por" : "Updated By";
  const updatedLabel = state.lang === "es" ? "Última actualización" : "Last Updated";
  const currentLabel = state.lang === "es" ? "Actual" : "Current";
  return `<div class="product-detail-panel">
    <div class="product-detail-head"><div><h3>${esc(nameOf(p))}</h3><small>${esc(trCat(p.categoria))} · ${esc(storageLabel(p.subcategoria))}</small></div><span class="badge ${st}">${L(st)}</span></div>
    <div class="product-detail-grid">
      <div><span>${currentLabel}</span><b>${esc(p.cantidad)}</b></div>
      <div><span>${L("min")}</span><b>${esc(p.minimo)}</b></div>
      <div><span>${L("unit")}</span><b>${esc(trUnit(p.unidad))}</b></div>
      <div><span>${updatedByLabel}</span><b>${esc(productUpdatedBy(p))}</b></div>
      <div><span>${updatedLabel}</span><b>${esc(updateTimeLabel(p))}</b></div>
      <div><span>${L("storage")}</span><b>${esc(storageLabel(p.subcategoria))}</b></div>
    </div>
  </div>`;
};

export function renderLogin(error=""){
  app.innerHTML = `<main class="login"><section class="login-card">
    <img class="brand-logo" src="logo.png" alt="Afghan Kabob & Grill"><h1>${APP.brand}</h1><p>${L("loginTitle")}</p>
    ${error?`<div class="badge critical" style="display:block;text-align:center;margin:10px 0">${esc(error)}</div>`:""}
    <form id="loginForm" class="stack">
      <label class="field"><span>${L("email")}</span><input class="input login-input" type="text" name="login" autocomplete="username" required placeholder="Admin"></label>
      <label class="field"><span>${L("password")}</span><input class="input login-input" type="password" name="password" autocomplete="current-password" required></label>
      <button class="btn primary" type="submit">${L("signIn")}</button>
    </form>
    <div class="row" style="justify-content:center;margin:16px 0"><button id="guestBtn" class="btn ghost">${L("guest")}</button></div>
    <div class="spread"><small class="muted">v${APP.version}</small><button id="loginLang" class="btn small ghost">${state.lang.toUpperCase()}</button></div>
  </section></main>`;
  app.querySelector("#loginLang").onclick = () => { setLang(state.lang === "en" ? "es" : "en"); renderLogin(error); };
  app.querySelector("#guestBtn").onclick = async () => { await useLocalSeed(); state.profile={username:"Preview",role:"admin"}; state.view="dashboard"; renderApp(); };
  app.querySelector("#loginForm").onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target); const email = resolveLogin(f.get("login"));
    try { await api.signInWithEmailAndPassword(auth, email, f.get("password")); }
    catch(err){ renderLogin(err.message); }
  };
}
function resolveLogin(value){ const raw = String(value || "").trim(); const key = raw.toLowerCase(); if (AUTH_ALIASES[key]) return AUTH_ALIASES[key]; if (raw.includes("@")) return raw; return `${key}@${DEFAULT_LOGIN_DOMAIN}`; }
function nav(){
  const items=[ ["dashboard",svgIcon("dashboard"),L("dashboard")], ["inventory",svgIcon("inventory"),L("inventory")] ];
  if(canReadReports()) items.push(["reports",svgIcon("reports"),L("reports")]);
  if(isAdmin()) items.push(["review",svgIcon("review"),state.lang==='es'?'Revisión':'Review']);
  if(isAdmin()) items.push(["history",svgIcon("history"),L("history")]);
  if(isAdmin()) items.push(["settings",svgIcon("settings"),L("settings")]);
  return items.map(([id,ico,label])=>`<button type="button" class="nav-btn ${state.view===id?'active':''}" data-view="${id}" aria-label="${label}"><span class="ico svg-ico">${ico}</span><span>${label}</span></button>`).join("");
}

function mobileNav(){
  const items=[ ["dashboard",svgIcon("dashboard"),L("dashboard")], ["inventory",svgIcon("inventory"),L("inventory")] ];
  if(canReadReports()) items.push(["reports",svgIcon("reports"),L("reports")]);
  if(isAdmin()) {
    items.push(["review",svgIcon("review"),state.lang==='es'?'Revisión':'Review']);
    items.push(["more",svgIcon("more"),state.lang==='es'?'Más':'More']);
  } else {
    items.push(["user",svgIcon("user"),state.lang==='es'?'Usuario':'User']);
  }
  return items.map(([id,ico,label])=> (id === "more" || id === "user")
    ? `<button type="button" class="nav-btn mobile-user-btn ${id==='user'?'profile-nav-btn':''}" id="mobileUserMenuBtn" aria-label="${esc(label)}"><span class="ico svg-ico">${id==='user'?`<span class="mobile-nav-avatar">${mobileUserInitial()}</span>`:ico}</span><span>${esc(label)}</span></button>`
    : `<button type="button" class="nav-btn ${state.view===id?'active':''}" data-view="${id}" aria-label="${label}"><span class="ico svg-ico">${ico}</span><span>${label}</span></button>`
  ).join("");
}
function userBlock(){ const p=state.profile||{}; const initial=(p.username||p.email||"?").slice(0,1).toUpperCase(); return `<div class="user-block" id="userMenuBtn"><div class="avatar">${esc(initial)}</div><div class="user-info"><b>${esc(p.username||"Guest")}</b><small>${esc(p.role||"")}</small></div><span class="chev">↗</span></div><div id="userDropdown" class="user-dropdown hidden"><button id="menuChangePass">🔑 ${L("changePassword")}</button><button id="menuLogout">↩ ${state.guest?L("close"):L("logout")}</button></div>`; }
function mobileUserInitial(){ const p=state.profile||{}; return esc((p.username||p.email||"?").slice(0,1).toUpperCase()); }
function mobileUserDropdown(){
  const p=state.profile||{};
  const extra = isAdmin() ? `<button data-view="history"><span class="svg-ico">${svgIcon("history")}</span> ${L("history")}</button><button data-view="settings"><span class="svg-ico">${svgIcon("settings")}</span> ${L("settings")}</button>` : "";
  return `<div id="mobileUserDropdown" class="mobile-user-dropdown user-dropdown hidden"><div class="mobile-more-profile"><span class="mobile-user-initial">${mobileUserInitial()}</span><div><b>${esc(p.username||"Guest")}</b><small>${esc(p.role||"")}</small></div></div>${extra}<button id="mobileMenuChangePass">🔑 ${L("changePassword")}</button><button id="mobileMenuLogout">↩ ${state.guest?L("close"):L("logout")}</button></div>`;
}
function shell(content){
  const themeClass = state.view === "inventory" ? (state.inventoryTab === "finished" ? "inventory-theme finished-theme" : "inventory-theme raw-theme") : "";
  app.innerHTML = `<div class="layout ${themeClass}">
    <aside class="side"><div class="side-brand"><img class="side-logo" src="logo.png" alt="Afghan Kabob"><div><h2>Afghan Kabob</h2><p>Inventory</p></div></div><nav class="side-nav">${nav()}</nav><div style="margin-top:auto;position:relative">${userBlock()}</div></aside>
    <header class="topbar"><div class="spread"><div><h1>${pageTitle()}</h1><div class="sub">${APP.brand} · ${new Date().toLocaleDateString(state.lang==='es'?'es-US':'en-US')}</div></div><div class="row top-actions"><button id="topLang" class="btn small ghost">${state.lang.toUpperCase()}</button><div class="top-user desktop-only">${userBlock()}</div></div></div></header>
    <main class="content">${content}</main>
    <nav class="bottom-nav ${isAdmin()?'admin-nav':'user-nav'}">${mobileNav()}</nav>
    ${mobileUserDropdown()}
  </div>`;
  bindShell();
}
function goToView(view){
  if(!view) return;
  state.view = view;
  renderApp();
}
function bindShell(){
  app.querySelectorAll("[data-view]").forEach(b=>{
    b.onclick=(e)=>{ e.preventDefault(); e.stopPropagation(); goToView(b.dataset.view); };
  });
  app.querySelectorAll("#topLang").forEach(b=>b.onclick=()=>{setLang(state.lang === "en" ? "es" : "en"); renderApp();});
  app.querySelectorAll("#userMenuBtn").forEach(btn=>btn.onclick=e=>{ const dd=btn.parentElement.querySelector("#userDropdown"); if(dd) dd.classList.toggle("hidden"); e.stopPropagation(); });
  document.onclick=()=>app.querySelectorAll("#userDropdown,#mobileUserDropdown").forEach(x=>x.classList.add("hidden"));
  app.querySelectorAll("#menuLogout").forEach(b=>b.onclick=()=>{ if(state.guest){location.reload()} else api.signOut(auth); });
  app.querySelectorAll("#menuChangePass").forEach(b=>b.onclick=()=>changePasswordModal());
  app.querySelectorAll("#mobileUserMenuBtn").forEach(btn=>btn.onclick=e=>{ e.preventDefault(); e.stopPropagation(); const dd=app.querySelector("#mobileUserDropdown"); if(dd) dd.classList.toggle("hidden"); });
  app.querySelectorAll("#mobileMenuLogout").forEach(b=>b.onclick=e=>{ e.preventDefault(); e.stopPropagation(); if(state.guest){location.reload()} else api.signOut(auth); });
  app.querySelectorAll("#mobileMenuChangePass").forEach(b=>b.onclick=e=>{ e.preventDefault(); e.stopPropagation(); app.querySelectorAll("#mobileUserDropdown").forEach(x=>x.classList.add("hidden")); changePasswordModal(); });
}

// Defensive navigation fallback: keeps sidebar and bottom navigation working even after partial re-renders.
document.addEventListener('click', (e)=>{
  const btn = e.target.closest?.('[data-view]');
  if(!btn || !app.contains(btn)) return;
  e.preventDefault();
  e.stopPropagation();
  if(state.view !== btn.dataset.view) goToView(btn.dataset.view);
}, true);

function pageTitle(){ return ({dashboard:L("dashboard"),inventory:L("inventory"),review:state.lang==='es'?'Revisión':'Review Center',history:L("history"),reports:L("reports"),settings:L("settings")})[state.view] || L("dashboard"); }
export function renderApp(){
  if(!state.profile && !state.guest){ renderLogin(); return; }
  if(['settings','history','review'].includes(state.view) && !isAdmin()) state.view='dashboard';
  if(state.view==='reports' && !canReadReports()) state.view='dashboard';
  const views={dashboard:dashboardView,inventory:inventoryView,review:reviewView,history:historyView,reports:reportsView,settings:settingsView};
  try{
    shell((views[state.view]||dashboardView)());
    bindView();
  }catch(err){
    console.error('Render failed', err);
    const failedView = state.view;
    state.view = 'dashboard';
    shell(`<section class="card card-pad"><h2>Unable to open ${esc(failedView)}</h2><p class="muted">${esc(err.message||String(err))}</p><button type="button" class="btn primary" data-view="dashboard">Dashboard</button></section>`);
  }
}

function dashboardView(){
  const m=metrics();
  const critical=productEntries().filter(([,p])=>statusOf(p)!=='normal').slice(0,8);
  const purchaseGroups = {};
  critical.forEach(([,p]) => {
    const key = p.subcategoria || "none";
    if(!purchaseGroups[key]) purchaseGroups[key] = { count:0, critical:0, warning:0 };
    purchaseGroups[key].count++;
    purchaseGroups[key][statusOf(p)]++;
  });
  const purchaseSummary = Object.entries(purchaseGroups).map(([storage,info])=>`
    <div class="purchase-row"><div><b>${esc(storageLabel(storage))}</b><small>${info.count} ${L("products").toLowerCase()}</small></div><span class="badge ${info.critical?'critical':'warning'}">${info.critical||info.warning}</span></div>`).join("");
  return `<section class="grid">
  ${Object.keys(state.products||{}).length===0 ? `<div class="setup"><h3>Database is empty</h3><p class="muted">Import the current inventory seed into the new Firebase project.</p><button id="importSeed" class="btn primary">${L("importData")}</button></div>`:""}
  <div class="metric-grid grid">
    <article class="card metric"><div class="label">${L("products")}</div><div class="value">${m.total}</div></article>
    <article class="card metric warn"><div class="label">${L("lowStock")}</div><div class="value">${m.low}</div></article>
    <article class="card metric bad"><div class="label">${L("outStock")}</div><div class="value">${m.out}</div></article>
    <article class="card metric good"><div class="label">${L("healthy")}</div><div class="value">${m.healthy}</div></article>
  </div>
  <div class="panel-grid balanced grid">
    <section class="card card-pad dashboard-panel"><h2 class="panel-title">${L("needsAttention")}</h2>${critical.length?critical.map(([k,p])=>productRowCompact(k,p)).join(""):`<div class="empty">${L("noData")}</div>`}</section>
    <section class="card card-pad dashboard-panel"><h2 class="panel-title">${state.lang==='es'?'Resumen de compra':'Purchase summary'}</h2>${purchaseSummary || `<div class="empty">${L("noData")}</div>`}</section>
  </div>
  ${isAdmin()?reviewDashboardCard():""}
  </section>`;
}
function filterBox({active=false, attrs="", icon="", iconHtml="", title="", subtitle="", count=""}){
  return `<button class="filter-box ${active?'active':''}" ${attrs}><span class="filter-box-icon">${iconHtml || esc(icon)}</span><span class="filter-box-text"><b>${esc(title)}</b>${subtitle?`<small>${esc(subtitle)}</small>`:""}</span>${count!==""?`<span class="filter-count">${esc(count)}</span>`:""}</button>`;
}
function countForStatus(filter, prefix=""){
  const source = prefix==='report' ? productList() : baseProducts();
  return source.filter(p=>statusPass(p, filter)).length;
}
function statusOptions(prefix=""){
  const total = prefix==='report' ? productList().length : baseProducts().length;
  return [
    ['all', L('all'), total],
    ['warning', L('lowStock'), countForStatus('warning', prefix)],
    ['critical', L('outStock'), countForStatus('critical', prefix)],
    ['lowOut', L('lowAndOut'), countForStatus('lowOut', prefix)],
    ['normal', L('healthy'), countForStatus('normal', prefix)]
  ];
}
function statusChips(prefix=""){
  const val = prefix==='report' ? state.reportStatus : state.filterStatus;
  const id = prefix==='report' ? 'reportStatusSelect' : 'statusSelect';
  return `<select id="${id}" class="select filter-select">${statusOptions(prefix).map(([key,label,count])=>`<option value="${esc(key)}" ${val===key?'selected':''}>${esc(`${statusIcon(key)} ${label}`.trim())} (${count})</option>`).join('')}</select>`;
}
function storageChips(prefix=""){
  const val = prefix==='report' ? state.reportStorage : state.filterStorage;
  const source = prefix==='report' ? productList() : baseProducts();
  const opts = [['all', L('all'), source.length, '']].concat(storageValues().map(s=>{
    const count = source.filter(p=>(p.subcategoria||'').toLowerCase()===s).length;
    return [s, storageLabel(s), count, storageIcon(s)];
  }));
  const id = prefix==='report' ? 'reportStorageSelect' : 'storageSelect';
  return `<select id="${id}" class="select filter-select">${opts.map(([key,label,count,icon])=>`<option value="${esc(key)}" ${val===key?'selected':''}>${esc(icon ? icon+' '+label : label)} (${count})</option>`).join('')}</select>`;
}
function categoryChips(prefix=""){
  const cats = prefix==='report' ? Object.values(state.categories||{}) : categoriesForCurrentStorage();
  const selected = prefix==='report' ? state.reportCategories : state.filterCategories;
  const attr = prefix ? 'data-reportcat' : 'data-cat';
  const source = prefix==='report' ? reportProducts().filter(()=>true) : filteredProducts().filter(()=>true);
  const boxes = [filterBox({active:!selected?.length, attrs:`${attr}="all"`, iconHtml:`<span class="category-icon category-icon-svg">${svgIcon('grid')}</span>`, title:L('all')})]
    .concat(cats.map(c=>{
      const count = (prefix==='report'?productList():baseProducts()).filter(p=>p.categoria===c).length;
      return filterBox({active:selected?.includes(c), attrs:`${attr}="${esc(c)}"`, iconHtml:catIconHtml(c), title:trCat(c), count});
    }));
  return `<div class="filter-box-list category-boxes">${boxes.join("")}</div>`;
}
function inventoryContextClass(){ return state.inventoryTab === 'finished' ? 'finished-context' : 'raw-context'; }
function inventoryView(){
  const list=filteredProducts();
  return `<section class="inventory-screen ${inventoryContextClass()}">
    <div class="inventory-tabs"><button class="inventory-tab raw ${state.inventoryTab==='raw'?'active':''}" data-tab="raw">${L("raw")}</button><button class="inventory-tab finished ${state.inventoryTab==='finished'?'active':''}" data-tab="finished">${L("finished")}</button>${canManage()?`<button id="addProduct" class="inventory-tab add-tab">+ ${L("addProduct")}</button>`:""}</div>
    <div class="toolbar"><div class="search-row"><span class="search-icon">${svgIcon("search")}</span><input id="search" class="input" value="${esc(state.search)}" placeholder="${L("search")}"><button id="filterTools" type="button" class="btn filter-tools ${state.filtersOpen?'active':''}" aria-label="Filters" aria-expanded="${state.filtersOpen?'true':'false'}">${svgIcon("sliders")}</button></div></div>
    <div class="filter-card card card-pad context-filter-card ${state.filtersOpen?'':'collapsed'}"><div class="filter-main-row"><div class="filter-control"><div class="filter-title">${L("filterStatus")}</div>${statusChips()}</div><div class="filter-control"><div class="filter-title">${L("filterStorage")}</div>${storageChips()}</div></div><div class="filter-title">${L("filterCategory")}</div>${categoryChips()}<label class="recent-toggle"><input id="hideRecentToggle" type="checkbox" ${state.hideRecent?'checked':''}> <span>${L("hideRecent")}</span></label><button id="clearInvFilters" class="btn small ghost">${L("clearFilters")}</button></div>
    <div class="product-list">${list.map(productCard).join("") || `<div class="empty card">${L("noData")}</div>`}</div>
    <div class="table-wrap card"><table class="table"><thead><tr><th>Product</th><th>${L("category")}</th><th>${L("storage")}</th><th>${L("stock")}</th><th>${L("min")}</th><th>${L("unit")}</th><th>${L("status")}</th><th></th></tr></thead><tbody>${list.length ? list.map(productTableRow).join("") : inventoryEmptyRow()}</tbody></table></div></section>`;
}
function inventoryEmptyRow(){
  const title = state.lang === "es" ? "No se encontraron productos" : "No products found";
  const msg = state.lang === "es" ? "Ajusta los filtros o agrega un producto nuevo." : "Try adjusting your filters or add a new product.";
  return `<tr class="empty-row"><td colspan="8"><div class="empty-state"><div class="empty-illus">${svgIcon("package")}</div><h3>${title}</h3><p>${msg}</p>${canManage()?`<button id="addProduct" class="btn primary">+ ${L("addProduct")}</button>`:""}</div></td></tr>`;
}

function keyForProduct(p){ return Object.keys(state.products).find(k=>state.products[k]===p || state.products[k]?.id===p.id) || `id_${p.id}`; }
function detailBtn(key){ return `<button type="button" class="btn small ghost detail-btn" data-detail="${esc(key)}" aria-label="${state.lang==='es'?'Detalles':'Details'}">${state.lang==='es'?'Detalles':'Details'}</button>`; }
function productCard(p){ const st=statusOf(p), key=keyForProduct(p); const actions=`${canAdjust()?`<button class="btn small" data-adjust="${key}">${L("adjustStock")}</button>`:""}${canManage()?`<button class="btn small ghost" data-edit="${key}">${L("edit")}</button>`:""}${detailBtn(key)}`; return `<article class="product-card ${updateClass(p)}" title="${esc(updateTitle(p))}"><div class="product-title"><div><h3>${esc(nameOf(p))}</h3><p>${esc(trCat(p.categoria))} · ${esc(storageLabel(p.subcategoria))}</p></div><span class="badge ${st}">${L(st)}</span></div><div class="product-meta"><div class="mini"><span>${L("stock")}</span><b>${p.cantidad}</b></div><div class="mini"><span>${L("min")}</span><b>${p.minimo}</b></div><div class="mini"><span>${L("unit")}</span><b>${esc(trUnit(p.unidad))}</b></div></div><div class="actions">${actions}</div></article>`; }
function productTableRow(p){ const st=statusOf(p), key=keyForProduct(p); return `<tr class="product-age-row ${updateClass(p)}" title="${esc(updateTitle(p))}"><td><b>${esc(nameOf(p))}</b></td><td><span class="cell-icon">${catIconHtml(p.categoria)}</span>${esc(trCat(p.categoria))}</td><td>${storageIcon(p.subcategoria)?`<span class="cell-icon">${esc(storageIcon(p.subcategoria))}</span> `:""}${esc(storageLabel(p.subcategoria))}</td><td>${p.cantidad}</td><td>${p.minimo}</td><td>${esc(trUnit(p.unidad))}</td><td><div class="status-cell"><div class="status-badge-row">${statusDotHtml(p)}<span class="badge ${st}">${L(st)}</span></div>${statusMetaHtml(p)}</div></td><td><div class="row">${canAdjust()?`<button class="btn small" data-adjust="${key}">${L("adjustStock")}</button>`:""}${canManage()?`<button class="btn small ghost" data-edit="${key}">${L("edit")}</button>`:""}${detailBtn(key)}</div></td></tr>`; }
function productRowCompact(key,p){ return `<div class="compact-row" data-adjust="${key}"><div><b>${esc(nameOf(p))}</b><br><small>${p.cantidad} ${esc(trUnit(p.unidad))} · Min ${p.minimo}</small></div><span class="badge ${statusOf(p)}">${L(statusOf(p))}</span></div>`; }
function actionLabel(action=""){ const a=String(action); if(a.includes("Added")||a.includes("Agregado")) return `➕ ${L("added")}`; if(a.includes("Edited")||a.includes("Editado")) return `✏️ ${L("edited")}`; if(a.includes("Deleted")||a.includes("Eliminado")) return `🗑️ ${L("deleted")}`; if(a.includes("Entry")||a.includes("Entrada")) return `📦 ${L("stockEntry")}`; if(a.includes("Exit")||a.includes("Salida")) return `📤 ${L("stockExit")}`; if(a.includes("Set")) return `✏️ ${L("stockSet")}`; return esc(action); }
function translateDetails(details=""){
  let d = String(details || "");
  for (const p of productList()) {
    const names=[p.nombreEN,p.nombreES,p.nombre].filter(Boolean).sort((a,b)=>b.length-a.length);
    for (const n of names) if(n && d.includes(n)){ d=d.replaceAll(n, nameOf(p)); break; }
  }
  for (const c of Object.values(state.categories||{})) d=d.replaceAll(c, trCat(c));
  for (const u of Object.values(state.units||{})) d=d.replaceAll(u, trUnit(u));
  for (const s of storageValues()) d=d.replaceAll(s, storageLabel(s));
  d=d.replaceAll("Materia Prima", L("raw")).replaceAll("Producto Terminado", L("finished"));
  d=d.replaceAll("Stock at deletion", state.lang==='es'?"Stock al eliminar":"Stock at deletion");
  return d;
}
function historyItem(h){ return `<article class="history-item"><div class="spread"><b>${actionLabel(h.accion)}</b><small>${h.ts?new Date(h.ts).toLocaleString(state.lang==='es'?'es-US':'en-US'):""}</small></div><div class="details">${esc(translateDetails(h.detalles))}</div><small>${esc(h.usuario||"")} · ${esc(translateDetails(h.inv||""))}</small></article>`; }


function duplicatePairKey(aKey,bKey){
  return [String(aKey||""), String(bKey||"")].sort().join("__");
}
function duplicatePairLabel(a,b){
  return `${nameOf(a)} ↔ ${nameOf(b)}`;
}

function issueData(){
  const products = productEntries();
  const missingSpanish = products.filter(([,p]) => !(p.nombreES||"").trim());
  const missingEnglish = products.filter(([,p]) => !(p.nombreEN||p.nombre||"").trim());
  const noCategory = products.filter(([,p]) => !p.categoria || !Object.values(state.categories||{}).includes(p.categoria));
  const noUnit = products.filter(([,p]) => !p.unidad || !Object.values(state.units||{}).includes(p.unidad));
  const noStorage = products.filter(([,p]) => !p.subcategoria || !storageValues().includes(String(p.subcategoria).toLowerCase()));
  const stale = products.filter(([,p]) => updateAgeBucket(p) === "stale");
  const dupes = potentialDuplicates();
  return { missingSpanish, missingEnglish, noCategory, noUnit, noStorage, stale, dupes };
}
function potentialDuplicates(){
  const list = productEntries();
  const out=[];
  for(let i=0;i<list.length;i++){
    for(let j=i+1;j<list.length;j++){
      const [ka,a]=list[i], [kb,b]=list[j];
      const an = productNameCandidates(a), bn = productNameCandidates(b);
      const pairKey = duplicatePairKey(ka,kb);
      if(!state.reviewIgnoredDuplicates?.[pairKey] && an.some(x=>bn.some(y=>similarName(x,y)))) out.push([ka,a,kb,b]);
    }
  }
  return out.slice(0,50);
}
function reviewCount(){ const d=issueData(); return d.missingSpanish.length+d.missingEnglish.length+d.noCategory.length+d.noUnit.length+d.noStorage.length+d.stale.length+d.dupes.length; }
function reviewDashboardCard(){
  const d=issueData(); const total=reviewCount();
  const rows = [
    [state.lang==='es'?'Traducciones faltantes':'Missing translations', d.missingSpanish.length+d.missingEnglish.length, 'warning'],
    [state.lang==='es'?'Catálogo incompleto':'Catalog issues', d.noCategory.length+d.noUnit.length+d.noStorage.length, 'critical'],
    [state.lang==='es'?'Productos desactualizados':'Stale products', d.stale.length, 'warning'],
    [state.lang==='es'?'Posibles duplicados':'Potential duplicates', d.dupes.length, 'normal']
  ];
  return `<section class="card card-pad dashboard-panel review-summary-card"><div class="spread"><h2 class="panel-title">${state.lang==='es'?'Revisión pendiente':'Pending Review'}</h2><span class="badge ${total?'warning':'normal'}">${total}</span></div>${rows.map(([label,count,type])=>`<button type="button" class="review-summary-row" data-view="review"><span>${esc(label)}</span><b class="badge ${type}">${count}</b></button>`).join("")}</section>`;
}
function issueProductRow(key,p,detail=""){
  return `<div class="manage-row review-item"><div><b>${esc(nameOf(p))}</b><small>${esc(detail || `${trCat(p.categoria||'-')} · ${storageLabel(p.subcategoria||'')}`)}</small></div><div class="row"><button class="btn small ghost" data-edit="${esc(key)}">${L("edit")}</button></div></div>`;
}
function reviewView(){
  const d=issueData(); const tab=state.reviewTab||'translations';
  const tabs = [
    ['translations', state.lang==='es'?'Traducciones':'Translations', d.missingSpanish.length+d.missingEnglish.length],
    ['catalog', state.lang==='es'?'Catálogo':'Catalog', d.noCategory.length+d.noUnit.length+d.noStorage.length],
    ['stale', state.lang==='es'?'Desactualizados':'Stale', d.stale.length],
    ['duplicates', state.lang==='es'?'Duplicados':'Duplicates', d.dupes.length]
  ];
  let body='';
  if(tab==='translations'){
    body = [...d.missingSpanish.map(([k,p])=>issueProductRow(k,p,state.lang==='es'?'Falta nombre en español':'Missing Spanish name')), ...d.missingEnglish.map(([k,p])=>issueProductRow(k,p,state.lang==='es'?'Falta nombre en inglés':'Missing English name'))].join('');
  } else if(tab==='catalog'){
    body = [...d.noCategory.map(([k,p])=>issueProductRow(k,p,state.lang==='es'?'Categoría faltante o inválida':'Missing or invalid category')), ...d.noUnit.map(([k,p])=>issueProductRow(k,p,state.lang==='es'?'Unidad faltante o inválida':'Missing or invalid unit')), ...d.noStorage.map(([k,p])=>issueProductRow(k,p,state.lang==='es'?'Almacenamiento faltante o inválido':'Missing or invalid storage'))].join('');
  } else if(tab==='stale'){
    body = d.stale.map(([k,p])=>issueProductRow(k,p,updateTitle(p))).join('');
  } else {
    body = d.dupes.map(([ka,a,kb,b])=>`<div class="manage-row review-item duplicate-review"><div><b>${esc(nameOf(a))}</b><small>${state.lang==='es'?'Similar':'Similar'}: ${esc(nameOf(b))}</small></div><div class="row duplicate-actions"><button class="btn small ghost" data-edit="${esc(ka)}">${state.lang==='es'?'Abrir producto':'Open Product'}</button><button class="btn small ghost" data-edit="${esc(kb)}">${state.lang==='es'?'Abrir similar':'Open Similar'}</button><button class="btn small ghost" data-ignore-dupe="${esc(duplicatePairKey(ka,kb))}">${state.lang==='es'?'No es duplicado':'Not Duplicate'}</button><button class="btn small danger-soft" data-resolve-dupe="${esc(ka)}|${esc(kb)}">${state.lang==='es'?'Resolver':'Resolve Duplicate'}</button></div></div>`).join('');
  }
  return `<section class="stack review-page"><section class="card card-pad"><div class="spread"><div><h2>${state.lang==='es'?'Centro de revisión':'Review Center'}</h2><p class="muted">${state.lang==='es'?'Pendientes administrativos para mantener limpio el catálogo.':'Administrative issues to keep the catalog clean.'}</p></div><span class="badge ${reviewCount()?'warning':'normal'}">${reviewCount()}</span></div><div class="review-tabs">${tabs.map(([id,label,count])=>`<button type="button" class="filter-box ${tab===id?'active':''}" data-review-tab="${id}"><span class="filter-box-text"><b>${esc(label)}</b></span><span class="filter-count">${count}</span></button>`).join('')}</div></section><section class="card card-pad"><div class="manage-list">${body || `<div class="empty">${L("noData")}</div>`}</div></section></section>`;
}
function stockDifference(p){
  return Number(p.cantidad || 0) - Number(p.minimo || 0);
}
function diffClass(p){ const d=stockDifference(p); return d < 0 ? 'diff-negative' : d > 0 ? 'diff-positive' : 'diff-zero'; }
function currentLabel(){ return state.lang === 'es' ? 'Actual' : 'Current'; }
function minimumLabel(){ return state.lang === 'es' ? 'Mínimo' : 'Minimum'; }
function differenceLabel(){ return state.lang === 'es' ? 'Diferencia' : 'Difference'; }
function exportReportExcel(){
  const list = reportProducts();
  const rows = list.map(p=>`<tr><td>${esc(nameOf(p))}</td><td>${esc(trCat(p.categoria))}</td><td>${esc(storageLabel(p.subcategoria))}</td><td>${p.cantidad}</td><td>${p.minimo}</td><td>${stockDifference(p)}</td><td>${esc(trUnit(p.unidad))}</td><td>${esc(L(statusOf(p)))}</td><td>${esc(updateTimeLabel(p))}</td></tr>`).join('');
  const html = `<html><head><meta charset="UTF-8"></head><body><table><thead><tr><th>Product</th><th>Category</th><th>Storage</th><th>${esc(currentLabel())}</th><th>${esc(minimumLabel())}</th><th>${esc(differenceLabel())}</th><th>Unit</th><th>Status</th><th>Updated</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  const blob = new Blob([html], {type:'application/vnd.ms-excel'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`ak-report-${new Date().toISOString().slice(0,10)}.xls`; a.click(); URL.revokeObjectURL(a.href);
}
function similarProductsForForm(form, currentKey=""){
  const probe = productNameCandidates({ nombreEN: form.nombreEN || form.nombre, nombreES: form.nombreES, nombre: form.nombre });
  if(!probe.length) return [];
  return productEntries().filter(([k])=>k!==currentKey).filter(([,p])=>{
    const names = productNameCandidates(p);
    return probe.some(x=>names.some(y=>similarName(x,y)));
  }).slice(0,5);
}
async function similarProductDialog(matches){
  const names = matches.map(([,p])=>nameOf(p)).join(', ');
  return await confirmDialog({
    title: state.lang==='es'?'Posible producto duplicado':'Possible duplicate product',
    message: state.lang==='es'
      ? `Ya existe un producto con un nombre similar: ${names}. Revisa si es el mismo producto antes de crearlo. ¿Deseas crearlo de todos modos?`
      : `A product with a similar name already exists: ${names}. Review it before creating a duplicate. Do you want to create it anyway?`,
    confirmText: state.lang==='es'?'Crear de todos modos':'Create anyway',
    cancelText:L('cancel')
  });
}

function historyView(){ const items=Object.values(state.history).sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,200); return `<section class="card card-pad"><h2 class="panel-title">${L("history")}</h2><div class="history-list">${items.map(historyItem).join("") || `<div class="empty">${L("noData")}</div>`}</div></section>`; }
function reportsView(){
  const list=reportProducts();
  const m={total:list.length, low:list.filter(p=>statusOf(p)==="warning").length, out:list.filter(p=>statusOf(p)==="critical").length};
  const filterText = state.lang === 'es' ? 'Filtros' : 'Filters';
  return `<section class="stack"><div class="row no-print report-actions"><button id="printBtn" class="btn primary">${L("print")}</button>${["admin","usuario"].includes(state.profile?.role)||state.guest?`<button id="excelBtn" class="btn ghost">Export Excel</button>`:""}<button id="reportFilterTools" type="button" class="btn filter-tools report-filter-tools ${state.reportFiltersOpen?'active':''}" aria-label="${esc(filterText)}" title="${esc(filterText)}" aria-expanded="${state.reportFiltersOpen?'true':'false'}">${svgIcon("sliders")}</button></div><div class="filter-card card card-pad no-print context-filter-card ${state.reportFiltersOpen?'':'collapsed'}"><div class="filter-main-row"><div class="filter-control"><div class="filter-title">${L("filterStatus")}</div>${statusChips('report')}</div><div class="filter-control"><div class="filter-title">${L("filterStorage")}</div>${storageChips('report')}</div></div><div class="filter-title">${L("filterCategory")}</div>${categoryChips('report')}<button id="clearReportFilters" class="btn small ghost">${L("clearFilters")}</button></div><div class="report card"><div class="spread"><div><h1>${APP.brand}</h1><p>${L("reportTitle")}</p></div><div>${new Date().toLocaleString(state.lang==='es'?'es-US':'en-US')}</div></div><hr><p>${L("total")}: <b>${m.total}</b> &nbsp; ${L("lowStock")}: <b>${m.low}</b> &nbsp; ${L("outStock")}: <b>${m.out}</b></p><table><thead><tr><th>Product</th><th>${L("category")}</th><th>${currentLabel()}</th><th>${minimumLabel()}</th><th>${differenceLabel()}</th><th>${L("unit")}</th><th>${L("status")}</th></tr></thead><tbody>${list.map(p=>`<tr class="product-age-row ${updateClass(p)}" title="${esc(updateTitle(p))}"><td data-label="Product">${esc(nameOf(p))}</td><td data-label="${esc(L("category"))}">${esc(trCat(p.categoria))}</td><td data-label="${esc(currentLabel())}">${p.cantidad}</td><td data-label="${esc(minimumLabel())}">${p.minimo}</td><td class="${diffClass(p)}" data-label="${esc(differenceLabel())}">${stockDifference(p)}</td><td data-label="${esc(L("unit"))}">${esc(trUnit(p.unidad))}</td><td data-label="${esc(L("status"))}">${L(statusOf(p))}</td></tr>`).join("")}</tbody></table></div></section>`;
}
function settingsView(){
  const catRows=Object.values(state.categories||{}).map(c=>`<div class="manage-row"><div><b><span class="cell-icon">${catIconHtml(c)}</span>${esc(trCat(c))}</b></div><div class="row"><button class="btn small ghost" data-edit-cat="${esc(c)}">${L("edit")}</button><button class="btn small danger" data-del-cat="${esc(c)}">${L("delete")}</button></div></div>`).join("");
  const unitRows=Object.values(state.units||{}).map(u=>`<div class="manage-row"><div><b>${esc(trUnit(u))}</b></div><div class="row"><button class="btn small ghost" data-edit-unit="${esc(u)}">${L("edit")}</button><button class="btn small danger" data-del-unit="${esc(u)}">${L("delete")}</button></div></div>`).join("");
  const storageRows=storageValues().map(s=>`<div class="manage-row"><div><b>${storageIcon(s)?`<span class="cell-icon">${esc(storageIcon(s))}</span> `:""}${esc(storageLabel(s))}</b></div><div class="row"><button class="btn small ghost" data-edit-storage="${esc(s)}">${L("edit")}</button><button class="btn small danger" data-del-storage="${esc(s)}">${L("delete")}</button></div></div>`).join("");
  const userRows=Object.entries(state.users||{}).map(([k,u])=>`<div class="manage-row user-manage-row"><div><b>${esc(u.username||u.email)}</b><small>${esc(u.email||"")}</small></div><span class="badge normal">${esc(u.role||"")}</span><div class="row"><button class="btn small ghost" data-edit-user="${esc(k)}">${L("edit")}</button><button class="btn small ghost" data-reset-user="${esc(k)}">🔑 ${L("resetPassword")}</button><button class="btn small danger" data-del-user="${esc(k)}">${L("delete")}</button></div></div>`).join("");
  return `<section class="settings-page stack">
    <section class="card card-pad settings-section full"><div class="spread"><div><h2>${L("users")}</h2><p class="muted">${L("createAuthNote")}</p></div><button id="addUser" class="btn primary">+ ${L("add")}</button></div><div class="manage-list users-list">${userRows || `<div class="empty">${L("noData")}</div>`}</div></section>
    <section class="settings-two-col"><div class="card card-pad settings-section"><div class="spread"><h2>${L("category")}</h2><button id="addCategory" class="btn small primary">+ ${L("add")}</button></div><div class="manage-list">${catRows || `<div class="empty">${L("noData")}</div>`}</div></div><div class="card card-pad settings-section"><div class="spread"><h2>${L("unit")}</h2><button id="addUnit" class="btn small primary">+ ${L("add")}</button></div><div class="manage-list">${unitRows || `<div class="empty">${L("noData")}</div>`}</div></div></section>
    <section class="settings-two-col"><div class="card card-pad settings-section"><div class="spread"><h2>${L("storage")}</h2><button id="addStorage" class="btn small primary">+ ${L("add")}</button></div><div class="manage-list">${storageRows}</div></div><div class="card card-pad settings-section data-panel"><h2>Data</h2><p class="muted">Use this only in the V2 Firebase project.</p><div class="stack"><button id="importSeed" class="btn primary">${L("importData")}</button><button id="clearDb" class="btn danger">Clear test data</button><button id="exportBtn" class="btn ghost">${L("exportData")}</button></div></div></section>
  </section>`;
}
function isMobileViewport(){ return window.matchMedia("(max-width: 767px)").matches; }
function closeProductDetails(){
  document.querySelectorAll(".product-detail-row").forEach(x=>x.remove());
  document.querySelectorAll(".product-age-row.selected,.product-card.selected").forEach(x=>x.classList.remove("selected"));
  document.querySelectorAll(".product-sheet-backdrop").forEach(x=>x.remove());
}
function openProductSheet(key){
  const p = state.products?.[key];
  if(!p) return;
  closeProductDetails();
  const wrap = document.createElement("div");
  wrap.className = "product-sheet-backdrop";
  wrap.innerHTML = `<section class="product-sheet" role="dialog" aria-modal="true">
    <button type="button" class="sheet-close" aria-label="Close">×</button>
    ${productDetailHtml(p)}
    <div class="product-sheet-actions">${canAdjust()?`<button class="btn primary" data-adjust="${esc(key)}">${L("adjustStock")}</button>`:""}${canManage()?`<button class="btn ghost" data-edit="${esc(key)}">${L("edit")}</button>`:""}</div>
  </section>`;
  document.body.append(wrap);
  wrap.querySelector(".sheet-close")?.addEventListener("click", closeProductDetails);
  wrap.addEventListener("click", e=>{ if(e.target===wrap) closeProductDetails(); });
  wrap.querySelectorAll("[data-adjust]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); closeProductDetails(); canAdjust()&&adjustModal(b.dataset.adjust); });
  wrap.querySelectorAll("[data-edit]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); closeProductDetails(); canManage()&&productModal(b.dataset.edit); });
}
function toggleDesktopProductDetail(row, key){
  const p = state.products?.[key];
  if(!p || !row) return;
  const next = row.nextElementSibling;
  if(next?.classList.contains("product-detail-row")){ closeProductDetails(); return; }
  closeProductDetails();
  row.classList.add("selected");
  const detail = document.createElement("tr");
  detail.className = "product-detail-row";
  detail.innerHTML = `<td colspan="8">${productDetailHtml(p)}</td>`;
  row.after(detail);
}
function openProductDetailFromTarget(el){
  const key = el?.dataset?.detail;
  if(!key) return;
  if(isMobileViewport()) openProductSheet(key);
  else toggleDesktopProductDetail(el.closest("tr"), key);
}

export function bindView(){
  app.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{state.inventoryTab=b.dataset.tab; state.filterCategories=[]; renderApp();});
  app.querySelectorAll("[data-review-tab]").forEach(b=>b.onclick=()=>{state.reviewTab=b.dataset.reviewTab; renderApp();});
  app.querySelectorAll("[data-storage]").forEach(b=>b.onclick=()=>{state.filterStorage=b.dataset.storage; state.filterCategories=[]; renderApp();});
  app.querySelectorAll("[data-reportstorage]").forEach(b=>b.onclick=()=>{state.reportStorage=b.dataset.reportstorage; state.reportCategories=[]; renderApp();});
  app.querySelectorAll("[data-status]").forEach(b=>b.onclick=()=>{state.filterStatus=b.dataset.status; renderApp();});
  app.querySelectorAll("[data-reportstatus]").forEach(b=>b.onclick=()=>{state.reportStatus=b.dataset.reportstatus; renderApp();});
  const statusSelect=app.querySelector("#statusSelect"); if(statusSelect) statusSelect.onchange=e=>{state.filterStatus=e.target.value; renderApp();};
  const storageSelect=app.querySelector("#storageSelect"); if(storageSelect) storageSelect.onchange=e=>{state.filterStorage=e.target.value; state.filterCategories=[]; renderApp();};
  const reportStatusSelect=app.querySelector("#reportStatusSelect"); if(reportStatusSelect) reportStatusSelect.onchange=e=>{state.reportStatus=e.target.value; renderApp();};
  const reportStorageSelect=app.querySelector("#reportStorageSelect"); if(reportStorageSelect) reportStorageSelect.onchange=e=>{state.reportStorage=e.target.value; state.reportCategories=[]; renderApp();};
  app.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{const c=b.dataset.cat; if(c==='all') state.filterCategories=[]; else state.filterCategories=state.filterCategories.includes(c)?state.filterCategories.filter(x=>x!==c):[...state.filterCategories,c]; renderApp();});
  app.querySelectorAll("[data-reportcat]").forEach(b=>b.onclick=()=>{const c=b.dataset.reportcat; if(c==='all') state.reportCategories=[]; else state.reportCategories=state.reportCategories.includes(c)?state.reportCategories.filter(x=>x!==c):[...state.reportCategories,c]; renderApp();});
  const search=app.querySelector("#search"); if(search){
    const handleSearch=e=>{
      state.search=e.target.value || "";
      clearTimeout(state.searchTimer);
      state.searchTimer=setTimeout(()=>{
        const pos=e.target.selectionStart ?? state.search.length;
        renderApp();
        const next=app.querySelector("#search");
        if(next){ next.focus(); next.setSelectionRange(Math.min(pos,next.value.length),Math.min(pos,next.value.length)); }
      },120);
    };
    search.oninput=handleSearch;
    search.onsearch=handleSearch;
    search.onchange=handleSearch;
  }
  const hideRecent=app.querySelector("#hideRecentToggle"); if(hideRecent) hideRecent.onchange=e=>{state.hideRecent=!!e.target.checked; renderApp();};
  const filterTools=app.querySelector("#filterTools"); if(filterTools) filterTools.onclick=()=>{ state.filtersOpen=!state.filtersOpen; localStorage.setItem("ak-filters-open", state.filtersOpen ? "true" : "false"); renderApp(); };
  const reportFilterTools=app.querySelector("#reportFilterTools"); if(reportFilterTools) reportFilterTools.onclick=()=>{ state.reportFiltersOpen=!state.reportFiltersOpen; localStorage.setItem("ak-report-filters-open", state.reportFiltersOpen ? "true" : "false"); renderApp(); };
  const clearInv=app.querySelector("#clearInvFilters"); if(clearInv) clearInv.onclick=()=>{state.filterStatus='all';state.filterStorage='all';state.filterCategories=[];state.hideRecent=false;state.search='';renderApp();};
  const clearRep=app.querySelector("#clearReportFilters"); if(clearRep) clearRep.onclick=()=>{state.reportStatus='all';state.reportStorage='all';state.reportCategories=[];renderApp();};
  app.querySelectorAll("[data-detail]").forEach(el=>el.onclick=e=>{ e.preventDefault(); e.stopPropagation(); openProductDetailFromTarget(el); });
  app.querySelectorAll("#addProduct").forEach(b=>b.onclick=()=>canManage()&&productModal()); app.querySelectorAll("[data-edit]").forEach(b=>b.onclick=e=>{e.stopPropagation(); canManage()&&productModal(b.dataset.edit)}); app.querySelectorAll("[data-adjust]").forEach(b=>b.onclick=e=>{e.stopPropagation(); canAdjust()&&adjustModal(b.dataset.adjust)});
  app.querySelectorAll("[data-ignore-dupe]").forEach(b=>b.onclick=async()=>{ const ok=await confirmDialog({ title: state.lang==='es'?'Marcar como no duplicado':'Mark as not duplicate', message: state.lang==='es'?'Este posible duplicado dejará de aparecer en Review Center.':'This possible duplicate will stop appearing in Review Center.', confirmText: state.lang==='es'?'Confirmar':'Confirm', cancelText:L('cancel') }); if(ok){ await setIgnoredDuplicate(b.dataset.ignoreDupe, true); renderApp(); } });
  app.querySelectorAll("[data-resolve-dupe]").forEach(b=>b.onclick=()=>resolveDuplicateModal(...b.dataset.resolveDupe.split('|')));
  app.querySelectorAll("#printBtn").forEach(b=>b.onclick=()=>window.print()); app.querySelectorAll("#excelBtn").forEach(b=>b.onclick=()=>exportReportExcel()); app.querySelectorAll("#exportBtn").forEach(b=>b.onclick=()=>isAdmin()&&exportCurrentJson());
  app.querySelectorAll("#importSeed").forEach(b=>b.onclick=async()=>{ if(confirm("Import seed data into this Firebase project? This will overwrite products, categories, units, users and history in this V2 database.")){ try{ await importSeedToFirebase(); alert("Imported"); } catch(err){ alert("Import failed: "+err.message); } }});
  app.querySelectorAll("#clearDb").forEach(b=>b.onclick=async()=>{ if(confirm("Clear V2 test inventory and history? This keeps the current user profiles but removes products, categories and units.")){ try{ await clearV2Database(); alert("V2 test data cleared"); renderApp(); } catch(err){ alert("Clear failed: "+err.message); } }});
  app.querySelectorAll("#addCategory").forEach(b=>b.onclick=()=>categoryModal()); app.querySelectorAll("[data-edit-cat]").forEach(b=>b.onclick=()=>categoryModal(b.dataset.editCat)); app.querySelectorAll("[data-del-cat]").forEach(b=>b.onclick=async()=>{ if(confirm(`Delete category ${b.dataset.delCat}?`)){ try{ await deleteCategory(b.dataset.delCat); renderApp(); }catch(err){ alert(err.message); } }});
  app.querySelectorAll("#addUnit").forEach(b=>b.onclick=()=>unitModal()); app.querySelectorAll("[data-edit-unit]").forEach(b=>b.onclick=()=>unitModal(b.dataset.editUnit)); app.querySelectorAll("[data-del-unit]").forEach(b=>b.onclick=async()=>{ if(confirm(`Delete unit ${b.dataset.delUnit}?`)){ try{ await deleteUnit(b.dataset.delUnit); renderApp(); }catch(err){ alert(err.message); } }});
  app.querySelectorAll("#addStorage").forEach(b=>b.onclick=()=>storageModal()); app.querySelectorAll("[data-edit-storage]").forEach(b=>b.onclick=()=>storageModal(b.dataset.editStorage)); app.querySelectorAll("[data-del-storage]").forEach(b=>b.onclick=async()=>{ if(confirm(`Delete storage ${b.dataset.delStorage}?`)){ try{ await deleteStorage(b.dataset.delStorage); renderApp(); }catch(err){ alert(err.message); } }});
  app.querySelectorAll("#addUser").forEach(b=>b.onclick=()=>userModal()); app.querySelectorAll("[data-edit-user]").forEach(b=>b.onclick=()=>userModal(b.dataset.editUser)); app.querySelectorAll("[data-reset-user]").forEach(b=>b.onclick=()=>resetPasswordModal(b.dataset.resetUser)); app.querySelectorAll("[data-del-user]").forEach(b=>b.onclick=async()=>{ if(confirm("Delete user profile? This does not delete Firebase Authentication user.")){ await deleteUserProfile(b.dataset.delUser); renderApp(); }});
  app.querySelectorAll("#changePassword").forEach(b=>b.onclick=()=>changePasswordModal());
}
function modal(html){ const wrap=document.createElement("div"); wrap.className="modal-backdrop"; wrap.innerHTML=`<section class="modal">${html}</section>`; document.body.append(wrap); return wrap; }
function confirmDialog({title, message, confirmText, cancelText, danger=false}){
  return new Promise(resolve=>{
    const wrap=document.createElement("div");
    wrap.className="confirm-backdrop";
    wrap.innerHTML=`<section class="confirm-card" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
      <div class="confirm-icon ${danger?'danger':''}">${danger?'!':'?'}</div>
      <h3 id="confirmTitle">${esc(title)}</h3>
      <p>${esc(message)}</p>
      <div class="confirm-actions">
        <button type="button" class="btn ghost" data-confirm-cancel>${esc(cancelText||L("cancel"))}</button>
        <button type="button" class="btn ${danger?'danger':'primary'}" data-confirm-ok>${esc(confirmText||L("confirm"))}</button>
      </div>
    </section>`;
    const close=value=>{ wrap.remove(); resolve(value); };
    wrap.querySelector("[data-confirm-cancel]").onclick=()=>close(false);
    wrap.querySelector("[data-confirm-ok]").onclick=()=>close(true);
    wrap.addEventListener("click",e=>{ if(e.target===wrap) close(false); });
    wrap.addEventListener("keydown",e=>{ if(e.key==="Escape") close(false); });
    document.body.append(wrap);
    wrap.querySelector("[data-confirm-cancel]").focus();
  });
}
function bindDecimalInputs(root){ root.querySelectorAll(".decimal-input").forEach(input=>{ input.addEventListener("focus",()=>{ if(input.dataset.cleared!=="1"){ input.value=""; input.dataset.cleared="1"; }}); input.addEventListener("input",()=>{ input.value = input.value.replace(/,/g,".").replace(/[^0-9.]/g,"").replace(/(\..*)\./g,"$1"); }); }); }
function translationDictionary(){
  const pairs = [
    ["Lemon Juice","Jugo de Limón"], ["Black Pepper","Pimienta Negra"], ["Bleu Cheese","Queso Azul"], ["Blue Cheese","Queso Azul"],
    ["Box Oil","Aceite en Caja"], ["Chicken Quarters","Cuartos de Pollo"], ["Baking Powder","Polvo de Hornear"], ["Fries","Papas Fritas"],
    ["Cumin Powder","Comino Molido"], ["Tandoori Masala","Tandoori Masala"], ["Chaat Masala","Chaat Masala"], ["Sour Cream","Crema Agria"],
    ["Whole Milk Yogurt","Yogurt de Leche Entera"], ["Chicken Breast","Pechuga de Pollo"], ["Chicken Thigh","Muslo de Pollo"],
    ["Chicken Tikka","Chicken Tikka"], ["Seekh Kabab","Seekh Kabab"], ["Falafel","Falafel"], ["Rice","Arroz"], ["Basmati Rice","Arroz Basmati"],
    ["Tomato","Tomate"], ["Onion","Cebolla"], ["Red Onion","Cebolla Roja"], ["Garlic","Ajo"], ["Ginger","Jengibre"],
    ["Potato","Papa"], ["Lettuce","Lechuga"], ["Cucumber","Pepino"], ["Cilantro","Cilantro"], ["Mint","Menta"],
    ["Yogurt","Yogurt"], ["Milk","Leche"], ["Cream","Crema"], ["Cheese","Queso"], ["Butter","Mantequilla"],
    ["Oil","Aceite"], ["Vinegar","Vinagre"], ["Salt","Sal"], ["Sugar","Azúcar"], ["Flour","Harina"],
    ["Spice","Especia"], ["Spices","Especias"], ["Powder","Polvo"], ["Sauce","Salsa"], ["Juice","Jugo"],
    ["Container","Contenedor"], ["Containers","Contenedores"], ["Can","Lata"], ["Canned","Enlatado"], ["Beverage","Bebida"],
    ["Cleaning Items","Artículos de Limpieza"], ["Napkins","Servilletas"], ["Paper Towels","Toallas de Papel"], ["Foil","Papel Aluminio"]
  ];
  const out = {};
  for(const [en, es] of pairs){
    out[normalizeNameForSuggest(en)] = es;
    out[normalizeNameForSuggest(es)] = en;
  }
  return out;
}
function normalizeNameForSuggest(v){ return String(v||"").trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' '); }
function titleCaseSuggestion(v){
  return String(v||"").split(/\s+/).filter(Boolean).map(w=>{
    if(w.length<=2) return w.toLowerCase();
    return w.charAt(0).toUpperCase()+w.slice(1).toLowerCase();
  }).join(' ');
}
function productTranslationPairs(){
  const pairs=[];
  for(const p of Object.values(state.products||{})){
    const en=String(p.nombreEN||p.nombre||"").trim();
    const es=String(p.nombreES||"").trim();
    if(en && es) pairs.push([en,es]);
  }
  return pairs;
}
function suggestProductTranslation(value, source){
  const raw=String(value||"").trim(); if(!raw) return "";
  const norm=normalizeNameForSuggest(raw);

  // 1) First reuse real catalog translations already saved in Firebase.
  for(const [en,es] of productTranslationPairs()){
    if(source==='en' && normalizeNameForSuggest(en)===norm) return es;
    if(source==='es' && normalizeNameForSuggest(es)===norm) return en;
  }

  // 2) Then use the built-in Afghan Kabob/common inventory dictionary.
  const dict=translationDictionary();
  if(dict[norm]) return dict[norm];

  // 3) Finally, try word-by-word suggestions for common kitchen terms.
  const words = source==='en'
    ? {"chicken":"Pollo","beef":"Carne de Res","lamb":"Cordero","rice":"Arroz","basmati":"Basmati","milk":"Leche","cheese":"Queso","yogurt":"Yogurt","cream":"Crema","butter":"Mantequilla","powder":"Polvo","pepper":"Pimienta","sauce":"Salsa","juice":"Jugo","oil":"Aceite","onion":"Cebolla","red":"Roja","white":"Blanca","green":"Verde","garlic":"Ajo","ginger":"Jengibre","tomato":"Tomate","potato":"Papa","lettuce":"Lechuga","cucumber":"Pepino","cilantro":"Cilantro","mint":"Menta","salt":"Sal","sugar":"Azúcar","flour":"Harina","container":"Contenedor","containers":"Contenedores","bag":"Bolsa","bags":"Bolsas","box":"Caja","boxes":"Cajas","can":"Lata","canned":"Enlatado","napkins":"Servilletas"}
    : {"pollo":"Chicken","carne":"Beef","res":"Beef","cordero":"Lamb","arroz":"Rice","basmati":"Basmati","leche":"Milk","queso":"Cheese","yogurt":"Yogurt","crema":"Cream","mantequilla":"Butter","polvo":"Powder","pimienta":"Pepper","salsa":"Sauce","jugo":"Juice","aceite":"Oil","cebolla":"Onion","roja":"Red","blanca":"White","verde":"Green","ajo":"Garlic","jengibre":"Ginger","tomate":"Tomato","papa":"Potato","lechuga":"Lettuce","pepino":"Cucumber","cilantro":"Cilantro","menta":"Mint","sal":"Salt","azucar":"Sugar","harina":"Flour","contenedor":"Container","contenedores":"Containers","bolsa":"Bag","bolsas":"Bags","caja":"Box","cajas":"Boxes","lata":"Can","enlatado":"Canned","servilletas":"Napkins"};
  const parts=raw.split(/\s+/).map(w=>words[normalizeNameForSuggest(w)]||w);
  const guessed=titleCaseSuggestion(parts.join(' '));
  return normalizeNameForSuggest(guessed)!==norm ? guessed : "";
}
function setTranslationNote(note, type){
  if(!note) return;
  const es = state.lang==='es';
  if(type==='suggested') note.textContent = es ? 'Traducción sugerida automáticamente. Puedes modificarla antes de guardar.' : 'Translation suggested automatically. You can edit it before saving.';
  if(type==='none') note.textContent = es ? 'No encontré una sugerencia local para ese nombre. Puedes escribir la traducción manualmente.' : 'No local suggestion found for that name. You can enter the translation manually.';
}
function bindProductTranslationSuggestions(root){
  const en=root.querySelector('input[name="nombreEN"]'), es=root.querySelector('input[name="nombreES"]');
  const note=root.querySelector('[data-translation-note]');
  if(!en || !es) return;
  const touched={en:!!en.value, es:!!es.value};
  const apply=(source, force=false)=>{
    const from = source==='en' ? en : es;
    const to = source==='en' ? es : en;
    const target = source==='en' ? 'es' : 'en';
    if(!from.value.trim()) return;
    if(!force && touched[target] && to.value.trim()) return;
    const sug=suggestProductTranslation(from.value, source);
    if(sug){ to.value=sug; touched[target]=false; setTranslationNote(note,'suggested'); }
    else if(force || !to.value.trim()) setTranslationNote(note,'none');
  };
  en.addEventListener('input',()=>{ touched.en=true; apply('en'); });
  es.addEventListener('input',()=>{ touched.es=true; apply('es'); });
  en.addEventListener('blur',()=>apply('en', true));
  es.addEventListener('blur',()=>apply('es', true));
}
function productModal(key){
  const p=key?state.products[key]:{}; const cats=Object.values(state.categories||{}), units=Object.values(state.units||{}); const storages=storageValues();
  const catsHtml = cats.length ? cats.map(c=>`<option value="${esc(c)}" ${p.categoria===c?'selected':''}>${esc(trCat(c))}</option>`).join("") : `<option value="" disabled selected>No categories loaded</option>`;
  const unitsHtml = units.length ? units.map(u=>`<option value="${esc(u)}" ${p.unidad===u?'selected':''}>${esc(trUnit(u))}</option>`).join("") : `<option value="" disabled selected>No units loaded</option>`;
  const storageHtml = storages.map(s=>`<option value="${esc(s)}" ${p.subcategoria===s?'selected':''}>${esc(storageLabel(s))}</option>`).join("");
  const title = key?L("editProduct"):L("addProduct");
  const m=modal(`<div class="product-form-modal compact-product-form"><div class="product-form-head compact"><h2>${title}</h2><p>${state.lang==='es'?'Catálogo bilingüe y datos operativos del producto.':'Bilingual catalog and operating product data.'}</p></div><form id="prodForm" class="form-grid product-form"><section class="form-section product-name-section"><h3>${state.lang==='es'?'Nombre del producto':'Product Name'}</h3><label class="field"><span>${L("nameEn")}</span><input name="nombreEN" class="input" value="${esc(p.nombreEN||p.nombre||'')}" placeholder="Lemon Juice"></label><label class="field"><span>${L("nameEs")}</span><input name="nombreES" class="input" value="${esc(p.nombreES||'')}" placeholder="Jugo de Limón"></label><small class="muted translation-note" data-translation-note>${state.lang==='es'?'Sugerencia automática si reconoce el producto.':'Automatic suggestion when the product is recognized.'}</small></section><section class="form-section inventory-section"><h3>${state.lang==='es'?'Inventario':'Inventory'}</h3><div class="compact-number-row"><label class="field compact-number"><span>${L("currentQty")}</span><input name="cantidad" type="text" inputmode="decimal" autocomplete="off" class="input decimal-input" value="${p.cantidad??0}"></label><label class="field compact-number"><span>${L("minStock")}</span><input name="minimo" type="text" inputmode="decimal" autocomplete="off" class="input decimal-input" value="${p.minimo??0}"></label></div><label class="field"><span>${L("unit")}</span><select name="unidad" class="select" required>${unitsHtml}</select></label></section><section class="form-section"><h3>${state.lang==='es'?'Clasificación':'Classification'}</h3><label class="field"><span>${L("storage")}</span><select name="subcategoria" class="select">${storageHtml}</select></label><label class="field"><span>${L("category")}</span><select name="categoria" class="select" required>${catsHtml}</select></label></section>${(!cats.length||!units.length)?`<p class="muted">Categories or units are missing. Go to Settings and import initial data before saving products.</p>`:""}<div class="modal-footer product-form-actions"><button type="button" class="btn ghost" data-close>${L("cancel")}</button>${key&&canDeleteProducts()?`<button type="button" class="btn danger" data-delete>${L("delete")}</button>`:""}<button class="btn primary" ${(!cats.length||!units.length)?"disabled":""}>${L("save")}</button></div></form></div>`);
  bindDecimalInputs(m); bindProductTranslationSuggestions(m); m.querySelector("[data-close]").onclick=()=>m.remove(); const del=m.querySelector("[data-delete]"); if(del) del.onclick=async()=>{ const ok=await confirmDialog({ title: state.lang==='es'?'Eliminar producto':'Delete product', message: state.lang==='es'?`¿Seguro que deseas eliminar ${nameOf(p)}? Esta acción no se puede deshacer.`:`Are you sure you want to delete ${nameOf(p)}? This action cannot be undone.`, confirmText: L("delete"), cancelText: L("cancel"), danger:true }); if(ok){ try{ await deleteProduct(key); m.remove(); renderApp(); } catch(err){ alert("Delete failed: "+err.message); } }}; m.querySelector("#prodForm").onsubmit=async e=>{ e.preventDefault(); try{ const data=Object.fromEntries(new FormData(e.target)); if(!key){ const matches=similarProductsForForm(data); if(matches.length){ const proceed=await similarProductDialog(matches); if(!proceed) return; } } await saveProduct(key, data); m.remove(); renderApp(); } catch(err){ alert("Save failed: "+err.message); } };
}

function resolveDuplicateModal(keyA,keyB){
  const a=state.products[keyA], b=state.products[keyB];
  if(!a || !b){ alert(state.lang==='es'?'Uno de los productos ya no existe.':'One of the products no longer exists.'); renderApp(); return; }
  const pairKey = duplicatePairKey(keyA,keyB);
  const m=modal(`<h2>${state.lang==='es'?'Resolver duplicado':'Resolve Duplicate'}</h2>
    <div class="duplicate-resolve">
      <p class="muted">${state.lang==='es'?'Elige cuál producto conservar. El otro será eliminado.':'Choose which product to keep. The other one will be deleted.'}</p>
      <label class="resolve-option"><input type="radio" name="keep" value="${esc(keyA)}" checked><span><b>${esc(nameOf(a))}</b><small>${esc(trCat(a.categoria||'-'))} · ${esc(storageLabel(a.subcategoria||''))} · Stock: ${esc(a.cantidad ?? 0)} ${esc(trUnit(a.unidad||''))}</small></span></label>
      <label class="resolve-option"><input type="radio" name="keep" value="${esc(keyB)}"><span><b>${esc(nameOf(b))}</b><small>${esc(trCat(b.categoria||'-'))} · ${esc(storageLabel(b.subcategoria||''))} · Stock: ${esc(b.cantidad ?? 0)} ${esc(trUnit(b.unidad||''))}</small></span></label>
      <div class="modal-footer"><button type="button" class="btn ghost" data-close>${L("cancel")}</button><button type="button" class="btn danger" data-delete-other>${state.lang==='es'?'Eliminar el otro':'Delete Other'}</button></div>
    </div>`);
  m.querySelector("[data-close]").onclick=()=>m.remove();
  m.querySelector("[data-delete-other]").onclick=async()=>{
    const keep = m.querySelector('input[name="keep"]:checked')?.value;
    const removeKey = keep === keyA ? keyB : keyA;
    const removeProduct = state.products[removeKey];
    const ok = await confirmDialog({
      title: state.lang==='es'?'Eliminar duplicado':'Delete duplicate',
      message: state.lang==='es'?`Se conservará "${nameOf(state.products[keep])}" y se eliminará "${nameOf(removeProduct)}". Esta acción no se puede deshacer.`:`"${nameOf(state.products[keep])}" will be kept and "${nameOf(removeProduct)}" will be deleted. This action cannot be undone.`,
      confirmText: state.lang==='es'?'Eliminar':'Delete',
      cancelText:L('cancel'),
      danger:true
    });
    if(!ok) return;
    try{
      await deleteProduct(removeKey);
      await setIgnoredDuplicate(pairKey, true);
      m.remove();
      renderApp();
    }catch(err){ alert("Delete failed: "+err.message); }
  };
}

function categoryModal(name=""){ const m=modal(`<h2>${name?L("edit"):L("add")} ${L("category")}</h2><form id="catForm" class="form-grid"><div class="two"><label class="field"><span>ES ${L("spanish")}</span><input name="name" class="input" value="${esc(name)}" required></label><label class="field"><span>EN ${L("english")}</span><input name="english" class="input" value="${esc(state.catTrans[name]||name)}" required></label></div><p class="muted">${state.lang==='es'?'Las categorías ya no usan emojis.':'Categories no longer use emojis.'}</p><div class="modal-footer"><button type="button" class="btn ghost" data-close>${L("cancel")}</button><button class="btn primary">${L("save")}</button></div></form>`); m.querySelector("[data-close]").onclick=()=>m.remove(); m.querySelector("#catForm").onsubmit=async e=>{ e.preventDefault(); await saveCategory(name, Object.fromEntries(new FormData(e.target))); m.remove(); renderApp(); }; }
function unitModal(name=""){ const m=modal(`<h2>${name?L("edit"):L("add")} ${L("unit")}</h2><form id="unitForm" class="form-grid"><div class="two"><label class="field"><span>ES ${L("spanish")}</span><input name="name" class="input" value="${esc(name)}" required></label><label class="field"><span>EN ${L("english")}</span><input name="english" class="input" value="${esc(state.unitTrans[name]||name)}" required></label></div><div class="modal-footer"><button type="button" class="btn ghost" data-close>${L("cancel")}</button><button class="btn primary">${L("save")}</button></div></form>`); m.querySelector("[data-close]").onclick=()=>m.remove(); m.querySelector("#unitForm").onsubmit=async e=>{ e.preventDefault(); await saveUnit(name, Object.fromEntries(new FormData(e.target))); m.remove(); renderApp(); }; }
function storageModal(name=""){
  const spanishValue = name ? storageLabelEs(name) : "";
  const englishValue = name ? (state.storageTrans[name] || name) : "";
  const m=modal(`<h2>${name?L("edit"):L("add")} ${L("storage")}</h2><form id="storageForm" class="form-grid">${name?`<input type="hidden" name="name" value="${esc(name)}">`:""}<div class="two"><label class="field"><span>ES ${L("spanish")}</span><input name="spanish" class="input" value="${esc(spanishValue)}" required placeholder="Congelados"></label><label class="field"><span>EN ${L("english")}</span><input name="english" class="input" value="${esc(englishValue)}" required placeholder="Frozen"></label></div><p class="muted">${state.lang==='es'?'Solo se requiere nombre en español e inglés.':'Only Spanish and English names are required.'}</p><div class="modal-footer"><button type="button" class="btn ghost" data-close>${L("cancel")}</button><button class="btn primary">${L("save")}</button></div></form>`);
  m.querySelector("[data-close]").onclick=()=>m.remove();
  m.querySelector("#storageForm").onsubmit=async e=>{ e.preventDefault(); await saveStorage(name, Object.fromEntries(new FormData(e.target))); m.remove(); renderApp(); };
}
function userModal(key=""){ const u=key?state.users[key]:{}; const m=modal(`<h2>${key?L("edit"):L("add")} ${L("users")}</h2><form id="userForm" class="form-grid"><label class="field"><span>${L("username")}</span><input name="username" class="input" value="${esc(u.username||'')}" required placeholder="Antonio"></label><label class="field"><span>Email</span><input name="email" type="email" class="input" value="${esc(u.email||'')}" required placeholder="user@imenjivar.com"></label>${!key?`<label class="field"><span>Initial password</span><input name="password" type="password" minlength="6" class="input" placeholder="Min 6 characters" required></label>`:""}<div class="two"><label class="field"><span>${L("role")}</span><select name="role" class="select"><option value="invitado" ${u.role==="invitado"?'selected':''}>invitado</option><option value="usuario" ${!u.role||u.role==="usuario"?'selected':''}>usuario</option><option value="admin" ${u.role==="admin"?'selected':''}>admin</option></select></label><label class="field"><span>Status</span><select name="activo" class="select"><option value="true" ${u.activo!==false?'selected':''}>${L("active")}</option><option value="false" ${u.activo===false?'selected':''}>${L("inactive")}</option></select></label></div><p class="muted">${L("createAuthNote")}</p><div class="modal-footer"><button type="button" class="btn ghost" data-close>${L("cancel")}</button><button class="btn primary">${L("save")}</button></div></form>`); m.querySelector("[data-close]").onclick=()=>m.remove(); m.querySelector("#userForm").onsubmit=async e=>{ e.preventDefault(); try{ const data=Object.fromEntries(new FormData(e.target)); if(key){ await saveUserProfile(key, data); } else { await createUserWithAuth(data); } m.remove(); renderApp(); } catch(err){ alert(err.message); } }; }
function resetPasswordModal(key){ const u=state.users[key]; const m=modal(`<h2>${L("resetPassword")}</h2><p class="muted">This leaves a pending temporary password. The user will receive it automatically on the next successful login.</p><h3>${esc(u?.username||u?.email||'User')}</h3><form id="resetForm" class="form-grid"><label class="field"><span>${L("temporaryPassword")}</span><input name="newPass" type="password" minlength="6" class="input" required placeholder="Min 6 characters"></label><div class="modal-footer"><button type="button" class="btn ghost" data-close>${L("cancel")}</button><button class="btn primary">${L("save")}</button></div></form>`); m.querySelector("[data-close]").onclick=()=>m.remove(); m.querySelector("#resetForm").onsubmit=async e=>{ e.preventDefault(); try{ await setPendingPasswordReset(key, new FormData(e.target).get("newPass")); m.remove(); alert("Password reset was saved. The user can now sign in with the temporary password."); } catch(err){ alert(err.message); } }; }
function changePasswordModal(){ const m=modal(`<h2>${L("changePassword")}</h2><form id="changePassForm" class="form-grid"><label class="field"><span>Current password</span><input name="current" type="password" class="input" required></label><label class="field"><span>New password</span><input name="next" type="password" minlength="6" class="input" required></label><label class="field"><span>Confirm new password</span><input name="confirm" type="password" minlength="6" class="input" required></label><div class="modal-footer"><button type="button" class="btn ghost" data-close>${L("cancel")}</button><button class="btn primary">${L("save")}</button></div></form>`); m.querySelector("[data-close]").onclick=()=>m.remove(); m.querySelector("#changePassForm").onsubmit=async e=>{ e.preventDefault(); const f=new FormData(e.target); if(f.get("next")!==f.get("confirm")){ alert("Passwords do not match"); return; } try{ await changeOwnPassword(f.get("current"), f.get("next")); m.remove(); alert("Password updated"); } catch(err){ alert(err.message); } }; }
function adjustModal(key){
  const p=state.products[key];
  let mode="entry";
  const current=parseFloat(String(p.cantidad??0).replace(",",".")) || 0;
  const unit=esc(trUnit(p.unidad));
  const adjustContextClass = state.inventoryTab === "finished" ? "finished-context" : "raw-context";
  const m=modal(`<div class="adjust-stock-modal ${adjustContextClass}"><h2 class="adjust-product-name">${esc(nameOf(p))}</h2><div class="adjust-subtitle">${L("adjustStock")}</div><div class="current-stock-box"><span>CURRENT STOCK</span><strong>${current}</strong><em>${unit}</em></div><div class="segmented adjust-segmented"><button type="button" class="segment active" data-mode="entry">+ ${L("entry")}</button><button type="button" class="segment" data-mode="exit">- ${L("exit")}</button><button type="button" class="segment" data-mode="set">= ${L("set")}</button></div><form id="adjForm" class="form-grid adjust-form"><label class="field"><span>${L("amount")}</span><input name="amount" type="text" inputmode="decimal" autocomplete="off" class="input decimal-input" required value="1"></label><div class="stock-preview" id="stockPreview"><div><span>Current Stock</span><b data-current>${current}</b></div><div><span data-action-label>Adjustment</span><b data-adjustment>+1</b></div><div class="stock-preview-total"><span>New Stock</span><b data-new-stock>0</b></div></div><div class="modal-footer"><button type="button" class="btn ghost" data-close>${L("cancel")}</button><button class="btn primary">${L("confirm")}</button></div></form></div>`);
  const amountInput=m.querySelector('input[name="amount"]');
  const preview=m.querySelector('#stockPreview');
  const parseAmount=()=>parseFloat(String(amountInput.value||"0").replace(",",".")) || 0;
  const fmt=n=>Number.isInteger(n)?String(n):String(Math.round(n*100)/100);
  const updatePreview=()=>{
    const qty=parseAmount();
    const after=mode==="entry"?current+qty:mode==="exit"?Math.max(0,current-qty):qty;
    const adj=mode==="entry"?`+${fmt(qty)}`:mode==="exit"?`-${fmt(qty)}`:fmt(qty);
    const label=mode==="set"?(state.lang==='es'?"Fijar a":"Set To"):(state.lang==='es'?"Ajuste":"Adjustment");
    preview.querySelector('[data-current]').textContent=fmt(current);
    preview.querySelector('[data-action-label]').textContent=label;
    preview.querySelector('[data-adjustment]').textContent=adj;
    preview.querySelector('[data-new-stock]').textContent=fmt(after);
    preview.classList.toggle('is-entry',mode==="entry");
    preview.classList.toggle('is-exit',mode==="exit");
    preview.classList.toggle('is-set',mode==="set");
    preview.classList.toggle('is-clamped',mode==="exit" && qty>current);
  };
  bindDecimalInputs(m);
  m.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{mode=b.dataset.mode; m.querySelectorAll(".segment").forEach(x=>x.classList.remove("active")); b.classList.add("active"); updatePreview();});
  amountInput.addEventListener('input',updatePreview);
  updatePreview();
  m.querySelector("[data-close]").onclick=()=>m.remove();
  m.querySelector("#adjForm").onsubmit=async e=>{e.preventDefault(); const f=new FormData(e.target); try{ await adjustStock(key,mode,f.get("amount"),""); m.remove(); renderApp(); } catch(err){ alert("Stock adjustment failed: "+err.message); }};
}
