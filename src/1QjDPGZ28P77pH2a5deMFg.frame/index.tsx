import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ImagePlus, X } from 'lucide-react'

import { AppShell, Screen } from '../shared/mars/AppShell'
import { Account, accountFor } from '../shared/mars/auth'
import { formatLatLon, fromLatLon, MAP_H, MAP_W, Pt, toLatLon } from '../shared/mars/data'
import { MarsMap } from '../shared/mars/MarsMap'
import { CATEGORIES, CategoryId, HazardClass, Observation } from '../shared/mars/observations'
import { CategoryIcon } from '../shared/mars/ui'
import { ApiError, api } from '../shared/mars/api'

export const args = {
  state: 'default',
  category: 'other',
  title: '',
  x: 0,
  y: 0,
}

export const argTypes = {
  state: { control: 'select', options: ['default', 'invalid', 'submitting', 'submitted'] },
  category: { control: 'select', options: ['geology', 'water', 'mineral', 'rock', 'hazard', 'dust', 'temperature', 'radiation', 'unknown', 'other'] },
  title: { control: 'text' },
  x: { control: 'range', min: 0, max: 1000, step: 1 },
  y: { control: 'range', min: 0, max: 750, step: 1 },
}

type Props = Partial<typeof args> & {
  account?: Account
  point?: Pt | null
  onSubmit?: (o: Observation) => void
  onCancel?: () => void
  onDone?: () => void
  onNavigate?: (s: Screen) => void
  onSignOut?: () => void
}

type Form = {
  title: string
  category: CategoryId
  lat: string
  lon: string
  locationName: string
  description: string
  geology: string
  minerals: string
  waterIndicators: string
  environment: string
  tempC: string
  doseUSvH: string
  terrain: string
  hazardClass: HazardClass
  sol: string
  lmst: string
  notes: string
}

