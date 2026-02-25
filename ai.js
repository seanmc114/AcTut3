// ai.js — SAFE AI BRIDGE (Cloudflare Worker)
async function classifyAnswer(payload) {
  const res = await fetch("https://royal-butterfly-00d8.seansynge.workers.dev/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("AI request failed");
  return await res.json();
}
window.classifyAnswer = classifyAnswer;
