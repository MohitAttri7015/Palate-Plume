import Link from 'next/link'
import { X } from 'lucide-react'

export default function MenuNavigator() {
    return (
        <>
            <div className="absolute top-5 right-5 z-21 flex flex-col items-end gap-3">
                <Link
                    href="/"
                    className="relative flex cursor-pointer shrink-0 items-center justify-center border border-[#26262E] rounded-full p-2"
                >
                    <X size={20} strokeWidth={1.75} nonScalingStroke className="text-white" />
                </Link>

                <select
                    name="food"
                    defaultValue=""
                    className="relative w-28 cursor-pointer text-center  appearance-none border border-[#26262E] rounded-full px-4 py-2 bg-transparent text-white outline-none"
                >
                    <option value="" disabled className="bg-[#0A0A0C]">
                        Food
                    </option>
                    <option value="starters" className="bg-[#0A0A0C]">Starters</option>
                    <option value="main-course" className="bg-[#0A0A0C]">Main Course</option>
                    <option value="desserts" className="bg-[#0A0A0C]">Desserts</option>
                </select>

                <select
                    name="drink"
                    defaultValue=""
                    className="relative w-28 cursor-pointer text-center appearance-none border border-[#26262E] rounded-full px-4 py-2 bg-transparent text-white outline-none"
                >
                    <option value="" disabled className="bg-[#0A0A0C]">
                        Drink
                    </option>
                    <option value="coffee" className="bg-[#0A0A0C]">Coffee</option>
                    <option value="tea" className="bg-[#0A0A0C]">Tea</option>
                    <option value="juices" className="bg-[#0A0A0C]">Juices</option>
                </select>
            </div>
        </>
    )
}