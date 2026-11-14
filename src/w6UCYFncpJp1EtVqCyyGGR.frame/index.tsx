import React, { useEffect, useState } from 'react'
import { AppShell, Screen } from '../shared/mars/AppShell'
import { Account, accountFor, can, Role } from '../shared/mars/auth'
import { BasemapId, LayerCategoryId, LayerId, Lmst, Pt } from '../shared/mars/data'
import { MapTool, Pin } from '../shared/mars/MarsMap'
import { Observation } from '../shared/mars/observations'
import { Stop } from '../shared/mars/risk'
import { api, HazardFeature, LayerDto, MedaLayerFeature } from '../shared/mars/api'
import { LayerPanel } from './components/LayerPanel'
import { MapView } from './components/MapView'
import { RoutePlanner } from './components/RoutePlanner'
import { ObservationsPanel } from './components/ObservationsPanel'

export const args = { role: 'astronaut' }
export const argTypes = { role: { control: 'radio', options: ['astronaut', 'researcher', 'admin'] } }

type Props = Partial<typeof args> & {
  account?: Account; apiSiteId?: string; observations?: Observation[]; stops?: Stop[]
  onStopsChange?: (stops: Stop[]) => void; onAddObservation?: (point: Pt) => void
  onNavigate?: (screen: Screen) => void; onSignOut?: () => void
}

