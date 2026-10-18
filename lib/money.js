// Money is saved in PAISE (whole numbers): ₹149.50 is saved as 14950.
// Whole numbers avoid the tiny rounding errors that decimals cause, and
// Razorpay (online payments) also works in paise.

// "149.5" -> 14950   (the text must already be checked: digits with up to 2 decimals)
export function rupeesToPaise(text) {
    const [rupees, fraction = ""] = String(text).split(".");
    return parseInt(rupees, 10) * 100 + parseInt((fraction + "00").slice(0, 2), 10);
}