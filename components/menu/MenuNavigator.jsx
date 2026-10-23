'use client'

import Link from 'next/link'
import { X, ShoppingCart } from 'lucide-react'
import { useCart } from '@/lib/cartStore';


// Top-right buttons: close, and one dropdown per type (Food, Drink).
//   groups   = the menu groups from the server
//   value    = { type, slug } the current selection
//   onSelect = called with (type, slug) when the visitor picks something
export default function MenuNavigator({ groups = [], value, onSelect }) {
    const { count: cartCount } = useCart();

    return (
        <div className="absolute top-5 right-5 z-21 flex flex-col items-end gap-3">
            <div className="flex flex-row gap-2">
                <Link
                    href="/cart"
                    aria-label="Close the menu"
                    className="relative flex cursor-pointer shrink-0 items-center justify-center border border-[#26262E] rounded-full p-2"
                >
                    <ShoppingCart
                        size={20}
                        strokeWidth={1.75}
                        className="nonScalingStroke text-white"
                    />
                    {cartCount > 0 && (
                        <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-semibold leading-none text-black">
                            {cartCount}
                        </span>
                    )}
                </Link>
                
                <Link
                    href="/"
                    aria-label="Close the menu"
                    className="relative flex cursor-pointer shrink-0 items-center justify-center border border-[#26262E] rounded-full p-2"
                >
                    <X size={20} strokeWidth={1.75} nonScalingStroke className="text-white" />
                </Link>

            </div>

            {groups.map((group) => {
                const isActive = value?.type === group.key
                return (
                    <select
                        key={group.key}
                        name={group.key}
                        aria-label={`${group.label} categories`}
                        // Only the active type shows a category. The other one shows its own name.
                        value={isActive ? value.slug : ''}
                        onChange={(e) => onSelect(group.key, e.target.value)}
                        className={`relative w-32 cursor-pointer text-center appearance-none border rounded-full px-4 py-2 bg-transparent text-white outline-none transition-colors duration-300 ${isActive ? 'border-white/60' : 'border-[#26262E]'}`}
                    >
                        <option value="" disabled hidden className="bg-[#0A0A0C]">
                            {group.label}
                        </option>
                        <option value="all" className="bg-[#0A0A0C]">
                            All {group.label}
                        </option>
                        {group.categories.map((c) => (
                            <option key={c.id} value={c.slug} className="bg-[#0A0A0C]">
                                {c.name}
                            </option>
                        ))}
                    </select>
                )
            })}
        </div>
    )
}