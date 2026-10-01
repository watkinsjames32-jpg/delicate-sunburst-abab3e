import { Link } from '@tanstack/react-router'
import { Pause, Play, Youtube } from 'lucide-react'
import { useRef, useState } from 'react'

/** Build a Netlify Image CDN URL so large source images are resized + served as WebP. */
export function img(url: string, w: number, extra?: string, fm: 'webp' | 'jpg' = 'webp') {
  return `/.netlify/images?url=${encodeURIComponent(url)}&w=${w}&fm=${fm}${extra ?? ''}`
}

export function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur bg-sky-50/80 border-b border-sky-200/70">
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between text-slate-900">
        <Link to="/" className="font-bold tracking-wide text-lg">
          LONDON KOI
        </Link>
        <nav className="hidden sm:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="/#about" className="hover:text-slate-900 transition-colors">
            About
          </a>
          <a href="/#featured-performances" className="hover:text-slate-900 transition-colors">
            Featured Performances
          </a>
          <a href="/#music" className="hover:text-slate-900 transition-colors">
            Music
          </a>
          <a href="/#highlights" className="hover:text-slate-900 transition-colors">
            Highlights
          </a>
          <a href="/music#koi-ware" className="hover:text-slate-900 transition-colors">
            Koi Ware
          </a>
          <Link
            to="/music"
            className="px-4 py-2 rounded-full bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300 transition-colors"
          >
            Shop
          </Link>
        </nav>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="py-10 px-6 bg-sky-100 border-t border-sky-200 text-slate-500 text-center text-sm">
      <div className="max-w-5xl mx-auto space-y-3">
        <nav className="flex flex-wrap items-center justify-center gap-6">
          <a href="/#about" className="hover:text-slate-800 transition-colors">
            About
          </a>
          <Link to="/music" className="hover:text-slate-800 transition-colors">
            Shop Music
          </Link>
          <a href="/music#koi-ware" className="hover:text-slate-800 transition-colors">
            Koi Ware Merch
          </a>
          <a href="/#booking" className="hover:text-slate-800 transition-colors">
            Booking
          </a>
        </nav>
        <p>&copy; {new Date().getFullYear()} London Koi. All rights reserved.</p>
      </div>
    </footer>
  )
}

/**
 * 30-second taster for a release, shared by the store cards and the home page's
 * New Single section. Follows the ComingSoonCard pattern: if the clip is
 * missing or the browser won't play it the control disappears rather than
 * sitting there dead, so a preview can be listed before it is uploaded.
 */
export function PreviewPlayer({
  src,
  title,
  variant = 'sm',
}: {
  src?: string
  title: string
  variant?: 'sm' | 'lg'
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!src || failed) return null

  function toggle() {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      // Only one taster should be audible at a time, and the page keeps no
      // shared state, so the other players are paused directly.
      document.querySelectorAll('audio').forEach((other) => {
        if (other !== audio) other.pause()
      })
      void audio.play().catch(() => setFailed(true))
    } else {
      audio.pause()
    }
  }

  return (
    <div className={variant === 'lg' ? 'mb-6' : 'mb-5'}>
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-2 rounded-full bg-white border border-sky-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:border-slate-400 transition-colors"
      >
        {playing ? (
          <Pause className="w-4 h-4" aria-hidden="true" />
        ) : (
          <Play className="w-4 h-4" aria-hidden="true" />
        )}
        {playing ? 'Pause preview' : 'Play 30s preview'}
      </button>
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
        aria-label={`${title} 30 second preview`}
      />
    </div>
  )
}

/**
 * "Watch on YouTube" link for a release's video. Renders nothing when the
 * release has no `youtubeUrl`, so it can sit on every release card.
 */
export function YouTubeLink({ href, title }: { href?: string; title: string }) {
  if (!href) return null

  return (
    <div className="mb-5">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Watch ${title} on YouTube`}
        className="inline-flex items-center gap-2 rounded-full bg-white border border-sky-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:border-slate-400 transition-colors"
      >
        <Youtube className="w-4 h-4 text-red-600" aria-hidden="true" />
        Watch on YouTube
      </a>
    </div>
  )
}
