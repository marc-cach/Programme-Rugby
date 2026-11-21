// Relève le programme sur agendatv-rugby.com et l'écrit dans www/data.js (programme de secours embarqué dans l'APK).
// Garde aussi la page brute dans releve/ pour vérifier la lecture.
import { DOMParser } from "linkedom";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import vm from "node:vm";

vm.runInThisContext(readFileSync(new URL("../www/parse.js", import.meta.url), "utf8"));
const html = process.argv[2] ? readFileSync(process.argv[2], "utf8")
  : await (await fetch("https://www.agendatv-rugby.com/", { headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 14) MonProgRugby", "Accept": "text/html" } })).text();
mkdirSync("releve", { recursive: true });
writeFileSync("releve/page.html", html);
const days = globalThis.parseRugby(html, new Date(), DOMParser);
const n = Object.values(days).reduce((s, b) => s + b.split("\n").length, 0);
const sortie = Object.entries(days).map(([d, b]) => "== " + d + "\n" + b).join("\n");
writeFileSync("releve/sortie.txt", n + " matchs\n" + sortie + "\n");
console.log(n + " matchs lus\n" + sortie);
const classement = {};
for (const [k, url] of [["top14", "https://sports.orange.fr/rugby/top-14/classement-equipes.html"], ["prod2", "https://sports.orange.fr/rugby/pro-d2/classement-equipes.html"]]) {
  try {
    const h = process.env.CLASSEMENT_DIR ? readFileSync(process.env.CLASSEMENT_DIR + "/orange-" + k + ".html", "utf8")
      : await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 14) MonProgRugby" } })).text();
    writeFileSync("releve/orange-" + k + ".html", h);
    const rows = globalThis.parseClassement(h, DOMParser);
    if (rows.length >= 10) classement[k] = { rows };
    console.log(k + " : " + rows.map(r => r.pos + "." + r.club + " " + r.pts).join(", "));
  } catch (e) { console.log("classement " + k + " : " + e.message); }
}
if (Object.keys(classement).length) classement.updated = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
if (n >= 3) {
  const updated = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  writeFileSync("www/data.js", "// Programme TV rugby relevé sur agendatv-rugby.com. Format : heure|domicile|extérieur|chaînes|compétition\nwindow.PROG = " + JSON.stringify({ updated, days, classement }, null, 1) + ";\n");
}
