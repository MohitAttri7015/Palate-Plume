'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { formatRupees } from '@/lib/money';
import { STATUS_INFO } from '@/lib/orderStatus';
import PayPanel from '@/components/payment/PayPanel';

const POLL_BASE = 4000; // how often the phone asks "anything new?" (ms)
const POLL_MAX = 8000; // when nothing changes it slowly relaxes to this, never slower
const STEPS = ['pending', 'accepted', 'preparing', 'served']; // the progress bar (cancelled is shown separately)

const timeOf = (iso) =>
    new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });

const BADGE = {
    pending: 'border-white/30 text-white/80',
    accepted: 'border-sky-400/60 text-sky-200',
    preparing: 'border-amber-400/60 text-amber-200',
    served: 'border-emerald-400/60 text-emerald-200',
    cancelled: 'border-red-400/60 text-red-200',
};

function Progress({ status }) {
    if (status === 'cancelled') return null;
    const at = STEPS.indexOf(status);
    return (
        <div className="mt-4 flex gap-1.5" aria-hidden="true">
            {STEPS.map((step, i) => (
                <span key={step} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= at ? 'bg-white' : 'bg-white/15'}`} />
            ))}
        </div>
    );
}

export default function YourOrders({ initialOrders, initialStamp, table, sitting }) {
    const [orders, setOrders] = useState(initialOrders);
    const [problem, setProblem] = useState(''); // '' | 'NO_TABLE' | 'FULL'
    const [offline, setOffline] = useState(false);
    const [showPay, setShowPay] = useState(false);
    const [paid, setPaid] = useState(false); // staff marked the bill as paid
    const stamp = useRef(initialStamp);

    // Every 3 seconds: ask the server "has anything changed since <stamp>?". Pauses while the tab is hidden.
    useEffect(() => {
        let stopped = false;
        let running = false;
        let timer = 0;
        let delay = POLL_BASE;
        const controller = new AbortController();

        async function tick() {
            if (stopped || running || document.hidden) return;
            running = true;
            let again = true;
            try {
                const res = await fetch(`/api/orders?since=${encodeURIComponent(stamp.current)}`, {
                    cache: 'no-store',
                    signal: controller.signal,
                });
                if (res.status === 401) {
                    // The table was reset or switched off. If it was reset because the bill was PAID, say so.
                    const paidNow = await fetch(`/api/payment/status?sitting=${encodeURIComponent(sitting)}`, { cache: 'no-store' })
                        .then((r) => (r.ok ? r.json() : { paid: false }))
                        .catch(() => ({ paid: false }));
                    if (paidNow.paid) {
                        setPaid(true);
                        setShowPay(true);
                    } else {
                        setProblem('NO_TABLE'); // the visit ended: stop asking
                    }
                    again = false;
                } else if (res.ok) {
                    const data = await res.json();
                    if (!data.unchanged) {
                        stamp.current = data.stamp;
                        setOrders(data.orders);
                        delay = POLL_BASE; // something changed: keep asking often
                    } else {
                        delay = Math.min(POLL_MAX, Math.round(delay * 1.4)); // quiet: relax a little
                    }
                    setOffline(false);
                } else {
                    setOffline(true);
                }
            } catch (err) {
                if (err?.name === 'AbortError') return;
                setOffline(true); // no internet for a moment: we just try again
            } finally {
                running = false;
            }
            if (again && !stopped) timer = setTimeout(tick, delay);
        }

        function onVisible() {
            if (document.hidden) return;
            clearTimeout(timer);
            delay = POLL_BASE;
            tick(); // the person came back to the tab: catch up right away
        }

        timer = setTimeout(tick, POLL_BASE);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            stopped = true;
            clearTimeout(timer);
            controller.abort();
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    if (problem && !paid) {
        return (
            <div className="mt-16 flex flex-col items-start gap-6">
                <p className="text-sm text-white/60">
                    {problem === 'FULL'
                        ? 'This table is full right now. Please ask a member of our team for help.'
                        : 'Your visit has ended. Scan the QR code on your table to see your orders.'}
                </p>
                <Link href="/menu" className="border border-white px-10 py-3 text-[12px] uppercase tracking-[1px] transition-colors duration-500 hover:bg-white hover:text-black">
                    Browse the menu
                </Link>
            </div>
        );
    }

    // A cancelled order is not paid for.
    const payable = orders.filter((o) => o.status !== 'cancelled');
    const payTotal = payable.reduce((sum, o) => sum + o.totalPaise, 0);

    return (
        <>
            {offline && (
                <p role="status" className="mt-6 border border-white/20 px-4 py-3 text-[12px] text-white/70">
                    Reconnecting... the statuses below may be a few seconds old.
                </p>
            )}

            {orders.length === 0 ? (
                <div className="mt-16 flex flex-col items-start gap-6">
                    <p className="text-sm text-white/60">You have not placed an order yet.</p>
                    <Link href="/menu" className="border border-white px-10 py-3 text-[12px] uppercase tracking-[1px] transition-colors duration-500 hover:bg-white hover:text-black">
                        Browse the menu
                    </Link>
                </div>
            ) : (
                <>
                    <ol className="mt-10 flex flex-col gap-8">
                        {orders.map((order, index) => (
                            <li key={order.id} className={`border-y border-white/10 py-5 ${order.status === 'cancelled' ? 'opacity-60' : ''}`}>
                                <div className="flex items-baseline justify-between gap-3">
                                    <h2 className="font-heading text-2xl uppercase">Order {index + 1}</h2>
                                    <span suppressHydrationWarning className="text-[12px] text-white/60">{timeOf(order.createdAt)}</span>
                                </div>

                                <div className="mt-3" aria-live="polite">
                                    <span className={`inline-block rounded-full border px-3 py-1 text-[11px] uppercase tracking-widest ${BADGE[order.status]}`}>
                                        {STATUS_INFO[order.status].label}
                                    </span>
                                    <p className="mt-2 text-[12px] text-white/60">{STATUS_INFO[order.status].note}</p>
                                </div>
                                <Progress status={order.status} />

                                <ul className="mt-5 flex flex-col gap-2 text-[14px]">
                                    {order.items.map((line, i) => (
                                        <li key={`${line.name}-${i}`} className="flex justify-between gap-4">
                                            <span>{line.qty} × {line.name}</span>
                                            <span className="shrink-0 text-white/70">{formatRupees(line.unitPaise * line.qty)}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-4 flex justify-between border-t border-white/10 pt-3 text-[13px]">
                                    <span className="uppercase tracking-widest text-white/60">Order total</span>
                                    <span className={order.status === 'cancelled' ? 'line-through' : ''}>{formatRupees(order.totalPaise)}</span>
                                </div>
                            </li>
                        ))}
                    </ol>

                    {payable.length > 0 && (
                        <div className="mt-8 flex items-center justify-between">
                            <span className="text-[12px] uppercase tracking-widest text-white/60">
                                {orders.length > 1 ? 'All orders' : 'Total'}
                            </span>
                            <span className="font-heading text-3xl">{formatRupees(payTotal)}</span>
                        </div>
                    )}

                    <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={() => setShowPay(true)}
                            disabled={payable.length === 0}
                            className="w-full cursor-pointer border border-white bg-white py-4 text-center text-[12px] uppercase tracking-[1px] text-black transition-colors duration-500 hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-white/30 disabled:bg-transparent disabled:text-white/50"
                        >
                            Proceed to pay
                        </button>
                        <Link
                            href="/menu"
                            className="block w-full border border-white py-4 text-center text-[12px] uppercase tracking-[1px] transition-colors duration-500 hover:bg-white hover:text-black"
                        >
                            Order more
                        </Link>
                    </div>
                </>
            )}

            {showPay && (payable.length > 0 || paid) && (
                <PayPanel table={table} sitting={sitting} orders={payable} total={payTotal} paid={paid} onClose={() => setShowPay(false)} />
            )}
        </>
    );
}