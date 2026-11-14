import React, { useMemo, useRef, useState } from 'react'

import {
  BASEMAPS,
  BasemapId,
  fromLatLon,
  GEO_POLYS,
  GEO_UNITS,
  HAZARDS,
  LayerCategoryId,
  LayerId,
  Lmst,
  MAP_H,
  MAP_W,
  MINERALS,
  M_PER_UNIT,
  ORIGIN,
  Pt,
  SHELTER,
  TRAVERSE,
} from './data'
import { fullRoute, routeLength } from './model'
import { Observation } from './observations'
import { HazardFeature } from './api'
import type { MedaLayerFeature } from './api'
import { CATEGORY_ICON } from './ui'

export type MapTool = 'select' | 'observe' | 'measure' | 'pin' | 'route'
export type Pin = { id: string; label: string; x: number; y: number }
export type HazardHover = { name: string; type: string; cause: string; source: string; provenance: string; severity?: number }

type Props = {
  layers: Partial<Record<LayerId, boolean>>
  opacity?: Partial<Record<LayerId, number>>
  basemap?: BasemapId
  lmst: Lmst
  sep?: boolean
  stops: Pt[]
  start?: Pt | null
  altRoute?: Pt[] | null
  selected?: number | null
  onSelect?: (i: number) => void
  onMoveStop?: (i: number, p: Pt) => void
  onProbe?: (p: Pt | null) => void
  observations?: Observation[]
  hazards?: HazardFeature[]
  medaLayers?: MedaLayerFeature[]
  dataCategory?: LayerCategoryId
  onMedaHover?: (feature: MedaLayerFeature | null) => void
  onMedaSelect?: (feature: MedaLayerFeature) => void
  onHazardHover?: (hazard: HazardHover | null) => void
  selectedObs?: string | null
  onSelectObs?: (id: string) => void
  tool?: MapTool
  onMapClick?: (p: Pt) => void
  measure?: Pt[]
  pins?: Pin[]
  searchPin?: Pt | null
  draft?: Pt | null
  astronaut?: Pt
  compact?: boolean
  className?: string
}

const C = {
  ink: '#011d33',
  light: '#e6f3f8',
  route: '#a9d6e5',
  hazard: '#ff7a59',
  caution: '#ffc857',
  mid: '#2c7da0',
}

const NASA_LAYER_IDS: Record<BasemapId, string> = {
  ctxJezero: 'JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0',
  ctxJezeroPreliminary: 'Jezero_CTX_BlockAdj_dd',
  hiriseJezero: 'JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd',
  viking: 'Mars_Viking_MDIM21_ClrMosaic_global_232m',
  mola: 'Mars_MGS_MOLA_ClrShade_merge_global_463m',
  molaHrsc: 'Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw',
  themisDay: 'THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018',
  themisNight: 'THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018',
  molaRoughness: 'mola_roughness',
  tesDust: 'TES_Dust',
  tesThermalInertia: 'TES_Thermal_Inertia',
  tesPyroxene: 'TES_Clinopyroxene',
  tesPlagioclase: 'TES_Plagioclase',
  tesGlassClay: 'TES_Glass_Clay',
}

