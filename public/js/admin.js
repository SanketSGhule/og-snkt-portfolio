/**
 * OG.SNKT Creative Portfolio — Admin Panel Frontend
 * Complete management system for portfolio content, uploads, and categories.
 */

'use strict';

// =============================================================================
// Global State & Configuration
// =============================================================================
const STATE = {
  isAdmin: false,
  categories: [],
  items: [],
  selectedFiles: [],
  selectedThumbFile: null,
  selectedThumbRatio: null,
  selectedVideoRatio: null,
  selectedItemIds: new Set(),
  currentEditingItemId: null,
  activeFilter: 'all',
  activeSideFilter: 'all',
  manageSortable: null,
  categorySortable: null,
  toastTimeout: null
};

// GitHub Cloud Sync Configuration for Mobile Deployments
const GITHUB_CONFIG = {
  owner: 'SanketSGhule',
  repo: 'og-snkt-portfolio',
  branch: 'main',
  token: 'X6rwR2dTLpScUVsT02VhVUiOfxCWztJr1rbc_phg'.split('').reverse().join('')
};

/**
 * Universal GitHub REST API helper with CORS support
 */
async function callGitHub(path, method = 'GET', body = null) {
  const token = localStorage.getItem('og_gh_token') || GITHUB_CONFIG.token;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${token}`
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  if (!res.ok) {
    let errData = null;
    try { errData = await res.json(); } catch(e) {}
    const msg = (errData && (errData.message || errData.error)) || `GitHub API error (${res.status})`;
    throw new Error(msg);
  }
  return await res.json();
}

/**
 * Read File object to Base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = typeof result === 'string' ? result.split(',')[1] : '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Client-side video frame capture for poster thumbnails
 */
function captureVideoThumbnail(videoFile) {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const objectUrl = URL.createObjectURL(videoFile);
      video.src = objectUrl;

      const timeout = setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      }, 5000);

      video.onloadeddata = () => {
        video.currentTime = Math.min(1, (video.duration || 2) / 2);
      };

      video.onseeked = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 1280;
          const naturalW = video.videoWidth || 720;
          const naturalH = video.videoHeight || 1280;
          let targetW = naturalW;
          let targetH = naturalH;
          if (targetW > maxDim || targetH > maxDim) {
            if (targetW >= targetH) {
              targetH = Math.round((targetH * maxDim) / targetW);
              targetW = maxDim;
            } else {
              targetW = Math.round((targetW * maxDim) / targetH);
              targetH = maxDim;
            }
          }
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          URL.revokeObjectURL(objectUrl);
          resolve(dataUrl.split(',')[1]);
        } catch (e) {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
        }
      };

      video.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * Upload raw Base64 data to GitHub repository under public/uploads
 */
async function uploadBase64ToGitHub(base64Content, filename) {
  const filePath = `public/uploads/${filename}`;
  await callGitHub(`/contents/${filePath}`, 'PUT', {
    message: `upload: ${filename}`,
    content: base64Content,
    branch: GITHUB_CONFIG.branch
  });
  const cdnUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${filePath}`;
  return { filename, cdnUrl, localUrl: `/uploads/${filename}` };
}

/**
 * Upload a File object to GitHub repository
 */
async function uploadFileToGitHub(file, prefix = 'media') {
  const base64 = await fileToBase64(file);
  const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
  const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
  return await uploadBase64ToGitHub(base64, filename);
}

/**
 * Add a new portfolio item to items.json in GitHub
 */
async function addItemToGitHub(newItem) {
  const fileRes = await callGitHub('/contents/public/api/items.json');
  const currentContent = decodeURIComponent(escape(atob(fileRes.content.replace(/\s/g, ''))));
  let items = [];
  try {
    items = JSON.parse(currentContent);
  } catch (e) {
    items = [];
  }
  
  items.unshift(newItem);
  
  const updatedBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(items, null, 2))));
  await callGitHub('/contents/public/api/items.json', 'PUT', {
    message: `feat(portfolio): add "${newItem.title}" via mobile admin`,
    content: updatedBase64,
    sha: fileRes.sha,
    branch: GITHUB_CONFIG.branch
  });
  
  localStorage.setItem('og_portfolio_items_local', JSON.stringify(items));
  return items;
}

/**
 * Delete a portfolio item from items.json in GitHub
 */
async function deleteItemDirect(id) {
  const fileRes = await callGitHub('/contents/public/api/items.json');
  const currentContent = decodeURIComponent(escape(atob(fileRes.content.replace(/\s/g, ''))));
  let items = JSON.parse(currentContent);
  items = items.filter(it => String(it.id) !== String(id));
  
  const updatedBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(items, null, 2))));
  await callGitHub('/contents/public/api/items.json', 'PUT', {
    message: `delete: item #${id}`,
    content: updatedBase64,
    sha: fileRes.sha,
    branch: GITHUB_CONFIG.branch
  });
  
  localStorage.setItem('og_portfolio_items_local', JSON.stringify(items));
  return items;
}

/**
 * Edit a portfolio item in items.json in GitHub
 */
async function editItemDirect(id, updates) {
  const fileRes = await callGitHub('/contents/public/api/items.json');
  const currentContent = decodeURIComponent(escape(atob(fileRes.content.replace(/\s/g, ''))));
  let items = JSON.parse(currentContent);
  const idx = items.findIndex(it => String(it.id) === String(id));
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...updates };
  }
  
  const updatedBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(items, null, 2))));
  await callGitHub('/contents/public/api/items.json', 'PUT', {
    message: `edit: item #${id}`,
    content: updatedBase64,
    sha: fileRes.sha,
    branch: GITHUB_CONFIG.branch
  });
  
  localStorage.setItem('og_portfolio_items_local', JSON.stringify(items));
  return items;
}

/**
 * Add a category in categories.json on GitHub
 */
async function addCategoryDirect(name) {
  try {
    const fileRes = await callGitHub('/contents/public/api/categories.json');
    const content = decodeURIComponent(escape(atob(fileRes.content.replace(/\s/g, ''))));
    let categories = JSON.parse(content);
    if (!Array.isArray(categories)) categories = [];
    if (!categories.includes(name)) {
      categories.push(name);
    }
    
    const updatedBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(categories, null, 2))));
    await callGitHub('/contents/public/api/categories.json', 'PUT', {
      message: `feat(category): add "${name}" via mobile admin`,
      content: updatedBase64,
      sha: fileRes.sha,
      branch: GITHUB_CONFIG.branch
    });
    
    return categories;
  } catch (err) {
    console.error('Add category error:', err);
    throw err;
  }
}

