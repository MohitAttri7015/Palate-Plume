'use client';

// The customer's cart. It lives in THEIR phone's browser (localStorage), so it needs no login and no database,
// survives a refresh, and stays in sync between tabs.
// It only keeps item ids and quantities. Prices and names are always fetched fresh from the server,
// and the server calculates the real total again when an order is placed.
import { useSyncExternalStore } from 'react';

const KEY = 'pp_cart_v1';
const MAX_LINES = 40; // different items in one cart
const MAX_QTY = 20; // of one item
const EMPTY = [];
const ID = /^[a-f0-9]{24}$/i;

let current = null; // the cart in memory (loaded from localStorage the first time it is needed)
const listeners = new Set();

// Whatever is in localStorage may have been edited by someone, so every cart is cleaned before it is used.
function clean(list) {
    if (!Array.isArray(list)) return EMPTY;
    const merged = new Map();
    for (const row of list) {
        if (!row || typeof row.id !== 'string' || !ID.test(row.id)) continue;
        const qty = Math.floor(Number(row.qty));
        if (!(qty >= 1)) continue;
        const id = row.id.toLowerCase();
        merged.set(id, Math.min(MAX_QTY, (merged.get(id) ?? 0) + qty));
        if (merged.size >= MAX_LINES) break;
    }
    return merged.size > 0 ? [...merged].map(([id, qty]) => ({ id, qty })) : EMPTY;
}

function read() {
    try {
        return clean(JSON.parse(localStorage.getItem(KEY) || '[]'));
    } catch {
        return EMPTY;
    }
}

function write(next) {
    current = next;
    try {
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        // Private mode / storage full: the cart still works until the tab closes.
    }
    listeners.forEach((l) => l());
}

const snapshot = () => (current ??= read());

function subscribe(listener) {
    listeners.add(listener);
    const onStorage = (e) => {
        if (e.key === KEY || e.key === null) {
            current = read();
            listener();
        }
    };
    window.addEventListener('storage', onStorage); // another tab changed the cart
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
    };
}

const add = (id, n = 1) => write(clean([...snapshot(), { id, qty: n }]));
const setQty = (id, qty) => write(clean(snapshot().map((r) => (r.id === id ? { id, qty } : r)))); // 0 removes it
const remove = (id) => write(snapshot().filter((r) => r.id !== id));
const clear = () => write(EMPTY);

export function useCart() {
    const items = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
    const count = items.reduce((n, r) => n + r.qty, 0);
    return { items, count, add, setQty, remove, clear };
}