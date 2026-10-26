'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { NEXT, STATUS_INFO } from '@/lib/orderStatus';

const POLL_MS = 3000;
const SOUND_KEY = 'pp_kitchen_sound'; // only saved when the kitchen switches the voice alerts OFF on this device
const VOICE_KEY = 'pp_kitchen_voice'; // the voice the kitchen picked on this device
const VOICE_LANG = 'en-IN'; // used when no voice is picked
const VOICE_LANGS = /^(en|hi)/i; // which voices are shown in the list
const VOICE_RATE = 0.95; // 1 = normal speed
const VOICE_PITCH = 1; // 1 = normal
const VOICE_VOLUME = 1; // 0 to 1
const SAMPLE_ORDER = { tableNumber: 5, items: [{ qty: 2, name: 'Iced Latte' }, { qty: 1, name: 'Brownie' }] };
const MAX_SPOKEN_ITEMS = 10; // a very long order is read only up to here, then "and 3 more items"
const COLUMNS = ['pending', 'accepted', 'preparing']; // the orders that still need work
const ACTION = { accepted: 'Accept', preparing: 'Start preparing', served: 'Mark served', cancelled: 'Cancel' };

const clock = (iso) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
const minutesAgo = (iso, now) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

// What is said out loud for one order, for example: "New order. Table 5. 2 Iced Latte, 1 Brownie."
function sentenceFor(order) {
    const parts = order.items.slice(0, MAX_SPOKEN_ITEMS).map((line) => `${line.qty} ${line.name}`);
    const more = order.items.length - parts.length;
    if (more > 0) parts.push(`and ${more} more item${more === 1 ? '' : 's'}`);
    return `New order. Table ${order.tableNumber}. ${parts.join(', ')}.`;
}

