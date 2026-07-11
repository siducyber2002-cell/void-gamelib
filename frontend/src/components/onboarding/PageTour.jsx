import { Joyride, STATUS } from 'react-joyride'
import { useEffect, useState } from 'react'
import VoidTooltip from './VoidTooltip'
import { useAuth } from '../../context/AuthContext'

/**
 * Runs a one-time guided tour for `pageKey`, driven by the user's
 * `onboarding_seen_pages` list on the backend (not localStorage — so it
 * doesn't replay on a new device or after clearing site data).
 *
 * ready: pass false while the page's own data is still loading, so Joyride
 * never tries to attach to a target that hasn't rendered yet.
 *
 * Built against react-joyride v3 (named export, onEvent callback, options
 * object for buttons/theming) — v2's default-export + callback + styles.options
 * API will NOT work with this version of the package.
 */
export default function PageTour({ pageKey, steps, ready = true }) {
  const { user, markOnboardingSeen } = useAuth()
  const [run, setRun] = useState(false)

  const alreadySeen = (user?.onboarding_seen_pages || []).includes(pageKey)

  useEffect(() => {
    if (!user || alreadySeen || !ready) return
    // Small delay lets layout/animations (e.g. hero fade-in) settle so the
    // spotlight doesn't measure an element mid-transition.
    const t = setTimeout(() => setRun(true), 500)
    return () => clearTimeout(t)
  }, [user, alreadySeen, ready])

  const handleEvent = (data) => {
    const { status } = data
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false)
      markOnboardingSeen(pageKey)
    }
  }

  if (!user || alreadySeen) return null

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      onEvent={handleEvent}
      tooltipComponent={VoidTooltip}
      options={{
        // 'skip' isn't in v3's default button set — add it explicitly.
        buttons: ['skip', 'back', 'close', 'primary'],
        zIndex: 10000,
        arrowColor: 'rgba(15,15,25,0.92)',
        overlayColor: 'rgba(3,3,8,0.72)',
        primaryColor: '#a855f7',
        // Without this, each step shows a pulsing beacon dot that the user
        // has to click before the tooltip appears — fine for a "discover at
        // your own pace" tour, but not what we want here. skipBeacon jumps
        // straight to spotlight + tooltip on every step, so the whole page
        // stays veiled and each element auto-highlights in sequence —
        // closer to a mobile-game-style onboarding flow.
        skipBeacon: true,
      }}
    />
  )
}
