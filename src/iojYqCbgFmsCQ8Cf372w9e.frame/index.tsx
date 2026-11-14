import React from 'react'
import { AppShell, Screen } from '../shared/mars/AppShell'
import { Account, accountFor } from '../shared/mars/auth'
import { Observation } from '../shared/mars/observations'
import { Stop } from '../shared/mars/risk'

export const args = {}
export const argTypes = {}
type Props = { account?: Account; observations?: Observation[]; stops?: Stop[]; onNavigate?: (s: Screen) => void; onSignOut?: () => void }

export default function AstronautDashboard({ account = accountFor('astronaut'), observations = [], stops = [], onNavigate, onSignOut }: Props) {
  const mine = observations.filter((item) => item.contributorId === account.id)
  return (
    <AppShell account={account} current="dashboard" alerts={0} onNavigate={onNavigate} onSignOut={onSignOut}>
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-space-200">Crew workspace</p>
        <h1 className="mt-2 text-2xl font-semibold">Mission overview</h1>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label="Your observations" value={String(mine.length)} />
          <Metric label="Saved route stops" value={String(stops.length)} />
          <Metric label="Suit telemetry" value="Unavailable" />
        </div>
        <section className="mt-8 rounded-xl border border-space-800 bg-space-900/50 p-5">
          <h2 className="text-sm font-semibold">Telemetry is not connected</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-space-200">No rover position, suit readings, EVA clock, or mission events are being supplied by a live source. This overview keeps those values empty instead of substituting sample readings.</p>
          <button onClick={() => onNavigate?.('map')} className="mt-5 rounded-md bg-space-100 px-4 py-2 text-sm font-semibold text-space-950 hover:bg-space-50">Open Mars map</button>
        </section>
      </main>
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-space-800 bg-ink p-4"><p className="text-xs text-space-200">{label}</p><p className="mt-2 font-mono text-xl tabular">{value}</p></div>
}
