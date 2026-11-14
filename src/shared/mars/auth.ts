// Roles and permissions for MARS EXPLORER.
//
// This file is the single source of truth for who may do what. The UI reads
// it to decide what to show, and docs/backend spec mirrors it one-to-one as
// server middleware. Hiding a button is never the security: every action in
// the API is re-checked server-side against the same matrix.

export type Role = 'admin' | 'astronaut' | 'researcher'

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Mission Administrator',
  astronaut: 'Astronaut · Field Explorer',
  researcher: 'Scientific Researcher',
}

export type Permission =
  | 'map.view'
  | 'route.view'
  | 'route.edit'
  | 'observation.create'
  | 'observation.upload'
  | 'dataset.view'

export const PERMISSIONS: { id: Permission; label: string }[] = [
  { id: 'map.view', label: 'View interactive map' },
  { id: 'route.view', label: 'View mission routes' },
  { id: 'route.edit', label: 'Draw and edit routes' },
  { id: 'observation.create', label: 'Submit observations' },
  { id: 'observation.upload', label: 'Upload photos and files' },
  { id: 'dataset.view', label: 'Explore datasets' },
]

export const MATRIX: Record<Role, Permission[]> = {
  admin: PERMISSIONS.map((p) => p.id),
  astronaut: ['map.view', 'route.view', 'route.edit', 'observation.create', 'observation.upload', 'dataset.view'],
  researcher: ['map.view', 'route.view', 'dataset.view'],
}

export function can(role: Role, permission: Permission) {
  return MATRIX[role].includes(permission)
}

export type AccountStatus = 'active' | 'suspended' | 'invited'

export type Account = {
  id: string
  name: string
  callsign: string
  role: Role
  status: AccountStatus
  email: string
  mission: string
  lastActive: string
}

export function accountFor(role: Role) {
  return { id: '', name: 'Signed-in crew member', callsign: '', role, status: 'active' as const, email: '', mission: '', lastActive: '' }
}

