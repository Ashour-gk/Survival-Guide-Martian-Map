import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowRight, ChartNoAxesCombined, Compass, Globe2, Layers3, ShieldCheck } from 'lucide-react'

import { NasaMarsGlobe } from './NasaMarsGlobe'
import { MarsLogo } from './MarsLogo'
import './mars-intro.css'

type Props = { onSignIn: () => void }

const features = [
  { icon: Globe2, title: 'Orbital imagery', detail: 'Explore NASA Mars Trek basemaps, from global context to local HiRISE coverage.' },
  { icon: Layers3, title: 'Science layers', detail: 'See source and verification status for each available dataset.' },
  { icon: Compass, title: 'Field observations', detail: 'Save geolocated observations and upload photographs to your account.' },
  { icon: ShieldCheck, title: 'Crew access', detail: 'Crew data is protected by account sign-in.' },
]

export default function MarsIntro({ onSignIn }: Props) {
  const reduceMotion = useReducedMotion()
  const reveal = reduceMotion ? {} : { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 }, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } }

  return (
    <main className="mars-intro min-h-screen overflow-hidden bg-[#020f1b] text-space-50">
      <div className="intro-stars" aria-hidden="true" />
      <div className="intro-ambient" aria-hidden="true" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <a href="#home" className="flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-space-50"><MarsLogo className="h-10 w-10" /> MARS EXPLORER</a>
        <button onClick={onSignIn} className="group flex items-center gap-2 rounded-full border border-space-600/70 px-4 py-2 text-sm text-space-50 transition-colors hover:border-space-200 hover:bg-white/5">
          Crew sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </header>

      <section id="home" className="relative mx-auto grid min-h-[calc(100svh-82px)] max-w-7xl items-center gap-8 px-6 pb-20 pt-4 lg:grid-cols-[1fr_1fr] lg:px-10 lg:pb-28">
        <motion.div initial={reduceMotion ? false : { opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="relative z-10 max-w-2xl">
          <p className="mb-5 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-[#8ec9e7]"><span className="h-px w-8 bg-[#8ec9e7]" /> Planetary field intelligence</p>
          <h1 className="max-w-[720px] text-5xl leading-[0.98] font-semibold tracking-[-0.055em] sm:text-6xl lg:text-[5.4rem]">A closer look at <span className="intro-title-accent">Mars.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-space-200 sm:text-lg">Explore orbital imagery and work with mission observations across the Martian surface.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button onClick={onSignIn} className="group flex items-center gap-3 rounded-full bg-[#c8efff] px-6 py-3 text-sm font-semibold text-[#051829] shadow-[0_0_34px_rgba(98,190,230,.16)] transition-all hover:-translate-y-0.5 hover:bg-white">
              Enter the explorer <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <a href="#capabilities" className="flex items-center gap-2 px-4 py-3 text-sm text-space-200 transition-colors hover:text-white">Discover the system <ArrowDown className="h-4 w-4" /></a>
          </div>
          <div className="mt-12 flex items-center gap-3 border-t border-white/10 pt-5 text-xs text-space-300">
            <span className="h-2 w-2 rounded-full bg-[#78d5b2] shadow-[0_0_12px_#78d5b2]" />
            <span>Imagery served from NASA Mars Trek</span>
          </div>
        </motion.div>

        <motion.div className="relative mx-auto flex aspect-square w-full max-w-[620px] items-center justify-center" initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}>
          <div className="intro-orbit intro-orbit-one" aria-hidden="true" />
          <div className="intro-orbit intro-orbit-two" aria-hidden="true" />
          <motion.div className="relative z-10 w-[67%]" animate={reduceMotion ? undefined : { rotateY: [-9, 9, -9], y: [0, -8, 0] }} transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }} style={{ transformStyle: 'preserve-3d' }}>
            <NasaMarsGlobe className="intro-planet" />
          </motion.div>
          <div className="absolute bottom-[13%] left-[4%] hidden rounded-xl border border-white/10 bg-[#061a2b]/75 px-4 py-3 shadow-2xl backdrop-blur-xl sm:block">
            <p className="font-mono text-[10px] tracking-[0.18em] text-space-300">SOLAR SYSTEM / 04</p>
            <p className="mt-1 text-sm font-medium">Mars · the Red Planet</p>
          </div>
          <motion.div className="absolute right-[2%] top-[21%] hidden items-center gap-2 rounded-xl border border-white/10 bg-[#061a2b]/75 px-3 py-2.5 text-xs text-space-100 shadow-2xl backdrop-blur-xl md:flex" whileHover={{ scale: 1.04 }}>
            <ChartNoAxesCombined className="h-4 w-4 text-[#8ec9e7] transition-transform duration-300 hover:-translate-y-0.5" /> Live orbital basemaps
          </motion.div>
          <div className="intro-glow" aria-hidden="true" />
        </motion.div>
      </section>

      <section id="capabilities" className="relative z-10 border-t border-white/[0.08] bg-[#041523]/80 px-6 py-20 backdrop-blur-sm lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...reveal} className="mb-10 max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8ec9e7]">Mission workspace</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">One view of the surface.</h2>
            <p className="mt-3 text-sm leading-6 text-space-200">Every dataset should carry its source. Where verified data is not available, the system says so.</p>
          </motion.div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, detail }, index) => (
              <motion.article key={title} {...reveal} transition={{ ...reveal.transition, delay: index * 0.07 }} whileHover={reduceMotion ? undefined : { y: -5 }} className="group rounded-2xl border border-white/[0.09] bg-white/[0.025] p-5 transition-colors hover:border-[#8ec9e7]/30 hover:bg-white/[0.045]">
                <Icon className="h-5 w-5 text-[#8ec9e7] transition-transform duration-300 group-hover:scale-110" />
                <h3 className="mt-6 text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-space-200">{detail}</p>
              </motion.article>
            ))}
          </div>
          <motion.div {...reveal} className="mt-12 flex flex-col items-start justify-between gap-5 rounded-2xl border border-white/10 bg-gradient-to-r from-[#0b2a3e] to-[#071b2b] p-6 sm:flex-row sm:items-center sm:p-8">
            <div><p className="font-mono text-[10px] tracking-[0.18em] text-[#8ec9e7]">AUTHORIZED CREW ACCESS</p><p className="mt-2 text-lg font-medium">Ready to enter the mission workspace?</p></div>
            <button onClick={onSignIn} className="group flex shrink-0 items-center gap-2 rounded-full border border-space-400 px-5 py-2.5 text-sm font-medium transition-all hover:border-white hover:bg-white hover:text-[#051829]">Sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
          </motion.div>
          <footer className="mt-12 flex flex-wrap justify-between gap-3 text-[11px] text-space-300"><span>Mars Explorer</span><span>Basemap imagery: NASA Mars Trek · Viking, HiRISE, CTX</span></footer>
        </div>
      </section>
    </main>
  )
}
