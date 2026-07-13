// A tiny mutable singleton — deliberately NOT React state/context.
//
// Why: LoginPage sets `user` in AuthContext as soon as login() resolves,
// which re-renders PublicRoute and (without this gate) immediately swaps
// LoginPage out for a <Navigate to="/" /> — killing the portal-collapse
// animation before it can play, since `user` becomes truthy well before
// LoginPage's own timers finish and call navigate() itself.
//
// LoginPage flips `active` to true the instant login succeeds, right
// before it starts its own transition. PublicRoute checks it during the
// re-render that `user` triggers and, if active, renders `children`
// (keeps LoginPage mounted) instead of redirecting — letting LoginPage's
// own navigate() call be the one that actually changes routes.
export const authTransitionGate = {
  active: false,
}