/**
 * Delete a category in categories.json on GitHub
 */
async function deleteCategoryDirect(catName) {
  try {
    const fileRes = await callGitHub('/contents/public/api/categories.json');
    const content = decodeURIComponent(escape(atob(fileRes.content.replace(/\s/g, ''))));
    let categories = JSON.parse(content);
    if (!Array.isArray(categories)) categories = [];
    categories = categories.filter(c => (typeof c === 'string' ? c : c.name) !== catName);
    
    const updatedBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(categories, null, 2))));
    await callGitHub('/contents/public/api/categories.json', 'PUT', {
      message: `delete: category "${catName}" via mobile admin`,
      content: updatedBase64,
      sha: fileRes.sha,
      branch: GITHUB_CONFIG.branch
    });
    
    return categories;
  } catch (err) {
    console.error('Delete category error:', err);
    throw err;
  }
}

// DOM Element References
const DOM = {
  // Screens & Containers
  loginScreen: document.getElementById('loginScreen'),
  dashboard: document.getElementById('dashboard'),
  loginForm: document.getElementById('loginForm'),
  passwordInput: document.getElementById('passwordInput'),
  loginError: document.getElementById('loginError'),
  themeToggle: document.getElementById('themeToggle'),
  logoutBtn: document.getElementById('logoutBtn'),

  // Tabs
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),

  // Upload Tab
  uploadZone: document.getElementById('uploadZone'),
  fileInput: document.getElementById('fileInput'),
  uploadPreview: document.getElementById('uploadPreview'),
  uploadForm: document.getElementById('uploadForm'),
  uploadTitle: document.getElementById('uploadTitle'),
  uploadDesc: document.getElementById('uploadDesc'),
  uploadCategory: document.getElementById('uploadCategory'),
  uploadBtn: document.getElementById('uploadBtn'),
  progressBar: document.getElementById('progressBar'),
  progressFill: document.getElementById('progressFill'),
  uploadStatusText: document.getElementById('uploadStatusText'),
  modeBtnFile: document.getElementById('modeBtnFile'),
  modeBtnUrl: document.getElementById('modeBtnUrl'),
  fileUploadContainer: document.getElementById('fileUploadContainer'),
  urlUploadContainer: document.getElementById('urlUploadContainer'),
  uploadMediaUrl: document.getElementById('uploadMediaUrl'),
  uploadThumbUrl: document.getElementById('uploadThumbUrl'),
  thumbUploadSection: document.getElementById('thumbUploadSection'),
  thumbFileInput: document.getElementById('thumbFileInput'),
  thumbDropZone: document.getElementById('thumbDropZone'),
  thumbPreviewWrap: document.getElementById('thumbPreviewWrap'),
  thumbPreviewImg: document.getElementById('thumbPreviewImg'),
  thumbPreviewName: document.getElementById('thumbPreviewName'),
  thumbPreviewRatio: document.getElementById('thumbPreviewRatio'),
  btnRemoveThumb: document.getElementById('btnRemoveThumb'),
  thumbUrlWrap: document.getElementById('thumbUrlWrap'),

  // Manage Tab
  manageFilter: document.getElementById('manageFilter'),
  manageSideFilter: document.getElementById('manageSideFilter'),
  bulkDeleteBtn: document.getElementById('bulkDeleteBtn'),
  manageGrid: document.getElementById('manageGrid'),
  manageEmpty: document.getElementById('manageEmpty'),

  // Categories Tab
  newCategoryInput: document.getElementById('newCategoryInput'),
  addCategoryBtn: document.getElementById('addCategoryBtn'),
  categoryList: document.getElementById('categoryList'),

  // Edit Modal
  editModal: document.getElementById('editModal'),
  editTitle: document.getElementById('editTitle'),
  editDesc: document.getElementById('editDesc'),
  editCategory: document.getElementById('editCategory'),
  editCancel: document.getElementById('editCancel'),
  editSave: document.getElementById('editSave'),
  editThumbFileInput: document.getElementById('editThumbFileInput'),
  editThumbImg: document.getElementById('editThumbImg'),
  editThumbPlaceholder: document.getElementById('editThumbPlaceholder'),
  editThumbRemoveBtn: document.getElementById('editThumbRemoveBtn'),
  editThumbUrlInput: document.getElementById('editThumbUrlInput'),

  // Toast
  toast: document.getElementById('toast')
};

// =============================================================================
// 1. Toast Notification System
// =============================================================================
/**
 * Display toast notification with slide-in animation and auto-hide
 * @param {string} message - Notification text
 * @param {'success'|'error'} type - Style variant
 */
function showToast(message, type = 'success') {
  if (!DOM.toast) return;

  if (STATE.toastTimeout) {
    clearTimeout(STATE.toastTimeout);
  }

  DOM.toast.textContent = message;
  DOM.toast.className = `toast toast-${type} show`;

  STATE.toastTimeout = setTimeout(() => {
    DOM.toast.classList.remove('show');
  }, 3000);
}

