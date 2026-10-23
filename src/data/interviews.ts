/** An interview or feature on London Koi, listed in the Interviews section under the bio. */
export type Interview = {
  /** Headline of the piece, e.g. "Meet London Koi, Birmingham's young old soul". */
  title: string
  /** Who ran it — a station, show, magazine or podcast. */
  outlet: string
  /** Shown as-is, e.g. "October 2026" — no parsing. */
  date?: string
  /** A sentence or two on what was covered. */
  summary?: string
  /** A standout line from London, shown as a pull quote. */
  quote?: string
  /**
   * The 11-character YouTube video ID, embedded through youtube-nocookie.com.
   * Use this for TV segments and video interviews posted to YouTube.
   */
  youtubeId?: string
  /** An interview clip in `public/video/interviews/` (MP4, H.264), served directly. */
  video?: string
  /** Absolute https link to the article, episode or broadcast; shown as a button. */
  url?: string
}

/**
 * Newest first. Empty until interviews are added — the section then says
 * interviews are coming soon, with a link to the booking form for press requests.
 */
export const interviews: Interview[] = []
