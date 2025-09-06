(async function () {
  function fmt(n) {
    return new Intl.NumberFormat("de-DE").format(n);
  }

  // Function to get data from localStorage
  function getCachedData() {
    const cached = localStorage.getItem("dashboardData");
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Check if cache is less than 5 minutes old
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return data;
      }
    }
    return null;
  }

  // Function to set data to localStorage
  function setCachedData(data) {
    localStorage.setItem(
      "dashboardData",
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  }

  // Try to load cached data first
  let data = getCachedData();
  if (!data) {
    // Fetch new data if no valid cache
    const res = await fetch("/api/stats");
    data = await res.json();
    setCachedData(data);
  }

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
  tbCountries.innerHTML = ""; // Clear existing rows
  data.countries.slice(0, 10).forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.country || "Unbekannt"}</td><td>${fmt(
      row.count
    )}</td>`;
    tbCountries.appendChild(tr);
  });

  const tbRef = document.querySelector("#table-referrers tbody");
  tbRef.innerHTML = ""; // Clear existing rows
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

  // Destroy existing charts if they exist to prevent duplication
  const canvasW = document.getElementById("chart-weekly");
  if (canvasW.chart) {
    canvasW.chart.destroy();
  }
  const w = mkSeries(data.timeseries.weekly);
  const ctxW = canvasW.getContext("2d");
  canvasW.chart = new Chart(ctxW, {
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

  const canvasM = document.getElementById("chart-monthly");
  if (canvasM.chart) {
    canvasM.chart.destroy();
  }
  const m = mkSeries(data.timeseries.monthly);
  const ctxM = canvasM.getContext("2d");
  canvasM.chart = new Chart(ctxM, {
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
