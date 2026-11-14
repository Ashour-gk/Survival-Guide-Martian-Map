import React, { useState } from 'react'
import { AppShell, Screen } from '../shared/mars/AppShell'
import { Account, accountFor } from '../shared/mars/auth'
import { formatLatLon, Lmst } from '../shared/mars/data'
import { MarsMap } from '../shared/mars/MarsMap'
import { Observation } from '../shared/mars/observations'
import { StatusBadge, CategoryIcon } from '../shared/mars/ui'

export const args = { selectedId: '' }
export const argTypes = { selectedId: { control: 'text' } }
type Props = { account?: Account; observations?: Observation[]; selectedId?: string; onNavigate?: (screen: Screen) => void; onSignOut?: () => void }

export default function MyObservations(props: Props) {
  const account = props.account ?? accountFor('astronaut')
  const observations = props.observations ?? []
  const [selectedId, setSelectedId] = useState(props.selectedId ?? '')
  React.useEffect(() => setSelectedId(props.selectedId ?? ''), [props.selectedId])
  const selected = observations.find(o => o.id === selectedId) ?? observations[0]
  return <AppShell account={account} current="submissions" onNavigate={props.onNavigate} onSignOut={props.onSignOut}>
    <main className="grid h-full overflow-y-auto lg:grid-cols-[360px_minmax(0,1fr)] lg:overflow-hidden">
      <section className="border-r border-space-800 lg:overflow-y-auto"><header className="border-b border-space-800 p-5"><h1 className="text-xl font-semibold">My observations</h1><p className="mt-1 text-sm text-space-200">Your observations saved by the API.</p></header>
        {observations.length===0?<p className="p-5 text-sm text-space-200">No observations have been submitted from this account.</p>:<ul>{observations.map(o=><li key={o.id} className="border-b border-space-800"><button onClick={()=>setSelectedId(o.id)} className={`flex w-full gap-3 p-4 text-left hover:bg-space-900 ${selected?.id===o.id?'bg-space-900':''}`}><CategoryIcon id={o.category} className="mt-1 h-4 w-4 shrink-0"/><span className="min-w-0"><span className="block truncate font-medium">{o.title}</span><span className="block truncate text-xs text-space-200">{o.code??o.id} · Sol {o.sol}</span><span className="mt-1 block"><StatusBadge status="submitted"/></span></span></button></li>)}</ul>}
      </section>
      <section className="min-w-0 overflow-y-auto p-5 sm:p-8">{selected?<article className="mx-auto max-w-4xl"><p className="text-xs text-space-200">{selected.code??selected.id} · {selected.locationName}</p><h2 className="mt-1 text-2xl font-semibold">{selected.title}</h2><div className="mt-2"><StatusBadge status="submitted"/></div>{selected.photos.length>0&&<div className="mt-5 grid gap-3 sm:grid-cols-2">{selected.photos.map(photo=><img key={photo} src={photo} alt={selected.title} className="aspect-video w-full rounded-lg object-cover"/>)}</div>}<p className="mt-5 whitespace-pre-wrap text-sm leading-6">{selected.description}</p><dl className="mt-5 grid gap-4 sm:grid-cols-2">{[['Coordinates',formatLatLon(selected)],['Category',selected.category],['Sol',String(selected.sol)],['Mission time',selected.lmst],['Geology',selected.geology],['Minerals',selected.minerals],['Water / ice',selected.waterIndicators],['Terrain',selected.terrain],['Temperature',selected.tempC===null?'Not supplied':`${selected.tempC} °C`],['Radiation',selected.doseUSvH===null?'Not supplied':`${selected.doseUSvH} µSv/h`]].map(([k,v])=><div key={k}><dt className="text-xs text-space-200">{k}</dt><dd className="mt-0.5 text-sm">{v||'Not supplied'}</dd></div>)}</dl><div className="mt-6 aspect-[4/3] max-w-lg overflow-hidden rounded-lg border border-space-800"><MarsMap layers={{topo:false,nav:false,observations:true}} lmst={(selected.lmst||'13:00') as Lmst} stops={[]} observations={[selected]} selectedObs={selected.id} compact/></div></article>:<p className="text-sm text-space-200">Select an observation to view its details.</p>}</section>
    </main>
  </AppShell>
}
