// Extrae texto plano de un subsection (soporta content:string y blocks:array)
function subsectionText(sub) {
  if (sub.content) return sub.content;
  if (!sub.blocks) return '';
  return sub.blocks.map(b => {
    if (b.type === 'text' || b.type === 'callout') return b.content || '';
    if (b.type === 'code') return b.content || '';
    if (b.type === 'cards') return (b.items || []).map(i => `${i.title} ${i.body}`).join(' ');
    if (b.type === 'steps') return (b.items || []).map(i => `${i.title} ${i.body}`).join(' ');
    if (b.type === 'table') return (b.rows || []).flat().join(' ');
    if (b.type === 'compare') {
      const rows = [...(b.left?.rows || []), ...(b.right?.rows || [])];
      return rows.map(r => `${r.key} ${r.value}`).join(' ');
    }
    return '';
  }).join(' ');
}

// Construir índice de búsqueda desde las colecciones
function buildSearchIndex(collections) {
  const index = [];

  if (!Array.isArray(collections)) return index;

  collections.forEach((collection) => {
    if (!Array.isArray(collection.sections)) return;

    collection.sections.forEach((section) => {
      if (!Array.isArray(section.articles)) return;

      section.articles.forEach((article) => {
        index.push({
          ...article,
          collectionTitle: collection.title,
          sectionTitle: section.title,
        });
      });
    });
  });

  return index;
}

// Función de búsqueda con scoring
function search(query, searchIndex) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const q = query.toLowerCase();
  const results = [];

  if (!Array.isArray(searchIndex)) return results;

  searchIndex.forEach((article) => {
    if (!article || typeof article !== 'object') return;

    let score = 0;
    const matches = {
      inTitle: false,
      inSection: false,
      inSubsection: false,
      inContent: false,
    };

    // Buscar en título (30 puntos)
    if (article.title && String(article.title).toLowerCase().includes(q)) {
      score += 30;
      matches.inTitle = true;
    }

    // Buscar en sección (30 puntos)
    if (article.sectionTitle && String(article.sectionTitle).toLowerCase().includes(q)) {
      score += 30;
      matches.inSection = true;
    }

    // Buscar en subsecciones (20 puntos cada una)
    if (article.subsections) {
      article.subsections.forEach((sub) => {
        if (sub.title && sub.title.toLowerCase().includes(q)) {
          score += 20;
          matches.inSubsection = true;
        }
        const text = subsectionText(sub);
        if (text.toLowerCase().includes(q)) {
          score += 10;
          matches.inContent = true;
        }
      });
    }

    // Buscar en resumen (20 puntos)
    if (article.summary && String(article.summary).toLowerCase().includes(q)) {
      score += 20;
      matches.inContent = true;
    }

    if (score > 0) {
      results.push({
        ...article,
        score,
        matches,
      });
    }
  });

  // Ordenar por score descendente
  return results.sort((a, b) => b.score - a.score);
}

export { buildSearchIndex, search };
