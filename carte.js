// carte.html — construit une carte Leaflet à partir des fichiers .kml de
// chaque randonnée listée dans randonnees.json. Aucune donnée n'est
// dupliquée : les tracés sont lus directement dans les .kml déjà publiés
// pour les boutons "Visite/KML/GPX" de la page d'accueil.

(async function () {
  const mapEl = document.getElementById('overview-map');
  const statusEl = document.getElementById('map-status');
  const legendEl = document.getElementById('legend');

  const PALETTE = [
    '#4f6e42', // moss
    '#c97a3a', // rust
    '#6b4a2f', // bark
    '#3d7a7a', // teal
    '#8a5fb0', // indigo doux
    '#a9922f', // ochre
    '#a9c088', // sage
    '#9c4f4f'  // terracotta
  ];

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return res.json();
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return res.text();
  }

  // Repère, parmi tous les <coordinates> du KML, celui qui a le plus de
  // points : c'est le tracé (LineString) — les points isolés (Placemark
  // d'un waypoint photo, par ex.) n'ont qu'une seule coordonnée chacun.
  function extractTrack(kmlText) {
    const doc = new DOMParser().parseFromString(kmlText, 'text/xml');
    if (doc.querySelector('parsererror')) return [];
    const coordEls = Array.from(doc.getElementsByTagName('coordinates'));
    let best = [];
    for (const el of coordEls) {
      const points = el.textContent.trim().split(/\s+/).filter(Boolean);
      if (points.length > best.length) best = points;
    }
    if (best.length < 2) return [];
    return best.map((p) => {
      const [lon, lat] = p.split(',').map(Number);
      return [lat, lon];
    }).filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
  }

  const map = L.map(mapEl, { zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  try {
    const slugs = await fetchJSON('randonnees.json');
    if (!Array.isArray(slugs) || slugs.length === 0) {
      statusEl.textContent = 'Aucune randonnée publiée pour le moment.';
      return;
    }

    const bounds = L.latLngBounds([]);
    const entries = [];

    for (let i = 0; i < slugs.length; i++) {
      const slug = slugs[i];
      const color = PALETTE[i % PALETTE.length];
      try {
        const r = await fetchJSON(`randonnees/${slug}/rando.json`);
        if (!r.kml) continue;
        const kmlText = await fetchText(`randonnees/${slug}/${r.kml}`);
        const track = extractTrack(kmlText);
        if (track.length < 2) continue;

        const polyline = L.polyline(track, {
          color,
          weight: 4,
          opacity: 0.85
        }).addTo(map);

        polyline.bindPopup(
          `<strong>${r.titre || slug}</strong>` +
          (r.distance || r.duree ? `<br>${[r.distance, r.duree].filter(Boolean).join(' · ')}` : '') +
          `<br><a href="index.html#rando-${slug}">Voir la fiche →</a>`
        );

        bounds.extend(polyline.getBounds());
        entries.push({ slug, titre: r.titre || slug, distance: r.distance, color, polyline });
      } catch (err) {
        console.warn('Circuit ignoré sur la carte :', slug, err);
      }
    }

    if (entries.length === 0) {
      statusEl.textContent = 'Aucun tracé exploitable pour le moment.';
      return;
    }

    statusEl.remove();
    map.fitBounds(bounds, { padding: [30, 30] });

    legendEl.innerHTML = entries.map((e) => `
      <button type="button" class="legend__item" data-slug="${e.slug}">
        <span class="legend__swatch" style="background:${e.color}" aria-hidden="true"></span>
        <span>${e.titre}</span>
        ${e.distance ? `<span class="legend__meta">${e.distance}</span>` : ''}
      </button>
    `).join('');

    legendEl.addEventListener('click', (event) => {
      const btn = event.target.closest('.legend__item');
      if (!btn) return;
      const entry = entries.find((e) => e.slug === btn.dataset.slug);
      if (!entry) return;
      map.fitBounds(entry.polyline.getBounds(), { padding: [40, 40], maxZoom: 16 });
      entry.polyline.openPopup(entry.polyline.getBounds().getCenter());
    });
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Impossible de charger les circuits.';
  }
})();
