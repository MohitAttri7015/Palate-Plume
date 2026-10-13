'use client';

import { useEffect, useRef } from 'react';

/* ───────── Settings you can tweak ───────── */
const CONFIG = {
    gravity: 900, // px/s². Higher = items fall faster
    spawnEvery: [0.5, 1.0], // seconds between throws on desktop (min, max)
    spawnEveryMobile: [0.9, 1.6], // same, for screens under 640px
    maxItems: 12, // max flying items at once on desktop
    maxItemsMobile: 6,
    lineWidth: 1.6, // thickness of the outline in px
    itemAlpha: 0.75, // 0 to 1
};

const TAU = Math.PI * 2;
const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Shortest distance from a point to a line segment (so fast mouse moves can't skip over an item)
const distToSegment = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1) : 0;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

// Line-art shapes. cx/cy = center of the drawing, scale = base size, radius = hit area.
const makeShapes = () => {
    const plate = new Path2D();
    plate.arc(0, 0, 50, 0, TAU);
    plate.moveTo(34, 0);
    plate.arc(0, 0, 34, 0, TAU);

    return {
        fork: {
            path: new Path2D(
                'M10 130V8A8 8 0 0 1 26 8V120H38V8A8 8 0 0 1 54 8V120H66V8A8 8 0 0 1 82 8V120H94V8A8 8 0 0 1 110 8V150C110 186 68 186 68 218L76 430Q76 480 60 480Q44 480 44 430L52 218C52 186 10 186 10 150Z'
            ),
            cx: 60,
            cy: 240,
            scale: 0.27,
            radius: 55,
        },
        glass: {
            path: new Path2D(
                'M20 10H80C84 60 74 98 50 104C26 98 16 60 20 10ZM23 36C40 42 60 42 77 36M50 104V172M28 192H72C66 180 56 176 50 176C44 176 34 180 28 192Z'
            ),
            cx: 50,
            cy: 100,
            scale: 0.6,
            radius: 50,
        },
        plate: { path: plate, cx: 0, cy: 0, scale: 1, radius: 50 },
    };
};

const TYPES = ['fork', 'glass', 'plate'];