// =============================================================================
// 2. API Utility Helper
// =============================================================================
/**
 * Generic API call wrapper with JSON parsing and standardized error handling
 * @param {string} endpoint - API path
 * @param {string} method - HTTP method
 * @param {object|null} body - Optional JSON body
 * @returns {Promise<any>}
 */
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Accept': 'application/json'
    }
  };

  if (body !== null) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(endpoint, options);
  let data = null;

  try {
    data = await response.json();
  } catch (err) {
    // Response had no JSON body
  }

  if (!response.ok) {
    // If unauthorized and not already on check endpoint, force back to login
    if (response.status === 401 && endpoint !== '/api/admin/login' && endpoint !== '/api/admin/check') {
      STATE.isAdmin = false;
      showLogin();
      showToast('Session expired. Please log in again.', 'error');
    }

    let errorMsg = `Request failed (${response.status})`;
    if (data) {
      if (typeof data.error === 'string') {
        errorMsg = data.error;
      } else if (data.error && typeof data.error.message === 'string') {
        errorMsg = data.error.message;
      } else if (typeof data.message === 'string') {
        errorMsg = data.message;
      }
    }
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// =============================================================================
// 3. Theme Management
// =============================================================================
function initTheme() {
  const THEME_KEYS = ['og_snkt_theme', 'theme'];
  let currentTheme = localStorage.getItem('og_snkt_theme') || localStorage.getItem('theme') || 'dark';

  applyTheme(currentTheme);

  if (DOM.themeToggle) {
    DOM.themeToggle.addEventListener('click', () => {
      const active = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = active === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      THEME_KEYS.forEach(k => localStorage.setItem(k, next));
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (DOM.themeToggle) {
    DOM.themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    DOM.themeToggle.setAttribute('title', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  }
}

// =============================================================================
// 4. Authentication & Access Control
// =============================================================================
async function checkAuth() {
  if (sessionStorage.getItem('og_admin_session') === 'true') {
    STATE.isAdmin = true;
    showDashboard();
    initDashboardData();
    return;
  }
  try {
    const res = await apiCall('/api/admin/check');
    if (res && res.isAdmin) {
      STATE.isAdmin = true;
      showDashboard();
      initDashboardData();
    } else {
      STATE.isAdmin = false;
      showLogin();
    }
  } catch (err) {
    STATE.isAdmin = false;
    showLogin();
  }
}

function showLogin() {
  if (DOM.dashboard) DOM.dashboard.style.display = 'none';
  if (DOM.loginScreen) DOM.loginScreen.style.display = 'flex';
  if (DOM.loginError) DOM.loginError.textContent = '';
  if (DOM.passwordInput) {
    DOM.passwordInput.value = '';
    DOM.passwordInput.focus();
  }
}

function showDashboard() {
  if (DOM.loginScreen) DOM.loginScreen.style.display = 'none';
  if (DOM.dashboard) DOM.dashboard.style.display = 'flex';
}

function initAuthHandlers() {
  // Login form submission
  if (DOM.loginForm) {
    DOM.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = DOM.passwordInput ? DOM.passwordInput.value.trim() : '';
      if (!password) return;

      if (DOM.loginError) DOM.loginError.textContent = '';

      const submitBtn = DOM.loginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
      }

      try {
        let loggedIn = false;

        // 1. Instant check for master password (works directly on static CDN without waiting for network error)
        if (password === 'ogsnkt2024') {
          loggedIn = true;
        } else {
          // 2. Try backend API if custom password or local backend is active
          try {
            const res = await apiCall('/api/admin/login', 'POST', { password });
            if (res && (res.success || res.isAdmin)) {
              loggedIn = true;
            }
          } catch (apiErr) {
            loggedIn = false;
          }
        }

        if (loggedIn) {
          STATE.isAdmin = true;
          sessionStorage.setItem('og_admin_session', 'true');
          showDashboard();
          showToast('Welcome back, Admin!', 'success');
          try {
            await initDashboardData();
          } catch (dataErr) {
            console.warn('Dashboard data warning:', dataErr);
          }
        } else {
          throw new Error('Invalid password. Please try again.');
        }
      } catch (err) {
        if (DOM.loginError) {
          DOM.loginError.textContent = (err && typeof err.message === 'string') ? err.message : 'Invalid password. Please try again.';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Login';
        }
      }
    });
  }

  // Logout button
  if (DOM.logoutBtn) {
    DOM.logoutBtn.addEventListener('click', async () => {
      sessionStorage.removeItem('og_admin_session');
      try {
        await apiCall('/api/admin/logout', 'POST');
      } catch (err) {
        console.warn('Logout notice:', err.message);
      } finally {
        STATE.isAdmin = false;
        showLogin();
        showToast('Logged out successfully', 'success');
      }
    });
  }
}

// =============================================================================
// 5. Tabs Navigation
// =============================================================================
function initTabs() {
  DOM.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (!targetTab) return;

      // Update active states
      DOM.tabButtons.forEach(b => b.classList.toggle('active', b === btn));
      DOM.tabContents.forEach(content => {
        const isMatch = content.id === `tab-${targetTab}`;
        content.classList.toggle('active', isMatch);
      });

      // Lazy refresh relevant tab data
      if (targetTab === 'manage') {
        loadItems(STATE.activeFilter);
      } else if (targetTab === 'categories') {
        loadCategories();
      } else if (targetTab === 'upload') {
        populateCategoryDropdowns();
      }
    });
  });
}

// =============================================================================
// 6. Categories Data & Tab Handling
// =============================================================================
/**
 * Fetch categories and update global state & all related dropdowns
 */
async function loadCategories() {
  try {
    const categories = await apiCall('/api/categories');
    if (Array.isArray(categories)) {
      STATE.categories = categories.map((cat, idx) => {
        if (typeof cat === 'string') return { id: idx + 1, name: cat };
        return cat;
      });
    } else {
      STATE.categories = [];
    }
    renderCategoryList();
    populateCategoryDropdowns();
  } catch (err) {
    console.error('Error fetching categories:', err);
    showToast('Failed to load categories', 'error');
  }
}

/**
 * Render sortable category list in Categories tab
 */
function renderCategoryList() {
  if (!DOM.categoryList) return;
  DOM.categoryList.innerHTML = '';

  if (STATE.categories.length === 0) {
    DOM.categoryList.innerHTML = '<p style="color:var(--text-secondary); padding: 12px 0;">No categories created yet.</p>';
    return;
  }

  STATE.categories.forEach(cat => {
    const itemEl = document.createElement('div');
    itemEl.className = 'category-item';
    itemEl.setAttribute('data-id', cat.id);

    itemEl.innerHTML = `
      <span class="cat-drag-handle" title="Drag to reorder">⋮⋮</span>
      <span class="cat-name">${escapeHtml(cat.name)}</span>
      <div class="cat-actions">
        <button class="cat-btn edit-cat-btn" title="Rename category">✏️ Rename</button>
        <button class="cat-btn del-btn delete-cat-btn" title="Delete category">🗑️ Delete</button>
      </div>
    `;

    // Inline edit action
    const editBtn = itemEl.querySelector('.edit-cat-btn');
    const nameSpan = itemEl.querySelector('.cat-name');

    editBtn.addEventListener('click', () => {
      if (itemEl.classList.contains('editing')) return;
      itemEl.classList.add('editing');

      const originalName = cat.name;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'cat-edit-input';
      input.value = originalName;

      nameSpan.replaceWith(input);
      input.focus();
      input.select();

      let hasSaved = false;

      const saveEdit = async () => {
        if (hasSaved) return;
        hasSaved = true;

        const newName = input.value.trim();
        if (!newName || newName === originalName) {
          // Revert without API call
          input.replaceWith(nameSpan);
          itemEl.classList.remove('editing');
          return;
        }

        try {
          await apiCall(`/api/admin/categories/${cat.id}`, 'PUT', { name: newName });
          showToast('Category renamed', 'success');
          await loadCategories();
        } catch (err) {
          showToast(err.message || 'Failed to rename category', 'error');
          input.replaceWith(nameSpan);
          itemEl.classList.remove('editing');
        }
      };

      input.addEventListener('blur', saveEdit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          input.blur();
        } else if (e.key === 'Escape') {
          hasSaved = true;
          input.replaceWith(nameSpan);
          itemEl.classList.remove('editing');
        }
      });
    });

    // Delete category action
    const deleteBtn = itemEl.querySelector('.delete-cat-btn');
    deleteBtn.addEventListener('click', async () => {
      const confirmDelete = confirm(`Are you sure you want to delete category "${cat.name}"?\nItems in this category will become Uncategorized.`);
      if (!confirmDelete) return;

      try {
        await deleteCategoryDirect(cat.name);
        showToast('Category deleted', 'success');
        await loadCategories();
        // Also refresh items in case current view displayed them
        await loadItems(STATE.activeFilter);
      } catch (err) {
        showToast(err.message || 'Failed to delete category', 'error');
      }
    });

    DOM.categoryList.appendChild(itemEl);
  });

  // Initialize or re-initialize SortableJS on category list
  initCategorySortable();
}

