'use client';

import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import { ShoppingBasket } from 'lucide-react';

// Neutral grey block shown if an image fails to load (no network needed)
const FALLBACK_IMG =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1000'><rect width='100%' height='100%' fill='%23d9d6d2'/></svg>";

// Card widths: header card and product cards share the same width
const CARD_WIDTH = 'w-[70vw] sm:w-[44vw] md:w-[32vw] lg:w-[25vw] xl:w-[22vw]';

// CARD HEIGHT: change it here, it applies to the header card AND every product card.
// Responsive example: 'h-[24rem] sm:h-[30rem] lg:h-[36rem]'
const CARD_HEIGHT = 'mobile:h-[30rem] h-[25rem] lg:h-[34rem]';

// Tells next/image how wide each card really is, so it doesn't download oversized images.
// Keep in sync with CARD_WIDTH.
const IMG_SIZES = '(min-width:1280px) 22vw, (min-width:1024px) 25vw, (min-width:768px) 32vw, (min-width:640px) 44vw, 78vw';

const formatPrice = (price, currency) =>
    typeof price === 'number' ? `${currency}${price.toLocaleString('en-IN')}` : price;

const handleImgError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = FALLBACK_IMG;
};

// If the hover image is broken, just hide it so the main image stays visible
const handleHoverImgError = (e) => {
    e.currentTarget.style.display = 'none';
};


export default function CustomSlider({
    headerImage,
    headerTitle,
    headerButtonText = 'VIEW ALL',
    headerButtonLink = '/',
    products = [],
    currency = '₹',
    options = {},
    className = '',
}) {
    // dragFree = momentum glide after you let go (set dragFree: false to snap card by card)
    const [emblaRef] = useEmblaCarousel({
        align: 'start',
        dragFree: true,
        containScroll: 'trimSnaps',
        ...options,
    });

    return (
        <div className={className}>
            {/* -mx / px values match a parent with px-4 (mobile) and px-12 (sm+).
                Change them if your parent padding is different. */}
            <div
                ref={emblaRef}
                className="-mx-4 cursor-grab select-none overflow-hidden active:cursor-grabbing sm:-mx-12 [&_a]:cursor-[inherit]"
            >
                <ul
                    role="list"
                    aria-label="Product slider"
                    className="flex touch-pan-y touch-pinch-zoom gap-1 px-4 sm:px-12"
                >
                    {/* Header card */}
                    <li
                        className={`relative flex shrink-0 grow-0 items-center justify-center overflow-hidden bg-neutral-800 ${CARD_HEIGHT} ${CARD_WIDTH}`}
                    >
                        {headerImage && (
                            <Image
                                fill
                                sizes={IMG_SIZES}
                                src={headerImage}
                                alt=""
                                draggable={false}
                                decoding="async"
                                onError={handleImgError}
                                className="absolute inset-0 h-full w-full object-cover"
                            />
                        )}
                        <div className="absolute inset-0 bg-black/25" />

                        <div className="relative z-10 flex flex-col items-center gap-10 px-6 text-center">
                            <h2 className="font-heading text-3xl uppercase leading-[1.05] text-white sm:text-4xl">
                                {headerTitle}
                            </h2>
                            <Link
                                href={headerButtonLink}
                                draggable={false}
                                className="bg-white px-14 py-4 font-ui text-[12px] uppercase tracking-[2px] text-black transition-all duration-500 ease-in-out hover:bg-black hover:text-white"
                            >
                                {headerButtonText}
                            </Link>
                        </div>
                    </li>

                    {/* Product cards */}
                    {products.map((product) => (
                        <li
                            key={product.id}
                            className={`shrink-0 grow-0 bg-[#16161A] text-white ${CARD_HEIGHT} ${CARD_WIDTH}`}
                        >
                            <div
                                draggable={false}
                                className="group block h-full relative overflow-hidden"
                            >
                                <div className="flex items-start justify-between gap-3 p-4 relative z-2">
                                    <div className="font-ui text-[12px]">
                                        <p className="uppercase tracking-wide">{product.name}</p>
                                        <p className="mt-1 text-white/80">
                                            {formatPrice(product.price, currency)}
                                        </p>
                                    </div>
                                </div>

                                {/* Main image stays put; hover image fades in on top (no dip in between) */}
                                <div className="absolute inset-0">
                                    <Image
                                        src={product.image}
                                        alt={product.name}
                                        fill
                                        sizes={IMG_SIZES}
                                        draggable={false}
                                        decoding="async"
                                        onError={handleImgError}
                                        className="absolute inset-0 h-full w-full object-cover"
                                    />
                                    {product.hoverImage && (
                                        <Image
                                            src={product.hoverImage}
                                            fill
                                            sizes={IMG_SIZES}
                                            alt=""
                                            aria-hidden="true"
                                            draggable={false}
                                            decoding="async"
                                            onError={handleHoverImgError}
                                            className="absolute inset-0 h-full w-full scale-0 object-cover opacity-0 will-change-[opacity,transform] transition-all duration-400 ease-out group-hover:scale-110 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 motion-reduce:scale-100"
                                        />
                                    )}

                                    {/* 768px and up (md): text button, shown on hover */}
                                    <button
                                        type="button"
                                        draggable={false}
                                        className="hidden md:block bg-white cursor-pointer w-[90%] text-center py-3 font-ui text-[12px] font-medium uppercase tracking-[1px] text-black transition-all duration-500 ease-in-out hover:bg-black hover:text-white absolute bottom-4 left-1/2 z-10 -translate-x-1/2 opacity-0 group-hover:opacity-100"
                                    >
                                        ADD TO CART
                                    </button>

                                    {/* Below 768px: always-visible basket icon, bottom right (no hover on phones) */}
                                    <button
                                        type="button"
                                        draggable={false}
                                        aria-label={`Add ${product.name} to cart`}
                                        className="md:hidden absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
                                    >
                                        <ShoppingBasket size={20} strokeWidth={1.5} />
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}