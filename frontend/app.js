const form = document.getElementById("day-form");
const dayEl = document.getElementById("day");
const stage = document.getElementById("stage");
const statusLine = document.getElementById("status-line");
const clip = document.getElementById("clip");
const again = document.getElementById("again");
const goBtn = document.getElementById("go");

const COPY = {
  queued: "Odie is getting her crayons…",
  scripting: "Odie is thinking about your day…",
  drawing: "Odie is drawing your day…",
  animating: "Making it move…",
  voicing: "Odie is finding her voice…",
  muxing: "Putting it all together…",
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const day = dayEl.value.trim();
  if (!day) return;
  goBtn.disabled = true;
  stage.hidden = false; clip.hidden = true; again.hidden = true;
  statusLine.textContent = COPY.queued;
  try {
    const res = await fetch("/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day }),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Something went wrong");
    const { jobId } = await res.json();
    await poll(jobId);
  } catch (err) {
    statusLine.textContent = err.message;
  } finally {
    goBtn.disabled = false;
  }
});

async function poll(jobId) {
  for (;;) {
    await new Promise((r) => setTimeout(r, 2500));
    const job = await (await fetch(`/jobs/${jobId}`)).json();
    if (job.status === "done") {
      statusLine.textContent = job.line || "Here's your day!";
      clip.src = job.mp4Url; clip.hidden = false; again.hidden = false;
      return;
    }
    if (job.status === "failed") { statusLine.textContent = job.error || "Odie got stuck — try again!"; return; }
    statusLine.textContent = COPY[job.status] || "Working…";
  }
}

again.addEventListener("click", () => { dayEl.value = ""; dayEl.focus(); stage.hidden = true; });
