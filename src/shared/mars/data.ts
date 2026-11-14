export const MAP_W = 1000
export const MAP_H = 750
export const M_PER_UNIT = 6
export type Pt = { x: number; y: number }

export type Waypoint = { id: string; name: string; objective: string; task: string; instrument: string; stopMin: number; image?: string; view?: string }
/** No rover position or mission route is available from a connected source yet. */
export const ROVER: Pt = { x: 0, y: 0 }
export const ROVER_NAME = 'Route origin unavailable'
export const WAYPOINTS: Waypoint[] = []
export const DEFAULT_ROUTE: Pt[] = []
export const HAZARD_ROUTE: Pt[] = []

export type UnitId = string
export const GEO_UNITS: Record<string, { code: string; name: string; ti: number; color: string; note: string }> = {}
export const GEO_POLYS: { unit: UnitId; pts: [number, number][] }[] = []
export type Hazard = { id: string; name: string; type: string; cause: string; pts: [number, number][]; note: string }
/** Shape-only fallback, not observed terrain or astronaut safety guidance. */
export const HAZARDS: Hazard[] = [
  { id: 'preview-west', name: 'Preview zone A', type: 'Terrain zone preview', cause: 'Illustrative sample polygon; no observed cause is available.', pts: [[0, 270], [165, 330], [310, 430], [425, 560], [500, 750], [0, 750]], note: 'Preview geometry only.' },
  { id: 'preview-east', name: 'Preview zone B', type: 'Terrain zone preview', cause: 'Illustrative sample polygon; no observed cause is available.', pts: [[720, 0], [1000, 0], [1000, 245], [890, 190], [810, 105]], note: 'Preview geometry only.' },
]
export const SHELTER: Pt = { x: 0, y: 0 }

export type LayerId = 'topo' | 'thermal' | 'geology' | 'mineral' | 'radiation' | 'traverse' | 'nav' | 'observations'
export type Provenance = 'measured' | 'modelled' | 'illustrative' | 'unavailable' | 'crew'
export type LayerMeta = {
  id: LayerId; name: string; source: string; product: string; resolution: string; explanation: string
  provenance: Provenance; provenanceNote: string; updated: string
}

const unavailable = 'No verified layer source is connected. This layer is not displayed.'
export const LAYERS: LayerMeta[] = [
  ['topo', 'Topography'], ['thermal', 'Thermal'], ['geology', 'Geology'], ['mineral', 'Mineralogy'],
  ['radiation', 'Radiation'], ['traverse', 'Rover traverses'], ['nav', 'Route & hazards'], ['observations', 'Crew observations'],
].map(([id, name]) => ({
  id: id as LayerId, name: name!, source: 'Unavailable', product: 'Unavailable', resolution: 'Unavailable',
  explanation: unavailable, provenance: id === 'observations' ? 'crew' : 'unavailable',
  provenanceNote: unavailable, updated: 'Unavailable',
}))

export const BASEMAPS = [
  { id: 'ctxJezero', name: 'CTX Jezero', resolution: 'Controlled mosaic · 6 m/pixel', blur: 0 },
  { id: 'ctxJezeroPreliminary', name: 'CTX wider', resolution: 'Preliminary context mosaic', blur: 0 },
  { id: 'hiriseJezero', name: 'HiRISE Jezero', resolution: 'High-resolution orbital image', blur: 0 },
  { id: 'molaHrsc', name: 'MOLA + HRSC', resolution: 'Color hillshade · 200 m/pixel', blur: 0 },
  { id: 'themisDay', name: 'THEMIS day', resolution: 'Thermal infrared imagery', blur: 0 },
  { id: 'themisNight', name: 'THEMIS night', resolution: 'Thermal infrared imagery', blur: 0 },
  { id: 'molaRoughness', name: 'MOLA roughness', resolution: 'Global surface roughness', blur: 0 },
  { id: 'tesDust', name: 'TES dust', resolution: 'Global dust distribution', blur: 0 },
  { id: 'tesThermalInertia', name: 'TES thermal inertia', resolution: 'Thermal property map', blur: 0 },
  { id: 'tesPyroxene', name: 'TES pyroxene', resolution: 'Clinopyroxene abundance', blur: 0 },
  { id: 'tesPlagioclase', name: 'TES plagioclase', resolution: 'Plagioclase abundance', blur: 0 },
  { id: 'tesGlassClay', name: 'TES glass / clay', resolution: 'Silicate abundance map', blur: 0 },
  { id: 'mola', name: 'MOLA relief', resolution: 'Global shaded relief', blur: 0 },
  { id: 'viking', name: 'Viking', resolution: 'Global color mosaic', blur: 0 },
] as const
export type BasemapId = (typeof BASEMAPS)[number]['id']

