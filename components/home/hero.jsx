import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// Put these in /public/videos/
//   hero.webm         (VP9, ~2-4 MB)
//   hero.mp4          (H.264, ~3-5 MB)
//   hero-poster.jpg   (first frame of the video, ~100-200 KB)

export default function Hero() {
    return (
        <div
            // The poster image also sits behind the video as a fallback
            // (while loading, on data-saver, or when reduced-motion hides the video)
            className="relative overflow-hidden bg-black bg-cover bg-center sm:bg-left w-full sm:h-screen h-190 text-white flex items-end sm:px-12 sm:py-8 py-8 px-4"
            style={{ backgroundImage: "url('/videos/hero-poster.jpg')" }}
        >
            {/* Background video: centered on small screens, anchored left from sm and up */}
            <video
                className="absolute inset-0 h-full w-full object-cover object-center sm:object-left"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster="/videos/hero-poster.jpg"
                aria-hidden="true"
                disablePictureInPicture
            >
                <source src="/videos/hero.webm" type="video/webm" />
                <source src="/videos/hero.mp4" type="video/mp4" />
            </video>

            {/* Dark overlay so the white text stays readable */}
            {/* <div className="absolute inset-0 bg-black/40" /> */}

            <div className="relative z-10 flex flex-col gap-8">
                <div className="font-heading">
                    <h1 className="sm:text-5xl text-5xl mb-2">Orders at every table.</h1>
                    <h1 className="sm:text-4xl text-3xl text-white/80">Powered by one QR code</h1>
                </div>
                <p className="text-[12px] font-ui md:w-[40%] sm:w-[80%] w-full text-white/80">A digital menu and live ordering system for cafes. Customers scan, order and pay from their own phone, and your kitchen sees each order the moment it’s placed. No app to install, no menus to reprint.</p>
                <div className="flex gap-4 text-[12px] font-ui font-bold text-[12px] items-center">
                    <Link href='/' className="bg-white text-black pl-1 pr-4 py-1 rounded-full flex items-center gap-2 transition-all duration-500 ease-in-out hover:bg-black hover:text-white">
                        <ArrowRight size={30} strokeWidth={1.5} nonScalingStroke className="bg-black text-white p-2 rounded-full" />
                        Check our menu
                    </Link>
                    <Link href='/'>See our speciality</Link>
                </div>
            </div>
        </div>
    )
}
