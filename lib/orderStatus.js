// Shared by the SERVER and the BROWSER (no database, no React).
// The life of an order:  pending -> accepted -> preparing -> served   (and "cancelled" from any step before served)
export const STATUSES = ["pending", "accepted", "preparing", "served", "cancelled"];

export const STATUS_INFO = {
    pending: { label: "Pending", note: "Waiting for the kitchen to accept your order." },
    accepted: { label: "Accepted", note: "The kitchen has accepted your order." },
    preparing: { label: "Preparing", note: "Your order is being prepared." },
    served: { label: "Served", note: "Enjoy your meal!" },
    cancelled: { label: "Cancelled", note: "This order was cancelled. Please ask a member of our team if you have a question." },
};

// Which status may follow which. The server enforces this, so nobody can skip a step or reopen a finished order.
export const NEXT = {
    pending: ["accepted", "cancelled"],
    accepted: ["preparing", "cancelled"],
    preparing: ["served", "cancelled"],
    served: [],
    cancelled: [],
};

// Orders saved before this change have the old status "new": they count as pending.
export const normalizeStatus = (status) => (STATUSES.includes(status) ? status : "pending");

// "To become `to`, the order must be in one of these statuses right now." Used as a database filter.
export function fromStatuses(to) {
    const list = STATUSES.filter((s) => NEXT[s].includes(to));
    return list.includes("pending") ? [...list, "new"] : list;
}