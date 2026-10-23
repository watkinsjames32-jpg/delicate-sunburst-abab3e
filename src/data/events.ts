/** A photo or video from a featured performance, served out of `public/`. */
export type EventMedia =
  | { type: 'photo'; src: string; alt: string }
  | {
      type: 'video'
      src: string
      /** Describes the clip for screen readers. */
      label: string
      /** Optional still shown before the clip plays. */
      poster?: string
    }
  | {
      type: 'youtube'
      /** The 11-character YouTube video ID, e.g. `WKUSmdb4bpE`. */
      id: string
      /** Title of the embedded player, for screen readers. */
      title: string
    }

export type PastEvent = {
  title: string
  /** Shown as-is, e.g. "September 2025" — no parsing. */
  date?: string
  location?: string
  description?: string
  /**
   * Photos go in `public/img/events/` (shown through the Image CDN), videos in
   * `public/video/events/` (served directly). Empty until files are sent over;
   * the card shows a placeholder tile instead. YouTube videos are embedded by ID
   * and span the full width of the card.
   */
  media: EventMedia[]
}

/** A show that hasn't happened yet, listed in the Upcoming half of the Events section. */
export type UpcomingEvent = {
  title: string
  /** Shown as-is, e.g. "Saturday, November 14, 2026 · 8 PM" — no parsing. */
  date: string
  venue?: string
  location?: string
  description?: string
  /** Absolute https link to buy tickets or RSVP; shown as a "Get tickets" button. */
  ticketUrl?: string
  /**
   * Portrait tour or show poster in `public/img/events/`, shown through the Image
   * CDN beside the details and linked to the full-size file. Hides itself if missing.
   * Set `square` for a 1:1 social-media flyer so it isn't cropped to portrait.
   */
  flyer?: { src: string; alt: string; square?: boolean }
}

/**
 * Soonest first. Empty until shows are announced — the section then says new
 * dates are coming soon. Once a show has happened, move it into `pastEvents`
 * (adding any photos or video) so it shows under Past Events.
 */
export const upcomingEvents: UpcomingEvent[] = [
  {
    title: "Buy London Koi's Music Now!",
    date: 'Out now',
    description:
      'New music. New energy. Same queen. New level. Be the first to get "FaceTime" and "Tomorrow" — stream, download, and shop music, merch and more at londonkoi.org.',
    flyer: {
      src: '/img/events/buy-london-koi-music-now-flyer.jpg',
      alt: 'Buy London Koi\'s Music Now! flyer: London Koi smiling in a black leather and denim outfit in front of a neon pink city skyline, with "FaceTime" and "Tomorrow" single covers, "Be the first to get it! It\'s hot!" and "londonkoi.org — Buy music • Merch • And more"',
    },
  },
  {
    title: 'FaceTime Remix Superstar 100 Contest',
    date: 'Now open',
    description:
      'Join the #FaceTimeRemixChallenge for a chance to win an iPhone. Like, comment and share to take part.',
    flyer: {
      src: '/img/events/facetime-remix-superstar-100-contest-flyer.jpg',
      alt: 'FaceTime Remix Superstar 100 Contest flyer: London Koi in a studded denim jacket and black tie above the FaceTime Remix logo, with "Like | Comment | Share" and "Join the #FaceTimeRemixChallenge for a chance to win an iPhone"',
      square: true,
    },
  },
  {
    title: 'Face Time Is Anytime Tour',
    date: '2026 – 2027',
    description:
      'Live. Intimate. Unfiltered. New music, new energy and a new level — live performances, special guests, VIP experiences and unforgettable nights in more cities. Tickets and VIP packages available soon.',
    flyer: {
      src: '/img/events/face-time-is-anytime-tour-flyer.png',
      alt: 'Face Time Is Anytime Tour flyer: London Koi smiling in a denim and black leather outfit in front of a red curtain and city skyline, with the tour dates 2026 – 2027 and "Tickets & VIP packages available soon"',
    },
  },
  {
    title: 'London Koi × Formula 1',
    date: 'Coming soon',
    description:
      'Dreams. Drive. Music. London Koi. Big dreams, fast moves — same girl, bigger dreams. Singer, songwriter, actor.',
    flyer: {
      src: '/img/events/london-koi-formula-1-flyer.jpg',
      alt: 'London Koi × Formula 1 flyer: London Koi smiling, seated on a white block in a colourful patchwork jacket and jewelled jeans beside a Formula 1 car and checkered flags, with "Dreams. Drive. Music. London Koi.", "Big Dreams Fast Moves" and "Same girl. Bigger dreams."',
    },
  },
]

/** Newest first. */
export const pastEvents: PastEvent[] = [
  {
    title: 'WATC 57 Atlanta Live!',
    location: 'Atlanta, Georgia',
    description: 'Performed live on WATC 57\'s Atlanta Live! television broadcast.',
    media: [
      {
        type: 'youtube',
        id: 'WKUSmdb4bpE',
        title: 'London Koi performs on WATC 57 Atlanta Live!',
      },
    ],
  },
  {
    title: 'In The Studio with Three-Time Grammy Winner Herb Middleton',
    description:
      'Behind the scenes in the studio with three-time Grammy-winning producer Herb Middleton during a recording session.',
    media: [
      {
        type: 'video',
        src: '/video/events/in-the-studio-with-herb-middleton.mp4',
        label: 'London Koi in the studio with three-time Grammy winner Herb Middleton',
      },
      {
        type: 'video',
        src: '/video/events/studio-with-herb-middleton.mp4',
        label: 'London Koi recording with Herb Middleton in the studio',
      },
      {
        type: 'photo',
        src: '/img/events/studio-recording-session.jpg',
        alt: 'London Koi in headphones in a purple vocal booth, seated beside the studio microphone during a recording session',
      },
      {
        type: 'photo',
        src: '/img/events/london-koi-with-david-sea.jpg',
        alt: 'London Koi smiling between two men backstage at night, one holding a Steel City Smooth Jazz Music Festival lifetime achievement plaque for David Sea of The Temptations',
      },
    ],
  },
]