export default function KitchenBoard() {
    const [orders, setOrders] = useState(null); // null = first load
    const [busy, setBusy] = useState('');       // id of the order being changed
    const [message, setMessage] = useState('');
    const [offline, setOffline] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [soundOn, setSoundOn] = useState(true);    // voice alerts are ON by default
    const [unlocked, setUnlocked] = useState(false); // browsers only allow sound after one tap or click on the page
    const stamp = useRef('');
    const audio = useRef(null);
    const primed = useRef(false);
    const knownPending = useRef(null); // ids of the pending orders we have already seen (null until the first load)
    const pollRef = useRef(null);
    const soundRef = useRef(true);
    const voiceRef = useRef('');
    const [voices, setVoices] = useState([]);
    const [voiceName, setVoiceName] = useState('');

    // A short two-note beep. Only used when this device cannot speak.
    const beep = useCallback(() => {
        const ctx = audio.current;
        if (!ctx || ctx.state !== 'running') return;
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

    // Says a sentence out loud with the voice the kitchen picked. Returns false if this device cannot speak.
    const speak = useCallback((text) => {
        const synth = window.speechSynthesis;
        if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return false;
        const sentence = new SpeechSynthesisUtterance(text);
        const chosen = synth.getVoices().find((v) => v.name === voiceRef.current);
        if (chosen) {
            sentence.voice = chosen;
            sentence.lang = chosen.lang;
        } else {
            sentence.lang = VOICE_LANG;
        }
        sentence.rate = VOICE_RATE;
        sentence.pitch = VOICE_PITCH;
        sentence.volume = VOICE_VOLUME;
        synth.speak(sentence); // several orders at once are simply read one after the other
        return true;
    }, []);

    // New orders arrived: read each one out loud. If this device cannot speak, a beep is played instead.
    const announce = useCallback(
        (newOrders) => {
            const spoken = newOrders.map((order) => speak(sentenceFor(order)));
            if (!spoken.some(Boolean)) beep();
        },
        [beep, speak]
    );

    // Starts the sound and the voice. Browsers allow this only inside a tap or click, so it is called from those.
    const unlock = useCallback(async () => {
        if (!primed.current) {
            primed.current = true;
            try {
                if (window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined') {
                    const quiet = new SpeechSynthesisUtterance(' ');
                    quiet.volume = 0;
                    window.speechSynthesis.speak(quiet); // wakes the voice up
                }
            } catch {
                // no voice on this device: the beep is used instead
            }
        }
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) {
            setUnlocked(true);
            return;
        }
        if (!audio.current) {
            const ctx = new Ctx();
            ctx.onstatechange = () => setUnlocked(ctx.state === 'running'); // the browser may pause it again later
            audio.current = ctx;
        }
        try {
            await audio.current.resume();
        } catch {
            // not allowed yet: the next tap tries again
        }
        setUnlocked(audio.current.state === 'running');
    }, []);

    // Voice alerts are ON by default. We only remember it if the kitchen switched them off on this device.
    useEffect(() => {
        try {
            if (localStorage.getItem(SOUND_KEY) === 'off') setSoundOn(false);
        } catch {
            // storage blocked: the alerts just stay on
        }
    }, []);

    useEffect(() => { soundRef.current = soundOn; }, [soundOn]);

    // Loads the voices of this device and the one picked earlier. The list often arrives a moment after the page opens.
    useEffect(() => {
        try {
            const saved = localStorage.getItem(VOICE_KEY) || '';
            voiceRef.current = saved;
            setVoiceName(saved);
        } catch {
            // storage blocked: the automatic voice is used
        }
        const synth = window.speechSynthesis;
        if (!synth) return;
        const load = () => setVoices(synth.getVoices().filter((v) => VOICE_LANGS.test(v.lang)));
        load();
        synth.addEventListener('voiceschanged', load);
        return () => synth.removeEventListener('voiceschanged', load);
    }, []);

    function chooseVoice(event) {
        const name = event.target.value;
        setVoiceName(name);
        voiceRef.current = name;
        try {
            localStorage.setItem(VOICE_KEY, name);
        } catch {
            // storage blocked: the choice just is not remembered
        }
        window.speechSynthesis?.cancel();
        speak(sentenceFor(SAMPLE_ORDER)); // so the kitchen hears the new voice straight away
    }

    async function testVoice() {
        await unlock(); // this tap also unlocks sound
        window.speechSynthesis?.cancel();
        if (!speak(sentenceFor(SAMPLE_ORDER))) beep();
    }

    // Until the sound is unlocked, the first tap / click / key press anywhere on the page unlocks it.
    useEffect(() => {
        if (unlocked) return;
        const tryUnlock = () => { unlock(); };
        const events = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'];
        events.forEach((name) => window.addEventListener(name, tryUnlock));
        return () => events.forEach((name) => window.removeEventListener(name, tryUnlock));
    }, [unlocked, unlock]);

    // Keeps the screen awake while the board is on screen (a sleeping tablet cannot announce anything).
    useEffect(() => {
        let lock = null;
        let cancelled = false;
        async function keepAwake() {
            try {
                if (!('wakeLock' in navigator) || document.hidden) return;
                lock = await navigator.wakeLock.request('screen');
                if (cancelled) lock.release().catch(() => { });
            } catch {
                // not allowed (for example battery saver) or not supported: the board still works
            }
        }
        function onVisible() {
            if (!document.hidden) keepAwake(); // the browser lets go of the lock when the tab is hidden, so ask again
        }
        keepAwake();
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisible);
            lock?.release().catch(() => { });
        };
    }, []);

    async function toggleSound() {
        // Alerts are "on" but the browser has not allowed sound yet: this tap is the one that unlocks it (do not switch them off).
        if (soundOn && !unlocked) {
            await unlock();
            if (!speak('Voice alerts are on. New orders will be read out loud.')) beep();
            return;
        }
        const next = !soundOn;
        setSoundOn(next);
        soundRef.current = next;
        try {
            localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
        } catch {
            // storage blocked: the choice just is not remembered
        }
        if (next) {
            await unlock();
            if (!speak('Voice alerts are on. New orders will be read out loud.')) beep(); // a test, so the kitchen hears that it works
        } else {
            window.speechSynthesis?.cancel();
        }
    }

    // Every 3 seconds: "anything new?" It keeps going when the tab is hidden, so orders are heard from the background.
    useEffect(() => {
        let stopped = false;
        let running = false;
        let timer = 0;
        let worker = null;
        let workerUrl = '';
        const controller = new AbortController();

        async function tick() {
            if (stopped || running) return;
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
                        // Orders that are pending and that we have NOT seen before are the new ones.
                        const pending = data.orders.filter((o) => o.status === 'pending');
                        if (knownPending.current && soundRef.current) {
                            const fresh = pending.filter((o) => !knownPending.current.has(o.id));
                            if (fresh.length > 0) announce(fresh);
                        }
                        knownPending.current = new Set(pending.map((o) => o.id));
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
            if (!again) worker?.terminate();
            else if (!stopped && !worker) timer = setTimeout(tick, POLL_MS); // normal timer, only if the worker could not start
        }

        // Browsers slow down normal timers in background tabs. A small worker keeps its own clock and
        // taps us every 3 seconds, so the check keeps running when the tab is not on screen.
        try {
            workerUrl = URL.createObjectURL(new Blob([`setInterval(() => postMessage(0), ${POLL_MS});`], { type: 'text/javascript' }));
            worker = new Worker(workerUrl);
            worker.onmessage = () => tick();
        } catch {
            worker = null; // workers are blocked here: a normal timer is used instead
        }

        function onVisible() {
            if (document.hidden) return;
            clearTimeout(timer);
            tick(); // back on the board: catch up right away
        }

        pollRef.current = () => { clearTimeout(timer); tick(); };
        tick();
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            stopped = true;
            clearTimeout(timer);
            worker?.terminate();
            if (workerUrl) URL.revokeObjectURL(workerUrl);
            controller.abort();
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [announce]);

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

    const soundLabel = !soundOn
        ? 'Voice alerts off · tap to turn on'
        : unlocked
            ? 'Voice alerts on (new orders are read out loud)'
            : 'Voice alerts on · tap anywhere to activate';
    const soundStyle = !soundOn
        ? 'border-white/20 text-neutral-300 hover:border-white/50'
        : unlocked
            ? 'border-amber-500 text-amber-400'
            : 'animate-pulse border-amber-500/60 text-amber-300';

    return (
        <div className="mt-6">
            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={toggleSound}
                    className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs ${soundStyle}`}
                >
                    {soundLabel}
                </button>
                {voices.length > 0 && (
                    <select
                        value={voiceName}
                        onChange={chooseVoice}
                        aria-label="Voice for new order alerts"
                        className="max-w-[16rem] rounded-full border border-white/20 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200"
                    >
                        <option value="">Automatic voice</option>
                        {voices.map((v) => (
                            <option key={`${v.name}-${v.lang}`} value={v.name}>
                                {v.name} ({v.lang})
                            </option>
                        ))}
                    </select>
                )}
                <button
                    type="button"
                    onClick={testVoice}
                    className="cursor-pointer rounded-full border border-white/20 px-4 py-1.5 text-xs text-neutral-300 hover:border-white/50"
                >
                    Test voice
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