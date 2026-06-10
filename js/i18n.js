export const dict = {
  en: {
    loginTitle: "Inventory Management", email: "User", password: "Password", signIn: "Sign in", guest: "Preview mode",
    dashboard: "Dashboard", inventory: "Inventory", raw: "Raw Materials", finished: "Finished Products", history: "History", reports: "Reports", settings: "Settings",
    products: "Products", lowStock: "Low stock", outStock: "Out of stock", healthy: "Healthy", needsAttention: "Needs attention", recentActivity: "Recent activity",
    search: "Search product...", add: "Add", addProduct: "Add Product", editProduct: "Edit Product", adjustStock: "Adjust Stock",
    categories: "Categories", units: "Units", users: "Users", storages: "Storage types", data: "Data",
    nameEn: "Name in English", nameEs: "Name in Spanish", storage: "Storage", category: "Category", unit: "Unit", currentQty: "Current quantity", minStock: "Minimum stock",
    save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", confirm: "Confirm", close: "Close", importData: "Import initial data", exportData: "Export JSON",
    entry: "Entry", exit: "Exit", set: "Set", amount: "Amount", reason: "Reason", normal: "Normal", warning: "Low stock", critical: "Out of stock",
    all: "All", frozen: "Frozen", refrigerated: "Refrigerated", dry: "Dry Goods", cleaning: "Cleaning", noData: "No data found", language: "Language", logout: "Log out", print: "Print / PDF",
    changePassword: "Change password", myProfile: "My profile", version: "Version", reportTitle: "Inventory Report", total: "Total", stock: "Stock", min: "Min", status: "Status",
    filterStatus: "Status filter", filterCategory: "Category filter", filterStorage: "Storage filter", purchaseMode: "Purchase view", clearFilters: "Clear filters",
    added: "Added", edited: "Edited", deleted: "Deleted", stockEntry: "Entry", stockExit: "Exit", stockSet: "Set",
    username: "Username", role: "Role", active: "Active", inactive: "Inactive", resetPassword: "Reset password", temporaryPassword: "Temporary password",
    adminOnly: "Admin only", createAuthNote: "New users are created in Firebase Authentication and in /usuarios. Existing users update the profile only.",
    icon: "Icon", spanish: "Spanish", english: "English", hideRecent: "Hide updated in last 2 hours", lowAndOut: "Low + out of stock"
  },
  es: {
    loginTitle: "Gestión de Inventario", email: "Usuario", password: "Contraseña", signIn: "Iniciar sesión", guest: "Vista previa",
    dashboard: "Panel", inventory: "Inventario", raw: "Materia Prima", finished: "Producto Terminado", history: "Historial", reports: "Reportes", settings: "Configuración",
    products: "Productos", lowStock: "Bajo stock", outStock: "Agotados", healthy: "Normal", needsAttention: "Requiere atención", recentActivity: "Actividad reciente",
    search: "Buscar producto...", add: "Agregar", addProduct: "Agregar producto", editProduct: "Editar producto", adjustStock: "Ajustar stock",
    categories: "Categorías", units: "Unidades", users: "Usuarios", storages: "Tipos de almacenamiento", data: "Datos",
    nameEn: "Nombre en inglés", nameEs: "Nombre en español", storage: "Almacenamiento", category: "Categoría", unit: "Unidad", currentQty: "Cantidad actual", minStock: "Stock mínimo",
    save: "Guardar", cancel: "Cancelar", delete: "Eliminar", edit: "Editar", confirm: "Confirmar", close: "Cerrar", importData: "Importar datos iniciales", exportData: "Exportar JSON",
    entry: "Entrada", exit: "Salida", set: "Fijar", amount: "Cantidad", reason: "Motivo", normal: "Normal", warning: "Bajo stock", critical: "Agotado",
    all: "Todo", frozen: "Congelados", refrigerated: "Refrigerados", dry: "Secos", cleaning: "Limpieza", noData: "Sin datos", language: "Idioma", logout: "Cerrar sesión", print: "Imprimir / PDF",
    changePassword: "Cambiar contraseña", myProfile: "Mi perfil", version: "Versión", reportTitle: "Informe de inventario", total: "Total", stock: "Stock", min: "Mínimo", status: "Estado",
    filterStatus: "Filtro de estado", filterCategory: "Filtro de categoría", filterStorage: "Filtro de almacenamiento", purchaseMode: "Vista de compra", clearFilters: "Limpiar filtros",
    added: "Agregado", edited: "Editado", deleted: "Eliminado", stockEntry: "Entrada", stockExit: "Salida", stockSet: "Fijado",
    username: "Usuario", role: "Rol", active: "Activo", inactive: "Inactivo", resetPassword: "Reiniciar contraseña", temporaryPassword: "Contraseña temporal",
    adminOnly: "Solo admin", createAuthNote: "Los usuarios nuevos se crean en Firebase Authentication y en /usuarios. Los usuarios existentes solo actualizan su perfil.",
    icon: "Ícono", spanish: "Español", english: "Inglés", hideRecent: "Ocultar actualizados en últimas 2 horas", lowAndOut: "Bajo stock + agotados"
  }
};
export const t = (lang, key) => dict[lang]?.[key] || dict.en[key] || key;