export default function ExplorerMap(props: Props) {
  const role = (props.account?.role ?? props.role ?? args.role) as Role
  const account = props.account ?? accountFor(role)
  const [siteId, setSiteId] = useState(props.apiSiteId)
  const [siteName, setSiteName] = useState('Jezero Crater')
  const [catalog, setCatalog] = useState<LayerDto[]>([])
  const [hazards, setHazards] = useState<HazardFeature[]>([])
  const [medaLayers, setMedaLayers] = useState<MedaLayerFeature[]>([])
  const [hazardStatus, setHazardStatus] = useState<'loading' | 'api' | 'preview' | 'unavailable'>('loading')
  const [category, setCategory] = useState<LayerCategoryId>(() => {
    try { return localStorage.getItem('mars.layer-category') as LayerCategoryId || 'optical' } catch { return 'optical' }
  })
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({ topo: false, thermal: false, geology: false, mineral: false, radiation: false, traverse: false, nav: false, observations: true })
  const [opacity] = useState<Partial<Record<LayerId, number>>>({})
  const [basemap, setBasemap] = useState<BasemapId>(() => {
    try {
      const saved = localStorage.getItem('mars.basemap')
      return saved && ['ctxJezero', 'ctxJezeroPreliminary', 'hiriseJezero', 'molaHrsc', 'themisDay', 'themisNight', 'molaRoughness', 'tesDust', 'tesThermalInertia', 'tesPyroxene', 'tesPlagioclase', 'tesGlassClay', 'mola', 'viking'].includes(saved) ? saved as BasemapId : 'ctxJezero'
    } catch { return 'ctxJezero' }
  })
  const [stops, setStops] = useState<Stop[]>(props.stops ?? [])
  const [observations, setObservations] = useState<Observation[]>(props.observations ?? [])
  const [panel, setPanel] = useState<'route' | 'observations'>('route')
  const [selectedStop, setSelectedStop] = useState<number | null>(null)
  const [selectedObservation, setSelectedObservation] = useState<string | null>(null)
  const [tool, setTool] = useState<MapTool>('select')
  const [measure, setMeasure] = useState<Pt[]>([])
  const [pins, setPins] = useState<Pin[]>([])
  const [draft, setDraft] = useState<Pt | null>(null)
  const lmst: Lmst = '13:00'

  useEffect(() => {
    api.sites().then(({ items }) => {
      const site = items.find((item) => item.id === props.apiSiteId) ?? items.find((item) => item.slug === 'jezero-crater') ?? items[0]
      if (site) { setSiteId(site.id); setSiteName(site.name) }
      else setHazardStatus('preview')
    }).catch(() => setHazardStatus('preview'))
  }, [props.apiSiteId])
  useEffect(() => { void api.medaMapLayers().then(({ features }) => setMedaLayers(features)).catch(() => setMedaLayers([])) }, [])
  useEffect(() => { if (siteId) void api.layers(siteId).then(({ items }) => setCatalog(items)).catch(() => setCatalog([])) }, [siteId])
  useEffect(() => {
    if (!siteId) return
    let active = true
    setHazardStatus('loading')
    void api.hazards(siteId).then(({ features }) => {
      if (!active) return
      setHazards(features)
      setHazardStatus(features.length ? 'api' : 'preview')
    }).catch(() => {
      if (!active) return
      setHazards([])
      setHazardStatus('preview')
    })
    return () => { active = false }
  }, [siteId])
  useEffect(() => { if (props.stops) setStops(props.stops) }, [props.stops])
  useEffect(() => { if (props.observations) setObservations(props.observations) }, [props.observations])
  useEffect(() => { try { localStorage.setItem('mars.basemap', basemap) } catch { /* storage is optional */ } }, [basemap])

  const visible = observations.filter((item) => item.contributorId === account.id)
  const saveStops = (next: Stop[]) => { setStops(next); props.onStopsChange?.(next) }
  const handleMapClick = (point: Pt) => {
    if (tool === 'measure') setMeasure((current) => [...current, point])
    if (tool === 'pin') setPins((current) => [...current, { id: crypto.randomUUID(), label: `Pin ${current.length + 1}`, ...point }])
    if (tool === 'route' && can(role, 'route.edit')) saveStops([...stops, point])
    if (tool === 'observe' && can(role, 'observation.create')) { setDraft(point); props.onAddObservation?.(point) }
  }

  return (
    <AppShell account={account} current="map" alerts={0} onNavigate={props.onNavigate} onSignOut={props.onSignOut}>
      <div className="flex h-full flex-col">
        <header className="border-b border-space-800 px-4 py-2.5"><h1 className="text-sm font-semibold">{siteName}</h1><p className="text-xs text-space-200">NASA Mars Trek WMTS · orbital data products</p></header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:grid lg:grid-cols-[252px_minmax(0,1fr)_350px] lg:overflow-hidden">
          <LayerPanel className="order-2 lg:order-1" layers={layers} opacity={opacity} basemap={basemap} lmst={lmst} sep={false} canManage={false} apiLayers={catalog} apiHazardCount={hazards.length} hazardStatus={hazardStatus} onCategoryChange={setCategory} onToggle={(id) => setLayers((current) => ({ ...current, [id]: !current[id] }))} onOpacity={() => {}} onBasemap={setBasemap} />
          <section className="order-1 flex min-h-[640px] flex-col border-space-800 lg:order-2 lg:min-h-0 lg:border-x">
            <MapView role={role} apiSiteId={siteId} layers={layers} opacity={opacity} basemap={basemap} lmst={lmst} sep={false} stops={stops} altRoute={null} selected={selectedStop} onSelect={setSelectedStop} onMoveStop={can(role, 'route.edit') ? (i, point) => saveStops(stops.map((stop, index) => index === i ? { ...stop, ...point } : stop)) : undefined} observations={visible} hazards={hazards} medaLayers={medaLayers} probeCategory={category} selectedObs={selectedObservation} onSelectObs={(id) => { setSelectedObservation(id); setPanel('observations') }} tool={tool} onTool={setTool} onMapClick={handleMapClick} measure={measure} onClearMeasure={() => setMeasure([])} pins={pins} onClearPins={() => setPins([])} draft={draft} />
          </section>
          <aside className="order-3 flex flex-col border-t border-space-800 lg:min-h-0 lg:border-t-0">
            <div className="flex border-b border-space-800 px-2" role="tablist">
              {([['route', 'My route'], ['observations', `Observations · ${visible.length}`]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={panel === id} onClick={() => setPanel(id)} className={`relative px-3 py-3 text-[13px] font-medium ${panel === id ? 'text-space-50' : 'text-space-200 hover:text-space-50'}`}>{label}{panel === id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-space-100" />}</button>)}
            </div>
            {panel === 'route' ? <RoutePlanner stops={stops} canEdit={can(role, 'route.edit')} selected={selectedStop} onSelect={setSelectedStop} onStopsChange={saveStops} /> : <ObservationsPanel observations={visible} selected={selectedObservation} onSelect={setSelectedObservation} canCreate={can(role, 'observation.create')} onAdd={() => setTool('observe')} />}
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
