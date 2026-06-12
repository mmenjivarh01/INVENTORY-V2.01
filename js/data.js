import { db, auth, api } from "./firebase.js";
import { APP, DEFAULT_USERS } from "./config.js";
import { state } from "./state.js";

const invRoot = () => `inventario/${APP.inventoryKey}`;
const productPath = id => `${invRoot()}/productos/${id}`;
export const SESSION_TIMEOUT_MS = 20 * 60 * 1000;
export const SESSION_STALE_MS = SESSION_TIMEOUT_MS + 90 * 1000;

export const DEFAULT_STORAGES = {
  s0000: "congelados",
  s0001: "refrigerados",
  s0002: "secos",
  s0003: "limpieza"
};
export const DEFAULT_STORAGE_TRANS = {
  congelados: "Frozen",
  refrigerados: "Refrigerated",
  secos: "Dry Goods",
  limpieza: "Cleaning"
};
export const DEFAULT_STORAGE_ICONS = {
  congelados: "🧊",
  refrigerados: "❄️",
  secos: "🌾",
  limpieza: "🧽"
};

function emailKey(email){ return `email_${String(email || "").toLowerCase().replace(/[^a-z0-9]/g,"_")}`; }
export function profileFromEmail(email){
  const e = String(email || "").toLowerCase();
  return DEFAULT_USERS.find(u => String(u.email).toLowerCase() === e) || null;
}

function normalizeInv(inv={}){
  return {
    productos: inv.productos || {},
    categorias: inv.categorias || {},
    unidades: inv.unidades || {},
    caticons: inv.caticons || {},
    cattrans: inv.cattrans || {},
    unittrans: inv.unittrans || {},
    almacenamientos: inv.almacenamientos || DEFAULT_STORAGES,
    storagetrans: inv.storagetrans || DEFAULT_STORAGE_TRANS,
    storageicons: inv.storageicons || DEFAULT_STORAGE_ICONS,
    reviewIgnoredDuplicates: inv.reviewIgnoredDuplicates || {}
  };
}

export async function ensureDefaultUsers(currentUser=null){
  if (state.guest) return;
  const usersSnap = await api.get(api.ref(db, "usuarios"));
  const users = usersSnap.val() || {};
  const existingByEmail = {};
  Object.entries(users).forEach(([key,u]) => {
    if (u && u.email) existingByEmail[String(u.email).toLowerCase()] = { key, user:u };
  });
  const updates = {};
  for (const def of DEFAULT_USERS){
    const e = String(def.email).toLowerCase();
    let key = existingByEmail[e]?.key || emailKey(e);
    if (currentUser && String(currentUser.email || "").toLowerCase() === e) key = currentUser.uid;
    const old = existingByEmail[e]?.user || users[key] || {};
    updates[`usuarios/${key}`] = {
      ...def,
      ...old,
      email: def.email,
      username: old.username || def.username,
      role: old.role || def.role,
      activo: old.activo === false ? false : true
    };
  }
  if (Object.keys(updates).length) await api.update(api.ref(db, "/"), updates);
}

export async function saveUserProfile(key, form){
  const email = String(form.email || "").trim().toLowerCase();
  const username = String(form.username || "").trim();
  if(!email || !username) throw new Error("Username and email are required");
  const id = key || emailKey(email);
  const profile = { ...(state.users?.[id] || {}), username, email, role: form.role || "usuario", activo: form.activo !== "false" };
  if(state.guest){ state.users[id]=profile; return; }
  await api.set(api.ref(db, `usuarios/${id}`), profile);
}
export async function deleteUserProfile(key){
  if(state.guest){ delete state.users[key]; return; }
  await api.remove(api.ref(db, `usuarios/${key}`));
}

