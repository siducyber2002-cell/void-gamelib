// Each `target` must match a `data-tour="..."` attribute added directly in
// the page component. Keep pageKey unique per page — it's what the backend
// uses to remember which tours a user has already completed.

export const homeTourSteps = [
  {
    target: '[data-tour="search-bar"]',
    title: 'Find anything, fast',
    content: 'Search by game title, genre, or even players. Results show up as you type.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="play-trailer-btn"]',
    title: 'Watch a trailer',
    content: "Hit Play Trailer on the featured game up top — it pulls the official trailer straight from YouTube.",
    placement: 'bottom',
  },
  {
    target: '[data-tour="add-library-btn"]',
    title: 'Build your library',
    content: 'Add to Library saves a game to your collection so you can track it later. This button shows up everywhere you see a game card.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="categories-section"]',
    title: 'Browse by genre',
    content: 'Tap any category — RPG, Action, Horror, and more — to open a filtered list of games in that genre.',
    placement: 'top',
  },
  {
    target: '[data-tour="recent-library-section"]',
    title: 'Your collection lives here',
    content: 'Everything you add shows up in this filmstrip, most recent first.',
    placement: 'top',
  },
]
