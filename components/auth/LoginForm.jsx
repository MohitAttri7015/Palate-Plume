"use client";
import Link from "next/link";

export default function LoginForm() {
    return (
        <>
            <form action='' className="flex flex-col items-center w-full max-w-xs font-ui">
                <div className="flex flex-col gap-4 font-ui text-white w-full max-w-s mb-6">
                    <label htmlFor="name" className="text-sm">Enter username</label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        maxLength={50}
                        required
                        className="border border-[#333] rounded-lg px-4 py-3 text-sm text-[#ccc]"
                    />
                </div>

                <div className="flex flex-col gap-4 font-ui text-white w-full max-w-s mb-6">
                    <label htmlFor="password" className="text-sm">Enter password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        maxLength={50}
                        required
                        className="border border-[#333] rounded-lg px-4 py-3 text-sm text-[#ccc]"
                    />
                </div>

                <button
                    type="submit"
                    className="flex w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-full border border-white py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-70"
                >
                    Login
                </button>
            </form>
            <Link href="/" className=" pr-2 mt-4 text-sm text-white/70 hover:text-white font-ui w-full max-w-xs text-right">
                Go Back
            </Link>
        </>
    );
}