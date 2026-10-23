/**
 * OG.SNKT Creative Portfolio Frontend Script
 * Handles Theming, API Fetching, Category Filtering, GSAP Animations, GLightbox, and Video Previews.
 */

'use strict';

// -----------------------------------------------------------------------------
// Global State
// -----------------------------------------------------------------------------
let lightboxInstance = null;
let allPortfolioItems = [];
let portfolioCategories = [];
let currentSide = 'A';
let currentCategory = 'all';

// Fallback sample data in case backend API is not yet running
const FALLBACK_CATEGORIES = [
  'Video Edits',
  'Posters',
  'Motion Graphics',
  'Design'
];

const FALLBACK_ITEMS = [
  {
    id: 1,
    title: 'Neon Drift Cinematic Reel',
    category: 'Video Edits',
    type: 'video',
    side: 'B',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1000&auto=format&fit=crop&q=80',
    description: 'High-energy cyberpunk speed cut featuring dynamic speed-ramps and custom sound design.'
  },
  {
    id: 2,
    title: 'Tokyo Cyberpunk 2099',
    category: 'Posters',
    type: 'image',
    side: 'B',
    media_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=85',
    thumbnail_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1000&auto=format&fit=crop&q=80',
    description: 'Hyper-kinetic neo-brutalist typographic poster series with aggressive typography.'
  },
  {
    id: 3,
    title: 'Kinetic Quantum Abstract',
    category: 'Motion Graphics',
    type: 'video',
    side: 'B',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
    description: '3D generative fluid simulation and kinetic type branding loop.'
  },
  {
    id: 4,
    title: 'Aura Studio Visual Identity',
    category: 'Design',
    type: 'image',
    side: 'A',
    media_url: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=1600&auto=format&fit=crop&q=85',
    thumbnail_url: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=1000&auto=format&fit=crop&q=80',
    description: 'Complete brand packaging, editorial typography, and minimalist design system.'
  },
  {
    id: 5,
    title: 'Midnight Echoes Short Film',
    category: 'Video Edits',
    type: 'video',
    side: 'A',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=1000&auto=format&fit=crop&q=80',
    description: 'Moody narrative edit with film grain emulation and bespoke 35mm color grading.'
  },
  {
    id: 6,
    title: 'Solstice Music Fest 2024',
    category: 'Posters',
    type: 'image',
    side: 'A',
    media_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=85',
    thumbnail_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80',
    description: 'Swiss-style experimental minimal gradient poster for an ambient music festival.'
  },
  {
    id: 7,
    title: 'Orbit Zero UI Design System',
    category: 'Design',
    type: 'image',
    side: 'A',
    media_url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1600&auto=format&fit=crop&q=85',
    thumbnail_url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1000&auto=format&fit=crop&q=80',
    description: 'Pure editorial interface design system for aerospace telemetry.'
  },
  {
    id: 8,
    title: 'Chrome Horizons 3D Loop',
    category: 'Motion Graphics',
    type: 'video',
    side: 'B',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1000&auto=format&fit=crop&q=80',
    description: 'Metallic physics simulation with procedural lighting crafted in Cinema 4D.'
  },
  {
    id: 9,
    title: 'Subway Beats Rhythm Edit',
    category: 'Video Edits',
    type: 'video',
    side: 'B',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000&auto=format&fit=crop&q=80',
    description: 'Fast-paced street choreography edit synced with heavy electronic basslines.'
  }
];

// -----------------------------------------------------------------------------
// 1. Theme Management
// -----------------------------------------------------------------------------
function initTheme() {
  const THEME_KEY = 'og_snkt_theme';
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(savedTheme);

  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);

    // Subtle rotation animation feedback
    themeToggle.style.transform = 'rotate(360deg)';
    setTimeout(() => {
      themeToggle.style.transform = '';
    }, 400);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    themeToggle.setAttribute('title', label);
    themeToggle.setAttribute('aria-label', label);
  }
}

