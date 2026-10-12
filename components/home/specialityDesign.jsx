import Specialties from "@/components/home/Specialties"

export default function SpecialityDesign() {
    return (
        <div className="text-white mt-[5rem] sm:px-12 px-4 py-8 flex flex-col gap-15">
            <div className="flex gap-4 flex-row items-center">
                <span className="w-2 h-2 bg-white"></span>
                <p className="font-ui text-[12px] tracking-[5px] uppercase">THE PALATE EXPERIENCE</p>
            </div>

            <Specialties />
        </div>
    )
}