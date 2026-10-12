'use client';

import { useState } from 'react';
import Image from 'next/image';

// Unsplash placeholders. Swap with your own photos in /public when ready.
const img = (id, w = 1000) =>
    `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const specialties = [
    {
        id: '01',
        title: 'Rare',
        subheading: 'Miyazaki Wagyu • Fresh Truffles • Wild Line-Caught',
        description:
            'Every plate begins long before the kitchen. We partner exclusively with sustainable purveyors, private estates, and daily fisheries to bring rare, seasonal ingredients directly to your table at their absolute peak of flavor.',
        image: img('1600891964092-4316c288032e'),
        bg: '#ebe9e7', // panel color
        text: '#16161A', // small text color
        titleColor: '#16161A', // big title color
    },
    {
        id: '02',
        title: 'Craft',
        subheading: '45-Day Dry Aging • Smoke & Charcoal',
        description:
            'Our kitchen honors raw elemental fire. Prime cuts are dry-aged in-house for 45 days and finished over white oak charcoal, locking in deep oak aromas and delicate textures crafted to elevate every bite.',
        image: img('1555939594-58d7cb561ad1'),
        bg: '#16161A',
        text: '#ffffff',
        titleColor: '#ffffff',
    },
    {
        id: '03',
        title: 'Flow',
        subheading: 'Instant Digital Table Ordering • Live Kitchen Sync',
        description:
            'No waiting for physical menus or delayed checks. Explore dish provenance, customize dietary preferences, and send orders straight to the pass from your phone—giving you full control over your dining pacing.',
        image: img('1517248135467-4c7edcad34c4'),
        bg: '#f4a7b9',
        text: '#16161A',
        titleColor: '#ffffff',
    },
];

// How much each column grows. Bigger "open" = wider expanded panel.
const GROW = { idle: 1, open: 7, closed: 0.45 };

// Both images of a panel use the same sizes so the browser downloads one file only
const IMG_SIZES = '(min-width:768px) 50vw, 100vw';

const hideBrokenImg = (e) => {
    e.currentTarget.style.visibility = 'hidden';
};

export default function Specialties({ items = specialties }) {
    // null = nothing hovered (3 equal columns). Otherwise the index of the open panel.
    const [active, setActive] = useState(null);

    const growFor = (i) =>
        active === null ? GROW.idle : active === i ? GROW.open : GROW.closed;

    return (
        <div className="text-white flex flex-col gap-15">

            {/* [container-type:inline-size] lets children use cqw units (% of this grid's width).
                Below 768px the cards simply stack and show all content. */}
            <div
                onMouseLeave={() => setActive(null)}
                onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) setActive(null);
                }}
                className="flex flex-col gap-1 [container-type:inline-size] md:h-[clamp(34rem,85vh,46rem)] md:flex-row"
            >
                {items.map((item, i) => {
                    const isIdle = active === null;
                    const isActive = active === i;
                    const showStrip = !isIdle && !isActive;
                    const lines = item.subheading.split('•').map((s) => s.trim());

                    return (
                        <article
                            key={item.id}
                            tabIndex={0}
                            onMouseEnter={() => setActive(i)}
                            onFocus={() => setActive(i)}
                            onClick={() => setActive(i)}
                            style={{ '--g': growFor(i), backgroundColor: item.bg, color: item.text }}
                            className="group relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70
                                md:min-w-0 md:[flex:var(--g)_1_0%] md:transition-[flex-grow] md:duration-[900ms] md:ease-[cubic-bezier(0.22,1,0.36,1)]"
                        >
                            {/* ───────── Layer 1 (desktop): idle look, image on top + big title ───────── */}
                            <div
                                aria-hidden="true"
                                style={{
                                    width: 'calc((100cqw - 0.5rem) / 3)',
                                    transitionDelay: isIdle ? '400ms' : '0ms',
                                }}
                                className={`absolute left-0 top-0 hidden h-full flex-col p-4 transition-opacity duration-500 md:flex ${isIdle ? 'opacity-100' : 'opacity-0'
                                    }`}
                            >
                                <div className="relative h-[40%] w-full overflow-hidden">
                                    <Image
                                        src={item.image}
                                        alt=""
                                        fill
                                        sizes={IMG_SIZES}
                                        draggable={false}
                                        onError={hideBrokenImg}
                                        className="object-cover grayscale transition-[filter] duration-700 ease-in-out group-hover:grayscale-0"
                                    />
                                </div>
                                <div className="mt-auto flex flex-col gap-3">
                                    <span className="font-ui text-[14px] font-bold tracking-wide">
                                        {item.id}
                                    </span>
                                    <span
                                        style={{ color: item.titleColor }}
                                        className="font-heading uppercase leading-[0.85] text-[length:min(9.5cqw,9rem)]"
                                    >
                                        {item.title}
                                    </span>
                                </div>
                            </div>

                            {/* ───────── Layer 2 (desktop): thin strip when another panel is open ───────── */}
                            <div
                                aria-hidden="true"
                                style={{ transitionDelay: showStrip ? '350ms' : '0ms' }}
                                className={`absolute inset-0 hidden flex-col items-center justify-between py-4 transition-opacity duration-500 md:flex ${showStrip ? 'opacity-100' : 'opacity-0'
                                    }`}
                            >
                                <span className="font-ui text-[11px] font-bold">{item.id}</span>
                                <span className="rotate-180 font-ui text-[11px] font-bold uppercase tracking-[3px] [writing-mode:vertical-rl]">
                                    {item.title}
                                </span>
                            </div>

                            {/* ───────── Layer 3: full content. Shown on hover (desktop), always on mobile ───────── */}
                            <div
                                style={{ transitionDelay: isActive ? '350ms' : '0ms' }}
                                className={`relative flex flex-col gap-4 p-4 transition-all duration-500
                                    md:absolute md:left-0 md:top-0 md:grid md:h-full md:w-full md:min-w-[87cqw]
                                    md:grid-cols-[5fr_7fr] md:grid-rows-[minmax(0,1fr)_auto] md:gap-5 md:p-6 ${isActive
                                        ? 'md:translate-y-0 md:opacity-100'
                                        : 'md:pointer-events-none md:translate-y-3 md:opacity-0'
                                    }`}
                            >
                                {/* Image: top on mobile, right side on desktop */}
                                <div className="relative order-1 aspect-[16/10] overflow-hidden md:order-none md:col-start-2 md:row-start-1 md:aspect-auto">
                                    <Image
                                        src={item.image}
                                        alt={item.title}
                                        fill
                                        sizes={IMG_SIZES}
                                        draggable={false}
                                        onError={hideBrokenImg}
                                        className="object-cover"
                                    />
                                </div>

                                {/* Big title, letters spread across the full width */}
                                <h3
                                    aria-label={item.title}
                                    style={{ color: item.titleColor }}
                                    className="order-2 flex justify-between font-heading uppercase leading-[0.8] text-[length:min(16cqw,13rem)] md:order-none md:col-span-2 md:row-start-2"
                                >
                                    {item.title
                                        .toUpperCase()
                                        .split('')
                                        .map((letter, idx) => (
                                            <span key={idx} aria-hidden="true">
                                                {letter}
                                            </span>
                                        ))}
                                </h3>

                                {/* Number + subheading + description */}
                                <div className="order-3 flex min-h-0 flex-col justify-between gap-4 overflow-hidden md:order-none md:col-start-1 md:row-start-1">
                                    <div>
                                        <p className="font-heading leading-none text-3xl md:text-[length:min(7cqw,6rem)]">
                                            {item.id}
                                        </p>
                                        <p className="font-heading uppercase leading-[1.05] text-[length:clamp(1rem,2cqw,1.75rem)]">
                                            {lines.map((line) => (
                                                <span key={line} className="block">
                                                    {line}
                                                </span>
                                            ))}
                                        </p>
                                    </div>
                                    <p className="max-w-[42ch] font-ui text-[12px] leading-relaxed opacity-80">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}