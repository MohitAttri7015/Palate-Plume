'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import MenuNavigator from './MenuNavigator'

// --- EDITORIAL DATASET ---
const ITEMS_DATA = [
    {
        id: 1,
        number: "01",
        category: "Agency & Studio",
        title: "FROMANOTHER",
        description: "A fresh website for the creative agency fromanother, founded by two artists I've long admired, Vicki and Robin.",
        price: "$1,250",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop"
    },
    {
        id: 2,
        number: "02",
        category: "Agency & Studio",
        title: "DISTRICT2 STUDIO",
        description: "Designing the new website for District2, the first studio I ever worked at and my very first creative website project.",
        price: "$2,100",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop"
    },
    {
        id: 3,
        number: "03",
        category: "Promotional",
        title: "IVENTIONS",
        description: "Teamed up with the Serious Business agency to build a new website for Iventions, an event agency based in Barcelona.",
        price: "$890",
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop"
    },
    {
        id: 4,
        number: "04",
        category: "Personal Brand",
        title: "WON J. YOU STUDIOS",
        description: "Sculpted minimalist studio collection emphasizing high-contrast silhouette geometry and lightweight carbon textures.",
        price: "$3,400",
        image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=1000&auto=format&fit=crop"
    },
    {
        id: 5,
        number: "05",
        category: "Cyber Vision",
        title: "NEO SHADOWS",
        description: "Immersive futuristic headwear crafted with lightweight matte materials and custom optical privacy filters.",
        price: "$1,850",
        image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=1000&auto=format&fit=crop"
    }
];

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

const FRAGMENT_SHADER = `
  uniform sampler2D uTexture;
  uniform float uVelocity;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // Chromatic aberration split proportional to scroll velocity
    float shift = uVelocity * 0.0006;
    float r = texture2D(uTexture, uv + vec2(shift, 0.0)).r;
    float g = texture2D(uTexture, uv).g;
    float b = texture2D(uTexture, uv - vec2(shift, 0.0)).b;

    gl_FragColor = vec4(r, g, b, 1.0);
  }
`;

export default function MenuItemsGallery() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [scrollVelocity, setScrollVelocity] = useState(0);

    const canvasRef = useRef(null);
    const scrollPosRef = useRef(0);
    const targetScrollRef = useRef(0);
    const velocityRef = useRef(0);
    const lastScrollRef = useRef(0);
    const threeRef = useRef({ scene: null, camera: null, renderer: null, meshes: [] });
    const touchStartY = useRef(0);

    // --- THREE.JS INITIALIZATION ---
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
            powerPreference: "high-performance"
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const textureLoader = new THREE.TextureLoader();
        const planeGeometry = new THREE.PlaneGeometry(1, 1, 32, 32);
        const meshes = [];

        ITEMS_DATA.forEach((item) => {
            const texture = textureLoader.load(item.image);
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;

            const material = new THREE.ShaderMaterial({
                vertexShader: VERTEX_SHADER,
                fragmentShader: FRAGMENT_SHADER,
                uniforms: {
                    uTexture: { value: texture },
                    uVelocity: { value: 0 }
                },
                transparent: true
            });

            const mesh = new THREE.Mesh(planeGeometry, material);
            scene.add(mesh);
            meshes.push(mesh);
        });

        threeRef.current = { scene, camera, renderer, meshes };

        const handleResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
        };
    }, []);

    // --- 3D TILT & INFINITE LOOP ANIMATION ENGINE ---
    useEffect(() => {
        let animFrameId;

        const animate = () => {
            const { scene, camera, renderer, meshes } = threeRef.current;

            if (renderer && scene && camera && meshes.length > 0) {
                // Smooth inertia interpolation (lerp)
                scrollPosRef.current += (targetScrollRef.current - scrollPosRef.current) * 0.08;
                const velocity = scrollPosRef.current - lastScrollRef.current;
                velocityRef.current = velocity;
                lastScrollRef.current = scrollPosRef.current;

                setScrollVelocity(Math.abs(velocity));

                const itemCount = ITEMS_DATA.length;
                // Increased Item Y Spacing to guarantee distinct clear gaps between adjacent images
                const isMobile = window.innerWidth < 700;
                const itemSpacing = isMobile ? window.innerHeight * 0.85 : window.innerHeight * 0.78;
                const totalHeight = itemCount * itemSpacing;

                // Circular infinite scroll calculation
                const currentPos = scrollPosRef.current;
                const normalizedScroll = ((currentPos % totalHeight) + totalHeight) % totalHeight;

                const activeIdx = Math.floor(((normalizedScroll + itemSpacing / 2) % totalHeight) / itemSpacing);
                setActiveIndex(activeIdx);

                meshes.forEach((mesh, i) => {
                    let itemY = (i * itemSpacing) - (currentPos % totalHeight);

                    // Endless circular wrapping without visible cuts
                    if (itemY < -totalHeight / 2) itemY += totalHeight;
                    if (itemY > totalHeight / 2) itemY -= totalHeight;

                    mesh.material.uniforms.uVelocity.value = velocity * 12;

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
            }

            animFrameId = requestAnimationFrame(animate);
        };

        animFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animFrameId);
    }, []);

    // --- SCROLL / TOUCH EVENT LISTENERS ---
    useEffect(() => {
        const handleWheel = (e) => {
            targetScrollRef.current += e.deltaY * 0.85;
        };


        const handleTouchStart = (e) => {
            touchStartY.current = e.touches[0].clientY;
        };

        const handleTouchMove = (e) => {
            e.preventDefault(); // Prevent browser pull-to-refresh

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

    const activeItem = useMemo(() => ITEMS_DATA[activeIndex] || ITEMS_DATA[0], [activeIndex]);

    // Dynamic velocity motion blur
    const textBlurStyle = {
        filter: `blur(${Math.min(scrollVelocity * 0.25, 8)}px)`,
        transition: 'filter 0.15s ease-out'
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden isolate">
            <MenuNavigator />

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
                            {activeItem.number}
                        </span>
                        <span className="text-sm text-[#bbb] font-ui">
                            /{ITEMS_DATA.length < 10 ? `0${ITEMS_DATA.length}` : ITEMS_DATA.length}
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
                                className="text-3xl sm:text-4xl tracking-tight uppercase leading-none font-heading"
                                style={{
                                    color: '#fff',
                                }}
                            >
                                {activeItem.title}
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
                                <span className="font-semibold text-white" style={textBlurStyle}>{activeItem.price}</span>
                            </div>
                        </div>

                    </div>
                </div>



            </div>

        </div>
    );
}