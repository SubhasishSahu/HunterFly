(function () {
  "use strict";
  var M = window.DroneModel;

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  function metricHtml(value, label, cls) {
    return '<div class="metric' + (cls ? " " + cls : "") + '">' +
      '<span class="metric__value">' + esc(value) + '</span>' +
      '<span class="metric__label">' + esc(label) + '</span></div>';
  }

  // ---------------- Assumptions form ----------------
  function initAssumptionsForm() {
    var a = M.loadAssumptions();
    var inputs = document.querySelectorAll("[data-key]");
    inputs.forEach(function (el) {
      var key = el.dataset.key;
      if (a.hasOwnProperty(key)) el.value = a[key];
    });

    function readForm() {
      var out = {};
      inputs.forEach(function (el) {
        var v = parseFloat(el.value);
        out[el.dataset.key] = Number.isNaN(v) ? 0 : v;
      });
      return out;
    }

    function updatePreview() {
      var current = readForm();
      var standing = M.computeStanding(current);
      document.getElementById("previewStanding").textContent = M.crLakh(standing.total);
      document.getElementById("previewOpex").textContent = M.crLakh(standing.opex.total);
      document.getElementById("previewPerDrone").textContent = M.indian(standing.opex.perDrone);
    }

    inputs.forEach(function (el) {
      el.addEventListener("input", function () {
        var current = readForm();
        M.saveAssumptions(current);
        updatePreview();
      });
    });

    var resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        M.resetAssumptions();
        var d = M.DEFAULTS;
        inputs.forEach(function (el) {
          if (d.hasOwnProperty(el.dataset.key)) el.value = d[el.dataset.key];
        });
        updatePreview();
      });
    }

    updatePreview();
  }

  // ---------------- CapEx page ----------------
  function renderCapexPage() {
    var a = M.loadAssumptions();
    var standing = M.computeStanding(a);
    var metricsEl = document.getElementById("capexMetrics");
    metricsEl.innerHTML =
      metricHtml(M.crLakh(standing.total), "Total standing cost to launch (Year-0 cash required)", "") +
      metricHtml(M.crLakh(standing.capex.subtotal), "CapEx & pre-operating subtotal", "metric--teal");

    var rowsEl = document.getElementById("capexRows");
    var html = "";
    standing.capex.items.forEach(function (item) {
      html += '<tr><td>' + esc(item.label) + '</td><td class="num">' + esc(M.indian(item.value)) + '</td><td class="note">' + esc(item.note) + '</td></tr>';
    });
    html += '<tr class="is-subtotal"><td>Subtotal: CapEx &amp; pre-operating</td><td class="num">' + esc(M.indian(standing.capex.subtotal)) + '</td><td></td></tr>';
    html += '<tr><td>Working capital buffer (' + a.wcMonths + ' months OpEx held in reserve)</td><td class="num">' + esc(M.indian(standing.wc)) + '</td><td class="note">OpEx \u00f7 12 \u00d7 buffer months</td></tr>';
    rowsEl.innerHTML = html;
  }

  // ---------------- OpEx page ----------------
  function renderOpexPage() {
    var a = M.loadAssumptions();
    var opex = M.computeOpex(a);
    var metricsEl = document.getElementById("opexMetrics");
    metricsEl.innerHTML =
      metricHtml(M.crLakh(opex.total), "Total annual OpEx", "") +
      metricHtml(M.indian(opex.perDrone), "Cost per drone per year", "metric--teal") +
      metricHtml(M.indian(opex.perService), "Cost per service event", "metric--coral");

    var rowsEl = document.getElementById("opexRows");
    var html = "";
    opex.items.forEach(function (item) {
      html += '<tr><td>' + esc(item.label) + '</td><td class="num">' + esc(M.indian(item.value)) + '</td><td class="note">' + esc(item.note) + '</td></tr>';
    });
    rowsEl.innerHTML = html;
  }

  // ---------------- Business Models page ----------------
  function renderBusinessModelsPage() {
    var a = M.loadAssumptions();
    var bm = M.loadBizModel();

    var inputEls = document.querySelectorAll("[data-bmkey]");
    inputEls.forEach(function (el) {
      var key = el.dataset.bmkey;
      if (bm.hasOwnProperty(key)) {
        el.value = key.indexOf("Mult") >= 0 || key.indexOf("partnerShare") === 0 ? bm[key] : bm[key];
      }
    });

    function readBm() {
      var out = {};
      inputEls.forEach(function (el) {
        var v = parseFloat(el.value);
        out[el.dataset.bmkey] = Number.isNaN(v) ? 0 : v;
      });
      return out;
    }

    function render() {
      var current = readBm();
      M.saveBizModel(current);
      var result = M.computeBusinessModels(a, current);
      var metricsEl = document.getElementById("bmMetrics");
      var rows = [
        ["CapEx", function (m) { return M.indian(m.capex); }],
        ["OpEx before partner share", function (m) { return M.indian(m.opex); }],
        ["Service revenue at full capacity", function (m) { return M.indian(m.serviceRevenue); }],
        ["Less: partner revenue share", function (m) { return M.indian(m.partnerCost); }],
        ["SaaS/platform revenue", function (m) { return M.indian(m.saas); }],
        ["Total revenue", function (m) { return M.indian(m.totalRevenue); }],
        ["EBITDA", function (m) { return M.indian(m.ebitda); }],
        ["EBITDA margin", function (m) { return M.pct(m.margin); }],
        ["Breakeven fleet size (drones)", function (m) { return Math.round(m.breakevenFleet) + " drones"; }],
        ["CapEx payback period", function (m) { return Number.isFinite(m.payback) ? m.payback.toFixed(2) + " yrs" : "\u2014"; }],
      ];
      var html = '<table class="data-table"><thead><tr><th>Metric</th><th class="num">Model A: Full In-House</th><th class="num">Model B: Asset-Light Hub &amp; Spoke</th><th class="num">Model C: Platform-Led Hybrid</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        html += '<tr><td>' + esc(r[0]) + '</td>';
        result.models.forEach(function (m) {
          html += '<td class="num">' + esc(r[1](m)) + '</td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      metricsEl.innerHTML = html;
    }

    inputEls.forEach(function (el) {
      el.addEventListener("input", render);
    });

    render();
  }

  // ---------------- Breakeven page ----------------
  function renderBreakevenPage() {
    var a = M.loadAssumptions();
    var bm = M.loadBizModel();
    var rows = M.computeBreakeven(a, bm.priceA);
    var tableEl = document.getElementById("breakevenTable");
    var cols = rows.map(function (r) { return Math.round(r.u * 100) + "%"; });
    var lines = [
      ["Drones serviced", function (r) { return Math.round(r.drones); }],
      ["Total annual OpEx (fixed, base case)", function (r) { return M.indian(r.opexTotal); }],
      ["Required price per drone/yr to breakeven", function (r) { return M.indian(r.requiredPrice); }],
      ["At assumed price (Rs/drone/yr, Model A)", function () { return M.indian(bm.priceA); }],
      ["Revenue at assumed price", function (r) { return M.indian(r.revenue); }],
      ["EBITDA at assumed price", function (r) { return M.indian(r.ebitda); }],
    ];
    var html = '<table class="data-table"><thead><tr><th>Metric</th>';
    cols.forEach(function (c) { html += '<th class="num">' + c + '</th>'; });
    html += '</tr></thead><tbody>';
    lines.forEach(function (line) {
      html += '<tr><td>' + esc(line[0]) + '</td>';
      rows.forEach(function (r) { html += '<td class="num">' + esc(line[1](r)) + '</td>'; });
      html += '</tr>';
    });
    html += '</tbody></table>';
    tableEl.innerHTML = html;
  }

  // ---------------- Skill Matrix page ----------------
  function renderSkillMatrixPage() {
    var a = M.loadAssumptions();
    var rows = M.computeSkillMatrix(a);
    var covered = rows.filter(function (r) { return r.status === "Covered"; }).length;
    var gap = rows.length - covered;

    document.getElementById("skillMetrics").innerHTML =
      metricHtml(covered, "Components covered in-house", "metric--teal") +
      metricHtml(gap, "Components with a skill GAP", "metric--coral");

    var html = "";
    rows.forEach(function (r) {
      var badgeCls = r.status === "Covered" ? "badge--covered" : "badge--gap";
      html += '<tr>' +
        '<td>' + esc(r.comp) + '</td>' +
        '<td>' + esc(r.complexity) + '</td>' +
        '<td>' + esc(r.skill) + '</td>' +
        '<td>' + esc(r.role) + '</td>' +
        '<td class="num">' + esc(r.coverage) + '</td>' +
        '<td><span class="badge ' + badgeCls + '">' + esc(r.status) + '</span></td>' +
        '<td class="note">' + esc(r.sourcing) + '</td>' +
        '</tr>';
    });
    document.getElementById("skillRows").innerHTML = html;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.dataset.page;
    if (page === "assumptions") initAssumptionsForm();
    else if (page === "capex") renderCapexPage();
    else if (page === "opex") renderOpexPage();
    else if (page === "business-models") renderBusinessModelsPage();
    else if (page === "breakeven") renderBreakevenPage();
    else if (page === "skill-matrix") renderSkillMatrixPage();
  });
})();
