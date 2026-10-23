import { Suspense } from 'react'
import MenuItemsGallery from '@/components/menu/MenuItemsGallery'
import MenuSkeleton from '@/components/menu/MenuSkeleton'
import { getMenuGroups } from '@/lib/menuData'
import { getSession } from "@/lib/auth";

async function MenuContent() {
    const [groups, session] = await Promise.all([getMenuGroups(), getSession()])
    return <MenuItemsGallery groups={groups} canOrder={!session} />
}

export default function Menu() {
    return (
        <Suspense fallback={<MenuSkeleton />}>
            <MenuContent />
        </Suspense>
    )
}