import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Lock } from 'lucide-react'

import { ApiError, api, DemoAccount } from '../shared/mars/api'
import { NasaMarsGlobe } from '../shared/mars/NasaMarsGlobe'
import { MarsLogo } from '../shared/mars/MarsLogo'
import '../shared/mars/mars-intro.css'

export const args = { state: 'default', crewId: '' }
export const argTypes = { state: { control: 'select', options: ['default', 'verifying', 'error', 'inactive'] }, crewId: { control: 'text' } }
type Props = Partial<typeof args> & { onSignIn?: (user: Awaited<ReturnType<typeof api.login>>) => void }

export default function SignIn(props: Props) {
  const { state: stateArg, crewId: crewArg, onSignIn } = { ...args, ...props }
  const [crewId, setCrewId] = useState(crewArg)
  const [password, setPassword] = useState('')
  const [state, setState] = useState(stateArg)
  const [errorMessage, setErrorMessage] = useState('')
  const [demoAccount, setDemoAccount] = useState<DemoAccount | null>(null)
  React.useEffect(() => setState(stateArg), [stateArg])
  React.useEffect(() => setCrewId(crewArg), [crewArg])
  React.useEffect(() => {
    let active = true
    void api.demoAccount().then((account) => { if (active) setDemoAccount(account) }).catch(() => { if (active) setDemoAccount(null) })
    return () => { active = false }
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage('')
    setState('verifying')
    try { onSignIn?.(await api.login(crewId.trim(), password)) }
    catch (error) {
      const apiError = error instanceof ApiError ? error : null
      setState(apiError?.code === 'inactive' ? 'inactive' : 'error')
      setErrorMessage(apiError?.message ?? 'Could not sign in to the local demo account.')
    }
  }

  return <main className="grid min-h-screen bg-space-950 text-space-50 lg:grid-cols-[1.1fr_1fr]">
    <section className="relative hidden overflow-hidden border-r border-space-800 lg:grid lg:place-items-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_55%_44%,rgba(69,133,162,.18),transparent_52%),linear-gradient(145deg,#061c2d,#020d18)]" />
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center px-10 text-center"><NasaMarsGlobe className="w-[min(22vw,330px)]"/><p className="mt-10 text-[12px] font-semibold tracking-[0.22em] text-space-100">MARS EXPLORER</p><h1 className="mt-3 max-w-md text-[34px] leading-tight font-semibold">Explore the Martian surface</h1><p className="mt-3 max-w-md text-[14px] leading-relaxed text-space-200">NASA orbital imagery and mission observations.</p></div>
    </section>
    <section className="flex items-center justify-center overflow-y-auto px-5 py-10"><div className="w-full max-w-[380px]">
      <div className="mb-4 flex items-center gap-3"><MarsLogo className="h-12 w-12"/><p className="text-[13px] font-semibold tracking-wide text-space-100">MARS EXPLORER</p></div><h2 className="mt-1 text-[24px] font-semibold">Crew sign in</h2><p className="mt-1 text-[14px] text-space-200">Sign in with your assigned crew ID and password.</p>
      {demoAccount && <section className="mt-5 rounded-lg border border-space-700 bg-ink/80 p-4" aria-label="Demo account">
        <div className="flex items-center justify-between gap-3"><h3 className="text-[13px] font-semibold text-space-50">{demoAccount.label}</h3><span className="rounded-full border border-space-600 px-2 py-0.5 text-[10px] text-space-200">THIS DEVICE</span></div>
        <p className="mt-2 text-[12px] text-space-200">Explore the map, save routes, and add observations. Your demo content stays in this browser.</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[12px]"><dt className="text-space-300">Crew ID</dt><dd className="select-all text-space-100">{demoAccount.crewId}</dd><dt className="text-space-300">Password</dt><dd className="select-all text-space-100">{demoAccount.password}</dd></dl>
        <button type="button" onClick={() => { setCrewId(demoAccount.crewId); setPassword(demoAccount.password); setState('default'); setErrorMessage('') }} className="mt-3 w-full rounded-md border border-space-600 px-3 py-2 text-[12px] font-medium text-space-100 transition-colors hover:border-space-300 hover:bg-space-900">Use demo credentials</button>
      </section>}
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <Field label="Crew ID"><input required autoComplete="username" value={crewId} onChange={e=>setCrewId(e.target.value)} className={input}/></Field>
        <Field label="Password"><input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className={input}/></Field>
        <AnimatePresence initial={false}>{(state==='error'||state==='inactive')&&<motion.p role="alert" initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="flex items-start gap-2 rounded-md border border-hazard/50 bg-hazard/10 px-3 py-2.5 text-[13px] text-space-50"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-hazard"/>{errorMessage||'Crew ID or password is incorrect.'}</motion.p>}</AnimatePresence>
        <motion.button whileTap={{scale:0.98}} disabled={state==='verifying'} className="w-full rounded-md bg-space-100 px-4 py-2.5 text-[14px] font-semibold text-space-950 transition-colors hover:bg-space-50 disabled:opacity-60">{state==='verifying'?'Signing in…':'Sign in'}</motion.button>
      </form>
    </div></section>
  </main>
}

const input='w-full rounded-md border border-space-700 bg-ink px-3 py-2.5 text-[14px] text-space-50 outline-none transition-colors focus:border-space-200'
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="text-[13px] font-medium text-space-100">{label}</span><span className="mt-1.5 block">{children}</span></label>}
