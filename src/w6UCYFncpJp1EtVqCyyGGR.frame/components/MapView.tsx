import React, { useEffect, useRef, useState } from 'react'
import { animate, motion, useDragControls, useMotionValue } from 'framer-motion'
import { Download, MapPinPlus, Minus, MousePointer2, Pin as PinIcon, Plus, Route, Ruler, Search, X } from 'lucide-react'

import { can, Role } from '../../shared/mars/auth'
import { BASEMAPS, BasemapId, formatLatLon, fromLatLon, LayerCategoryId, LayerId, Lmst, MAP_H, MAP_W, M_PER_UNIT, Pt, toLatLon } from '../../shared/mars/data'
import { HazardHover, MapTool, MarsMap, Pin } from '../../shared/mars/MarsMap'
import { fullRoute, routeLength } from '../../shared/mars/model'
import { Observation } from '../../shared/mars/observations'
import { HazardFeature, MedaLayerFeature } from '../../shared/mars/api'
import { stopName, Stop } from '../../shared/mars/risk'

type Props = {
  apiSiteId?: string
  role: Role
  layers: Record<LayerId, boolean>
  opacity: Partial<Record<LayerId, number>>
  basemap: BasemapId
  lmst: Lmst
  sep: boolean
  stops: Stop[]
  altRoute: Stop[] | null
  selected: number | null
  onSelect: (i: number) => void
  onMoveStop?: (i: number, p: Pt) => void
  observations: Observation[]
  hazards?: HazardFeature[]
  medaLayers?: MedaLayerFeature[]
  probeCategory?: LayerCategoryId
  selectedObs: string | null
  onSelectObs: (id: string) => void
  tool: MapTool
  onTool: (t: MapTool) => void
  onMapClick: (p: Pt) => void
  measure: Pt[]
  onClearMeasure: () => void
  pins: Pin[]
  onClearPins: () => void
  draft: Pt | null
}

const ZOOMS = [1, 1.5, 2.25, 3]
const settle = { type: 'spring', stiffness: 305, damping: 33 } as const

