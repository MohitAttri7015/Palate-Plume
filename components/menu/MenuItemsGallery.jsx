'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import MenuNavigator from './MenuNavigator'
import { defaultSelection, itemsFor } from '@/lib/menuSelect'

// --- SHADERS FOR LIQUID/PAPER WAVE DISTORTION ON SCROLL ---
const VERTEX_SHADER = `
  uniform float uVelocity;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Paper flex wave distortion along movement path
    float waveX = sin(vUv.x * 3.14159265) * uVelocity * 0.003;
    float waveY = cos(vUv.y * 3.14159265) * uVelocity * 0.002;

    pos.z += waveX;
    pos.y += waveY;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// uReady: 0 = the picture is still loading (a soft pulsing grey "skeleton"), 1 = the real picture.
const FRAGMENT_SHADER = `
  uniform sampler2D uTexture;
  uniform float uVelocity;
  uniform float uReady;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // Chromatic aberration split proportional to scroll velocity
    float shift = uVelocity * 0.0006;
    float r = texture2D(uTexture, uv + vec2(shift, 0.0)).r;
    float g = texture2D(uTexture, uv).g;
    float b = texture2D(uTexture, uv - vec2(shift, 0.0)).b;

    float pulse = 0.5 + 0.5 * sin(uTime * 2.5 + uv.y * 4.0);
    vec3 skeleton = vec3(0.09, 0.09, 0.11) + pulse * 0.035;

    gl_FragColor = vec4(mix(skeleton, vec3(r, g, b), uReady), 1.0);
  }
