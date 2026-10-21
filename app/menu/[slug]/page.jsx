// One category straight from a link, e.g. /menu/mocktails (the home page "See all" button goes here).
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import MenuItemsGallery from '@/components/menu/MenuItemsGallery'
import MenuSkeleton from '@/components/menu/MenuSkeleton'
import { getMenuGroups } from '@/lib/menuData'
import { selectionForCategory } from '@/lib/menuSelect'

async function CategoryContent({ params }) {
    const { slug } = await params
    const groups = await getMenuGroups()
    const initial = selectionForCategory(groups, slug)
    if (!initial) notFound()
    return <MenuItemsGallery groups={groups} initial={initial} />
}

export default function CategoryMenu({ params }) {
    return (
        <Suspense fallback={<MenuSkeleton />}>
            <CategoryContent params={params} />
        </Suspense>
    )
}