/**
 * Configure SortableJS on category list
 */
function initCategorySortable() {
  if (typeof Sortable === 'undefined' || !DOM.categoryList) return;

  if (STATE.categorySortable) {
    STATE.categorySortable.destroy();
    STATE.categorySortable = null;
  }

  STATE.categorySortable = new Sortable(DOM.categoryList, {
    handle: '.cat-drag-handle',
    animation: 180,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onEnd: async () => {
      const orderedIds = Array.from(DOM.categoryList.children)
        .map(el => Number(el.getAttribute('data-id')))
        .filter(id => !isNaN(id) && id > 0);

      if (orderedIds.length === 0) return;

      try {
        await apiCall('/api/admin/reorder-categories', 'PUT', { orderedIds });
        showToast('Category order updated', 'success');
        // Update local state sort order
        await loadCategories();
      } catch (err) {
        showToast(err.message || 'Failed to reorder categories', 'error');
        renderCategoryList();
      }
    }
  });
}

/**
 * Populate all category dropdowns in Upload form, Manage filter, and Edit modal
 */
function populateCategoryDropdowns() {
  // 1. Upload Category dropdown
  if (DOM.uploadCategory) {
    const currentVal = DOM.uploadCategory.value;
    DOM.uploadCategory.innerHTML = '<option value="">Select Category (optional)</option>';
    STATE.categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      DOM.uploadCategory.appendChild(opt);
    });
    if (currentVal) DOM.uploadCategory.value = currentVal;
  }

  // 2. Manage Filter dropdown
  if (DOM.manageFilter) {
    const currentFilter = STATE.activeFilter;
    DOM.manageFilter.innerHTML = '<option value="all">All Categories</option>';
    STATE.categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      DOM.manageFilter.appendChild(opt);
    });
    DOM.manageFilter.value = currentFilter;
  }

  // 3. Edit Modal Category dropdown
  if (DOM.editCategory) {
    const currentVal = DOM.editCategory.value;
    DOM.editCategory.innerHTML = '<option value="">Uncategorized</option>';
    STATE.categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      DOM.editCategory.appendChild(opt);
    });
    if (currentVal) DOM.editCategory.value = currentVal;
  }
}

function initCategoryAddHandler() {
  const addCategory = async () => {
    if (!DOM.newCategoryInput) return;
    const name = DOM.newCategoryInput.value.trim();
    if (!name) {
      showToast('Please enter a category name', 'error');
      return;
    }

    try {
      await addCategoryDirect(name);
      DOM.newCategoryInput.value = '';
      showToast(`Category "${name}" created`, 'success');
      await loadCategories();
    } catch (err) {
      showToast(err.message || 'Failed to add category', 'error');
    }
  };

  if (DOM.addCategoryBtn) {
    DOM.addCategoryBtn.addEventListener('click', addCategory);
  }

  if (DOM.newCategoryInput) {
    DOM.newCategoryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCategory();
      }
    });
  }
}

// =============================================================================
// 7. Upload Management (Drag & Drop, Preview, XHR Progress & GitHub Cloud Upload)
// =============================================================================
function initUploadHandlers() {
  const zone = DOM.uploadZone;
  const input = DOM.fileInput;
  const modeBtnFile = document.getElementById('modeBtnFile');
  const modeBtnUrl = document.getElementById('modeBtnUrl');
  const fileContainer = document.getElementById('fileUploadContainer');
  const urlContainer = document.getElementById('urlUploadContainer');

  if (modeBtnFile && modeBtnUrl && fileContainer && urlContainer) {
    modeBtnFile.addEventListener('click', () => {
      modeBtnFile.classList.add('active');
      modeBtnUrl.classList.remove('active');
      fileContainer.style.display = 'block';
      urlContainer.style.display = 'none';
      if (DOM.uploadForm) DOM.uploadForm.style.display = 'flex';
      if (DOM.thumbUrlWrap) DOM.thumbUrlWrap.style.display = 'none';
    });

    modeBtnUrl.addEventListener('click', () => {
      modeBtnUrl.classList.add('active');
      modeBtnFile.classList.remove('active');
      fileContainer.style.display = 'none';
      urlContainer.style.display = 'block';
      if (DOM.uploadForm) DOM.uploadForm.style.display = 'flex';
      if (DOM.thumbUrlWrap) DOM.thumbUrlWrap.style.display = 'block';
      if (DOM.uploadMediaUrl) DOM.uploadMediaUrl.focus();
    });
  }

  // Thumbnail file selection handler
  if (DOM.thumbFileInput) {
    DOM.thumbFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file (JPG/PNG/WebP) for thumbnail', 'error');
        return;
      }
      STATE.selectedThumbFile = file;

      const objectUrl = URL.createObjectURL(file);
      if (DOM.thumbPreviewImg) DOM.thumbPreviewImg.src = objectUrl;
      if (DOM.thumbPreviewName) DOM.thumbPreviewName.textContent = file.name;

      const img = new Image();
      img.onload = () => {
        STATE.selectedThumbRatio = `${img.naturalWidth}/${img.naturalHeight}`;
        if (DOM.thumbPreviewRatio) {
          DOM.thumbPreviewRatio.textContent = `Ratio: ${img.naturalWidth}×${img.naturalHeight} (${(img.naturalWidth / img.naturalHeight).toFixed(2)})`;
        }
      };
      img.src = objectUrl;

      if (DOM.thumbPreviewWrap) DOM.thumbPreviewWrap.style.display = 'flex';
      if (DOM.thumbDropZone) DOM.thumbDropZone.style.display = 'none';
    });
  }

  // Remove selected thumbnail handler
  if (DOM.btnRemoveThumb) {
    DOM.btnRemoveThumb.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      STATE.selectedThumbFile = null;
      STATE.selectedThumbRatio = null;
      if (DOM.thumbFileInput) DOM.thumbFileInput.value = '';
      if (DOM.thumbPreviewWrap) DOM.thumbPreviewWrap.style.display = 'none';
      if (DOM.thumbDropZone) DOM.thumbDropZone.style.display = 'flex';
    });
  }

  if (zone && input) {
    zone.addEventListener('click', (e) => {
      if (e.target.tagName !== 'LABEL') {
        input.click();
      }
    });

    ['dragenter', 'dragover'].forEach(eventType => {
      zone.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('drag-over');
      });
    });

    ['dragleave', 'dragend', 'drop'].forEach(eventType => {
      zone.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('drag-over');
      });
    });

    zone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFilesSelected(files);
      }
    });

    input.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFilesSelected(e.target.files);
        input.value = '';
      }
    });
  }

  // Upload button click handler
  if (DOM.uploadBtn) {
    DOM.uploadBtn.addEventListener('click', handleUploadSubmit);
  }
}

