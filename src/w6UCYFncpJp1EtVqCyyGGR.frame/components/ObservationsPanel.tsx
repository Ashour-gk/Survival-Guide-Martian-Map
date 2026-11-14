import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, MapPinPlus, Paperclip } from 'lucide-react'

import { formatLatLon } from '../../shared/mars/data'
import { CATEGORIES, categoryLabel, Observation, ReviewStatus, STATUS_LABEL } from '../../shared/mars/observations'
import { CategoryIcon, StatusBadge } from '../../shared/mars/ui'

type Props = {
  observations: Observation[]
  selected: string | null
  onSelect: (id: string | null) => void
  canCreate: boolean
  onAdd: () => void
}

export function ObservationsPanel({ observations, selected, onSelect, canCreate, onAdd }: Props) {
  const [cat, setCat] = useState('all')
  const [status, setStatus] = useState('all')
  const [who, setWho] = useState('all')

  const contributors = [...new Set(observations.map((o) => o.contributorId))]
  const list = observations.filter(
    (o) =>
      (cat === 'all' || o.category === cat) &&
      (status === 'all' || o.status === status) &&
      (who === 'all' || o.contributorId === who)
  )
  const obs = observations.find((o) => o.id === selected)

  return (
    <div className="relative flex flex-col lg:min-h-0 lg:flex-1">
      <AnimatePresence initial={false} mode="popLayout">
        {obs ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
          >
            <Detail obs={obs} onBack={() => onSelect(null)} />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col lg:min-h-0 lg:flex-1"
          >
            <div className="grid grid-cols-2 gap-2 border-b border-space-800 px-5 py-3">
              <Select label="Category" value={cat} onChange={setCat} options={[['all', 'All categories'], ...CATEGORIES.map((c) => [c.id, c.label] as [string, string])]} />
              <Select
                label="Status"
                value={status}
                onChange={setStatus}
                options={[['all', 'Any status'], ...(Object.keys(STATUS_LABEL) as ReviewStatus[]).map((s) => [s, STATUS_LABEL[s]] as [string, string])]}
              />
              <Select
                label="Contributor"
                value={who}
                onChange={setWho}
                options={[['all', 'Anyone'], ...contributors.map((c) => [c, c] as [string, string])]}
              />
            </div>
            <ul className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {list.map((o) => (
                <li key={o.id} className="border-b border-space-800/60">
                  <button onClick={() => onSelect(o.id)} className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors duration-150 hover:bg-space-900">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-space-800 text-space-50">
                      <CategoryIcon id={o.category} className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-space-50">{o.title}</span>
                      <span className="block truncate text-[12px] text-space-200">
                        {o.contributorId} · Sol {o.sol}
                      </span>
                      <span className="mt-1 block">
                        <StatusBadge status={o.status} />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {list.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-space-200">No observations match these filters.</li>}
            </ul>
            {canCreate && (
              <div className="border-t border-space-800 px-5 py-3">
                <button
                  onClick={onAdd}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-space-100 py-2.5 text-[14px] font-semibold text-space-950 transition-colors duration-150 hover:bg-space-50"
                >
                  <MapPinPlus className="h-4 w-4" /> Add observation on map
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Detail({ obs, onBack }: { obs: Observation; onBack: () => void }) {
  return (
    <article className="px-5 pt-3 pb-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] font-medium text-space-100 transition-colors duration-150 hover:text-space-50">
        <ArrowLeft className="h-3.5 w-3.5" /> All observations
      </button>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-space-200">
        <CategoryIcon id={obs.category} className="h-3.5 w-3.5" />
        {categoryLabel(obs.category)} · {obs.id}
      </p>
      <h2 className="mt-1 text-[17px] leading-snug font-semibold">{obs.title}</h2>
      <div className="mt-1.5">
        <StatusBadge status={obs.status} />
      </div>

      {obs.photos.length > 0 && (
        <div className="mt-3 grid gap-2">
          {obs.photos.map((src) => (
            <img key={src} src={src} alt={obs.title} className="aspect-video w-full rounded-md object-cover" />
          ))}
        </div>
      )}

      <p className="mt-3 text-[13px] leading-relaxed text-space-50">{obs.description}</p>

      <dl className="mt-4 space-y-2 text-[12px]">
        <Meta k="Location" v={obs.locationName} />
        <Meta k="Coordinates" v={formatLatLon(obs)} mono />
        <Meta k="Elevation" v="No verified elevation source" />
        <Meta k="Contributor" v={obs.contributorId} />
        <Meta k="Submitted" v={`Sol ${obs.sol} · ${obs.lmst} LMST`} />
        <Meta k="Geology" v={obs.geology} />
        <Meta k="Minerals" v={obs.minerals} />
        <Meta k="Water / ice" v={obs.waterIndicators} />
        <Meta k="Terrain" v={obs.terrain} />
        <Meta k="Hazard class" v={obs.hazardClass} warn={obs.hazardClass === 'high'} />
        {obs.tempC !== null && <Meta k="Temperature" v={`${obs.tempC} °C · crew reading`} mono />}
        {obs.doseUSvH !== null && <Meta k="Dose rate" v={`${obs.doseUSvH} µSv/h · crew reading`} mono />}
      </dl>

      {obs.attachments.length > 0 && (
        <ul className="mt-4 space-y-1">
          {obs.attachments.map((a) => (
            <li key={a.name} className="flex items-center gap-2 text-[12px] text-space-100">
              <Paperclip className="h-3.5 w-3.5" />
              <span className="truncate font-mono">{a.name}</span>
              <span className="ml-auto text-space-200">{a.size}</span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-5 text-[13px] font-semibold">Related NASA datasets</h3>
      <ul className="mt-1.5 space-y-1 text-[12px] text-space-100">
        {obs.relatedDatasets.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>

      {obs.annotations.length > 0 && (
        <>
          <h3 className="mt-5 text-[13px] font-semibold">Science annotations</h3>
          <ul className="mt-1.5 space-y-2">
            {obs.annotations.map((a, i) => (
              <li key={i} className="border-l-2 border-space-300 pl-3 text-[12px] leading-snug">
                <p className="text-space-50">{a.text}</p>
                <p className="mt-0.5 text-space-200">
                  {a.authorId}{a.sol !== undefined ? ` · Sol ${a.sol}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  )
}

function Meta({ k, v, mono, warn }: { k: string; v: string; mono?: boolean; warn?: boolean }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-3">
      <dt className="text-space-200">{k}</dt>
      <dd className={`${mono ? 'font-mono tabular' : ''} ${warn ? 'text-hazard' : 'text-space-50'} capitalize-first`}>{v}</dd>
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block min-w-0">
      <span className="text-[11px] text-space-200">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 block w-full truncate rounded-md border border-space-800 bg-ink px-2 py-1.5 text-[12px] text-space-50 outline-none focus:border-space-300"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}
