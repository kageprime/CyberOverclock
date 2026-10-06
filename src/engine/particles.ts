export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  glow?: boolean;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface DashGhost {
  x: number;
  y: number;
  angle: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface SlashArcEffect {
  x: number;
  y: number;
  angle: number;
  arcSpan: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  comboStep: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private ghosts: DashGhost[] = [];
  private slashArcs: SlashArcEffect[] = [];

  public update(dt: number) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;
      p.alpha = 1 - (p.life / p.maxLife);
      p.vx *= 0.94;
      p.vy *= 0.94;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y -= 30 * dt;
      t.life += dt;
      t.alpha = 1 - (t.life / t.maxLife);
      if (t.life >= t.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update ghosts
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i];
      g.life += dt;
      g.alpha = 0.6 * (1 - (g.life / g.maxLife));
      if (g.life >= g.maxLife) {
        this.ghosts.splice(i, 1);
      }
    }

    // Update slash arcs
    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      const s = this.slashArcs[i];
      s.life += dt;
      s.alpha = 1 - (s.life / s.maxLife);
      if (s.life >= s.maxLife) {
        this.slashArcs.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Render dash ghosts
    for (const g of this.ghosts) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.angle);
      ctx.globalAlpha = Math.max(0, g.alpha);
      ctx.strokeStyle = g.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = g.color;
      ctx.shadowBlur = 10;
      
      // Cyber ninja silhouette
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(16, 0);
      ctx.stroke();

      ctx.restore();
    }

    // Render slash arcs
    for (const s of this.slashArcs) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.comboStep === 3 ? 6 : 4;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 15;

      const halfArc = s.arcSpan / 2;
      ctx.beginPath();
      ctx.arc(0, 0, s.radius, -halfArc, halfArc);
      ctx.stroke();

      // Inner bright core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s.radius - 2, -halfArc * 0.8, halfArc * 0.8);
      ctx.stroke();

      ctx.restore();
    }

    // Render particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size * (1 - p.life / p.maxLife * 0.5)), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Render floating combat text
    for (const t of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 6;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }

    ctx.restore();
  }

  // --- Particle Emitter Helpers ---

  public emitHitSparks(x: number, y: number, color: string = '#00f0ff', count: number = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 200;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 2.5,
        color,
        alpha: 1,
        life: 0,
        maxLife: 0.25 + Math.random() * 0.25,
        glow: true
      });
    }
  }

  public emitExplosion(x: number, y: number, color: string = '#ff0055', count: number = 24) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 280;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.4 ? color : '#ffea00',
        alpha: 1,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.35,
        glow: true
      });
    }
  }

  public emitDashGhost(x: number, y: number, angle: number, color: string = '#00f0ff') {
    this.ghosts.push({
      x,
      y,
      angle,
      alpha: 0.6,
      color,
      life: 0,
      maxLife: 0.22
    });
  }

  public emitSlashArc(x: number, y: number, angle: number, arcSpan: number, radius: number, comboStep: number = 1, color: string = '#00f0ff') {
    this.slashArcs.push({
      x,
      y,
      angle,
      arcSpan,
      radius,
      color,
      alpha: 1,
      life: 0,
      maxLife: 0.16,
      comboStep
    });
  }

  public emitText(x: number, y: number, text: string, color: string = '#ffffff', size: number = 16) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      size,
      alpha: 1,
      life: 0,
      maxLife: 0.75
    });
  }

  public clear() {
    this.particles = [];
    this.floatingTexts = [];
    this.ghosts = [];
    this.slashArcs = [];
  }
}
