import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

import { Footer, Nav, PreviewPlayer, YouTubeLink, img } from '../components/site'
import { featuredProduct } from '../data/catalog'
import { pastEvents } from '../data/events'
import type { EventMedia, PastEvent } from '../data/events'
import { siteUrl } from './__root'

export const Route = createFileRoute('/')({
  head: () => ({
    links: [{ rel: 'canonical', href: `${siteUrl}/` }],
  }),
  component: Home,
})

const highlights = [
  {
    title: 'Caesars Superdome',
    detail:
      'Sang the national anthem before a New Orleans Saints game in front of roughly 80,000 fans.',
  },
  {
    title: "Mayor's Inauguration",
    detail: "Performed at Birmingham Mayor Randall Woodfin's 2025 inaugural celebration.",
  },
  {
    title: 'Alabama School of Fine Arts',
    detail: 'Seventh-grader studying voice, acting, and dance in Birmingham.',
  },
]

function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-sky-50"
    >
      <div className="max-w-6xl mx-auto px-6 pt-32 pb-20 grid gap-12 md:grid-cols-2 md:items-center">
        <div className="text-center md:text-left">
          <p className="uppercase tracking-[0.3em] text-sky-700 text-sm font-semibold mb-4">
            Birmingham, Alabama
          </p>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 mb-6">
            London Koi
          </h1>
          <p className="text-lg sm:text-xl text-slate-700 mb-10 leading-relaxed">
            A 13-year-old soul &amp; R&amp;B voice from Birmingham with an old soul and a new
            single, <span className="italic">&ldquo;FaceTime.&rdquo;</span>
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            <Link
              to="/music"
              className="px-7 py-3 rounded-full bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300 transition-colors shadow-sm"
            >
              Shop Music &amp; Merch
            </Link>
            <a
              href="#booking"
              className="px-7 py-3 rounded-full border border-sky-400 text-sky-800 font-semibold hover:bg-sky-100 transition-colors"
            >
              Book London
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="aspect-4/5 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-sky-300/60 bg-sky-200">
            <img
              src={img('/img/london-koi-portrait.jpg', 900)}
              srcSet={`${img('/img/london-koi-portrait.jpg', 600)} 600w, ${img('/img/london-koi-portrait.jpg', 900)} 900w, ${img('/img/london-koi-portrait.jpg', 1300)} 1300w`}
              sizes="(min-width: 768px) 45vw, 90vw"
              alt="London Koi, a young R&B and soul vocalist, photographed in a yellow blazer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function About() {
  return (
    <section id="about" className="py-24 px-6 bg-white text-slate-900">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">About London</h2>
        <div className="space-y-5 text-slate-600 text-lg leading-relaxed">
          <p>
            London Koi started singing before she could really talk in full sentences — she held
            the note on &ldquo;Twinkle, Twinkle, Little Star&rdquo; as a toddler, and her family
            knew right away she was different. Voice lessons started around age three, and by
            four she was already training with a coach who normally didn&rsquo;t take students
            that young.
          </p>
          <p>
            Now a seventh-grader at the Alabama School of Fine Arts, London studies voice,
            acting, and dance, and is mentored by a former member of The Temptations on vocal
            control and crowd interaction. Seven years of dance training and a childhood full of
            classic R&amp;B on car rides shaped a sound she describes simply:
          </p>
          <blockquote className="border-l-4 border-amber-400 pl-5 italic text-slate-900 text-xl my-8">
            &ldquo;I feel like I give an R&amp;B, soulful sound. I&rsquo;ve always felt like an
            old soul.&rdquo;
          </blockquote>
          <p>
            When she performs, it&rsquo;s never a stretch — it&rsquo;s the most natural thing in
            the world to her. &ldquo;When I sing, it just feels natural,&rdquo; she says.
            &ldquo;It&rsquo;s been a part of me for so long.&rdquo; Her message to other kids
            chasing a dream is just as direct: &ldquo;If you believe it, you can achieve it.&rdquo;
          </p>
        </div>
      </div>
    </section>
  )
}

function PastEvents() {
  return (
    <section id="past-events" className="py-24 px-6 bg-sky-50 text-slate-900 scroll-mt-20">
      <div className="max-w-5xl mx-auto">
        <p className="uppercase tracking-[0.3em] text-sky-700 text-sm font-semibold mb-3 text-center">
          Photos &amp; Video
        </p>
        <h2 className="text-3xl font-bold mb-12 text-center">Past Events</h2>
        <div className="space-y-10">
          {pastEvents.map((event) => (
            <EventCard key={event.title} event={event} />
          ))}
        </div>
      </div>
    </section>
  )
}

