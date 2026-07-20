// xpService.js — import this in any page to award XP
// Usage: awardXP('watched_trailer', 'Elden Ring 2')
import axios from 'axios'
import { xpEventBus } from '../components/AllToasts'

const XP_LABELS = {
  added_game:       { text: 'Added a game to library',  icon: '🎮', xp: 20  },
  completed_game:   { text: 'Completed a game',         icon: '✅', xp: 100 },
  made_friend:      { text: 'Made a new friend',        icon: '👥', xp: 30  },
  watched_trailer:  { text: 'Watched a trailer',        icon: '▶️', xp: 10  },
  read_news:        { text: 'Read a news article',      icon: '📰', xp: 5   },
}

export async function awardXP(action, detail = '') {
  try {
    // JSON body, not query params — matches the /api/xp/award endpoint
    const res = await axios.post('/api/xp/award', { action, detail })
    const data = res.data  // { xp_earned, total_xp, level, leveled_up, old_level }

    // Push into the global toast system so it shows up on whichever page
    // called this, no matter what.
    if (data.xp_earned > 0) {
      xpEventBus.emit({ kind: 'xp', xpEarned: data.xp_earned, action, detail })
    }
    if (data.leveled_up) {
      xpEventBus.emit({ kind: 'level_up', level: data.level })
    }

    return data
  } catch (e) {
    console.warn('XP award failed:', e)
    return null
  }
}

export { XP_LABELS }
