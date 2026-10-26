export const LOGIN_PATH = "/auth/login";
export const ADMIN_HOME = "/admin/orders"; // where the admin lands after login
export const STAFF_HOME = "/admin/orders"; // where the kitchen staff lands after login

// What the STAFF role is allowed to open. Admin can open everything.
export const STAFF_PAGES = ["/admin/orders", "/admin/bills"];
export const STAFF_API = ["/api/admin/orders", "/api/admin/bills"];

export const homeFor = (role) => (role === "admin" ? ADMIN_HOME : STAFF_HOME);
