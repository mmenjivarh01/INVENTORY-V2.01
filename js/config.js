export const firebaseConfig = {
  apiKey: "AIzaSyAsTBiSCDVzx_piH9byD9zJS33cmPBqED0",
  authDomain: "afghan-kabab-inventory-gpt.firebaseapp.com",
  databaseURL: "https://afghan-kabab-inventory-gpt-default-rtdb.firebaseio.com",
  projectId: "afghan-kabab-inventory-gpt",
  storageBucket: "afghan-kabab-inventory-gpt.firebasestorage.app",
  messagingSenderId: "324552148034",
  appId: "1:324552148034:web:581313aeb886738ce719db"
};

export const APP = {
  inventoryKey: "a",
  defaultLanguage: "en",
  version: "2.1.63",
  brand: "Afghan Kabob & Grill"
};


export const AUTH_ALIASES = {
  admin: "mmenjivar29@gmail.com",
  antonio: "antonio@imenjivar.com",
  nayuby1979: "nayuby1979@imenjivar.com",
  mmadrigal: "mmadrigal@imenjivar.com"
};

export const DEFAULT_LOGIN_DOMAIN = "imenjivar.com";

export const DEFAULT_USERS = [
  { username: "Admin", email: "mmenjivar29@gmail.com", role: "admin", activo: true },
  { username: "Antonio", email: "antonio@imenjivar.com", role: "usuario", activo: true },
  { username: "Nayuby1979", email: "nayuby1979@imenjivar.com", role: "usuario", activo: true },
  { username: "MMadrigal", email: "mmadrigal@imenjivar.com", role: "usuario", activo: true },
  { username: "Invitado", email: "guest@imenjivar.com", role: "invitado", activo: true, guest: true }
];
