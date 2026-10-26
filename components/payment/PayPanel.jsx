'use client';

// The customer's payment screen: receipt -> "Pay via UPI" -> animated QR with a countdown -> Paid.
// Money never passes through our server. The customer pays the café's UPI id, staff see it arrive and press
// "Mark paid", and this phone learns about it by asking /api/payment/status every 2 seconds.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CircleCheck, CircleAlert, X } from 'lucide-react';
import { formatRupees } from '@/lib/money';
import { ReceiptPrinter } from '@/components/payment/ReceiptPrinter';

const STATUS_EVERY = 2000; // ask "is it paid?" every 2 seconds while the QR is on screen
const PAID_SECONDS = 5; // how long the "Paid" screen stays before going home

const clock = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// The same dish ordered twice shows as one line on the receipt.
function receiptLines(orders) {
    const map = new Map();
    for (const order of orders) {
        for (const l of order.items) {
            const key = `${l.name}|${l.unitPaise}`;
            map.set(key, { name: l.name, unitPaise: l.unitPaise, qty: (map.get(key)?.qty ?? 0) + l.qty });
        }
    }
    return [...map.values()];
}

const Btn = ({ children, className = '', ...props }) => (
    <button
        type="button"
        className={`w-full cursor-pointer border border-white py-4 text-center text-[12px] uppercase tracking-[1px] transition-colors duration-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
    >
        {children}
    </button>
);
const SOLID = 'bg-white text-black hover:bg-black hover:text-white';

export default function PayPanel({ table, sitting, orders, total, paid = false, onClose }) {
    const router = useRouter();
    // 'receipt' | 'starting' | 'qr' | 'expired' | 'failed' | 'locked' | 'unavailable' | 'paid'
    const [stage, setStage] = useState(paid ? 'paid' : 'receipt');
    const [printer, setPrinter] = useState('processing');
    const [qr, setQr] = useState(null);
    const [left, setLeft] = useState(0);
    const [message, setMessage] = useState('');
    const [triesLeft, setTriesLeft] = useState(0);
    const [secs, setSecs] = useState(PAID_SECONDS);
    const endAt = useRef(0);
    const lines = useMemo(() => receiptLines(orders), [orders]);

    // ---- the receipt "prints" when the panel opens ----
    useEffect(() => {
        const t1 = setTimeout(() => setPrinter('printing'), 900);
        const t2 = setTimeout(() => setPrinter('complete'), 900 + 1800);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    // ---- the orders page already learned that the bill is paid ----
    useEffect(() => { if (paid) setStage('paid'); }, [paid]);

    // ---- ask the server for the QR ----
    const start = useCallback(async () => {
        setStage('starting');
        setMessage('');
        try {
            const res = await fetch('/api/payment/start', { method: 'POST', cache: 'no-store' });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                endAt.current = Date.now() + data.msLeft; // our own clock, so a wrong phone clock does not matter
                setLeft(data.msLeft);
                setQr(data);
                setStage('qr');
            } else if (data.code === 'PAY_LOCKED') {
                setStage('locked');
            } else if (data.code === 'ALREADY_PAID') {
                setStage('paid');
            } else if (data.code === 'NOT_SET_UP') {
                setStage('unavailable');
            } else {
                setMessage(data.error || 'Something went wrong. Please try again.');
                setTriesLeft(0);
                setStage('failed');
            }
        } catch {
            setMessage('No internet for a moment. Please try again.');
            setTriesLeft(0);
            setStage('failed');
        }
    }, []);

    // ---- countdown ----
    useEffect(() => {
        if (stage !== 'qr') return;
        const id = setInterval(() => {
            const ms = endAt.current - Date.now();
            setLeft(ms);
            if (ms <= 0) setStage('expired');
        }, 500);
        return () => clearInterval(id);
    }, [stage]);

    // ---- "is it paid?" every 2 seconds (and right away when the person comes back from their UPI app) ----
    useEffect(() => {
        if (stage !== 'qr' || !sitting) return;
        let stopped = false;
        const check = async () => {
            if (stopped || document.hidden) return;
            try {
                const res = await fetch(`/api/payment/status?sitting=${encodeURIComponent(sitting)}`, { cache: 'no-store' });
                if (res.ok && (await res.json()).paid && !stopped) setStage('paid');
            } catch { /* no internet for a moment: the next check will do */ }
        };
        const id = setInterval(check, STATUS_EVERY);
        document.addEventListener('visibilitychange', check);
        return () => { stopped = true; clearInterval(id); document.removeEventListener('visibilitychange', check); };
    }, [stage, sitting]);

    // ---- the bill changed while the QR was on screen (someone ordered more): make a new QR with the new amount ----
    const asked = useRef(null); // the total we already made a QR for, so we never ask twice for the same total
    useEffect(() => {
        if (stage === 'qr' && qr && total !== qr.amountPaise && asked.current !== total) {
            asked.current = total;
            start();
        }
    }, [total, stage, qr, start]);

    // ---- paid: 5 seconds, then back to the home page ----
    useEffect(() => {
        if (stage !== 'paid') return;
        setSecs(PAID_SECONDS);
        const id = setInterval(() => setSecs((s) => s - 1), 1000);
        return () => clearInterval(id);
    }, [stage]);
    useEffect(() => {
        if (stage === 'paid' && secs <= 0) router.replace('/');
    }, [stage, secs, router]);

    async function didNotGoThrough() {
        if (!qr) return;
        setStage('starting');
        try {
            const res = await fetch('/api/payment/fail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attemptId: qr.id }),
            });
            const data = await res.json().catch(() => ({}));
            if (data.locked) return setStage('locked');
            setTriesLeft(Math.max(0, (data.maxFails ?? 3) - (data.fails ?? 0)));
            setMessage('Your payment did not go through. You can try again.');
            setStage('failed');
        } catch {
            setMessage('No internet for a moment. Please try again.');
            setTriesLeft(0);
            setStage('failed');
        }
    }

    const lockedBox = (
        <div className="mt-8 border border-red-400/50 bg-red-500/10 p-5 text-center">
            <CircleAlert className="mx-auto text-red-300" size={28} />
            <p className="mt-3 text-sm text-white">We found a problem while you were paying.</p>
            <p className="mt-2 text-[13px] text-white/80">
                Please pay at the staff and tell them your table number: <span className="font-semibold text-white">Table {table}</span>.
            </p>
        </div>
    );

    const showReceipt = stage === 'receipt' || stage === 'locked' || stage === 'unavailable' || (stage === 'failed' && !qr);
    const showQr = stage === 'starting' || stage === 'qr' || stage === 'expired' || (stage === 'failed' && qr);

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 px-4 py-8 font-ui text-white backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Pay your bill">
            <div className="mx-auto flex max-w-sm flex-col items-center">
                {stage !== 'paid' && (
                    <button type="button" onClick={onClose} aria-label="Close" className="mb-3 ml-auto flex cursor-pointer rounded-full border border-[#26262E] p-2">
                        <X size={18} strokeWidth={1.75} />
                    </button>
                )}

                {/* ───────── 1. the receipt ───────── */}
                {showReceipt && (
                    <>
                        <ReceiptPrinter.Root stage={printer}>
                            <ReceiptPrinter.Machine>
                                <ReceiptPrinter.Header>
                                    <span className="font-logo text-[15px] tracking-wide">Palate &amp; Plume</span>
                                    <span className="text-[11px] uppercase tracking-widest text-white/50">Table {table}</span>
                                </ReceiptPrinter.Header>
                                <ReceiptPrinter.Screen>
                                    <ReceiptPrinter.Status />
                                </ReceiptPrinter.Screen>
                            </ReceiptPrinter.Machine>
                            <ReceiptPrinter.Output>
                                <ReceiptPrinter.Paper>
                                    <p className="text-center text-lg font-bold uppercase tracking-widest">Palate &amp; Plume</p>
                                    <p className="mt-1 text-center text-[11px] uppercase tracking-widest text-[#1b1b1b]/60">Table {table}</p>
                                    <p suppressHydrationWarning className="mt-1 text-center text-[11px] text-[#1b1b1b]/60">
                                        {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                    <div className="my-4 border-t border-dashed border-[#1b1b1b]/40" />
                                    <ul className="flex flex-col gap-2 text-[13px]">
                                        {lines.map((l) => (
                                            <li key={`${l.name}-${l.unitPaise}`} className="flex justify-between gap-3">
                                                <span>{l.qty} × {l.name}</span>
                                                <span className="shrink-0">{formatRupees(l.qty * l.unitPaise)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="my-4 border-t border-dashed border-[#1b1b1b]/40" />
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-[12px] font-bold uppercase tracking-widest">Total</span>
                                        <span className="text-xl font-bold">{formatRupees(total)}</span>
                                    </div>
                                    <p className="mt-5 text-center text-[11px] text-[#1b1b1b]/60">Thank you for dining with us</p>
                                </ReceiptPrinter.Paper>
                            </ReceiptPrinter.Output>
                        </ReceiptPrinter.Root>

                        <div className="mt-4 w-full">
                            {stage === 'locked' && lockedBox}
                            {stage === 'unavailable' && (
                                <div className="mb-4 border border-white/20 p-4 text-[13px] text-white/80">
                                    UPI payment is not available right now. Please pay at the staff and tell them your table number: Table {table}.
                                </div>
                            )}
                            {stage === 'failed' && message && <p role="alert" className="mb-4 text-center text-[13px] text-red-300">{message}</p>}
                            {stage !== 'locked' && stage !== 'unavailable' && (
                                <Btn onClick={start} disabled={printer !== 'complete'} className={SOLID}>
                                    Pay via UPI
                                </Btn>
                            )}
                        </div>
                    </>
                )}

                {/* ───────── 2. the QR code ───────── */}
                {showQr && (
                    <div className="w-full text-center">
                        <p className="text-[12px] uppercase tracking-widest text-white/60">Table {table} · Scan to pay</p>
                        <p className="mt-2 font-heading text-5xl">{formatRupees(qr?.amountPaise ?? total)}</p>
                        <p className="mt-1 text-[12px] text-white/60">Pay exactly this amount</p>

                        <div className="relative mx-auto mt-6 w-64">
                            <div className={`relative overflow-hidden bg-white p-3 transition-opacity ${stage === 'qr' ? '' : 'opacity-20'}`}>
                                {qr ? <div className="aspect-square w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr.qrSvg }} /> : <div className="aspect-square w-full" />}
                                {stage === 'qr' && (
                                    <motion.div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-emerald-400/40 to-transparent"
                                        style={{ borderBottom: '2px solid rgba(52,211,153,0.9)' }}
                                        initial={{ top: '-10%' }}
                                        animate={{ top: ['-10%', '100%'] }}
                                        transition={{ duration: 2.2, ease: 'linear', repeat: Infinity, repeatType: 'reverse' }}
                                    />
                                )}
                            </div>
                            {/* scanner corners */}
                            {['left-0 top-0 border-l-2 border-t-2', 'right-0 top-0 border-r-2 border-t-2', 'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((c) => (
                                <span key={c} aria-hidden="true" className={`absolute -m-1.5 h-6 w-6 border-emerald-400 ${c}`} />
                            ))}
                            {stage === 'expired' && <div className="absolute inset-0 grid place-items-center text-sm uppercase tracking-widest">This QR has expired</div>}
                        </div>

                        {stage === 'qr' && (
                            <>
                                <p className={`mt-5 font-mono text-lg ${left < 30000 ? 'text-red-300' : 'text-white'}`}>Expires in {clock(left)}</p>
                                <div className="mx-auto mt-2 h-1 w-64 overflow-hidden rounded-full bg-white/15">
                                    <div className="h-full bg-emerald-400 transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, (left / 300000) * 100))}%` }} />
                                </div>

                                <div className="mt-5 border border-emerald-400/50 bg-emerald-500/10 px-4 py-3 text-[13px] leading-relaxed text-emerald-100">
                                    After you pay successfully, <span className="font-semibold">please let a staff member know</span>. Your table will be marked paid as soon as they see the money.
                                </div>

                                <a href={qr.upiUrl} className="mt-5 block w-full border border-white bg-white py-4 text-center text-[12px] uppercase tracking-[1px] text-black transition-colors duration-500 hover:bg-black hover:text-white">
                                    Pay with my UPI app
                                </a>
                                <p className="mt-2 text-[11px] text-white/50">On this phone, tap the button. On another device, scan the code with any UPI app.</p>

                                <button type="button" onClick={didNotGoThrough} className="mt-5 cursor-pointer text-[12px] text-white/60 underline underline-offset-4 hover:text-white">
                                    My payment did not go through
                                </button>
                            </>
                        )}

                        {stage === 'starting' && <p className="mt-6 text-[13px] text-white/60">Please wait...</p>}

                        {stage === 'expired' && (
                            <div className="mt-6">
                                <p className="mb-4 text-[13px] text-white/70">If you already paid, tell a staff member. Otherwise make a new QR code.</p>
                                <Btn onClick={start} className={SOLID}>New QR code</Btn>
                            </div>
                        )}

                        {stage === 'failed' && qr && (
                            <div className="mt-6">
                                <p role="alert" className="mb-1 text-[13px] text-red-300">{message}</p>
                                {triesLeft > 0 && <p className="mb-4 text-[12px] text-white/60">{triesLeft} {triesLeft === 1 ? 'try' : 'tries'} left.</p>}
                                <Btn onClick={start} className={SOLID}>Try again</Btn>
                            </div>
                        )}
                    </div>
                )}

                {/* ───────── 3. paid ───────── */}
                {stage === 'paid' && (
                    <div className="mt-16 flex w-full flex-col items-center text-center">
                        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
                            <CircleCheck size={72} strokeWidth={1.25} className="text-emerald-400" />
                        </motion.div>
                        <h2 className="mt-6 font-heading text-5xl">Paid</h2>
                        <p className="mt-3 text-[13px] text-white/70">Thank you for dining with us! We hope to see you again.</p>
                        <p className="mt-6 text-[12px] uppercase tracking-widest text-white/50">Closing this table in {Math.max(0, secs)}</p>
                    </div>
                )}
            </div>
        </div>
    );
}