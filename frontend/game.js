// Tiny "Odie hop" — Chrome-dino-style wait-game using the real 4-frame Odie run
// cycle + the pencil art. Click/space to start, then to jump.
// Exposes window.OdieGame.start()/.stop().
(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height, GROUND = H - 18;

  const run = [1, 2, 3, 4].map((n) => { const i = new Image(); i.src = `/assets/game/run${n}.png`; return i; });
  const pencil = new Image(); pencil.src = "/assets/game/pencil.png";

  const PH = 66;                                   // Odie draw height
  const ref = run[0];
  const odieW = () => PH * (ref.naturalWidth && ref.naturalHeight ? ref.naturalWidth / ref.naturalHeight : 0.72);

  let st = null, raf = null, mode = "idle", anim = 0;   // idle | ready | run | over

  function reset() {
    st = { y: GROUND - PH, vy: 0, onGround: true, obs: [], spawn: 45, score: 0, speed: 3.0 };
    anim = 0;
  }

  function scene() {
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "#9bb7e0"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke();
  }

  function currentFrame() {
    if (mode === "run") {
      if (!st.onGround) return run[1];               // a mid-stride pose while airborne
      return run[Math.floor(anim / 5) % 4];          // run cycle on the ground
    }
    return run[0];                                    // ready / over
  }

  function drawOdie() {
    const f = currentFrame();
    if (f && f.complete) ctx.drawImage(f, 28, st.y, odieW(), PH);
  }

  function drawObs() {
    if (!pencil.complete) return;
    st.obs.forEach((o) => {
      const w = o.h * (pencil.naturalWidth / pencil.naturalHeight || 0.18);
      o.w = w;
      ctx.drawImage(pencil, o.x, GROUND - o.h, w, o.h);
    });
  }

  function banner(text) {
    ctx.fillStyle = "rgba(255,255,255,.72)"; ctx.fillRect(0, H / 2 - 19, W, 34);
    ctx.fillStyle = "#1a1a2e"; ctx.font = "19px 'Schoolbell', cursive"; ctx.textAlign = "center";
    ctx.fillText(text, W / 2, H / 2 + 4);
  }

  function loop() {
    scene();
    if (mode === "run") {
      anim++;
      st.vy += 0.52; st.y += st.vy;
      const rest = GROUND - PH;
      if (st.y >= rest) { st.y = rest; st.vy = 0; st.onGround = true; }
      st.score += st.speed * 0.05; st.speed += 0.0016;
      if (--st.spawn <= 0) { st.obs.push({ x: W + 10, h: 30 + Math.random() * 16 }); st.spawn = 58 + Math.random() * 42; }
      st.obs.forEach((o) => (o.x -= st.speed));
      st.obs = st.obs.filter((o) => o.x > -40);
      const ox = 28 + odieW() * 0.3, ow = odieW() * 0.4;
      for (const o of st.obs) {
        const w = o.w || 7;
        if (ox < o.x + w * 0.7 && ox + ow > o.x + w * 0.2 && st.y + PH > GROUND - o.h + 3) { mode = "over"; }
      }
    }
    drawObs(); drawOdie();
    if (mode === "run" || mode === "over") {
      ctx.fillStyle = "#555"; ctx.font = "15px 'Patrick Hand', sans-serif"; ctx.textAlign = "right";
      ctx.fillText(String(Math.floor(st.score)), W - 8, 18);
    }
    if (mode === "ready") banner("tap / space to play while you wait!");
    if (mode === "over") banner("oops! tap to retry");
    raf = requestAnimationFrame(loop);
  }

  function tap() {
    if (mode === "ready" || mode === "over") { reset(); mode = "run"; return; }
    if (mode === "run" && st.onGround) { st.vy = -9; st.onGround = false; }
  }
  function onKey(e) {
    if ((e.code === "Space" || e.code === "ArrowUp") && document.activeElement !== document.getElementById("day")) {
      e.preventDefault(); tap();
    }
  }
  function onTap(e) { e.preventDefault(); tap(); }

  window.OdieGame = {
    start() {
      reset(); mode = "ready";
      canvas.addEventListener("pointerdown", onTap);
      window.addEventListener("keydown", onKey);
      cancelAnimationFrame(raf); loop();
    },
    stop() {
      cancelAnimationFrame(raf); raf = null; mode = "idle";
      canvas.removeEventListener("pointerdown", onTap);
      window.removeEventListener("keydown", onKey);
    },
  };
})();