export function MapView(props: Props) {
  const { role, apiSiteId, layers, opacity, basemap, lmst, sep, stops, tool, onTool, measure, pins } = props
  const wellRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [zi, setZi] = useState(0)
  const [cursor, setCursor] = useState<Pt | null>(null)
  const [query, setQuery] = useState('')
  const [searchPin, setSearchPin] = useState<Pt | null>(null)
  const [searchMsg, setSearchMsg] = useState<string | null>(null)
  const [hoveredHazard, setHoveredHazard] = useState<HazardHover | null>(null)
  const [hoveredMeda, setHoveredMeda] = useState<MedaLayerFeature | null>(null)
  const [selectedMeda, setSelectedMeda] = useState<MedaLayerFeature | null>(null)
  const controls = useDragControls()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const zoom = ZOOMS[zi]

  useEffect(() => {
    const el = wellRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const bx = ((zoom - 1) * size.w) / 2
  const by = ((zoom - 1) * size.h) / 2
  useEffect(() => {
    animate(x, Math.max(-bx, Math.min(bx, x.get())), settle)
    animate(y, Math.max(-by, Math.min(by, y.get())), settle)
  }, [bx, by, x, y])

  const pxPerUnit = Math.max(size.w / MAP_W, size.h / MAP_H) * zoom
  const barM = zoom >= 2 ? 50 : 100
  const barPx = (barM / M_PER_UNIT) * pxPerUnit
  const readAt = cursor ?? searchPin
  const activeProduct = BASEMAPS.find((item) => item.id === basemap)
  const activeMeda = selectedMeda ?? hoveredMeda

  useEffect(() => { setSelectedMeda(null); setHoveredMeda(null) }, [props.probeCategory])

  const search = () => {
    const m = query.match(/(-?\d+(?:\.\d+)?)\s*°?\s*([NS])?[\s,]+(-?\d+(?:\.\d+)?)\s*°?\s*([EW])?/i)
    if (!m) return setSearchMsg('Enter latitude, longitude — e.g. -4.7052, 137.3912')
    let lat = parseFloat(m[1])
    let lon = parseFloat(m[3])
    if (m[2]?.toUpperCase() === 'S') lat = -Math.abs(lat)
    if (m[4]?.toUpperCase() === 'W') lon = 360 - Math.abs(lon)
    const p = fromLatLon(lat, lon)
    if (p.x < 0 || p.y < 0 || p.x > MAP_W || p.y > MAP_H) {
      setSearchPin(null)
      return setSearchMsg('Outside the loaded tile: 4.70000–4.71903°S, 137.38000–137.40544°E')
    }
    setSearchPin(p)
    setSearchMsg(null)
  }

  const exportData = () => {
    const ll = (p: Pt) => {
      const { lat, lon } = toLatLon(p)
      return [Number(lon.toFixed(6)), Number(lat.toFixed(6))]
    }
    const fc = {
      type: 'FeatureCollection',
      crs: { type: 'name', properties: { name: 'IAU_2015:49900 (Mars 2000 planetocentric)' } },
      properties: { source: 'User-created route and pins; Mars Trek basemap' },
      features: [
        { type: 'Feature', properties: { kind: 'route', stops: stops.map(stopName) }, geometry: { type: 'LineString', coordinates: fullRoute(stops).map(ll) } },
        ...props.observations.map((o) => ({
          type: 'Feature',
          properties: { kind: 'observation', id: o.id, title: o.title, category: o.category, status: o.status },
          geometry: { type: 'Point', coordinates: ll(o) },
        })),
        ...pins.map((p) => ({ type: 'Feature', properties: { kind: 'pin', label: p.label }, geometry: { type: 'Point', coordinates: ll(p) } })),
        ...(measure.length > 1 ? [{ type: 'Feature', properties: { kind: 'measurement', metres: Math.round(routeLength(measure)) }, geometry: { type: 'LineString', coordinates: measure.map(ll) } }] : []),
      ],
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'mars-explorer-route.geojson'
    a.click()
    URL.revokeObjectURL(url)
  }

  const tools: { id: MapTool; label: string; icon: React.ReactNode; allowed: boolean }[] = [
    { id: 'select', label: 'Select & pan', icon: <MousePointer2 className="h-4 w-4" />, allowed: true },
    { id: 'observe', label: 'Add observation', icon: <MapPinPlus className="h-4 w-4" />, allowed: can(role, 'observation.create') },
    { id: 'measure', label: 'Measure distance', icon: <Ruler className="h-4 w-4" />, allowed: true },
    { id: 'pin', label: 'Drop pin', icon: <PinIcon className="h-4 w-4" />, allowed: true },
    { id: 'route', label: 'Add route stop', icon: <Route className="h-4 w-4" />, allowed: can(role, 'route.edit') },
  ]

  const mLen = routeLength(measure)
  const hint =
    tool === 'observe'
      ? 'Click where you made the observation. The form opens with these coordinates.'
      : tool === 'measure'
        ? measure.length > 1
          ? `${Math.round(mLen)} m straight-line distance over ${measure.length - 1} segment${measure.length > 2 ? 's' : ''}`
          : 'Click two or more points to measure straight-line distance.'
        : tool === 'pin'
          ? `Click to drop a custom marker${pins.length ? ` · ${pins.length} placed` : ''}.`
          : tool === 'route'
            ? 'Click to add a stop at the end of the route. Drag stops to move them.'
            : null

  return (
    <div className="flex min-h-0 flex-col lg:flex-1">
      {/* Tool strip */}
      <div className="flex flex-wrap items-center gap-2 border-b border-space-800 px-3 py-2">
        <div className="flex rounded-md bg-ink p-0.5" role="toolbar" aria-label="Map tools">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => t.allowed && onTool(t.id)}
              disabled={!t.allowed}
              aria-pressed={tool === t.id}
              title={t.allowed ? t.label : `${t.label} — not permitted for your role`}
              aria-label={t.label}
              className={`flex h-8 w-8 items-center justify-center rounded transition-colors duration-150 disabled:cursor-not-allowed disabled:text-space-700 ${
                tool === t.id ? 'bg-space-100 text-space-950' : 'text-space-100 hover:bg-space-900 hover:text-space-50'
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>
        <form
          className="flex min-w-[180px] flex-1 items-center gap-2 rounded-md border border-space-800 bg-ink px-2.5"
          onSubmit={(e) => {
            e.preventDefault()
            search()
          }}
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-space-200" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Go to lat, lon — e.g. -4.7052, 137.3912"
            aria-label="Search by Martian coordinates"
            className="h-8 min-w-0 flex-1 bg-transparent font-mono text-[12px] text-space-50 outline-none placeholder:text-space-300"
          />
          {searchPin && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearchPin(null)
                setQuery('')
              }}
              className="text-space-200 hover:text-space-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>
        <button
          onClick={exportData}
          className="flex h-8 items-center gap-1.5 rounded-md border border-space-700 px-2.5 text-[12px] font-medium whitespace-nowrap text-space-50 transition-colors duration-150 hover:bg-space-900"
        >
          <Download className="h-3.5 w-3.5" /> GeoJSON
        </button>
      </div>
      {(hint || searchMsg) && (
        <div className="flex items-center gap-3 border-b border-space-800 bg-space-900 px-4 py-1.5 text-[12px]">
          <p className={searchMsg ? 'text-caution' : 'text-space-50'}>{searchMsg ?? hint}</p>
          {tool === 'measure' && measure.length > 0 && (
            <button onClick={props.onClearMeasure} className="ml-auto font-medium text-space-100 hover:text-space-50">
              Clear
            </button>
          )}
          {tool === 'pin' && pins.length > 0 && (
            <button onClick={props.onClearPins} className="ml-auto font-medium text-space-100 hover:text-space-50">
              Clear pins
            </button>
          )}
        </div>
      )}

      <div ref={wellRef} className="relative h-[420px] shrink-0 overflow-hidden bg-ink sm:h-[520px] lg:h-auto lg:min-h-0 lg:flex-1">
        <motion.div
          className={`absolute inset-0 ${tool === 'select' && zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
          style={{ x, y }}
          animate={{ scale: zoom }}
          transition={settle}
          drag={zoom > 1 && tool === 'select'}
          dragListener={false}
          dragControls={controls}
          dragConstraints={{ left: -bx, right: bx, top: -by, bottom: by }}
          dragElastic={0.06}
          dragMomentum={false}
          onPointerDown={(e) => zoom > 1 && tool === 'select' && controls.start(e)}
        >
          <MarsMap
            layers={layers}
            opacity={opacity}
            basemap={basemap}
            lmst={lmst}
            sep={sep}
            stops={stops}
            altRoute={props.altRoute}
            selected={props.selected}
            onSelect={props.onSelect}
            onMoveStop={props.onMoveStop}
            onProbe={setCursor}
            observations={props.observations}
            hazards={props.hazards}
            medaLayers={props.medaLayers}
            dataCategory={props.probeCategory}
            onMedaHover={setHoveredMeda}
            onMedaSelect={setSelectedMeda}
            onHazardHover={setHoveredHazard}
            selectedObs={props.selectedObs}
            onSelectObs={props.onSelectObs}
            tool={tool}
            onMapClick={props.onMapClick}
            measure={measure}
            pins={pins}
            searchPin={searchPin}
            draft={props.draft}
          />
        </motion.div>

        {/* Probe: every layer at one point */}
        <div className="pointer-events-none absolute top-3 left-3 hidden w-[290px] rounded-lg bg-ink/95 p-3 text-[12px] ring-1 ring-space-800 backdrop-blur-sm sm:block">
          {activeMeda ? <>
            <div className="flex items-start justify-between gap-2"><p className="font-semibold text-space-50">{activeMeda.properties.name}</p>{selectedMeda && <button className="pointer-events-auto text-space-300 hover:text-white" onClick={() => setSelectedMeda(null)} aria-label="Close MEDA archive details"><X className="h-3.5 w-3.5" /></button>}</div>
            <p className="mt-1 text-space-100">Sensors: {activeMeda.properties.sensors.join(' · ')}</p>
            <p className="mt-1 text-[11px] text-space-200">{activeMeda.properties.provenance}</p>
            <p className="mt-1 text-[10px] text-space-300">Blue W / amber R marker: published Perseverance landing coordinates; not the rover&apos;s present position.</p>
            <a className="pointer-events-auto mt-2 inline-block text-space-100 underline underline-offset-2 hover:text-white" href={activeMeda.properties.sourceUrl} target="_blank" rel="noreferrer">MEDA dataset documentation</a>
            <div className="pointer-events-auto mt-2 flex flex-wrap gap-x-3 gap-y-1">{activeMeda.properties.dataLinks.map((link) => <a key={link.label} className="text-space-100 underline underline-offset-2 hover:text-white" href={link.url} target="_blank" rel="noreferrer">{link.label} data index</a>)}</div>
          </> : hoveredHazard ? <>
            <p className="font-semibold text-space-50">{hoveredHazard.name}</p>
            <p className="mt-1 text-space-100"><span className="text-space-300">Type:</span> {hoveredHazard.type}</p>
            <p className="text-space-100"><span className="text-space-300">Cause/source:</span> {hoveredHazard.cause || hoveredHazard.source}</p>
            {hoveredHazard.severity !== undefined && <p className="text-space-100"><span className="text-space-300">Severity:</span> {hoveredHazard.severity}</p>}
            <p className="text-[10px] text-space-300">Source status: {hoveredHazard.provenance}</p>
          </> : readAt ? <>
            <p className="font-medium text-space-50">Map location</p>
            <p className="mt-0.5 font-mono text-[11px] text-space-200">{formatLatLon(readAt)}</p>
            <p className="mt-2 border-t border-space-800 pt-2 text-[11px] text-space-100">Map product: {activeProduct?.name} · {activeProduct?.resolution}</p>
            {props.probeCategory === 'weather' && <p className="mt-1 text-[11px] text-space-200">Weather: MEDA archive measurements are available at Perseverance's rover site; no local reading is connected to this cursor position.</p>}
            {props.probeCategory === 'radiation' && <p className="mt-1 text-[11px] text-space-200">Radiation: MEDA RDS archive is rover-site UV/dust data; no coordinate dose reading is connected here.</p>}
          </> : <p className="leading-snug text-space-100">Move over the map for coordinates and active layer details. Hover a hazard zone for its type and source.</p>}
        </div>

        <span className="absolute top-3 right-3 flex h-9 w-9 flex-col items-center justify-center rounded-lg bg-ink/90 font-mono text-[11px] font-semibold text-space-50 ring-1 ring-space-800">
          <svg width="10" height="8" viewBox="0 0 10 8" aria-hidden>
            <path d="M5 0l5 8H0z" fill="currentColor" />
          </svg>
          N
        </span>
        <div className="absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-lg bg-ink/90 ring-1 ring-space-800">
          <button
            aria-label="Zoom in"
            disabled={zi === ZOOMS.length - 1}
            onClick={() => setZi((z) => Math.min(ZOOMS.length - 1, z + 1))}
            className="flex h-9 w-9 items-center justify-center text-space-50 transition-colors duration-150 hover:bg-space-900 disabled:text-space-700"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className="h-px bg-space-800" />
          <button
            aria-label="Zoom out"
            disabled={zi === 0}
            onClick={() => setZi((z) => Math.max(0, z - 1))}
            className="flex h-9 w-9 items-center justify-center text-space-50 transition-colors duration-150 hover:bg-space-900 disabled:text-space-700"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-end gap-2">
          <div className="rounded-md bg-ink/90 px-2.5 py-1.5 ring-1 ring-space-800">
            <div className="h-1.5 border-x-2 border-b-2 border-space-50" style={{ width: barPx }} />
            <p className="mt-1 font-mono text-[11px] tabular text-space-50">{barM} m</p>
          </div>
          <p className="rounded-md bg-ink/90 px-2.5 py-1.5 font-mono text-[11px] tabular text-space-50 ring-1 ring-space-800">
            {cursor ? formatLatLon(cursor) : `×${zoom} zoom`}
          </p>
        </div>
      </div>
    </div>
  )
}
