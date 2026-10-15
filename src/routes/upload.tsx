import { createFileRoute } from '@tanstack/react-router'
import { FileAudio, FileImage, FileVideo, Lock, Trash2, Upload as UploadIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Footer, Nav } from '../components/site'

/**
 * `/upload` — where London's team adds photos, flyers, videos and music to the
 * site without GitHub. Finished uploads appear straight away in the home page
 * Latest section, and can be deleted from the list here.
 */
export const Route = createFileRoute('/upload')({
  head: () => ({
    meta: [{ title: 'Upload | London Koi' }, { name: 'robots', content: 'noindex' }],
  }),
  component: UploadPage,
})

type Kind = 'photo' | 'flyer' | 'video' | 'music'

type Uploaded = {
  id: number
  kind: Kind
  title: string
  caption: string | null
  filename: string
  contentType: string
  size: number
  status: string
  url: string
  createdAt: string
}

type Progress = { name: string; percent: number; error?: string; done?: boolean }

const KINDS: { value: Kind; label: string; accept: string; hint: string }[] = [
  { value: 'photo', label: 'Photo', accept: 'image/jpeg,image/png,image/webp,image/gif', hint: 'JPEG, PNG, WebP or GIF' },
  {
    value: 'flyer',
    label: 'Flyer',
    accept: 'image/jpeg,image/png,image/webp,image/gif,application/pdf',
    hint: 'An image or a PDF',
  },
  { value: 'video', label: 'Video', accept: 'video/mp4,video/webm,video/quicktime', hint: 'MP4 plays everywhere' },
  { value: 'music', label: 'Music', accept: 'audio/*', hint: 'MP3, M4A or WAV' },
]

const PASSWORD_KEY = 'london-koi-upload-password'

/** Browsers sometimes leave `type` blank (notably for audio), so fall back to the extension. */
function typeOf(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  const byExt: Record<string, string> = {
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    aac: 'audio/aac',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    pdf: 'application/pdf',
    heic: 'image/heic',
  }
  return (ext && byExt[ext]) || ''
}