export async function loadSeedLocal(){ const r = await fetch("data/seed.json"); return await r.json(); }
export async function importSeedToFirebase(){
  const seed = await loadSeedLocal();
  const inv = normalizeInv(seed.inventario?.[APP.inventoryKey] || {});
  const payload = {
    inventario: { [APP.inventoryKey]: inv },
    historial: seed.historial || {},
    usuarios: seed.usuarios || {}
  };
  await api.set(api.ref(db, "/"), payload);
}
export async function restoreCurrentJson(payload){
  if(state.guest) return;
  if(!payload || typeof payload !== "object") throw new Error("Invalid backup file");
  const inv = payload.inventario?.[APP.inventoryKey] || payload.inventory || payload;
  const updates = {};
  if(payload.inventario?.[APP.inventoryKey] || payload.inventory || inv.productos || inv.categorias || inv.unidades){
    updates[`inventario/${APP.inventoryKey}`] = normalizeInv(inv);
  }
  if(payload.usuarios) updates["usuarios"] = payload.usuarios;
  if(payload.historial) updates["historial"] = payload.historial;
  if(!Object.keys(updates).length) throw new Error("Backup does not contain compatible data");
  await api.update(api.ref(db, "/"), updates);
}

export async function recordSessionStart(){
  if(state.guest || !state.user) return;
  const now = Date.now();
  const key = state.user.uid;
  const patch = { lastLogin: now, sessionStartedAt: now, lastSeenAt: now, isOnline: true };
  await api.update(api.ref(db, `usuarios/${key}`), patch).catch(()=>{});
  api.onDisconnect(api.ref(db, `usuarios/${key}`)).update({
    isOnline: false,
    lastLogout: api.serverTimestamp(),
    logoutReason: "disconnect"
  }).catch(()=>{});
  state.profile = { ...(state.profile||{}), ...patch };
}

export async function recordSessionHeartbeat(){
  if(state.guest || !state.user) return;
  const now = Date.now();
  const patch = { lastSeenAt: now, isOnline: true };
  await api.update(api.ref(db, `usuarios/${state.user.uid}`), patch).catch(()=>{});
  state.profile = { ...(state.profile||{}), ...patch };
}

export async function recordSessionEnd(reason="logout"){
  if(state.guest || !state.user) return;
  const now = Date.now();
  const started = Number(state.profile?.sessionStartedAt || state.profile?.lastLogin || now);
  const lastSessionMinutes = Math.max(0, Math.round((now - started) / 60000));
  const key = state.user.uid;
  const patch = { lastLogout: now, lastSeenAt: now, lastSessionMinutes, isOnline: false, logoutReason: reason };
  api.onDisconnect(api.ref(db, `usuarios/${key}`)).cancel().catch(()=>{});
  await api.update(api.ref(db, `usuarios/${key}`), patch).catch(()=>{});
  state.profile = { ...(state.profile||{}), ...patch };
}

function staleSessionPatch(u){
  if(!u?.isOnline) return null;
  const now = Date.now();
  const seen = Number(u.lastSeenAt || u.sessionStartedAt || u.lastLogin || 0);
  if(!seen || now - seen <= SESSION_STALE_MS) return null;
  const started = Number(u.sessionStartedAt || u.lastLogin || seen);
  const inferredEnd = Number(u.lastSeenAt || 0) || Math.min(now, started + SESSION_TIMEOUT_MS);
  return {
    isOnline: false,
    lastLogout: inferredEnd,
    lastSessionMinutes: Math.max(0, Math.round((inferredEnd - started) / 60000)),
    logoutReason: "stale"
  };
}

function cleanupStaleSessions(users){
  if(state.guest || !users) return;
  const updates = {};
  Object.entries(users).forEach(([key,u]) => {
    const patch = staleSessionPatch(u);
    if(patch) Object.entries(patch).forEach(([field,value]) => updates[`usuarios/${key}/${field}`] = value);
  });
  if(Object.keys(updates).length) api.update(api.ref(db, "/"), updates).catch(()=>{});
}

