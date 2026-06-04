export const state = {
  lang: localStorage.getItem("ak-lang") || "en",
  view: "dashboard",
  inventoryTab: "raw",
  filterStorage: "all",
  filterCategories: [],
  filterStatus: "all",
  reportStorage: "all",
  reportCategories: [],
  reportStatus: "all",
  search: "",
  user: null,
  profile: null,
  products: {},
  categories: {},
  units: {},
  storages: {},
  catIcons: {},
  catTrans: {},
  unitTrans: {},
  storageIcons: {},
  storageTrans: {},
  history: {},
  users: {},
  unsub: [],
  online: false,
  guest: false
};
export const setLang = l => { state.lang = l; localStorage.setItem("ak-lang", l); };
export const currentRole = () => state.profile?.role || "invitado";
export const isAdmin = () => currentRole() === "admin" || state.guest;
export const canManage = () => isAdmin();
export const canAdjust = () => ["admin","usuario"].includes(currentRole()) || state.guest;
export const canReadReports = () => ["admin","usuario"].includes(currentRole()) || state.guest;
export const canReadOnly = () => ["admin","usuario","invitado"].includes(currentRole()) || state.guest;