export default function FlyingTableware({
    className = '',
    respectReducedMotion = true, // set to false to always run the effect
}) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return undefined;

        const reduce =
            respectReducedMotion &&
            (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
        if (reduce) return undefined;

        const shapes = makeShapes();
        const color = getComputedStyle(canvas).color; // same color as the surrounding text

        let W = 1;
        let H = 1;
        let dpr = 1;
        let s = 1; // size factor
        let g = CONFIG.gravity;
        let raf = 0;
        let last = 0;
        let alive = true;
        let visible = true;
        let spawnIn = 0.3;

        const items = [];
        const shards = [];
        const rings = [];
        const pointer = { x: 0, y: 0, has: false };

        const resize = () => {
            W = Math.max(1, canvas.clientWidth);
            H = Math.max(1, canvas.clientHeight);
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            s = clamp(W / 1400, 0.55, 1.15);
            g = CONFIG.gravity * clamp(H / 700, 0.7, 1.3);
        };

        const spawn = () => {
            const type = TYPES[Math.floor(Math.random() * TYPES.length)];
            const margin = 90 * s;
            const x = rand(W * 0.04, W * 0.96);
            const apex = rand(0.45, 0.95) * H; // how high it flies
            items.push({
                type,
                x,
                y: H + margin,
                vx: (W / 2 - x) * rand(0.04, 0.2) + rand(-50, 50),
                vy: -Math.sqrt(2 * g * (apex + margin)),
                angle: rand(0, TAU),
                spin: rand(-4, 4) * (type === 'plate' ? 0.5 : 1),
                phase: rand(0, TAU),
                tilt: rand(2, 4),
            });
        };

        // Break an item into flying shards plus a quick ring flash
        const shatter = (item, hx, hy) => {
            const shape = shapes[item.type];
            const r = shape.radius * s;
            const away = Math.atan2(item.y - hy, item.x - hx);
            const count = item.type === 'fork' ? 7 : 12;
            for (let i = 0; i < count && shards.length < 220; i++) {
                const angle = away + rand(-1.4, 1.4);
                const speed = rand(120, 420);
                shards.push({
                    x: item.x + rand(-1, 1) * r * 0.5,
                    y: item.y + rand(-1, 1) * r * 0.5,
                    vx: item.vx * 0.5 + Math.cos(angle) * speed,
                    vy: item.vy * 0.4 + Math.sin(angle) * speed - 80,
                    size: rand(5, 13) * s,
                    rot: rand(0, TAU),
                    spin: rand(-9, 9),
                    age: 0,
                    life: rand(0.9, 1.6),
                });
            }
            rings.push({ x: item.x, y: item.y, age: 0, life: 0.35 });
        };

        const hitTest = (ax, ay, bx, by, extra) => {
            for (let i = items.length - 1; i >= 0; i--) {
                const it = items[i];
                const reach = shapes[it.type].radius * s + extra;
                if (distToSegment(it.x, it.y, ax, ay, bx, by) <= reach) {
                    items.splice(i, 1);
                    shatter(it, bx, by);
                }
            }
        };

        const draw = () => {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, H);
            ctx.strokeStyle = color;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            // Flying items
            ctx.globalAlpha = CONFIG.itemAlpha;
            for (const it of items) {
                const shape = shapes[it.type];
                const sc = shape.scale * s;
                ctx.save();
                ctx.translate(it.x, it.y);
                ctx.rotate(it.angle);
                // Plates squash back and forth so they look like they're flipping through the air
                const squash = it.type === 'plate' ? 0.3 + 0.7 * Math.abs(Math.cos(it.phase)) : 1;
                ctx.scale(sc, sc * squash);
                ctx.translate(-shape.cx, -shape.cy);
                ctx.lineWidth = CONFIG.lineWidth / sc;
                ctx.stroke(shape.path);
                ctx.restore();
            }

            // Shards
            ctx.lineWidth = 1.2;
            for (const sh of shards) {
                ctx.globalAlpha = Math.max(0, 1 - sh.age / sh.life) * 0.85;
                ctx.save();
                ctx.translate(sh.x, sh.y);
                ctx.rotate(sh.rot);
                ctx.beginPath();
                ctx.moveTo(0, -sh.size);
                ctx.lineTo(sh.size * 0.55, sh.size * 0.6);
                ctx.lineTo(-sh.size * 0.55, sh.size * 0.6);
                ctx.closePath();
                ctx.stroke();
                ctx.restore();
            }

            // Impact rings
            for (const ring of rings) {
                const t = ring.age / ring.life;
                ctx.globalAlpha = (1 - t) * 0.5;
                ctx.beginPath();
                ctx.arc(ring.x, ring.y, t * 70 * s, 0, TAU);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        };

        const frame = (now) => {
            raf = 0;
            if (!alive || !visible || document.hidden) return;
            const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
            last = now;

            // Throw a new item every so often
            const mobile = W < 640;
            const [minGap, maxGap] = mobile ? CONFIG.spawnEveryMobile : CONFIG.spawnEvery;
            const cap = mobile ? CONFIG.maxItemsMobile : CONFIG.maxItems;
            spawnIn -= dt;
            if (spawnIn <= 0 && items.length < cap) {
                spawn();
                spawnIn = rand(minGap, maxGap);
            }

            // Move everything
            for (let i = items.length - 1; i >= 0; i--) {
                const it = items[i];
                it.vy += g * dt;
                it.x += it.vx * dt;
                it.y += it.vy * dt;
                it.angle += it.spin * dt;
                it.phase += it.tilt * dt;
                if (it.vy > 0 && it.y > H + 120 * s) items.splice(i, 1); // fell back down
            }
            for (let i = shards.length - 1; i >= 0; i--) {
                const sh = shards[i];
                sh.vy += g * dt;
                sh.x += sh.vx * dt;
                sh.y += sh.vy * dt;
                sh.rot += sh.spin * dt;
                sh.age += dt;
                if (sh.age > sh.life || sh.y > H + 60) shards.splice(i, 1);
            }
            for (let i = rings.length - 1; i >= 0; i--) {
                rings[i].age += dt;
                if (rings[i].age > rings[i].life) rings.splice(i, 1);
            }

            draw();
            raf = requestAnimationFrame(frame);
        };

        const wake = () => {
            if (!raf && alive && visible && !document.hidden) {
                last = 0;
                raf = requestAnimationFrame(frame);
            }
        };

        // Mouse touches an item = it breaks
        const onPointerMove = (e) => {
            if (e.pointerType === 'touch') return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
                pointer.has = false;
                return;
            }
            const fromX = pointer.has ? pointer.x : x;
            const fromY = pointer.has ? pointer.y : y;
            hitTest(fromX, fromY, x, y, 8);
            pointer.x = x;
            pointer.y = y;
            pointer.has = true;
        };

        // Click or tap also breaks items (the only way on touch screens)
        const onPointerDown = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
            hitTest(x, y, x, y, e.pointerType === 'touch' ? 28 : 14);
        };

        const onPointerLeave = () => {
            pointer.has = false;
        };

        const onVisibility = () => wake();

        const resizeObserver = new ResizeObserver(() => {
            resize();
            wake();
        });
        resizeObserver.observe(canvas);

        const intersection = new IntersectionObserver((entries) => {
            visible = entries.some((entry) => entry.isIntersecting);
            if (visible) wake();
        });
        intersection.observe(canvas);

        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('pointerdown', onPointerDown, { passive: true });
        document.documentElement.addEventListener('pointerleave', onPointerLeave);
        document.addEventListener('visibilitychange', onVisibility);

        resize();
        wake();

        return () => {
            alive = false;
            cancelAnimationFrame(raf);
            resizeObserver.disconnect();
            intersection.disconnect();
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerdown', onPointerDown);
            document.documentElement.removeEventListener('pointerleave', onPointerLeave);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [respectReducedMotion]);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
        />
    );
}