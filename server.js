const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 3000;
const ADMIN_KEY = "admin123"; // ändern!

app.use(express.json());

/* ---------- DATABASE ---------- */
const db = new sqlite3.Database("./votes.db");

db.run(`
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party TEXT,
  ts INTEGER
)`);

/* ---------- API ---------- */

// Stimme abgeben
app.post("/api/vote", (req, res) => {
  const { party } = req.body;
  if (!party) return res.status(400).json({ error: "no party" });

  db.run(
    "INSERT INTO votes (party, ts) VALUES (?,?)",
    [party, Date.now()],
    () => res.json({ ok: true })
  );
});

// Ergebnisse
app.get("/api/results", (req, res) => {
  db.all(
    "SELECT party, COUNT(*) as count FROM votes GROUP BY party",
    (err, rows) => res.json(rows)
  );
});

// Admin: Reset
app.post("/api/admin/reset", (req, res) => {
  if (req.headers["x-admin-key"] !== ADMIN_KEY)
    return res.sendStatus(403);

  db.run("DELETE FROM votes", () => res.json({ ok: true }));
});

/* ---------- FRONTEND (HTML) ---------- */
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Kommunalwahl Kelsterbach – Stimmungsbild</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
body{font-family:system-ui;background:#f6f8fb;max-width:900px;margin:40px auto;padding:20px}
section{background:#fff;padding:20px;border-radius:16px;margin-bottom:20px}
button{padding:10px 18px;border:none;border-radius:999px;background:#2563eb;color:#fff;font-weight:600}
label{display:block;margin:.4rem 0}
.small{font-size:.85rem;color:#475569}
</style>
</head>
<body>

<h1>Kommunalwahl Kelsterbach</h1>
<p class="small">Echtes Mehrnutzer-Stimmungsbild · Serverbasiert</p>

<section>
<h2>Abstimmen</h2>
<form id="form"></form>
<button onclick="vote()">Stimme abgeben</button>
<p id="msg" class="small"></p>
</section>

<section>
<h2>Ergebnisse</h2>
<canvas id="chart"></canvas>
</section>

<section>
<h2>Admin</h2>
<button onclick="reset()">Ergebnisse zurücksetzen</button>
</section>

<script>
const PARTIES=[
 "CDU","SPD","FDP","Die Linke","Freie Wähler",
 "EUK","HAK","WIK + FNK","Unentschlossen"
];

const form=document.getElementById("form");
PARTIES.forEach(p=>{
 form.innerHTML+=\`<label><input type="radio" name="vote" value="\${p}"> \${p}</label>\`;
});

function vote(){
 const c=document.querySelector("input[name=vote]:checked");
 if(!c) return;
 fetch("/api/vote",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({party:c.value})
 }).then(()=>{document.getElementById("msg").innerText="Danke für Ihre Stimme"; load();});
}

let chart;
function load(){
 fetch("/api/results").then(r=>r.json()).then(data=>{
  const labels=data.map(d=>d.party);
  const values=data.map(d=>d.count);
  if(chart) chart.destroy();
  chart=new Chart(document.getElementById("chart"),{
   type:"bar",
   data:{labels,datasets:[{label:"Stimmen",data:values}]}
  });
 });
}
load();

function reset(){
 const key=prompt("Admin-Key");
 fetch("/api/admin/reset",{
  method:"POST",
  headers:{"x-admin-key":key}
 }).then(r=>{
  if(r.status===403) alert("Falscher Key");
  else load();
 });
}
</script>

</body>
</html>`);
});

/* ---------- START ---------- */
app.listen(PORT, () =>
  console.log("Server läuft auf http://localhost:" + PORT)
);
