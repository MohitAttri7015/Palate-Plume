import Ferrofluid from "@/components/auth/Ferrofluid";
import PauseWhenHidden from "@/components/PauseWhenHidden"
import LoginForm from "@/components/auth/LoginForm";

export default function Login() {
    return (
        <main className="relative min-h-screen overflow-hidden bg-[#0A0A0C]">
            {/* Background */}
            <div className="absolute inset-0 z-0">
                <PauseWhenHidden>
                    <Ferrofluid
                        colors={["#ffffff", "#ffffff", "#ffffff"]}
                        speed={0.5}
                        scale={1.6}
                        turbulence={1}
                        fluidity={0.1}
                        rimWidth={0.2}
                        sharpness={2.5}
                        shimmer={1.5}
                        glow={2}
                        flowDirection="down"
                        opacity={1}
                        mouseInteraction
                        mouseStrength={1}
                        mouseRadius={0.35}
                    />
                </PauseWhenHidden>
            </div>


            {/* Login content */}
            <div className="relative z-20 flex min-h-screen flex-col items-center justify-center px-4 font-main">
                <h1 className="mb-2 text-2xl font-bold text-white">
                    Login (Admin & Staff)
                </h1>

                <p className="mb-8 text-center text-sm text-white/70">
                    Login with you username and password.
                </p>

                <LoginForm />

            </div>
        </main>
    );
}