// -----------------------------------------------------------------------------
// 2. Fetch Data (API with Fallback)
// -----------------------------------------------------------------------------
async function fetchCategories() {
  try {
    const res = await fetch('/api/categories', { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    
    // Normalize response: array of strings or array of objects
    if (Array.isArray(data)) {
      return data.map(item => (typeof item === 'string' ? item : item.name || item.title || item.slug));
    } else if (data && Array.isArray(data.categories)) {
      return data.categories.map(item => (typeof item === 'string' ? item : item.name || item.title || item.slug));
    }
    return FALLBACK_CATEGORIES;
  } catch (err) {
    console.warn('[OG.SNKT] /api/categories unavailable, using curated showcase categories:', err.message);
    return FALLBACK_CATEGORIES;
  }
}

async function fetchItems() {
  try {
    const res = await fetch('/api/items', { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    // Normalize response: array or object wrapper
    let items = Array.isArray(data) ? data : (data.items || []);

    // Merge any locally published items from mobile admin
    try {
      const local = localStorage.getItem('og_portfolio_items_local');
      if (local) {
        const localItems = JSON.parse(local);
        if (Array.isArray(localItems) && localItems.length > 0) {
          const ids = new Set(items.map(it => String(it.id)));
          localItems.forEach(lit => {
            if (!ids.has(String(lit.id))) {
              items.unshift(lit);
            }
          });
        }
      }
    } catch (e) {}

    if (items.length > 0) {
      return items.map(item => ({
        id: item.id || Math.random(),
        title: item.title || 'Untitled Work',
        category: item.category_name || item.category || 'Design',
        type: (item.file_type || item.type || ((item.file_path || item.media_url || '').toLowerCase().match(/\.(mp4|webm|mov|m4v)$/) ? 'video' : 'image')).toLowerCase(),
        media_url: item.file_path || item.media_url || item.url || item.src || '',
        thumbnail_url: item.thumbnail_path || item.thumbnail_url || item.thumbnail || item.poster || item.file_path || item.media_url || '',
        description: item.description || '',
        side: (item.side || 'BOTH').toUpperCase()
      }));
    }
    return FALLBACK_ITEMS;
  } catch (err) {
    console.warn('[OG.SNKT] /api/items unavailable, using curated showcase items:', err.message);
    try {
      const local = localStorage.getItem('og_portfolio_items_local');
      if (local) {
        const localItems = JSON.parse(local);
        if (Array.isArray(localItems) && localItems.length > 0) return localItems;
      }
    } catch (e) {}
    return FALLBACK_ITEMS;
  }
}

// -----------------------------------------------------------------------------
// 3. Render Functions
// -----------------------------------------------------------------------------
function renderFilterBar(categories) {
  const filterBar = document.getElementById('filterBar');
  if (!filterBar) return;

  // Clear existing extra buttons while keeping the "All" button
  filterBar.innerHTML = '<button class="filter-btn active" data-category="all">All</button>';

  // Deduplicate and filter out empty categories
  const uniqueCategories = Array.from(new Set(categories.filter(Boolean)));

  uniqueCategories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.setAttribute('data-category', cat);
    btn.textContent = cat;
    filterBar.appendChild(btn);
  });

  // Attach event delegation for filter buttons
  filterBar.addEventListener('click', (e) => {
    const targetBtn = e.target.closest('.filter-btn');
    if (!targetBtn) return;

    // Toggle active state
    filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    targetBtn.classList.add('active');

    currentCategory = targetBtn.getAttribute('data-category') || 'all';
    renderFilteredGrid();
  });
}

function getVisibleItems() {
  if (!allPortfolioItems || allPortfolioItems.length === 0) return [];

  return allPortfolioItems.filter(item => {
    // 1. Check side: if currentSide === 'ALL', include both Side A and Side B works
    if (currentSide !== 'ALL') {
      const itemSide = (item.side || 'BOTH').toUpperCase();
      const sideMatch = itemSide === currentSide || itemSide === 'BOTH';
      if (!sideMatch) return false;
    }

    // 2. Check category
    if (!currentCategory || currentCategory.toLowerCase() === 'all') return true;
    return (item.category || '').toLowerCase() === currentCategory.toLowerCase();
  });
}

function renderFilteredGrid() {
  const visible = getVisibleItems();
  renderPortfolioGrid(visible);
}

function renderPortfolioGrid(items) {
  const grid = document.getElementById('portfolioGrid');
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');

  if (loadingState) loadingState.style.display = 'none';

  if (!items || items.length === 0) {
    if (emptyState) {
      emptyState.style.display = 'flex';
      const emptyMsg = emptyState.querySelector('h3');
      if (emptyMsg) {
        emptyMsg.textContent = currentSide === 'ALL'
          ? 'No works found in this category'
          : currentSide === 'B' 
            ? 'No Overdrive Edits in this category' 
            : 'No Minimal Edits in this category';
      }
    }
    if (grid) grid.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  grid.innerHTML = '';

  items.forEach(item => {
    const isVideo = item.type === 'video';
    const card = document.createElement('div');
    card.className = 'grid-item anim-target';
    card.setAttribute('data-category', item.category);
    card.setAttribute('data-id', item.id);

    // GLightbox Anchor Link
    const link = document.createElement('a');
    link.href = item.media_url;
    link.className = 'item-link glightbox';
    link.setAttribute('data-gallery', 'portfolio');
    link.setAttribute('data-type', isVideo ? 'video' : 'image');
    link.setAttribute('data-title', item.title);
    link.setAttribute('data-description', item.description || '');

    const thumbUrl = item.thumbnail_url || item.thumbnail_path || '';
    if (isVideo && thumbUrl) {
      link.setAttribute('data-poster', thumbUrl);
    }

    // Container for Media
    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'item-media-container';

    // Initial Aspect Ratio Hints if present
    if (item.aspect_ratio) {
      const normRatio = item.aspect_ratio.toString().replace(':', '/');
      mediaContainer.style.setProperty('--aspect-ratio', normRatio);
      mediaContainer.style.setProperty('--thumb-ratio', normRatio);
    }
    if (item.video_aspect_ratio) {
      const normVidRatio = item.video_aspect_ratio.toString().replace(':', '/');
      mediaContainer.style.setProperty('--video-ratio', normVidRatio);
    }

    if (isVideo) {
      // Video element (plays on hover/touch-and-hold with 40% sound)
      const video = document.createElement('video');
      video.className = 'item-media video-preview';
      video.muted = true;
      video.volume = 0.4;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');

      const source = document.createElement('source');
      source.src = item.media_url;
      source.type = 'video/mp4';
      video.appendChild(source);

      // Detect intrinsic video pixel ratio and set --video-ratio
      const applyVideoRatio = () => {
        if (video.videoWidth && video.videoHeight) {
          const vRatio = `${video.videoWidth} / ${video.videoHeight}`;
          mediaContainer.style.setProperty('--video-ratio', vRatio);
          if (!thumbUrl) {
            // No custom thumbnail -> resting ratio matches video
            mediaContainer.style.setProperty('--thumb-ratio', vRatio);
            mediaContainer.style.setProperty('--aspect-ratio', vRatio);
          }
          if (window.ScrollTrigger) ScrollTrigger.refresh();
        }
      };

      video.addEventListener('loadedmetadata', applyVideoRatio);

      // Thumbnail Image element (displays at rest, defines resting tile aspect ratio)
      if (thumbUrl) {
        const thumbImg = document.createElement('img');
        thumbImg.className = 'item-media item-thumb-img';
        thumbImg.src = thumbUrl;
        thumbImg.alt = item.title;
        thumbImg.loading = 'lazy';

        const applyThumbRatio = () => {
          if (thumbImg.naturalWidth && thumbImg.naturalHeight) {
            const tRatio = `${thumbImg.naturalWidth} / ${thumbImg.naturalHeight}`;
            mediaContainer.style.setProperty('--thumb-ratio', tRatio);
            mediaContainer.style.setProperty('--aspect-ratio', tRatio);
            if (window.ScrollTrigger) ScrollTrigger.refresh();
          }
        };

        if (thumbImg.complete && thumbImg.naturalWidth) {
          applyThumbRatio();
        } else {
          thumbImg.addEventListener('load', applyThumbRatio);
        }

        mediaContainer.appendChild(thumbImg);
      }

      // Play Icon SVG Overlay
      const playIcon = document.createElement('div');
      playIcon.className = 'play-icon';
      playIcon.setAttribute('aria-hidden', 'true');
      playIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;

      // Touch-and-Hold Preview Badge for Video
      const holdBadge = document.createElement('div');
      holdBadge.className = 'tile-hold-badge';
      holdBadge.setAttribute('aria-hidden', 'true');
      holdBadge.innerHTML = `
        <span class="hold-pulse-dot"></span>
        <span class="hold-text">PREVIEW</span>
      `;

      mediaContainer.appendChild(video);
      mediaContainer.appendChild(playIcon);
      mediaContainer.appendChild(holdBadge);

      // Setup Hover & Touch-and-Hold zoom/play
      setupTileInteractions(card, video, link);
    } else {
      // Image item with dynamic pixel ratio detection
      const img = document.createElement('img');
      img.className = 'item-media';
      img.src = item.media_url;
      img.alt = item.title;
      img.loading = 'lazy';

      const applyImgRatio = () => {
        if (img.naturalWidth && img.naturalHeight) {
          const ratio = `${img.naturalWidth} / ${img.naturalHeight}`;
          mediaContainer.style.setProperty('--aspect-ratio', ratio);
          mediaContainer.style.setProperty('--thumb-ratio', ratio);
          if (window.ScrollTrigger) ScrollTrigger.refresh();
        }
      };

      if (img.complete && img.naturalWidth) {
        applyImgRatio();
      } else {
        img.addEventListener('load', applyImgRatio);
      }

      // Touch-and-Hold Preview Badge for Image
      const holdBadge = document.createElement('div');
      holdBadge.className = 'tile-hold-badge';
      holdBadge.setAttribute('aria-hidden', 'true');
      holdBadge.innerHTML = `
        <span class="hold-pulse-dot"></span>
        <span class="hold-text">ZOOM</span>
      `;

      mediaContainer.appendChild(img);
      mediaContainer.appendChild(holdBadge);

      // Setup Hover & Touch-and-Hold zoom
      setupTileInteractions(card, null, link);
    }

    // Hover Details Overlay
    const overlay = document.createElement('div');
    overlay.className = 'item-overlay';
    overlay.innerHTML = `
      <div class="item-tags-row">
        <span class="item-category-tag">${escapeHtml(item.category)}</span>
        ${currentSide === 'ALL' ? `<span class="item-side-badge side-tag-${(item.side || 'both').toLowerCase()}">${escapeHtml(item.side === 'BOTH' ? 'A+B' : 'SIDE ' + item.side)}</span>` : ''}
      </div>
      <h3 class="item-title">${escapeHtml(item.title)}</h3>
      ${item.description ? `<p class="item-description">${escapeHtml(item.description)}</p>` : ''}
    `;

    mediaContainer.appendChild(overlay);
    link.appendChild(mediaContainer);
    card.appendChild(link);
    grid.appendChild(card);
  });

  // Initialize or re-initialize GLightbox
  initGLightbox();

  // Trigger GSAP ScrollTrigger entry animations
  animateGridEntrance();
}

// -----------------------------------------------------------------------------
// 4. Interactive Tile Engine: Desktop Hover & Mobile Touch-and-Hold Zoom/Play
// -----------------------------------------------------------------------------
function setupTileInteractions(card, video, link) {
  let holdTimer = null;
  let isHolding = false;
  let preventNextClick = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let morphRefreshTimer = null;
  const HOLD_THRESHOLD_MS = 200;

  const scheduleMorphRefresh = () => {
    clearTimeout(morphRefreshTimer);
    morphRefreshTimer = setTimeout(() => {
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }, 450);
  };

  const startPreview = (isTouch = false) => {
    card.classList.add('is-zoomed', 'is-playing');
    if (isTouch) card.classList.add('is-holding', 'is-touch');

    if (video) {
      // Stop and mute any other active video preview so sound never clashes
      document.querySelectorAll('.video-preview').forEach(v => {
        if (v !== video && !v.paused) {
          v.pause();
          v.muted = true;
        }
      });

      try {
        video.currentTime = 0;
      } catch (e) {}

      // Preview sound at exactly 40% volume
      video.volume = 0.4;
      video.muted = false;

      // In Side B (Overdrive), preview videos play at 1.35x speed ramp
      video.playbackRate = currentSide === 'B' ? 1.35 : 1.0;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser autoplay policy blocks unmuted audio before user interaction,
          // fallback to muted playback so the visual preview continues seamlessly
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    }

    scheduleMorphRefresh();

    if (isTouch && navigator.vibrate) {
      try { navigator.vibrate(30); } catch (e) {}
    }
  };

  const stopPreview = () => {
    card.classList.remove('is-zoomed', 'is-playing', 'is-holding', 'is-touch');
    if (video) {
      video.pause();
      try {
        video.currentTime = 0;
      } catch (e) {}
      video.muted = true;
      video.volume = 0.4;
      video.playbackRate = 1.0;
    }

    scheduleMorphRefresh();
  };

  // 1. Desktop Hover
  card.addEventListener('mouseenter', () => {
    startPreview(false);
  });

  card.addEventListener('mouseleave', () => {
    stopPreview();
  });

  // 2. Mobile Touch-and-Hold
  card.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isHolding = false;

    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      isHolding = true;
      preventNextClick = true; // Block lightbox click when hold is released
      startPreview(true);
    }, HOLD_THRESHOLD_MS);
  }, { passive: true });

  card.addEventListener('touchmove', (e) => {
    if (!holdTimer && !isHolding) return;
    const touch = e.touches[0];
    if (!touch) return;
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);

    // If moved more than 8px, user is scrolling the page -> cancel hold
    if (deltaX > 8 || deltaY > 8) {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      if (isHolding) {
        isHolding = false;
        stopPreview();
        setTimeout(() => { preventNextClick = false; }, 100);
      }
    }
  }, { passive: true });

  const handleTouchEnd = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    if (isHolding) {
      isHolding = false;
      stopPreview();
      setTimeout(() => {
        preventNextClick = false;
      }, 350);
    }
  };

  card.addEventListener('touchend', handleTouchEnd);
  card.addEventListener('touchcancel', handleTouchEnd);

  // Prevent browser context menu (long press image popup) while holding
  card.addEventListener('contextmenu', (e) => {
    if (isHolding || preventNextClick) {
      e.preventDefault();
      return false;
    }
  });

  // Intercept click on link during capture phase to prevent lightbox if hold occurred
  if (link) {
    link.addEventListener('click', (e) => {
      if (preventNextClick) {
        e.preventDefault();
        e.stopPropagation();
        preventNextClick = false;
      }
    }, true);
  }
}

