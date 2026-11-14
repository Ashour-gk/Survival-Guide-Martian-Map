import React from 'react'
import { ArrowLeft, RadioTower } from 'lucide-react'
import { Pt } from '../shared/mars/data'

export const args = {}
export const argTypes = {}
type Props = { stops?: Pt[]; onBack?: () => void }

export default function MarswalkHud({ onBack }: Props) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#020d18] px-5 text-space-50">
      <section className="w-full max-w-lg rounded-2xl border border-space-700 bg-ink/80 p-7 text-center shadow-2xl">
        <RadioTower className="mx-auto h-7 w-7 text-space-200" />
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-space-200">Helmet navigation</p>
        <h1 className="mt-2 text-xl font-semibold">Live mission feed unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-space-200">A verified rover position, suit telemetry, hazard feed, and route data are required before this display can provide navigation guidance.</p>
        <button onClick={onBack} className="mx-auto mt-6 flex items-center gap-2 rounded-md border border-space-600 px-4 py-2 text-sm hover:bg-space-900"><ArrowLeft className="h-4 w-4" /> Return to map</button>
      </section>
    </main>
  )
}
