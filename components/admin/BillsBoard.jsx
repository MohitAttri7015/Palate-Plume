'use client';

// Staff and admin: every table's bill, "Mark paid", "Reset table", and today's paid history.
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatRupees } from '@/lib/money';
import { STATUS_INFO } from '@/lib/orderStatus';

const POLL_MS = 3000;

const timeOf = (iso) =>
    new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });

const BADGE = {
    pending: 'border-neutral-600 text-neutral-300',
    accepted: 'border-sky-500/60 text-sky-300',
    preparing: 'border-amber-500/60 text-amber-300',
    served: 'border-emerald-500/60 text-emerald-300',
    cancelled: 'border-red-500/60 text-red-300',
};

// One paid bill (used by "Paid today" and "All payments").
function PaymentCard({ p, showDay }) {
    return (
        <li className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-base font-semibold">Table {p.tableNumber}</span>
                <span className="text-neutral-400">
                    {showDay && `${new Date(p.at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })} · `}
                    {timeOf(p.at)}
                </span>
            </div>
            <ul className="mt-2 flex flex-col gap-1 text-neutral-300">
                {p.items.map((l) => (
                    <li key={`${l.name}-${l.unitPaise}`}>{l.qty} × {l.name}</li>
                ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 border-t border-neutral-800 pt-3">
                <span className="text-neutral-400">
                    {p.method.toUpperCase()}{p.payer ? ` · from ${p.payer}` : ''} · marked by {p.paidBy || 'staff'}
                </span>
                <span className="text-lg font-semibold">{formatRupees(p.totalPaise)}</span>
            </div>
        </li>
    );
}

export default function BillsBoard() {
    const [tab, setTab] = useState('tables'); // 'tables' | 'paid'
    const [tables, setTables] = useState(null);
    const [history, setHistory] = useState(null);
    const [all, setAll] = useState(null); // 'All payments' tab: { payments, next, summary }
    const [loadingAll, setLoadingAll] = useState(false);
    const [offline, setOffline] = useState(false);
    const [dialog, setDialog] = useState(null); // { type: 'paid' | 'reset', table }
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [method, setMethod] = useState('upi');
    const [payer, setPayer] = useState('');
    const stamp = useRef('');

    const load = useCallback(async (force = false) => {
        if (tab === 'all') return; // the All payments tab is loaded by loadAll, not every 3 seconds
        try {
            if (tab === 'paid') {
                const res = await fetch('/api/admin/bills?view=paid', { cache: 'no-store' });
                if (res.ok) setHistory(await res.json());
                setOffline(!res.ok);
                return;
            }
            const res = await fetch(`/api/admin/bills?since=${force ? '' : encodeURIComponent(stamp.current)}`, { cache: 'no-store' });
            if (!res.ok) return setOffline(true);
            const data = await res.json();
            setOffline(false);
            if (!data.unchanged) {
                stamp.current = data.stamp;
                setTables(data.tables);
            }
        } catch {
            setOffline(true);
        }
    }, [tab]);

    // All payments: 30 at a time, newest first. more = true adds the next 30.
    const loadAll = useCallback(async (more = false) => {
        setLoadingAll(true);
        try {
            const params = new URLSearchParams({ view: 'all' });
            if (more && all?.next) params.set('before', all.next);
            const res = await fetch(`/api/admin/bills?${params}`, { cache: 'no-store' });
            if (!res.ok) return setOffline(true);
            const data = await res.json();
            setOffline(false);
            setAll((old) => (more && old ? { payments: [...old.payments, ...data.payments], next: data.next, summary: old.summary } : data));
        } catch {
            setOffline(true);
        } finally {
            setLoadingAll(false);
        }
    }, [all]);

    // Opening the All payments tab loads its first page.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (tab === 'all' && all === null) loadAll(false);
    }, [tab, all, loadAll]);

    // Ask every 3 seconds. Pauses while the tab is hidden.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load(true);
        const id = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
        const onVisible = () => { if (!document.hidden) load(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
    }, [load]);

    function open(type, table) {
        setError('');
        setMethod('upi');
        setPayer('');
        setDialog({ type, table });
    }

    async function confirm() {
        const { type, table } = dialog;
        setBusy(true);
        setError('');
        try {
            const body = type === 'reset'
                ? { action: 'reset', tableId: table.tableId }
                : { action: 'paid', tableId: table.tableId, sitting: table.sitting, totalPaise: table.totalPaise, method, payer };
            const res = await fetch('/api/admin/bills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error || 'Something went wrong.');
                if (res.status === 409) load(true); // the table changed: show the new numbers
                return;
            }
            setDialog(null);
            load(true);
        } catch {
            setError('No internet for a moment. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    const tabBtn = (id, label) => (
        <button
            type="button"
            onClick={() => setTab(id)}
            className={`cursor-pointer rounded-full border px-5 py-2 text-sm transition-colors ${tab === id ? 'border-amber-500 bg-amber-500 text-black' : 'border-neutral-700 text-neutral-300 hover:border-neutral-400'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="mt-8">
            <div className="flex flex-wrap gap-3">
                {tabBtn('tables', 'Tables')}
                {tabBtn('paid', 'Paid today')}
                {tabBtn('all', 'All payments')}
            </div>

            {offline && <p role="status" className="mt-4 rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-300">Reconnecting... the numbers below may be a few seconds old.</p>}

            {/* ───────── tables ───────── */}
            {tab === 'tables' && (
                tables === null ? (
                    <p className="mt-8 text-sm text-neutral-400">Loading...</p>
                ) : tables.length === 0 ? (
                    <p className="mt-8 text-sm text-neutral-400">There are no active tables.</p>
                ) : (
                    <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {tables.map((t) => (
                            <li key={t.tableId} className="flex flex-col rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <h2 className="text-lg font-semibold">Table {t.number}</h2>
                                    <div className="flex flex-wrap justify-end gap-1.5 text-[11px]">
                                        {t.locked && <span className="rounded-full border border-red-500/60 px-2 py-0.5 text-red-300">Could not pay online</span>}
                                        {t.paying && <span className="rounded-full border border-emerald-500/60 px-2 py-0.5 text-emerald-300">Customer is paying</span>}
                                        <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-neutral-400">{t.people} {t.people === 1 ? 'person' : 'people'}</span>
                                    </div>
                                </div>

                                {t.orders.length === 0 ? (
                                    <p className="mt-4 text-sm text-neutral-500">No orders. The table is free.</p>
                                ) : (
                                    <ol className="mt-3 flex flex-col gap-3">
                                        {t.orders.map((o, i) => (
                                            <li key={o.id} className={`border-t border-neutral-800 pt-3 text-sm ${o.status === 'cancelled' ? 'opacity-50' : ''}`}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-neutral-400">Order {i + 1} · {timeOf(o.createdAt)}</span>
                                                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${BADGE[o.status]}`}>{STATUS_INFO[o.status].label}</span>
                                                </div>
                                                <ul className="mt-2 flex flex-col gap-1">
                                                    {o.items.map((l, k) => (
                                                        <li key={`${l.name}-${k}`} className="flex justify-between gap-3">
                                                            <span>{l.qty} × {l.name}</span>
                                                            <span className="shrink-0 text-neutral-400">{formatRupees(l.qty * l.unitPaise)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </li>
                                        ))}
                                    </ol>
                                )}

                                <div className="mt-auto pt-4">
                                    <div className="flex items-baseline justify-between border-t border-neutral-800 pt-3">
                                        <span className="text-xs uppercase tracking-widest text-neutral-400">To pay</span>
                                        <span className="text-2xl font-semibold">{formatRupees(t.totalPaise)}</span>
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            type="button"
                                            disabled={t.totalPaise <= 0}
                                            onClick={() => open('paid', t)}
                                            className="flex-1 cursor-pointer rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-30"
                                        >
                                            Mark paid
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => open('reset', t)}
                                            className="flex-1 cursor-pointer rounded-lg border border-neutral-600 py-2.5 text-sm transition-colors hover:border-red-400 hover:text-red-300"
                                        >
                                            Reset table
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )
            )}

            {/* ───────── paid today ───────── */}
            {tab === 'paid' && (
                history === null ? (
                    <p className="mt-8 text-sm text-neutral-400">Loading...</p>
                ) : (
                    <>
                        <div className="mt-6 flex items-baseline justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
                            <span className="text-xs uppercase tracking-widest text-neutral-400">Collected today ({history.payments.length} {history.payments.length === 1 ? 'bill' : 'bills'})</span>
                            <span className="text-2xl font-semibold text-emerald-300">{formatRupees(history.totalPaise)}</span>
                        </div>
                        {history.payments.length === 0 ? (
                            <p className="mt-6 text-sm text-neutral-400">Nothing has been paid yet today.</p>
                        ) : (
                            <ul className="mt-4 flex flex-col gap-3">
                                {history.payments.map((p) => (
                                    <PaymentCard key={p.id} p={p} />
                                ))}
                            </ul>
                        )}
                    </>
                )
            )}

            {/* ───────── all payments (every day) ───────── */}
            {tab === 'all' && (
                all === null ? (
                    <p className="mt-8 text-sm text-neutral-400">Loading...</p>
                ) : (
                    <>
                        <div className="mt-6 flex items-baseline justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
                            <span className="text-xs uppercase tracking-widest text-neutral-400">
                                All time ({all.summary?.count ?? 0} {all.summary?.count === 1 ? 'bill' : 'bills'})
                            </span>
                            <span className="text-2xl font-semibold text-emerald-300">{formatRupees(all.summary?.totalPaise ?? 0)}</span>
                        </div>
                        {all.payments.length === 0 ? (
                            <p className="mt-6 text-sm text-neutral-400">No payments yet.</p>
                        ) : (
                            <ul className="mt-4 flex flex-col gap-3">
                                {all.payments.map((p) => (
                                    <PaymentCard key={p.id} p={p} showDay />
                                ))}
                            </ul>
                        )}
                        <div className="mt-6 flex justify-center gap-3">
                            {all.next && (
                                <button type="button" onClick={() => loadAll(true)} disabled={loadingAll} className="cursor-pointer rounded-full border border-neutral-600 px-6 py-2 text-sm hover:border-neutral-300 disabled:opacity-50">
                                    {loadingAll ? 'Loading...' : 'Load older payments'}
                                </button>
                            )}
                            <button type="button" onClick={() => { setAll(null); }} disabled={loadingAll} className="cursor-pointer rounded-full border border-neutral-700 px-6 py-2 text-sm text-neutral-300 hover:border-neutral-400 disabled:opacity-50">
                                Refresh
                            </button>
                        </div>
                    </>
                )
            )}

            {/* ───────── confirm boxes ───────── */}
            {dialog && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-sm rounded-xl border border-neutral-700 bg-neutral-900 p-5">
                        {dialog.type === 'paid' ? (
                            <>
                                <h3 className="text-lg font-semibold">Mark Table {dialog.table.number} as paid</h3>
                                <p className="mt-2 text-sm text-neutral-300">
                                    Check your UPI app first: did <span className="font-semibold text-white">{formatRupees(dialog.table.totalPaise)}</span> arrive?
                                </p>
                                <label className="mt-4 block text-xs uppercase tracking-widest text-neutral-400">
                                    How did they pay?
                                    <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm normal-case tracking-normal text-white">
                                        <option value="upi">UPI</option>
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                    </select>
                                </label>
                                <label className="mt-3 block text-xs uppercase tracking-widest text-neutral-400">
                                    Paid from (UPI id or name, optional)
                                    <input
                                        value={payer}
                                        onChange={(e) => setPayer(e.target.value)}
                                        maxLength={60}
                                        placeholder="e.g. rahul@okhdfcbank"
                                        className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm normal-case tracking-normal text-white placeholder:text-neutral-600"
                                    />
                                </label>
                                <p className="mt-3 text-xs text-neutral-500">The table is reset right away. The customer&apos;s phone shows &quot;Paid&quot; for 5 seconds.</p>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-semibold">Reset Table {dialog.table.number}?</h3>
                                <p className="mt-2 text-sm text-neutral-300">
                                    This empties the table and logs every phone out of it, even if the table is full.
                                    {dialog.table.totalPaise > 0 && <span className="text-red-300"> It has an unpaid bill of {formatRupees(dialog.table.totalPaise)}, which will NOT be recorded as paid.</span>}
                                </p>
                            </>
                        )}
                        {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
                        <div className="mt-5 flex gap-2">
                            <button type="button" onClick={() => setDialog(null)} disabled={busy} className="flex-1 cursor-pointer rounded-lg border border-neutral-600 py-2.5 text-sm hover:border-neutral-300 disabled:opacity-50">Cancel</button>
                            <button
                                type="button"
                                onClick={confirm}
                                disabled={busy}
                                className={`flex-1 cursor-pointer rounded-lg py-2.5 text-sm font-semibold text-black disabled:opacity-50 ${dialog.type === 'paid' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-red-400 hover:bg-red-300'}`}
                            >
                                {busy ? 'Please wait...' : dialog.type === 'paid' ? 'Yes, money received' : 'Reset table'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}