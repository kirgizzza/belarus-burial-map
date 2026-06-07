// admin.js — админка с сохранением в Supabase

(function () {
  let burialsState = [];
  let selectedId = null;
  let map = null;
  let pointMarker = null;

  const loginPanel = document.getElementById("login-panel");
  const adminApp = document.getElementById("admin-app");
  const loginForm = document.getElementById("login-form");
  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const loginError = document.getElementById("login-error");
  const logoutBtn = document.getElementById("logout-btn");

  const burialList = document.getElementById("burial-list");
  const mapEl = document.getElementById("admin-map");
  const form = document.getElementById("burial-form");
  const addNewButton = document.getElementById("add-new");
  const deleteButton = document.getElementById("delete-current");
  const statusEl = document.getElementById("status");

  const fields = {
    title: document.getElementById("title"),
    location: document.getElementById("location"),
    lat: document.getElementById("lat"),
    lng: document.getElementById("lng"),
    description: document.getElementById("description"),
    personsLines: document.getElementById("persons-lines"),
  };

  function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.hidden = !msg;
  }

  function showStatus(msg, isError) {
    statusEl.textContent = msg;
    if (isError) statusEl.classList.add("admin__status--error");
    else statusEl.classList.remove("admin__status--error");
    setTimeout(() => {
      if (statusEl.textContent === msg) {
        statusEl.textContent = "Готово";
        statusEl.classList.remove("admin__status--error");
      }
    }, 2500);
  }

  function showAdminUI(show) {
    loginPanel.hidden = show;
    adminApp.hidden = !show;
  }

  function getById(id) {
    return burialsState.find((i) => i.id === id) || null;
  }

  function personsToLines(persons) {
    if (!Array.isArray(persons)) return "";
    return persons.map((p) => p.name || "").filter((n) => n.trim()).join("\n");
  }

  function linesToPersons(text) {
    return (text || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l)
      .map((name) => ({ name }));
  }

  function buildOptionLabel(item) {
    return `${item.title || "Без названия"} (${item.location || "?"})`;
  }

  function initMap() {
    if (map) return;
    map = L.map(mapEl).setView([53.7, 27.9], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    map.on("click", (e) => {
      fields.lat.value = e.latlng.lat.toFixed(6);
      fields.lng.value = e.latlng.lng.toFixed(6);
      setMapPoint([e.latlng.lat, e.latlng.lng], true);
      showStatus("Координаты выбраны", false);
    });
    setTimeout(() => map.invalidateSize(), 100);
  }

  function setMapPoint(coords, recenter) {
    if (!map || !coords || coords.length !== 2) return;
    if (pointMarker) pointMarker.setLatLng(coords);
    else pointMarker = L.marker(coords).addTo(map);
    if (recenter) map.flyTo(coords, Math.max(map.getZoom(), 10), { duration: 0.5 });
  }

  function renderBurialList() {
    burialList.innerHTML = "";
    burialsState.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "admin__list-item";
      if (item.id === selectedId) btn.classList.add("admin__list-item--active");
      btn.textContent = buildOptionLabel(item);
      btn.onclick = () => {
        selectedId = item.id;
        fillForm(getById(selectedId));
        renderBurialList();
        showStatus("Запись открыта", false);
      };
      burialList.appendChild(btn);
    });
    if (!burialsState.length) {
      selectedId = null;
      resetForm();
    } else {
      if (!getById(selectedId)) selectedId = burialsState[0].id;
      fillForm(getById(selectedId));
    }
  }

  function resetForm() {
    fields.title.value = "";
    fields.location.value = "";
    fields.lat.value = "";
    fields.lng.value = "";
    fields.description.value = "";
    fields.personsLines.value = "";
    if (pointMarker && map) {
      map.removeLayer(pointMarker);
      pointMarker = null;
    }
  }

  function fillForm(item) {
    if (!item) return resetForm();
    fields.title.value = item.title || "";
    fields.location.value = item.location || "";
    fields.lat.value = item.coordinates?.[0] ?? "";
    fields.lng.value = item.coordinates?.[1] ?? "";
    fields.description.value = item.description || "";
    fields.personsLines.value = personsToLines(item.persons);
    if (item.coordinates) setMapPoint(item.coordinates, true);
  }

  function readFormData() {
    const lat = parseFloat(fields.lat.value);
    const lng = parseFloat(fields.lng.value);
    if (isNaN(lat) || isNaN(lng)) throw new Error("Координаты должны быть числами");
    return {
      title: fields.title.value.trim(),
      location: fields.location.value.trim(),
      coordinates: [lat, lng],
      description: fields.description.value.trim(),
      persons: linesToPersons(fields.personsLines.value),
    };
  }

  async function loadBurials() {
    burialsState = await window.BurialDB.fetchBurials();
    renderBurialList();
  }

  async function saveCurrent() {
    try {
      const data = readFormData();
      if (!data.title) throw new Error("Укажите название");
      if (!data.location) throw new Error("Укажите локацию");

      if (selectedId === null) {
        const created = await window.BurialDB.insertBurial(data);
        selectedId = created.id;
        showStatus("Запись создана", false);
      } else {
        await window.BurialDB.updateBurial(selectedId, data);
        showStatus("Сохранено", false);
      }
      await loadBurials();
    } catch (err) {
      showStatus(err.message || "Ошибка сохранения", true);
    }
  }

  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    showLoginError("");
    try {
      if (!window.BurialDB.isConfigured()) {
        throw new Error("Настройте public/config.js");
      }
      await window.BurialDB.signIn(loginEmail.value.trim(), loginPassword.value);
      await startAdmin();
    } catch (err) {
      showLoginError(err.message || "Неверный email или пароль");
    }
  };

  logoutBtn.onclick = async () => {
    try {
      await window.BurialDB.signOut();
      showAdminUI(false);
      loginPassword.value = "";
    } catch (err) {
      showStatus(err.message, true);
    }
  };

  addNewButton.onclick = async () => {
    try {
      const created = await window.BurialDB.insertBurial({
        title: "Новое захоронение",
        location: "Укажите локацию",
        coordinates: [53.7, 27.9],
        description: "",
        persons: [],
      });
      selectedId = created.id;
      await loadBurials();
      showStatus("Новая запись создана", false);
    } catch (err) {
      showStatus(err.message || "Ошибка создания", true);
    }
  };

  deleteButton.onclick = async () => {
    if (selectedId === null) return;
    if (!confirm("Удалить эту запись?")) return;
    try {
      await window.BurialDB.deleteBurial(selectedId);
      selectedId = null;
      await loadBurials();
      showStatus("Запись удалена", false);
    } catch (err) {
      showStatus(err.message || "Ошибка удаления", true);
    }
  };

  form.onsubmit = (e) => {
    e.preventDefault();
    saveCurrent();
  };

  async function startAdmin() {
    showAdminUI(true);
    initMap();
    try {
      await loadBurials();
      showStatus("Данные загружены", false);
    } catch (err) {
      showStatus(err.message || "Не удалось загрузить данные", true);
    }
  }

  async function init() {
    if (!window.BurialDB.isConfigured()) {
      showLoginError("Настройте public/config.js — см. SETUP.md");
      return;
    }
    try {
      const session = await window.BurialDB.getSession();
      if (session) await startAdmin();
    } catch (err) {
      showLoginError(err.message);
    }
  }

  init();
})();
