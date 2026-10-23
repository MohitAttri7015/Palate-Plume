'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ShoppingBasket } from 'lucide-react';
import { useCart } from '@/lib/cartStore';


const formatPrice = (price, currency) =>
    typeof price === 'number' ? `${currency}${price.toLocaleString('en-IN')}` : price;

const EMBLA_OPTIONS = { align: 'start', dragFree: true, containScroll: 'trimSnaps' };

/* ───────── Items slider (remounts when the category changes, then fades in) ───────── */
function ItemsSlider({ category, currency, canOrder }) {
    const { add } = useCart();
    const [emblaRef] = useEmblaCarousel(EMBLA_OPTIONS);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const id = setTimeout(() => setShown(true), 30);
        return () => clearTimeout(id);
    }, []);

  

    return (
        <div
            ref={emblaRef}
            className={`-mx-4 cursor-grab select-none overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] active:cursor-grabbing sm:-mx-12 [&_button]:cursor-pointer ${shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
        >
            <ul role="list" className="flex touch-pan-y touch-pinch-zoom gap-2 px-4 sm:px-12">
                {category.items.map((item) => (
                    <li
                        key={item.id}
                        className="w-[72vw] shrink-0 grow-0 sm:w-[40vw] md:w-[30vw] lg:w-[23vw]"
                    >
                        <div className="group relative aspect-4/5 overflow-hidden bg-[#16161A] p-12">
                            {/* Items have no image of their own yet, so they use the category photo.
                                Add an `image` field to an item to override it. */}
                            <Image
                                src={item.image ?? category.image}
                                alt={item.name}
                                fill
                                sizes="(min-width:1024px) 23vw, (min-width:768px) 30vw, (min-width:640px) 40vw, 72vw"
                                draggable={false}
                                className="relative! object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                            />
                        </div>

                        <div className="mt-4 font-ui">
                            <h3 className="font-heading text-[15px] leading-snug">{item.name}</h3>
                            <p className="mt-1 text-[12px] italic text-white/50">{item.category}</p>

                            <div className="mt-3 flex items-center justify-between">
                                <span className="text-[13px]">{formatPrice(item.price, currency)}</span>
                                <button
                                    type="button"
                                    draggable={false}
                                    aria-label={`Add ${item.name} to cart`}
                                    onClick={() => add(item.id)}
                                    className="flex h-9 w-9  border border-white/20  items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
                                >
                                    <ShoppingBasket size={20} strokeWidth={1.5} />
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* ───────── Main section ───────── */
export default function CategorySection({
    categories = [],
    heading = 'Category',
    basePath = '/menu',
    currency = '₹',
    canOrder = true
}) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [emblaRef] = useEmblaCarousel(EMBLA_OPTIONS);   

    if (!categories.length) return null;

    const active = categories[activeIndex];
    const count = active.items.length;

    const select = (i) => setActiveIndex(i);   

    return (
        <section className="flex flex-col gap-10">
            {/* Heading + category slider (stacked on small screens) */}
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between ">
                <h2 className="font-heading text-6xl leading-none sm:text-7xl md:text-8xl">
                    {heading}
                </h2>

                <div className="min-w-0 md:w-[60%]">
                    {/* Bleeds to the screen edge: both sides on mobile, right side only from md up */}
                    <div
                        ref={emblaRef}
                        className="-mx-4 cursor-grab select-none overflow-hidden active:cursor-grabbing sm:-mx-12 md:mx-0 md:-mr-12 [&_button]:cursor-[inherit]"
                    >
                        {/* pt-4 leaves room for the selected tile to move up without being clipped */}
                        <ul
                            role="list"
                            aria-label="Categories"
                            className="flex touch-pan-y touch-pinch-zoom gap-2 px-4 pt-4 sm:px-12 md:px-0 md:pr-12"
                        >
                            {categories.map((cat, i) => {
                                const isActive = i === activeIndex;
                                return (
                                    <li key={`${cat.slug}-${i}`} className={`shrink-0 grow-0 ${i === 0 ? 'ml-auto' : ''}`}>
                                        <button
                                            type="button"
                                            onClick={() => select(i)}
                                            aria-pressed={isActive}
                                            className={`block w-36 p-4 text-left transition-all bg-[#16161A]  duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-40 ${isActive
                                                    ? '-translate-y-3'
                                                    : ''
                                                }`}
                                        >
                                            <div className="relative aspect-[4/5] overflow-hidden">
                                                <Image
                                                    src={cat.image}
                                                    alt=""
                                                    fill
                                                    sizes="160px"
                                                    draggable={false}
                                                    className={`object-cover transition-opacity duration-500 *: ${isActive ? 'opacity-100' : 'opacity-60'
                                                        }`}
                                                />

                                                {/* Fog: solid #16161A at the bottom, fading to clear toward the top */}
                                                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,#16161A_0%,#16161Acc_20%,#16161A00_100%)]" />
                                            </div>
                                            <span
                                                className={`mt-3 block font-ui text-[12px] leading-snug transition-colors duration-500 ${isActive ? 'text-white' : 'text-white/60'
                                                    }`}
                                            >
                                                {cat.name}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            </div>

            {/* See all + item count */}
            <div className="flex items-center justify-between font-ui text-[12px]">
                <Link
                    href={`${basePath}/${active.slug}`}
                    className="border-b border-white pb-0.5 tracking-wide"
                >
                    See all
                </Link>
                <p aria-live="polite" className="text-white/50">
                    {count} {count === 1 ? 'Item' : 'Items'}
                </p>
            </div>

            {/* Items of the selected category */}
            <ItemsSlider key={active.slug} category={active} currency={currency} canOrder={canOrder} />
        </section>
    );
}