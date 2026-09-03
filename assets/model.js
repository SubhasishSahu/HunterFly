(function (global) {
  "use strict";

  var ASSUM_KEY = "droneMroAssumptions.v1";
  var BM_KEY = "droneMroBizModel.v1";

  var DEFAULTS = {
    capacity: 100,
    servicesPerYear: 4,
    facilitySqft: 6000,
    rentPsf: 45,
    fitoutPsf: 900,
    diagEquip: 9000000,
    batteryInfra: 3500000,
    sparesFab: 2500000,
    tooling: 2000000,
    dgcaCert: 1200000,
    qualityCert: 1800000,
    legal: 800000,
    sparesStock: 7500000,
    techHc: 10,
    techSal: 700000,
    avionicsHc: 4,
    avionicsSal: 1100000,
    pilotHc: 2,
    pilotSal: 650000,
    qaHc: 1,
    qaSal: 1000000,
    adminHc: 3,
    adminSal: 800000,
    utilities: 1400000,
    insurance: 1500000,
    itLicense: 1200000,
    consumables: 900000,
    marketing: 1000000,
    itBuild: 2200000,
    wcMonths: 4,
  };

  var BM_DEFAULTS = {
    capexMultA: 1.00, capexMultB: 0.55, capexMultC: 0.40,
    opexMultA: 1.00, opexMultB: 0.70, opexMultC: 0.55,
    partnerShareA: 0.00, partnerShareB: 0.30, partnerShareC: 0.20,
    saasA: 0, saasB: 2500000, saasC: 9000000,
    priceA: 480000, priceB: 480000, priceC: 480000,
  };

  function loadJSON(key, defaults) {
    var out = {};
    for (var k in defaults) out[k] = defaults[k];
    try {
      var raw = global.localStorage.getItem(key);
      if (raw) {
        var stored = JSON.parse(raw);
        for (var k2 in stored) {
          if (out.hasOwnProperty(k2) && typeof stored[k2] === "number" && !Number.isNaN(stored[k2])) {
            out[k2] = stored[k2];
          }
        }
      }
    } catch (e) {
      console.warn("Could not read " + key + " from localStorage", e);
    }
    return out;
  }

  function saveJSON(key, obj) {
    try {
      global.localStorage.setItem(key, JSON.stringify(obj));
      return true;
    } catch (e) {
      console.warn("Could not save " + key + " to localStorage", e);
      return false;
    }
  }

  function loadAssumptions() { return loadJSON(ASSUM_KEY, DEFAULTS); }
  function saveAssumptions(a) { return saveJSON(ASSUM_KEY, a); }
  function resetAssumptions() {
    try { global.localStorage.removeItem(ASSUM_KEY); } catch (e) {}
  }

  function loadBizModel() { return loadJSON(BM_KEY, BM_DEFAULTS); }
  function saveBizModel(b) { return saveJSON(BM_KEY, b); }
  function resetBizModel() {
    try { global.localStorage.removeItem(BM_KEY); } catch (e) {}
  }

  function computeCapex(a) {
    var facilityFitout = a.facilitySqft * a.fitoutPsf;
    var items = [
      { label: "Facility fit-out (interiors, ESD flooring, benches, power)", value: facilityFitout, note: "Facility sq ft \u00d7 fit-out cost/sq ft" },
      { label: "Diagnostic & bench test equipment", value: a.diagEquip, note: "Direct input" },
      { label: "Battery service infrastructure", value: a.batteryInfra, note: "Direct input" },
      { label: "Spares fabrication capability", value: a.sparesFab, note: "Direct input" },
      { label: "Tooling, jigs, ground support equipment", value: a.tooling, note: "Direct input" },
      { label: "DGCA/RPTO-adjacent compliance & certification", value: a.dgcaCert, note: "Direct input" },
      { label: "Quality system certification (AS9100/ISO 9001)", value: a.qualityCert, note: "Direct input" },
      { label: "Legal, incorporation, DPSU vendor empanelment", value: a.legal, note: "Direct input" },
      { label: "Initial spares inventory stocking", value: a.sparesStock, note: "Direct input" },
      { label: "MRO scheduling + traceability platform (one-time build)", value: a.itBuild, note: "Direct input" },
    ];
    var subtotal = items.reduce(function (s, i) { return s + i.value; }, 0);
    return { items: items, subtotal: subtotal };
  }

  function computeOpex(a) {
    var rentAnnual = a.facilitySqft * a.rentPsf * 12;
    var techCost = a.techHc * a.techSal;
    var avionicsCost = a.avionicsHc * a.avionicsSal;
    var pilotCost = a.pilotHc * a.pilotSal;
    var qaCost = a.qaHc * a.qaSal;
    var adminCost = a.adminHc * a.adminSal;
    var sparesRepl = a.sparesStock * 0.4;
    var items = [
      { label: "Facility rent (annual)", value: rentAnnual, note: "Sq ft \u00d7 rent/sq ft/month \u00d7 12" },
      { label: "Airframe/mechanical technicians (loaded)", value: techCost, note: "Headcount \u00d7 avg loaded salary" },
      { label: "Avionics/electronics engineers (loaded)", value: avionicsCost, note: "Headcount \u00d7 avg loaded salary" },
      { label: "Test/ferry pilots (loaded)", value: pilotCost, note: "Headcount \u00d7 avg loaded salary" },
      { label: "Quality/compliance officer (loaded)", value: qaCost, note: "Headcount \u00d7 avg loaded salary" },
      { label: "Ops manager + admin/finance (loaded)", value: adminCost, note: "Headcount \u00d7 avg loaded salary" },
      { label: "Utilities", value: a.utilities, note: "Direct input" },
      { label: "Insurance", value: a.insurance, note: "Direct input" },
      { label: "IT/software license (recurring)", value: a.itLicense, note: "Direct input" },
      { label: "Consumables", value: a.consumables, note: "Direct input" },
      { label: "Marketing & business development", value: a.marketing, note: "Direct input" },
      { label: "Recurring spares replenishment (steady-state, ~40% of initial stock/yr)", value: sparesRepl, note: "Planning assumption \u2014 40% of initial stock value" },
    ];
    var total = items.reduce(function (s, i) { return s + i.value; }, 0);
    var perDrone = total / a.capacity;
    var perService = perDrone / a.servicesPerYear;
    return { items: items, total: total, perDrone: perDrone, perService: perService };
  }

  function computeStanding(a) {
    var capex = computeCapex(a);
    var opex = computeOpex(a);
    var wc = (opex.total / 12) * a.wcMonths;
    var total = capex.subtotal + wc;
    return { capex: capex, opex: opex, wc: wc, total: total };
  }

  function computeBusinessModels(a, bm) {
    var standing = computeStanding(a);
    var keys = ["A", "B", "C"];
    var models = keys.map(function (k) {
      var capexMult = bm["capexMult" + k];
      var opexMult = bm["opexMult" + k];
      var partnerShare = bm["partnerShare" + k];
      var saas = bm["saas" + k];
      var price = bm["price" + k];
      var capex = standing.capex.subtotal * capexMult;
      var opex = standing.opex.total * opexMult;
      var serviceRevenue = price * a.capacity;
      var partnerCost = -serviceRevenue * partnerShare;
      var totalRevenue = serviceRevenue + saas + partnerCost;
      var ebitda = totalRevenue - opex;
      var margin = totalRevenue !== 0 ? ebitda / totalRevenue : 0;
      var breakevenFleet = (opex - saas) / (price * (1 - partnerShare));
      var payback = ebitda !== 0 ? capex / ebitda : NaN;
      return {
        key: k, capex: capex, opex: opex, serviceRevenue: serviceRevenue,
        partnerCost: partnerCost, totalRevenue: totalRevenue, ebitda: ebitda,
        margin: margin, breakevenFleet: breakevenFleet, payback: payback,
        price: price, saas: saas, partnerShare: partnerShare,
        capexMult: capexMult, opexMult: opexMult,
      };
    });
    return { standing: standing, models: models };
  }

  function computeBreakeven(a, priceA) {
    var opexTotal = computeOpex(a).total;
    var levels = [0.5, 0.7, 0.85, 1.0, 1.2];
    return levels.map(function (u) {
      var drones = a.capacity * u;
      var requiredPrice = opexTotal / drones;
      var revenue = drones * priceA;
      var ebitda = revenue - opexTotal;
      return { u: u, drones: drones, requiredPrice: requiredPrice, revenue: revenue, ebitda: ebitda, opexTotal: opexTotal };
    });
  }

  var SKILL_ROWS = [
    { comp: "Airframe/structure (frame, arms, landing gear)", complexity: "Low", skill: "Composite/metal repair, structural inspection", role: "Technician", coverage: function (a) { return a.techHc; }, sourcing: "In-house \u2014 covered by base technician team" },
    { comp: "Propulsion (motors, ESCs, props)", complexity: "Low\u2013Medium", skill: "Electromechanical diagnostics, balancing, ESC calibration", role: "Technician", coverage: function (a) { return a.techHc; }, sourcing: "In-house \u2014 covered by base technician team" },
    { comp: "Power system (battery packs, BMS, charging)", complexity: "Medium\u2013High", skill: "LiPo/Li-ion safety handling, BMS diagnostics, thermal mgmt", role: "Technician + Avionics engineer", coverage: function (a) { return a.techHc + a.avionicsHc; }, sourcing: "In-house \u2014 cross-skill 1-2 technicians on BMS + mandatory battery safety cert" },
    { comp: "Flight controller / autopilot (HW + firmware)", complexity: "High", skill: "Embedded systems, firmware flashing/debugging, PID tuning", role: "Avionics engineer", coverage: function (a) { return a.avionicsHc; }, sourcing: "In-house \u2014 covered by avionics team" },
    { comp: "Sensors (GPS, IMU, barometer, compass, LiDAR)", complexity: "High", skill: "Sensor calibration, fusion algorithms, fault diagnosis", role: "Avionics engineer", coverage: function (a) { return a.avionicsHc; }, sourcing: "In-house \u2014 covered by avionics team" },
    { comp: "RF/communication link & telemetry", complexity: "High", skill: "RF test equipment, signal integrity, encrypted datalink protocols", role: "Avionics engineer + comms specialist", coverage: function () { return 0; }, sourcing: "GAP \u2014 no dedicated headcount; partner/consultant for defence-grade comms in Year 1" },
    { comp: "Payload (camera, gimbal, EO/IR)", complexity: "Medium\u2013High", skill: "Precision mechanical alignment, gimbal calibration, optics handling", role: "Technician + Avionics engineer", coverage: function (a) { return a.techHc + a.avionicsHc; }, sourcing: "In-house \u2014 covered jointly, OEM training needed per payload type" },
    { comp: "Mission software / GCS (ground control station)", complexity: "Very High", skill: "Software debugging, mission-planning logic, version/config control", role: "Avionics + software specialist", coverage: function () { return 0; }, sourcing: "GAP \u2014 no dedicated headcount; outsource to GCS/software vendor initially" },
    { comp: "Cybersecurity (anti-jam, anti-spoof, data integrity)", complexity: "Very High", skill: "RF security, GPS-spoofing detection, secure boot/firmware integrity", role: "Cyber specialist", coverage: function () { return 0; }, sourcing: "GAP \u2014 realistically a partner/consultant, not an in-house Year-1 hire" },
    { comp: "Autonomy/AI (obstacle avoidance, swarm logic)", complexity: "Very High", skill: "ML model validation, edge-compute debugging", role: "AI/ML specialist", coverage: function () { return 0; }, sourcing: "GAP \u2014 rare skill; license/partner with a software vendor rather than hire" },
    { comp: "Quality/airworthiness sign-off", complexity: "Medium\u2013High", skill: "DGCA compliance, documentation, root-cause analysis, audit trails", role: "Quality/compliance officer", coverage: function (a) { return a.qaHc; }, sourcing: "In-house \u2014 covered by QA officer" },
    { comp: "Test flight & acceptance", complexity: "Medium", skill: "Flight test procedures, anomaly detection in-flight", role: "Test/ferry pilot", coverage: function (a) { return a.pilotHc; }, sourcing: "In-house \u2014 covered by RPC-holding pilots" },
    { comp: "Parts genealogy/traceability data", complexity: "Medium (strategically high-value)", skill: "Data pipeline design, lineage tracking, audit-ready record-keeping", role: "Founder/data engineering background", coverage: function () { return 1; }, sourcing: "In-house \u2014 your existing SCN/PySpark-Databricks skillset covers this; no new hire needed" },
  ];

  function computeSkillMatrix(a) {
    return SKILL_ROWS.map(function (r) {
      var cov = r.coverage(a);
      return {
        comp: r.comp, complexity: r.complexity, skill: r.skill, role: r.role,
        coverage: cov, status: cov > 0 ? "Covered" : "GAP", sourcing: r.sourcing,
      };
    });
  }

  function indian(n) {
    if (typeof n !== "number" || Number.isNaN(n)) return String(n);
    var neg = n < 0;
    n = Math.abs(n);
    var i = Math.round(n);
    var s = String(i);
    var res;
    if (s.length <= 3) {
      res = s;
    } else {
      var last3 = s.slice(-3);
      var rest = s.slice(0, -3);
      var parts = [];
      while (rest.length > 2) {
        parts.unshift(rest.slice(-2));
        rest = rest.slice(0, -2);
      }
      if (rest) parts.unshift(rest);
      res = parts.join(",") + "," + last3;
    }
    return (neg ? "-" : "") + "\u20b9" + res;
  }

  function crLakh(n) {
    if (typeof n !== "number" || Number.isNaN(n)) return String(n);
    var a = Math.abs(n);
    if (a >= 1e7) return "\u20b9" + (n / 1e7).toFixed(2) + " Cr";
    if (a >= 1e5) return "\u20b9" + (n / 1e5).toFixed(2) + " L";
    return indian(n);
  }

  function pct(n) {
    if (typeof n !== "number" || Number.isNaN(n)) return String(n);
    return (n * 100).toFixed(1) + "%";
  }

  global.DroneModel = {
    DEFAULTS: DEFAULTS,
    BM_DEFAULTS: BM_DEFAULTS,
    loadAssumptions: loadAssumptions,
    saveAssumptions: saveAssumptions,
    resetAssumptions: resetAssumptions,
    loadBizModel: loadBizModel,
    saveBizModel: saveBizModel,
    resetBizModel: resetBizModel,
    computeCapex: computeCapex,
    computeOpex: computeOpex,
    computeStanding: computeStanding,
    computeBusinessModels: computeBusinessModels,
    computeBreakeven: computeBreakeven,
    computeSkillMatrix: computeSkillMatrix,
    indian: indian,
    crLakh: crLakh,
    pct: pct,
  };
})(window);
