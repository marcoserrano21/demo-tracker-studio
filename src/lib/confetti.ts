/**
 * Lightweight confetti animation for achievement unlocks
 * No external dependencies - pure canvas animation
 */

interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  maxDurationMs?: number;
  colors?: string[];
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  gravity: number;
  decay: number;
  opacity: number;

  constructor(x: number, y: number, color: string, decay: number) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 10;
    this.vy = Math.random() * -15 - 5;
    this.color = color;
    this.size = Math.random() * 8 + 4;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 10;
    this.gravity = 0.5;
    this.decay = decay;
    this.opacity = 1;
  }

  update() {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;
    this.opacity -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }

  isDead() {
    return this.opacity <= 0 || this.y > window.innerHeight;
  }
}

export function celebrateAchievement(options: ConfettiOptions = {}) {
  const {
    particleCount = 72,
    spread = 70,
    startVelocity = 30,
    decay = 0.028,
    maxDurationMs = 2800,
    colors = ['#FFD700', '#FFA500', '#FF6347', '#4169E1', '#32CD32', '#FF1493']
  } = options;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Create particles
  const particles: Particle[] = [];
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  for (let i = 0; i < particleCount; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push(new Particle(centerX, centerY, color, decay));
  }

  // Animation loop
  function animate() {
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle, index) => {
      particle.update();
      particle.draw(ctx);

      if (particle.isDead()) {
        particles.splice(index, 1);
      }
    });

    if (particles.length > 0) {
      requestAnimationFrame(animate);
    } else {
      document.body.removeChild(canvas);
    }
  }

  animate();

  const removeCanvas = () => {
    if (canvas.parentNode) {
      document.body.removeChild(canvas);
    }
  };

  window.setTimeout(removeCanvas, maxDurationMs);

  // Optional: Play sound (if sound file exists)
  try {
    const audio = new Audio('/sounds/achievement.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Silently fail if sound doesn't exist or autoplay is blocked
    });
  } catch (e) {
    // Ignore errors
  }
}

// Simpler confetti burst from specific location
export function confettiBurst(x: number, y: number) {
  celebrateAchievement({
    particleCount: 50,
    spread: 60,
    startVelocity: 20,
  });
}
