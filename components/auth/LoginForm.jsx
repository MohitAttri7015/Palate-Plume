"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginForm() {
    const router = useRouter();
    const passwordRef = useRef(null);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    // isPending stays true while the redirect is in progress and turns false by itself when it
    // finishes, so the form can never get stuck on "Signing in..." if Next.js keeps this page in memory.
    const [isPending, startTransition] = useTransition();
    const loading = submitting || isPending;

    // After a failed login, put the cursor back in the password box.
    // (This must wait until the form is enabled again, so it runs after the re-render.)
    useEffect(() => {
        if (error && !loading) passwordRef.current?.focus();
    }, [error, loading]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (loading) return; // stops double clicks
        setError("");
        setSubmitting(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username.trim(), password }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data.error || "Login failed. Please try again.");
                setPassword(""); // clear the password, keep the username
                setSubmitting(false);
                return;
            }

            // Success: the server has set the session cookie. Go to the right screen.
            setPassword(""); // don't keep the password in memory after a successful login
            setSubmitting(false);
            startTransition(() => {
                router.replace(data.redirectTo || "/");
                router.refresh();
            });
        } catch {
            setError("Can't reach the server. Check your internet connection and try again.");
            setSubmitting(false);
        }
    }

    const inputClass =
        "w-full rounded-lg border border-[#333] bg-transparent px-4 py-3 text-sm text-[#ccc] outline-none transition-colors focus:border-white/50 disabled:opacity-60";

    return (
        <>
            <form onSubmit={handleSubmit} className="flex flex-col items-center w-full max-w-xs font-ui">
                <div className="flex flex-col gap-4 font-ui text-white w-full mb-6">
                    <label htmlFor="name" className="text-sm">Enter username</label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        maxLength={50}
                        required
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? "login-error" : undefined}
                        className={inputClass}
                    />
                </div>

                <div className="flex flex-col gap-4 font-ui text-white w-full mb-6">
                    <label htmlFor="password" className="text-sm">Enter password</label>
                    <div className="relative">
                        <input
                            ref={passwordRef}
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            maxLength={50}
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            aria-invalid={error ? true : undefined}
                            aria-describedby={error ? "login-error" : undefined}
                            className={inputClass + " pr-16"}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-xs text-white/50 hover:text-white"
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>
                </div>

                {/* Error message: read out by screen readers too */}
                <div aria-live="polite" className="w-full">
                    {error && (
                        <p
                            id="login-error"
                            role="alert"
                            className="mb-6 w-full rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                        >
                            {error}
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-full border border-white py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {loading ? "Signing in..." : "Login"}
                </button>
            </form>
            <Link href="/" className={`pr-2 mt-4 text-sm text-white/70 hover:text-white font-ui w-full max-w-xs text-right ${loading ? "pointer-events-none" : ""}`}>
                Go Back
            </Link>
        </>
    );
}