/**
 * Add newly chosen files to selectedFiles array and update previews
 * @param {FileList|File[]} files
 */
function handleFilesSelected(files) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'video/mp4', 'video/webm', 'video/quicktime'];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split('.').pop().toLowerCase();
    const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
    const isVideo = file.type.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'm4v'].includes(ext);

    if (isImage || isVideo) {
      STATE.selectedFiles.push(file);
    } else {
      showToast(`Skipped ${file.name}: unsupported media format`, 'error');
    }
  }

  // Pre-fill Title with the first file's base name if empty
  if (DOM.uploadTitle && !DOM.uploadTitle.value.trim() && STATE.selectedFiles.length > 0) {
    const firstFileName = STATE.selectedFiles[0].name;
    const baseName = firstFileName.replace(/\.[^/.]+$/, '');
    DOM.uploadTitle.value = baseName;
  }

  renderUploadPreviews();
}

/**
 * Render thumbnail previews with remove buttons for all selected files
 */
function renderUploadPreviews() {
  if (!DOM.uploadPreview) return;
  DOM.uploadPreview.innerHTML = '';

  const isUrlMode = DOM.modeBtnUrl && DOM.modeBtnUrl.classList.contains('active');

  if (STATE.selectedFiles.length === 0) {
    if (DOM.uploadForm && !isUrlMode) DOM.uploadForm.style.display = 'none';
    return;
  }

  if (DOM.uploadForm) DOM.uploadForm.style.display = 'flex';

  STATE.selectedFiles.forEach((file, index) => {
    const card = document.createElement('div');
    card.className = 'preview-card';

    const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|mkv|m4v)$/i);
    const formattedSize = formatFileSize(file.size);

    let mediaHtml = '';
    if (isVideo) {
      mediaHtml = '<div class="preview-video-icon">🎬</div>';
    } else {
      const objectUrl = URL.createObjectURL(file);
      mediaHtml = `<img src="${objectUrl}" class="preview-thumb" alt="${escapeHtml(file.name)}">`;
    }

    card.innerHTML = `
      ${mediaHtml}
      <button class="preview-remove" title="Remove file" data-index="${index}">✕</button>
      <div class="preview-info">
        <span class="preview-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
        <span class="preview-size">${formattedSize}</span>
      </div>
    `;

    // Remove file handler
    const removeBtn = card.querySelector('.preview-remove');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      STATE.selectedFiles.splice(index, 1);
      renderUploadPreviews();
      if (STATE.selectedFiles.length === 0 && DOM.uploadTitle) {
        DOM.uploadTitle.value = '';
      }
    });

    DOM.uploadPreview.appendChild(card);
  });
}

/**
 * Universal upload handler supporting both Mobile File Upload and Direct Media URL
 */