// -----------------------------------------------------------------------------
// 5. Category Filtering
// -----------------------------------------------------------------------------
function filterPortfolioGrid(category) {
  const items = document.querySelectorAll('.grid-item');
  const emptyState = document.getElementById('emptyState');
  let visibleCount = 0;

  const isAll = category.toLowerCase() === 'all';

  items.forEach(item => {
    const itemCategory = (item.getAttribute('data-category') || '').trim();
    const matches = isAll || itemCategory.toLowerCase() === category.toLowerCase();

    if (matches) {
      visibleCount++;
      item.classList.remove('hidden');
      item.classList.remove('filtering-out');
      item.style.display = '';

      if (window.gsap) {
        gsap.to(item, {
          opacity: 1,
          scale: 1,
          duration: 0.35,
          ease: 'power2.out',
          overwrite: 'auto',
          onComplete: () => {
            gsap.set(item, { clearProps: 'transform' });
          }
        });
      } else {
        item.style.opacity = '1';
        item.style.transform = '';
      }
    } else {
      item.classList.add('filtering-out');
      if (window.gsap) {
        gsap.to(item, {
          opacity: 0,
          scale: 0.8,
          duration: 0.25,
          ease: 'power2.in',
          overwrite: 'auto',
          onComplete: () => {
            item.classList.add('hidden');
            item.style.display = 'none';
          }
        });
      } else {
        item.style.opacity = '0';
        item.style.transform = 'scale(0.8)';
        setTimeout(() => {
          item.classList.add('hidden');
          item.style.display = 'none';
        }, 250);
      }
    }
  });

  if (emptyState) {
    emptyState.style.display = visibleCount === 0 ? 'flex' : 'none';
  }

  // Refresh ScrollTrigger calculations
  if (window.ScrollTrigger) {
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 300);
  }

  // Re-initialize GLightbox so lightbox only loops through visible items
  initGLightbox();
}

