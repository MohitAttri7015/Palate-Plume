"use client";

import { useEffect, useState } from "react";

export default function PauseWhenHidden({ children }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const handleVisibility = () => setVisible(!document.hidden);
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, []);

    return visible ? children : null;
}