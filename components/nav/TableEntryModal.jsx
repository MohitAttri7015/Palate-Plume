'use client';

import { useEffect, useRef, useState } from 'react';

// The little "Enter table number" form. Opened from the menu in the navbar.
// The code is the 5 letters/numbers printed on the card on the table (no I, L, O, 0 or 1 in it).
export default function TableEntryModal({ open, onClose }) {
    const [value, setValue] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        inputRef.current?.focus();
        const onKey = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    async function submit(event) {
        event.preventDefault();
        if (busy) return;
        if (value === '' || code.length !== 5) {
            setError('Please enter your table number and the 5-character code from your table card.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/table-join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: Number(value), code }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                // A full page load, so the navbar and the cart start fresh as "sitting at table N".
                window.location.assign('/menu');
                return;
            }
            setError(data.error || 'We could not find that table. Please try again.');
        } catch {
            setError('No connection. Please try again.');
        }
        setBusy(false);
    }

    const box = `w-full rounded-lg border bg-transparent px-4 py-3 text-lg outline-none ${error ? 'border-red-500' : 'border-white/20 focus:border-white'}`;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-5 backdrop-blur-sm" onClick={onClose}>
            <form
                onSubmit={submit}
                onClick={(event) => event.stopPropagation()}
                noValidate
                role="dialog"
                aria-modal="true"
                aria-labelledby="table-entry-title"
                className="w-full max-w-sm rounded-xl border border-[#26262E] bg-[#0A0A0C] p-6 font-ui text-white"
            >
                <h2 id="table-entry-title" className="font-heading text-3xl">Enter table number</h2>
                <p className="mt-2 text-[12px] text-white/60">You can find the number and the code on the card on your table.</p>

                <div className="mt-5 flex gap-3">
                    <label className="flex w-24 shrink-0 flex-col gap-1 text-[11px] text-white/50">
                        Table
                        <input
                            ref={inputRef}
                            value={value}
                            onChange={(event) => {
                                setValue(event.target.value.replace(/\D/g, '').slice(0, 2));
                                setError('');
                            }}
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="5"
                            aria-label="Table number"
                            aria-invalid={Boolean(error)}
                            className={box}
                        />
                    </label>
                    <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] text-white/50">
                        Code
                        <input
                            value={code}
                            onChange={(event) => {
                                setCode(event.target.value.toUpperCase().replace(/[^A-HJKMNP-Z2-9]/g, '').slice(0, 5));
                                setError('');
                            }}
                            autoComplete="off"
                            autoCapitalize="characters"
                            spellCheck={false}
                            placeholder="K7M2X"
                            aria-label="Table code"
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? 'table-entry-error' : undefined}
                            className={`${box} uppercase tracking-[0.2em]`}
                        />
                    </label>
                </div>

                {error && (
                    <p id="table-entry-error" role="alert" className="mt-3 text-[12px] text-red-400">
                        {error}
                    </p>
                )}

                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full cursor-pointer border border-white/30 py-3 text-[12px] uppercase tracking-[1px] text-white/80 transition-colors duration-300 hover:border-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy}
                        className="w-full cursor-pointer border border-white bg-white py-3 text-[12px] uppercase tracking-[1px] text-black transition-colors duration-500 hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {busy ? 'Checking...' : 'Continue'}
                    </button>
                </div>
            </form>
        </div>
    );
}