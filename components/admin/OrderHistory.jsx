'use client';

// The "History" tab of the kitchen page: every order ever placed, newest first, 30 at a time.
import { useCallback, useEffect, useState } from 'react';
import { formatRupees } from '@/lib/money';
import { STATUS_INFO, STATUSES } from '@/lib/orderStatus';

const BADGE = {
    pending: 'border-neutral-600 text-neutral-300',
    accepted: 'border-sky-500/60 text-sky-300',
    preparing: 'border-amber-500/60 text-amber-300',
    served: 'border-emerald-500/60 text-emerald-300',
    cancelled: 'border-red-500/60 text-red-300',
};

const TZ = 'Asia/Kolkata';
const dayOf = (iso) => new Date(iso).toLocaleDateString('en-IN', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

export default function OrderHistory() {
    const [status, setStatus] = useState(''); // '' = every status
    const [orders, setOrders] = useState(null); // null = first load
    const [next, setNext] = useState(null); // where the next page starts (null = the end)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // more = false: start again from the newest order. more = true: add the next 30.
    const load = useCallback(async (more, from, filter) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ view: 'history' });
            if (more && from) params.set('before', from);
            if (filter) params.set('status', filter);
            const res = await fetch(`/api/admin/orders?${params}`, { cache: 'no-store' });
            if (res.status === 401) {
                window.location.href = '/auth/login';
                return;
            }
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Could not load the history.');
            setOrders((list) => (more && list ? [...list, ...data.orders] : data.orders));
            setNext(data.next);
        } catch (err) {
            setError(err.message || 'No connection. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    // First load, and again whenever the status filter changes.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load(false, null, status);
    }, [load, status]);

    // The list is grouped by day.
    const groups = [];
    for (const order of orders ?? []) {
        const day = dayOf(order.createdAt);
        if (groups.length === 0 || groups[groups.length - 1].day !== day) groups.push({ day, list: [] });
        groups[groups.length - 1].list.push(order);
    }

    return (
        <div className="mt-6">
            <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs text-neutral-400" htmlFor="history-status">Show</label>
                <select
                    id="history-status"
                    value={status}
                    onChange={(e) => { setOrders(null); setStatus(e.target.value); }}
                    className="rounded-full border border-white/20 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200"
                >
                    <option value="">All orders</option>
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_INFO[s].label} only</option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => load(false, null, status)}
                    disabled={loading}
                    className="cursor-pointer rounded-full border border-white/20 px-4 py-1.5 text-xs text-neutral-300 hover:border-white/50 disabled:opacity-50"
                >
                    Refresh
                </button>
            </div>

            {error && <p role="alert" className="mt-4 rounded-lg border border-red-400/40 px-4 py-3 text-sm text-red-200">{error}</p>}

            {orders === null ? (
                !error && <div aria-hidden="true" className="mt-6 h-40 animate-pulse rounded-xl bg-white/5" />
            ) : orders.length === 0 ? (
                <p className="mt-6 text-sm text-neutral-500">No orders found.</p>
            ) : (
                <div className="mt-6 flex flex-col gap-8">
                    {groups.map((g) => (
                        <section key={g.day} aria-label={g.day}>
                            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-amber-500">{g.day}</h2>
                            <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {g.list.map((o) => (
                                    <li key={o.id} className={`rounded-xl border border-white/10 bg-neutral-900 p-4 ${o.status === 'cancelled' ? 'opacity-60' : ''}`}>
                                        <div className="flex items-baseline justify-between gap-2">
                                            <p className="text-lg font-semibold">Table {o.tableNumber}</p>
                                            <p className="text-xs text-neutral-400">{timeOf(o.createdAt)}</p>
                                        </div>
                                        <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[11px] ${BADGE[o.status]}`}>{STATUS_INFO[o.status].label}</span>
                                        <ul className="mt-3 flex flex-col gap-1 text-sm">
                                            {o.items.map((l, i) => (
                                                <li key={`${l.name}-${i}`} className="flex justify-between gap-3">
                                                    <span><span className="font-semibold">{l.qty} ×</span> {l.name}</span>
                                                    <span className="shrink-0 text-neutral-400">{formatRupees(l.qty * l.unitPaise)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-sm">
                                            <span className="text-neutral-400">Total</span>
                                            <span className={o.status === 'cancelled' ? 'line-through' : 'font-semibold'}>{formatRupees(o.totalPaise)}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}

                    {next ? (
                        <button
                            type="button"
                            onClick={() => load(true, next, status)}
                            disabled={loading}
                            className="mx-auto cursor-pointer rounded-full border border-white/20 px-6 py-2 text-sm text-neutral-200 hover:border-white/50 disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Load older orders'}
                        </button>
                    ) : (
                        <p className="text-center text-xs text-neutral-500">That is every order.</p>
                    )}
                </div>
            )}
        </div>
    );
}