export type LayerCategoryId = 'thermal' | 'geological' | 'topographic' | 'optical' | 'radiation' | 'weather'
export const LAYER_CATEGORIES: { id: LayerCategoryId; name: string; description: string; products: BasemapId[]; status?: string; archives?: { label: string; url: string }[] }[] = [
  { id: 'thermal', name: 'Thermal', description: 'Orbital infrared observations and derived thermal properties.', products: ['themisDay', 'themisNight', 'tesThermalInertia'] },
  { id: 'geological', name: 'Geological', description: 'TES mineral abundance products provide compositional context; they are not a geologic unit map.', products: ['tesPyroxene', 'tesPlagioclase', 'tesGlassClay'] },
  { id: 'topographic', name: 'Topographic', description: 'Global elevation and surface roughness products.', products: ['molaHrsc', 'mola', 'molaRoughness'] },
  { id: 'optical', name: 'Optical', description: 'Visible orbital image mosaics and higher-resolution coverage.', products: ['ctxJezero', 'ctxJezeroPreliminary', 'hiriseJezero', 'viking'] },
  { id: 'radiation', name: 'Radiation', description: 'MEDA Radiation and Dust Sensor archive for Perseverance. These rover-site UV/dust measurements are not an astronaut dose map or global live layer.', products: [], status: 'NASA PDS · archived rover measurements', archives: [{ label: 'MEDA Radiation & Dust Sensor (RDS) index', url: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/logs/mars2020_meda_calibrated_RDS.htm' }] },
  { id: 'weather', name: 'Weather', description: 'Perseverance MEDA archived surface measurements from the rover site. These are historical station readings, not current forecasts or a global map overlay.', products: [], status: 'NASA PDS · archived calibrated measurements', archives: [
    { label: 'Air temperature (ATS) index', url: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/logs/mars2020_meda_calibrated_ATS.htm' },
    { label: 'Pressure sensor (PS) index', url: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/logs/mars2020_meda_calibrated-PS.htm' },
    { label: 'Wind sensor (WIND) index', url: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/logs/mars2020_meda_calibrated-WIND.htm' },
    { label: 'Humidity sensor (RHS) index', url: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/logs/mars2020_meda_calibrated-RHS.htm' },
  ] },
]

export const ORIGIN = { lat: 18.4661, lon: 77.4298 }
const DEG_LAT = M_PER_UNIT / 59160
const DEG_LON = M_PER_UNIT / 58960
export function toLatLon(p: Pt) { return { lat: ORIGIN.lat - p.y * DEG_LAT, lon: ORIGIN.lon + p.x * DEG_LON } }
export function fromLatLon(lat: number, lon: number): Pt { return { x: (lon - ORIGIN.lon) / DEG_LON, y: (ORIGIN.lat - lat) / DEG_LAT } }
export function formatLatLon(p: Pt) {
  const { lat, lon } = toLatLon(p)
  return `${Math.abs(lat).toFixed(5)}°${lat < 0 ? 'S' : 'N'}, ${lon.toFixed(5)}°E`
}

export const MINERALS: { id: string; name: string; color: string; pts: [number, number][] }[] = []
export const TRAVERSE: [number, number][] = []
export const LMST_OPTIONS = ['07:00', '10:00', '13:00', '16:00'] as const
export type Lmst = (typeof LMST_OPTIONS)[number]
export const EVA_LIMIT_MIN = 360
export const MAX_SLOPE_DEG = 15
export const FLAT_SPEED_KMH = 2.2
