import type { Observation } from './observations'

const API = '/api/v1'

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message)
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.method && init.method !== 'GET' ? { 'X-Requested-With': 'XMLHttpRequest' } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body.message ?? body.detail ?? body.title ?? `API request failed (${response.status})`, response.status, body.code)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export type SignedInUser = { id: string; crewId: string; displayName: string; role: 'Administrator' | 'Astronaut' | 'Researcher'; status?: string }
export type DemoAccount = { crewId: string; password: string; label: string }
export type SiteDto = { id: string; slug: string; name: string; centerLat: number; centerLon: number; boundsJson: string; tileExtentM: number }
export type LayerDto = { id: string; key: string; title: string; kind: string; sourceName: string; resolutionM?: string; provenance: string; verificationStatus: string; enabled: boolean; citation: string }
export type PointDto = {
  elevation: { value: number; unit: string; provenance: string }
  slope: { value: number; unit: string; provenance: string }
  groundTempModelled: { value: number; unit: string; provenance: string }
  doseModelled: { value: number; unit: string; provenance: string }
  unit: { code: string; name: string; ti: number }
  hazardZone: { name: string; kind: string; severity: number; provenance: string } | null
}

export type ObservationUpload = {
  id: string
  code: string
  status: string
  files: { id: string; name: string; mime: string; sizeBytes: number; sha256: string; url: string }[]
}

export type RouteStop = { x: number; y: number }
export type HazardFeature = {
  type: 'Feature'
  id: string
  properties: { name: string; kind: string; severity: number; source: string; provenance: string }
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] }
}
export type MedaLayerFeature = {
  type: 'Feature'
  id: string
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: {
    category: 'weather' | 'radiation'
    name: string
    sensors: string[]
    sourceName: string
    sourceUrl: string
    dataLinks: { label: string; url: string }[]
    provenance: string
  }
}
export type MedaLayerCollection = {
  type: 'FeatureCollection'
  source: string
  spatialNote: string
  features: MedaLayerFeature[]
}

async function uploadObservation(observation: Record<string, unknown>, photos: File[]): Promise<ObservationUpload> {
  const form = new FormData()
  form.append('observationJson', JSON.stringify(observation))
  photos.forEach((photo) => form.append('photos', photo, photo.name))
  const response = await fetch(`${API}/observations`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: form,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body.detail ?? body.message ?? body.title ?? `Upload failed (${response.status})`, response.status, body.code)
  }
  return response.json() as Promise<ObservationUpload>
}

export const api = {
  demoAccount: () => request<DemoAccount>('/auth/demo-account'),
  login: (crewId: string, password: string) => request<SignedInUser>('/auth/login', {
    method: 'POST', body: JSON.stringify({ crewId, password }),
  }),
  me: () => request<SignedInUser>('/auth/me'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  sites: () => request<{ items: SiteDto[] }>('/sites?page=1&pageSize=50'),
  layers: (siteId: string) => request<{ items: LayerDto[] }>(`/sites/${siteId}/layers`),
  pdsProducts: (mission: 'curiosity' | 'perseverance' | 'hirise' | 'mars') => request<unknown>(`/data/pds/${mission}`),
  nasaImages: (query: string, page = 1) => request<unknown>(`/data/nasa-images?query=${encodeURIComponent(query)}&page=${page}`),
  geocodeMars: (query: string) => request<unknown>(`/data/geocode/mars?query=${encodeURIComponent(query)}`),
  hazards: (siteId: string) => request<{ type: 'FeatureCollection'; features: HazardFeature[] }>(`/sites/${siteId}/hazards`),
  medaMapLayers: () => request<MedaLayerCollection>('/data/meda-map-layers'),
  point: (siteId: string, lat: number, lon: number, lmst: string) =>
    request<PointDto>(`/point?siteId=${encodeURIComponent(siteId)}&lat=${lat}&lon=${lon}&lmst=${encodeURIComponent(lmst)}`),
  uploadObservation,
  observations: () => request<{ items: Observation[]; page: number; pageSize: number; total: number }>('/observations?page=1&pageSize=100'),
  myRoute: () => request<{ stops: RouteStop[]; updatedAt?: string }>('/routes/me'),
  saveMyRoute: (stops: RouteStop[]) => request<{ stops: RouteStop[]; updatedAt: string }>('/routes/me', { method: 'PUT', body: JSON.stringify({ stops }) }),
}