function EventCard({ event }: { event: PastEvent }) {
  const meta = [event.date, event.location].filter(Boolean).join(' · ')

  return (
    <article className="rounded-3xl border border-sky-200 bg-white shadow-sm overflow-hidden">
      <div className="p-7 sm:p-8">
        <h3 className="text-2xl font-semibold text-sky-800">{event.title}</h3>
        {meta && <p className="text-sm text-slate-500 mt-1">{meta}</p>}
        {event.description && (
          <p className="text-slate-600 leading-relaxed mt-4">{event.description}</p>
        )}
      </div>
      <div className="px-7 pb-7 sm:px-8 sm:pb-8">
        {event.media.length > 0 ? (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
            {event.media.map((item) => (
              <EventMediaTile key={item.src} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-sky-300 bg-sky-50 py-12 text-center text-slate-500">
            Photos and video coming soon
          </div>
        )}
      </div>
    </article>
  )
}

/** Hides itself if the file is missing, so media can be listed before it is uploaded. */
function EventMediaTile({ item }: { item: EventMedia }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null

  return (
    <div className="aspect-square rounded-2xl overflow-hidden bg-slate-900">
      {item.type === 'photo' ? (
        <img
          src={img(item.src, 600)}
          srcSet={`${img(item.src, 400)} 400w, ${img(item.src, 600)} 600w, ${img(item.src, 900)} 900w`}
          sizes="(min-width: 768px) 30vw, 45vw"
          alt={item.alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <video
          src={item.src}
          poster={item.poster ? img(item.poster, 600) : undefined}
          controls
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
          aria-label={item.label}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  )
}

function Music() {
  return (
    <section id="music" className="py-24 px-6 bg-sky-50 text-slate-900">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
        <div className="w-full md:w-1/2">
          <div className="aspect-square rounded-3xl overflow-hidden shadow-xl ring-1 ring-sky-200">
            <img
              src={img('/img/facetime-new-hot-single.jpg', 900)}
              alt='London Koi "FaceTime" — new hot single, on all music platforms'
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <div className="w-full md:w-1/2">
          <p className="uppercase tracking-widest text-sky-700 text-sm font-semibold mb-3">
            New Hot Single
          </p>
          <h2 className="text-4xl font-bold mb-4">
            &ldquo;{featuredProduct.title}&rdquo;
          </h2>
          <p className="text-slate-600 text-lg leading-relaxed mb-8">
            London&rsquo;s latest single showcases a different side of her voice — not just the
            big belting moments, but the softer, more personal ranges too. It&rsquo;s the next
            step from an artist who&rsquo;s already sung for tens of thousands of people and
            still calls the studio her happy place.
          </p>
          <PreviewPlayer
            src={featuredProduct.preview}
            title={featuredProduct.title}
            variant="lg"
          />
          <YouTubeLink href={featuredProduct.youtubeUrl} title={featuredProduct.title} />
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="/music#music"
              className="px-7 py-3 rounded-full bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300 transition-colors shadow-sm"
            >
              Buy &amp; Download
            </a>
            <span className="text-sm text-slate-500">
              Also on all major streaming platforms
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function KoiWare() {
  const lines = [
    { category: 'T-Shirts', copy: 'Heavyweight cotton, koi mark across the chest' },
    { category: 'Hoodies', copy: 'Brushed fleece pullovers with embroidered koi' },
    { category: 'Caps', copy: 'Adjustable twill, one size' },
    { category: 'Sweats', copy: 'Tapered joggers that match the hoodie' },
    { category: 'Jeans', copy: 'Straight-fit rigid denim, mid indigo' },
    { category: 'Accessories', copy: 'Heavy canvas totes and more' },
  ]

  return (
    <section id="merch" className="py-24 px-6 bg-white text-slate-900 scroll-mt-20">
      <div className="max-w-5xl mx-auto">
        <div className="max-w-2xl">
          <p className="uppercase tracking-widest text-sky-700 text-sm font-semibold mb-3">
            Merchandise
          </p>
          <h2 className="text-4xl font-bold mb-4">Koi Ware</h2>
          <p className="text-slate-600 text-lg leading-relaxed mb-8">
            London&rsquo;s own clothing line, printed and embroidered in small runs and packed by
            hand in Birmingham. Tees, hoodies, caps, sweats, denim and more — wear it to a show
            and you&rsquo;ll be spotted from the stage.
          </p>
        </div>

        <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {lines.map((line) => (
            <div
              key={line.category}
              className="flex items-baseline justify-between gap-4 border-b border-sky-100 pb-4"
            >
              <span className="font-semibold text-slate-900">{line.category}</span>
              <span className="text-sm text-slate-500 text-right">{line.copy}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="/music#koi-ware"
            className="px-7 py-3 rounded-full bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300 transition-colors shadow-sm"
          >
            Shop Koi Ware
          </a>
          <span className="text-sm text-slate-500">Flat US shipping, free over $75</span>
        </div>
      </div>
    </section>
  )
}

function Highlights() {
  return (
    <section id="highlights" className="py-24 px-6 bg-white text-slate-900">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold mb-12 text-center">On the Big Stages</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {highlights.map((h) => (
            <div
              key={h.title}
              className="rounded-2xl p-7 border border-sky-200 bg-sky-50 shadow-sm"
            >
              <h3 className="text-xl font-semibold mb-3 text-sky-800">{h.title}</h3>
              <p className="text-slate-600 leading-relaxed">{h.detail}</p>
            </div>
          ))}
        </div>
        <blockquote className="mt-14 text-center italic text-2xl text-slate-800 max-w-2xl mx-auto">
          &ldquo;It was just me and the music.&rdquo;
        </blockquote>
        <p className="text-center text-slate-500 mt-3">
          — on singing the anthem at the Superdome
        </p>
      </div>
    </section>
  )
}

/** Management contacts, listed alongside the booking form so inquiries can skip it. */
const MANAGEMENT_EMAILS = [
  'iamjohnsaxwilliams@gmail.com',
  'maxx41111@gmail.com',
  'watkinsjames32@gmail.com',
]

function Booking() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('sending')
    const form = e.currentTarget
    const formData = new FormData(form)
    const params = new URLSearchParams()
    formData.forEach((value, key) => params.append(key, value.toString()))
    try {
      const response = await fetch('/__forms.html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })
      if (response.ok) {
        setStatus('sent')
        form.reset()
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <section id="booking" className="py-24 px-6 bg-sky-50 text-slate-900">
      <div className="max-w-xl mx-auto">
        <h2 className="text-3xl font-bold mb-3 text-center">Booking &amp; Contact</h2>
        <p className="text-slate-600 text-center mb-8">
          For performance bookings, press, or partnership inquiries, send a message below or
          email the management team directly.
        </p>

        <div className="mb-10 rounded-2xl border border-sky-200 bg-white p-6 text-center">
          <p className="uppercase tracking-widest text-sky-700 text-xs font-semibold mb-3">
            Management Team
          </p>
          <ul className="space-y-1 text-slate-700">
            {MANAGEMENT_EMAILS.map((email) => (
              <li key={email}>
                <a
                  href={`mailto:${email}`}
                  className="underline decoration-sky-300 underline-offset-4 hover:text-slate-900 transition-colors break-all"
                >
                  {email}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {status === 'sent' ? (
          <p className="text-center text-sky-800 text-lg font-medium">
            Thank you! Your message has been sent.
          </p>
        ) : (
          <form
            name="booking"
            method="POST"
            data-netlify="true"
            netlify-honeypot="bot-field"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <input type="hidden" name="form-name" value="booking" />
            <p className="hidden">
              <label>
                Don&rsquo;t fill this out: <input name="bot-field" />
              </label>
            </p>

            <div>
              <label className="block text-sm text-slate-600 mb-1" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-lg bg-white border border-sky-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-lg bg-white border border-sky-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1" htmlFor="message">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                className="w-full rounded-lg bg-white border border-sky-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                placeholder="Tell us about the event or opportunity"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full px-7 py-3 rounded-full bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300 transition-colors disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending…' : 'Send Message'}
            </button>

            {status === 'error' && (
              <p className="text-center text-red-600 text-sm">
                Something went wrong. Please try again.
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  )
}

function Home() {
  return (
    <main className="bg-sky-50">
      <Nav />
      <Hero />
      <About />
      <PastEvents />
      <Music />
      <KoiWare />
      <Highlights />
      <Booking />
      <Footer />
    </main>
  )
}
