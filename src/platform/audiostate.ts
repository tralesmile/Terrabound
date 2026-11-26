/**
 * Whether a sound context needs a resume() inside the next tap or key press. iOS Safari also parks
 * it in a non-standard "interrupted" state (a call, Siri, an app switch), which a check for
 * "suspended" alone never wakes.
 */
export function needsResume(state: string): boolean {
  return state !== 'running' && state !== 'closed';
}