`;

const FADE_MS = 450;       // how long a loaded picture takes to fade in over the skeleton
const LOAD_RANGE = 2.5;    // start loading pictures this many items away from the centre
const UNLOAD_RANGE = 4.5;  // free the picture's graphics memory when it is this far away
const mod = (n, m) => ((n % m) + m) % m;
const pad = (n) => String(n).padStart(2, '0');
const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;

export default function MenuItemsGallery({ groups = [], initial }) {
    // What the visitor picked in the dropdowns. Default: the first type (Food), all its categories.
    const [selection, setSelection] = useState(initial ?? defaultSelection(groups));
    const items = useMemo(() => itemsFor(groups, selection), [groups, selection]);

    const [activeIndex, setActiveIndex] = useState(0);
    const [blur, setBlur] = useState(0); // text blur in px, in 0.5px steps (so React only re-renders when it really changes)

    const canvasRef = useRef(null);
    const scrollPosRef = useRef(0);
    const targetScrollRef = useRef(0);
    const lastScrollRef = useRef(0);
    const dirtyRef = useRef(true); // true = something changed, draw the next frame
    const threeRef = useRef({ scene: null, camera: null, renderer: null, geometry: null, loader: null, meshes: [] });
    const touchStartY = useRef(0);

    // --- THREE.JS INITIALIZATION (once) ---
    useEffect(() => {
        if (!canvasRef.current) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

        const scene = new THREE.Scene();

        const fov = 50;
        const aspect = width / height;
        const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 2000);
        camera.position.z = 600;

        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            alpha: true,
            antialias: true,
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);
        const loader = new THREE.TextureLoader();

        threeRef.current = { scene, camera, renderer, geometry, loader, meshes: [] };

        const handleResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            dirtyRef.current = true;
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            geometry.dispose();
            renderer.dispose();
        };
    }, []);

    // --- ONE FLAT "PAPER" PER ITEM. Rebuilt whenever the category changes. Pictures load later, only when near. ---
    useEffect(() => {
        const t = threeRef.current;
        if (!t.scene) return;

        const meshes = items.map((item) => {
            const material = new THREE.ShaderMaterial({
                vertexShader: VERTEX_SHADER,
                fragmentShader: FRAGMENT_SHADER,
                uniforms: {
                    uTexture: { value: null },
                    uVelocity: { value: 0 },
                    uReady: { value: 0 },
                    uTime: { value: 0 },
                },
                transparent: true,
            });
            const mesh = new THREE.Mesh(t.geometry, material);
            mesh.visible = false;
            mesh.userData = { url: item.image, state: 'idle', loadedAt: 0, disposed: false };
            t.scene.add(mesh);
            return mesh;
        });

        t.meshes = meshes;
        // New list: start again from the first item
        scrollPosRef.current = 0;
        targetScrollRef.current = 0;
        lastScrollRef.current = 0;
        dirtyRef.current = true;

        return () => {
            meshes.forEach((mesh) => {
                mesh.userData.disposed = true; // a picture that arrives late is thrown away
                t.scene.remove(mesh);
                mesh.material.uniforms.uTexture.value?.dispose();
                mesh.material.dispose();
            });
            t.meshes = [];
        };
    }, [items]);

    // --- 3D TILT & INFINITE LOOP ANIMATION ENGINE ---
    useEffect(() => {
        let animFrameId;

        const loadPicture = (mesh) => {
            const u = mesh.userData;
            u.state = 'loading';
            threeRef.current.loader.load(
                u.url,
                (texture) => {
                    if (u.disposed) {
                        texture.dispose();
                        return;
                    }
                    mesh.material.uniforms.uTexture.value = texture;
                    u.state = 'ready';
                    u.loadedAt = performance.now();
                    dirtyRef.current = true;
                },
                undefined,
                () => {
                    u.state = 'failed'; // stays a grey skeleton card instead of breaking the page
                }
            );
        };

        const unloadPicture = (mesh) => {
            const u = mesh.userData;
            mesh.material.uniforms.uTexture.value?.dispose();
            mesh.material.uniforms.uTexture.value = null;
            mesh.material.uniforms.uReady.value = 0;
            u.state = 'idle';
        };

        const animate = (now) => {
            animFrameId = requestAnimationFrame(animate);

            const { scene, camera, renderer, meshes } = threeRef.current;
            if (!renderer || !scene || !camera || meshes.length === 0) return;

            // Smooth inertia interpolation (lerp)
            scrollPosRef.current += (targetScrollRef.current - scrollPosRef.current) * 0.08;
            if (Math.abs(targetScrollRef.current - scrollPosRef.current) < 0.05) {
                scrollPosRef.current = targetScrollRef.current;
            }
            const velocity = scrollPosRef.current - lastScrollRef.current;
            lastScrollRef.current = scrollPosRef.current;

            // Pictures still fading in, or still loading (the skeleton pulses)
            const animating = meshes.some(
                (m) =>
                    m.visible &&
                    (m.userData.state === 'idle' ||
                        m.userData.state === 'loading' ||
                        (m.userData.state === 'ready' && now - m.userData.loadedAt < FADE_MS))
            );

            // Nothing moves and nothing changed: skip the whole frame (an idle page costs almost nothing)
            if (velocity === 0 && !dirtyRef.current && !animating) return;
            dirtyRef.current = false;

            const itemCount = meshes.length;
            // Increased Item Y Spacing to guarantee distinct clear gaps between adjacent images
            const isMobile = window.innerWidth < 700;
            const itemSpacing = isMobile ? window.innerHeight * 0.85 : window.innerHeight * 0.78;
            const totalHeight = itemCount * itemSpacing;

            // Circular infinite scroll calculation
            const currentPos = scrollPosRef.current;
            const normalizedScroll = mod(currentPos, totalHeight);

            const activeIdx = Math.floor(((normalizedScroll + itemSpacing / 2) % totalHeight) / itemSpacing);
            setActiveIndex(activeIdx);
            setBlur(Math.min(Math.round(Math.abs(velocity) * 0.25 * 2) / 2, 8));

            meshes.forEach((mesh, i) => {
                // Endless circular wrapping without visible cuts (always the shortest way round the circle)
                const itemY = mod(i * itemSpacing - currentPos + totalHeight / 2, totalHeight) - totalHeight / 2;
                const distance = Math.abs(itemY) / itemSpacing; // how many items away from the centre
                const u = mesh.userData;

                // Only load pictures that are close, and free the ones that are far away
                if (distance < LOAD_RANGE && u.state === 'idle') loadPicture(mesh);
                else if (distance > UNLOAD_RANGE && u.state === 'ready') unloadPicture(mesh);

                // Far items are off screen anyway, so they are not drawn at all
                mesh.visible = distance < 2.2;
                if (!mesh.visible) return;

                const uniforms = mesh.material.uniforms;
                uniforms.uVelocity.value = velocity * 12;
                uniforms.uTime.value = now / 1000;
                uniforms.uReady.value = u.state === 'ready' ? Math.min((now - u.loadedAt) / FADE_MS, 1) : 0;

                // MATCHING EXACT ORIENTATION FROM REFERENCE IMAGE (image_513b9f.jpg):
                // The images cascade from top-right down to center/bottom-left.
                // Top cards rotate counter-clockwise in Z and tilt back in Y.

                const angleX = -0.05;  // Slight backward pitch
                const angleY = 0.20;  // Rotated clockwise on Y-axis (facing right)
                const angleZ = 0.14;   // ~8° Clockwise Z rotation (top edge slants up-right)

                // Position calculations with gap offsets
                const scaleOffset = isMobile ? 0.8 : 1.0;
                const diagX = itemY * (isMobile ? 0.25 : 0.45);
                const diagY = -itemY * (isMobile ? 0.75 : 0.82);
                const depthZ = -Math.abs(itemY) * 0.2;

                mesh.position.x = diagX + (isMobile ? -window.innerWidth * 0.02 : window.innerWidth * 0.02);
                mesh.position.y = diagY;
                mesh.position.z = depthZ;

                // Maintain identical 3D tilt angles across both Desktop and Mobile!
                mesh.rotation.x = angleX;
                mesh.rotation.y = angleY;
                mesh.rotation.z = angleZ;

                // Dimensions matching reference card aspect ratio
                const baseW = isMobile ? Math.min(window.innerWidth * 0.58, 250) : Math.min(window.innerWidth * 0.25, 340);
                const baseH = baseW * 0.76;
                mesh.scale.set(baseW * scaleOffset, baseH * scaleOffset, 1);
            });

            renderer.render(scene, camera);
        };

        animFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animFrameId);
    }, []);

    // --- SCROLL / TOUCH EVENT LISTENERS ---
    useEffect(() => {
        const canScroll = () => threeRef.current.meshes.length > 1; // one item = nothing to scroll to

        const handleWheel = (e) => {
            if (!canScroll()) return;
            targetScrollRef.current += e.deltaY * 0.85;
        };

        const handleTouchStart = (e) => {
            touchStartY.current = e.touches[0].clientY;
        };

        const handleTouchMove = (e) => {
            e.preventDefault(); // Prevent browser pull-to-refresh
            if (!canScroll()) return;

            const touchY = e.touches[0].clientY;
            const deltaY = touchStartY.current - touchY;

            touchStartY.current = touchY;
            targetScrollRef.current += deltaY * 1.8;
        };

        window.addEventListener('wheel', handleWheel, { passive: true });
        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });

        return () => {
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);

    const activeItem = items[activeIndex] ?? items[0];

    // Dynamic velocity motion blur
    const textBlurStyle = {
        filter: blur > 0 ? `blur(${blur}px)` : 'none',
        transition: 'filter 0.15s ease-out'
    };

    // Nothing on the menu yet (no items in the database)
    if (!activeItem) {
        return (
            <div className="relative w-screen h-screen flex items-center justify-center px-6 text-center font-ui text-sm text-white/60">
                <MenuNavigator groups={groups} value={selection} onSelect={() => { }} />
                The menu is being prepared. Please check back soon.
            </div>
        );
    }

    return (
        <div className="relative w-screen h-screen overflow-hidden isolate">
            <MenuNavigator
                groups={groups}
                value={selection}
                onSelect={(type, slug) => setSelection({ type, slug })}
            />

            <canvas
                ref={canvasRef}
                className="fixed inset-0 w-full h-screen pointer-events-none z-10"
            />


            <div
                className="relative z-20 w-full h-full flex justify-between md:flex-row flex-col sm:px-12 py-8 px-4"
                style={{ mixBlendMode: 'difference' }}
            >


                <div className="flex flex-row items-end justify-between md:h-full pointer-events-auto  md:w-[40%] w-full h-[20%]" >
                    <span className="text-[10px] md:block hidden uppercase tracking-widest text-[#777] pointer-events-auto font-ui">Scroll to explore</span>

                    <div className="flex gap-4 items-center font-ui">
                        <span
                            style={{
                                ...textBlurStyle,
                                color: '#fff',

                            }}
                            className="text-[10rem] md:text-[20rem] tracking-tighter leading-none font-heading"
                        >
                            {pad(activeIndex + 1)}
                        </span>
                        <span className="text-sm text-[#bbb] font-ui">
                            /{pad(items.length)}
                        </span>
                    </div>
                </div>


                <div className="pointer-events-auto flex md:items-center justify-center md:h-full  md:w-[30%] w-full h-[40%]" >
                    <div className="max-w-sm w-full flex flex-col items-center gap-4">

                        <div className="flex flex-col gap-2 items-center" style={textBlurStyle}>
                            <span
                                className="text-[10px] uppercase tracking-widest font-ui"
                                style={{
                                    ...textBlurStyle,
                                    color: '#fff',
                                }}
                            >
                                {activeItem.category}
                            </span>

                            <h2
                                className="text-3xl text-center sm:text-4xl tracking-tight uppercase leading-none font-heading"
                                style={{
                                    color: '#fff',
                                }}
                            >
                                {activeItem.name}
                            </h2>

                        </div>

                        <div className="w-10 h-[1px] bg-white my-2 m-auto"></div>

                        <p
                            className="text-xs text-center leading-relaxed font-ui"
                            style={{
                                ...textBlurStyle,
                                color: '#fff',
                            }}
                        >
                            {activeItem.description}
                        </p>

                        {/* Static Purely Visual Add To Bag Button (Non-clickable / No action popups) */}
                        <div className="w-full mt-2">
                            <div className="font-ui w-full border border-[#26262E] text-white cursor-pointer py-4 px-6 rounded-xl  text-xs uppercase tracking-wider flex items-center justify-between">
                                <span>Add to Bag</span>
                                <span className="font-semibold text-white" style={textBlurStyle}>{formatPrice(activeItem.price)}</span>
                            </div>
                        </div>

                    </div>
                </div>



            </div>

        </div>
    );
}