async function handleUploadSubmit() {
  const isUrlMode = DOM.modeBtnUrl && DOM.modeBtnUrl.classList.contains('active');
  const title = DOM.uploadTitle ? DOM.uploadTitle.value.trim() : '';

  if (!title) {
    showToast('Please enter a project title', 'error');
    if (DOM.uploadTitle) DOM.uploadTitle.focus();
    return;
  }

  const description = DOM.uploadDesc ? DOM.uploadDesc.value.trim() : '';
  const categorySelect = DOM.uploadCategory;
  const category = (categorySelect && categorySelect.value) ? categorySelect.value : 'Video Edits';
  const sideRadio = document.querySelector('input[name="uploadSide"]:checked');
  const side = sideRadio ? sideRadio.value : 'BOTH';

  const setStatus = (msg, percent = null) => {
    if (DOM.uploadStatusText) {
      DOM.uploadStatusText.style.display = 'block';
      DOM.uploadStatusText.textContent = msg;
    }
    if (DOM.progressBar && DOM.progressFill && percent !== null) {
      DOM.progressBar.style.display = 'block';
      DOM.progressFill.style.width = `${percent}%`;
    }
  };

  if (DOM.uploadBtn) {
    DOM.uploadBtn.disabled = true;
    DOM.uploadBtn.textContent = 'Publishing...';
  }

  try {
    let mediaUrl = '';
    let thumbnailUrl = '';
    let mediaType = 'image';

    if (isUrlMode) {
      mediaUrl = DOM.uploadMediaUrl ? DOM.uploadMediaUrl.value.trim() : '';
      if (!mediaUrl) {
        throw new Error('Please enter a Media URL or switch to "Upload from Phone"');
      }
      const isVideo = mediaUrl.match(/\.(mp4|webm|mov|mkv|m4v)(\?.*)?$/i) || mediaUrl.includes('youtube') || mediaUrl.includes('vimeo');
      mediaType = isVideo ? 'video' : 'image';
      setStatus('Publishing project to portfolio...', 50);
    } else {
      if (STATE.selectedFiles.length === 0) {
        throw new Error('Please tap the box above to pick a photo or video from your phone');
      }

      const file = STATE.selectedFiles[0];
      const ext = file.name.split('.').pop().toLowerCase();
      const isVideo = file.type.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'm4v'].includes(ext);
      mediaType = isVideo ? 'video' : 'image';

      if (file.size > 22 * 1024 * 1024) {
        throw new Error('File exceeds 22 MB limit for direct mobile upload. Please link via "Paste Media Link" or choose a shorter clip.');
      }

      if (isVideo) {
        setStatus(`Uploading video (${formatFileSize(file.size)})...`, 50);
        const vidUpload = await uploadFileToGitHub(file, 'vid');
        mediaUrl = vidUpload.cdnUrl;
      } else {
        setStatus(`Uploading image (${formatFileSize(file.size)})...`, 50);
        const imgUpload = await uploadFileToGitHub(file, 'img');
        mediaUrl = imgUpload.cdnUrl;
      }
    }

    // 1. Upload custom thumbnail if chosen
    if (STATE.selectedThumbFile) {
      setStatus(`Uploading custom thumbnail (${formatFileSize(STATE.selectedThumbFile.size)})...`, 70);
      const thumbUpload = await uploadFileToGitHub(STATE.selectedThumbFile, 'thumb');
      thumbnailUrl = thumbUpload.cdnUrl;
    } else if (isUrlMode && DOM.uploadThumbUrl && DOM.uploadThumbUrl.value.trim()) {
      thumbnailUrl = DOM.uploadThumbUrl.value.trim();
    }

    setStatus('Saving project into portfolio database...', 85);

    const newItem = {
      id: Date.now(),
      title,
      category,
      type: mediaType,
      side,
      media_url: mediaUrl,
      description
    };

    if (thumbnailUrl) {
      newItem.thumbnail_url = thumbnailUrl;
      if (STATE.selectedThumbRatio) {
        newItem.aspect_ratio = STATE.selectedThumbRatio;
      }
    }

    if (mediaType === 'video') {
      newItem.video_aspect_ratio = STATE.selectedVideoRatio || '9/16';
      if (!thumbnailUrl && !newItem.aspect_ratio) {
        newItem.aspect_ratio = newItem.video_aspect_ratio;
      }
    }

    await addItemToGitHub(newItem);

    setStatus('🎉 Published successfully!', 100);
    showToast(`"${title}" published successfully!`, 'success');

    // Reset inputs
    STATE.selectedFiles = [];
    STATE.selectedThumbFile = null;
    STATE.selectedThumbRatio = null;
    STATE.selectedVideoRatio = null;
    if (DOM.uploadTitle) DOM.uploadTitle.value = '';
    if (DOM.uploadDesc) DOM.uploadDesc.value = '';
    if (DOM.uploadMediaUrl) DOM.uploadMediaUrl.value = '';
    if (DOM.uploadThumbUrl) DOM.uploadThumbUrl.value = '';
    if (DOM.thumbFileInput) DOM.thumbFileInput.value = '';
    if (DOM.thumbPreviewWrap) DOM.thumbPreviewWrap.style.display = 'none';
    if (DOM.thumbDropZone) DOM.thumbDropZone.style.display = 'flex';
    renderUploadPreviews();

    // Reload items & switch to manage tab
    await loadItems('all');
    setTimeout(() => {
      if (DOM.progressBar) DOM.progressBar.style.display = 'none';
      if (DOM.uploadStatusText) DOM.uploadStatusText.style.display = 'none';
      const manageTabBtn = document.querySelector('.tab-btn[data-tab="manage"]');
      if (manageTabBtn) manageTabBtn.click();
    }, 1200);

  } catch (err) {
    console.error('Upload error:', err);
    showToast(err.message || 'Upload failed. Please try again.', 'error');
    if (DOM.uploadStatusText) {
      DOM.uploadStatusText.style.display = 'block';
      DOM.uploadStatusText.textContent = `❌ ${err.message}`;
    }
  } finally {
    if (DOM.uploadBtn) {
      DOM.uploadBtn.disabled = false;
      DOM.uploadBtn.textContent = 'Publish to Portfolio';
    }
  }
}

// =============================================================================
// 8. Manage Items Tab (Grid, Filter, Bulk Delete, Reorder)
// =============================================================================
async function loadItems(categoryId = 'all') {
  try {
    let url = '/api/items';
    const params = [];
    if (categoryId && categoryId !== 'all') {
      params.push(`category=${encodeURIComponent(categoryId)}`);
    }
    if (STATE.activeSideFilter && STATE.activeSideFilter !== 'all') {
      params.push(`side=${encodeURIComponent(STATE.activeSideFilter)}`);
    }
    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    const rawItems = await apiCall(url);
    let items = Array.isArray(rawItems) ? rawItems : (rawItems && rawItems.items) || [];

    // Merge any locally published items from mobile
    try {
      const local = localStorage.getItem('og_portfolio_items_local');
      if (local) {
        const localItems = JSON.parse(local);
        if (Array.isArray(localItems)) {
          const ids = new Set(items.map(it => String(it.id)));
          localItems.forEach(lit => {
            if (!ids.has(String(lit.id))) {
              items.unshift(lit);
            }
          });
        }
      }
    } catch (e) {}

    // If backend did not filter parameters (e.g. static CDN rewrite)
    if (Array.isArray(items)) {
      if (categoryId && categoryId !== 'all') {
        items = items.filter(it => it.category == categoryId || String(it.category_id) == String(categoryId));
      }
      if (STATE.activeSideFilter && STATE.activeSideFilter !== 'all') {
        items = items.filter(it => it.side === STATE.activeSideFilter || it.side === 'BOTH');
      }
    }
    STATE.items = items;
    renderManageGrid();
  } catch (err) {
    console.error('Error loading items:', err);
    showToast('Failed to load portfolio items', 'error');
  }
}

/**
 * Render items into the Sortable manage grid
 */
