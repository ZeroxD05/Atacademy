(async function () {
  function fmt(n) {
    return new Intl.NumberFormat("de-DE").format(n);
  }
  const res = await fetch("/api/stats");
  const data = await res.json();

  // KPIs
  document.getElementById("kpi-today").textContent = fmt(data.kpi.today);
  document.getElementById("kpi-week").textContent = fmt(data.kpi.week);
  document.getElementById("kpi-month").textContent = fmt(data.kpi.month);
  document.getElementById("kpi-year").textContent = fmt(data.kpi.year);
  document.getElementById("updated").textContent = new Date(
    data.generatedAt
  ).toLocaleString("de-DE");

  // Tables
  const tbCountries = document.querySelector("#table-countries tbody");
  data.countries.slice(0, 10).forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.country || "Unbekannt"}</td><td>${fmt(
      row.count
    )}</td>`;
    tbCountries.appendChild(tr);
  });

  const tbRef = document.querySelector("#table-referrers tbody");
  data.referrers.slice(0, 10).forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.referrer || "Direkt"}</td><td>${fmt(
      row.count
    )}</td>`;
    tbRef.appendChild(tr);
  });

  // Charts
  function mkSeries(obj) {
    const labels = Object.keys(obj);
    const values = labels.map((k) => obj[k]);
    return { labels, values };
  }

  const w = mkSeries(data.timeseries.weekly);
  const ctxW = document.getElementById("chart-weekly").getContext("2d");
  new Chart(ctxW, {
    type: "line",
    data: {
      labels: w.labels,
      datasets: [{ label: "Besuche (Woche)", data: w.values }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });

  const m = mkSeries(data.timeseries.monthly);
  const ctxM = document.getElementById("chart-monthly").getContext("2d");
  new Chart(ctxM, {
    type: "bar",
    data: {
      labels: m.labels,
      datasets: [{ label: "Besuche (Monat)", data: m.values }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
})();