export async function loadProfile(uid, email=""){
  const direct = await api.get(api.ref(db, `usuarios/${uid}`));
  if (direct.exists()) return direct.val();
  const usersSnap = await api.get(api.ref(db, "usuarios"));
  const users = usersSnap.val() || {};
  const match = Object.values(users).find(u => String(u.email || "").toLowerCase() === String(email || "").toLowerCase());
  if (match) {
    await api.set(api.ref(db, `usuarios/${uid}`), { ...match, email: match.email || email });
    return { ...match, email: match.email || email };
  }
  const fallback = profileFromEmail(email);
  if (fallback) {
    await api.set(api.ref(db, `usuarios/${uid}`), fallback);
    return fallback;
  }
  return null;
}

export function subscribeAll(render){
  state.unsub.forEach(fn => fn()); state.unsub = [];
  let renderQueued = false;
  const scheduleRender = () => {
    if(renderQueued) return;
    renderQueued = true;
    const flush = () => { renderQueued = false; render(); };
    if(typeof requestAnimationFrame === "function") requestAnimationFrame(flush);
    else setTimeout(flush, 0);
  };
  const bindings = [
    [api.ref(db, `${invRoot()}/productos`), v => state.products = v || {}],
    [api.ref(db, `${invRoot()}/categorias`), v => state.categories = v || {}],
    [api.ref(db, `${invRoot()}/unidades`), v => state.units = v || {}],
    [api.ref(db, `${invRoot()}/almacenamientos`), v => state.storages = v || DEFAULT_STORAGES],
    [api.ref(db, `${invRoot()}/caticons`), v => state.catIcons = v || {}],
    [api.ref(db, `${invRoot()}/cattrans`), v => state.catTrans = v || {}],
    [api.ref(db, `${invRoot()}/unittrans`), v => state.unitTrans = v || {}],
    [api.ref(db, `${invRoot()}/storagetrans`), v => state.storageTrans = v || DEFAULT_STORAGE_TRANS],
    [api.ref(db, `${invRoot()}/storageicons`), v => state.storageIcons = v || DEFAULT_STORAGE_ICONS],
    [api.ref(db, `${invRoot()}/reviewIgnoredDuplicates`), v => state.reviewIgnoredDuplicates = v || {}],
    [api.ref(db, `historial`), v => state.history = v || {}],
    [api.ref(db, `usuarios`), v => { state.users = v || {}; cleanupStaleSessions(state.users); }]
  ];
  bindings.forEach(([r,setter])=>{ const unsub = api.onValue(r, s => { setter(s.val()); scheduleRender(); }); state.unsub.push(unsub); });
}

export async function useLocalSeed(){
  const seed = await loadSeedLocal();
  const inv = normalizeInv(seed.inventario?.[APP.inventoryKey] || {});
  Object.assign(state, {
    products: inv.productos, categories: inv.categorias, units: inv.unidades, storages: inv.almacenamientos,
    catIcons: inv.caticons, catTrans: inv.cattrans, unitTrans: inv.unittrans, storageTrans: inv.storagetrans, storageIcons: inv.storageicons,
    reviewIgnoredDuplicates: inv.reviewIgnoredDuplicates || {},
    history: seed.historial || {}, users: seed.usuarios || {}, guest: true
  });
}

