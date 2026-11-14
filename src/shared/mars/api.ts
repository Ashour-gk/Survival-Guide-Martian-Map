import { fromLatLon } from './data'
import type { Observation } from './observations'

/** Browser-only data adapter. User content stays on this device. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message) }
}

export type SignedInUser = { id: string; crewId: string; displayName: string; role: 'Administrator' | 'Astronaut' | 'Researcher'; status?: string }
export type DemoAccount = { crewId: string; password: string; label: string }
export type SiteDto = { id: string; slug: string; name: string; centerLat: number; centerLon: number; boundsJson: string; tileExtentM: number }
export type LayerDto = { id: string; key: string; title: string; kind: string; sourceName: string; resolutionM?: string; provenance: string; verificationStatus: string; enabled: boolean; citation: string }
export type PointDto = { elevation: { value: number; unit: string; provenance: string }; slope: { value: number; unit: string; provenance: string }; groundTempModelled: { value: number; unit: string; provenance: string }; doseModelled: { value: number; unit: string; provenance: string }; unit: { code: string; name: string; ti: number }; hazardZone: { name: string; kind: string; severity: number; provenance: string } | null }
export type ObservationUpload = { id: string; code: string; status: string; files: { id: string; name: string; mime: string; sizeBytes: number; sha256: string; url: string }[] }
export type RouteStop = { x: number; y: number }
export type HazardFeature = { type: 'Feature'; id: string; properties: { name: string; kind: string; severity: number; source: string; provenance: string }; geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] } }
export type MedaLayerFeature = { type: 'Feature'; id: string; geometry: { type: 'Point'; coordinates: [number, number] }; properties: { category: 'weather' | 'radiation'; name: string; sensors: string[]; sourceName: string; sourceUrl: string; dataLinks: { label: string; url: string }[]; provenance: string } }
export type MedaLayerCollection = { type: 'FeatureCollection'; source: string; spatialNote: string; features: MedaLayerFeature[] }

const DEMO: DemoAccount = { crewId: 'MARS-01', password: 'explore', label: 'Local demo account' }
const USER_KEY = 'mars.frontend.user'
const ROUTE_KEY = 'mars.frontend.route'
const OBS_KEY = 'mars.frontend.observations'
const DB_NAME = 'mars-explorer-browser'
const DB_STORE = 'photos'

function read<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback }
}
function write<T>(key: string, value: T) { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage can be disabled */ } }
function openPhotoDb(): Promise<IDBDatabase | null> {
  if (!('indexedDB' in globalThis)) return Promise.resolve(null)
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(DB_STORE)) request.result.createObjectStore(DB_STORE) }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}
async function storePhotos(id: string, files: File[]) {
  if (!files.length) return []
  const db = await openPhotoDb()
  const saved: { id: string; name: string; mime: string; sizeBytes: number; sha256: string; url: string }[] = []
  for (const [index, file] of files.entries()) {
    const fileId = `${id}-${index}`
    if (db) await new Promise<void>((resolve) => { const tx = db.transaction(DB_STORE, 'readwrite'); tx.objectStore(DB_STORE).put(file, fileId); tx.oncomplete = () => resolve(); tx.onerror = () => resolve() })
    saved.push({ id: fileId, name: file.name, mime: file.type || 'application/octet-stream', sizeBytes: file.size, sha256: '', url: `browser-photo:${fileId}` })
  }
  db?.close()
  return saved
}

export async function readBrowserPhoto(id: string): Promise<Blob | null> {
  const db = await openPhotoDb()
  if (!db) return null
  return new Promise((resolve) => {
    const request = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(id)
    request.onsuccess = () => { resolve(request.result instanceof Blob ? request.result : null); db.close() }
    request.onerror = () => { resolve(null); db.close() }
  })
}

const demoUser = (): SignedInUser => ({ id: 'local-crew-01', crewId: DEMO.crewId, displayName: 'Local Explorer', role: 'Astronaut', status: 'Active' })
const site: SiteDto = { id: 'jezero-local', slug: 'jezero-crater', name: 'Jezero Crater', centerLat: 18.4661, centerLon: 77.4298, boundsJson: '{}', tileExtentM: 6000 }

