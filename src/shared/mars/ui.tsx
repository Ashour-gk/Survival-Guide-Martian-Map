import React from 'react'
import {
  CircleHelp,
  Droplets,
  LucideIcon,
  Gem,
  Layers,
  MapPin,
  Mountain,
  Radiation,
  Thermometer,
  TriangleAlert,
  Wind,
} from 'lucide-react'

import { Provenance } from './data'
import { CategoryId, ReviewStatus, STATUS_LABEL } from './observations'

export const CATEGORY_ICON: Record<CategoryId, LucideIcon> = {
  geology: Mountain,
  water: Droplets,
  mineral: Gem,
  rock: Layers,
  hazard: TriangleAlert,
  dust: Wind,
  temperature: Thermometer,
  radiation: Radiation,
  unknown: CircleHelp,
  other: MapPin,
}

export function CategoryIcon({ id, className = 'h-4 w-4' }: { id: CategoryId; className?: string }) {
  const Icon = CATEGORY_ICON[id]
  return <Icon className={className} />
}

const PROV: Record<Provenance | 'manual' | 'simulated' | 'external' | 'unknown', { label: string; cls: string }> = {
  measured: { label: 'Measured', cls: 'bg-space-100 text-space-950' },
  external: { label: 'External feed', cls: 'bg-space-100 text-space-950' },
  modelled: { label: 'Modelled', cls: 'bg-space-800 text-space-100 ring-1 ring-space-500' },
  simulated: { label: 'Simulated', cls: 'bg-space-800 text-space-100 ring-1 ring-space-500' },
  illustrative: { label: 'Illustrative', cls: 'bg-transparent text-space-200 border border-dashed border-space-400' },
  manual: { label: 'Manual entry', cls: 'bg-space-600 text-space-50' },
  crew: { label: 'Crew data', cls: 'bg-space-600 text-space-50' },
  unavailable: { label: 'No data', cls: 'bg-transparent text-space-200 ring-1 ring-space-600' },
  unknown: { label: 'Unknown', cls: 'bg-transparent text-caution ring-1 ring-caution/60' },
}

export type ProvenanceKind = keyof typeof PROV

export function ProvenanceBadge({ kind, className = '' }: { kind: ProvenanceKind; className?: string }) {
  const p = PROV[kind]
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-px text-[10.5px] font-medium whitespace-nowrap ${p.cls} ${className}`}>
      {p.label}
    </span>
  )
}

const STATUS_CLS: Record<ReviewStatus, string> = { submitted: 'text-space-100' }
const STATUS_DOT: Record<ReviewStatus, string> = { submitted: 'bg-space-300' }

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap ${STATUS_CLS[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  )
}