export const productEntries = () => Object.entries(state.products || {}).sort((a,b)=>(a[1].nombreEN||a[1].nombre||"").localeCompare(b[1].nombreEN||b[1].nombre||""));
export const productList = () => productEntries().map(([,p])=>p);
export const statusOf = p => Number(p.cantidad) <= 0 ? "critical" : Number(p.cantidad) <= Number(p.minimo||0) ? "warning" : "normal";
function updatedAgeMs(p){ return Date.now() - Number(p.updatedAt || 0); }
export function updateAgeBucket(p){
  const ts = Number(p.updatedAt || 0);
  if(!ts) return "stale";
  const days = updatedAgeMs(p) / 86400000;
  if(days < 1) return "fresh";
  if(days < 4) return "recent";
  if(days <= 7) return "aging";
  return "stale";
}
export function isRecentlyUpdated(p, hours=2){
  const ts = Number(p.updatedAt || 0);
  return !!ts && (Date.now() - ts) <= hours * 3600000;
}
export function sortByOldestUpdate(list){
  return [...list].sort((a,b)=>{
    const au = Number(a.updatedAt || 0);
    const bu = Number(b.updatedAt || 0);
    if(au !== bu) return au - bu;
    return (a.nombreEN||a.nombre||"").localeCompare(b.nombreEN||b.nombre||"");
  });
}
export function baseProducts(){
  return productList().filter(p => state.inventoryTab === "finished" ? p.tipo === "finished" || p.inv === "Producto Terminado" : !(p.tipo === "finished" || p.inv === "Producto Terminado"));
}
export function storageValues(){ return Object.values(state.storages || DEFAULT_STORAGES); }
export function categoriesForCurrentStorage(){
  const source = baseProducts().filter(p => state.filterStorage === "all" || (p.subcategoria||"").toLowerCase() === state.filterStorage);
  const names = new Set(source.map(p => p.categoria).filter(Boolean));
  return Object.values(state.categories||{}).filter(c => names.has(c));
}
export function statusPass(p, filter){
  if(filter === "all") return true;
  if(filter === "lowOut") return ["warning","critical"].includes(statusOf(p));
  return statusOf(p) === filter;
}
export function filteredProducts(){
  let list = baseProducts();
  const s = state.search.toLowerCase().trim();
  if (state.filterStorage !== "all") list = list.filter(p => (p.subcategoria||"").toLowerCase() === state.filterStorage);
  if (state.filterCategories?.length) list = list.filter(p => state.filterCategories.includes(p.categoria));
  if (state.filterStatus !== "all") list = list.filter(p => statusPass(p, state.filterStatus));
  if (state.hideRecent) list = list.filter(p => !isRecentlyUpdated(p, 2));
  if (s) list = list.filter(p => [p.nombre,p.nombreEN,p.nombreES,p.categoria,p.unidad,p.subcategoria].join(" ").toLowerCase().includes(s));
  return sortByOldestUpdate(list);
}
export function reportProducts(){
  let list = productList();
  if (state.reportStorage !== "all") list = list.filter(p => (p.subcategoria||"").toLowerCase() === state.reportStorage);
  if (state.reportCategories?.length) list = list.filter(p => state.reportCategories.includes(p.categoria));
  if (state.reportStatus !== "all") list = list.filter(p => statusPass(p, state.reportStatus));
  return sortByOldestUpdate(list);
}

