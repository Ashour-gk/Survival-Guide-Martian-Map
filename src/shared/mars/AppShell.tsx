import React from 'react'
import { Bell, LogOut } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import { Account, ROLE_LABEL, Role } from './auth'
import { MarsLogo } from './MarsLogo'

export type Screen = 'dashboard' | 'map' | 'submissions' | 'hud'

const NAV: Record<Role, { id: Screen; label: string }[]> = {
  astronaut: [
    { id: 'dashboard', label: 'Mission' },
    { id: 'map', label: 'Map & planner' },
    { id: 'submissions', label: 'My submissions' },
  ],
  researcher: [
    { id: 'map', label: 'Map & datasets' },
    { id: 'submissions', label: 'My observations' },
  ],
  admin: [
    { id: 'dashboard', label: 'Crew mission' },
    { id: 'map', label: 'Map & layers' },
    { id: 'submissions', label: 'My observations' },
  ],
}

type Props = {
  account: Account
  current: Screen
  alerts?: number
  onNavigate?: (s: Screen) => void
  onSignOut?: () => void
  children: React.ReactNode
}

export function AppShell({ account, current, alerts = 0, onNavigate, onSignOut, children }: Props) {
  const reduceMotion = useReducedMotion()
  return (
    <div className="flex h-screen flex-col bg-space-950 text-space-50">
      <header className="flex items-center gap-4 border-b border-space-800 bg-ink px-4 sm:px-5">
        <div className="flex shrink-0 items-center gap-2.5 py-2.5">
          <MarsLogo className="h-8 w-8" alt="" />
          <div className="leading-tight">
            <p className="text-[13px] font-semibold tracking-wide whitespace-nowrap">MARS EXPLORER</p>
            <p className="hidden text-[11px] text-space-200 whitespace-nowrap sm:block">Interplanetary Survival Guide</p>
          </div>
        </div>

        <nav className="flex min-w-0 flex-1 gap-1 self-stretch overflow-x-auto" aria-label="Primary">
          {NAV[account.role].map((n) => {
            const active = n.id === current
            return (
              <button
                key={n.id}
                onClick={() => onNavigate?.(n.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative px-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 ${
                  active ? 'text-space-50' : 'text-space-200 hover:text-space-50'
                }`}
              >
                {n.label}
                {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-space-100" />}
              </button>
            )
          })}
        </nav>

        <button
          aria-label={`${alerts} notifications`}
          className="relative hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-space-100 transition-colors duration-150 hover:bg-space-900 sm:flex"
        >
          <Bell className="h-4 w-4" />
          {alerts > 0 && (
            <span className="absolute top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-hazard px-0.5 text-[9px] font-bold text-ink">
              {alerts}
            </span>
          )}
        </button>
        <div className="hidden shrink-0 text-right leading-tight md:block">
          <p className="text-[13px] font-medium whitespace-nowrap">{account.name}</p>
          <p className="text-[11px] text-space-200 whitespace-nowrap">
            {account.id} · {ROLE_LABEL[account.role]}
          </p>
        </div>
        <button
          onClick={onSignOut}
          aria-label="Sign out"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-space-100 transition-colors duration-150 hover:bg-space-900"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={current} className="h-full" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -5 }} transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
