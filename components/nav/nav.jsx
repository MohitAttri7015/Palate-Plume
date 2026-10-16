'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Plus, UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';
import '@/app/globals.css'
import Image from 'next/image';

const userLinks = [
    { label: 'Location & Hours', href: '/timing' },
    { label: 'Enter Table #', href: '#table' },
    { label: 'Menu', href: '/menu' },
];

const adminLinks = [
    { label: 'Location & Hours', href: '/timing' },
    { label: 'See Orders', href: '/admin/orders' },
    { label: 'Menu', href: '/menu' },
];

export default function Nav({ initialSession = null }) {
    const [isOpen, setIsOpen] = useState(false);
    const [user] = useState(initialSession);

    useEffect(() => {
        if (!isOpen) return;

        const html = document.documentElement;
        const body = document.body;
        const previousHtmlOverflow = html.style.overflow;
        const previousBodyOverflow = body.style.overflow;

        // 1) Native scrolling: lock BOTH html and body. If html has its own overflow
        //    rule (e.g. overflow-x: hidden in globals.css), locking only body does nothing.
        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';

        // 2) Smooth-scroll libraries (Lenis etc.) move the page with JavaScript, so
        //    overflow:hidden does not stop them. Catch wheel/touch first and cancel it
        //    before the library ever sees it.
        const blockScroll = (event) => {
            event.preventDefault();
            event.stopPropagation();
        };
        const blockOptions = { passive: false, capture: true };
        window.addEventListener('wheel', blockScroll, blockOptions);
        window.addEventListener('touchmove', blockScroll, blockOptions);

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            html.style.overflow = previousHtmlOverflow;
            body.style.overflow = previousBodyOverflow;
            window.removeEventListener('wheel', blockScroll, blockOptions);
            window.removeEventListener('touchmove', blockScroll, blockOptions);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    return (
        <>
            {/* Blurred background */}
            <div
                aria-hidden="true"
                onClick={() => setIsOpen(false)}
                className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-md
          transition-opacity duration-700 ease-in-out
          ${isOpen
                        ? 'visible opacity-100'
                        : 'invisible pointer-events-none opacity-0'
                    }`}
            />

            {/* Navbar */}
            <nav
                className={`fixed left-1/2 top-5 z-50
          -translate-x-1/2 overflow-hidden
          border border-[#26262E]
          shadow-[0_4px_30px_rgba(0,0,0,0.04)]
          transition-[width,height,border-radius,top]
          duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${isOpen
                        ? 'top-5 h-[min(440px,calc(100dvh-40px))] md:w-[700px] w-[min(950px,calc(100vw-40px))] rounded-xl  sm:h-[400px]'
                        : 'h-[60px] sm:w-[330px] mobile:w-[350px] w-[300px] rounded-xl'
                    }`}
                aria-label="Main navigation"
            >
                {/* Header */}
                <div className="relative flex h-[60px] shrink-0 items-center justify-between p-4 text-white">
                    {/* Cart icon */}
                    <Link
                        aria-label={user?.role === 'admin' ? 'Add new item' : user?.role === 'staff' ? 'Staff tools' : 'View cart'}
                        href={user?.role === 'admin' ? '/admin/menu/new' : user?.role === 'staff' ? '/admin/orders' : '/cart'}
                        className="group flex h-10 w-10 shrink-0 items-center justify-center"
                    >
                        {user?.role === 'admin' ? (
                            <Plus
                                size={20}
                                strokeWidth={2}
                                className="transition-transform duration-300 group-hover:scale-110"
                            />
                        ) : user?.role === 'staff' ? (
                            <UtensilsCrossed
                                size={20}
                                strokeWidth={2}
                                className="transition-transform duration-300 group-hover:scale-110"
                            />
                        ) : (
                            <ShoppingCart
                                size={20}
                                strokeWidth={2}
                                className="cart-icon transition-transform duration-300 group-hover:scale-110"
                            />
                        )}
                    </Link>

                    {/* Center brand */}
                    <Link
                        href="/"
                        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap mobile:text-[17px] text-[15px] font-logo"
                    >
                        Palate &amp; Plume
                    </Link>

                    {/* Animated hamburger / close */}
                    <button
                        type="button"
                        onClick={() => setIsOpen((previous) => !previous)}
                        aria-label={isOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isOpen}
                        className="relative flex h-4 cursor-pointer w-8 shrink-0 items-center justify-center"
                    >
                        <span
                            className={`absolute h-[1.4px] w-[24px] rounded-full bg-current
                transition-transform duration-500 ease-in-out
                ${isOpen ? 'rotate-45' : '-translate-y-[5px]'}`}
                        />
                        <span
                            className={`absolute h-[1.6px] w-[30px] rounded-full bg-current
                transition-transform duration-500 ease-in-out
                ${isOpen ? '-rotate-45' : 'translate-y-[5px]'}`}
                        />
                    </button>
                </div>

                {/* Expandable content */}
                <div
                    className={`flex h-[calc(100%-72px)] md:gap-0 gap-4 flex-col justify-between text-white font-ui
            px-6 pb-0 pt-5 transition-all duration-500
            sm:px-8 sm:pb-5
            ${isOpen
                            ? 'translate-y-0 opacity-100 delay-150'
                            : 'pointer-events-none translate-y-4 opacity-0'
                        }`}
                    aria-hidden={!isOpen}
                    inert={!isOpen}
                >

                    <div className="flex md:flex-row flex-col md:justify-between w-full md:h-50 h-full">
                        <div className="flex min-h-0 flex-1 flex-col gap-1">
                            {(user?.role === 'admin' || user?.role === 'staff' ? adminLinks : userLinks).map((link, index) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    style={{ transitionDelay: isOpen ? `${index * 70}ms` : '0ms' }}
                                    className="group flex w-fit items-center py-1
        md:text-[clamp(23px,4vw,1px)] text-[clamp(18px,4vw,1px)] 
        tracking-[-1px] transition-all duration-300
        hover:translate-x-2 hover:text-white/50"
                                >
                                    <span>{link.label}</span>
                                </a>
                            ))}
                        </div>
                        <div className="flex-1 relative overflow-hidden rounded-lg">
                            {/* implement image */}
                            <Image
                                src="https://images.unsplash.com/photo-1790997926190-7b39077093d4?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
                                alt="Food"
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex text-white/80 font-ui flex-wrap items-end justify-between gap-x-4  text-[11px] tracking-wide  sm:text-sm">
                        <span>Palate &amp; Plume</span>
                        <span>Good food. Good company.</span>
                    </div>
                </div>
            </nav>
        </>
    );
}