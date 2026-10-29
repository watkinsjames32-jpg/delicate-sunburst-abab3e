/** A press, radio, TV or podcast interview, listed in the Interviews section under the bio. */
export type Interview = {
  /** Headline or episode title, e.g. "Birmingham's 12-year-old soul singer". */
  title: string
  /** Who ran it, e.g. "WBRC FOX6 News" or "AL.com". */
  outlet: string
  /** Shown as-is, e.g. "March 2026" — no parsing. */
  date?: string
  description?: string
  /** A line London said in the interview, shown as a pull quote. */
  quote?: string
  /**
   * 11-character YouTube video ID; when set, the interview is embedded through
   * youtube-nocookie.com instead of only being linked.
   */
  youtubeId?: string
  /** Absolute https link to the article, video or episode. */
  url?: string
  /** Button wording for `url`; defaults to "Read the interview". */
  linkLabel?: string
}

/**
 * Newest first. When empty, the section says interviews are coming soon and
 * points press to the booking form.
 */
export const interviews: Interview[] = [
  {
    // Add `date`, `youtubeId` or `url` and a `quote` once the clip is sent over.
    title: 'London Koi on Good Day Alabama',
    outlet: 'Good Day Alabama · WBRC FOX6 News',
    description:
      "London Koi appeared on Birmingham's morning show Good Day Alabama on WBRC FOX6 News.",
  },
]
