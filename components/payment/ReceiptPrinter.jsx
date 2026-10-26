'use client';

import { createContext, useContext } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CircleCheck, LoaderCircle } from 'lucide-react';

// stage: 'processing' | 'printing' | 'complete'     feedMotion: 'smooth' | 'stepped'
const Ctx = createContext(null);

const easeOut = [0.23, 1, 0.32, 1];
const easeInOut = [0.77, 0, 0.175, 1];

// The torn, toothed bottom edge of the paper.
const TOOTH_COUNT = 40;
const TOOTH_DEPTH = 4;
const toothPoints = Array.from({ length: TOOTH_COUNT * 2 }, (_, i) => {
    const x = 100 - ((i + 1) * 100) / (TOOTH_COUNT * 2);
    const y = i % 2 === 0 ? '100%' : `calc(100% - ${TOOTH_DEPTH}px)`;
    return `${x}% ${y}`;
}).join(', ');
const receiptClipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${TOOTH_DEPTH}px), ${toothPoints})`;

// The paper comes out one "line" at a time.
const printingTransformKeyframes = [
    'translateY(calc(-100% + 2px))', 'translateY(-91%)', 'translateY(-91%)', 'translateY(-81%)', 'translateY(-81%)',
    'translateY(-70%)', 'translateY(-70%)', 'translateY(-58%)', 'translateY(-58%)', 'translateY(-45%)',
    'translateY(-45%)', 'translateY(-32%)', 'translateY(-32%)', 'translateY(-20%)', 'translateY(-20%)',
    'translateY(-10%)', 'translateY(-10%)', 'translateY(-3%)', 'translateY(-3%)', 'translateY(0%)',
];
const printingKeyframeTimes = [0, 0.075, 0.105, 0.18, 0.21, 0.285, 0.315, 0.39, 0.42, 0.495, 0.525, 0.6, 0.63, 0.705, 0.735, 0.81, 0.84, 0.915, 0.945, 1];

const statusLabels = {
    processing: 'Processing your order',
    printing: 'Printing your receipt',
    complete: 'Your receipt is ready',
};

function useReceipt(name) {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error(`${name} must be used inside ReceiptPrinter.Root.`);
    return ctx;
}

function Root({ animate = true, children, className, feedMotion = 'stepped', stage, ...props }) {
    const reduce = useReducedMotion();
    const value = { animate, feedMotion, shouldMove: animate && !reduce, stage };
    return (
        <Ctx.Provider value={value}>
            <section
                aria-label="Receipt printer"
                className={clsx('relative isolate flex w-full max-w-sm flex-col items-center', className)}
                data-stage={stage}
                {...props}
            >
                {children}
            </section>
        </Ctx.Provider>
    );
}

function Machine({ children, className, ...props }) {
    return (
        <div
            className={clsx(
                'relative isolate w-full overflow-hidden rounded-3xl border border-[#2c2c34] bg-[#17171c] p-3 pb-8',
                'shadow-[0_20px_36px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)]',
                className
            )}
            {...props}
        >
            {children}
            {/* the paper slot */}
            <div aria-hidden="true" className="absolute inset-x-6 bottom-3 z-40 h-2 rounded bg-black shadow-inner" />
        </div>
    );
}

function Header({ children, className, ...props }) {
    return (
        <div className={clsx('relative z-10 flex h-11 items-start justify-between', className)} {...props}>
            {children}
        </div>
    );
}

function Screen({ children, className, ...props }) {
    return (
        <div
            className={clsx(
                'relative z-10 isolate overflow-hidden rounded-xl border border-[#26262E] bg-[#0A0A0C] p-4 text-white',
                'after:pointer-events-none after:absolute after:inset-0 after:z-20 after:rounded-[inherit] after:shadow-[inset_0_0_24px_4px_rgba(0,0,0,0.5)] after:content-[""]',
                className
            )}
            {...props}
        >
            <div className="relative z-10">{children}</div>
        </div>
    );
}

function StatusIndicator({ animate, move, stage }) {
    const done = stage === 'complete';
    const motionProps = {
        initial: { opacity: animate ? 0 : 1, scale: move ? 0.94 : 1 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: animate ? 0 : 1, scale: move ? 0.96 : 1 },
        transition: { duration: animate ? 0.16 : 0, ease: easeOut },
    };
    return (
        <span aria-hidden="true" className="relative grid size-5 shrink-0 place-items-center">
            <AnimatePresence initial={false} mode="sync">
                {done ? (
                    <motion.span key="complete" className="col-start-1 row-start-1 grid place-items-center text-emerald-400" {...motionProps}>
                        <CircleCheck size={18} />
                    </motion.span>
                ) : (
                    <motion.span key="working" className="col-start-1 row-start-1 grid place-items-center text-white/60" {...motionProps}>
                        <LoaderCircle size={18} className={clsx(animate && 'animate-spin motion-reduce:animate-none')} />
                    </motion.span>
                )}
            </AnimatePresence>
        </span>
    );
}

function Status({ children, className, ...props }) {
    const { animate, shouldMove, stage } = useReceipt('ReceiptPrinter.Status');
    return (
        <div className={clsx('flex min-w-0 items-center gap-2', className)} {...props}>
            <StatusIndicator animate={animate} move={shouldMove} stage={stage} />
            <div aria-live="polite" className="grid min-w-0 flex-1 items-center" role="status">
                <AnimatePresence initial={false} mode="sync">
                    <motion.div
                        key={stage}
                        className="col-start-1 row-start-1 truncate text-xs font-medium leading-none text-white/60"
                        initial={{ opacity: animate ? 0 : 1, y: shouldMove ? 4 : 0 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: animate ? 0 : 1, y: shouldMove ? -4 : 0 }}
                        transition={{ duration: animate ? 0.18 : 0, ease: easeOut }}
                    >
                        {children ?? statusLabels[stage]}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

function Paper({ children, className, style, ...props }) {
    return (
        <article
            className={clsx('relative z-10 min-h-80 bg-[#f4f0e6] px-6 pb-8 pt-7 font-mono text-[#1b1b1b]', className)}
            style={{ clipPath: receiptClipPath, ...style }}
            {...props}
        >
            {children}
        </article>
    );
}

function Output({ children, className, ...props }) {
    const { animate, feedMotion, shouldMove, stage } = useReceipt('ReceiptPrinter.Output');
    const visible = stage !== 'processing';
    const stepped = feedMotion === 'stepped' && stage === 'printing' && shouldMove;

    let transform = 'translateY(calc(-100% + 2px))';
    if (stage === 'printing' && shouldMove) transform = stepped ? printingTransformKeyframes : 'translateY(0%)';
    else if (visible || !shouldMove) transform = 'translateY(0%)';

    return (
        <div className={clsx('relative z-50 -mt-4 w-[calc(80%+3rem)] max-w-full overflow-hidden px-6', className)} {...props}>
            {visible && <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 -top-1 z-20 h-2 bg-black/70 blur-[6px]" />}
            <motion.div
                initial={false}
                aria-hidden={stage !== 'complete'}
                className="relative isolate"
                animate={{ opacity: visible ? 1 : 0, transform }}
                transition={{
                    opacity: { duration: animate ? 0.16 : 0, ease: easeOut },
                    transform: {
                        duration: shouldMove ? 1.75 : 0,
                        ease: stepped ? 'linear' : easeInOut,
                        times: stepped ? printingKeyframeTimes : undefined,
                    },
                }}
            >
                {children}
            </motion.div>
        </div>
    );
}

export const ReceiptPrinter = { Header, Machine, Output, Paper, Root, Screen, Status };