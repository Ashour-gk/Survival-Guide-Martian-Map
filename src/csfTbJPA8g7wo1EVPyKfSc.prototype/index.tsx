import React, { useEffect, useState } from 'react'

import SignIn from '../nGQEzvYZeFRpwahzjSiYjA.frame'
import AstronautDashboard from '../iojYqCbgFmsCQ8Cf372w9e.frame'
import ExplorerMap from '../w6UCYFncpJp1EtVqCyyGGR.frame'
import SubmitObservation from '../1QjDPGZ28P77pH2a5deMFg.frame'
import SubmissionsReview from '../tMH4ctxtaU9ZCoU5C72QaC.frame'
import MarswalkHud from '../pdbnojx78LPgxoQ8ChTdzS.frame'
import { Screen } from '../shared/mars/AppShell'
import { Account, can, Role } from '../shared/mars/auth'
import { Pt } from '../shared/mars/data'
import { Observation } from '../shared/mars/observations'
import { Stop } from '../shared/mars/risk'
import { api } from '../shared/mars/api'
import MarsIntro from '../shared/mars/MarsIntro'

const IDS = {
  signin: 'nGQEzvYZeFRpwahzjSiYjA',
  dashboard: 'iojYqCbgFmsCQ8Cf372w9e',
  map: 'w6UCYFncpJp1EtVqCyyGGR',
  submit: '1QjDPGZ28P77pH2a5deMFg',
  submissions: 'tMH4ctxtaU9ZCoU5C72QaC',
  hud: 'pdbnojx78LPgxoQ8ChTdzS',
} as const
type View = keyof typeof IDS | 'intro'

function readUrlView(): View | null {
  const value = new URLSearchParams(window.location.search).get('view')
  return value === 'intro' || value === 'signin' || value === 'dashboard' || value === 'map' || value === 'submit' || value === 'submissions' || value === 'hud' ? value : null
}

/** The size every frame draws at, unless one exports its own. */
export const viewport = 'web'

export const folders = [
  { id: 'access', name: 'Access', frames: ['nGQEzvYZeFRpwahzjSiYjA'] },
  { id: 'field', name: 'Field operations', frames: ['iojYqCbgFmsCQ8Cf372w9e', 'w6UCYFncpJp1EtVqCyyGGR', '1QjDPGZ28P77pH2a5deMFg', 'pdbnojx78LPgxoQ8ChTdzS'] },
  { id: 'observations', name: 'Observations', frames: ['tMH4ctxtaU9ZCoU5C72QaC'] },
]

export const args = {
  lmst: '13:00',
}

export const argTypes = {
  lmst: { control: 'radio', options: ['07:00', '10:00', '13:00', '16:00'] },
}

type Props = Partial<typeof args> & { start?: string }

// Mirrors route guards the API enforces: a role never reaches a screen it has no permission for.
function allowed(view: View, role: Role) {
  if (view === 'submit') return can(role, 'observation.create')
  if (view === 'hud' || view === 'dashboard') return role !== 'researcher'
  return true
}

const home = (_role: Role): View => 'map'

