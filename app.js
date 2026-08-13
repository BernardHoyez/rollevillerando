// rollevillerando — découverte automatique des randonnées
//
// Convention : randonnees.json liste les dossiers (slugs) à afficher, dans
// l'ordre voulu. Chaque dossier randonnees/<slug>/ contient un fichier
// rando.json décrivant la randonnée, ainsi que sa vignette et les fichiers
// produits par GeoTour (visite HTML, KML, GPX). Voir README.md.
//
// Les fichiers de visite exportés en mode hors-ligne (fond de carte
// embarqué) peuvent peser 100 à 200 Mo : le bouton « Visite » les
// télécharge donc via fetch() avec suivi de progression (barre en haut de
// page + pourcentage sur le bouton), plutôt qu'un simple lien qui laisserait
// le visiteur sans aucun retour pendant une attente potentiellement longue.

(async function () {
  const grid = document.getElementById('randonnees');
  const dlBar = document.getElementById('dl-bar');
  const dlBarFill = document.getElementById('dl-bar-fill');

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return res.json();
  }

  function metaLine(r) {
    const parts = [];
    if (r.distance) parts.push(r.distance);
    if (r.duree) parts.push(r.duree);
    if (r.denivele) parts.push(`+${r.denivele} m`);
    return parts.join(' · ');
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  function cardHTML(slug, r) {
    const base = `randonnees/${slug}/`;
    const vignette = r.vignette ? base + r.vignette : 'icons/icon-512.png';
    const meta = metaLine(r);
    const titre = r.titre || slug;

    return `
      <article class="card">
        <span class="card__tape" aria-hidden="true"></span>
        <div class="card__photo-wrap">
          <img class="card__photo" src="${vignette}" alt="${titre}" loading="lazy">
        </div>
        <div class="card__body">
          <h2 class="card__title">${titre}</h2>
          ${meta ? `<p class="card__meta">${meta}</p>` : ''}
          <div class="card__links">
            ${r.visite ? `<button type="button" class="pill pill--visite" data-visite-url="${base}${r.visite}" data-visite-titre="${escapeAttr(titre)}" data-label="🥾 Visite">🥾 Visite</button>` : ''}
            ${r.kml ? `<a class="pill pill--kml" href="${base}${r.kml}" download>🗺️ KML</a>` : ''}
            ${r.gpx ? `<a class="pill pill--gpx" href="${base}${r.gpx}" download>📍 GPX</a>` : ''}
          </div>
        </div>
      </article>`;
  }

  // ---------- Téléchargement de la visite avec progression ----------

  function formatMo(bytes) {
    return (bytes / (1024 * 1024)).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1);
  }

  function setBarProgress(ratio) {
    // ratio: 0..1, ou null si la taille totale est inconnue (animation indéterminée)
    dlBar.hidden = false;
    if (ratio === null) {
      dlBar.classList.add('dl-bar--indeterminate');
      dlBarFill.style.width = '35%';
    } else {
      dlBar.classList.remove('dl-bar--indeterminate');
      dlBarFill.style.width = `${Math.max(4, Math.round(ratio * 100))}%`;
    }
  }

  function hideBar() {
    dlBar.hidden = true;
    dlBar.classList.remove('dl-bar--indeterminate');
    dlBarFill.style.width = '0%';
  }

  function finishVisite(blob, newTab) {
    const blobUrl = URL.createObjectURL(blob);
    if (newTab && !newTab.closed) {
      newTab.location = blobUrl;
    } else {
      window.open(blobUrl, '_blank');
    }
  }

  // Les visites exportées par GeoTour référencent souvent leurs photos,
  // audio et vidéo par chemin relatif (ex. "photos/xxx.jpg"), à charger
  // depuis le même dossier que le HTML. Une fois le contenu transformé en
  // Blob pour l'affichage (voir plus haut, pour permettre la progression),
  // le document n'a plus d'adresse réelle : ces chemins relatifs ne
  // pointent alors plus nulle part et les médias disparaissent. On corrige
  // en insérant une balise <base> qui fait pointer les chemins relatifs
  // vers le vrai dossier de la randonnée sur le site.
  function withBaseHref(html, folderUrl) {
    const baseTag = `<base href="${folderUrl}">`;
    if (/<head[^>]*>/i.test(html)) {
      return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
    }
    return baseTag + html;
  }

  async function blobWithFixedPaths(rawBlob, sourceUrl) {
    const folderUrl = new URL('.', new URL(sourceUrl, location.href)).href;
    const text = await rawBlob.text();
    const fixed = withBaseHref(text, folderUrl);
    return new Blob([fixed], { type: 'text/html;charset=utf-8' });
  }

  async function handleVisiteClick(btn) {
    if (btn.disabled) return;
    const url = btn.dataset.visiteUrl;
    const titre = btn.dataset.visiteTitre || '';
    const defaultLabel = btn.dataset.label || '🥾 Visite';

    // Ouvre l'onglet tout de suite (dans le même geste utilisateur) pour ne
    // pas se faire bloquer comme pop-up une fois le téléchargement fini.
    // C'est CET onglet que le visiteur regarde pendant l'attente : la
    // progression doit donc s'y afficher, pas seulement sur la page d'origine.
    const newTab = window.open('', '_blank');
    if (newTab && newTab.document) {
      newTab.document.title = titre ? `Chargement — ${titre}` : 'Chargement de la visite…';
      newTab.document.body.style.cssText = 'font-family:system-ui,sans-serif;color:#3a5230;background:#f6f2e7;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:1.5rem;';
      newTab.document.body.innerHTML = `
        <div style="max-width:26rem;">
          <p style="font-size:1.1rem;margin:0 0 .5rem;">🥾 Préparation de la visite${titre ? ' « ' + titre + ' »' : ''}…</p>
          <p style="font-size:.9rem;color:#6b6b5a;margin:0 0 1.25rem;">Fichier volumineux (visite hors-ligne) : le chargement peut prendre une minute.</p>
          <div style="height:10px;border-radius:999px;background:rgba(44,53,39,0.12);overflow:hidden;">
            <div id="visite-progress-fill" style="height:100%;width:4%;border-radius:999px;background:linear-gradient(90deg,#4f6e42,#c97a3a);transition:width .2s ease;"></div>
          </div>
          <p id="visite-progress-text" style="font-family:'Space Mono',monospace;font-size:.85rem;margin:.6rem 0 0;color:#58614f;">Connexion…</p>
        </div>`;
    }

    function updateNewTabProgress(text, ratio) {
      if (!newTab || newTab.closed || !newTab.document) return;
      try {
        const fill = newTab.document.getElementById('visite-progress-fill');
        const label = newTab.document.getElementById('visite-progress-text');
        if (label) label.textContent = text;
        if (fill) {
          if (ratio === null) {
            fill.style.width = '35%';
            fill.style.animation = 'none';
          } else {
            fill.style.width = `${Math.max(4, Math.round(ratio * 100))}%`;
          }
        }
      } catch (e) {
        // l'onglet a pu être fermé ou navigué entre-temps : sans conséquence
      }
    }

    btn.disabled = true;
    btn.classList.add('pill--loading');

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${url} → ${res.status}`);

      const totalStr = res.headers.get('content-length');
      const total = totalStr ? Number(totalStr) : 0;

      if (!res.body || !res.body.getReader) {
        // Environnement sans support de streaming : repli sans progression.
        btn.textContent = '🥾 Chargement…';
        updateNewTabProgress('Chargement…', null);
        const rawBlob = await res.blob();
        finishVisite(await blobWithFixedPaths(rawBlob, url), newTab);
        return;
      }

      const reader = res.body.getReader();
      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;

        if (total) {
          const ratio = received / total;
          const pct = Math.round(ratio * 100);
          btn.textContent = `🥾 ${pct} %`;
          setBarProgress(ratio);
          updateNewTabProgress(`${pct} % — ${formatMo(received)} / ${formatMo(total)} Mo`, ratio);
        } else {
          btn.textContent = `🥾 ${formatMo(received)} Mo…`;
          setBarProgress(null);
          updateNewTabProgress(`${formatMo(received)} Mo téléchargés…`, null);
        }
      }

      updateNewTabProgress('Finalisation…', null);
      const rawBlob = new Blob(chunks);
      finishVisite(await blobWithFixedPaths(rawBlob, url), newTab);
    } catch (err) {
      console.error('Téléchargement de la visite impossible :', err);
      if (newTab && !newTab.closed && newTab.document) {
        newTab.document.body.innerHTML = '<div><p>⚠️ Le chargement de la visite a échoué.</p><p style="font-size:.9rem;">Vérifiez votre connexion puis réessayez.</p></div>';
      }
    } finally {
      btn.disabled = false;
      btn.classList.remove('pill--loading');
      btn.textContent = defaultLabel;
      hideBar();
    }
  }

  grid.addEventListener('click', (event) => {
    const btn = event.target.closest('.pill--visite');
    if (!btn) return;
    handleVisiteClick(btn);
  });

  // ---------- Chargement des randonnées ----------

  try {
    const slugs = await fetchJSON('randonnees.json');

    if (!Array.isArray(slugs) || slugs.length === 0) {
      grid.innerHTML = '<p class="empty">Aucune randonnée publiée pour le moment.</p>';
      return;
    }

    const cards = await Promise.all(
      slugs.map(async (slug) => {
        try {
          const r = await fetchJSON(`randonnees/${slug}/rando.json`);
          return cardHTML(slug, r);
        } catch (err) {
          console.warn('Randonnée ignorée :', slug, err);
          return '';
        }
      })
    );

    const html = cards.join('');
    grid.innerHTML = html || '<p class="empty">Aucune randonnée publiée pour le moment.</p>';
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<p class="error">Impossible de charger la liste des randonnées.</p>';
  }
})();
