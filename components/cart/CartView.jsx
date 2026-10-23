'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link'
import { X } from 'lucide-react'
import Image from 'next/image';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/lib/cartStore';

// 14950 paise -> ₹149.50   (whole rupees show without decimals)
const rupees = (paise) =>
    `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export default function CartView({ tableNumber }) {
    const { items, setQty, remove } = useCart();

    // Names/prices come from the server. We ask again only when the SET of items changes, not on every + or -.
    const idsKey = items.map((i) => i.id).sort().join(',');
    const [quote, setQuote] = useState({ key: '', lines: {} });
    const [failedKey, setFailedKey] = useState('');
    const [removedNote, setRemovedNote] = useState(false);

    useEffect(() => {
        if (!idsKey) return;
        const controller = new AbortController();
        fetch('/api/cart/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // qty is not needed for a price check, so a placeholder 1 is sent
            body: JSON.stringify({ items: idsKey.split(',').map((id) => ({ id, qty: 1 })) }),
            signal: controller.signal,
        })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('quote failed'))))
            .then((data) => {
                setQuote({ key: idsKey, lines: Object.fromEntries(data.lines.map((l) => [l.id, l])) });
                if (data.unavailable.length > 0) {
                    data.unavailable.forEach(remove); // sold out or deleted: take it out of the cart
                    setRemovedNote(true);
                }
            })
            .catch((err) => {
                if (err?.name !== 'AbortError') setFailedKey(idsKey);
            });
        return () => controller.abort();
    }, [idsKey, remove]);

    const loading = idsKey !== '' && quote.key !== idsKey && failedKey !== idsKey;
    const failed = idsKey !== '' && failedKey === idsKey;
    const totalPaise = items.reduce((sum, i) => sum + (quote.lines[i.id]?.unitPaise ?? 0) * i.qty, 0);

    return (
        <main className="min-h-screen px-4 py-8 font-ui text-white sm:px-12">
            <div className="mx-auto max-w-2xl">
                <div className="flex flex-row justify-between">
                    <h1 className="font-heading text-5xl sm:text-6xl">Your cart</h1>
                    
                    <Link
                        href="/"
                        aria-label="Close the menu"
                        className="relative flex cursor-pointer shrink-0 items-center justify-center border border-[#26262E] rounded-full p-2 h-fit"
                    >
                        <X size={20} strokeWidth={1.75} nonScalingStroke className="text-white" />
                    </Link>
                </div>

                {/* Which table this phone is at (from the QR code). */}
                <p className="mt-4 text-[12px] tracking-wide text-white/60">
                    {tableNumber ? `Table ${tableNumber}` : 'Scan the QR code on your table to place an order.'}
                </p>

                {removedNote && (
                    <p role="status" className="mt-6 border border-white/20 px-4 py-3 text-[12px] text-white/80">
                        Some items are no longer available and were removed from your cart.
                    </p>
                )}

                {items.length === 0 ? (
                    <div className="mt-16 flex flex-col items-start gap-6">
                        <p className="text-sm text-white/60">Your cart is empty.</p>
                        <Link href="/menu" className="border border-white px-10 py-3 text-[12px] uppercase tracking-[1px] transition-colors duration-500 hover:bg-white hover:text-black">
                            Browse the menu
                        </Link>
                    </div>
                ) : (
                    <>
                        {failed && (
                            <p role="alert" className="mt-6 border border-red-400/40 px-4 py-3 text-[12px] text-red-200">
                                Could not load the item details. Please refresh the page.
                            </p>
                        )}

                        <ul className="mt-10 flex flex-col divide-y divide-white/10 border-y border-white/10">
                            {items.map((item) => {
                                const info = quote.lines[item.id];
                                if (!info) {
                                    // still loading this one: a grey placeholder row, never a blank gap
                                    return <li key={item.id} aria-hidden="true" className="h-24 animate-pulse bg-white/5" />;
                                }
                                return (
                                    <li key={item.id} className="flex items-center gap-4 py-4">
                                        <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-[#16161A]">
                                            <Image src={info.image} alt="" fill sizes="80px" className="object-cover" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-heading text-lg uppercase leading-tight">{info.name}</p>
                                            <p className="mt-0.5 text-[12px] italic text-white/50">{info.category}</p>
                                            <p className="mt-2 text-[13px]">{rupees(info.unitPaise * item.qty)}</p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <button type="button" aria-label={`Fewer ${info.name}`} onClick={() => setQty(item.id, item.qty - 1)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 hover:border-white">
                                                <Minus size={14} />
                                            </button>
                                            <span className="w-5 text-center text-sm" aria-live="polite">{item.qty}</span>
                                            <button type="button" aria-label={`More ${info.name}`} onClick={() => setQty(item.id, item.qty + 1)} disabled={item.qty >= 20} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 hover:border-white disabled:cursor-not-allowed disabled:opacity-40">
                                                <Plus size={14} />
                                            </button>
                                            <button type="button" aria-label={`Remove ${info.name}`} onClick={() => remove(item.id)} className="ml-1 flex h-8 w-8 cursor-pointer items-center justify-center text-white/50 hover:text-white">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="mt-8 flex items-center justify-between">
                            <span className="text-[12px] uppercase tracking-widest text-white/60">Total</span>
                            <span className="font-heading text-3xl">{loading ? '...' : rupees(totalPaise)}</span>
                        </div>

                        {/* Placing the order is the next step. The server will check the table and recalculate every price itself. */}
                        <button type="button" disabled className="mt-8 w-full cursor-not-allowed border border-white/30 py-4 text-[12px] uppercase tracking-[1px] text-white/50">
                            Place order
                        </button>
                    </>
                )}
            </div>
        </main>
    );
}