export function MarsMap({
  layers,
  opacity = {},
  basemap = 'molaHrsc',
  lmst,
  sep = false,
  stops,
  start = null,
  altRoute = null,
  selected = null,
  onSelect,
  onMoveStop,
  onProbe,
  observations = [],
  hazards = [],
  medaLayers = [],
  dataCategory,
  onMedaHover,
  onMedaSelect,
  onHazardHover,
  selectedObs = null,
  onSelectObs,
  tool = 'select',
  onMapClick,
  measure = [],
  pins = [],
  searchPin = null,
  draft = null,
  astronaut,
  compact = false,
  className = '',
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [cursor, setCursor] = useState<Pt | null>(null)
  const [tileResults, setTileResults] = useState<Record<string, boolean>>({})

  const thermal: { x: number; y: number; v: number }[] = []
  const dose: { x: number; y: number; v: number }[] = []
  const lines: { level: number; d: string; major: boolean }[] = []
  const route = fullRoute(stops, start)
  const apiHazardPolygons = hazards.flatMap((feature) => {
    const polygons = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates as number[][][]]
      : feature.geometry.coordinates as number[][][][]
    return polygons.map((polygon, index) => ({
      id: `${feature.id}-${index}`,
      name: feature.properties.name,
      points: polygon[0].map(([lon, lat]) => fromLatLon(lat, lon)),
      title: `${feature.properties.name} · ${feature.properties.kind} · severity ${feature.properties.severity} · ${feature.properties.provenance}`,
      detail: { name: feature.properties.name, type: feature.properties.kind, cause: feature.properties.source, source: feature.properties.source, provenance: feature.properties.provenance, severity: feature.properties.severity },
    }))
  })
  const blur = BASEMAPS.find((b) => b.id === basemap)?.blur ?? 0
  const op = (id: LayerId, d: number) => (opacity[id] ?? 1) * d
  const nasaTiles = useMemo(() => {
    const source = basemap === 'ctxJezero'
      ? { id: 'ctxJezero', z: 13, extension: 'png' }
      : basemap === 'ctxJezeroPreliminary'
        ? { id: 'ctxJezeroPreliminary', z: 12, extension: 'png' }
        : basemap === 'hiriseJezero'
          ? { id: 'hiriseJezero', z: 13, extension: 'png' }
        : basemap === 'molaHrsc'
          ? { id: 'molaHrsc', z: 8, extension: 'jpg' }
          : basemap === 'themisDay'
            ? { id: 'themisDay', z: 9, extension: 'png' }
            : basemap === 'themisNight'
              ? { id: 'themisNight', z: 9, extension: 'png' }
                : ['molaRoughness', 'tesDust', 'tesThermalInertia', 'tesPyroxene', 'tesPlagioclase', 'tesGlassClay'].includes(basemap)
                  ? { id: basemap, z: 1, extension: 'png' }
              : { id: basemap, z: 7, extension: 'jpg' }
    const cols = 2 ** (source.z + 1)
    const rows = 2 ** source.z
    const lonPerUnit = M_PER_UNIT / 58960
    const latPerUnit = M_PER_UNIT / 59160
    const east = ORIGIN.lon + MAP_W * lonPerUnit
    const south = ORIGIN.lat - MAP_H * latPerUnit
    const firstCol = Math.floor(((ORIGIN.lon + 180) / 360) * cols)
    const lastCol = Math.floor(((east + 180) / 360) * cols)
    const firstRow = Math.floor(((90 - ORIGIN.lat) / 180) * rows)
    const lastRow = Math.floor(((90 - south) / 180) * rows)
    const tileLonSpan = 360 / cols
    const tileLatSpan = 180 / rows
    const tiles: { key: string; href: string; directHref: string; x: number; y: number; width: number; height: number }[] = []
    for (let row = firstRow; row <= lastRow; row++) {
      for (let column = firstCol; column <= lastCol; column++) {
        const west = -180 + column * tileLonSpan
        const north = 90 - row * tileLatSpan
        tiles.push({
          key: `${source.id}-${source.z}-${row}-${column}`,
          href: `/api/v1/map/tiles/${source.id}/${source.z}/${row}/${column}.${source.extension}`,
          directHref: `https://trek.nasa.gov/tiles/Mars/EQ/${NASA_LAYER_IDS[source.id]}/1.0.0/default/default028mm/${source.z}/${row}/${column}.${source.extension}`,
          x: (west - ORIGIN.lon) / lonPerUnit,
          y: (ORIGIN.lat - north) / latPerUnit,
          width: tileLonSpan / lonPerUnit,
          height: tileLatSpan / latPerUnit,
        })
      }
    }
    return tiles
  }, [basemap])
  React.useEffect(() => setTileResults({}), [basemap])
  const reportTile = (key: string, succeeded: boolean) => setTileResults((current) => current[key] === succeeded ? current : { ...current, [key]: succeeded })
  const tileResultCount = Object.keys(tileResults).length
  const loadedTileCount = Object.values(tileResults).filter(Boolean).length

  const toMap = (e: { clientX: number; clientY: number }): Pt | null => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: Math.max(4, Math.min(MAP_W - 4, pt.x)), y: Math.max(4, Math.min(MAP_H - 4, pt.y)) }
  }

  const s = compact ? 1.5 : 1

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      preserveAspectRatio="xMidYMid slice"
      className={`block h-full w-full select-none ${tool !== 'select' ? 'cursor-crosshair' : ''} ${className}`}
      onPointerMove={(e) => {
        const p = toMap(e)
        if (!p) return
        if (dragging !== null) return onMoveStop?.(dragging, p)
        if (onProbe) {
          setCursor(p)
          onProbe(p)
        }
      }}
      onPointerUp={(e) => {
        if (dragging !== null) svgRef.current?.releasePointerCapture(e.pointerId)
        setDragging(null)
      }}
      onPointerLeave={() => {
        if (dragging === null) {
          setCursor(null)
          onProbe?.(null)
        }
        onMedaHover?.(null)
      }}
      onClick={(e) => {
        if (tool === 'select' || !onMapClick) return
        const p = toMap(e)
        if (p) onMapClick(p)
      }}
    >
      <defs>
        <pattern id="mx-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="rgba(255,122,89,0.16)" />
          <line x1="0" y1="0" x2="0" y2="10" stroke={C.hazard} strokeWidth="2.5" />
        </pattern>
        <pattern id="mx-dots" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1.6" fill={C.light} />
        </pattern>
        <filter id="mx-res" x="0" y="0" width="100%" height="100%">
          <feGaussianBlur stdDeviation={blur} edgeMode="duplicate" />
        </filter>
      </defs>

      <rect width={MAP_W} height={MAP_H} fill="#102b3f" />
      {nasaTiles.map((tile) => (
        <image
          key={tile.key}
          href={tile.href}
          x={tile.x}
          y={tile.y}
          width={tile.width}
          height={tile.height}
          preserveAspectRatio="none"
          filter={blur ? 'url(#mx-res)' : undefined}
          onLoad={() => reportTile(tile.key, true)}
          onError={(event) => {
            const image = event.currentTarget
            if (image.dataset.directFallback !== 'used') {
              image.dataset.directFallback = 'used'
              image.setAttribute('href', tile.directHref)
              return
            }
            reportTile(tile.key, false)
          }}
        />
      ))}
      {tileResultCount === nasaTiles.length && loadedTileCount === 0 && <g pointerEvents="none"><rect x="250" y="335" width="500" height="80" rx="12" fill={C.ink} fillOpacity="0.94" stroke={C.hazard} /><text x="500" y="370" textAnchor="middle" fill={C.light} fontSize="17" fontWeight="600">NASA map tiles failed to load</text><text x="500" y="396" textAnchor="middle" fill={C.light} fontSize="13">Check that the API is running and the selected layer has coverage here.</text></g>}

      {layers.geology && (
        <g opacity={op('geology', 0.5)}>
          <rect width={MAP_W} height={MAP_H} fill={GEO_UNITS.Mf.color} />
          {GEO_POLYS.slice()
            .reverse()
            .map((p) => (
              <polygon key={p.unit} points={p.pts.map((q) => q.join(',')).join(' ')} fill={GEO_UNITS[p.unit].color} stroke={C.ink} strokeWidth={1.5} />
            ))}
        </g>
      )}
      {layers.geology && !compact && (
        <g fontFamily="IBM Plex Mono, monospace" fontSize="15" fontWeight="600" opacity={opacity.geology ?? 1}>
          <text x="840" y="70" fill={C.light}>Hs</text>
          <text x="470" y="250" fill={C.ink}>Bx</text>
          <text x="120" y="640" fill={C.light}>Ad</text>
          <text x="80" y="250" fill={C.ink}>Mf</text>
        </g>
      )}

      {layers.thermal && (
        <g opacity={op('thermal', 0.62)} shapeRendering="crispEdges">
          {thermal.map((c) => (
            <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={25} height={25} fill={thermalColor(c.v)} />
          ))}
        </g>
      )}

      {layers.radiation && (
        <g opacity={op('radiation', 0.55)} shapeRendering="crispEdges">
          {dose.map((c) => (
            <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={25} height={25} fill={doseColor(c.v)} />
          ))}
        </g>
      )}

      {layers.mineral && (
        <g opacity={op('mineral', 0.9)}>
          {MINERALS.map((m) => (
            <g key={m.id}>
              <polygon points={m.pts.map((q) => q.join(',')).join(' ')} fill={m.color} fillOpacity={0.28} stroke={m.color} strokeWidth={2} strokeDasharray="2 4" strokeLinecap="round" />
              {!compact && (
                <text
                  x={m.pts.reduce((t, q) => t + q[0], 0) / m.pts.length}
                  y={m.pts.reduce((t, q) => t + q[1], 0) / m.pts.length}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="600"
                  fontFamily="IBM Plex Sans, sans-serif"
                  fill={C.light}
                  stroke={C.ink}
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {m.name}
                </text>
              )}
            </g>
          ))}
        </g>
      )}

      {layers.topo && (
        <g fill="none" strokeLinecap="round" opacity={opacity.topo ?? 1}>
          {lines.map((l) => (
            <path key={l.level} d={l.d} stroke={C.light} strokeOpacity={l.major ? 0.95 : 0.55} strokeWidth={l.major ? 1.8 : 0.9} />
          ))}
        </g>
      )}

      {layers.traverse && (
        <polyline
          points={TRAVERSE.map((q) => q.join(',')).join(' ')}
          fill="none"
          stroke={C.light}
          strokeWidth={3}
          strokeDasharray="1 7"
          strokeLinecap="round"
          opacity={op('traverse', 0.9)}
        />
      )}

      {layers.nav && (apiHazardPolygons.length ? apiHazardPolygons.map((h) => (
        <polygon key={h.id} points={h.points.map((q) => `${q.x},${q.y}`).join(' ')} fill="url(#mx-hatch)" stroke={C.hazard} strokeWidth={2} strokeDasharray="6 4" opacity={opacity.nav ?? 1} tabIndex={0} aria-label={`${h.detail.type}. Cause/source: ${h.detail.cause}`} onPointerEnter={() => onHazardHover?.(h.detail)} onPointerLeave={() => onHazardHover?.(null)} onFocus={() => onHazardHover?.(h.detail)} onBlur={() => onHazardHover?.(null)}>
          <title>{h.title}</title>
        </polygon>
      )) : HAZARDS.map((h) => (
        <polygon key={h.id} points={h.pts.map((q) => q.join(',')).join(' ')} fill="url(#mx-hatch)" stroke={C.hazard} strokeWidth={2} strokeDasharray="6 4" opacity={opacity.nav ?? 1} tabIndex={0} aria-label={`${h.type}. Cause: ${h.cause}`} onPointerEnter={() => onHazardHover?.({ name: h.name, type: h.type, cause: h.cause, source: 'UI geometry preview', provenance: 'Preview' })} onPointerLeave={() => onHazardHover?.(null)} onFocus={() => onHazardHover?.({ name: h.name, type: h.type, cause: h.cause, source: 'UI geometry preview', provenance: 'Preview' })} onBlur={() => onHazardHover?.(null)}>
          <title>{h.name} · {h.type} · {h.cause}</title>
        </polygon>
      )))}

      {medaLayers.filter((feature) => feature.properties.category === dataCategory).map((feature) => {
        const [lon, lat] = feature.geometry.coordinates
        const point = fromLatLon(lat, lon)
        const weather = feature.properties.category === 'weather'
        const color = weather ? '#61a5c2' : C.caution
        const short = weather ? 'W' : 'R'
        return <g
          key={feature.id}
          transform={`translate(${point.x} ${point.y})`}
          role="button"
          tabIndex={0}
          aria-label={`${feature.properties.name}. ${feature.properties.provenance}`}
          onPointerEnter={() => onMedaHover?.(feature)}
          onFocus={() => onMedaHover?.(feature)}
          onClick={(event) => { event.stopPropagation(); onMedaSelect?.(feature) }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onMedaSelect?.(feature)
            }
          }}
          style={{ cursor: 'help' }}
        >
          <circle r="22" fill={color} fillOpacity="0.16" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" />
          <circle r="12" fill={C.ink} stroke={color} strokeWidth="2.5" />
          <text y="4" textAnchor="middle" fill={color} fontSize="11" fontWeight="700" fontFamily="IBM Plex Mono, monospace">{short}</text>
          <title>{feature.properties.name} · {feature.properties.sensors.join(', ')} · Archive reference only</title>
        </g>
      })}

      {(layers.radiation || sep) && (
        <g transform={`translate(${SHELTER.x} ${SHELTER.y}) scale(${s})`}>
          <circle r={14} fill={C.ink} stroke={C.route} strokeWidth={2.5} />
          <path d="M0 -7 L6 -4 V1 C6 5 3 7 0 8 C-3 7 -6 5 -6 1 V-4 Z" fill={C.route} />
        </g>
      )}

      {altRoute && layers.nav && (
        <polyline
          points={fullRoute(altRoute, start).map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={C.light}
          strokeWidth={3}
          strokeDasharray="4 6"
          strokeOpacity={0.85}
        />
      )}

      {layers.nav && (
        <g opacity={opacity.nav ?? 1}>
          {route.slice(0, -1).map((a, i) => {
            const b = route[i + 1]
            const bad = segmentBad(a, b)
            return (
              <g key={i}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.ink} strokeWidth={7 * s} strokeLinecap="round" />
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={bad ? C.hazard : C.route}
                  strokeWidth={3.5 * s}
                  strokeLinecap="round"
                  strokeDasharray={i === route.length - 2 ? '10 8' : undefined}
                />
              </g>
            )
          })}
        </g>
      )}

      {/* Start */}
      {start && <g transform={`translate(${start.x} ${start.y}) scale(${s})`}>
        <rect x={-15} y={-11} width={30} height={22} rx={4} fill={C.light} stroke={C.ink} strokeWidth={2.5} />
        <text y={5} textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="IBM Plex Mono, monospace" fill="#012a4a">S</text>
      </g>}

      {/* Route stops */}
      {stops.map((p, i) => {
          const isSel = selected === i
          const r = (isSel ? 17 : 14) * s
          return (
            <g
              key={i}
              transform={`translate(${p.x} ${p.y})`}
              style={{ cursor: onMoveStop ? (dragging === i ? 'grabbing' : 'grab') : 'default', touchAction: 'none' }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => {
                if (!onMoveStop && !onSelect) return
                e.stopPropagation()
                onSelect?.(i)
                if (onMoveStop) {
                  svgRef.current?.setPointerCapture(e.pointerId)
                  setDragging(i)
                }
              }}
            >
              <circle r={r + 10} fill="transparent" />
              <circle r={r} fill={isSel ? C.light : C.ink} stroke={C.route} strokeWidth={isSel ? 4 : 3} />
              <text
                y={5 * s}
                textAnchor="middle"
                fontSize={15 * s}
                fontWeight="700"
                fontFamily="IBM Plex Mono, monospace"
                fill={isSel ? '#012a4a' : C.light}
              >
                {i + 1}
              </text>
            </g>
          )
        })}

      {/* Observations */}
      {layers.observations &&
        observations.map((o) => {
          const Icon = CATEGORY_ICON[o.category]
          const sel = selectedObs === o.id
          const ring = o.hazardClass === 'high' ? C.hazard : C.caution
          return (
            <g
              key={o.id}
              transform={`translate(${o.x} ${o.y}) scale(${s})`}
              style={{ cursor: onSelectObs ? 'pointer' : 'default' }}
              opacity={opacity.observations ?? 1}
              onClick={(e) => {
                e.stopPropagation()
                onSelectObs?.(o.id)
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {sel && <circle r={22} fill="none" stroke={C.light} strokeWidth={2} />}
              <path d="M0 16 L-6 8 A13 13 0 1 1 6 8 Z" fill={sel ? C.light : '#012a4a'} stroke={ring} strokeWidth={2.5} strokeDasharray="4 3" transform="translate(0 -10)" />
              <Icon x={-8} y={-17} width={16} height={16} color={sel ? '#012a4a' : C.light} strokeWidth={2.2} />
            </g>
          )
        })}

      {/* Measure */}
      {measure.length > 0 && (
        <g pointerEvents="none">
          <polyline points={measure.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={C.ink} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={measure.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={C.caution} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {measure.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={5} fill={C.caution} stroke={C.ink} strokeWidth={2} />
          ))}
          {measure.length > 1 && (
            <text
              x={measure[measure.length - 1].x + 10}
              y={measure[measure.length - 1].y - 10}
              fontSize="15"
              fontWeight="600"
              fontFamily="IBM Plex Mono, monospace"
              fill={C.caution}
              stroke={C.ink}
              strokeWidth={4}
              paintOrder="stroke"
            >
              {Math.round(routeLength(measure))} m
            </text>
          )}
        </g>
      )}

      {/* Custom pins */}
      {pins.map((p) => (
        <g key={p.id} transform={`translate(${p.x} ${p.y})`} pointerEvents="none">
          <path d="M0 0 L-7 -12 A9 9 0 1 1 7 -12 Z" fill={C.light} stroke={C.ink} strokeWidth={2} />
          <text x={12} y={-12} fontSize="13" fontWeight="600" fontFamily="IBM Plex Sans, sans-serif" fill={C.light} stroke={C.ink} strokeWidth={3.5} paintOrder="stroke">
            {p.label}
          </text>
        </g>
      ))}

      {searchPin && (
        <g transform={`translate(${searchPin.x} ${searchPin.y})`} pointerEvents="none">
          <circle r={18} fill="none" stroke={C.caution} strokeWidth={2.5} />
          <circle r={4} fill={C.caution} />
        </g>
      )}

      {draft && (
        <g transform={`translate(${draft.x} ${draft.y})`} pointerEvents="none">
          <circle r={24} fill="none" stroke={C.light} strokeWidth={2} strokeDasharray="5 4" />
          <path d="M0 16 L-6 8 A13 13 0 1 1 6 8 Z" fill={C.light} stroke="#012a4a" strokeWidth={2.5} transform="translate(0 -10)" />
        </g>
      )}

      {astronaut && (
        <g transform={`translate(${astronaut.x} ${astronaut.y})`}>
          <circle r={26} fill="none" stroke={C.light} strokeWidth={2} strokeOpacity={0.6} />
          <circle r={11} fill={C.light} stroke={C.ink} strokeWidth={3} />
        </g>
      )}

      {cursor && dragging === null && (
        <g pointerEvents="none" stroke={C.light} strokeWidth={1.5}>
          <line x1={cursor.x - 16} y1={cursor.y} x2={cursor.x - 5} y2={cursor.y} />
          <line x1={cursor.x + 5} y1={cursor.y} x2={cursor.x + 16} y2={cursor.y} />
          <line x1={cursor.x} y1={cursor.y - 16} x2={cursor.x} y2={cursor.y - 5} />
          <line x1={cursor.x} y1={cursor.y + 5} x2={cursor.x} y2={cursor.y + 16} />
        </g>
      )}
    </svg>
  )
}

export function segmentBad(a: Pt, b: Pt) {
  void a
  void b
  return false
}
