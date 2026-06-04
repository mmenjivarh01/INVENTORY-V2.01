import { state, setLang, isAdmin, canManage, canAdjust, canReadReports } from "./state.js";
import { t } from "./i18n.js";
import { APP, AUTH_ALIASES, DEFAULT_LOGIN_DOMAIN } from "./config.js";
import { metrics, filteredProducts, reportProducts, categoriesForCurrentStorage, storageValues, statusOf, statusPass, productList, productEntries, baseProducts, saveProduct, deleteProduct, adjustStock, saveCategory, deleteCategory, saveUnit, deleteUnit, saveStorage, deleteStorage, saveUserProfile, deleteUserProfile, createUserWithAuth, setPendingPasswordReset, changeOwnPassword, importSeedToFirebase, clearV2Database, exportCurrentJson, useLocalSeed } from "./data.js";
import { api, auth } from "./firebase.js";

const app = document.getElementById("app");
const L = k => t(state.lang,k);
const esc = x => String(x ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const nameOf = p => state.lang === "es" ? (p.nombreES || p.nombreEN || p.nombre) : (p.nombreEN || p.nombre || p.nombreES);
const trCat = c => state.lang === "es" ? c : (state.catTrans?.[c] || c);
const trUnit = u => state.lang === "es" ? u : (state.unitTrans?.[u] || u);
const storageLabel = s => state.lang === "es" ? (state.storageTrans?.[`${s}__es`] || ({congelados:L("frozen"),refrigerados:L("refrigerated"),secos:L("dry"),limpieza:L("cleaning")}[s]) || s || "-") : (state.storageTrans?.[s] || ({congelados:L("frozen"),refrigerados:L("refrigerated"),secos:L("dry"),limpieza:L("cleaning")}[s]) || s || "-");
const storageIcon = s => state.storageIcons?.[s] || "";

export function renderLogin(error=""){
  app.innerHTML = `<main class="login"><section class="login-card">
    <img class="brand-logo" src="logo.png" alt="Afghan Kabob & Grill"><h1>${APP.brand}</h1><p>${L("loginTitle")}</p>
    ${error?`<div class="badge critical" style="display:block;text-align:center;margin:10px 0">${esc(error)}</div>`:""}
    <form id="loginForm" class="stack">
      <label class="field"><span>${L("email")}</span><input class="input" type="text" name="login" autocomplete="username" required placeholder="Admin"></label>
      <label class="field"><span>${L("password")}</span><input class="input" type="password" name="password" autocomplete="current-password" required></label>
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
  const items=[ ["dashboard","🏠",L("dashboard")], ["inventory","📦",L("inventory")], ["history","🕘",L("history")] ];
  if(canReadReports()) items.push(["reports","🧾",L("reports")]);
  if(isAdmin()) items.push(["settings","⚙️",L("settings")]);
  return items.map(([id,ico,label])=>`<button type="button" class="nav-btn ${state.view===id?'active':''}" data-view="${id}" aria-label="${label}"><span class="ico">${ico}</span><span>${label}</span></button>`).join("");
}
function userBlock(){ const p=state.profile||{}; const initial=(p.username||p.email||"?").slice(0,1).toUpperCase(); return `<div class="user-block" id="userMenuBtn"><div class="avatar">${esc(initial)}</div><div class="user-info"><b>${esc(p.username||"Guest")}</b><small>${esc(p.role||"")}</small></div><span class="chev">↗</span></div><div id="userDropdown" class="user-dropdown hidden"><button id="menuChangePass">🔑 ${L("changePassword")}</button><button id="menuLogout">↩ ${state.guest?L("close"):L("logout")}</button></div>`; }
function shell(content){
  app.innerHTML = `<div class="layout">
    <aside class="side"><div class="side-brand"><img class="side-logo" src="logo.png" alt="Afghan Kabob"><div><h2>Afghan Kabob</h2><p>Inventory</p></div></div><nav class="side-nav">${nav()}</nav><div style="margin-top:auto;position:relative">${userBlock()}</div></aside>
    <header class="topbar"><div class="spread"><div><h1>${pageTitle()}</h1><div class="sub">${APP.brand} · ${new Date().toLocaleDateString(state.lang==='es'?'es-US':'en-US')}</div></div><div class="row"><button id="topLang" class="btn small ghost">${state.lang.toUpperCase()}</button><div class="top-user desktop-only">${userBlock()}</div></div></div></header>
    <main class="content">${content}</main>
    <nav class="bottom-nav">${nav()}</nav>
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
  document.onclick=()=>app.querySelectorAll("#userDropdown").forEach(x=>x.classList.add("hidden"));
  app.querySelectorAll("#menuLogout").forEach(b=>b.onclick=()=>{ if(state.guest){location.reload()} else api.signOut(auth); });
  app.querySelectorAll("#menuChangePass").forEach(b=>b.onclick=()=>changePasswordModal());
}

// Defensive navigation fallback: keeps sidebar and bottom navigation working even after partial re-renders.
document.addEventListener('click', (e)=>{
  const btn = e.target.closest?.('[data-view]');
  if(!btn || !app.contains(btn)) return;
  e.preventDefault();
  e.stopPropagation();
  if(state.view !== btn.dataset.view) goToView(btn.dataset.view);
}, true);

function pageTitle(){ return ({dashboard:L("dashboard"),inventory:L("inventory"),history:L("history"),reports:L("reports"),settings:L("settings")})[state.view] || L("dashboard"); }
export function renderApp(){
  if(!state.profile && !state.guest){ renderLogin(); return; }
  if(state.view==='settings' && !isAdmin()) state.view='dashboard';
  if(state.view==='reports' && !canReadReports()) state.view='dashboard';
  const views={dashboard:dashboardView,inventory:inventoryView,history:historyView,reports:reportsView,settings:settingsView};
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
    <div class="purchase-row"><div><b>${esc(storageIcon(storage))} ${esc(storageLabel(storage))}</b><small>${info.count} ${L("products").toLowerCase()}</small></div><span class="badge ${info.critical?'critical':'warning'}">${info.critical||info.warning}</span></div>`).join("");
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
  </section>`;
}
function filterBox({active=false, attrs="", icon="", title="", subtitle="", count=""}){
  return `<button class="filter-box ${active?'active':''}" ${attrs}><span class="filter-box-icon">${esc(icon)}</span><span class="filter-box-text"><b>${esc(title)}</b>${subtitle?`<small>${esc(subtitle)}</small>`:""}</span>${count!==""?`<span class="filter-count">${esc(count)}</span>`:""}</button>`;
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
  return `<select id="${id}" class="select filter-select">${statusOptions(prefix).map(([key,label,count])=>`<option value="${esc(key)}" ${val===key?'selected':''}>${esc(label)} (${count})</option>`).join('')}</select>`;
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
  const boxes = [filterBox({active:!selected?.length, attrs:`${attr}="all"`, title:L('all')})]
    .concat(cats.map(c=>{
      const count = (prefix==='report'?productList():baseProducts()).filter(p=>p.categoria===c).length;
      return filterBox({active:selected?.includes(c), attrs:`${attr}="${esc(c)}"`, icon:'', title:trCat(c), subtitle:c!==trCat(c)?c:'', count});
    }));
  return `<div class="filter-box-list category-boxes">${boxes.join("")}</div>`;
}
function inventoryContextClass(){ return state.inventoryTab === 'finished' ? 'finished-context' : 'raw-context'; }
function inventoryView(){
  const list=filteredProducts();
  return `<section class="inventory-screen ${inventoryContextClass()}">
    <div class="inventory-tabs-row"><div class="inventory-tabs"><button class="inventory-tab raw ${state.inventoryTab==='raw'?'active':''}" data-tab="raw">${L("raw")}</button><button class="inventory-tab finished ${state.inventoryTab==='finished'?'active':''}" data-tab="finished">${L("finished")}</button></div>${canManage()?`<button id="addProduct" class="btn primary inventory-add">+ ${L("add")}</button>`:""}</div>
    <div class="toolbar"><div class="search-row"><input id="search" class="input" value="${esc(state.search)}" placeholder="${L("search")}"></div></div>
    <div class="filter-card card card-pad context-filter-card"><div class="filter-main-row"><div class="filter-control"><div class="filter-title">${L("filterStatus")}</div>${statusChips()}</div><div class="filter-control"><div class="filter-title">${L("filterStorage")}</div>${storageChips()}</div></div><div class="filter-title">${L("filterCategory")}</div>${categoryChips()}<button id="clearInvFilters" class="btn small ghost">${L("clearFilters")}</button></div>
    <div class="product-list">${list.map(productCard).join("") || `<div class="empty card">${L("noData")}</div>`}</div>
    <div class="table-wrap card"><table class="table"><thead><tr><th>Product</th><th>${L("category")}</th><th>${L("storage")}</th><th>${L("stock")}</th><th>${L("min")}</th><th>${L("unit")}</th><th>${L("status")}</th><th></th></tr></thead><tbody>${list.map(productTableRow).join("")}</tbody></table></div></section>`;
}
function keyForProduct(p){ return Object.keys(state.products).find(k=>state.products[k]===p || state.products[k]?.id===p.id) || `id_${p.id}`; }
function productCard(p){ const st=statusOf(p), key=keyForProduct(p); const actions=`${canAdjust()?`<button class="btn small" data-adjust="${key}">${L("adjustStock")}</button>`:""}${canManage()?`<button class="btn small ghost" data-edit="${key}">${L("edit")}</button>`:""}`; return `<article class="product-card"><div class="product-title"><div><h3>${esc(nameOf(p))}</h3><p>${esc(state.lang==='es'?p.nombreEN:p.nombreES||'')}</p></div><span class="badge ${st}">${L(st)}</span></div><div class="product-meta"><div class="mini"><span>${L("stock")}</span><b>${p.cantidad}</b></div><div class="mini"><span>${L("min")}</span><b>${p.minimo}</b></div><div class="mini"><span>${L("unit")}</span><b>${esc(trUnit(p.unidad))}</b></div></div><div class="actions">${actions}</div></article>`; }
function productTableRow(p){ const st=statusOf(p), key=keyForProduct(p); return `<tr><td><b>${esc(nameOf(p))}</b><br><small class="muted">${esc(state.lang==='es'?p.nombreEN:p.nombreES||'')}</small></td><td>${esc(trCat(p.categoria))}</td><td>${esc(storageIcon(p.subcategoria))} ${esc(storageLabel(p.subcategoria))}</td><td>${p.cantidad}</td><td>${p.minimo}</td><td>${esc(trUnit(p.unidad))}</td><td><span class="badge ${st}">${L(st)}</span></td><td><div class="row">${canAdjust()?`<button class="btn small" data-adjust="${key}">${L("adjustStock")}</button>`:""}${canManage()?`<button class="btn small ghost" data-edit="${key}">${L("edit")}</button>`:""}</div></td></tr>`; }
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
function historyView(){ const items=Object.values(state.history).sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,200); return `<section class="card card-pad"><h2 class="panel-title">${L("history")}</h2><div class="history-list">${items.map(historyItem).join("") || `<div class="empty">${L("noData")}</div>`}</div></section>`; }
function reportsView(){ const list=reportProducts(); const m={total:list.length, low:list.filter(p=>statusOf(p)==="warning").length, out:list.filter(p=>statusOf(p)==="critical").length}; return `<section class="stack"><div class="row no-print"><button id="printBtn" class="btn primary">${L("print")}</button>${isAdmin()?`<button id="exportBtn" class="btn ghost">${L("exportData")}</button>`:""}</div><div class="filter-card card card-pad no-print context-filter-card"><div class="filter-main-row"><div class="filter-control"><div class="filter-title">${L("filterStatus")}</div>${statusChips('report')}</div><div class="filter-control"><div class="filter-title">${L("filterStorage")}</div>${storageChips('report')}</div></div><div class="filter-title">${L("filterCategory")}</div>${categoryChips('report')}<button id="clearReportFilters" class="btn small ghost">${L("clearFilters")}</button></div><div class="report card"><div class="spread"><div><h1>${APP.brand}</h1><p>${L("reportTitle")}</p></div><div>${new Date().toLocaleString(state.lang==='es'?'es-US':'en-US')}</div></div><hr><p>${L("total")}: <b>${m.total}</b> &nbsp; ${L("lowStock")}: <b>${m.low}</b> &nbsp; ${L("outStock")}: <b>${m.out}</b></p><table><thead><tr><th>Product</th><th>${L("category")}</th><th>${L("stock")}</th><th>${L("min")}</th><th>${L("unit")}</th><th>${L("status")}</th></tr></thead><tbody>${list.map(p=>`<tr><td>${esc(nameOf(p))}</td><td>${esc(trCat(p.categoria))}</td><td>${p.cantidad}</td><td>${p.minimo}</td><td>${esc(trUnit(p.unidad))}</td><td>${L(statusOf(p))}</td></tr>`).join("")}</tbody></table></div></section>`; }
function settingsView(){
  const catRows=Object.values(state.categories||{}).map(c=>`<div class="manage-row"><div><b>${esc(trCat(c))}</b><small>ES ${esc(c)}</small></div><div class="row"><button class="btn small ghost" data-edit-cat="${esc(c)}">${L("edit")}</button><button class="btn small danger" data-del-cat="${esc(c)}">${L("delete")}</button></div></div>`).join("");
  const unitRows=Object.values(state.units||{}).map(u=>`<div class="manage-row"><div><b>${esc(trUnit(u))}</b><small>ES ${esc(u)}</small></div><div class="row"><button class="btn small ghost" data-edit-unit="${esc(u)}">${L("edit")}</button><button class="btn small danger" data-del-unit="${esc(u)}">${L("delete")}</button></div></div>`).join("");
  const storageRows=storageValues().map(s=>`<div class="manage-row"><div><b>${esc(storageIcon(s))} ${esc(storageLabel(s))}</b><small>key ${esc(s)}</small></div><div class="row"><button class="btn small ghost" data-edit-storage="${esc(s)}">${L("edit")}</button><button class="btn small danger" data-del-storage="${esc(s)}">${L("delete")}</button></div></div>`).join("");
  const userRows=Object.entries(state.users||{}).map(([k,u])=>`<div class="manage-row user-manage-row"><div><b>${esc(u.username||u.email)}</b><small>${esc(u.email||"")}</small></div><span class="badge normal">${esc(u.role||"")}</span><div class="row"><button class="btn small ghost" data-edit-user="${esc(k)}">${L("edit")}</button><button class="btn small ghost" data-reset-user="${esc(k)}">🔑 ${L("resetPassword")}</button><button class="btn small danger" data-del-user="${esc(k)}">${L("delete")}</button></div></div>`).join("");
  return `<section class="settings-page stack">
    <section class="card card-pad settings-section full"><div class="spread"><div><h2>${L("users")}</h2><p class="muted">${L("createAuthNote")}</p></div><button id="addUser" class="btn primary">+ ${L("add")}</button></div><div class="manage-list users-list">${userRows || `<div class="empty">${L("noData")}</div>`}</div></section>
    <section class="settings-two-col"><div class="card card-pad settings-section"><div class="spread"><h2>${L("category")}</h2><button id="addCategory" class="btn small primary">+ ${L("add")}</button></div><div class="manage-list">${catRows || `<div class="empty">${L("noData")}</div>`}</div></div><div class="card card-pad settings-section"><div class="spread"><h2>${L("unit")}</h2><button id="addUnit" class="btn small primary">+ ${L("add")}</button></div><div class="manage-list">${unitRows || `<div class="empty">${L("noData")}</div>`}</div></div></section>
    <section class="settings-two-col"><div class="card card-pad settings-section"><div class="spread"><h2>${L("storage")}</h2><button id="addStorage" class="btn small primary">+ ${L("add")}</button></div><div class="manage-list">${storageRows}</div></div><div class="card card-pad settings-section data-panel"><h2>Data</h2><p class="muted">Use this only in the V2 Firebase project.</p><div class="stack"><button id="importSeed" class="btn primary">${L("importData")}</button><button id="clearDb" class="btn danger">Clear test data</button><button id="exportBtn" class="btn ghost">${L("exportData")}</button></div></div></section>
  </section>`;
}
export function bindView(){
  app.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{state.inventoryTab=b.dataset.tab; state.filterCategories=[]; renderApp();});
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
  const clearInv=app.querySelector("#clearInvFilters"); if(clearInv) clearInv.onclick=()=>{state.filterStatus='all';state.filterStorage='all';state.filterCategories=[];state.search='';renderApp();};
  const clearRep=app.querySelector("#clearReportFilters"); if(clearRep) clearRep.onclick=()=>{state.reportStatus='all';state.reportStorage='all';state.reportCategories=[];renderApp();};
  app.querySelectorAll("#addProduct").forEach(b=>b.onclick=()=>canManage()&&productModal()); app.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>canManage()&&productModal(b.dataset.edit)); app.querySelectorAll("[data-adjust]").forEach(b=>b.onclick=()=>canAdjust()&&adjustModal(b.dataset.adjust));
  app.querySelectorAll("#printBtn").forEach(b=>b.onclick=()=>window.print()); app.querySelectorAll("#exportBtn").forEach(b=>b.onclick=()=>isAdmin()&&exportCurrentJson());
  app.querySelectorAll("#importSeed").forEach(b=>b.onclick=async()=>{ if(confirm("Import seed data into this Firebase project? This will overwrite products, categories, units, users and history in this V2 database.")){ try{ await importSeedToFirebase(); alert("Imported"); } catch(err){ alert("Import failed: "+err.message); } }});
  app.querySelectorAll("#clearDb").forEach(b=>b.onclick=async()=>{ if(confirm("Clear V2 test inventory and history? This keeps the current user profiles but removes products, categories and units.")){ try{ await clearV2Database(); alert("V2 test data cleared"); renderApp(); } catch(err){ alert("Clear failed: "+err.message); } }});
  app.querySelectorAll("#addCategory").forEach(b=>b.onclick=()=>categoryModal()); app.querySelectorAll("[data-edit-cat]").forEach(b=>b.onclick=()=>categoryModal(b.dataset.editCat)); app.querySelectorAll("[data-del-cat]").forEach(b=>b.onclick=async()=>{ if(confirm(`Delete category ${b.dataset.delCat}?`)){ await deleteCategory(b.dataset.delCat); renderApp(); }});
  app.querySelectorAll("#addUnit").forEach(b=>b.onclick=()=>unitModal()); app.querySelectorAll("[data-edit-unit]").forEach(b=>b.onclick=()=>unitModal(b.dataset.editUnit)); app.querySelectorAll("[data-del-unit]").forEach(b=>b.onclick=async()=>{ if(confirm(`Delete unit ${b.dataset.delUnit}?`)){ await deleteUnit(b.dataset.delUnit); renderApp(); }});
  app.querySelectorAll("#addStorage").forEach(b=>b.onclick=()=>storageModal()); app.querySelectorAll("[data-edit-storage]").forEach(b=>b.onclick=()=>storageModal(b.dataset.editStorage)); app.querySelectorAll("[data-del-storage]").forEach(b=>b.onclick=async()=>{ if(confirm(`Delete storage ${b.dataset.delStorage}?`)){ await deleteStorage(b.dataset.delStorage); renderApp(); }});
  app.querySelectorAll("#addUser").forEach(b=>b.onclick=()=>userModal()); app.querySelectorAll("[data-edit-user]").forEach(b=>b.onclick=()=>userModal(b.dataset.editUser)); app.querySelectorAll("[data-reset-user]").forEach(b=>b.onclick=()=>resetPasswordModal(b.dataset.resetUser)); app.querySelectorAll("[data-del-user]").forEach(b=>b.onclick=async()=>{ if(confirm("Delete user profile? This does not delete Firebase Authentication user.")){ await deleteUserProfile(b.dataset.delUser); renderApp(); }});
  app.querySelectorAll("#changePassword").forEach(b=>b.onclick=()=>changePasswordModal());
}
function modal(html){ const wrap=document.createElement("div"); wrap.className="modal-backdrop"; wrap.innerHTML=`<section class="modal">${html}</section>`; document.body.append(wrap); wrap.addEventListener("click",e=>{ if(e.target===wrap) wrap.remove(); }); return wrap; }
function bindDecimalInputs(root){ root.querySelectorAll(".decimal-input").forEach(input=>{ input.addEventListener("focus",()=>{ if(input.dataset.cleared!=="1"){ input.value=""; input.dataset.cleared="1"; }}); input.addEventListener("input",()=>{ input.value = input.value.replace(/,/g,".").replace(/[^0-9.]/g,"").replace(/(\..*)\./g,"$1"); }); }); }
function productModal(key){
  const p=key?state.products[key]:{}; const cats=Object.values(state.categories||{}), units=Object.values(state.units||{}); const storages=storageValues();
  const catsHtml = cats.length ? cats.map(c=>`<option value="${esc(c)}" ${p.categoria===c?'selected':''}>${esc(trCat(c))}</option>`).join("") : `<option value="" disabled selected>No categories loaded</option>`;
  const unitsHtml = units.length ? units.map(u=>`<option value="${esc(u)}" ${p.unidad===u?'selected':''}>${esc(trUnit(u))}</option>`).join("") : `<option value="" disabled selected>No units loaded</option>`;
  const storageHtml = storages.map(s=>`<option value="${esc(s)}" ${p.subcategoria===s?'selected':''}>${esc(storageIcon(s))} ${esc(storageLabel(s))}</option>`).join("");
  const m=modal(`<h2>${key?L("editProduct"):L("addProduct")}</h2><form id="prodForm" class="form-grid"><div class="two"><label class="field"><span>${L("nameEn")}</span><input name="nombreEN" class="input" value="${esc(p.nombreEN||p.nombre||'')}" required></label><label class="field"><span>${L("nameEs")}</span><input name="nombreES" class="input" value="${esc(p.nombreES||'')}"></label></div><label class="field"><span>${L("storage")}</span><select name="subcategoria" class="select">${storageHtml}</select></label><div class="two"><label class="field"><span>${L("category")}</span><select name="categoria" class="select" required>${catsHtml}</select></label><label class="field"><span>${L("unit")}</span><select name="unidad" class="select" required>${unitsHtml}</select></label></div><div class="two"><label class="field"><span>${L("currentQty")}</span><input name="cantidad" type="text" inputmode="decimal" autocomplete="off" class="input decimal-input" value="${p.cantidad??0}"></label><label class="field"><span>${L("minStock")}</span><input name="minimo" type="text" inputmode="decimal" autocomplete="off" class="input decimal-input" value="${p.minimo??0}"></label></div>${(!cats.length||!units.length)?`<p class="muted">Categories or units are missing. Go to Settings and import initial data before saving products.</p>`:""}<div class="modal-footer"><button type="button" class="btn ghost" data-close>${L("cancel")}</button>${key?`<button type="button" class="btn danger" data-delete>${L("delete")}</button>`:""}<button class="btn primary" ${(!cats.length||!units.length)?"disabled":""}>${L("save")}</button></div></form>`);
  bindDecimalInputs(m); m.querySelector("[data-close]").onclick=()=>m.remove(); const del=m.querySelector("[data-delete]"); if(del) del.onclick=async()=>{ if(confirm("Delete product?")){ try{ await deleteProduct(key); m.remove(); renderApp(); } catch(err){ alert("Delete failed: "+err.message); } }}; m.querySelector("#prodForm").onsubmit=async e=>{ e.preventDefault(); try{ await saveProduct(key, Object.fromEntries(new FormData(e.target))); m.remove(); renderApp(); } catch(err){ alert("Save failed: "+err.message); } };
}
function categoryModal(name=""){ const m=modal(`<h2>${name?L("edit"):L("add")} ${L("category")}</h2><form id="catForm" class="form-grid"><div class="two"><label class="field"><span>ES ${L("spanish")}</span><input name="name" class="input" value="${esc(name)}" required></label><label class="field"><span>EN ${L("english")}</span><input name="english" class="input" value="${esc(state.catTrans[name]||name)}" required></label></div><p class="muted">${state.lang==='es'?'Las categorías ya no usan emojis.':'Categories no longer use emojis.'}</p><div class="modal-footer"><button type="button" class="btn ghost" data-close>${L("cancel")}</button><button class="btn primary">${L("save")}</button></div></form>`); m.querySelector("[data-close]").onclick=()=>m.remove(); m.querySelector("#catForm").onsubmit=async e=>{ e.preventDefault(); await saveCategory(name, Object.fromEntries(new FormData(e.target))); m.remove(); renderApp(); }; }
function unitModal(name=""){ const m=modal(`<h2>${name?L("edit"):L("add")} ${L("unit")}</h2><form id="unitForm" class="form-grid"><div class="two"><label class="field"><span>ES ${L("spanish")}</span><input name="name" class="input" value="${esc(name)}" required></label><label class="field"><span>EN ${L("english")}</span><input name="english" class="input" value="${esc(state.unitTrans[name]||name)}" required></label></div><div class="modal-footer"><button type="button" class="btn ghost" data-close>${L("cancel")}</button><button class="btn primary">${L("save")}</button></div></form>`); m.querySelector("[data-close]").onclick=()=>m.remove(); m.querySelector("#unitForm").onsubmit=async e=>{ e.preventDefault(); await saveUnit(name, Object.fromEntries(new FormData(e.target))); m.remove(); renderApp(); }; }
function storageModal(name=""){ const m=modal(`<h2>${name?L("edit"):L("add")} ${L("storage")}</h2><form id="storageForm" class="form-grid"><label class="field"><span>${L("icon")}</span><input name="icon" class="input" value="${esc(state.storageIcons[name]||'')}" placeholder="🧊"></label><label class="field"><span>Key</span><input name="name" class="input" value="${esc(name)}" required placeholder="freezer"></label><div class="two"><label class="field"><span>ES ${L("spanish")}</span><input name="spanish" class="input" value="${esc(state.storageTrans[`${name}__es`]||storageLabel(name))}" required></label><label class="field"><span>EN ${L("english")}</span><input name="english" class="input" value="${esc(state.storageTrans[name]||name)}" required></label></div><div class="modal-footer"><button type="button" class="btn ghost" data-close>${L("cancel")}</button><button class="btn primary">${L("save")}</button></div></form>`); m.querySelector("[data-close]").onclick=()=>m.remove(); m.querySelector("#storageForm").onsubmit=async e=>{ e.preventDefault(); await saveStorage(name, Object.fromEntries(new FormData(e.target))); m.remove(); renderApp(); }; }
function userModal(key=""){ const u=key?state.users[key]:{}; const m=modal(`<h2>${key?L("edit"):L("add")} ${L("users")}</h2><form id="userForm" class="form-grid"><label class="field"><span>${L("username")}</span><input name="username" class="input" value="${esc(u.username||'')}" required placeholder="Antonio"></label><label class="field"><span>Email</span><input name="email" type="email" class="input" value="${esc(u.email||'')}" required placeholder="user@imenjivar.com"></label>${!key?`<label class="field"><span>Initial password</span><input name="password" type="password" minlength="6" class="input" placeholder="Min 6 characters" required></label>`:""}<div class="two"><label class="field"><span>${L("role")}</span><select name="role" class="select"><option value="invitado" ${u.role==="invitado"?'selected':''}>invitado</option><option value="usuario" ${!u.role||u.role==="usuario"?'selected':''}>usuario</option><option value="admin" ${u.role==="admin"?'selected':''}>admin</option></select></label><label class="field"><span>Status</span><select name="activo" class="select"><option value="true" ${u.activo!==false?'selected':''}>${L("active")}</option><option value="false" ${u.activo===false?'selected':''}>${L("inactive")}</option></select></label></div><p class="muted">${L("createAuthNote")}</p><div class="modal-footer"><button type="button" class="btn ghost" data-close>${L("cancel")}</button><button class="btn primary">${L("save")}</button></div></form>`); m.querySelector("[data-close]").onclick=()=>m.remove(); m.querySelector("#userForm").onsubmit=async e=>{ e.preventDefault(); try{ const data=Object.fromEntries(new FormData(e.target)); if(key){ await saveUserProfile(key, data); } else { await createUserWithAuth(data); } m.remove(); renderApp(); } catch(err){ alert(err.message); } }; }
function resetPasswordModal(key){ const u=state.users[key]; const m=modal(`<h2>${L("resetPassword")}</h2><p class="muted">This leaves a pending temporary password. The user will receive it automatically on the next successful login.</p><h3>${esc(u?.username||u?.email||'User')}</h3><form id="resetForm" class="form-grid"><label class="field"><span>${L("temporaryPassword")}</span><input name="newPass" type="password" minlength="6" class="input" required placeholder="Min 6 characters"></label><div class="modal-footer"><button type="button" class="btn ghost" data-close>${L("cancel")}</button><button class="btn primary">${L("save")}</button></div></form>`); m.querySelector("[data-close]").onclick=()=>m.remove(); m.querySelector("#resetForm").onsubmit=async e=>{ e.preventDefault(); try{ await setPendingPasswordReset(key, new FormData(e.target).get("newPass")); m.remove(); alert("Password reset was saved. The user can now sign in with the temporary password."); } catch(err){ alert(err.message); } }; }
function changePasswordModal(){ const m=modal(`<h2>${L("changePassword")}</h2><form id="changePassForm" class="form-grid"><label class="field"><span>Current password</span><input name="current" type="password" class="input" required></label><label class="field"><span>New password</span><input name="next" type="password" minlength="6" class="input" required></label><label class="field"><span>Confirm new password</span><input name="confirm" type="password" minlength="6" class="input" required></label><div class="modal-footer"><button type="button" class="btn ghost" data-close>${L("cancel")}</button><button class="btn primary">${L("save")}</button></div></form>`); m.querySelector("[data-close]").onclick=()=>m.remove(); m.querySelector("#changePassForm").onsubmit=async e=>{ e.preventDefault(); const f=new FormData(e.target); if(f.get("next")!==f.get("confirm")){ alert("Passwords do not match"); return; } try{ await changeOwnPassword(f.get("current"), f.get("next")); m.remove(); alert("Password updated"); } catch(err){ alert(err.message); } }; }
function adjustModal(key){ const p=state.products[key]; let mode="entry"; const m=modal(`<h2>${L("adjustStock")}</h2><h3>${esc(nameOf(p))}</h3><p class="muted">${L("stock")}: <b>${p.cantidad}</b> ${esc(trUnit(p.unidad))}</p><div class="segmented"><button class="segment active" data-mode="entry">+ ${L("entry")}</button><button class="segment" data-mode="exit">- ${L("exit")}</button><button class="segment" data-mode="set">= ${L("set")}</button></div><form id="adjForm" class="form-grid" style="margin-top:14px"><label class="field"><span>${L("amount")}</span><input name="amount" type="text" inputmode="decimal" autocomplete="off" class="input decimal-input" required value="1"></label><label class="field"><span>${L("reason")}</span><input name="reason" class="input"></label><div class="modal-footer"><button type="button" class="btn ghost" data-close>${L("cancel")}</button><button class="btn primary">${L("confirm")}</button></div></form>`); bindDecimalInputs(m); m.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{mode=b.dataset.mode; m.querySelectorAll(".segment").forEach(x=>x.classList.remove("active")); b.classList.add("active")}); m.querySelector("[data-close]").onclick=()=>m.remove(); m.querySelector("#adjForm").onsubmit=async e=>{e.preventDefault(); const f=new FormData(e.target); try{ await adjustStock(key,mode,f.get("amount"),f.get("reason")); m.remove(); renderApp(); } catch(err){ alert("Stock adjustment failed: "+err.message); }}; }
