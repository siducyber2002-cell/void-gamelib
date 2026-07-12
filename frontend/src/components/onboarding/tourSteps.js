// Each `target` must match a `data-tour="..."` attribute added directly in
// the page component. Keep pageKey unique per page — it's what the backend
// uses to remember which tours a user has already completed.

export const trendingTourSteps = [
  {
    target: '[data-tour="trending-hero"]',
    title: 'What everyone\'s playing',
    content: 'The single most-added game right now, updated live as the numbers shift.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="trending-grid"]',
    title: 'Four ways to discover',
    content: 'Trending Now, Most Popular, Highest Rated, and New & Rising — each refreshes automatically every 5 minutes.',
    placement: 'top',
  },
]

export const settingsTourSteps = [
  {
    target: '[data-tour="settings-account-info"]',
    title: 'Your account details',
    content: 'Username, email, and how long you\'ve been part of VOID.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="settings-change-password"]',
    title: 'Update your password',
    content: 'Enter your current password, then set a new one.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="settings-danger-zone"]',
    title: 'Handle with care',
    content: 'Account deletion is permanent — it removes your library, friends, achievements, and activity history for good.',
    placement: 'top',
  },
]

export const profileTourSteps = [
  {
    target: '[data-tour="profile-avatar"]',
    title: 'Make it yours',
    content: 'Tap your avatar to upload a profile picture — the camera icon works too.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="profile-edit-btn"]',
    title: 'Edit your details',
    content: 'Update your username, country, bio, and favorite game any time.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="profile-xp-bar"]',
    title: 'Level up',
    content: 'XP comes from playing — adding games, finishing them, making friends, watching trailers, reading news.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="profile-stats"]',
    title: 'Your stats',
    content: 'A quick snapshot of your activity across VOID.',
    placement: 'top',
  },
]

export const newsTourSteps = [
  {
    target: '[data-tour="news-category-tabs"]',
    title: 'Pick a category',
    content: 'Industry News, Updates, Patch Notes, Esports, or Upcoming Releases — switch between them here.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="news-date-filter"]',
    title: 'Filter by date',
    content: 'Narrow headlines to today, this week, this month, or pick a custom range.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="news-articles"]',
    title: 'Read up',
    content: 'Articles refresh automatically every 10 minutes, or hit Refresh above for the latest right now.',
    placement: 'top',
  },
]

export const libraryTourSteps = [
  {
    target: '[data-tour="library-stats"]',
    title: 'Your collection, summarized',
    content: 'Total games, what you\'re playing, what you\'ve finished, your wishlist, and favorites.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="library-tabs"]',
    title: 'Filter by status',
    content: 'Jump straight to Playing, Completed, Wishlist, or Favorites.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="library-game-grid"]',
    title: 'Manage each game',
    content: 'Hover a cover to favorite or remove it, and use the status buttons on each card to mark it Playing, Completed, or Wishlist.',
    placement: 'top',
  },
]

export const friendsTourSteps = [
  {
    target: '[data-tour="friends-add-btn"]',
    title: 'Add a friend',
    content: 'Search by username to send a friend request.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="friends-stats-strip"]',
    title: 'Your squad, at a glance',
    content: 'Total friends, who\'s online right now, pending requests, and anyone you\'ve blocked.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="friends-tabs"]',
    title: 'Switch views',
    content: 'Jump between all friends, pending requests, and who\'s online or offline right now.',
    placement: 'bottom',
  },
]

export const exploreTourSteps = [
  {
    target: '[data-tour="explore-search"]',
    title: 'Search 500,000+ games',
    content: 'Type a title and results update automatically after a short pause.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="explore-filters-btn"]',
    title: 'Narrow it down',
    content: 'Filter by genre, platform, release year, or minimum Metacritic score. Combine as many as you like.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="explore-game-grid"]',
    title: 'Browse results',
    content: 'Click any game for details, or add it straight to your library from its card.',
    placement: 'top',
  },
]

export const dashboardTourSteps = [
  {
    target: '[data-tour="dash-stat-cards"]',
    title: 'Your stats at a glance',
    content: 'Friends, completed games, and your total library size — all live, updating as you play.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="dash-breakdown-row"]',
    title: 'Breakdown, progress, and streak',
    content: "See how your library splits by status, how far you've gotten toward completing what you own, and your daily login streak.",
    placement: 'top',
  },
  {
    target: '[data-tour="dash-recent-activity"]',
    title: 'Recent activity feed',
    content: "A running log of what you and your friends have been up to — new games added, completions, and new friendships.",
    placement: 'top',
  },
]

export const communityTourSteps = [
  {
    target: '[data-tour="community-search"]',
    title: 'Search groups',
    content: 'Look up groups by name or the game they focus on.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="create-group-btn"]',
    title: 'Start your own group',
    content: 'Set a name, description, tier, and rules — you become the owner and can approve join requests.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="groups-list"]',
    title: 'Browse and join',
    content: "Tap a group to open it, or hit Request to Join right from here. If you're already a member, tap through to jump straight in.",
    placement: 'top',
  },
]

export const groupDetailTourSteps = [
  {
    target: '[data-tour="group-chat-input"]',
    title: 'Chat with the group',
    content: 'Type a message, attach a file, drop an emoji, or hold the mic icon for a voice note — all from right here.',
    disableBeacon: true,
    placement: 'top',
  },
  {
    target: '[data-tour="group-members-panel"]',
    title: "See who's here",
    content: "Everyone in the group is listed here, with owners and admins marked. Send a friend request straight from a member's row.",
    placement: 'left',
  },
  {
    target: '[data-tour="group-media-panel"]',
    title: 'Shared media',
    content: 'Images shared in the chat collect here automatically — tap the icon to upload one directly.',
    placement: 'left',
  },
]

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