function parseDecimal(value, field="number"){
  const raw = String(value ?? "").trim().replace(",", ".");
  if(raw === "") return 0;
  const n = Number(raw);
  if(!Number.isFinite(n)) throw new Error(`${field} must be a valid number`);
  return n;
}
function nextProductKey(){ const nums = Object.keys(state.products).map(k => Number(String(k).replace("id_",""))).filter(Boolean); return `id_${Math.max(0,...nums)+1}`; }
function cleanProduct(form){
  let nombreEN = String(form.nombreEN || form.nombre || "").trim();
  let nombreES = String(form.nombreES || "").trim();
  const categoria = String(form.categoria || "").trim();
  const unidad = String(form.unidad || "").trim();
  if(!nombreEN && !nombreES) throw new Error("At least one product name is required");
  if(!categoria) throw new Error("Category is required. Import initial data or create categories first.");
  if(!unidad) throw new Error("Unit is required. Import initial data or create units first.");
  return { id: Number(form.id||String(form.key||"").replace("id_","")||Date.now()), nombre: nombreEN || nombreES, nombreEN, nombreES, categoria, subcategoria: form.subcategoria, unidad, cantidad: parseDecimal(form.cantidad,"Current quantity"), minimo: parseDecimal(form.minimo,"Minimum stock"), tipo: form.tipo || (state.inventoryTab === "finished" ? "finished" : "raw"), updatedAt: Date.now(), updatedBy: state.profile?.username || state.user?.email || "System", updatedByUid: state.user?.uid || "system" };
}
async function log(action, details, product){
  if(state.guest) return;
  await api.push(api.ref(db,"historial"), { accion: action, detalles: details, productId: product?.id || null, inv: product?.tipo === "finished" ? "Producto Terminado" : "Materia Prima", ts: Date.now(), uid: state.user?.uid || "system", usuario: state.profile?.username || state.user?.email || "System" });
}
export async function saveProduct(key, form){
  const id = key || nextProductKey();
  const product = cleanProduct({...form,key:id,id:String(id).replace("id_","")});
  if(state.guest){ state.products[id]=product; return; }
  await api.set(api.ref(db, productPath(id)), product);
  await log(key?"✏️ Edited":"➕ Added", `${product.nombreEN} | ${product.subcategoria} / ${product.categoria} | Stock: ${product.cantidad} ${product.unidad}`, product);
}
export async function deleteProduct(key){
  const p=state.products[key];
  if(state.guest){ delete state.products[key]; return; }
  await api.remove(api.ref(db, productPath(key)));
  await log("🗑️ Deleted", `${p?.nombreEN||key} | Stock at deletion: ${p?.cantidad} ${p?.unidad}`, p);
}
export async function setIgnoredDuplicate(pairKey, value=true){
  if(!pairKey) return;
  if(state.guest){
    state.reviewIgnoredDuplicates = state.reviewIgnoredDuplicates || {};
    if(value) state.reviewIgnoredDuplicates[pairKey] = true;
    else delete state.reviewIgnoredDuplicates[pairKey];
    return;
  }
  await api.set(api.ref(db, `${invRoot()}/reviewIgnoredDuplicates/${pairKey}`), value ? true : null);
}
export async function adjustStock(key, mode, amount, reason=""){
  const p=state.products[key];
  const qty=parseDecimal(amount,"Amount");
  if(!["entry","exit","set"].includes(mode)) throw new Error("Invalid adjustment mode");
  const updater = state.profile?.username || state.user?.email || "System";
  const updaterUid = state.user?.uid || "system";
  let before, after, updatedProduct;
  const applyAdjustment = cur => {
    before = parseDecimal(cur?.cantidad || 0, "Current stock");
    after = mode==="entry" ? before+qty : mode==="exit" ? Math.max(0,before-qty) : qty;
    updatedProduct = {...cur,cantidad:after,updatedAt:Date.now(),updatedBy:updater,updatedByUid:updaterUid};
    return updatedProduct;
  };
  if(state.guest){
    if(!p) throw new Error("Product not found");
    state.products[key]=applyAdjustment(p);
    return;
  }
  const result = await api.runTransaction(api.ref(db, productPath(key)), cur => cur ? applyAdjustment(cur) : cur);
  if(!result?.committed || before === undefined) throw new Error("Product not found or adjustment was not committed");
  const logged = updatedProduct || result.snapshot?.val() || p || {};
  return await log(mode==="entry"?"Stock Entry":mode==="exit"?"Stock Exit":"Stock Set", `${logged.nombreEN || logged.nombre || key} | ${before} -> ${after} ${logged.unidad || ""}${reason?` | ${reason}`:""}`, logged);
}

