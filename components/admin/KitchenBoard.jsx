'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { NEXT, STATUS_INFO } from '@/lib/orderStatus';

const POLL_MS = 3000;
const COLUMNS = ['pending', 'accepted', 'preparing']; // the orders that still need work
const ACTION = { accepted: 'Accept', preparing: 'Start preparing', served: 'Mark served', cancelled: 'Cancel' };

const clock = (iso) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
const minutesAgo = (iso, now) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

export default function KitchenBoard() {
    const [orders, setOrders] = useState(null); // null = first load
    const [busy, setBusy] = useState('');       // id of the order being changed
    const [message, setMessage] = useState('');
    const [offline, setOffline] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [soundOn, setSoundOn] = useState(false);
    const stamp = useRef('');
    const audio = useRef(null);
    const lastPending = useRef(null);
    const pollRef = useRef(null);
    const soundRef = useRef(false);

    // A short two-note beep. Browsers only allow sound after a tap, which is why there is an "Enable sound" button.
    const beep = useCallback(() => {
        const ctx = audio.current;
        if (!ctx) return;
        [0, 0.22].forEach((delay, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = i === 0 ? 880 : 1175;
            gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + delay + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.18);
            osc.connect(gain).connect(ctx.destination);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.2);
        });
    }, []);

    function toggleSound() {
        if (!soundOn) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (Ctx) audio.current = audio.current || new Ctx();
            audio.current?.resume?.();
            setSoundOn(true);
            beep();
        } else {
            setSoundOn(false);
        }
    }

    useEffect(() => { soundRef.current = soundOn; }, [soundOn]);

    // Every 3 seconds: "anything new?" Pauses while the tab is hidden.
    useEffect(() => {
        let stopped = false;
        let running = false;
        let timer = 0;
        const controller = new AbortController();

        async function tick() {
            if (stopped || running || document.hidden) return;
            running = true;
            let again = true;
            try {
                const res = await fetch(`/api/admin/orders?since=${encodeURIComponent(stamp.current)}`, { cache: 'no-store', signal: controller.signal });
                if (res.status === 401 || res.redirected) {
                    window.location.href = '/auth/login'; // logged out
                    again = false;
                } else if (res.ok) {
                    const data = await res.json();
                    if (!data.unchanged) {
                        stamp.current = data.stamp;
                        const pending = data.orders.filter((o) => o.status === 'pending').length;
                        if (lastPending.current !== null && pending > lastPending.current && soundRef.current) beep();
                        lastPending.current = pending;
                        setOrders(data.orders);
                    }
                    setOffline(false);
                } else {
                    setOffline(true);
                }
            } catch (err) {
                if (err?.name === 'AbortError') return;
                setOffline(true);
            } finally {
                running = false;
            }
            setNow(Date.now());
            if (again && !stopped) timer = setTimeout(tick, POLL_MS);
        }

        function onVisible() {
            if (document.hidden) return;
            clearTimeout(timer);
            tick();
        }

        pollRef.current = () => { clearTimeout(timer); tick(); };
        tick();
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            stopped = true;
            clearTimeout(timer);
            controller.abort();
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [beep]);

    async function move(order, status) {
        if (status === 'cancelled' && !window.confirm(`Cancel the order of Table ${order.tableNumber}?`)) return;
        setBusy(order.id);
        setMessage('');
        try {
            const res = await fetch('/api/admin/orders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: order.id, status }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status: data.order.status } : o)));
            } else {
                setMessage(data.error || 'Could not change the order. Please try again.');
            }
            stamp.current = ''; // forget the fingerprint so the next check loads the true list
            pollRef.current?.();
        } catch {
            setMessage('No connection. Please try again.');
        } finally {
            setBusy('');
        }
    }

    if (orders === null) {
        return <div aria-hidden="true" className="mt-8 h-40 animate-pulse rounded-xl bg-white/5" />;
    }

    const byStatus = (s) => orders.filter((o) => o.status === s);
    const finished = orders.filter((o) => o.status === 'served' || o.status === 'cancelled').slice(-20).reverse();

    return (
        <div className="mt-6">
            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={toggleSound}
                    className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs ${soundOn ? 'border-amber-500 text-amber-400' : 'border-white/20 text-neutral-300 hover:border-white/50'}`}
                >
                    {soundOn ? 'Sound on (new order beep)' : 'Enable sound for new orders'}
                </button>
                {offline && <span role="status" className="text-xs text-neutral-400">Reconnecting...</span>}
            </div>

            {message && <p role="alert" className="mt-4 rounded-lg border border-red-400/40 px-4 py-3 text-sm text-red-200">{message}</p>}

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                {COLUMNS.map((status) => {
                    const list = byStatus(status);
                    return (
                        <section key={status} aria-label={STATUS_INFO[status].label}>
                            <h2 className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.2em] text-amber-500">
                                {STATUS_INFO[status].label}
                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-neutral-200">{list.length}</span>
                            </h2>
                            <ul className="mt-3 flex flex-col gap-3">
                                {list.length === 0 && <li className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-neutral-500">Nothing here</li>}
                                {list.map((order) => (
                                    <li key={order.id} className={`rounded-xl border bg-neutral-900 p-4 ${status === 'pending' ? 'border-amber-500/60' : 'border-white/10'}`}>
                                        <div className="flex items-baseline justify-between">
                                            <p className="text-2xl font-semibold">Table {order.tableNumber}</p>
                                            <p suppressHydrationWarning className="text-xs text-neutral-400">
                                                {clock(order.createdAt)} · {minutesAgo(order.createdAt, now)} min ago
                                            </p>
                                        </div>
                                        <ul className="mt-3 flex flex-col gap-1 text-sm">
                                            {order.items.map((line, i) => (
                                                <li key={`${line.name}-${i}`}><span className="font-semibold">{line.qty} ×</span> {line.name}</li>
                                            ))}
                                        </ul>
                                        <div className="mt-4 flex gap-2">
                                            {NEXT[status].map((to) => (
                                                <button
                                                    key={to}
                                                    type="button"
                                                    disabled={busy === order.id}
                                                    onClick={() => move(order, to)}
                                                    className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${to === 'cancelled'
                                                        ? 'border border-red-400/40 text-red-200 hover:bg-red-400/10'
                                                        : 'flex-1 bg-amber-500 text-black hover:bg-amber-400'}`}
                                                >
                                                    {ACTION[to]}
                                                </button>
                                            ))}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                })}
            </div>

            <section className="mt-10" aria-label="Finished orders">
                <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">Finished (last 20)</h2>
                <ul className="mt-3 flex flex-col divide-y divide-white/10 rounded-xl border border-white/10">
                    {finished.length === 0 && <li className="p-4 text-sm text-neutral-500">No finished orders yet.</li>}
                    {finished.map((order) => (
                        <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                            <span>Table {order.tableNumber} · {order.items.map((l) => `${l.qty}× ${l.name}`).join(', ')}</span>
                            <span className={`shrink-0 text-xs ${order.status === 'cancelled' ? 'text-red-300' : 'text-emerald-300'}`}>{STATUS_INFO[order.status].label}</span>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}