// -----------------------------------------------------------------------------
// 6. GLightbox Initialization (Default 60% Sound Volume)
// -----------------------------------------------------------------------------
function initGLightbox() {
  if (typeof GLightbox === 'undefined') return;

  if (lightboxInstance) {
    lightboxInstance.destroy();
  }

  // Pre-seed Plyr localStorage volume settings to 60% (0.6)
  try {
    const plyrSettings = JSON.parse(localStorage.getItem('plyr') || '{}');
    plyrSettings.volume = 0.6;
    plyrSettings.muted = false;
    localStorage.setItem('plyr', JSON.stringify(plyrSettings));
  } catch (e) {}

  lightboxInstance = GLightbox({
    selector: '.grid-item:not(.hidden) .glightbox',
    touchNavigation: true,
    loop: true,
    autoplayVideos: true,
    plyr: {
      css: 'https://cdn.plyr.io/3.7.8/plyr.css',
      js: 'https://cdn.plyr.io/3.7.8/plyr.js',
      config: {
        ratio: '16:9',
        volume: 0.6,
        muted: false,
        hideControls: true,
        youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3 },
        vimeo: { byline: false, portrait: false, title: false, transparent: false }
      }
    }
  });

  // When GLightbox opens, pause any active video hover previews on the page
  lightboxInstance.on('open', () => {
    document.querySelectorAll('.video-preview').forEach(v => {
      v.pause();
    });
  });

  // Ensure default 60% sound on all lightbox video slides
  const enforceDefaultVolume = () => {
    const activeSlide = document.querySelector('.gslide.current') || document.querySelector('.gslide.loaded');
    if (activeSlide) {
      const videos = activeSlide.querySelectorAll('video');
      videos.forEach(v => {
        try {
          v.volume = 0.6;
          v.muted = false;
        } catch (e) {}
      });
      const plyrEl = activeSlide.querySelector('.plyr');
      if (plyrEl && plyrEl.plyr) {
        try {
          plyrEl.plyr.volume = 0.6;
          plyrEl.plyr.muted = false;
        } catch (e) {}
      }
    }
  };

  lightboxInstance.on('slide_after_load', enforceDefaultVolume);
  lightboxInstance.on('slide_changed', enforceDefaultVolume);
}

