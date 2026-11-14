import React, { useEffect, useState } from 'react'
import { ExternalLink, LoaderCircle, Search } from 'lucide-react'
import { ApiError, api } from '../../shared/mars/api'

const SEARCHES = ['curiosity', 'perseverance', 'hirise', 'mars'] as const
type SearchName = (typeof SEARCHES)[number]

function records(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
  if (!value || typeof value !== 'object') return []
  const object = value as Record<string, unknown>
  for (const key of ['data', 'products', 'results', 'items', 'features']) {
    if (Array.isArray(object[key])) return records(object[key])
  }
  return []
}

function firstText(item: Record<string, unknown>, fields: string[]) {
  for (const field of fields) if (typeof item[field] === 'string' && item[field]) return item[field] as string
  return undefined
}

function pdsText(item: Record<string, unknown>, fields: string[]) {
  const direct = firstText(item, fields)
  if (direct) return direct
  const properties = item.properties
  if (!properties || typeof properties !== 'object') return undefined
  const values = properties as Record<string, unknown>
  for (const field of fields) {
    const value = values[field]
    if (typeof value === 'string' && value) return value
    if (Array.isArray(value)) {
      const text = value.find((entry) => typeof entry === 'string' && entry.length > 0)
      if (typeof text === 'string') return text
    }
  }
  return undefined
}

function productLink(item: Record<string, unknown>) {
  const direct = firstText(item, ['url', 'product_url', 'href', 'item_url'])
  if (direct?.startsWith('https://')) return direct
  const links = item.links
  if (Array.isArray(links)) {
    const link = links.find((value) => value && typeof value === 'object' && typeof (value as Record<string, unknown>).href === 'string') as Record<string, unknown> | undefined
    if (typeof link?.href === 'string' && link.href.startsWith('https://')) return link.href
  }
  return undefined
}

