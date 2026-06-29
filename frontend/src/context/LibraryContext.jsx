import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuth } from './AuthContext'

const LibraryContext = createContext(null)

export function LibraryProvider({ children }) {
  const [library, setLibrary] = useState([])
  const [loading, setLoading] = useState(true)
  const pendingRef  = useRef(new Set())
  const libraryRef  = useRef([])
  const fetchingRef = useRef(false)
  const { user }    = useAuth()

  function normalizeEntry(entry) {
    return {
      id:       entry.id,
      gameId:   entry.game_id,
      slug:     entry.game?.title?.toLowerCase().replace(/\s+/g, '-') || '',
      rawgId:   null,
      title:    entry.game?.title    || 'Unknown',
      genre:    entry.game?.genre    || 'Unknown',
      rating:   entry.game?.rating   || 0,
      cover:    entry.game?.cover_url || null,
      accent:   '#6366f1',
      status:   entry.status,
      fav:      entry.is_favorite,
      hours:    entry.hours_played,
      added_at: entry.added_at,
    }
  }

  const fetchLibrary = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)
    try {
      const res = await axios.get('/api/library/')
      const normalized = res.data.map(normalizeEntry)
      setLibrary(normalized)
      libraryRef.current = normalized
    } catch (err) {
      console.error('Failed to fetch library:', err)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setLibrary([])
      libraryRef.current = []
      setLoading(false)
      return
    }
    fetchingRef.current = false
    fetchLibrary()
  }, [user?.id, fetchLibrary])

  const isInLibrary = useCallback((slugOrId) => {
    if (!slugOrId) return false
    return libraryRef.current.some(
      g => g.slug === slugOrId || g.rawgId === slugOrId || g.gameId === slugOrId
    )
  }, [])

  // Returns true if newly added, false if already in library, throws on real errors
  const addToLibrary = useCallback(async (gameData) => {
    const key = gameData.slug || gameData.title

    // Already in flight
    if (pendingRef.current.has(key)) return false

    // Already in library — return false so callers know not to award XP
    if (libraryRef.current.some(g =>
      (gameData.slug && g.slug === gameData.slug) ||
      (gameData.rawgId && g.rawgId === gameData.rawgId)
    )) return false

    pendingRef.current.add(key)
    try {
      // Step 1: ensure game exists in /api/games/
      let gameId
      try {
        const gameRes = await axios.post('/api/games/', {
          title:          gameData.title,
          description:    gameData.description   || '',
          genre:          gameData.genre          || '',
          platform:       gameData.platform       || '',
          release_year:   gameData.release_year   || null,
          developer:      gameData.developer      || '',
          publisher:      gameData.publisher      || '',
          rating:         gameData.rating         || 0,
          cover_url:      gameData.cover          || '',
          trailer_url:    '',
          is_free:        false,
          is_multiplayer: false,
        })
        gameId = gameRes.data.id
      } catch {
        // Game already exists — look it up
        const searchRes = await axios.get(`/api/games/?search=${encodeURIComponent(gameData.title)}`)
        const found = searchRes.data.find(g => g.title === gameData.title)
        if (!found) throw new Error('Could not create or find game')
        gameId = found.id
      }

      // Step 2: add to user's library
      const libRes = await axios.post('/api/library/', {
        game_id:      gameId,
        status:       'wishlist',
        hours_played: 0,
        is_favorite:  false,
        user_rating:  0,
      })

      // If backend says already in library, return false
      if (libRes.status === 400) return false

      // Optimistically update local state immediately (don't wait for refetch)
      const newEntry = normalizeEntry({
        ...libRes.data,
        game: {
          title:     gameData.title,
          genre:     gameData.genre     || '',
          rating:    gameData.rating    || 0,
          cover_url: gameData.cover     || '',
        },
      })
      setLibrary(prev => {
        const updated = [newEntry, ...prev]
        libraryRef.current = updated
        return updated
      })

      return true // ← success flag for XP
    } catch (err) {
      // "Game already in library" from backend = not a real error
      if (err?.response?.data?.detail === 'Game already in library') return false
      console.error('Failed to add to library:', err)
      return false
    } finally {
      pendingRef.current.delete(key)
      // Sync with server in background
      fetchLibrary()
    }
  }, [fetchLibrary])

  const removeFromLibrary = useCallback(async (slugOrId) => {
    if (!slugOrId) return
    const entry = libraryRef.current.find(g =>
      g.id === slugOrId || g.slug === slugOrId || g.rawgId === slugOrId
    )
    if (!entry) return
    try {
      await axios.delete(`/api/library/${entry.id}`)
      setLibrary(prev => {
        const updated = prev.filter(g => g.id !== entry.id)
        libraryRef.current = updated
        return updated
      })
    } catch (err) {
      console.error('Failed to remove from library:', err)
    }
  }, [])

  const toggleFav = useCallback(async (id) => {
    const entry = libraryRef.current.find(g => g.id === id)
    if (!entry) return
    try {
      await axios.put(`/api/library/${id}`, { is_favorite: !entry.fav })
      setLibrary(prev => prev.map(g => g.id === id ? { ...g, fav: !g.fav } : g))
      libraryRef.current = libraryRef.current.map(g => g.id === id ? { ...g, fav: !g.fav } : g)
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }, [])

  const updateStatus = useCallback(async (id, status) => {
    try {
      await axios.put(`/api/library/${id}`, { status })
      setLibrary(prev => prev.map(g => g.id === id ? { ...g, status } : g))
      libraryRef.current = libraryRef.current.map(g => g.id === id ? { ...g, status } : g)
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }, [])

  return (
    <LibraryContext.Provider value={{ library, loading, isInLibrary, addToLibrary, removeFromLibrary, toggleFav, updateStatus }}>
      {children}
    </LibraryContext.Provider>
  )
}

export function useLibrary() {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>')
  return ctx
}
