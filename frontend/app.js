const form = document.getElementById("day-form");
const dayEl = document.getElementById("day");
const stage = document.getElementById("stage");
const loader = document.getElementById("loader");
const statusLine = document.getElementById("status-line");
const timerEl = document.getElementById("timer");
const bar = document.getElementById("bar");
const clip = document.getElementById("clip");
const resultLine = document.getElementById("result-line");
const again = document.getElementById("again");
const goBtn = document.getElementById("go");

// friendly copy + how full the paper progress bar is at each pipeline stage
const STAGES = {
  queued:    { pct: 6,  copy: "Odie is getting her crayons…" },
  scripting: { pct: 22, copy: "Odie is thinking about your day…" },
  drawing:   { pct: 50, copy: "Odie is drawing your day…" },
  animating: { pct: 82, copy: "Making it move…" },
  voicing:   { pct: 91, copy: "Odie is finding her voice…" },
  muxing:    { pct: 97, copy: "Putting it all together…" },
};

let timerId = null;
let startMs = 0;

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function startTimer() {
  startMs = Date.now();
  timerEl.textContent = "0:00";
  timerId = setInterval(() => (timerEl.textContent = fmt(Date.now() - startMs)), 1000);
}
function stopTimer() { clearInterval(timerId); timerId = null; }

function setStage(name) {
  const s = STAGES[name] || { pct: 60, copy: "Working…" };
  statusLine.textContent = s.copy;
  bar.style.width = s.pct + "%";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const day = dayEl.value.trim();
  if (!day) return;
  goBtn.disabled = true;
  stage.hidden = false;
  loader.hidden = false;
  clip.hidden = true; resultLine.hidden = true; again.hidden = true;
  setStage("queued");
  startTimer();
  try {
    const res = await fetch("/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day }),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Something went wrong");
    const { jobId } = await res.json();
    await poll(jobId);
  } catch (err) {
    finishWithError(err.message);
  } finally {
    goBtn.disabled = false;
  }
});

async function poll(jobId) {
  for (;;) {
    await new Promise((r) => setTimeout(r, 2500));
    const job = await (await fetch(`/jobs/${jobId}`)).json();
    if (job.status === "done") return finishWithClip(job);
    if (job.status === "failed") return finishWithError(job.error || "Odie got stuck — try again!");
    setStage(job.status);
  }
}

function finishWithClip(job) {
  stopTimer();
  bar.style.width = "100%";
  loader.hidden = true;
  resultLine.textContent = job.line || "Here's your day!";
  resultLine.hidden = false;
  clip.src = job.mp4Url; clip.hidden = false;
  again.hidden = false;
}

function finishWithError(msg) {
  stopTimer();
  loader.hidden = true;
  resultLine.textContent = msg;
  resultLine.hidden = false;
  again.hidden = false;
}

again.addEventListener("click", () => {
  dayEl.value = "";
  stage.hidden = true;
  dayEl.focus();
});