export default function MarsExplorer(props: Props) {
  const { lmst, start } = { ...args, ...props }
  const startView = (Object.entries(IDS).find(([, id]) => id === start)?.[0] as View | undefined) ?? null
  const wasReload = performance.getEntriesByType('navigation').some((entry) => (entry as PerformanceNavigationTiming).type === 'reload')
  const requestedView = wasReload ? 'intro' : startView ?? readUrlView()

  const [account, setAccount] = useState<Account | null>(null)
  const [view, setViewState] = useState<View>(requestedView ?? 'intro')
  const [observations, setObservations] = useState<Observation[]>([])
  const [stops, setStops] = useState<Stop[]>([])
  const [routeReady, setRouteReady] = useState(false)
  const [point, setPoint] = useState<Pt | null>(null)
  const [apiSiteId, setApiSiteId] = useState<string | undefined>()

  const setView = (next: View) => {
    setViewState(next)
    const url = new URL(window.location.href)
    if (next === 'intro') url.searchParams.delete('view')
    else url.searchParams.set('view', next)
    if (url.href !== window.location.href) window.history.pushState({ view: next }, '', url)
  }

  useEffect(() => {
    const onPopState = () => {
      const next = readUrlView() ?? (account ? home(account.role) : 'intro')
      setViewState(account && !allowed(next, account.role) ? 'map' : next)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [account])

  useEffect(() => {
    if (wasReload) {
      const url = new URL(window.location.href)
      if (url.searchParams.has('view')) {
        url.searchParams.delete('view')
        window.history.replaceState({ view: 'intro' }, '', url)
      }
    }
    api.me().then((user) => {
      const role: Role = user.role === 'Administrator' ? 'admin' : user.role.toLowerCase() as Role
      setAccount({ id: user.crewId, name: user.displayName, callsign: user.crewId, role, status: 'active', email: '', mission: '', lastActive: '' })
      const requested = requestedView ?? home(role)
      setViewState(allowed(requested, role) ? requested : 'map')
      void api.observations().then(({ items }) => setObservations(items)).catch(() => setObservations([]))
      void api.myRoute().then(({ stops: savedStops }) => { setStops(savedStops); setRouteReady(true) }).catch(() => setRouteReady(false))
    }).catch(() => {})
    api.sites().then(({ items }) => {
      const site = items.find((item) => item.slug === 'jezero-crater') ?? items[0]
      if (!site) return
      setApiSiteId(site.id)
    }).catch(() => {})
  // Initial URL state is intentionally captured once, so a signed-in reload restores the selected screen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!account || !routeReady || !['admin', 'astronaut'].includes(account.role)) return
    const timer = window.setTimeout(() => { void api.saveMyRoute(stops).catch(() => {}) }, 500)
    return () => window.clearTimeout(timer)
  }, [account, routeReady, stops])

  const go = (s: Screen | View) => {
    if (!account) return setView('signin')
    setView(allowed(s as View, account.role) ? (s as View) : 'map')
  }
  const signOut = () => {
    void api.logout().catch(() => {})
    setAccount(null)
    setView('signin')
  }

  if (view === 'intro') return <MarsIntro onSignIn={() => setView(account ? home(account.role) : 'signin')} />

  if (!account || view === 'signin') {
    return (
      <SignIn
        onSignIn={(user) => {
          const role: Role = user.role === 'Administrator' ? 'admin' : user.role.toLowerCase() as Role
          setAccount({ id: user.crewId, name: user.displayName, callsign: user.crewId, role, status: 'active', email: '', mission: '', lastActive: '' })
          setView(home(role))
        }}
      />
    )
  }

  const role = account.role
  const shared = { account, onNavigate: go, onSignOut: signOut }
  const sep = false

  if (view === 'hud' && allowed('hud', role)) {
    return <MarswalkHud state={sep ? 'sep-warning' : 'nominal'} stops={stops} onBack={() => go('map')} />
  }
  if (view === 'dashboard' && allowed('dashboard', role)) {
    return (
      <AstronautDashboard
        {...shared}
        state={sep ? 'emergency' : 'nominal'}
        observations={observations}
        stops={stops}
        onOpenHud={() => go('hud')}
      />
    )
  }
  if (view === 'submit' && allowed('submit', role)) {
    return (
      <SubmitObservation
        {...shared}
        state="default"
        point={point}
        onSubmit={(o) => setObservations((os) => [o, ...os])}
        onCancel={() => go('map')}
        onDone={() => go('submissions')}
      />
    )
  }
  if (view === 'submissions') {
    return <SubmissionsReview {...shared} observations={observations} />
  }
  return (
    <ExplorerMap
      {...shared}
      role={role}
      apiSiteId={apiSiteId}
      lmst={lmst}
      observations={observations}
      stops={stops}
      onStopsChange={setStops}
      onStart={() => go('hud')}
      onAddObservation={(pt) => {
        setPoint(pt)
        go('submit')
      }}
    />
  )
}