export function NasaDataPanel() {
  const [products, setProducts] = useState<Partial<Record<SearchName, Record<string, unknown>[]>>>({})
  const [errors, setErrors] = useState<Partial<Record<SearchName, string>>>({})
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('Jezero')
  const [place, setPlace] = useState<unknown>(null)
  const [placeError, setPlaceError] = useState('')
  const [placeLoading, setPlaceLoading] = useState(false)
  const [imageQuery, setImageQuery] = useState('Mars rover')
  const [images, setImages] = useState<Record<string, unknown>[]>([])
  const [imageError, setImageError] = useState('')
  const [imageLoading, setImageLoading] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all(SEARCHES.map(async (name) => {
      try {
        const result = await api.pdsProducts(name)
        if (active) setProducts((current) => ({ ...current, [name]: records(result) }))
      } catch (error) {
        if (active) setErrors((current) => ({ ...current, [name]: error instanceof ApiError ? error.message : 'Could not load live NASA PDS products.' }))
      }
    })).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const findPlace = async (event: React.FormEvent) => {
    event.preventDefault()
    setPlaceLoading(true); setPlaceError(''); setPlace(null)
    try { setPlace(await api.geocodeMars(query)) }
    catch (error) { setPlaceError(error instanceof ApiError ? error.message : 'Mars place search failed.') }
    finally { setPlaceLoading(false) }
  }

  const searchImages = async (event?: React.FormEvent) => {
    event?.preventDefault()
    setImageLoading(true); setImageError('')
    try {
      const response = await api.nasaImages(imageQuery)
      const collection = response && typeof response === 'object' ? (response as Record<string, unknown>).collection : null
      setImages(collection && typeof collection === 'object' ? records((collection as Record<string, unknown>).items) : [])
    } catch (error) {
      setImageError(error instanceof ApiError ? error.message : 'Could not load NASA images.')
      setImages([])
    } finally { setImageLoading(false) }
  }

  useEffect(() => { void searchImages() }, [])

  return <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
    <section>
      <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">NASA Mars images</h2>{imageLoading && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-space-200" />}</div>
      <p className="mt-1 text-[11px] leading-4 text-space-200">Live photographs from NASA’s Image and Video Library.</p>
      <form onSubmit={searchImages} className="mt-2 flex gap-2">
        <input aria-label="Search NASA images" value={imageQuery} onChange={(event) => setImageQuery(event.target.value)} className="min-w-0 flex-1 rounded border border-space-700 bg-ink px-2 py-1.5 text-sm" />
        <button disabled={imageLoading || imageQuery.trim().length < 2} className="flex items-center gap-1 rounded bg-space-100 px-2.5 text-xs font-semibold text-space-950 disabled:opacity-50"><Search className="h-3.5 w-3.5" />Search</button>
      </form>
      {imageError && <p role="alert" className="mt-2 text-xs text-hazard">{imageError}</p>}
      {!imageLoading && !imageError && images.length === 0 && <p className="mt-2 text-xs text-space-200">No NASA image records were returned.</p>}
      <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">{images.map((item, index) => {
        const data = item.data && Array.isArray(item.data) ? item.data[0] as Record<string, unknown> | undefined : undefined
        const thumb = Array.isArray(item.links) ? (item.links as Record<string, unknown>[]).find((link) => link.render === 'image' && typeof link.href === 'string')?.href as string | undefined : undefined
        const nasaId = typeof data?.nasa_id === 'string' ? data.nasa_id : `nasa-image-${index}`
        const title = typeof data?.title === 'string' ? data.title : 'NASA Mars image'
        const date = typeof data?.date_created === 'string' ? data.date_created.slice(0, 10) : ''
        const description = typeof data?.description === 'string' ? data.description : ''
        const details = `https://images.nasa.gov/details/${encodeURIComponent(nasaId)}`
        return <li key={`${nasaId}-${index}`} className="overflow-hidden rounded border border-space-800">
          {thumb && <a href={details} target="_blank" rel="noreferrer"><img src={thumb} loading="lazy" alt={title} className="aspect-[4/3] w-full bg-ink object-cover" /></a>}
          <div className="p-2"><a href={details} target="_blank" rel="noreferrer" className="text-xs font-medium text-space-50 underline underline-offset-2">{title}</a>
            <p className="mt-0.5 font-mono text-[10px] text-space-200">{nasaId}{date ? ` · ${date}` : ''}</p>
            {description && <p className="mt-1 line-clamp-3 text-[10px] leading-4 text-space-200">{description}</p>}
          </div>
        </li>
      })}</ul>
    </section>
    <section className="rounded-md border border-space-800 p-3">
      <h2 className="text-sm font-semibold">Mars place search</h2>
      <p className="mt-1 text-[11px] leading-4 text-space-200">Live results from OpenSpace Mars Geocoder.</p>
      <form onSubmit={findPlace} className="mt-3 flex gap-2">
        <input aria-label="Search Mars place" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 rounded border border-space-700 bg-ink px-2 py-1.5 text-sm" placeholder="Jezero" />
        <button disabled={placeLoading || query.trim().length < 2} className="flex items-center gap-1 rounded bg-space-100 px-2.5 text-xs font-semibold text-space-950 disabled:opacity-50"><Search className="h-3.5 w-3.5" />Find</button>
      </form>
      {placeLoading && <p className="mt-2 flex items-center gap-2 text-xs text-space-200"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Searching live data…</p>}
      {placeError && <p role="alert" className="mt-2 text-xs text-hazard">{placeError}</p>}
      {place !== null && <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded bg-ink p-2 text-[10px] text-space-100">{JSON.stringify(place, null, 2)}</pre>}
    </section>
    <section>
      <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">NASA PDS products</h2>{loading && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-space-200" />}</div>
      <p className="mt-1 text-[11px] leading-4 text-space-200">Live product search results, up to 20 per query.</p>
      <div className="mt-3 space-y-4">
        {SEARCHES.map((search) => <section key={search}>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-space-100">{search} <span className="font-normal normal-case text-space-300">{products[search] ? `· ${products[search]!.length} products` : ''}</span></h3>
          {errors[search] && <p role="alert" className="rounded border border-hazard/40 p-2 text-xs text-hazard">{errors[search]}</p>}
          {products[search]?.length === 0 && !errors[search] && <p className="text-xs text-space-200">The live search returned no product records.</p>}
          <ul className="space-y-1.5">{products[search]?.map((item, index) => {
            const title = pdsText(item, ['title', 'pds:Identification_Area.pds:title', 'name', 'product_name', 'product_id', 'identifier', 'id']) ?? 'NASA PDS product'
            const id = pdsText(item, ['id', 'lid', 'pds:Identification_Area.pds:logical_identifier', 'lidvid', 'vid'])
            const productType = pdsText(item, ['type', 'product_class', 'pds:Identification_Area.pds:product_class'])
            const dataUrl = pdsText(item, ['ops:Data_File_Info.ops:file_ref'])
            const labelUrl = pdsText(item, ['ops:Label_File_Info.ops:file_ref'])
            const link = productLink(item) ?? [dataUrl, labelUrl].find((url) => url?.startsWith('https://'))
            return <li key={`${id ?? title}-${index}`} className="rounded border border-space-800 px-2.5 py-2 text-xs">
              <p className="break-words font-medium">{title}</p>
              {id && id !== title && <p className="mt-0.5 break-all font-mono text-[10px] text-space-200">{id}</p>}
              {productType && <p className="mt-0.5 text-[10px] text-space-200">{productType}</p>}
              {link && <a href={link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-space-100 underline underline-offset-2">Open product <ExternalLink className="h-3 w-3" /></a>}
            </li>
          })}</ul>
        </section>)}
      </div>
    </section>
  </div>
}
