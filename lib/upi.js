// Shared by the SERVER and the BROWSER (no database, no React). Builds the UPI payment link.
export const validUpiId = (id) => typeof id === "string" && /^[A-Za-z0-9._-]{2,}@[A-Za-z]{2,}$/.test(id);

// upi://pay?pa=<id>&pn=<name>&am=<rupees with 2 decimals>&cu=INR&tn=<note>
export function upiLink({ pa, pn, amountPaise, note }) {
    const am = (amountPaise / 100).toFixed(2);
    return `upi://pay?pa=${pa}&pn=${encodeURIComponent(pn)}&am=${am}&cu=INR&tn=${encodeURIComponent(note)}`;
}