// Global capture listeners to guarantee 60% sound whenever a video plays inside GLightbox player
document.addEventListener('play', (e) => {
  if (e.target && e.target.tagName === 'VIDEO' && e.target.closest('.glightbox-container')) {
    try {
      e.target.volume = 0.6;
      e.target.muted = false;
    } catch (err) {}
  }
}, true);

document.addEventListener('loadedmetadata', (e) => {
  if (e.target && e.target.tagName === 'VIDEO' && e.target.closest('.glightbox-container')) {
    try {
      e.target.volume = 0.6;
      e.target.muted = false;
    } catch (err) {}
  }
}, true);

// -----------------------------------------------------------------------------
// 7. GSAP Animations & ScrollTrigger
// -----------------------------------------------------------------------------
function initGSAP() {
  if (typeof gsap === 'undefined') return;

  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  // Hero Section Intro Animation
  const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  heroTl
    .to('.hero-hud', {
      opacity: 1,
      duration: 1,
    })
    .to('.hero-tag', {
      opacity: 1,
      y: 0,
      duration: 0.8,
    }, '-=0.7')
    .to('.hero-title', {
      opacity: 1,
      y: 0,
      duration: 1.1,
    }, '-=0.5')
    .to('.hero-subtitle', {
      opacity: 1,
      y: 0,
      duration: 0.9,
    }, '-=0.7')
    .to('.floating-badge', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'back.out(1.2)'
    }, '-=0.6')
    .to('.scroll-indicator', {
      opacity: 1,
      y: 0,
      duration: 0.8,
    }, '-=0.5');

  // Filter Bar reveal on scroll
  if (typeof ScrollTrigger !== 'undefined') {
    gsap.from('.filter-bar-wrapper', {
      scrollTrigger: {
        trigger: '#portfolio',
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 0,
      y: 25,
      duration: 0.7,
      ease: 'power2.out'
    });
  }
}