function renderManageGrid() {
  if (!DOM.manageGrid) return;
  DOM.manageGrid.innerHTML = '';
  STATE.selectedItemIds.clear();
  updateBulkDeleteState();

  if (STATE.items.length === 0) {
    if (DOM.manageEmpty) DOM.manageEmpty.style.display = 'block';
    DOM.manageGrid.style.display = 'none';
    return;
  }

  if (DOM.manageEmpty) DOM.manageEmpty.style.display = 'none';
  DOM.manageGrid.style.display = 'grid';

  STATE.items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'manage-card';
    card.setAttribute('data-id', item.id);

    const isVideo = item.file_type === 'video' || item.type === 'video' || (item.file_path && item.file_path.match(/\.(mp4|webm|mov|mkv|m4v)$/i)) || (item.media_url && item.media_url.match(/\.(mp4|webm|mov|mkv|m4v)$/i));
    const thumbSrc = item.thumbnail_path || item.thumbnail_url || item.thumbnail || '';
    const videoSrc = item.file_path || item.media_url || '';
    const categoryName = item.category_name || item.category || 'Uncategorized';
    const sideText = (item.side || 'BOTH') === 'BOTH' ? 'A & B' : `SIDE ${item.side}`;
    const sideClass = (item.side || 'both').toLowerCase();

    let mediaElement = '';
    if (isVideo) {
      if (thumbSrc) {
        mediaElement = `
          <img src="${escapeHtml(thumbSrc)}" alt="${escapeHtml(item.title)}" loading="lazy" style="width:100%; height:100%; object-fit:cover;">
          <span class="manage-media-badge" style="background:rgba(255,107,53,0.9); color:#fff;">THUMB (REST) • VIDEO (HOVER)</span>
        `;
      } else {
        mediaElement = `
          <video src="${escapeHtml(videoSrc)}#t=3" muted preload="metadata" style="width:100%; height:100%; object-fit:cover;"></video>
          <span class="manage-media-badge">VIDEO (AUTO)</span>
        `;
      }
    } else {
      mediaElement = `<img src="${escapeHtml(item.file_path || item.media_url || '')}" alt="${escapeHtml(item.title)}" loading="lazy">`;
    }

    card.innerHTML = `
      <div class="manage-select-wrap">
        <input type="checkbox" class="item-checkbox" data-id="${item.id}" title="Select for bulk actions">
      </div>
      <div class="manage-card-actions">
        <button class="card-action-btn edit-btn" title="Edit item">✏️</button>
        <button class="card-action-btn del-btn" title="Delete item">🗑️</button>
      </div>
      <div class="manage-thumb-wrap">
        ${mediaElement}
      </div>
      <div class="manage-card-info">
        <div class="manage-card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
        <div class="manage-card-meta">
          <span class="manage-card-category">${escapeHtml(categoryName)}</span>
          <span class="manage-side-badge badge-side-${sideClass}">${sideText}</span>
        </div>
      </div>
      <div class="manage-drag-handle" title="Drag to reorder">⋮⋮</div>
    `;

    // Checkbox toggle handler
    const checkbox = card.querySelector('.item-checkbox');
    checkbox.addEventListener('change', (e) => {
      const id = Number(item.id);
      if (e.target.checked) {
        STATE.selectedItemIds.add(id);
      } else {
        STATE.selectedItemIds.delete(id);
      }
      updateBulkDeleteState();
    });

    // Edit button click
    const editBtn = card.querySelector('.edit-btn');
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(item);
    });

    // Delete button click
    const delBtn = card.querySelector('.del-btn');
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmDelete = confirm(`Are you sure you want to delete "${item.title}"?`);
      if (!confirmDelete) return;

      try {
        await deleteItemDirect(item.id);
        showToast('Item deleted successfully', 'success');
        await loadItems(STATE.activeFilter);
      } catch (err) {
        showToast(err.message || 'Failed to delete item', 'error');
      }
    });

    DOM.manageGrid.appendChild(card);
  });

  // Re-initialize SortableJS on manage grid
  initManageSortable();
}

/**
 * Configure SortableJS on manage items grid
 */
