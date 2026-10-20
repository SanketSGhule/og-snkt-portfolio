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
  selectedItemIds: new Set(),
  currentEditingItemId: null,
  activeFilter: 'all',
  activeSideFilter: 'all',
  manageSortable: null,
  categorySortable: null,
  toastTimeout: null
};

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
        await apiCall(`/api/admin/categories/${cat.id}`, 'DELETE');
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
      await apiCall('/api/admin/categories', 'POST', { name });
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
// 7. Upload Management (Drag & Drop, Preview, XHR Progress)
// =============================================================================
function initUploadHandlers() {
  const zone = DOM.uploadZone;
  const input = DOM.fileInput;

  if (!zone || !input) return;

  // Open file selector on zone click (unless clicking explicit upload-link label)
  zone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'LABEL') {
      input.click();
    }
  });

  // Drag and drop event listeners
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
      input.value = ''; // Reset input to re-trigger on subsequent selection of same file
    }
  });

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
    // Check type or extension
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

  if (STATE.selectedFiles.length === 0) {
    if (DOM.uploadForm) DOM.uploadForm.style.display = 'none';
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
 * Perform multipart upload using XMLHttpRequest to track upload progress
 */
function handleUploadSubmit() {
  if (STATE.selectedFiles.length === 0) {
    showToast('Please select at least one image or video to upload', 'error');
    return;
  }

  const title = DOM.uploadTitle ? DOM.uploadTitle.value.trim() : '';
  if (!title) {
    showToast('Title is required', 'error');
    if (DOM.uploadTitle) DOM.uploadTitle.focus();
    return;
  }

  const description = DOM.uploadDesc ? DOM.uploadDesc.value.trim() : '';
  const categoryId = DOM.uploadCategory ? DOM.uploadCategory.value : '';

  const formData = new FormData();
  STATE.selectedFiles.forEach(file => {
    formData.append('files', file);
  });
  formData.append('title', title);
  formData.append('description', description);
  if (categoryId) {
    formData.append('category_id', categoryId);
  }
  const sideRadio = document.querySelector('input[name="uploadSide"]:checked');
  const side = sideRadio ? sideRadio.value : 'BOTH';
  formData.append('side', side);

  // Setup XHR
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/admin/upload', true);

  if (DOM.progressBar && DOM.progressFill) {
    DOM.progressBar.style.display = 'block';
    DOM.progressFill.style.width = '0%';
  }

  if (DOM.uploadBtn) {
    DOM.uploadBtn.disabled = true;
    DOM.uploadBtn.textContent = 'Uploading...';
  }

  // Progress monitoring
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable && DOM.progressFill) {
      const percent = Math.round((e.loaded / e.total) * 100);
      DOM.progressFill.style.width = `${percent}%`;
    }
  });

  xhr.addEventListener('load', () => {
    if (DOM.uploadBtn) {
      DOM.uploadBtn.disabled = false;
      DOM.uploadBtn.textContent = 'Upload';
    }

    if (xhr.status >= 200 && xhr.status < 300) {
      let response = null;
      try {
        response = JSON.parse(xhr.responseText);
      } catch (e) {
        // Ignored
      }

      showToast(response && response.message ? response.message : 'Upload successful!', 'success');

      // Reset form & state
      STATE.selectedFiles = [];
      if (DOM.uploadTitle) DOM.uploadTitle.value = '';
      if (DOM.uploadDesc) DOM.uploadDesc.value = '';
      if (DOM.uploadCategory) DOM.uploadCategory.value = '';
      if (DOM.progressBar) DOM.progressBar.style.display = 'none';
      if (DOM.progressFill) DOM.progressFill.style.width = '0%';

      renderUploadPreviews();

      // Refresh items list in Manage tab in background
      loadItems(STATE.activeFilter);
    } else {
      let errorMsg = 'Upload failed';
      if (xhr.status === 404) {
        errorMsg = 'Static Mode: File uploads require the active backend. Connect via local Wi-Fi: http://10.177.27.125:3000/admin';
      } else {
        try {
          const errorJson = JSON.parse(xhr.responseText);
          errorMsg = errorJson.error || errorJson.message || errorMsg;
        } catch (e) {}
      }

      showToast(errorMsg, 'error');
      if (DOM.progressBar) DOM.progressBar.style.display = 'none';
    }
  });

  xhr.addEventListener('error', () => {
    if (DOM.uploadBtn) {
      DOM.uploadBtn.disabled = false;
      DOM.uploadBtn.textContent = 'Upload';
    }
    if (DOM.progressBar) DOM.progressBar.style.display = 'none';
    showToast('Network error during upload', 'error');
  });

  xhr.send(formData);
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
    // If backend did not filter parameters (e.g. static CDN rewrite)
    if (Array.isArray(items)) {
      if (categoryId && categoryId !== 'all') {
        items = items.filter(it => it.category == categoryId || String(it.category_id) == String(categoryId));
      }
      if (STATE.activeSideFilter && STATE.activeSideFilter !== 'all') {
        items = items.filter(it => it.side === STATE.activeSideFilter);
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

    const isVideo = item.file_type === 'video' || (item.file_path && item.file_path.match(/\.(mp4|webm|mov|mkv|m4v)$/i));
    const thumbSrc = item.thumbnail_path || item.file_path || '';
    const categoryName = item.category_name || item.category || 'Uncategorized';
    const sideText = (item.side || 'BOTH') === 'BOTH' ? 'A & B' : `SIDE ${item.side}`;
    const sideClass = (item.side || 'both').toLowerCase();

    let mediaElement = '';
    if (isVideo) {
      if (item.thumbnail_path) {
        mediaElement = `
          <img src="${escapeHtml(item.thumbnail_path)}" alt="${escapeHtml(item.title)}" loading="lazy">
          <span class="manage-media-badge">VIDEO</span>
        `;
      } else {
        mediaElement = `
          <video src="${escapeHtml(item.file_path)}" muted preload="metadata"></video>
          <span class="manage-media-badge">VIDEO</span>
        `;
      }
    } else {
      mediaElement = `<img src="${escapeHtml(thumbSrc)}" alt="${escapeHtml(item.title)}" loading="lazy">`;
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
        await apiCall(`/api/admin/items/${item.id}`, 'DELETE');
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
          await apiCall(`/api/admin/items/${id}`, 'DELETE');
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
function openEditModal(item) {
  if (!DOM.editModal) return;
  STATE.currentEditingItemId = item.id;

  if (DOM.editTitle) DOM.editTitle.value = item.title || '';
  if (DOM.editDesc) DOM.editDesc.value = item.description || '';
  if (DOM.editCategory) {
    populateCategoryDropdowns();
    DOM.editCategory.value = item.category_id || '';
  }

  const currentSide = (item.side || 'BOTH').toUpperCase();
  const sideRadio = document.querySelector(`input[name="editSide"][value="${currentSide}"]`);
  if (sideRadio) sideRadio.checked = true;

  DOM.editModal.style.display = 'flex';
  if (DOM.editTitle) DOM.editTitle.focus();
}

function closeEditModal() {
  if (!DOM.editModal) return;
  DOM.editModal.style.display = 'none';
  STATE.currentEditingItemId = null;
}

function initModalHandlers() {
  if (DOM.editCancel) {
    DOM.editCancel.addEventListener('click', closeEditModal);
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
    if (e.key === 'Escape' && DOM.editModal && DOM.editModal.style.display === 'flex') {
      closeEditModal();
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
        await apiCall(`/api/admin/items/${STATE.currentEditingItemId}`, 'PUT', {
          title,
          description,
          category_id,
          side
        });

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
