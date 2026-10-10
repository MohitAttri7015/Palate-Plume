'use client';

import { ReactLenis } from 'lenis/react';

export default function SmoothScroll({ children }) {
    return (
        <ReactLenis
            root
            options={{
                lerp: 0.05,        
                smoothWheel: true,
                wheelMultiplier: 1,
            }}
        >
            {children}
        </ReactLenis>
    );
}