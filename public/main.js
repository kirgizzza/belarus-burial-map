// main.js — карта захоронений (данные из Supabase)

(function () {
  const belarusBounds = L.latLngBounds([51.2, 23.0], [56.2, 33.0]);

  async function loadBurials() {
    if (window.BurialDB?.isConfigured()) {
      try {
        const data = await window.BurialDB.fetchBurials();
        console.log("Загружено " + data.length + " записей из Supabase");
        return data;
      } catch (e) {
        console.error("Ошибка загрузки из Supabase:", e);
      }
    }

    if (typeof burials !== "undefined" && Array.isArray(burials) && burials.length > 0) {
      console.warn("Supabase не настроен — используются локальные данные из burials-data.js");
      return burials;
    }

    console.warn("Нет данных для отображения");
    return [];
  }

  const map = L.map("map", {
    zoomControl: true,
    minZoom: 6,
    maxBounds: belarusBounds,
    maxBoundsViscosity: 1.0,
  }).setView([53.7, 27.9], 7);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  map.zoomControl.setPosition("bottomleft");

  const infoPanel = document.getElementById("info-panel");
  const infoToggle = document.getElementById("info-toggle");
  const infoTitle = infoPanel?.querySelector(".info__title");
  const infoLocation = infoPanel?.querySelector(".info__location");
  const infoDescription = infoPanel?.querySelector(".info__description");
  const infoList = document.getElementById("info-list");
  const infoClose = document.getElementById("info-close");
  const searchInput = document.getElementById("city-search");
  const searchResults = document.getElementById("search-results");
  const personSearchInput = document.getElementById("person-search");

  let activeBurials = [];
  let currentPersons = [];
  let markers = [];

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function (m) {
      if (m === "&") return "&amp;";
      if (m === "<") return "&lt;";
      if (m === ">") return "&gt;";
      return m;
    });
  }

  function renderPersons(filter) {
    const query = (filter || "").trim().toLowerCase();
    if (!infoList) return;
    infoList.innerHTML = "";

    const source = currentPersons;
    const filtered = query
      ? source.filter((p) => (p.name || "").toLowerCase().includes(query))
      : source;

    if (!filtered.length) {
      const li = document.createElement("li");
      li.className = "info__person";
      li.innerHTML = '<div class="info__person-name">По данному запросу ничего не найдено</div>';
      infoList.appendChild(li);
      return;
    }

    filtered.forEach((person) => {
      const li = document.createElement("li");
      li.className = "info__person";
      li.innerHTML = `
        <div class="info__person-name">${escapeHtml(person.name || "Неизвестный")}</div>
        ${person.years || person.note ? `<div class="info__person-meta">${escapeHtml(person.years || "")} ${escapeHtml(person.note || "")}</div>` : ""}
      `;
      infoList.appendChild(li);
    });
  }

  function openInfo(burial) {
    if (!infoTitle || !infoLocation || !infoDescription) return;
    infoTitle.textContent = burial.title || "Воинское захоронение";
    infoLocation.textContent = burial.location || "";
    infoDescription.textContent = burial.description || "Информация уточняется.";

    currentPersons = burial.persons || [];
    if (personSearchInput) personSearchInput.value = "";
    renderPersons("");
    infoPanel?.classList.remove("info--hidden");
    infoToggle?.classList.remove("info-toggle--hidden");
  }

  function closeInfo() {
    infoPanel?.classList.add("info--hidden");
    infoToggle?.classList.add("info-toggle--hidden");
  }

  if (infoClose) infoClose.addEventListener("click", closeInfo);
  if (infoToggle) infoToggle.addEventListener("click", closeInfo);

  map.on("click", () => {
    if (!infoPanel?.classList.contains("info--hidden")) closeInfo();
    if (searchResults) {
      searchResults.classList.remove("topbar__results--visible");
      searchResults.innerHTML = "";
    }
  });

  function focusOnBurial(burial) {
    if (!burial || !burial.coordinates) return;
    map.flyTo(burial.coordinates, Math.max(map.getZoom(), 9), { duration: 0.7 });
    openInfo(burial);
  }

  function renderMarkers(burials) {
    markers.forEach((m) => map.removeLayer(m));
    markers = [];

    burials.forEach((burial) => {
      if (!burial.coordinates || burial.coordinates.length !== 2) return;

      const marker = L.marker(burial.coordinates, {
        icon: L.divIcon({
          className: "",
          html: '<div class="map-marker map-marker--pulse"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(map);

      marker.on("click", (e) => {
        e.originalEvent.stopPropagation();
        focusOnBurial(burial);
      });

      markers.push(marker);
    });

    console.log("Отображено маркеров: " + markers.length);
  }

  function setupSearch() {
    if (!searchInput || !searchResults) return;

    const getLabel = (b) => (b.title + " " + b.location).toLowerCase();

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();
      searchResults.innerHTML = "";
      if (!query) {
        searchResults.classList.remove("topbar__results--visible");
        return;
      }
      const matches = activeBurials.filter((b) => getLabel(b).includes(query)).slice(0, 8);
      if (!matches.length) {
        searchResults.classList.remove("topbar__results--visible");
        return;
      }
      matches.forEach((burial) => {
        const li = document.createElement("li");
        li.className = "topbar__result-item";
        li.innerHTML = `
          <span class="topbar__result-title">${escapeHtml(burial.title || "Воинское захоронение")}</span>
          ${burial.location ? `<span class="topbar__result-location">${escapeHtml(burial.location)}</span>` : ""}
        `;
        li.addEventListener("click", () => {
          focusOnBurial(burial);
          searchInput.value = burial.title || burial.location || "";
          searchResults.classList.remove("topbar__results--visible");
          searchResults.innerHTML = "";
        });
        searchResults.appendChild(li);
      });
      searchResults.classList.add("topbar__results--visible");
    });

    searchInput.addEventListener("blur", () => {
      setTimeout(() => searchResults.classList.remove("topbar__results--visible"), 180);
    });
  }

  if (personSearchInput) {
    personSearchInput.addEventListener("input", () => renderPersons(personSearchInput.value));
  }

  const metronome = new Audio("silent.mp3");
  metronome.loop = true;
  let soundButton = null;

  function toggleSound() {
    if (!soundButton) return;
    if (metronome.paused) {
      metronome.play().then(() => soundButton.classList.add("sound-control__button--active")).catch(() => {});
    } else {
      metronome.pause();
      soundButton.classList.remove("sound-control__button--active");
    }
  }

  const SoundControl = L.Control.extend({
    onAdd: function () {
      const container = L.DomUtil.create("div", "leaflet-bar sound-control");
      const btn = L.DomUtil.create("a", "sound-control__button", container);
      btn.href = "#";
      btn.title = "Включить/выключить звук метронома";
      btn.innerHTML = "♪";
      soundButton = btn;
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(btn, "click", (e) => {
        L.DomEvent.preventDefault(e);
        toggleSound();
      });
      return container;
    },
  });

  new SoundControl({ position: "bottomleft" }).addTo(map);

  const hero = document.getElementById("hero-splash");
  function hideHero() {
    if (!hero) return;
    hero.classList.add("hero-splash--hidden");
    setTimeout(() => hero?.parentElement?.removeChild(hero), 700);
  }
  if (hero) {
    setTimeout(hideHero, 2200);
    map.once("click", hideHero);
    map.once("movestart", hideHero);
    searchInput?.addEventListener("focus", hideHero, { once: true });
    infoToggle?.addEventListener("click", hideHero, { once: true });
  }

  setupSearch();

  loadBurials().then((burials) => {
    activeBurials = burials;
    renderMarkers(activeBurials);
  });
})();
