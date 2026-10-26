'use client';

import { useState } from 'react';
import Link from 'next/link';
import GlowCursor from './GlowCursor';
import FlyingTableware from './Flyingtableware';
import TableEntryModal from '@/components/nav/TableEntryModal';




const visitorLinks = [
    { label: 'Location & Hours', href: '/timing' },
    { label: 'Enter Table #', action: 'table' },
    { label: 'Menu', href: '/menu' },
];

const guestLinks = [
    { label: 'Location & Hours', href: '/timing' },
    { label: 'View Orders', href: '/yourOrder' },
    { label: 'Menu', href: '/menu' },
];
const adminLinks = [
    { label: 'Home', href: '/' },
    { label: 'Menu', href: '/menu' },
    { label: 'See Orders', href: '/admin/orders' },
    { label: 'Manage Menu', href: '/admin/menu' },
    { label: 'Location & Time', href: '#location' },
];

const staffLinks = [
    { label: 'Home', href: '/' },
    { label: 'Menu', href: '/menu' },
    { label: 'See Orders', href: '/admin/orders' },
    { label: 'Location & Time', href: '#location' },
];


export default function Footer({ initialSession = null, isGuest }) {
    const user = initialSession;
    const guest = Boolean(isGuest);
    const [tableFormOpen, setTableFormOpen] = useState(false);

    return (
        <>
        <div className="mt-[5rem]  text-white">
            {/* The glow cursor effect only runs inside this footer */}
            <GlowCursor
                color="#ffffff"
                intensity={1.3}
                trailWidth={3}
                linger={1.4}
                glow={0.8}
                clickBurst
                theme="dark"
            >
                <div className=" sm:px-12 px-4 py-8 relative flex min-h-[40rem] flex-col gap-10 md:min-h-[46rem]">
                    {/* Background: fills the whole footer, sits behind everything and never blocks clicks */}
                    <FlyingTableware respectReducedMotion={false} className="z-0 text-white" />

                    {/* Top row: brand + description on the left, links on the right */}
                    <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-start md:justify-between justify-center">
                        <div className="md:max-w-[20rem] select-none md:text-left text-center">
                            <p className="font-logo text-[17px]">Palate &amp; Plume</p>
                            <p className="mt-3 font-ui md:text-[13px] text-[12px] leading-relaxed text-white/70">
                                Rare seasonal ingredients, dry-aged in-house and finished over
                                white oak charcoal. Order from your table and enjoy it at your
                                own pace.
                            </p>
                        </div>

                        <div aria-label="Footer navigation">
                            <div className="flex md:flex-row flex-col items-center gap-x-6 gap-y-2 font-ui text-[14px]">
                                {(user?.role === 'admin'
    ? adminLinks
    : user?.role === 'staff'
        ? staffLinks
        : guest
            ? guestLinks
            : visitorLinks).map((link) =>
                // "Enter Table #" has no page: it opens the little form instead
                link.action === 'table' ? (
                    <button
                        key={link.label}
                        type="button"
                        onClick={() => setTableFormOpen(true)}
                        className="cursor-pointer transition-colors duration-300 hover:text-white/50"
                    >
                        {link.label}
                    </button>
                ) : (
                    <Link
                        key={link.label}
                        href={link.href}
                        className="transition-colors duration-300 hover:text-white/50"
                    >
                        {link.label}
                    </Link>
                )
            )}
                            </div>
                        </div>
                    </div>

                    {/* Big name in the middle, on two lines so the flying items have room on both sides */}
                    <div className="relative z-10 flex flex-1 items-center justify-center">
                        <h2 className="text-center font-heading uppercase leading-[0.85] text-[18vw] md:text-[length:min(12vw,15rem)] select-none">
                            <span className="block">Palate &amp;</span>
                            <span className="block">Plume</span>
                        </h2>
                    </div>

                    {/* Bottom bar */}
                    <div className="relative z-10 mx-auto flex w-full max-w-[50rem] flex-col items-center justify-between gap-1 rounded-3xl bg-[#ebe9e7] md:px-6 px-2 py-4 text-center font-ui md:text-[13px] text-[11px] text-[#16161A] font-medium sm:flex-row sm:rounded-full sm:text-left">
                        <p>&copy;2026 Palate &amp; Plume. All Rights Reserved.</p>
                        <p>Created by <Link href="https://lark-heaven.vercel.app/" target="_blank" rel="noopener noreferrer" className="underline">
                            LarkHeaven
                        </Link></p>
                    </div>
                </div>
            </GlowCursor>
        </div>

            {/* Outside the glow area, so nothing around it can move or clip the form */}
            <TableEntryModal open={tableFormOpen} onClose={() => setTableFormOpen(false)} />
        
        </>
      
    );
}