export default function SubmitObservation(props: Props) {
  const p = { ...args, ...props }
  const account = p.account ?? accountFor('astronaut')
  const start = p.point ?? { x: p.x, y: p.y }
  const ll = toLatLon(start)

  const [f, setF] = useState<Form>({
    title: p.title,
    category: p.category as CategoryId,
    lat: ll.lat.toFixed(5),
    lon: ll.lon.toFixed(5),
    locationName: '',
    description: '',
    geology: '',
    minerals: '',
    waterIndicators: '',
    environment: '',
    tempC: '',
    doseUSvH: '',
    terrain: '',
    hazardClass: 'none',
    sol: '',
    lmst: '',
    notes: '',
  })
  const [photos, setPhotos] = useState<{ name: string; url: string; file: File }[]>([])
  const [uploadError, setUploadError] = useState('')
  const [state, setState] = useState(p.state)
  React.useEffect(() => setState(p.state), [p.state])
  const [submittedId, setSubmittedId] = useState('')

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }))
  const point = useMemo(() => fromLatLon(parseFloat(f.lat), parseFloat(f.lon)), [f.lat, f.lon])
  const inTile = point.x >= 0 && point.y >= 0 && point.x <= MAP_W && point.y <= MAP_H

  const errors = validate(f, inTile)
  const showErrors = state === 'invalid'

  const submit = () => {
    if (Object.keys(errors).length) return setState('invalid')
    setState('submitting')
    setUploadError('')
    void (async () => {
      try {
        const result = await api.uploadObservation({
          title: f.title.trim(), category: f.category, lat: Number(f.lat), lon: Number(f.lon),
          locationName: f.locationName, description: f.description, geology: f.geology,
          minerals: f.minerals, waterIndicators: f.waterIndicators, environment: f.environment,
          tempC: f.tempC === '' ? null : Number(f.tempC), doseUSvH: f.doseUSvH === '' ? null : Number(f.doseUSvH),
          terrain: f.terrain, hazardClass: f.hazardClass, sol: Number(f.sol), lmst: f.lmst, notes: f.notes,
        }, photos.map((photo) => photo.file))
        const id = result.code
        setSubmittedId(id)
        photos.forEach((photo) => URL.revokeObjectURL(photo.url))
        setPhotos([])
        setState('submitted')
        p.onSubmit?.({
          id: result.id, code: result.code, title: f.title.trim(), category: f.category, x: point.x, y: point.y,
          locationName: f.locationName, description: f.description, geology: f.geology,
          minerals: f.minerals, waterIndicators: f.waterIndicators, environment: f.environment,
          tempC: f.tempC === '' ? null : Number(f.tempC), doseUSvH: f.doseUSvH === '' ? null : Number(f.doseUSvH),
          terrain: f.terrain, hazardClass: f.hazardClass, sol: Number(f.sol), lmst: f.lmst,
          contributorId: account.id, photos: result.files.map((file) => file.url), attachments: [],
          notes: f.notes, status: 'pending', annotations: [], relatedDatasets: [],
        })
      } catch (error) {
        setState('default')
        setUploadError(error instanceof ApiError && error.status === 401
          ? 'Your sign-in session expired. Sign in again, then retry the upload.'
          : error instanceof Error ? error.message : 'The observation could not be uploaded. Please retry.')
      }
    })()
  }

  const addPhotos = (selected: File[]) => {
    setUploadError('')
    // Some mobile browsers omit File.type for photos selected from the device library.
    // The API still verifies the image signature before saving it.
    const accepted = selected.filter((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      const supported = /^(image\/jpeg|image\/png|image\/webp)$/i.test(file.type) || ['jpg', 'jpeg', 'png', 'webp'].includes(extension ?? '')
      return supported && file.size > 0 && file.size <= 5 * 1024 * 1024
    })
    if (accepted.length !== selected.length) setUploadError('Choose JPEG, PNG, or WebP photos no larger than 5 MB each.')
    const remaining = 5 - photos.length
    if (accepted.length > remaining) setUploadError('You can upload up to 5 photos per observation.')
    setPhotos((current) => [...current, ...accepted.slice(0, remaining).map((file) => ({ name: file.name, url: URL.createObjectURL(file), file }))])
  }

  return (
    <AppShell account={account} current="map" onNavigate={p.onNavigate} onSignOut={p.onSignOut}>
      <div className="h-full overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          {state === 'submitted' ? (
            <motion.section
              key="done"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="mx-auto max-w-lg px-5 py-16 text-center"
            >
              <CheckCircle2 className="mx-auto h-10 w-10 text-route" />
                <h1 className="mt-4 text-[22px] font-semibold">Observation saved</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-space-100">
                <span className="font-mono text-space-50">{submittedId}</span> was saved in this browser.
              </p>
              <div className="mt-6 flex justify-center gap-2">
                <button
                  onClick={() => (p.onDone ? p.onDone() : setState('default'))}
                  className="rounded-md bg-space-100 px-4 py-2 text-[14px] font-semibold text-space-950 transition-colors duration-150 hover:bg-space-50"
                >
                  Track in My submissions
                </button>
                <button
                  onClick={p.onCancel}
                  className="rounded-md border border-space-700 px-4 py-2 text-[14px] font-medium text-space-50 transition-colors duration-150 hover:bg-space-900"
                >
                  Back to map
                </button>
              </div>
            </motion.section>
          ) : (
            <motion.div key="form" initial={false} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[12px] text-space-200">Add observation</p>
                  <h1 className="mt-0.5 text-[22px] font-semibold">New field observation</h1>
                </div>
                <p className="text-[12px] text-space-200">
                  Submitting as <span className="text-space-50">{account.name}</span> · <span className="font-mono">{account.id}</span>
                </p>
              </div>

              {showErrors && Object.keys(errors).length > 0 && (
                <p role="alert" className="mt-4 rounded-md border border-hazard/50 bg-hazard/10 px-3 py-2 text-[13px] text-space-50">
                  Fix {Object.keys(errors).length} field{Object.keys(errors).length > 1 ? 's' : ''} before submitting.
                </p>
              )}

              <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
                <form
                  className="space-y-8"
                  onSubmit={(e) => {
                    e.preventDefault()
                    submit()
                  }}
                >
                  <Section title="What you observed">
                    <Field label="Observation title" required error={showErrors ? errors.title : undefined}>
                      <input value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={90} className={input} />
                    </Field>
                    <div>
                      <p className="text-[13px] font-medium text-space-100">
                        Category <span className="text-hazard">*</span>
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5" role="radiogroup" aria-label="Category">
                        {CATEGORIES.map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            role="radio"
                            aria-checked={f.category === c.id}
                            onClick={() => set('category', c.id)}
                            className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-[12px] leading-tight transition-colors duration-150 ${
                              f.category === c.id ? 'border-space-100 bg-space-100 text-space-950' : 'border-space-800 text-space-100 hover:border-space-500'
                            }`}
                          >
                            <CategoryIcon id={c.id} className="h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0">{c.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <Field label="Scientific description" required error={showErrors ? errors.description : undefined}>
                      <textarea value={f.description} onChange={(e) => set('description', e.target.value)} rows={3} className={input} />
                    </Field>
                  </Section>

                  <Section title="Where">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Latitude (°N, planetocentric)" required error={showErrors ? errors.lat : undefined}>
                        <input value={f.lat} onChange={(e) => set('lat', e.target.value)} inputMode="decimal" className={`${input} font-mono`} />
                      </Field>
                      <Field label="Longitude (°E)" required error={showErrors ? errors.lon : undefined}>
                        <input value={f.lon} onChange={(e) => set('lon', e.target.value)} inputMode="decimal" className={`${input} font-mono`} />
                      </Field>
                    </div>
                    <Field label="Location name">
                      <input value={f.locationName} onChange={(e) => set('locationName', e.target.value)} className={input} />
                    </Field>
                  </Section>

                  <Section title="Science">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Geological characteristics">
                        <textarea value={f.geology} onChange={(e) => set('geology', e.target.value)} rows={2} className={input} />
                      </Field>
                      <Field label="Rock and mineral identification">
                        <textarea value={f.minerals} onChange={(e) => set('minerals', e.target.value)} rows={2} className={input} />
                      </Field>
                      <Field label="Possible water or ice indicators">
                        <textarea value={f.waterIndicators} onChange={(e) => set('waterIndicators', e.target.value)} rows={2} className={input} />
                      </Field>
                      <Field label="Environmental conditions">
                        <textarea value={f.environment} onChange={(e) => set('environment', e.target.value)} rows={2} className={input} />
                      </Field>
                    </div>
                  </Section>

                  <Section title="Readings and safety">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Temperature reading, °C" hint="Optional · your instrument" error={showErrors ? errors.tempC : undefined}>
                        <input value={f.tempC} onChange={(e) => set('tempC', e.target.value)} inputMode="decimal" className={`${input} font-mono`} />
                      </Field>
                      <Field label="Radiation reading, µSv/h" hint="Optional · dosimeter" error={showErrors ? errors.doseUSvH : undefined}>
                        <input value={f.doseUSvH} onChange={(e) => set('doseUSvH', e.target.value)} inputMode="decimal" placeholder="—" className={`${input} font-mono`} />
                      </Field>
                      <Field label="Terrain conditions">
                        <input value={f.terrain} onChange={(e) => set('terrain', e.target.value)} className={input} />
                      </Field>
                      <div>
                        <p className="text-[13px] font-medium text-space-100">Hazard classification</p>
                        <div className="mt-1.5 grid grid-cols-4 rounded-md bg-ink p-0.5" role="radiogroup" aria-label="Hazard classification">
                          {(['none', 'low', 'moderate', 'high'] as HazardClass[]).map((h) => (
                            <button
                              type="button"
                              key={h}
                              role="radio"
                              aria-checked={f.hazardClass === h}
                              onClick={() => set('hazardClass', h)}
                              className={`rounded py-1.5 text-[12px] font-medium capitalize transition-colors duration-150 ${
                                f.hazardClass === h ? (h === 'high' ? 'bg-hazard text-ink' : 'bg-space-100 text-space-950') : 'text-space-100 hover:text-space-50'
                              }`}
                            >
                              {h}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Field label="Sol" required error={showErrors ? errors.sol : undefined}>
                        <input value={f.sol} onChange={(e) => set('sol', e.target.value)} inputMode="numeric" className={`${input} font-mono`} />
                      </Field>
                      <Field label="Mission time (LMST)" required error={showErrors ? errors.lmst : undefined}>
                        <input value={f.lmst} onChange={(e) => set('lmst', e.target.value)} className={`${input} font-mono`} />
                      </Field>
                    </div>
                  </Section>

                  <Section title="Evidence">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Upload icon={<ImagePlus className="h-4 w-4" />} label="Add photographs" accept=".jpg,.jpeg,.png,.webp" onFiles={addPhotos} />
                    </div>
                    {photos.length > 0 && (
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {photos.map((ph) => (
                          <li key={ph.url} className="flex items-center gap-2 rounded-md border border-space-800 p-1.5 pr-2 text-[12px]">
                            <img src={ph.url} alt="" className="h-9 w-12 rounded object-cover" />
                            <span className="min-w-0 flex-1 truncate">{ph.name}</span>
                            <button type="button" aria-label={`Remove ${ph.name}`} onClick={() => { URL.revokeObjectURL(ph.url); setPhotos((ps) => ps.filter((x) => x !== ph)) }} className="text-space-200 hover:text-space-50">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-[12px] text-space-200">JPEG, PNG, or WebP · up to 5 photos · 5 MB each. Photos are saved in this browser.</p>
                    {uploadError && <p role="alert" className="text-[12px] text-hazard">{uploadError}</p>}
                    <Field label="Additional scientific notes">
                      <textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={input} />
                    </Field>
                  </Section>

                  <div className="flex flex-wrap gap-2 border-t border-space-800 pt-5">
                    <motion.button
                      type="submit"
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.12 }}
                      disabled={state === 'submitting'}
                      className="rounded-md bg-space-100 px-5 py-2.5 text-[14px] font-semibold text-space-950 transition-colors duration-150 hover:bg-space-50 disabled:opacity-70"
                    >
                      {state === 'submitting' ? 'Saving…' : 'Save observation'}
                    </motion.button>
                    <button
                      type="button"
                      onClick={p.onCancel}
                      className="rounded-md border border-space-700 px-5 py-2.5 text-[14px] font-medium text-space-50 transition-colors duration-150 hover:bg-space-900"
                    >
                      Cancel
                    </button>
                  </div>
                </form>

                {/* Location context */}
                <aside className="lg:sticky lg:top-6 lg:self-start">
                  <div className="overflow-hidden rounded-lg ring-1 ring-space-800">
                    <div className="aspect-[4/3] bg-ink">
                      <MarsMap
                        layers={{ topo: false, nav: false, observations: false }}
                        lmst="13:00"
                        stops={[]}
                        draft={inTile ? point : null}
                        tool="observe"
                        onMapClick={(q) => {
                          const g = toLatLon(q)
                          set('lat', g.lat.toFixed(5))
                          set('lon', g.lon.toFixed(5))
                        }}
                        compact
                      />
                    </div>
                    <p className="border-t border-space-800 px-3 py-2 font-mono text-[12px] text-space-50">
                      {inTile ? formatLatLon(point) : 'Outside loaded tile'}
                    </p>
                  </div>
                  <p className="mt-2 text-[12px] text-space-200">Click the map to move the point.</p>

                  <div className="mt-5 rounded-lg border border-space-800 p-3 text-[12px] leading-relaxed text-space-200">Verified elevation, geology, temperature, radiation, mineral, and hazard layers are not connected for this location.</div>
          <div className="mt-5 rounded-lg bg-space-900 p-4 text-[12px] leading-relaxed text-space-100">
                    <p className="font-semibold text-space-50">After you submit</p>
                    <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                      <li>The form checks your fields and coordinates in the browser.</li>
                      <li>Your observation and photos stay in this browser.</li>
                      <li>You can find it later under My observations on this device.</li>
                    </ol>
                  </div>
                </aside>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}

const input =
  'w-full rounded-md border border-space-800 bg-ink px-3 py-2 text-[14px] text-space-50 outline-none transition-colors duration-150 placeholder:text-space-300 focus:border-space-200'

function validate(f: Form, inTile: boolean) {
  const e: Partial<Record<keyof Form, string>> = {}
  if (f.title.trim().length < 4) e.title = 'Give it a title of at least 4 characters.'
  if (f.description.trim().length < 20) e.description = 'Describe what you saw in at least 20 characters.'
  const lat = parseFloat(f.lat)
  const lon = parseFloat(f.lon)
  if (Number.isNaN(lat) || lat < -90 || lat > 90) e.lat = 'Latitude must be between −90 and 90.'
  if (Number.isNaN(lon) || lon < 0 || lon >= 360) e.lon = 'Longitude must be 0–360 °E.'
  if (!e.lat && !e.lon && !inTile) e.lat = 'Point is outside the loaded mission tile.'
  if (f.tempC !== '' && (Number.isNaN(Number(f.tempC)) || Number(f.tempC) < -150 || Number(f.tempC) > 50)) e.tempC = 'Expected −150 to 50 °C.'
  if (f.doseUSvH !== '' && (Number.isNaN(Number(f.doseUSvH)) || Number(f.doseUSvH) < 0 || Number(f.doseUSvH) > 10000)) e.doseUSvH = 'Expected 0 to 10,000 µSv/h.'
  if (!/^\d+$/.test(f.sol)) e.sol = 'Sol is a whole number.'
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.lmst)) e.lmst = 'Use HH:MM.'
  return e
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 text-[15px] font-semibold">{title}</legend>
      {children}
    </fieldset>
  )
}

function Field({ label, hint, required, error, children }: { label: string; hint?: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="flex items-baseline justify-between gap-2 text-[13px] font-medium text-space-100">
        <span>
          {label} {required && <span className="text-hazard">*</span>}
        </span>
        {hint && <span className="text-[11.5px] font-normal text-space-200">{hint}</span>}
      </span>
      <span className={`mt-1.5 block ${error ? '[&>*]:border-hazard' : ''}`}>{children}</span>
      {error && <span className="mt-1 block text-[12px] text-hazard">{error}</span>}
    </label>
  )
}

function Upload({ icon, label, accept, onFiles }: { icon: React.ReactNode; label: string; accept: string; onFiles: (f: File[]) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-space-600 px-3 py-4 text-[13px] font-medium text-space-100 transition-colors duration-150 hover:border-space-300 hover:text-space-50">
      {icon}
      {label}
      <input type="file" multiple accept={accept} className="sr-only" onChange={(e) => onFiles(Array.from(e.target.files ?? []))} />
    </label>
  )
}

function Ctx({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-space-800 pb-1">
      <dt className="text-space-200">{k}</dt>
      <dd className="font-mono text-space-50 tabular whitespace-nowrap">{v}</dd>
    </div>
  )
}
