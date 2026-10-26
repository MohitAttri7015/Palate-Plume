'use client';

// The customer's cart. It works in one of two ways:
//
//   TABLE mode  The phone scanned a table QR code. The cart lives on the SERVER and is shared by everybody at that table.
//               Your own taps show instantly; every 2 seconds we ask the server "anything new?".
//   LOCAL mode  No table (someone just browsing). The cart lives in this phone's localStorage, like before.
//
// Which mode we are in is found out by the first request to /api/table-cart:
//   200 -> table mode,   401 -> local mode,   403 (table full) -> local mode + a "table is full" note.
import { useSyncExternalStore } from 'react';
import { applyDelta, MAX_QTY } from '@/lib/cartMath';

const LOCAL_KEY = 'pp_cart_v1';
const POLL_BASE = 3000; // how often we ask while things are happening (ms)
const POLL_MAX = 8000; // when nothing changes we slowly relax to this (ms), never slower
const EMPTY = [];
const ID = /^[a-f0-9]{24}$/i;

// mode: 'unknown' = still asking the server, 'local', or 'table'
const START = { mode: 'unknown', full: false, items: EMPTY, people: 0, maxPeople: 4, version: 0 };

let state = START; // everything the screen needs. It is REPLACED (never edited) so React can notice changes.
const listeners = new Set();
let timer = 0; // the next "ask the server" is scheduled with this
let delay = POLL_BASE; // the wait until the next question. Grows while nothing changes, resets when something happens
let pending = 0; // how many of our own changes are still travelling to the server
let queue = Promise.resolve(); // our changes wait in line here, so they reach the server in the order they were tapped
let booting = null; // resolves when the first answer has arrived

function setState(patch) {
    if (!Object.keys(patch).some((key) => patch[key] !== state[key])) return; // nothing changed: do not redraw
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
}

const qtyOf = (id) => state.items.find((row) => row.id === id)?.qty ?? 0;

/* ───────── LOCAL mode (localStorage) ───────── */

// Whatever is in localStorage may have been edited by someone, so it is cleaned before it is used.
function readLocal() {
    try {
        const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
        if (!Array.isArray(list)) return EMPTY;
        let items = EMPTY;
        for (const row of list) {
            if (!row || typeof row.id !== 'string' || !ID.test(row.id)) continue;
            const qty = Math.floor(Number(row.qty));
            if (qty >= 1) items = applyDelta(items, row.id.toLowerCase(), qty);
        }
        return items;
    } catch {
        return EMPTY;
    }
}

function writeLocal(items) {
    try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
    } catch {
        // Private mode / storage full: the cart still works until the tab closes.
    }
    setState({ items });
}

function goLocal(full) {
    setState({ mode: 'local', full, items: readLocal(), people: 0, version: 0 });
}

/* ───────── Talking to the server ───────── */

async function callApi(method, { body, since } = {}) {
    const res = await fetch(since ? `/api/table-cart?since=${since}` : '/api/table-cart', {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
    });
    return { res, data: await res.json().catch(() => ({})) };
}

// Looks at an answer from the server and updates the screen. Other errors (500, offline) change nothing.
function applyAnswer({ res, data }) {
    if (res.ok && data.unchanged) {
        setState({ people: data.people, maxPeople: data.maxPeople }); // only the number of people moved
    } else if (res.ok) {
        setState({
            mode: 'table',
            full: false,
            items: data.items.length > 0 ? data.items : EMPTY,
            people: data.people,
            maxPeople: data.maxPeople,
            version: data.version,
        });
    } else if (res.status === 401) {
        goLocal(false); // no table (or the table was switched off)
    } else if (res.status === 403 && data.code === 'TABLE_FULL') {
        goLocal(true);
    }
}

