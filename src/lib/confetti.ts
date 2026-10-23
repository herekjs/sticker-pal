import confetti from "canvas-confetti";

const COLORS = ["#ff6b6b", "#ffd93d", "#6bcB77", "#4d96ff", "#c77dff", "#ff9ecd"];

export function popBurst(x = 0.5, y = 0.6) {
  confetti({
    particleCount: 28,
    spread: 60,
    startVelocity: 25,
    origin: { x, y },
    colors: COLORS,
    scalar: 0.8,
    disableForReducedMotion: true,
  });
}

export function bigCelebration() {
  const end = Date.now() + 1800;
  const frame = () => {
    confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors: COLORS, disableForReducedMotion: true });
    confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors: COLORS, disableForReducedMotion: true });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
  confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 }, colors: COLORS, disableForReducedMotion: true });
}
