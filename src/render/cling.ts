/** Climb-frame pose while on a ladder or sliding down a wall (render-only). */
export function clingPose(onLadder: boolean, wallSlide: number, onGround: boolean): boolean {
  return !onGround && (onLadder || wallSlide !== 0);
}
