import { Suspense } from 'react'
import MenuItemsGallery from '@/components/menu/MenuItemsGallery'
import MenuSkeleton from '@/components/menu/MenuSkeleton'
import { getMenuGroups } from '@/lib/menuData'

async function MenuContent() {
    const groups = await getMenuGroups()
    return <MenuItemsGallery groups={groups} />
}

export default function Menu() {
    return (
        <Suspense fallback={<MenuSkeleton />}>
            <MenuContent />
        </Suspense>
    )
}