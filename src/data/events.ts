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
    ],
  },
]
