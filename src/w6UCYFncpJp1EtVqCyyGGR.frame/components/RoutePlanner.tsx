import React from 'react'
import { MapPinned, Trash2 } from 'lucide-react'

import { M_PER_UNIT, Pt } from '../../shared/mars/data'
import { routeLength } from '../../shared/mars/model'
import { Stop } from '../../shared/mars/risk'

type Props = {
  stops: Stop[]
  canEdit: boolean
  selected: number | null
  onSelect: (i: number | null) => void
  onStopsChange: (s: Stop[]) => void
}

export function RoutePlanner({ stops, canEdit, selected, onSelect, onStopsChange }: Props) {
  const lengthM = routeLength(stops)
  return (
    <section className="flex flex-col gap-5 px-5 py-5">
      <div>
        <h2 className="text-[15px] font-semibold">Saved route</h2>
        <p className="mt-1 text-[12px] text-space-200">Routes save to your account. No rover position or verified terrain-risk source is connected.</p>
      </div>
      {stops.length === 0 ? (
        <div className="rounded-lg border border-dashed border-space-700 px-4 py-6 text-center">
          <MapPinned className="mx-auto h-5 w-5 text-space-200" />
          <p className="mt-3 text-[13px] font-medium">No route stops saved</p>
          <p className="mt-1 text-[12px] leading-5 text-space-200">Choose “Add route stop” on the map to place stops, then sign in to save your route.</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg bg-space-900 p-4">
            <p className="text-[12px] text-space-200">Straight-line distance between saved stops</p>
            <p className="mt-1 font-mono text-2xl tabular">{(lengthM / 1000).toFixed(2)} km</p>
            <p className="mt-2 text-[11px] leading-4 text-space-200">Distance uses the map scale only. Travel time, elevation, hazards, and crew safety are unavailable without verified route and terrain data.</p>
          </div>
          <ol className="space-y-1">
            {stops.map((stop, i) => (
              <li key={`${stop.x}-${stop.y}-${i}`} className={`flex items-center gap-2 rounded-md px-2 py-2 ${selected === i ? 'bg-space-800' : ''}`}>
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onSelect(i)}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-space-500 font-mono text-xs">{i + 1}</span>
                  <span className="min-w-0"><span className="block text-[13px]">Route stop {i + 1}</span><span className="block truncate font-mono text-[10px] text-space-200">{Math.round(stop.x * M_PER_UNIT)} m east · {Math.round(stop.y * M_PER_UNIT)} m south of tile origin</span></span>
                </button>
                {canEdit && <button aria-label={`Remove stop ${i + 1}`} onClick={() => { onStopsChange(stops.filter((_, j) => i !== j)); onSelect(null) }} className="rounded p-1.5 text-space-200 hover:bg-space-700 hover:text-space-50"><Trash2 className="h-3.5 w-3.5" /></button>}
              </li>
            ))}
          </ol>
        </>
      )}
      {!canEdit && <p className="text-[11px] text-space-200">Route editing is restricted to crew roles.</p>}
    </section>
  )
}