function nextKey(obj, prefix){ const nums = Object.keys(obj||{}).map(k => Number(String(k).replace(prefix,""))).filter(n => Number.isFinite(n)); return `${prefix}${String(Math.max(-1,...nums)+1).padStart(4,"0")}`; }
function storageSlug(value){ return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }
export async function saveCategory(oldName, form){
  const name = String(form.name || "").trim(); if(!name) throw new Error("Category name is required");
  const english = String(form.english || name).trim();
  const cats = {...(state.categories||{})}; const existingKey = oldName ? Object.entries(cats).find(([,v])=>v===oldName)?.[0] : null;
  const key = existingKey || nextKey(cats,"c"); cats[key] = name;
  const catTrans = {...(state.catTrans||{})}; const catIcons = {...(state.catIcons||{})};
  if(oldName && oldName !== name){ delete catTrans[oldName]; delete catIcons[oldName]; }
  delete catIcons[name];
  catTrans[name] = english;
  if(state.guest){ state.categories=cats; state.catTrans=catTrans; state.catIcons=catIcons; return; }
  await api.update(api.ref(db, invRoot()), { categorias: cats, cattrans: catTrans, caticons: catIcons });
}
export async function deleteCategory(name){
  const used = productList().filter(p => p.categoria === name).length;
  if(used) throw new Error(`Cannot delete category. ${used} product${used===1?" is":"s are"} currently using this category.`);
  const cats = {...(state.categories||{})}; Object.entries(cats).forEach(([k,v])=>{ if(v===name) delete cats[k]; });
  const catTrans = {...(state.catTrans||{})}; const catIcons = {...(state.catIcons||{})}; delete catTrans[name]; delete catIcons[name];
  if(state.guest){ state.categories=cats; state.catTrans=catTrans; state.catIcons=catIcons; return; }
  await api.update(api.ref(db, invRoot()), { categorias: cats, cattrans: catTrans, caticons: catIcons });
}
export async function saveUnit(oldName, form){
  const name = String(form.name || "").trim(); if(!name) throw new Error("Unit name is required");
  const english = String(form.english || name).trim(); const units = {...(state.units||{})};
  const existingKey = oldName ? Object.entries(units).find(([,v])=>v===oldName)?.[0] : null; const key = existingKey || nextKey(units,"u"); units[key]=name;
  const unitTrans = {...(state.unitTrans||{})}; if(oldName && oldName !== name) delete unitTrans[oldName]; unitTrans[name]=english;
  if(state.guest){ state.units=units; state.unitTrans=unitTrans; return; }
  await api.update(api.ref(db, invRoot()), { unidades: units, unittrans: unitTrans });
}
export async function deleteUnit(name){
  const used = productList().filter(p => p.unidad === name).length;
  if(used) throw new Error(`Cannot delete unit. ${used} product${used===1?" is":"s are"} currently using this unit.`);
  const units = {...(state.units||{})}; Object.entries(units).forEach(([k,v])=>{ if(v===name) delete units[k]; }); const unitTrans = {...(state.unitTrans||{})}; delete unitTrans[name];
  if(state.guest){ state.units=units; state.unitTrans=unitTrans; return; }
  await api.update(api.ref(db, invRoot()), { unidades: units, unittrans: unitTrans });
}
export async function saveStorage(oldName, form){
  const english = String(form.english || "").trim();
  const spanish = String(form.spanish || "").trim();
  const proposedName = String(form.name || oldName || english || spanish || "").trim();
  const name = storageSlug(proposedName);
  if(!name) throw new Error("Storage name is required");
  const storages = {...(state.storages||DEFAULT_STORAGES)}; const existingKey = oldName ? Object.entries(storages).find(([,v])=>v===oldName)?.[0] : null; const key = existingKey || nextKey(storages,"s"); storages[key]=name;
  const storageTrans={...(state.storageTrans||DEFAULT_STORAGE_TRANS)}; const storageIcons={...(state.storageIcons||DEFAULT_STORAGE_ICONS)};
  if(oldName && oldName!==name){ delete storageTrans[oldName]; delete storageTrans[`${oldName}__es`]; }
  storageTrans[name]=english || name; storageTrans[`${name}__es`]=spanish || english || name;
  if(state.guest){ state.storages=storages; state.storageTrans=storageTrans; state.storageIcons=storageIcons; return; }
  await api.update(api.ref(db, invRoot()), { almacenamientos: storages, storagetrans: storageTrans, storageicons: storageIcons });
}
export async function deleteStorage(name){
  const used = productList().filter(p => (p.subcategoria||"").toLowerCase() === String(name||"").toLowerCase()).length;
  if(used) throw new Error(`Cannot delete storage. ${used} product${used===1?" is":"s are"} currently using this storage type.`);
  const storages={...(state.storages||{})}; Object.entries(storages).forEach(([k,v])=>{ if(v===name) delete storages[k]; });
  const storageTrans={...(state.storageTrans||{})}; const storageIcons={...(state.storageIcons||{})}; delete storageTrans[name]; delete storageTrans[`${name}__es`]; delete storageIcons[name];
  if(state.guest){ state.storages=storages; state.storageTrans=storageTrans; state.storageIcons=storageIcons; return; }
  await api.update(api.ref(db, invRoot()), { almacenamientos: storages, storagetrans: storageTrans, storageicons: storageIcons });
}