function animateGridEntrance() {
  const cards = document.querySelectorAll('.grid-item.anim-target');
  if (cards.length === 0) return;

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.batch(cards, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power3.out',
          onComplete: () => {
            batch.forEach(card => {
              card.classList.remove('anim-target');
              gsap.set(card, { clearProps: 'transform' });
            });
          }
        });
      }
    });
    ScrollTrigger.refresh();
  } else if (typeof gsap !== 'undefined') {
    gsap.to(cards, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power3.out',
      onComplete: () => {
        cards.forEach(card => {
          card.classList.remove('anim-target');
          gsap.set(card, { clearProps: 'transform' });
        });
      }
    });
  } else {
    // Fallback if GSAP is blocked or unavailable
    cards.forEach(card => {
      card.style.opacity = '1';
      card.style.transform = '';
      card.classList.remove('anim-target');
    });
  }
}

// -----------------------------------------------------------------------------
// 8. Smooth Scroll
// -----------------------------------------------------------------------------
function initSmoothScroll() {
  const scrollIndicator = document.getElementById('scrollIndicator');
  if (!scrollIndicator) return;

  scrollIndicator.addEventListener('click', (e) => {
    e.preventDefault();
    const portfolioSection = document.getElementById('portfolio');
    if (portfolioSection) {
      portfolioSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// -----------------------------------------------------------------------------
// 8. Cinematic Timecode Ticker & Interactive Hero Parallax
// -----------------------------------------------------------------------------
function initTimecodeTicker() {
  const tcEl = document.getElementById('heroTimecode');
  if (!tcEl) return;

  let frames = 18;
  let seconds = 24;
  let minutes = 1;
  let hours = 0;

  setInterval(() => {
    frames++;
    if (frames >= 60) {
      frames = 0;
      seconds++;
      if (seconds >= 60) {
        seconds = 0;
        minutes++;
        if (minutes >= 60) {
          minutes = 0;
          hours++;
        }
      }
    }
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    const ff = String(frames).padStart(2, '0');
    tcEl.textContent = `${hh}:${mm}:${ss}:${ff}`;
  }, 1000 / 30);
}

function initHeroParallax() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const elements = hero.querySelectorAll('.floating-badge, .floating-geo');
  if (elements.length === 0) return;

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width - 0.5;
    const yRatio = (e.clientY - rect.top) / rect.height - 0.5;

    elements.forEach((el) => {
      const speed = parseFloat(el.getAttribute('data-speed')) || 16;
      const moveX = xRatio * speed;
      const moveY = yRatio * speed;
      el.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
    });
  });

  hero.addEventListener('mouseleave', () => {
    elements.forEach((el) => {
      el.style.transform = '';
    });
  });
}

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// 9. Side A / Side B Dual Persona Switcher (Silent Blue/Purple vs Aggressive Red)
// -----------------------------------------------------------------------------
let isSideTransitioning = false;

function initSideSwitcher() {
  const SIDE_KEY = 'og_snkt_side';
  currentSide = localStorage.getItem(SIDE_KEY) || 'A';
  applySideMode(currentSide, false); // initial apply without flash

  const btnSideA = document.getElementById('btnSideA');
  const btnSideB = document.getElementById('btnSideB');
  const btnSideBoth = document.getElementById('btnSideBoth');

  if (btnSideA) {
    btnSideA.addEventListener('click', () => {
      if (currentSide === 'A' || isSideTransitioning) return;
      currentSide = 'A';
      localStorage.setItem(SIDE_KEY, 'A');
      applySideMode('A', true);
    });
  }

  if (btnSideB) {
    btnSideB.addEventListener('click', () => {
      if (currentSide === 'B' || isSideTransitioning) return;
      currentSide = 'B';
      localStorage.setItem(SIDE_KEY, 'B');
      applySideMode('B', true);
    });
  }

  if (btnSideBoth) {
    btnSideBoth.addEventListener('click', () => {
      if (currentSide === 'ALL' || isSideTransitioning) return;
      currentSide = 'ALL';
      localStorage.setItem(SIDE_KEY, 'ALL');
      applySideMode('ALL', true);
    });
  }
}

function setSideDOMState(side) {
  // Set data-mode on html element
  document.documentElement.setAttribute('data-mode', `side-${side.toLowerCase()}`);

  // Update switcher buttons state
  const btnA = document.getElementById('btnSideA');
  const btnB = document.getElementById('btnSideB');
  const btnBoth = document.getElementById('btnSideBoth');
  if (btnA && btnB) {
    btnA.classList.toggle('active', side === 'A');
    btnA.setAttribute('aria-checked', side === 'A');
    btnB.classList.toggle('active', side === 'B');
    btnB.setAttribute('aria-checked', side === 'B');
  }
  if (btnBoth) {
    btnBoth.classList.toggle('active', side === 'ALL');
    btnBoth.setAttribute('aria-checked', side === 'ALL');
  }

  // Update mobile drawer persona cards state
  const drawerSideA = document.getElementById('drawerSideA');
  const drawerSideB = document.getElementById('drawerSideB');
  if (drawerSideA && drawerSideB) {
    drawerSideA.classList.toggle('active', side === 'A');
    drawerSideB.classList.toggle('active', side === 'B');
  }

  // Update hero text & subtitle dynamically
  const heroTag = document.getElementById('heroTag');
  const heroSubtitle = document.getElementById('heroSubtitle');
  const scrollText = document.getElementById('scrollText');

  if (side === 'A') {
    if (heroTag) heroTag.textContent = 'SIDE A // SILENT BLUE & PURPLE';
    if (heroSubtitle) heroSubtitle.textContent = 'Silent Midnight Atmosphere • Celestial Indigo • 24FPS Cinema Cuts • Pure Editorial Direction';
    if (scrollText) scrollText.textContent = 'Explore Silent Cinema';
  } else if (side === 'B') {
    if (heroTag) heroTag.textContent = 'SIDE B // AGGRESSIVE RED OVERDRIVE';
    if (heroSubtitle) heroSubtitle.textContent = 'Volcanic Magma Glitch • Laser Red Cuts • Hyper-Kinetic Motion • Heavy Bass Overdrive';
    if (scrollText) scrollText.textContent = 'Explore Overdrive';
  } else {
    if (heroTag) heroTag.textContent = 'DUAL ARCHIVE // BOTH SIDES';
    if (heroSubtitle) heroSubtitle.textContent = 'Complete Creative Spectrum • Silent Indigo & Aggressive Crimson • The Full Vault';
    if (scrollText) scrollText.textContent = 'Explore All Works';
  }

  // Re-render items matching this side
  if (allPortfolioItems && allPortfolioItems.length > 0) {
    renderFilteredGrid();
  }
}

function applySideMode(side, triggerTransition = true) {
  const overlay = document.getElementById('sideTransitionOverlay');
  const transBadge = document.getElementById('transBadge');
  const glitchText = document.getElementById('glitchText');
  const transDesc = document.getElementById('transDesc');

  if (triggerTransition && overlay) {
    isSideTransitioning = true;
    overlay.setAttribute('data-target-side', side);

    if (transBadge) {
      transBadge.textContent = side === 'ALL'
        ? 'DUAL ARCHIVE // COMPLETE SPECTRUM'
        : side === 'B' 
          ? 'OVERDRIVE ACTIVE // MAX GAIN' 
          : 'SILENT CINEMA // 24FPS DECK';
    }
    if (glitchText) {
      glitchText.textContent = side === 'ALL'
        ? 'ALL SIDES // THE FULL VAULT'
        : side === 'B' 
          ? 'SIDE B // AGGRESSIVE RED' 
          : 'SIDE A // SILENT BLUE & PURPLE';
    }
    if (transDesc) {
      transDesc.textContent = side === 'ALL'
        ? 'SYNTHESIS OF EDITORIAL SILENCE & VOLCANIC OVERDRIVE'
        : side === 'B'
          ? 'VOLCANIC MAGMA GLITCH • LASER RED CUTS • BASS OVERDRIVE'
          : 'PURE EDITORIAL CUTS • CELESTIAL INDIGO • MINIMAL PACING';
    }

    overlay.classList.remove('active');
    void overlay.offsetWidth; // trigger reflow
    overlay.classList.add('active');

    // At 450ms (peak covering of screen), switch DOM state seamlessly
    setTimeout(() => {
      setSideDOMState(side);
    }, 450);

    // Complete transition after 950ms
    setTimeout(() => {
      overlay.classList.remove('active');
      isSideTransitioning = false;
    }, 950);
  } else {
    setSideDOMState(side);
  }
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// -----------------------------------------------------------------------------
// Mobile Drawer Controller
// -----------------------------------------------------------------------------
function initMobileDrawer() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const drawer = document.getElementById('mobileDrawer');
  const backdrop = document.getElementById('mobileDrawerBackdrop');
  const closeBtn = document.getElementById('drawerCloseBtn');
  const sideABtn = document.getElementById('drawerSideA');
  const sideBBtn = document.getElementById('drawerSideB');
  const themeBtn = document.getElementById('drawerThemeToggle');
  const links = drawer ? drawer.querySelectorAll('a') : [];

  function openDrawer() {
    if (drawer && backdrop) {
      drawer.classList.add('active');
      backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    }
  }

  function closeDrawer() {
    if (drawer && backdrop) {
      drawer.classList.remove('active');
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    }
  }

  if (menuBtn) menuBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  links.forEach(l => l.addEventListener('click', closeDrawer));

  if (sideABtn) {
    sideABtn.addEventListener('click', () => {
      if (currentSide === 'A' || isSideTransitioning) {
        closeDrawer();
        return;
      }
      currentSide = 'A';
      localStorage.setItem(SIDE_KEY, 'A');
      applySideMode('A', true);
      closeDrawer();
    });
  }

  if (sideBBtn) {
    sideBBtn.addEventListener('click', () => {
      if (currentSide === 'B' || isSideTransitioning) {
        closeDrawer();
        return;
      }
      currentSide = 'B';
      localStorage.setItem(SIDE_KEY, 'B');
      applySideMode('B', true);
      closeDrawer();
    });
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      localStorage.setItem(THEME_KEY, nextTheme);
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });
}

// -----------------------------------------------------------------------------
// App Initialization
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Theme
  initTheme();

  // 2. Initialize Side A / Side B Dual Switcher
  initSideSwitcher();

  // 3. Initialize Mobile Navigation Drawer
  initMobileDrawer();

  // 3. Setup Smooth Scroll
  initSmoothScroll();

  // 4. Initialize Cinematic Timecode Ticker & Parallax
  initTimecodeTicker();
  initHeroParallax();

  // 5. Initialize GSAP Hero & Scroll Animations
  initGSAP();

  // 6. Fetch Categories & Items in parallel
  try {
    const [categories, items] = await Promise.all([
      fetchCategories(),
      fetchItems()
    ]);

    portfolioCategories = categories;
    allPortfolioItems = items;

    // Render filter bar and portfolio cards
    renderFilterBar(portfolioCategories);
    renderFilteredGrid();
  } catch (err) {
    console.error('[OG.SNKT] Error during portfolio setup:', err);
    // Render fallback data gracefully
    portfolioCategories = FALLBACK_CATEGORIES;
    allPortfolioItems = FALLBACK_ITEMS;
    renderFilterBar(FALLBACK_CATEGORIES);
    renderFilteredGrid();
  }
});

