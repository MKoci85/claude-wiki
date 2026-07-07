import { useState, useEffect, useCallback, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import { buildSearchIndex, search as performSearch } from './searchEngine';
import './styles.css';

hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('python', python);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('markdown', markdown);

// ── Markdown inline renderer ───────────────────────────────

function parseMd(text, highlightTerm) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  if (highlightTerm && highlightTerm.trim()) {
    const escapedQ = highlightTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(`(${escapedQ})`, 'ig'), '<mark>$1</mark>');
  }
  return html;
}

function Md({ children, highlightTerm }) {
  if (!children) return null;
  const paragraphs = String(children).split(/\n\n+/);
  if (paragraphs.length === 1) {
    return <span dangerouslySetInnerHTML={{ __html: parseMd(paragraphs[0], highlightTerm) }} />;
  }
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} dangerouslySetInnerHTML={{ __html: parseMd(p, highlightTerm) }} />
      ))}
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────

const COLLECTION_BADGE = {
  'Introducción a Claude Code': 'badge-a',
  'Sistema de Memoria':         'badge-d',
  'Hooks':                      'badge-b',
  'Fundamentos':                'badge-a',
  'Arquitectura avanzada':      'badge-b',
  'Claude API':                 'badge-c',
};

function collectionBadge(title) {
  return COLLECTION_BADGE[title] || 'badge-d';
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function useTheme() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('wiki-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wiki-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);
  return [theme, toggle];
}

// ── Icons ──────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

// ── TopBar ─────────────────────────────────────────────────

// Escapa HTML y resalta las coincidencias de q dentro de text
function highlightMatch(text, q) {
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  if (!q) return escaped;
  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(`(${escapedQ})`, 'ig'), '<mark>$1</mark>');
}

