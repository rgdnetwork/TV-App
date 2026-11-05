(() => {
  // src/state.js
  var STORAGE_KEYS = {
    favorites: "tv-favorites",
    customChannels: "tv-custom-channels"
  };
  var PAGE_SIZE = 120;
  var state = {
    favorites: [],
    customChannels: [],
    allChannels: [],
    currentCategory: "all",
    searchQuery: "",
    currentView: "grid",
    editMode: false,
    editChannelMode: false,
    channelToDelete: null,
    channelToEditIndex: -1,
    filteredChannels: [],
    renderedCount: 0
  };

  // src/utils.js
  function normalizeText(value) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }
  function debounce(fn, wait = 200) {
    let timeoutId;
    function debounced(...args) {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => fn.apply(this, args), wait);
    }
    debounced.cancel = () => window.clearTimeout(timeoutId);
    return debounced;
  }
  function formatChannelCount(count) {
    return `${count} canal${count === 1 ? "" : "es"}`;
  }
  function matchesSearch(channel, query) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return true;
    return normalizeText(channel.name).includes(normalizedQuery) || normalizeText(channel.group || "General").includes(normalizedQuery);
  }

  // src/categories.js
  function renderCategories() {
    const categoryList = document.getElementById("categoryList");
    const dynamicItems = categoryList.querySelectorAll(
      '.nav-item:not([data-category="all"]):not([data-category="favorites"])'
    );
    dynamicItems.forEach((item) => item.remove());
    const groups = ["all", "favorites"];
    state.allChannels.forEach((channel) => {
      if (channel.group && !groups.includes(channel.group)) {
        groups.push(channel.group);
      }
    });
    groups.slice(2).forEach((group) => {
      const count = state.allChannels.filter((channel) => channel.group === group).length;
      const item = document.createElement("li");
      item.className = "nav-item";
      item.dataset.category = group;
      const icon = document.createElement("i");
      icon.className = "bi bi-folder-fill";
      const label = document.createElement("span");
      label.textContent = group;
      const badge = document.createElement("span");
      badge.className = "nav-count";
      badge.textContent = String(count);
      item.append(icon, label, badge);
      categoryList.appendChild(item);
    });
    document.getElementById("count-all").textContent = String(state.allChannels.length);
    document.getElementById("count-favorites").textContent = String(state.favorites.length);
    updateActiveCategory();
  }
  function updateActiveCategory() {
    document.querySelectorAll(".nav-item").forEach((item) => {
      const isActive = item.dataset.category === state.currentCategory;
      item.classList.toggle("active", isActive);
      if (isActive) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }
  function updatePageTitle() {
    const pageTitle = document.getElementById("pageTitle");
    if (state.currentCategory === "all") {
      pageTitle.textContent = "Todos los canales";
    } else if (state.currentCategory === "favorites") {
      pageTitle.textContent = "Favoritos";
    } else {
      pageTitle.textContent = state.currentCategory;
    }
  }
  function getFilteredChannels() {
    let filtered = state.allChannels;
    if (state.currentCategory === "favorites") {
      filtered = filtered.filter((channel) => state.favorites.includes(channel.id));
    } else if (state.currentCategory !== "all") {
      filtered = filtered.filter((channel) => channel.group === state.currentCategory);
    }
    if (state.searchQuery) {
      filtered = filtered.filter((channel) => matchesSearch(channel, state.searchQuery));
    }
    return filtered;
  }

  // src/storage.js
  function readJsonArray(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  function getBuiltinChannels() {
    return typeof channels !== "undefined" && Array.isArray(channels) ? channels : [];
  }
  function loadChannels() {
    state.allChannels = [...getBuiltinChannels(), ...state.customChannels];
  }
  function loadState() {
    state.favorites = readJsonArray(STORAGE_KEYS.favorites);
    state.customChannels = readJsonArray(STORAGE_KEYS.customChannels);
    loadChannels();
  }
  function saveCustomChannels() {
    localStorage.setItem(STORAGE_KEYS.customChannels, JSON.stringify(state.customChannels));
    loadChannels();
  }
  function saveFavorites() {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(state.favorites));
  }
  function buildBackup() {
    return {
      favorites: state.favorites,
      customChannels: state.customChannels,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  function downloadBackup() {
    const json = JSON.stringify(buildBackup(), null, 2);
    if (window.TVApp && typeof window.TVApp.exportBackup === "function") {
      window.TVApp.exportBackup(json);
      return;
    }
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tv-app-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  function importBackup(data) {
    if (Array.isArray(data.favorites)) {
      state.favorites = data.favorites;
      saveFavorites();
    }
    if (Array.isArray(data.customChannels)) {
      state.customChannels = data.customChannels;
      saveCustomChannels();
    }
    loadState();
  }

  // src/ui.js
  function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;
    container.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add("toast-hide");
      window.setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // src/channels-view.js
  var loadObserver = null;
  function setupChannelGrid() {
    const grid = document.getElementById("channelsGrid");
    grid.addEventListener("click", handleGridClick);
    setupInfiniteScroll();
  }
  function setupInfiniteScroll() {
    const sentinel = document.getElementById("loadMoreSentinel");
    const root = document.querySelector(".content");
    if (!sentinel || !("IntersectionObserver" in window)) return;
    loadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadNextBatch();
        }
      },
      { root, rootMargin: "400px 0px" }
    );
  }
  function observeSentinel() {
    const sentinel = document.getElementById("loadMoreSentinel");
    if (!loadObserver || !sentinel) return;
    loadObserver.unobserve(sentinel);
    if (state.renderedCount < state.filteredChannels.length) {
      sentinel.hidden = false;
      loadObserver.observe(sentinel);
    } else {
      sentinel.hidden = true;
    }
  }
  function appendBatch() {
    const grid = document.getElementById("channelsGrid");
    const start = state.renderedCount;
    const end = Math.min(start + PAGE_SIZE, state.filteredChannels.length);
    const fragment = document.createDocumentFragment();
    for (let index = start; index < end; index += 1) {
      fragment.appendChild(createChannelCard(state.filteredChannels[index], index));
    }
    grid.appendChild(fragment);
    state.renderedCount = end;
  }
  function loadNextBatch() {
    appendBatch();
    if (!loadObserver) {
      while (state.renderedCount < state.filteredChannels.length) {
        appendBatch();
      }
      return;
    }
    observeSentinel();
  }
  function renderChannels() {
    const grid = document.getElementById("channelsGrid");
    const emptyState = document.getElementById("emptyState");
    const channelCount = document.getElementById("channelCount");
    const sentinel = document.getElementById("loadMoreSentinel");
    state.filteredChannels = getFilteredChannels();
    state.renderedCount = 0;
    channelCount.textContent = formatChannelCount(state.filteredChannels.length);
    grid.innerHTML = "";
    if (state.filteredChannels.length === 0) {
      emptyState.style.display = "block";
      grid.style.display = "none";
      if (loadObserver && sentinel) {
        loadObserver.unobserve(sentinel);
        sentinel.hidden = true;
      }
      return;
    }
    emptyState.style.display = "none";
    grid.style.display = "grid";
    if (sentinel) sentinel.hidden = false;
    loadNextBatch();
  }
  function createChannelCard(channel, index) {
    const card = document.createElement("div");
    card.className = state.editMode || state.editChannelMode ? "channel-card deletable" : "channel-card";
    card.dataset.index = String(index);
    const isFavorite = state.favorites.includes(channel.id);
    if (!state.editMode) {
      const favoriteButton = document.createElement("button");
      favoriteButton.type = "button";
      favoriteButton.className = `favorite-btn${isFavorite ? " active" : ""}`;
      favoriteButton.dataset.action = "favorite";
      favoriteButton.dataset.index = String(index);
      favoriteButton.dataset.channelId = channel.id;
      favoriteButton.setAttribute("aria-pressed", String(isFavorite));
      favoriteButton.setAttribute("aria-label", isFavorite ? "Quitar de favoritos" : "A\xF1adir a favoritos");
      favoriteButton.title = isFavorite ? "Quitar de favoritos" : "A\xF1adir a favoritos";
      const heart = document.createElement("i");
      heart.className = isFavorite ? "bi bi-heart-fill" : "bi bi-heart";
      favoriteButton.appendChild(heart);
      card.appendChild(favoriteButton);
    }
    const logoContainer = document.createElement("div");
    logoContainer.className = "channel-logo";
    const placeholder = document.createElement("div");
    placeholder.className = "channel-logo-placeholder";
    placeholder.style.display = channel.logo ? "none" : "flex";
    const placeholderIcon = document.createElement("i");
    placeholderIcon.className = "bi bi-tv";
    placeholder.appendChild(placeholderIcon);
    logoContainer.appendChild(placeholder);
    if (channel.logo) {
      const image = document.createElement("img");
      image.src = channel.logo;
      image.alt = channel.name;
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener(
        "error",
        () => {
          image.style.display = "none";
          placeholder.style.display = "flex";
        },
        { once: true }
      );
      logoContainer.insertBefore(image, placeholder);
    }
    const info = document.createElement("div");
    info.className = "channel-info";
    const name = document.createElement("div");
    name.className = "channel-name";
    name.title = channel.name;
    name.textContent = channel.name;
    const meta = document.createElement("div");
    meta.className = "channel-meta";
    const group = document.createElement("span");
    group.className = "channel-group";
    group.textContent = channel.group || "General";
    const actionIcon = document.createElement("i");
    const iconSize = "16px";
    if (state.editMode) {
      actionIcon.className = "bi bi-trash";
      actionIcon.style.color = "#dc2626";
      actionIcon.style.fontSize = iconSize;
    } else if (state.editChannelMode) {
      actionIcon.className = "bi bi-pencil";
      actionIcon.style.color = "#2563eb";
      actionIcon.style.fontSize = iconSize;
    } else {
      actionIcon.className = "bi bi-play-circle-fill";
      actionIcon.style.color = "var(--accent)";
      actionIcon.style.fontSize = iconSize;
    }
    meta.append(group, actionIcon);
    info.append(name, meta);
    card.append(logoContainer, info);
    return card;
  }
  function handleGridClick(event) {
    const favoriteButton = event.target.closest(".favorite-btn");
    if (favoriteButton) {
      event.stopPropagation();
      const channel2 = state.filteredChannels[Number(favoriteButton.dataset.index)];
      if (channel2) {
        toggleFavorite(channel2);
      }
      return;
    }
    const card = event.target.closest(".channel-card");
    if (!card) return;
    const channel = state.filteredChannels[Number(card.dataset.index)];
    if (!channel) return;
    if (state.editMode) {
      state.channelToDelete = channel;
      document.getElementById("deleteChannelName").textContent = channel.name;
      document.getElementById("deleteModal").classList.add("active");
      return;
    }
    if (state.editChannelMode) {
      const customIndex = state.customChannels.findIndex(
        (item) => item.id === channel.id && item.name === channel.name
      );
      if (customIndex < 0) {
        showToast("Solo se pueden editar canales personalizados", "error");
        return;
      }
      state.channelToEditIndex = customIndex;
      document.getElementById("editChannelName").value = channel.name;
      document.getElementById("editChannelId").value = channel.id;
      document.getElementById("editChannelGroup").value = channel.group || "";
      document.getElementById("editChannelLogo").value = channel.logo || "";
      document.getElementById("editModal").classList.add("active");
      return;
    }
    openChannel(channel.id);
  }
  function toggleFavorite(channel) {
    const index = state.favorites.indexOf(channel.id);
    if (index > -1) {
      state.favorites.splice(index, 1);
    } else {
      state.favorites.push(channel.id);
    }
    saveFavorites();
    const isFavorite = state.favorites.includes(channel.id);
    document.querySelectorAll(".favorite-btn").forEach((candidate) => {
      if (candidate.dataset.channelId !== channel.id) return;
      candidate.classList.toggle("active", isFavorite);
      candidate.setAttribute("aria-pressed", String(isFavorite));
      candidate.setAttribute("aria-label", isFavorite ? "Quitar de favoritos" : "A\xF1adir a favoritos");
      candidate.title = isFavorite ? "Quitar de favoritos" : "A\xF1adir a favoritos";
      const icon = candidate.querySelector("i");
      if (icon) {
        icon.className = isFavorite ? "bi bi-heart-fill" : "bi bi-heart";
      }
    });
    document.getElementById("count-favorites").textContent = String(state.favorites.length);
    if (state.currentCategory === "favorites") {
      renderChannels();
    }
  }
  function openChannel(id) {
    window.location.href = `acestream://${id}`;
  }

  // src/modals.js
  function setupModalListeners() {
    setupAddModal();
    setupDeleteModal();
    setupEditModal();
    setupEditModes();
    setupImportExport();
  }
  function setupAddModal() {
    const modal = document.getElementById("addModal");
    const backdrop = document.getElementById("modalBackdrop");
    const closeButton = document.getElementById("modalClose");
    const cancelButton = document.getElementById("cancelBtn");
    const saveButton = document.getElementById("saveBtn");
    const nameInput = document.getElementById("channelName");
    const idInput = document.getElementById("channelId");
    const groupInput = document.getElementById("channelGroup");
    const logoInput = document.getElementById("channelLogo");
    const close = () => {
      modal.classList.remove("active");
      [nameInput, idInput, groupInput, logoInput].forEach((input) => {
        input.value = "";
      });
    };
    document.getElementById("addChannelBtn").addEventListener("click", () => {
      if (state.editMode) return;
      modal.classList.add("active");
      nameInput.focus();
    });
    backdrop.addEventListener("click", close);
    closeButton.addEventListener("click", close);
    cancelButton.addEventListener("click", close);
    saveButton.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const id = idInput.value.trim();
      const group = groupInput.value.trim() || "General";
      const logo = logoInput.value.trim();
      if (!name || !id) {
        showToast("Introduce al menos el nombre y el ID de AceStream", "error");
        return;
      }
      state.customChannels.push({ id, name, group, logo });
      saveCustomChannels();
      close();
      renderCategories();
      renderChannels();
      showToast("Canal a\xF1adido", "success");
    });
  }
  function setupDeleteModal() {
    const modal = document.getElementById("deleteModal");
    const backdrop = document.getElementById("deleteModalBackdrop");
    const closeButton = document.getElementById("deleteModalClose");
    const cancelButton = document.getElementById("deleteCancelBtn");
    const confirmButton = document.getElementById("deleteConfirmBtn");
    const close = () => {
      modal.classList.remove("active");
      state.channelToDelete = null;
    };
    backdrop.addEventListener("click", close);
    closeButton.addEventListener("click", close);
    cancelButton.addEventListener("click", close);
    confirmButton.addEventListener("click", () => {
      if (!state.channelToDelete) return;
      const target = state.channelToDelete;
      const previousLength = state.customChannels.length;
      state.customChannels = state.customChannels.filter(
        (channel) => channel.id !== target.id || channel.name !== target.name
      );
      const removed = state.customChannels.length !== previousLength;
      saveCustomChannels();
      close();
      renderCategories();
      renderChannels();
      showToast(
        removed ? "Canal eliminado" : "Solo se pueden eliminar canales personalizados",
        removed ? "success" : "error"
      );
    });
  }
  function setupEditModal() {
    const modal = document.getElementById("editModal");
    const backdrop = document.getElementById("editModalBackdrop");
    const closeButton = document.getElementById("editModalClose");
    const cancelButton = document.getElementById("editCancelBtn");
    const saveButton = document.getElementById("editSaveBtn");
    const nameInput = document.getElementById("editChannelName");
    const idInput = document.getElementById("editChannelId");
    const groupInput = document.getElementById("editChannelGroup");
    const logoInput = document.getElementById("editChannelLogo");
    const close = () => {
      modal.classList.remove("active");
      state.channelToEditIndex = -1;
      [nameInput, idInput, groupInput, logoInput].forEach((input) => {
        input.value = "";
      });
    };
    backdrop.addEventListener("click", close);
    closeButton.addEventListener("click", close);
    cancelButton.addEventListener("click", close);
    saveButton.addEventListener("click", () => {
      if (state.channelToEditIndex < 0 || !state.customChannels[state.channelToEditIndex]) return;
      const name = nameInput.value.trim();
      const id = idInput.value.trim();
      const group = groupInput.value.trim() || "General";
      const logo = logoInput.value.trim();
      if (!name || !id) {
        showToast("Introduce al menos el nombre y el ID de AceStream", "error");
        return;
      }
      state.customChannels[state.channelToEditIndex] = { id, name, group, logo };
      saveCustomChannels();
      close();
      renderCategories();
      renderChannels();
      showToast("Canal actualizado", "success");
    });
  }
  function setupEditModes() {
    const deleteModeButton = document.getElementById("editModeBtn");
    const editChannelButton = document.getElementById("editChannelBtn");
    const banner = document.getElementById("editBanner");
    const cancelButton = document.getElementById("cancelEditBtn");
    const setActive = (button, active, color) => {
      button.style.background = active ? color : "";
      button.style.borderColor = active ? color : "";
      button.style.color = active ? "white" : "";
      button.setAttribute("aria-pressed", String(active));
    };
    const syncModes = () => {
      setActive(deleteModeButton, state.editMode, "#dc2626");
      setActive(editChannelButton, state.editChannelMode, "#2563eb");
      banner.style.display = state.editMode ? "flex" : "none";
      renderChannels();
    };
    deleteModeButton.addEventListener("click", () => {
      state.editMode = !state.editMode;
      if (state.editMode) state.editChannelMode = false;
      syncModes();
    });
    editChannelButton.addEventListener("click", () => {
      state.editChannelMode = !state.editChannelMode;
      if (state.editChannelMode) state.editMode = false;
      syncModes();
    });
    cancelButton.addEventListener("click", () => {
      state.editMode = false;
      syncModes();
    });
  }
  function setupImportExport() {
    const exportButton = document.getElementById("exportBtn");
    const importButton = document.getElementById("importBtn");
    const importInput = document.getElementById("importInput");
    exportButton.addEventListener("click", () => {
      downloadBackup();
      showToast("Copia de seguridad generada", "success");
    });
    importButton.addEventListener("click", () => {
      importInput.click();
    });
    importInput.addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        try {
          const data = JSON.parse(loadEvent.target.result);
          if (!Array.isArray(data.favorites) && !Array.isArray(data.customChannels)) {
            throw new Error("Formato inv\xE1lido");
          }
          importBackup(data);
          renderCategories();
          renderChannels();
          showToast("Datos importados correctamente", "success");
        } catch {
          showToast("Archivo inv\xE1lido", "error");
        }
        importInput.value = "";
      };
      reader.readAsText(file);
    });
  }

  // src/pwa.js
  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (!/^https?:$/.test(window.location.protocol)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
      });
    });
  }

  // src/main.js
  function setupSidebar() {
    const categoryList = document.getElementById("categoryList");
    categoryList.addEventListener("click", (event) => {
      const item = event.target.closest(".nav-item");
      if (!item || state.editMode) return;
      state.currentCategory = item.dataset.category;
      updateActiveCategory();
      updatePageTitle();
      renderChannels();
    });
  }
  function setupSearch() {
    const searchInput = document.getElementById("searchInput");
    const applySearch = debounce((value) => {
      state.searchQuery = value;
      renderChannels();
    }, 200);
    searchInput.addEventListener("input", (event) => applySearch(event.target.value));
  }
  function setupViewToggle() {
    const button = document.getElementById("viewToggle");
    const icon = button.querySelector("i");
    button.addEventListener("click", () => {
      state.currentView = state.currentView === "grid" ? "list" : "grid";
      icon.className = state.currentView === "grid" ? "bi bi-list-ul" : "bi bi-grid-3x3-gap-fill";
      renderChannels();
    });
  }
  function init() {
    loadState();
    setupChannelGrid();
    setupModalListeners();
    setupSidebar();
    setupSearch();
    setupViewToggle();
    renderCategories();
    updatePageTitle();
    renderChannels();
    registerServiceWorker();
  }
  init();
})();