// Returns true when something happened (the cart changed, or we are busy with our own tap).
async function poll(force = false) {
    if (pending > 0) return true; // we are in the middle of our own change: do not let an old answer overwrite it
    try {
        const since = !force && state.mode === 'table' ? state.version : 0;
        const answer = await callApi('GET', { since });
        if (pending > 0) return true; // the person tapped while this request was travelling: their tap wins
        applyAnswer(answer);
        return answer.res.ok && !answer.data.unchanged;
    } catch {
        return false; // offline: we simply try again a bit later
    }
}

function schedule(ms) {
    clearTimeout(timer);
    timer = setTimeout(tick, ms);
}

// The loop. Fast (3s) while the cart is changing, slowly relaxing to 8s when nothing happens.
// It pauses while the tab is hidden (phone locked, other app open) and stops in local mode.
async function tick() {
    timer = 0;
    if (listeners.size === 0 || document.hidden) return;
    const changed = await poll();
    delay = changed ? POLL_BASE : Math.min(POLL_MAX, Math.round(delay * 1.4));
    if (listeners.size > 0 && state.mode !== 'local') schedule(delay);
}

function onVisible() {
    if (document.hidden || listeners.size === 0 || state.mode === 'local') return;
    clearTimeout(timer);
    delay = POLL_BASE;
    tick(); // the person came back to the tab: catch up right away
}

function onStorage(event) {
    // another tab of this browser changed the local cart
    if (state.mode === 'local' && (event.key === LOCAL_KEY || event.key === null)) setState({ items: readLocal() });
}

function start() {
    delay = POLL_BASE;
    booting = tick(); // the first request also decides the mode
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('storage', onStorage);
}

function stop() {
    clearTimeout(timer);
    timer = 0;
    booting = null;
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('storage', onStorage);
}

function subscribe(listener) {
    listeners.add(listener);
    if (listeners.size === 1) start(); // the first component that needs the cart starts the loop
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stop(); // the last one leaving stops it
    };
}

// Sends one change to the server (in line behind the earlier ones).
function send(body) {
    delay = POLL_BASE;
    pending += 1;
    queue = queue.then(async () => {
        let answer = null;
        try {
            answer = await callApi('POST', { body });
        } catch {
            // offline
        }
        pending -= 1;
        if (pending > 0) return; // more taps are still in line: only the LAST answer is shown, so numbers never jump back and forth
        if (answer) applyAnswer(answer);
        if (state.mode === 'table' && (!answer || !answer.res.ok)) poll(true); // it failed: ask the server what the real cart is
    });
}

/* ───────── What the buttons call ───────── */

function apply(id, delta) {
    if (delta === 0) return;
    if (state.mode === 'table') {
        setState({ items: applyDelta(state.items, id, delta) }); // 1) show it on this phone right away
        send({ action: 'change', id, delta }); //                   2) tell the server (and so the other phones)
    } else if (state.mode === 'local') {
        writeLocal(applyDelta(state.items, id, delta));
    }
    // mode 'unknown' (still offline at the very start): nothing to do yet
}

// Wait for the first answer from the server, so we know which mode we are in before we change anything.
async function run(action) {
    await booting;
    return action();
}

const add = (id, n = 1) => run(() => apply(id, n));
const setQty = (id, qty) => run(() => apply(id, qty - qtyOf(id))); // 0 removes it
const remove = (id) => run(() => apply(id, -MAX_QTY));
const refresh = () => run(() => poll(true));
const clear = () =>
    run(() => {
        if (state.mode === 'table') {
            setState({ items: EMPTY });
            send({ action: 'clear' });
        } else if (state.mode === 'local') {
            writeLocal(EMPTY);
        }
    });

export function useCart() {
    const s = useSyncExternalStore(subscribe, () => state, () => START);
    const count = s.items.reduce((n, row) => n + row.qty, 0);
    return {
        items: s.items,
        count,
        ready: s.mode !== 'unknown', // false until the first answer arrived (so the cart page can show a skeleton)
        atTable: s.mode === 'table',
        tableFull: s.full,
        people: s.people,
        maxPeople: s.maxPeople,
        add,
        setQty,
        remove,
        clear,
        refresh,
    };
}