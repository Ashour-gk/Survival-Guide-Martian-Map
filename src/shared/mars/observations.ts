export type CategoryId = 'geology' | 'water' | 'mineral' | 'rock' | 'hazard' | 'dust' | 'temperature' | 'radiation' | 'unknown' | 'other'

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'geology', label: 'Geological discovery' },
  { id: 'water', label: 'Water and ice evidence' },
  { id: 'mineral', label: 'Mineral detection' },
  { id: 'rock', label: 'Rock formation' },
  { id: 'hazard', label: 'Surface hazard' },
  { id: 'dust', label: 'Dust storm observation' },
  { id: 'temperature', label: 'Temperature measurement' },
  { id: 'radiation', label: 'Radiation measurement' },
  { id: 'unknown', label: 'Unknown phenomenon' },
  { id: 'other', label: 'Other' },
]

export const categoryLabel = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.label ?? id
export type ReviewStatus = 'submitted'
export const STATUS_LABEL: Record<ReviewStatus, string> = { submitted: 'Submitted' }
export type HazardClass = 'none' | 'low' | 'moderate' | 'high'
export type Annotation = { authorId: string; sol?: number; text: string; createdAt?: string }

export type Observation = {
  id: string
  code?: string
  title: string
  category: CategoryId
  x: number
  y: number
  locationName: string
  description: string
  geology: string
  minerals: string
  waterIndicators: string
  environment: string
  tempC: number | null
  doseUSvH: number | null
  terrain: string
  hazardClass: HazardClass
  sol: number
  lmst: string
  contributorId: string
  photos: string[]
  attachments: { name: string; size: string }[]
  notes: string
  status: ReviewStatus
  annotations: Annotation[]
  relatedDatasets: string[]
}