async function errorText(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null
  return body?.error ?? `Upload failed (${response.status}).`
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`
}

function UploadPage() {
  const [password, setPassword] = useState<string | null>(null)

  useEffect(() => {
    setPassword(sessionStorage.getItem(PASSWORD_KEY))
  }, [])

  function signOut() {
    sessionStorage.removeItem(PASSWORD_KEY)
    setPassword(null)
  }

  return (
    <main className="bg-sky-50 min-h-screen flex flex-col">
      <Nav />
      <section className="flex-1 pt-32 pb-24 px-6 text-slate-900">
        <div className="max-w-3xl mx-auto">
          <p className="uppercase tracking-[0.3em] text-sky-700 text-sm font-semibold mb-3">For London&rsquo;s team</p>
          <h1 className="text-4xl font-bold mb-4">Upload to the site</h1>
          <p className="text-slate-600 mb-10">
            Photos, flyers, videos and music uploaded here show up straight away in the{' '}
            <a href="/#latest" className="text-sky-700 font-semibold hover:underline">
              Latest from London
            </a>{' '}
            section of the home page.
          </p>
          {password ? (
            <Uploader password={password} onSignOut={signOut} />
          ) : (
            <Unlock
              onUnlock={(value) => {
                sessionStorage.setItem(PASSWORD_KEY, value)
                setPassword(value)
              }}
            />
          )}
        </div>
      </section>
      <Footer />
    </main>
  )
}

function Unlock({ onUnlock }: { onUnlock: (password: string) => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/upload/session', {
        method: 'POST',
        headers: { 'x-upload-password': value },
      })
      if (response.ok) onUnlock(value)
      else setError(await errorText(response))
    } catch {
      setError('Could not reach the site. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-3xl bg-white border border-sky-200 p-8 shadow-sm max-w-md">
      <label htmlFor="upload-password" className="flex items-center gap-2 font-semibold mb-3">
        <Lock className="w-4 h-4" aria-hidden="true" /> Upload password
      </label>
      <input
        id="upload-password"
        type="password"
        autoComplete="current-password"
        required
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="w-full rounded-xl border border-sky-300 px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      {error && <p className="text-sm text-red-700 mb-4">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="px-6 py-3 rounded-full bg-amber-400 font-semibold hover:bg-amber-300 transition-colors disabled:opacity-60"
      >
        {busy ? 'Checking…' : 'Unlock uploads'}
      </button>
    </form>
  )
}

function Uploader({ password, onSignOut }: { password: string; onSignOut: () => void }) {
  const [kind, setKind] = useState<Kind>('photo')
  const [files, setFiles] = useState<File[]>([])
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [progress, setProgress] = useState<Progress[]>([])
  const [busy, setBusy] = useState(false)
  const [uploads, setUploads] = useState<Uploaded[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [inputKey, setInputKey] = useState(0)

  const headers = { 'x-upload-password': password }
  const selected = KINDS.find((k) => k.value === kind)!

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/upload/files', { headers: { 'x-upload-password': password } })
      if (response.status === 401) return onSignOut()
      if (!response.ok) return setListError(await errorText(response))
      setListError(null)
      setUploads(((await response.json()) as { uploads: Uploaded[] }).uploads)
    } catch {
      setListError('Could not load the uploads list.')
    }
  }, [password, onSignOut])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function update(index: number, change: Partial<Progress>) {
    setProgress((all) => all.map((p, i) => (i === index ? { ...p, ...change } : p)))
  }

  async function uploadOne(file: File, index: number) {
    const start = await fetch('/api/upload/files', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind,
        filename: file.name,
        contentType: typeOf(file),
        size: file.size,
        // One title for a batch would label every file the same, so a batch uses filenames.
        title: files.length === 1 ? title : '',
        caption,
      }),
    })
    if (!start.ok) throw new Error(await errorText(start))
    const { id, chunkSize, chunkCount } = (await start.json()) as { id: number; chunkSize: number; chunkCount: number }

    for (let part = 0; part < chunkCount; part++) {
      const chunk = file.slice(part * chunkSize, (part + 1) * chunkSize)
      let response: Response | null = null
      // A flaky phone connection shouldn't lose a whole video, so each chunk gets a few tries.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await fetch(`/api/upload/chunk?id=${id}&part=${part}`, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/octet-stream' },
            body: chunk,
          })
          if (response.ok || response.status < 500) break
        } catch {
          response = null
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      }
      if (!response) throw new Error('Connection lost while uploading. Please try again.')
      if (!response.ok) throw new Error(await errorText(response))
      update(index, { percent: Math.round(((part + 1) / chunkCount) * 100) })
    }

    const finish = await fetch(`/api/upload/finish?id=${id}`, { method: 'POST', headers })
    if (!finish.ok) throw new Error(await errorText(finish))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (files.length === 0) return
    setBusy(true)
    setProgress(files.map((file) => ({ name: file.name, percent: 0 })))

    let failed = false
    for (const [index, file] of files.entries()) {
      try {
        await uploadOne(file, index)
        update(index, { percent: 100, done: true })
      } catch (error) {
        failed = true
        update(index, { error: error instanceof Error ? error.message : 'Upload failed.' })
      }
    }

    setBusy(false)
    if (!failed) {
      setFiles([])
      setTitle('')
      setCaption('')
      setInputKey((k) => k + 1)
    }
    void refresh()
  }

  async function remove(upload: Uploaded) {
    if (!window.confirm(`Delete "${upload.title}" from the site?`)) return
    const response = await fetch(`/api/upload/files?id=${upload.id}`, { method: 'DELETE', headers })
    if (!response.ok) window.alert(await errorText(response))
    void refresh()
  }

  return (
    <div className="space-y-12">
      <form onSubmit={submit} className="rounded-3xl bg-white border border-sky-200 p-6 sm:p-8 shadow-sm space-y-6">
        <fieldset>
          <legend className="font-semibold mb-3">What are you uploading?</legend>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => {
                  setKind(k.value)
                  setFiles([])
                  setInputKey((n) => n + 1)
                }}
                aria-pressed={kind === k.value}
                className={`px-5 py-2 rounded-full border font-semibold transition-colors ${
                  kind === k.value
                    ? 'bg-amber-400 border-amber-400 text-slate-900'
                    : 'bg-white border-sky-300 text-slate-700 hover:border-slate-400'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="upload-files"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50 px-6 py-10 text-center cursor-pointer hover:border-amber-400 transition-colors"
          >
            <UploadIcon className="w-8 h-8 text-sky-700" aria-hidden="true" />
            <span className="font-semibold">
              {files.length === 0
                ? `Choose ${selected.label.toLowerCase()} files`
                : files.length === 1
                  ? files[0].name
                  : `${files.length} files selected`}
            </span>
            <span className="text-sm text-slate-500">{selected.hint} · up to 500 MB each</span>
          </label>
          <input
            key={inputKey}
            id="upload-files"
            type="file"
            multiple
            accept={selected.accept}
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            className="sr-only"
          />
        </div>

        {files.length <= 1 && (
          <div>
            <label htmlFor="upload-title" className="block font-semibold mb-2">
              Title <span className="font-normal text-slate-500">(optional — the filename is used otherwise)</span>
            </label>
            <input
              id="upload-title"
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-sky-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        )}
        <div>
          <label htmlFor="upload-caption" className="block font-semibold mb-2">
            Caption <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <textarea
            id="upload-caption"
            value={caption}
            maxLength={500}
            rows={2}
            onChange={(event) => setCaption(event.target.value)}
            className="w-full rounded-xl border border-sky-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {progress.length > 0 && (
          <ul className="space-y-3">
            {progress.map((p, i) => (
              <li key={i} className="text-sm">
                <div className="flex justify-between gap-4 mb-1">
                  <span className="truncate">{p.name}</span>
                  <span className={p.error ? 'text-red-700' : 'text-slate-500'}>
                    {p.error ? 'Failed' : p.done ? 'Done ✓' : `${p.percent}%`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-sky-100 overflow-hidden">
                  <div
                    className={`h-full ${p.error ? 'bg-red-400' : 'bg-amber-400'} transition-all`}
                    style={{ width: `${p.error ? 100 : p.percent}%` }}
                  />
                </div>
                {p.error && <p className="text-red-700 mt-1">{p.error}</p>}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="submit"
            disabled={busy || files.length === 0}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-amber-400 font-semibold hover:bg-amber-300 transition-colors disabled:opacity-50"
          >
            <UploadIcon className="w-4 h-4" aria-hidden="true" />
            {busy ? 'Uploading… keep this page open' : 'Upload'}
          </button>
          <button type="button" onClick={onSignOut} className="text-sm text-slate-500 hover:text-slate-800">
            Lock uploads
          </button>
        </div>
      </form>

      <div>
        <h2 className="text-2xl font-bold mb-4">On the site</h2>
        {listError && <p className="text-red-700 mb-4">{listError}</p>}
        {uploads.length === 0 && !listError ? (
          <p className="text-slate-500">Nothing uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-sky-200 rounded-2xl border border-sky-200 bg-white">
            {uploads.map((u) => (
              <li key={u.id} className="flex items-center gap-4 p-4">
                <KindIcon kind={u.kind} />
                <div className="min-w-0 flex-1">
                  <a
                    href={u.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-semibold hover:underline"
                  >
                    {u.title}
                  </a>
                  <p className="text-xs text-slate-500">
                    {u.kind} · {formatSize(u.size)} · {new Date(u.createdAt).toLocaleDateString()}
                    {u.status !== 'ready' && ' · unfinished (not shown on the site)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(u)}
                  aria-label={`Delete ${u.title}`}
                  className="p-2 rounded-full text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function KindIcon({ kind }: { kind: Kind }) {
  const className = 'w-5 h-5 text-sky-700 shrink-0'
  if (kind === 'video') return <FileVideo className={className} aria-hidden="true" />
  if (kind === 'music') return <FileAudio className={className} aria-hidden="true" />
  return <FileImage className={className} aria-hidden="true" />
}
