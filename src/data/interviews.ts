/** A YouTube interview, embedded through youtube-nocookie.com. */
export type VideoInterview = {
  /** The 11-character YouTube video ID, e.g. `WKUSmdb4bpE`. */
  id: string
  title: string
  /** Who ran the interview, e.g. "WBRC FOX6 News". */
  outlet?: string
  /** Shown as-is, e.g. "October 2026" — no parsing. */
  date?: string
}

/** An article or podcast episode hosted elsewhere, shown as an outbound link. */
export type PressLink = {
  title: string
  outlet: string
  url: string
  kind: 'article' | 'podcast'
  date?: string
  /** One-line summary or pull quote. */
  description?: string
}

/** Newest first. Empty until links are sent over; the section shows a placeholder. */
export const videoInterviews: VideoInterview[] = []

/** Newest first. */
export const pressLinks: PressLink[] = []
