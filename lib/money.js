// Money is saved in PAISE (whole numbers): ₹149.50 is saved as 14950.
// Whole numbers avoid the tiny rounding errors that decimals cause, and
// Razorpay (online payments) also works in paise.

// "149.5" -> 14950   (the text must already be checked: digits with up to 2 decimals)
export function rupeesToPaise(text) {
    const [rupees, fraction = ""] = String(text).split(".");
    return parseInt(rupees, 10) * 100 + parseInt((fraction + "00").slice(0, 2), 10);
}

// 14950 paise -> "₹149.50"   (whole rupees show without decimals: 15000 -> "₹150")
export const formatRupees = (paise) =>
    `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

// 14950 paise -> "149.50", 15000 -> "149"   (plain text for the price box of the edit form)
export const paiseToText = (paise) => (paise % 100 ? (paise / 100).toFixed(2) : String(paise / 100));