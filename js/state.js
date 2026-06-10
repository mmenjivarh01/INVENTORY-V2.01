export const state = {
  lang: localStorage.getItem("ak-lang") || "en",
  view: "inventory",
  inventoryTab: "raw",
  filterStorage: "all",
  filterCategories: [],
  filterStatus: "all",
  reportStorage: "all",
  reportCategories: [],
  reportStatus: "all",
  hideRecent: false,
  filtersOpen: localStorage.getItem("ak-filters-open") !== "false",
  reportFiltersOpen: localStorage.getItem("ak-report-filters-open") !== "false",
  reviewTab: "translations",
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
  reviewIgnoredDuplicates: {},
  unsub: [],
  online: false,
  guest: false
};
export const setLang = l => { state.lang = l; localStorage.setItem("ak-lang", l); };
export const currentRole = () => state.profile?.role || "invitado";
export const isAdmin = () => currentRole() === "admin" || state.guest;
export const canManage = () => ["admin","usuario"].includes(currentRole()) || state.guest;
export const canDeleteProducts = () => isAdmin();
export const canAdjust = () => ["admin","usuario"].includes(currentRole()) || state.guest;
export const canReadReports = () => ["admin","usuario","invitado"].includes(currentRole()) || state.guest;
