import React, { useState } from 'react'
import { Info } from 'lucide-react'

import { BASEMAPS, BasemapId, LAYER_CATEGORIES, LayerCategoryId, LayerId, LAYERS, Lmst } from '../../shared/mars/data'
import { LayerDto } from '../../shared/mars/api'
import { ProvenanceBadge } from '../../shared/mars/ui'

type Props = {
  layers: Record<LayerId, boolean>; opacity: Partial<Record<LayerId, number>>; basemap: BasemapId; lmst: Lmst; sep: boolean; canManage: boolean
  apiLayers?: LayerDto[]; apiHazardCount?: number; hazardStatus?: 'loading' | 'api' | 'preview' | 'unavailable'; onToggle: (id: LayerId) => void; onOpacity: (id: LayerId, value: number) => void
  onCategoryChange?: (id: LayerCategoryId) => void
  onBasemap: (id: BasemapId) => void; className?: string
}

export function LayerPanel({ layers, basemap, onBasemap, apiLayers = [], onToggle, onCategoryChange, apiHazardCount = 0, hazardStatus = 'preview', className = '' }: Props) {
  const [category, setCategory] = useState<LayerCategoryId>(() => {
    try { return localStorage.getItem('mars.layer-category') as LayerCategoryId || 'optical' } catch { return 'optical' }
  })
  const [info, setInfo] = useState<LayerId | null>(null)
  const selectedCategory = LAYER_CATEGORIES.find((item) => item.id === category) ?? LAYER_CATEGORIES[0]
  const selectedProduct = BASEMAPS.find((item) => item.id === basemap)
  return (
    <aside className={`flex flex-col border-t border-space-800 lg:min-h-0 lg:overflow-y-auto lg:border-t-0 ${className}`}>
      <div className="px-4 pt-4">
        <h2 className="text-[13px] font-semibold">Mars data layers</h2>
        <div className="mt-2 grid grid-cols-2 gap-1" role="tablist" aria-label="Mars data layer categories">
          {LAYER_CATEGORIES.map((item) => <button key={item.id} role="tab" aria-selected={category === item.id} onClick={() => { setCategory(item.id); onCategoryChange?.(item.id); try { localStorage.setItem('mars.layer-category', item.id) } catch { /* storage is optional */ } }} className={`min-h-9 rounded-md border px-2 text-xs font-medium transition-colors ${category === item.id ? 'border-space-300 bg-space-100 text-space-950' : 'border-space-800 bg-ink text-space-200 hover:border-space-500 hover:text-space-50'}`}>{item.name}</button>)}
        </div>
        <p className="mt-2 text-[11px] leading-4 text-space-200">{selectedCategory.description}</p>
        {selectedCategory.products.length > 0 ? <div className="mt-3 space-y-1" role="radiogroup" aria-label={`${selectedCategory.name} map products`}>
          {selectedCategory.products.map((id) => {
            const base = BASEMAPS.find((item) => item.id === id)!
            const chosen = basemap === id
            return <button key={id} role="radio" aria-checked={chosen} onClick={() => onBasemap(id)} className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors ${chosen ? 'border-space-300 bg-space-900' : 'border-transparent hover:bg-space-900/60'}`}>
              <span className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border ${chosen ? 'border-space-100' : 'border-space-500'}`}>{chosen && <span className="h-1.5 w-1.5 rounded-full bg-space-100" />}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{base.name}</span><span className="block truncate font-mono text-[10px] text-space-300">{base.resolution}</span></span>
            </button>
          })}
          <p className="pt-1 text-[10px] leading-4 text-space-300">One raster product is shown at a time. Current: {selectedProduct?.name ?? 'none'}.</p>
        </div> : <div className="mt-3 rounded-md border border-space-700 bg-ink px-3 py-2 text-[11px] leading-4 text-space-200"><span className="mb-1 block font-semibold text-space-100">{selectedCategory.status}</span>{selectedCategory.id === 'weather' && <div className="mb-2 grid grid-cols-2 gap-1.5"><span className="rounded bg-space-900 px-2 py-1">Air / surface temperature</span><span className="rounded bg-space-900 px-2 py-1">Pressure</span><span className="rounded bg-space-900 px-2 py-1">Wind speed</span><span className="rounded bg-space-900 px-2 py-1">Relative humidity</span></div>}{selectedCategory.id === 'radiation' && <p className="mb-2">RDS measures UV radiation and dust at Perseverance. It does not provide ionizing dose or coverage for every map coordinate.</p>}<div className="mb-2 rounded border border-space-800 bg-space-900/60 px-2 py-1.5">Map marker: {selectedCategory.id === 'weather' ? 'W · MEDA weather archive' : 'R · MEDA radiation / dust archive'} at Perseverance&apos;s published landing-site reference. Hover or focus the marker for source links; this is not the rover&apos;s live position.</div><div className="space-y-1.5">{selectedCategory.archives?.map((archive) => <a key={archive.url} href={archive.url} target="_blank" rel="noreferrer" className="block text-space-100 underline decoration-space-500 underline-offset-2 transition-colors hover:text-white">{archive.label}</a>)}</div><p className="mt-2">NASA PDS links open the original product indexes. Weather readings are from the rover archive, not a map-wide forecast.</p></div>}
      </div>
      <div className="mx-4 mt-3 rounded-md border border-space-700 bg-ink px-3 py-2.5">
        <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">Route & hazard zones</span><button role="switch" aria-checked={layers.nav} onClick={() => onToggle('nav')} className={`flex h-[18px] w-8 shrink-0 items-center rounded-full p-0.5 ${layers.nav ? 'bg-space-100' : 'bg-space-800'}`} aria-label="Toggle route and hazard zones"><span className={`h-3.5 w-3.5 rounded-full ${layers.nav ? 'translate-x-3.5 bg-space-950' : 'bg-space-300'}`} /></button></div>
        <p className="mt-1 text-[10px] leading-4 text-space-200">{hazardStatus === 'loading' ? 'Loading site hazard records…' : hazardStatus === 'api' ? `${apiHazardCount} API hazard zone${apiHazardCount === 1 ? '' : 's'} loaded` : hazardStatus === 'preview' ? 'Two preview zones available; hover for type and source details' : 'Hazard service unavailable'}</p>
      </div>
      <h2 className="px-4 pb-1 pt-5 text-[13px] font-semibold">Crew observations</h2>
      <ul>
        {LAYERS.filter((layer) => layer.id === 'observations').map((layer) => {
          const catalog = apiLayers.find((item) => item.key === layer.id)
          const usable = true
          const opened = info === layer.id
          return <li key={layer.id} className="border-t border-space-800/70 first:border-t-0">
            <div className="flex items-start gap-2 px-4 py-2.5">
              <button role="switch" aria-checked={layers[layer.id]} onClick={() => onToggle(layer.id)} aria-label={`${layer.name} layer`} className={`mt-0.5 flex h-[18px] w-8 shrink-0 items-center rounded-full p-0.5 ${layers[layer.id] ? 'bg-space-100' : 'bg-space-800'}`}><span className={`h-3.5 w-3.5 rounded-full ${layers[layer.id] ? 'translate-x-3.5 bg-space-950' : 'bg-space-300'}`} /></button>
              <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="truncate text-sm">{layer.name}</span><ProvenanceBadge kind={usable ? 'crew' : 'unavailable'} /></div><p className="text-[11px] text-space-200">API-backed crew records</p></div>
              <button onClick={() => setInfo(opened ? null : layer.id)} aria-expanded={opened} aria-label={`About ${layer.name}`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-space-200 hover:bg-space-900 hover:text-space-50"><Info className="h-3.5 w-3.5" /></button>
            </div>
            {opened && <div className="space-y-1 px-4 pb-3 pl-14 text-[11px] leading-4 text-space-200"><p>{layer.explanation}</p>{catalog && <><p>Source: {catalog.sourceName}</p><p>Verification: {catalog.verificationStatus}</p><p>Citation: {catalog.citation}</p></>}</div>}
          </li>
        })}
      </ul>
      <p className="mt-auto px-4 py-4 text-[11px] leading-relaxed text-space-200">NASA Mars Trek orbital products are served through the project API. Layer availability varies by location and zoom.</p>
    </aside>
  )
}