function TopBar({ search, onSearch, searchResults, onResultClick, theme, onToggle, onLogoClick }) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);

  // Abre el dropdown cuando hay resultados y texto
  useEffect(() => {
    setOpen(!!search.trim() && searchResults !== null && Array.isArray(searchResults) && searchResults.length > 0);
  }, [search, searchResults]);

  // Cierra al hacer click fuera
  useEffect(() => {
    function handle(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') { onSearch(''); setOpen(false); }
  }, [onSearch]);

  const handleSelect = useCallback((article) => {
    onResultClick(article, {
      term: search,
      subsectionIndex: article.snippetSubsectionIndex ?? null,
    });
    onSearch('');
    setOpen(false);
  }, [onResultClick, onSearch, search]);

  const showEmpty = !!search.trim() && searchResults !== null && Array.isArray(searchResults) && searchResults.length === 0;

  return (
    <div className="topbar">
      <button className="topbar-logo" onClick={onLogoClick}>
        Claude Wiki
      </button>
      <div className="topbar-sep" />

      <div className="search-wrap" ref={wrapRef}>
        <IconSearch />
        <input
          value={search}
          onChange={e => { onSearch(e.target.value); }}
          onKeyDown={handleKey}
          onFocus={() => { if (searchResults && searchResults.length > 0 && search.trim()) setOpen(true); }}
          placeholder="Buscar artículos…"
          aria-label="Buscar"
          aria-expanded={open}
          aria-haspopup="listbox"
        />
        {search && (
          <button
            onClick={() => { onSearch(''); setOpen(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, lineHeight: 1, padding: 0 }}
            aria-label="Limpiar búsqueda"
          >×</button>
        )}

        {/* Dropdown */}
        {(open || showEmpty) && (
          <div className="search-dropdown" role="listbox">
            {showEmpty ? (
              <div className="search-empty">Sin resultados para &ldquo;{search}&rdquo;</div>
            ) : (
              (Array.isArray(searchResults) ? searchResults : []).slice(0, 8).map(article => (
                <button
                  key={article.id}
                  className="search-result-item"
                  role="option"
                  onClick={() => handleSelect(article)}
                >
                  <span className="search-result-title">{article.title}</span>
                  <span className={`badge ${collectionBadge(article.collectionTitle)} search-result-badge`}>
                    {article.collectionTitle}
                  </span>
                  {article.snippet && (
                    <span
                      className="search-result-snippet"
                      dangerouslySetInnerHTML={{
                        __html: (article.snippetSubsectionTitle ? `${highlightMatch(article.snippetSubsectionTitle, search)}: ` : '') + highlightMatch(article.snippet, search)
                      }}
                    />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <button className="theme-btn" onClick={onToggle} title="Cambiar tema">
        {theme === 'dark' ? '☀' : '☾'}
      </button>
      <a className="exam-btn" href="/practice" target="_blank" rel="noopener noreferrer">
        Examen de práctica
      </a>
    </div>
  );
}

// ── ArticleCard ────────────────────────────────────────────

function ArticleCard({ article, onClick }) {
  const badge = collectionBadge(article.collectionTitle);

  return (
    <button className="article-card fade-in" onClick={() => onClick(article)}>
      <div className="card-title">{article.title}</div>
      {article.summary && (
        <div className="card-summary">{article.summary}</div>
      )}
      <div className="card-meta">
        <span className={`badge ${badge}`}>{article.collectionTitle}</span>
        {article.sectionTitle && (
          <span className="card-section">{article.sectionTitle}</span>
        )}
      </div>
    </button>
  );
}

// ── SuperSectionView ───────────────────────────────────────

function SuperSectionView({ collection, onArticle }) {
  const [activeSection, setActiveSection] = useState(null);

  const sections = collection.sections || [];
  const displayed = activeSection
    ? sections.filter(s => s.title === activeSection)
    : sections;

  return (
    <div className="super-section">
      <div className="super-section-header">
        <h2 className="super-section-title">{collection.title}</h2>
        {collection.summary && (
          <p className="super-section-desc">{collection.summary}</p>
        )}
      </div>

      <div className="super-section-tabs">
        <button
          className={`super-tab-btn ${activeSection === null ? 'active' : ''}`}
          onClick={() => setActiveSection(null)}
        >
          Todo
        </button>
        {sections.map(s => (
          <button
            key={s.title}
            className={`super-tab-btn ${activeSection === s.title ? 'active' : ''}`}
            onClick={() => setActiveSection(s.title === activeSection ? null : s.title)}
          >
            {s.title}
          </button>
        ))}
      </div>

      <div className="super-section-body">
        {displayed.map(section => (
          <div key={section.title} className="super-section-group">
            <div className="super-section-group-header">
              <h3 className="super-section-group-title">{section.title}</h3>
              {section.description && (
                <p className="super-section-group-desc">{section.description}</p>
              )}
            </div>
            <div className="cards-grid">
              {(section.articles || []).map(article => (
                <ArticleCard
                  key={article.id || article.title}
                  article={{ ...article, collectionTitle: collection.title, sectionTitle: section.title }}
                  onClick={onArticle}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CollectionCard ─────────────────────────────────────────

const COLLECTION_ACCENT = [
  { bg: 'rgba(0,102,204,0.10)',   border: 'rgba(0,102,204,0.28)',   dot: '#0066CC' },
  { bg: 'rgba(124,58,237,0.10)',  border: 'rgba(124,58,237,0.28)',  dot: '#7C3AED' },
  { bg: 'rgba(5,150,105,0.10)',   border: 'rgba(5,150,105,0.28)',   dot: '#059669' },
  { bg: 'rgba(234,88,12,0.10)',   border: 'rgba(234,88,12,0.28)',   dot: '#EA580C' },
  { bg: 'rgba(220,38,38,0.10)',   border: 'rgba(220,38,38,0.28)',   dot: '#DC2626' },
  { bg: 'rgba(8,145,178,0.10)',   border: 'rgba(8,145,178,0.28)',   dot: '#0891B2' },
  { bg: 'rgba(101,163,13,0.10)',  border: 'rgba(101,163,13,0.28)',  dot: '#65A30D' },
  { bg: 'rgba(219,39,119,0.10)',  border: 'rgba(219,39,119,0.28)',  dot: '#DB2777' },
  { bg: 'rgba(180,83,9,0.10)',    border: 'rgba(180,83,9,0.28)',    dot: '#B45309' },
  { bg: 'rgba(79,70,229,0.10)',   border: 'rgba(79,70,229,0.28)',   dot: '#4F46E5' },
];

function CollectionCard({ collection, index, onClick }) {
  const accent = COLLECTION_ACCENT[index % COLLECTION_ACCENT.length];
  const count = (collection.sections || []).reduce((n, s) => n + (s.articles || []).length, 0);

  return (
    <button
      className="collection-card"
      style={{ '--cc-bg': accent.bg, '--cc-border': accent.border, '--cc-dot': accent.dot }}
      onClick={() => onClick(collection)}
    >
      <div className="collection-card-dot" />
      <div className="collection-card-title">{collection.title}</div>
      {collection.summary && (
        <div className="collection-card-desc">{collection.summary}</div>
      )}
      <div className="collection-card-footer">
        <span className="collection-card-count">{count} artículos</span>
        <span className="collection-card-arrow">→</span>
      </div>
    </button>
  );
}

// ── HomeView ───────────────────────────────────────────────

function HomeView({ collections, articles, activeCollection, onCollection, onArticle, onOpenCollection, search }) {
  const activeCollectionData = collections.find(c => c.title === activeCollection);
  const isSuper = activeCollectionData?.isSuper && !search.trim();
  const isHome = activeCollection === 'Todos' && !search.trim();

  return (
    <>
      {isHome && (
        <div className="home-hero">
          <div className="home-hero-eyebrow">Base de conocimiento</div>
          <h1 className="home-hero-headline">
            Domina Claude Code<br /><em>y su ecosistema</em>
          </h1>
          <p className="home-hero-sub">
            Documentación en español sobre Claude Code, la API de Anthropic, MCP, hooks, subagentes y más&nbsp;— preparada para el examen CCA-F.
          </p>
        </div>
      )}
    <div className="home">
      {isHome ? (
        <div className="collections-grid">
          {collections.map((col, i) => (
            <CollectionCard key={col.title} collection={col} index={i} onClick={onOpenCollection} />
          ))}
        </div>
      ) : isSuper ? (
        <SuperSectionView collection={activeCollectionData} onArticle={onArticle} />
      ) : (
        <>
          <div className="results-meta">
            {search.trim() ? (
              <><strong>{articles.length}</strong> {articles.length === 1 ? 'resultado' : 'resultados'} para &ldquo;{search}&rdquo;</>
            ) : articles.length > 0 ? (
              <><strong>{articles.length}</strong> artículos{activeCollection !== 'Todos' ? ` en ${activeCollection}` : ''}</>
            ) : null}
          </div>

          {articles.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 32 }}>⊘</div>
              <p>No se encontraron resultados para &ldquo;{search}&rdquo;</p>
            </div>
          ) : (
            <div className="cards-grid">
              {articles.map(article => (
                <ArticleCard key={article.id} article={article} onClick={onArticle} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
}

// ── Block renderers ────────────────────────────────────────

function BlockText({ block, highlightTerm }) {
  return <div className="block-text"><Md highlightTerm={highlightTerm}>{block.content}</Md></div>;
}

const TERMINAL_LANGS = new Set(['bash', 'shell', 'sh']);

function BlockCode({ block }) {
  const lang = block.lang || block.language || '';
  const content = block.content || block.code || '';
  const isTerminal = TERMINAL_LANGS.has(lang.toLowerCase());

  const highlighted = useCallback(() => {
    if (!lang) return null;
    try {
      const result = hljs.highlight(content, { language: lang, ignoreIllegals: true });
      return result.value;
    } catch {
      return null;
    }
  }, [content, lang]);

  const html = highlighted();

  return (
    <div className={`block-code-wrap ${isTerminal ? 'block-code-terminal' : 'block-code-editor'}`}>
      {block.label && (
        <div className="block-code-label">
          {isTerminal ? <span className="block-code-label-dot" /> : null}
          {block.label}
        </div>
      )}
      <pre className="block-code">
        {html
          ? <code dangerouslySetInnerHTML={{ __html: html }} />
          : <code>{content}</code>
        }
      </pre>
    </div>
  );
}

function BlockCallout({ block, highlightTerm }) {
  const variant = block.variant || block.style;
  return (
    <div className={`block-callout${variant ? ` block-callout-${variant}` : ''}`}>
      {block.title && <div className="block-callout-title">{block.icon && <span>{block.icon} </span>}{block.title}</div>}
      {block.icon && !block.title && <span className="block-callout-icon">{block.icon}</span>}
      <div><Md highlightTerm={highlightTerm}>{block.content}</Md></div>
    </div>
  );
}

function BlockCards({ block }) {
  const items = block.items || block.cards || [];
  return (
    <div className="block-cards">
      {items.map((item, i) => (
        <div key={i} className="block-card">
          <div className="block-card-title">{item.title}</div>
          <div className="block-card-body"><Md>{item.body || item.description || item.content}</Md></div>
        </div>
      ))}
    </div>
  );
}

function BlockTable({ block }) {
  const headers = block.headers || block.columns;
  return (
    <div className="block-table-wrap">
      <table className="block-table">
        {headers && (
          <thead>
            <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
        )}
        <tbody>
          {(block.rows || []).map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => <td key={ci}><Md>{cell}</Md></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlockSteps({ block }) {
  const items = block.items || block.steps || [];
  return (
    <div className="block-steps">
      {items.map((item, i) => (
        <div key={i} className="block-step">
          <div className="block-step-num">{i + 1}</div>
          <div className="block-step-body">
            <div className="block-step-title">{item.title}</div>
            <div className="block-step-text"><Md>{item.body || item.description || item.content}</Md></div>
            {item.tag && <span className="block-step-tag">{item.tag}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function BlockStats({ block }) {
  const items = block.items || block.stats || [];
  return (
    <div className="block-stats">
      {items.map((item, i) => (
        <div key={i} className="block-stat">
          <div className="block-stat-value">{item.value}</div>
          <div className="block-stat-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

function BlockCompare({ block }) {
  const renderCol = (col) => col && (
    <div className="block-compare-col">
      <div className="block-compare-head">{col.head || col.label || col.title}</div>
      <div className="block-compare-body">
        {(col.items || []).map((item, i) => (
          <div key={i} className="block-compare-row">
            <Md>{typeof item === 'string' ? item : item.title}</Md>
          </div>
        ))}
        {(col.rows || []).map((row, i) => (
          <div key={i} className="block-compare-row">
            <span className="block-compare-key">{row.key}</span>
            <span><Md>{row.value}</Md></span>
          </div>
        ))}
      </div>
    </div>
  );

  // Formato alternativo: array de items con left/right por item
  if (block.items && !block.left && !block.right) {
    return (
      <div className="block-compare">
        {block.title && <div className="block-compare-title">{block.title}</div>}
        <div className="block-compare-cols">
          {block.items.map((item, i) => (
            <div key={i} className="block-compare-col">
              <div className="block-compare-head">{item.title || item.label}</div>
              <div className="block-compare-body">
                {(item.items || item.rows || []).map((row, j) => (
                  <div key={j} className="block-compare-row">
                    <Md>{typeof row === 'string' ? row : (row.key ? <><span className="block-compare-key">{row.key}</span> {row.value}</> : row.title)}</Md>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="block-compare">
      {block.title && <div className="block-compare-title">{block.title}</div>}
      <div className="block-compare-cols">
        {renderCol(block.left)}
        {renderCol(block.right)}
      </div>
    </div>
  );
}

function Block({ block, highlightTerm }) {
  switch (block.type) {
    case 'text':    return <BlockText block={block} highlightTerm={highlightTerm} />;
    case 'code':    return <BlockCode block={block} />;
    case 'callout': return <BlockCallout block={block} highlightTerm={highlightTerm} />;
    case 'cards':   return <BlockCards block={block} />;
    case 'table':   return <BlockTable block={block} />;
    case 'steps':   return <BlockSteps block={block} />;
    case 'stats':   return <BlockStats block={block} />;
    case 'compare': return <BlockCompare block={block} />;
    default:        return null;
  }
}

function SubsectionContent({ sub, highlightTerm }) {
  if (sub.blocks && sub.blocks.length > 0) {
    return <div className="sub-blocks">{sub.blocks.map((b, i) => <Block key={i} block={b} highlightTerm={highlightTerm} />)}</div>;
  }
  if (sub.content) {
    return <div className="subsection-body">{sub.content}</div>;
  }
  return null;
}

// ── ArticleView ────────────────────────────────────────────

function ArticleView({ article, sectionArticles, groupedSections, onArticle, onCollection, onHome, highlightTarget }) {
  const [flashIndex, setFlashIndex] = useState(null);

  // Al llegar desde un resultado de búsqueda: hace scroll a la subsección
  // encontrada y la resalta durante 2 segundos.
  useEffect(() => {
    if (!article || !highlightTarget || highlightTarget.subsectionIndex == null) return;

    const { subsectionIndex } = highlightTarget;
    const el = document.getElementById(`subsection-${subsectionIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setFlashIndex(subsectionIndex);
    const timer = setTimeout(() => setFlashIndex(null), 2000);
    return () => clearTimeout(timer);
  }, [article, highlightTarget]);

  if (!article) {
    return (
      <div className="article-layout">
        <div className="article-view">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="skeleton" style={{ height: 14, width: 120 }} />
            <div className="skeleton" style={{ height: 32, width: '70%' }} />
            <div className="skeleton" style={{ height: 16, width: '90%' }} />
            <div className="skeleton" style={{ height: 16, width: '80%' }} />
          </div>
        </div>
      </div>
    );
  }

  const badge = collectionBadge(article.collectionTitle);
  const isActive = (a) => a.title === article.title && a.sectionTitle === article.sectionTitle;

  const renderSidebar = () => {
    if (groupedSections && groupedSections.length > 0) {
      return (
        <aside className="article-sidebar">
          <button className="sidebar-home-btn" onClick={onHome}>← Inicio</button>
          <div className="sidebar-collection-label">
            <span className={`badge ${badge}`}>{article.collectionTitle}</span>
          </div>
          <nav className="sidebar-nav">
            {groupedSections.map(section => (
              <div key={section.title} className="sidebar-group">
                <div className="sidebar-group-label">{section.title}</div>
                {section.articles.map(a => (
                  <button
                    key={a.title}
                    className={`sidebar-item ${isActive(a) ? 'active' : ''}`}
                    onClick={() => !isActive(a) && onArticle(a)}
                  >
                    {a.title}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>
      );
    }

    if (sectionArticles && sectionArticles.length > 1) {
      return (
        <aside className="article-sidebar">
          <button className="sidebar-home-btn" onClick={onHome}>← Inicio</button>
          <div className="sidebar-collection-label">
            <span className={`badge ${badge}`}>{article.collectionTitle}</span>
          </div>
          <nav className="sidebar-nav">
            {sectionArticles.map(a => (
              <button
                key={a.id || a.title}
                className={`sidebar-item ${isActive(a) ? 'active' : ''}`}
                onClick={() => !isActive(a) && onArticle(a)}
              >
                {a.title}
              </button>
            ))}
          </nav>
        </aside>
      );
    }
    return null;
  };

  return (
    <div className="article-layout fade-in">
      {renderSidebar()}

      {/* Article content */}
      <div className="article-view">
        <div className="breadcrumb">
          <button className="breadcrumb-btn breadcrumb-home" onClick={onHome}>Inicio</button>
          <IconChevronRight />
          <span className={`badge ${badge}`}>{article.collectionTitle}</span>
          <IconChevronRight />
          <span className="breadcrumb-current">{article.sectionTitle}</span>
        </div>

        <h1 className="article-title">{article.title}</h1>

        {article.summary && (
          <p className="article-lead">{article.summary}</p>
        )}

        {article.blocks && article.blocks.length > 0 && (
          <div className="sub-blocks">
            {article.blocks.map((b, i) => <Block key={i} block={b} />)}
          </div>
        )}

        {article.subsections && article.subsections.length > 0 && (
          <>
            <div className="section-label">Contenido</div>
            <div>
              {article.subsections.map((sub, i) => (
                <div
                  key={i}
                  id={`subsection-${i}`}
                  className={`sub-group ${flashIndex === i ? 'sub-group-flash' : ''}`}
                >
                  {sub.title && <div className="subsection-title">{sub.title}</div>}
                  <SubsectionContent sub={sub} highlightTerm={flashIndex === i ? highlightTarget?.term : null} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [collections, setCollections] = useState([]);
  const [searchIndex, setSearchIndex] = useState([]);
  const [allArticles, setAllArticles] = useState([]);
  const [activeCollection, setActiveCollection] = useState('Todos');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 280);
  const [searchResults, setSearchResults] = useState(null);
  const [view, setView] = useState('home');
  const [activeArticle, setActiveArticle] = useState(null);
  const [highlightTarget, setHighlightTarget] = useState(null);

  // Cargar índice desde JSON
  useEffect(() => {
    fetch('/data/content.json')
      .then(r => r.json())
      .then(async (index) => {
        let collections = [];

        if (Array.isArray(index.collections)) {
          // Procesar colecciones, manejando items anidados
          const collectionPromises = index.collections.map(async (entry) => {
            try {
              // Si tiene items anidados (como Conceptos), cargar cada uno
              if (entry.items && Array.isArray(entry.items)) {
                const nestedSections = await Promise.all(
                  entry.items.map(async (item) => {
                    try {
                      const data = await fetch(`/data/${item.file}`).then(r => r.json());
                      return {
                        title: item.title || data.title,
                        description: item.description,
                        articles: data.sections?.flatMap(s => s.articles) || [],
                      };
                    } catch (e) {
                      return { title: item.title, articles: [] };
                    }
                  })
                );
                return {
                  id: entry.title?.toLowerCase().replace(/\s+/g, '-'),
                  title: entry.title,
                  summary: entry.description,
                  isSuper: entry.isSuper || false,
                  sections: nestedSections,
                };
              } else if (entry.file) {
                // Colección normal con archivo único
                const data = await fetch(`/data/${entry.file}`).then(r => r.json());
                return { ...data, title: data.title || entry.title, summary: data.summary || data.description || entry.summary || entry.description };
              }
              return null;
            } catch (e) {
              return null;
            }
          });
          collections = (await Promise.all(collectionPromises)).filter(Boolean);
        } else if (Array.isArray(index.sections)) {
          collections = [{
            id: 'legacy-content',
            title: 'Contenido',
            summary: 'Contenido cargado desde el formato anterior del índice.',
            sections: index.sections,
          }];
        }

        setCollections(collections);

        // Construir índice de búsqueda
        const index2 = buildSearchIndex(collections);
        setSearchIndex(index2);

        // Aplanar artículos para vista general
        const flat = collections.flatMap(c =>
          (c.sections || []).flatMap(s =>
            (s.articles || []).map(a => ({
              ...a,
              collectionTitle: c.title,
              sectionTitle: s.title,
            }))
          )
        );
        setAllArticles(flat);
      })
      .catch(() => {});
  }, []);

  // Búsqueda con scoring local
  useEffect(() => {
    const q = debouncedSearch.trim();
    if (!q) { setSearchResults(null); return; }
    const results = performSearch(q, searchIndex);
    setSearchResults(results);
  }, [debouncedSearch, searchIndex]);

  // Artículos mostrados según filtros
  const displayedArticles = (() => {
    const base = searchResults ?? allArticles;
    if (activeCollection === 'Todos') return base;
    return base.filter(a => a.collectionTitle === activeCollection);
  })();

  // Abrir artículo (los datos ya están en memoria)
  const openArticle = useCallback((article, highlight) => {
    setActiveArticle(article);
    setHighlightTarget(highlight && highlight.term ? highlight : null);
    setView('article');
    if (!highlight) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goHome = useCallback(() => {
    setView('home');
    setActiveArticle(null);
    setActiveCollection('Todos');
  }, []);

  const goHomeToCollection = useCallback((collectionTitle) => {
    setView('home');
    setActiveArticle(null);
    setActiveCollection(collectionTitle);
    setSearch('');
  }, []);

  // Al hacer click en una CollectionCard: abre el primer artículo directamente
  const openCollection = useCallback((collection) => {
    const firstArticle = (collection.sections || [])
      .flatMap(s => (s.articles || []).map(a => ({
        ...a,
        collectionTitle: collection.title,
        sectionTitle: s.title,
      })))[0];
    if (firstArticle) {
      openArticle(firstArticle);
    }
  }, [openArticle]);

  return (
    <>
      <TopBar
        search={search}
        onSearch={setSearch}
        searchResults={searchResults}
        onResultClick={openArticle}
        theme={theme}
        onToggle={toggleTheme}
        onLogoClick={goHome}
      />
      {view === 'home' ? (
        <HomeView
          collections={collections}
          articles={displayedArticles}
          activeCollection={activeCollection}
          onCollection={setActiveCollection}
          onArticle={openArticle}
          onOpenCollection={openCollection}
          search={search}
        />
      ) : (
        <ArticleView
          article={activeArticle}
          sectionArticles={activeArticle
            ? allArticles.filter(a =>
                a.collectionTitle === activeArticle.collectionTitle &&
                a.sectionTitle === activeArticle.sectionTitle
              )
            : []}
          groupedSections={(() => {
            if (!activeArticle) return null;
            const col = collections.find(c => c.title === activeArticle.collectionTitle);
            if (!col) return null;
            return col.sections.map(s => ({
              title: s.title,
              articles: (s.articles || []).map(a => ({
                ...a,
                collectionTitle: col.title,
                sectionTitle: s.title,
              })),
            }));
          })()}
          onArticle={openArticle}
          onCollection={goHomeToCollection}
          onHome={goHome}
          highlightTarget={highlightTarget}
        />
      )}
    </>
  );
}