export function metrics(){ const list=productList(); return {total:list.length, low:list.filter(p=>statusOf(p)==="warning").length, out:list.filter(p=>statusOf(p)==="critical").length, healthy:list.filter(p=>statusOf(p)==="normal").length}; }
export function exportCurrentJson(){
  const blob = new Blob([JSON.stringify({inventario:{[APP.inventoryKey]:{productos:state.products,categorias:state.categories,unidades:state.units,almacenamientos:state.storages,caticons:state.catIcons,cattrans:state.catTrans,unittrans:state.unitTrans,storagetrans:state.storageTrans,storageicons:state.storageIcons,reviewIgnoredDuplicates:state.reviewIgnoredDuplicates}}, usuarios:state.users, historial:state.history}, null, 2)], {type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`ak-inventory-export-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
}

export async function createUserWithAuth(form){
  const email = String(form.email || "").trim().toLowerCase();
  const username = String(form.username || "").trim();
  const password = String(form.password || "").trim();
  if(!email || !username) throw new Error("Username and email are required");
  let uid = form.key || emailKey(email);
  if(password){ const authUser = await api.createAuthUser(email, password); uid = authUser.uid; }
  const profile = { ...(state.users?.[uid] || {}), username, email, role: form.role || "usuario", activo: form.activo !== "false" };
  if(state.guest){ state.users[uid]=profile; return uid; }
  await api.set(api.ref(db, `usuarios/${uid}`), profile);
  return uid;
}
export async function requestPasswordReset(userKey){
  const profile = state.users[userKey]; if(!profile?.email) throw new Error("User email not found");
  if(state.guest) return;
  await api.sendPasswordResetEmail(auth, profile.email);
  const updates = {};
  updates[`pendingReset/${userKey}`] = null;
  updates[`pendingReset/${emailKey(profile.email)}`] = null;
  await api.update(api.ref(db, "/"), updates).catch(()=>{});
}
export async function applyPendingPasswordReset(authUser){
  if(!authUser || state.guest) return false;
  const keys = [authUser.uid, emailKey(authUser.email || "")];
  for(const key of keys){
    const snap = await api.get(api.ref(db, `pendingReset/${key}`));
    if(snap.exists()){
      const updates = {}; keys.forEach(k => updates[`pendingReset/${k}`] = null);
      await api.update(api.ref(db, "/"), updates);
      return false;
    }
  }
  return false;
}
export async function changeOwnPassword(currentPassword, newPassword){
  if(!state.user) throw new Error("No authenticated user");
  if(!newPassword || String(newPassword).length < 6) throw new Error("New password must have at least 6 characters");
  const credential = api.EmailAuthProvider.credential(state.user.email, currentPassword);
  await api.reauthenticateWithCredential(state.user, credential);
  await api.updatePassword(state.user, newPassword);
}
