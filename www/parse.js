// Lecture de agendatv-rugby.com : HTML -> { "AAAA-MM-JJ": "heure|domicile|extérieur|chaînes (séparées par " / ")|compétition\n..." }
// Utilisé par l'appli (navigateur) et par scripts/releve.mjs (Node + linkedom).
(function (root) {
  const MOIS = ["janvier","fevrier","mars","avril","mai","juin","juillet","aout","septembre","octobre","novembre","decembre"];
  const JOURS = "lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche";
  const plain = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const sp = s => (s || "").replace(/\s+/g, " ").trim();
  const clean = s => sp((s || "").replace(/[|`\n]/g, " "));

  function dayOf(t, now) {
    const p = plain(t).replace(/[’']/g, "'");
    if (/^aujourd'hui\b/.test(p) && p.length < 30) return iso(now);
    if (/^demain\b/.test(p) && p.length < 25) return iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const m = p.match(new RegExp("^(?:" + JOURS + ")\\s+(\\d{1,2})(?:er)?\\s+([a-z]+)(?:\\s+(\\d{4}))?$"));
    if (!m) return null;
    const mo = MOIS.indexOf(m[2]); if (mo < 0) return null;
    let y = m[3] ? +m[3] : now.getFullYear();
    if (!m[3] && mo < now.getMonth() - 6) y++;
    if (!m[3] && mo > now.getMonth() + 6) y--;
    return iso(new Date(y, mo, +m[1]));
  }

  const CH = {
    "tf1": "TF1", "tfx": "TFX", "tmc": "TMC", "m6": "M6", "w9": "W9", "6ter": "6ter",
    "france2": "France 2", "france 2": "France 2", "france3": "France 3", "france 3": "France 3", "france4": "France 4", "france 4": "France 4",
    "francetv": "france.tv", "france.tv": "france.tv", "lequipe": "L'Équipe", "l'equipe": "L'Équipe", "lequipe live": "L'Équipe Live",
    "canal+": "Canal+", "canal+sport": "Canal+ Sport", "canal+ sport": "Canal+ Sport", "canal+live": "Canal+ Live", "canal+foot": "Canal+ Foot",
    "canal+sport360": "Canal+ Sport 360", "canal+premier": "Canal+ Premier", "canal+decale": "Canal+ Décalé",
    "bein sports": "beIN SPORTS", "beinsports": "beIN SPORTS", "bein sports 1": "beIN SPORTS 1", "bein sports 2": "beIN SPORTS 2", "bein sports 3": "beIN SPORTS 3",
    "rugby+": "Rugby+", "dazn": "DAZN", "youtube": "YouTube", "eurosport": "Eurosport", "eurosport1": "Eurosport 1", "eurosport2": "Eurosport 2",
    "ffr tv": "FFR TV", "ffrtv": "FFR TV", "rmc sport": "RMC Sport", "sport en france": "Sport en France", "max": "Max", "prime video": "Prime Video"
  };
  function chanName(s) {
    s = sp(s.replace(/\.(png|jpe?g|gif|svg|webp)$/i, "").replace(/[-_]/g, " ")).replace(/^programme tv\s*/i, "").replace(/^diffusion tv\s*/i, "");
    if (!s) return "";
    const k = plain(s);
    if (CH[k]) return CH[k];
    if (CH[k.replace(/\s+/g, "")]) return CH[k.replace(/\s+/g, "")];
    const m = k.match(/^canal\+\s*live\s*(\d+)$/); if (m) return "Canal+ Live " + m[1];
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function parseRugby(html, now, DP) {
    now = now || new Date();
    const doc = new (DP || root.DOMParser)().parseFromString(html, "text/html");
    const body = doc.body || doc.documentElement;
    const isDiff = a => /diffusion-tv/i.test(a.getAttribute("href") || "");
    // 1. ordre du document : en-têtes de jour + liens de diffusion
    const seq = [];
    (function walk(n) {
      for (const c of Array.from(n.childNodes)) {
        if (c.nodeType === 3) {
          const t = sp(c.nodeValue);
          if (t && t.length < 40) { const d = dayOf(t, now); if (d) seq.push({ day: d }); }
        } else if (c.nodeType === 1) {
          const tag = c.tagName.toUpperCase();
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "SELECT") continue;
          if (tag === "A" && isDiff(c)) seq.push({ a: c });
          walk(c);
        }
      }
    })(body);

    const diffCount = el => new Set(Array.from(el.querySelectorAll("a[href]")).filter(isDiff).map(a => a.getAttribute("href"))).size;
    function box(a) {
      let best = a, el = a;
      while (el.parentElement && el.parentElement !== body && el.parentElement !== doc.documentElement) {
        const p = el.parentElement;
        if (diffCount(p) > 1) break;
        best = p; el = p;
      }
      return best;
    }

    const days = {}, done = new Set();
    let day = null;
    for (const it of seq) {
      if (it.day) { day = it.day; continue; }
      const a = it.a, href = a.getAttribute("href");
      if (!day || done.has(href)) continue;
      done.add(href);
      const b = box(a);
      const txt = sp(b.textContent);
      const tm = txt.match(/(\d{1,2})\s*[h:]\s*(\d{2})/);
      if (!tm) continue;
      const t = tm[1].padStart(2, "0") + ":" + tm[2];

      // compétition
      let comp = "";
      const ci = b.querySelector('img[src*="logos_competitions"]');
      if (ci) comp = sp(ci.getAttribute("alt") || ci.getAttribute("title") || "").replace(/^programme tv\s*/i, "");
      // équipes : liens portant un logo de club, sinon autres liens texte
      const links = Array.from(b.querySelectorAll("a[href]")).filter(x => !isDiff(x));
      const clubHrefs = new Set(links.filter(x => x.querySelector('img[src*="photos_fiches"]')).map(x => x.getAttribute("href")));
      const byHref = new Map();
      for (const x of links) {
        const h = x.getAttribute("href");
        if (clubHrefs.size && !clubHrefs.has(h)) continue;
        const im = x.querySelector("img");
        const name = sp(x.textContent) || (im ? sp(im.getAttribute("alt") || im.getAttribute("title") || "") : "");
        if (!name || plain(name) === plain(comp)) continue;
        if (!byHref.has(h) || (!byHref.get(h).txt && sp(x.textContent))) byHref.set(h, { name, txt: !!sp(x.textContent) });
      }
      let teams = [...byHref.values()].map(v => v.name);
      if (!comp && !clubHrefs.size && teams.length > 2) comp = teams.shift();
      if (!comp) { const i = teams.length ? txt.indexOf(teams[0]) : -1; if (i > 0) comp = sp(txt.slice(0, i)); }
      if (teams.length < 2) continue;

      // chaînes
      const chans = [];
      for (const im of Array.from(b.querySelectorAll("img"))) {
        const src = im.getAttribute("src") || "", alt = sp(im.getAttribute("alt") || im.getAttribute("title") || "");
        if (/logos_competitions|photos_fiches/.test(src)) continue;
        if (/programme tv/i.test(alt)) chans.push(chanName(alt));
        else if (/chaine|channel|logos_tv|tv\//i.test(src)) chans.push(chanName(alt || src.split("/").pop()));
      }
      if (!chans.length) {
        const m = txt.match(/programme tv\s+(.+?)(?:\s{2,}|$)/i);
        if (m) {
          let s = m[1];
          for (const n of teams) { const i = s.indexOf(n); if (i >= 0) s = s.slice(0, i); }
          s.split(/\s*\/\s*|\s+et\s+/).forEach(c => chans.push(chanName(c)));
        }
      }
      const line = [t, clean(teams[0]), clean(teams[1]), [...new Set(chans.filter(Boolean))].map(clean).join(" / ") || "?", clean(comp)].join("|");
      (days[day] ||= []).push(line);
    }
    const out = {}, from = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    for (const d of Object.keys(days).sort()) if (d >= from) out[d] = days[d].join("\n");
    return out;
  }

  // Classement (sports.orange.fr) -> [{ pos, club, pts, j, g, n, p, diff }]
  // Les noms Orange sont ramenés aux noms d'agendatv-rugby.com pour que les favoris correspondent.
  const ALIAS = {
    "stade toulousain": "Toulouse", "section paloise": "Pau", "bordeaux begles": "UBB Bordeaux", "lyon": "Lyon OU",
    "stade rochelais": "La Rochelle", "aviron bayonnais": "Bayonne", "stade francais": "Stade Francais", "provence": "Provence Rugby",
    "stade aurillacois": "Aurillac", "us montalbanaise": "Montauban", "biarritz olympique": "Biarritz", "soyaux angouleme": "Angouleme",
    "us dax": "Dax", "rc narbonnais": "Narbonne", "beziers herault": "Beziers", "asm clermont": "Clermont", "rc toulon": "Toulon",
    "usa perpignan": "Perpignan", "castres olympique": "Castres", "rc vannes": "Vannes", "su agen": "Agen", "ca brive": "Brive",
    "montpellier herault rugby": "Montpellier", "fc grenoble": "Grenoble", "us oyonnax": "Oyonnax", "colomiers rugby": "Colomiers",
    "stade nicois": "Nice", "uso nevers": "Nevers"
  };
  function clubName(s) { s = sp(s); return ALIAS[plain(s)] || s; }
  function parseClassement(html, DP) {
    const doc = new (DP || root.DOMParser)().parseFromString(html, "text/html");
    const out = [];
    for (const tr of Array.from(doc.querySelectorAll("table.classement tr, table tr"))) {
      const td = Array.from(tr.querySelectorAll("td")).map(x => sp(x.textContent));
      if (td.length < 8) continue;
      const pos = parseInt(td[0], 10), num = i => parseInt(td[i].replace(/[^\d-]/g, ""), 10);
      if (!pos || !td[1]) continue;
      if (out.some(r => r.pos === pos && r.club === clubName(td[1]))) continue;
      out.push({ pos, club: clubName(td[1]), pts: num(2), j: num(3), g: num(4), n: num(5), p: num(6), diff: num(7) });
    }
    return out;
  }

  root.parseRugby = parseRugby;
  root.parseClassement = parseClassement;
})(typeof window !== "undefined" ? window : globalThis);
