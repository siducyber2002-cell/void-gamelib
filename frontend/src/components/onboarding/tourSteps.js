// Each `target` must match a `data-tour="..."` attribute added directly in
// the page component. Keep pageKey unique per page — it's what the backend
// uses to remember which tours a user has already completed.

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