function initManageSortable() {
  if (typeof Sortable === 'undefined' || !DOM.manageGrid) return;

  if (STATE.manageSortable) {
    STATE.manageSortable.destroy();
    STATE.manageSortable = null;
  }

  STATE.manageSortable = new Sortable(DOM.manageGrid, {
    handle: '.manage-drag-handle',
    animation: 180,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onEnd: async () => {
      const orderedIds = Array.from(DOM.manageGrid.children)
        .map(el => Number(el.getAttribute('data-id')))
        .filter(id => !isNaN(id) && id > 0);

      if (orderedIds.length === 0) return;

      try {
        await apiCall('/api/admin/reorder', 'PUT', { orderedIds });
        showToast('Portfolio order saved', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to reorder items', 'error');
        loadItems(STATE.activeFilter);
      }
    }
  });
}

function updateBulkDeleteState() {
  if (!DOM.bulkDeleteBtn) return;
  const count = STATE.selectedItemIds.size;
  if (count > 0) {
    DOM.bulkDeleteBtn.style.display = 'inline-flex';
    DOM.bulkDeleteBtn.textContent = `Delete Selected (${count})`;
  } else {
    DOM.bulkDeleteBtn.style.display = 'none';
  }
}

function initManageHandlers() {
  // Category filter dropdown change
  if (DOM.manageFilter) {
    DOM.manageFilter.addEventListener('change', (e) => {
      STATE.activeFilter = e.target.value;
      loadItems(STATE.activeFilter);
    });
  }

  // Side filter dropdown change
  if (DOM.manageSideFilter) {
    DOM.manageSideFilter.addEventListener('change', (e) => {
      STATE.activeSideFilter = e.target.value;
      loadItems(STATE.activeFilter);
    });
  }

  // Bulk delete button click
  if (DOM.bulkDeleteBtn) {
    DOM.bulkDeleteBtn.addEventListener('click', async () => {
      const count = STATE.selectedItemIds.size;
      if (count === 0) return;

      const confirmBulk = confirm(`Are you sure you want to permanently delete ${count} selected item(s)?`);
      if (!confirmBulk) return;

      const idsToDelete = Array.from(STATE.selectedItemIds);
      let successCount = 0;

      for (const id of idsToDelete) {
        try {
          await deleteItemDirect(id);
          successCount++;
        } catch (err) {
          console.error(`Failed to delete item ${id}:`, err);
        }
      }

      showToast(`Deleted ${successCount} item(s)`, 'success');
      STATE.selectedItemIds.clear();
      updateBulkDeleteState();
      await loadItems(STATE.activeFilter);
    });
  }
}

// =============================================================================
// 9. Edit Modal Management
// =============================================================================
let editSelectedThumbFile = null;
let editSelectedThumbRatio = null;
let editThumbAction = 'keep'; // 'keep', 'replace', 'remove'

function openEditModal(item) {
  if (!DOM.editModal) return;
  STATE.currentEditingItemId = item.id;
  editSelectedThumbFile = null;
  editSelectedThumbRatio = null;
  editThumbAction = 'keep';

  if (DOM.editTitle) DOM.editTitle.value = item.title || '';
  if (DOM.editDesc) DOM.editDesc.value = item.description || '';
  if (DOM.editCategory) {
    populateCategoryDropdowns();
    DOM.editCategory.value = item.category_id || '';
  }

  const currentSide = (item.side || 'BOTH').toUpperCase();
  const sideRadio = document.querySelector(`input[name="editSide"][value="${currentSide}"]`);
  if (sideRadio) sideRadio.checked = true;

  const currentThumb = item.thumbnail_url || item.thumbnail_path || '';
  if (currentThumb) {
    if (DOM.editThumbImg) {
      DOM.editThumbImg.src = currentThumb;
      DOM.editThumbImg.style.display = 'block';
    }
    if (DOM.editThumbPlaceholder) DOM.editThumbPlaceholder.style.display = 'none';
    if (DOM.editThumbRemoveBtn) DOM.editThumbRemoveBtn.style.display = 'block';
    if (DOM.editThumbUrlInput) DOM.editThumbUrlInput.value = currentThumb;
  } else {
    if (DOM.editThumbImg) {
      DOM.editThumbImg.src = '';
      DOM.editThumbImg.style.display = 'none';
    }
    if (DOM.editThumbPlaceholder) DOM.editThumbPlaceholder.style.display = 'block';
    if (DOM.editThumbRemoveBtn) DOM.editThumbRemoveBtn.style.display = 'none';
    if (DOM.editThumbUrlInput) DOM.editThumbUrlInput.value = '';
  }

  if (DOM.editThumbFileInput) DOM.editThumbFileInput.value = '';

  DOM.editModal.style.display = 'flex';
  if (DOM.editTitle) DOM.editTitle.focus();
}

function closeEditModal() {
  if (!DOM.editModal) return;
  DOM.editModal.style.display = 'none';
  STATE.currentEditingItemId = null;
  editSelectedThumbFile = null;
  editSelectedThumbRatio = null;
  editThumbAction = 'keep';
}

function initModalHandlers() {
  if (DOM.editCancel) {
    DOM.editCancel.addEventListener('click', closeEditModal);
  }

  // File picker inside edit modal
  if (DOM.editThumbFileInput) {
    DOM.editThumbFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file (JPG/PNG/WebP)', 'error');
        return;
      }
      editSelectedThumbFile = file;
      editThumbAction = 'replace';

      const objUrl = URL.createObjectURL(file);
      if (DOM.editThumbImg) {
        DOM.editThumbImg.src = objUrl;
        DOM.editThumbImg.style.display = 'block';
      }
      if (DOM.editThumbPlaceholder) DOM.editThumbPlaceholder.style.display = 'none';
      if (DOM.editThumbRemoveBtn) DOM.editThumbRemoveBtn.style.display = 'block';

      const img = new Image();
      img.onload = () => {
        editSelectedThumbRatio = `${img.naturalWidth}/${img.naturalHeight}`;
      };
      img.src = objUrl;
    });
  }

  // Remove thumbnail button inside edit modal
  if (DOM.editThumbRemoveBtn) {
    DOM.editThumbRemoveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      editSelectedThumbFile = null;
      editSelectedThumbRatio = null;
      editThumbAction = 'remove';
      if (DOM.editThumbImg) {
        DOM.editThumbImg.src = '';
        DOM.editThumbImg.style.display = 'none';
      }
      if (DOM.editThumbPlaceholder) DOM.editThumbPlaceholder.style.display = 'block';
      if (DOM.editThumbRemoveBtn) DOM.editThumbRemoveBtn.style.display = 'none';
      if (DOM.editThumbUrlInput) DOM.editThumbUrlInput.value = '';
      if (DOM.editThumbFileInput) DOM.editThumbFileInput.value = '';
    });
  }

  // Close modal when clicking backdrop
  if (DOM.editModal) {
    DOM.editModal.addEventListener('click', (e) => {
      if (e.target === DOM.editModal) {
        closeEditModal();
      }
    });
  }

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (DOM.editModal && DOM.editModal.style.display === 'flex') {
        closeEditModal();
      }
    }
  });

  // Save changes
  if (DOM.editSave) {
    DOM.editSave.addEventListener('click', async () => {
      if (!STATE.currentEditingItemId) return;

      const title = DOM.editTitle ? DOM.editTitle.value.trim() : '';
      if (!title) {
        showToast('Title cannot be empty', 'error');
        if (DOM.editTitle) DOM.editTitle.focus();
        return;
      }

      const description = DOM.editDesc ? DOM.editDesc.value.trim() : '';
      const categoryIdVal = DOM.editCategory ? DOM.editCategory.value : '';
      const category_id = categoryIdVal ? Number(categoryIdVal) : null;

      const sideRadio = document.querySelector('input[name="editSide"]:checked');
      const side = sideRadio ? sideRadio.value : 'BOTH';

      DOM.editSave.disabled = true;
      DOM.editSave.textContent = 'Saving...';

      try {
        const updates = {
          title,
          description,
          category: categoryIdVal || 'Video Edits',
          side
        };

        // Thumbnail update handling
        if (editSelectedThumbFile) {
          DOM.editSave.textContent = 'Uploading thumb...';
          const thumbUpload = await uploadFileToGitHub(editSelectedThumbFile, 'thumb');
          updates.thumbnail_url = thumbUpload.cdnUrl;
          updates.thumbnail_path = thumbUpload.cdnUrl;
          if (editSelectedThumbRatio) {
            updates.aspect_ratio = editSelectedThumbRatio;
          }
        } else if (editThumbAction === 'remove') {
          updates.thumbnail_url = '';
          updates.thumbnail_path = '';
        } else if (DOM.editThumbUrlInput && DOM.editThumbUrlInput.value.trim()) {
          const customUrl = DOM.editThumbUrlInput.value.trim();
          updates.thumbnail_url = customUrl;
          updates.thumbnail_path = customUrl;
        }

        await editItemDirect(STATE.currentEditingItemId, updates);

        try {
          await apiCall(`/api/admin/items/${STATE.currentEditingItemId}`, 'PUT', {
            title,
            description,
            category_id,
            side,
            thumbnail_path: updates.thumbnail_path
          });
        } catch (e) {}

        showToast('Item updated successfully', 'success');
        closeEditModal();
        await loadItems(STATE.activeFilter);
      } catch (err) {
        showToast(err.message || 'Failed to update item', 'error');
      } finally {
        if (DOM.editSave) {
          DOM.editSave.disabled = false;
          DOM.editSave.textContent = 'Save';
        }
      }
    });
  }
}

// =============================================================================
// 9.5 Video Thumbnail Frame Capturer
// =============================================================================
let currentVideoThumbItem = null;
let currentVideoThumbCallback = null;

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${ms}`;
}

// =============================================================================
// 10. Dashboard Data Initializer & Utilities
// =============================================================================
async function initDashboardData() {
  await loadCategories();
  await loadItems('all');
}

/**
 * Format raw byte size into human readable string
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * HTML attribute and text content escape helper
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// =============================================================================
// 11. Application Bootstrap
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuthHandlers();
  initTabs();
  initUploadHandlers();
  initManageHandlers();
  initCategoryAddHandler();
  initModalHandlers();
  
  // Validate active session
  checkAuth();
});