async function nasaJson(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new ApiError(`NASA data request failed (${response.status}).`, response.status)
  return response.json()
}

async function uploadObservation(payload: Record<string, unknown>, photos: File[]): Promise<ObservationUpload> {
  const id = `local-${crypto.randomUUID?.() ?? Date.now().toString(36)}`
  const files = await storePhotos(id, photos)
  const lat = Number(payload.lat), lon = Number(payload.lon)
  const point = fromLatLon(lat, lon)
  const observation: Observation = {
    id, code: `OBS-${Date.now().toString().slice(-6)}`, title: String(payload.title ?? ''), category: payload.category as Observation['category'],
    x: point.x, y: point.y, locationName: String(payload.locationName ?? ''), description: String(payload.description ?? ''),
    geology: String(payload.geology ?? ''), minerals: String(payload.minerals ?? ''), waterIndicators: String(payload.waterIndicators ?? ''), environment: String(payload.environment ?? ''),
    tempC: payload.tempC == null ? null : Number(payload.tempC), doseUSvH: payload.doseUSvH == null ? null : Number(payload.doseUSvH),
    terrain: String(payload.terrain ?? ''), hazardClass: (payload.hazardClass ?? 'none') as Observation['hazardClass'], sol: Number(payload.sol ?? 0), lmst: String(payload.lmst ?? ''),
    contributorId: demoUser().crewId, photos: files.map((file) => file.url), attachments: [], notes: String(payload.notes ?? ''), status: 'submitted', annotations: [], relatedDatasets: [],
  }
  write(OBS_KEY, [observation, ...read<Observation[]>(OBS_KEY, [])])
  return { id, code: observation.code!, status: 'submitted', files }
}

export const api = {
  demoAccount: async () => DEMO,
  login: async (crewId: string, password: string) => {
    if (crewId.trim().toUpperCase() !== DEMO.crewId && crewId.trim().toLowerCase() !== 'astronaut') throw new ApiError('Use the local demo credentials shown on this page.', 401, 'invalid_credentials')
    if (password !== DEMO.password) throw new ApiError('Use the local demo credentials shown on this page.', 401, 'invalid_credentials')
    const user = demoUser(); write(USER_KEY, user); return user
  },
  me: async () => { const user = read<SignedInUser | null>(USER_KEY, null); if (!user) throw new ApiError('No local sign-in session.', 401); return user },
  logout: async () => { try { localStorage.removeItem(USER_KEY) } catch { /* storage can be disabled */ } },
  sites: async () => ({ items: [site] }),
  layers: async (_siteId: string) => ({ items: [] as LayerDto[] }),
  pdsProducts: (mission: 'curiosity' | 'perseverance' | 'hirise' | 'mars') => nasaJson(`https://pds.nasa.gov/api/search/1/products?keywords=${encodeURIComponent(mission)}&limit=20`),
  nasaImages: (query: string, page = 1) => nasaJson(`https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&page=${page}&media_type=image`),
  geocodeMars: async (query: string) => {
    if (/jezero|crater/i.test(query)) return { name: 'Jezero Crater', latitude: 18.4661, longitude: 77.4298, source: 'Local reference coordinate' }
    throw new ApiError('No local place match. Try “Jezero Crater”.', 404)
  },
  hazards: async (_siteId: string) => ({ type: 'FeatureCollection' as const, features: [] as HazardFeature[] }),
  medaMapLayers: async (): Promise<MedaLayerCollection> => ({ type: 'FeatureCollection', source: 'NASA PDS archive', spatialNote: 'Archived rover data is not displayed as a live map layer.', features: [] }),
  point: async (_siteId: string, _lat: number, _lon: number, _lmst: string): Promise<PointDto> => { throw new ApiError('No verified point data is available offline.', 404) },
  uploadObservation,
  observations: async () => { const items = read<Observation[]>(OBS_KEY, []); return { items, page: 1, pageSize: 100, total: items.length } },
  myRoute: async () => ({ stops: read<RouteStop[]>(ROUTE_KEY, []), updatedAt: undefined as string | undefined }),
  saveMyRoute: async (stops: RouteStop[]) => { write(ROUTE_KEY, stops); return { stops, updatedAt: new Date().toISOString() } },
}
