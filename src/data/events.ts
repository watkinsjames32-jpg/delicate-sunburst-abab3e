/** A photo or video from a past performance, served out of `public/`. */
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

export type PastEvent = {
  title: string
  /** Shown as-is, e.g. "September 2025" — no parsing. */
  date?: string
  location?: string
  description?: string
  /**
   * Photos go in `public/img/events/` (shown through the Image CDN), videos in
   * `public/video/events/` (served directly). Empty until files are sent over;
   * the card shows a placeholder tile instead.
   */
  media: EventMedia[]
}

/** Newest first. */
export const pastEvents: PastEvent[] = [
  {
    title: 'Caesars Superdome',
    location: 'New Orleans, Louisiana',
    description:
      'Sang the national anthem before a New Orleans Saints game in front of roughly 80,000 fans.',
    media: [],
  },
]
