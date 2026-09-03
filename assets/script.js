(function () {
  "use strict";

  const state = {
    tenders: [],
    query: "",
    status: "all",
  };

  const DAY_MS = 24 * 60 * 60 * 1000;

  function computeStatus(tender) {
    if (!tender.closes) return "unknown";
    const closesDate = new Date(tender.closes);
    if (Number.isNaN(closesDate.getTime())) return tender.status || "unknown";
    const now = new Date();
    const diffDays = (closesDate - now) / DAY_MS;
    if (diffDays < 0) return "closed";
    if (diffDays <= 7) return "closing-soon";
    return "active";
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function statusLabel(status) {
    switch (status) {
      case "active": return "Active";
      case "closing-soon": return "Closing soon";
      case "closed": return "Closed";
      default: return "Unknown";
    }
  }

  function render() {
    const rowsEl = document.getElementById("tenderRows");
    const emptyEl = document.getElementById("emptyState");
    rowsEl.innerHTML = "";

    const filtered = state.tenders.filter((t) => {
      const computedStatus = computeStatus(t);
      const matchesStatus = state.status === "all" || computedStatus === state.status;
      const haystack = `${t.id} ${t.title} ${t.authority}`.toLowerCase();
      const matchesQuery = haystack.includes(state.query.toLowerCase());
      return matchesStatus && matchesQuery;
    });

    if (filtered.length === 0) {
      emptyEl.hidden = false;
    } else {
      emptyEl.hidden = true;
      filtered.forEach((t) => {
        const computedStatus = computeStatus(t);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td data-label="Status"><span class="status-dot status-dot--${computedStatus}">${statusLabel(computedStatus)}</span></td>
          <td data-label="Tender ID" class="tender-id">${escapeHtml(t.id || "—")}</td>
          <td data-label="Title / scope" class="tender-title">${escapeHtml(t.title || "—")}<br><span style="color:var(--text-muted); font-size:12.5px;">${escapeHtml(t.authority || "")}</span></td>
          <td data-label="Authority">${escapeHtml(t.authority || "—")}</td>
          <td data-label="Closes" class="tender-closes">${formatDate(t.closes)}</td>
          <td data-label="Source"><a class="tender-link" href="${escapeAttr(t.link || "#")}" target="_blank" rel="noopener">${escapeHtml(t.source || "link")}</a></td>
        `;
        rowsEl.appendChild(tr);
      });
    }

    updateCounts();
  }

  function updateCounts() {
    const active = state.tenders.filter((t) => computeStatus(t) === "active").length;
    const closingSoon = state.tenders.filter((t) => computeStatus(t) === "closing-soon").length;
    document.getElementById("countActive").textContent = active;
    document.getElementById("countClosingSoon").textContent = closingSoon;
    document.getElementById("countTotal").textContent = state.tenders.length;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }
  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }

  function init() {
    fetch("data/tenders.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load tender data");
        return res.json();
      })
      .then((data) => {
        state.tenders = data.tenders || [];
        const lastUpdatedEl = document.getElementById("lastUpdated");
        if (data.last_updated) {
          lastUpdatedEl.textContent = formatDate(data.last_updated);
        } else {
          lastUpdatedEl.textContent = "unknown";
        }
        render();
      })
      .catch((err) => {
        console.error(err);
        document.getElementById("emptyState").hidden = false;
        document.getElementById("emptyState").querySelector(".empty-state__title").textContent =
          "Couldn't load tender data.";
      });

    document.getElementById("searchInput").addEventListener("input", (e) => {
      state.query = e.target.value;
      render();
    });

    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        state.status = btn.dataset.status;
        render();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
