// xpService.js — import this in any page to award XP
// Usage: awardXP('watched_trailer', 'Elden Ring 2')
import axios from 'axios'

const XP_LABELS = {
  added_game:       { text: 'Added a game to library',  icon: '🎮', xp: 20  },
  completed_game:   { text: 'Completed a game',         icon: '✅', xp: 100 },
  made_friend:      { text: 'Made a new friend',        icon: '👥', xp: 30  },
  watched_trailer:  { text: 'Watched a trailer',        icon: '▶️', xp: 10  },
  read_news:        { text: 'Read a news article',      icon: '📰', xp: 5   },
}

export async function awardXP(action, detail = '') {
  try {
    const res = await axios.post('/api/xp/award', null, {
      params: { action, detail },
    })
    return res.data  // { xp_earned, total_xp, level }
  } catch (e) {
    console.warn('XP award failed:', e)
    return null
  }
}

export { XP_LABELS }
