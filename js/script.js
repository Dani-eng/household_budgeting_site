"use strict";

(() => {
  const CATEGORIES = [
    "Housing",
    "Utilities",
    "Groceries",
    "Transportation",
    "Healthcare",
    "Entertainment",
    "Other"
  ];

  const DEFAULT_PROFILE = {
    state: "",
    city: "",
    homeType: "",
    householdSize: 1,
    childrenCount: 0,
    childrenAges: "",
    benchmarks: {
      monthlyIncome: 0,
      expenses: Object.fromEntries(CATEGORIES.map(category => [category, 0]))
    },
    home: {
      address: "",
      city: "",
      state: "",
      zip: "",
      latitude: "",
      longitude: "",
      squareFootage: "",
      yearBuilt: "",
      climateZone: "",
      utilityTerritory: "",
      oilPricePerGallon: "",
      oilGallonsUsed: "",
      waterBaselineCost: "",
      waterBaselineHouseholdSize: "",
      waterSeasonalAdjustment: 0,
      waterTemperatureAdjustment: 0,
      waterRainfallAdjustment: 0
    }
  };

  let profile = clone(DEFAULT_PROFILE);
  let transactions = [];
  let monthlyBudgets = {};
  let currentMonth = monthKey(new Date());

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeProfile(saved) {
    const source = saved || {};
    return {
      ...clone(DEFAULT_PROFILE),
      ...source,
      benchmarks: {
        ...clone(DEFAULT_PROFILE.benchmarks),
        ...(source.benchmarks || {}),
        expenses: {
          ...clone(DEFAULT_PROFILE.benchmarks.expenses),
          ...(source.benchmarks?.expenses || {})
        }
      },
      home: { ...clone(DEFAULT_PROFILE.home), ...(source.home || {}) }
    };
  }

  function saveData() {
    // Data stays in memory until exported.
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function shiftMonth(key, offset) {
    const [year, month] = key.split("-").map(Number);
    return monthKey(new Date(year, month - 1 + offset, 1));
  }

  function monthDate(key) {
    const [year, month] = key.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }

  function monthLabel(key) {
    return monthDate(key).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric"
    });
  }

  function money(value) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD"
    }).format(Number(value) || 0);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value ?? "";
  }

  function value(id) {
    return document.getElementById(id)?.value ?? "";
  }

  function transactionMonth(item) {
    return item.date ? item.date.slice(0, 7) : "";
  }

  function transactionsForMonth(key) {
    return transactions.filter(item => transactionMonth(item) === key);
  }

  function monthlyTotals(key) {
    const items = transactionsForMonth(key);
    const income = items
      .filter(item => item.type === "income")
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const expenses = items
      .filter(item => item.type === "expense")
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return { income, expenses, balance: income - expenses };
  }

  function budgetForMonth(key) {
    const stored = monthlyBudgets[key] || {};
    return {
      income: Number(stored.income ?? profile.benchmarks.monthlyIncome) || 0,
      expenses: { ...profile.benchmarks.expenses, ...(stored.expenses || {}) }
    };
  }

  function forecastForMonth(key) {
    const months = [1, 2, 3].map(offset => shiftMonth(key, -offset));
    const totals = months.map(month => ({
      month,
      ...monthlyTotals(month)
    }));

    return {
      months,
      income: totals.reduce((sum, item) => sum + item.income, 0) / totals.length,
      expenses: totals.reduce((sum, item) => sum + item.expenses, 0) / totals.length
    };
  }

  function seedDemoData() {
    profile = mergeProfile({
      state: "IN",
      city: "Indianapolis",
      homeType: "house",
      householdSize: 4,
      childrenCount: 2,
      childrenAges: "6, 10",
      benchmarks: {
        monthlyIncome: 5800,
        expenses: {
          Housing: 1650,
          Utilities: 350,
          Groceries: 900,
          Transportation: 800,
          Healthcare: 450,
          Entertainment: 250,
          Other: 1150
        }
      },
      home: {
        address: "123 Sample Street",
        city: "Indianapolis",
        state: "IN",
        zip: "46203",
        latitude: "39.7684",
        longitude: "-86.1581",
        squareFootage: "1800",
        yearBuilt: "1995",
        climateZone: "5",
        utilityTerritory: "Sample territory",
        oilPricePerGallon: "5.792",
        oilGallonsUsed: "100",
        waterBaselineCost: "75",
        waterBaselineHouseholdSize: "4",
        waterSeasonalAdjustment: "5",
        waterTemperatureAdjustment: "2",
        waterRainfallAdjustment: "-3"
      }
    });

    transactions = [];
    monthlyBudgets = {};
    const expenses = Object.entries(profile.benchmarks.expenses);

    for (let offset = 6; offset >= 0; offset--) {
      const key = shiftMonth(monthKey(new Date()), -offset);
      const [year, month] = key.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const dateFor = day =>
        `${key}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
      const factor = 1 + (((6 - offset) % 3) - 1) * 0.04;

      transactions.push({
        id: makeId(),
        date: dateFor(1),
        description: "Sample household take-home income",
        type: "income",
        category: "Income",
        amount: Math.round(5800 * factor * 100) / 100
      });

      expenses.forEach(([category, amount], index) => {
        transactions.push({
          id: makeId(),
          date: dateFor(index + 3),
          description: `Sample ${category.toLowerCase()} expense`,
          type: "expense",
          category,
          amount: Math.round(amount * factor * 100) / 100
        });
      });

      monthlyBudgets[key] = {
        income: 5800,
        expenses: Object.fromEntries(expenses)
      };
    }
  }

  function makeId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function renderDashboard() {
    setText("current-month-label", monthLabel(currentMonth));
    const totals = monthlyTotals(currentMonth);
    setText("monthly-income-total", money(totals.income));
    setText("monthly-expense-total", money(totals.expenses));
    setText("monthly-balance-total", money(totals.balance));

    const body = document.getElementById("transaction-list");
    if (!body) return;

    const items = transactionsForMonth(currentMonth)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));

    body.innerHTML = items.length
      ? items.map(item => `
        <tr>
          <td>${escapeHtml(item.date)}</td>
          <td>${escapeHtml(item.description)}</td>
          <td>${escapeHtml(item.type)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${money(item.amount)}</td>
          <td><button type="button" data-delete="${escapeHtml(item.id)}">Delete</button></td>
        </tr>
      `).join("")
      : '<tr><td colspan="6">No transactions for this month.</td></tr>';
  }

  function renderProfile() {
    setValue("profile-state", profile.state);
    setValue("profile-city", profile.city);
    setValue("profile-home-type", profile.homeType);
    setValue("profile-household-size", profile.householdSize);
    setValue("profile-children-count", profile.childrenCount);
    setValue("profile-children-ages", profile.childrenAges);

    const container = document.getElementById("benchmark-inputs");
    if (!container) return;

    container.innerHTML = `<div class="form-grid">
      <label>Monthly income
        <input data-income-benchmark type="number" min="0" step="0.01"
          value="${Number(profile.benchmarks.monthlyIncome) || 0}">
      </label>
      ${CATEGORIES.map(category => `
        <label>${escapeHtml(category)}
          <input data-expense-benchmark="${escapeHtml(category)}"
            type="number" min="0" step="0.01"
            value="${Number(profile.benchmarks.expenses[category]) || 0}">
        </label>
      `).join("")}
    </div>`;
  }

  function renderHome() {
    const fields = {
      "home-address": "address",
      "home-city": "city",
      "home-state": "state",
      "home-zip": "zip",
      "home-latitude": "latitude",
      "home-longitude": "longitude",
      "home-square-footage": "squareFootage",
      "home-year-built": "yearBuilt",
      "home-climate-zone": "climateZone",
      "home-utility-territory": "utilityTerritory",
      "oil-price-per-gallon": "oilPricePerGallon",
      "oil-gallons-used": "oilGallonsUsed",
      "water-baseline-cost": "waterBaselineCost",
      "water-baseline-household-size": "waterBaselineHouseholdSize",
      "water-seasonal-adjustment": "waterSeasonalAdjustment",
      "water-temperature-adjustment": "waterTemperatureAdjustment",
      "water-rainfall-adjustment": "waterRainfallAdjustment"
    };

    Object.entries(fields).forEach(([id, key]) =>
      setValue(id, profile.home[key])
    );

    updateCostEstimates();
    renderForecastTotals();
  }

  function updateCostEstimates() {
    const oilCost =
      (Number(value("oil-price-per-gallon")) || 0) *
      (Number(value("oil-gallons-used")) || 0);
    setText("heating-oil-estimate", money(oilCost));

    const baseline = Number(value("water-baseline-cost")) || 0;
    const baselineSize = Number(value("water-baseline-household-size")) || 1;
    const householdSize =
      Number(value("profile-household-size")) || profile.householdSize || 1;
    const adjustments = [
      "water-seasonal-adjustment",
      "water-temperature-adjustment",
      "water-rainfall-adjustment"
    ].reduce((sum, id) => sum + (Number(value(id)) || 0), 0);

    const waterCost = Math.max(
      0,
      baseline * householdSize / baselineSize * (1 + adjustments / 100)
    );
    setText("water-cost-estimate", money(waterCost));
  }

  function renderForecastTotals() {
    const target = document.getElementById("forecast-results");
    if (!target) return;

    const current = monthKey(new Date());
    const forecast = forecastForMonth(current);
    const monthNames = forecast.months.map(monthLabel).join(", ");

    target.innerHTML = `
      <p>Average monthly income forecast: <strong>${money(forecast.income)}</strong></p>
      <p>Average monthly expense forecast: <strong>${money(forecast.expenses)}</strong></p>
      <p>Based on transactions from: ${escapeHtml(monthNames)}.</p>
      <p>This is a simple three-month average; unusual or incomplete months can affect it.</p>
    `;
  }

  function renderHistory() {
    const current = monthKey(new Date());
    const months = [];

    for (let offset = 6; offset >= 0; offset--) {
      months.push(shiftMonth(current, -offset));
    }

    const data = months.map(key => {
      const actual = monthlyTotals(key);
      const forecast = forecastForMonth(key);
      const budget = budgetForMonth(key);

      return {
        month: key,
        income: {
          budget: budget.income,
          forecast: forecast.income,
          actual: actual.income
        },
        expenses: {
          budget: Object.values(budget.expenses)
            .reduce((sum, amount) => sum + (Number(amount) || 0), 0),
          forecast: forecast.expenses,
          actual: actual.expenses
        }
      };
    });

    renderChart("income-history-chart", data, "income");
    renderChart("expense-history-chart", data, "expenses");
  }

  function renderChart(id, data, kind) {
    const container = document.getElementById(id);
    if (!container) return;

    const series = [
      ["Budget", "budget", "bar-budget"],
      ["Forecast", "forecast", "bar-forecast"],
      ["Actual", "actual", "bar-actual"]
    ];

    const max = Math.max(
      1,
      ...data.flatMap(item =>
        series.map(([, key]) => Number(item[kind][key]) || 0)
      )
    );

    container.innerHTML = `
      <div class="chart-legend">
        ${series.map(([label, , cls]) => `<span class="legend-item">
          <span class="legend-swatch ${cls}"></span>${label}</span>`).join("")}
      </div>
      ${data.map(item => `<div class="month-group">
        <div class="month-label">${escapeHtml(monthLabel(item.month))}</div>
        ${series.map(([label, key, cls]) => {
          const amount = Number(item[kind][key]) || 0;
          const width = Math.min(100, amount / max * 100);

          return `<div class="bar-row">
            <span>${label}</span>
            <div class="bar-track" role="img" aria-label="${label}: ${money(amount)}">
              <div class="bar ${cls}" style="width:${width}%"></div>
            </div>
            <span class="bar-value">${money(amount)}</span>
          </div>`;
        }).join("")}
      </div>`).join("")}`;
  }

  function showStatus(message) {
    setText("excel-status", message);
  }

  function requireXlsx() {
    if (typeof XLSX !== "undefined") return true;
    showStatus("Excel support did not load. Check your internet connection and try again.");
    return false;
  }

  function exportExcel() {
    if (!requireXlsx()) return;

    const workbook = XLSX.utils.book_new();
    const transactionRows = transactions.map(item => ({
      Date: item.date,
      Description: item.description,
      Type: item.type,
      Category: item.category,
      Amount: Number(item.amount) || 0
    }));

    const budgetRows = Object.entries(monthlyBudgets).flatMap(([month, budget]) => [
      {
        Month: month,
        Type: "Income",
        Category: "Income",
        Amount: Number(budget.income) || 0
      },
      ...Object.entries(budget.expenses || {}).map(([category, amount]) => ({
        Month: month,
        Type: "Expense",
        Category: category,
        Amount: Number(amount) || 0
      }))
    ]);

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(transactionRows),
      "Transactions"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(budgetRows),
      "Budgets"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        { ProfileJSON: JSON.stringify(profile) }
      ]),
      "Profile"
    );

    XLSX.writeFile(workbook, "household-budget-backup.xlsx");
    showStatus("Budget exported. Keep this workbook to continue later.");
  }

  function downloadTemplate() {
    if (!requireXlsx()) return;

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["Date", "Description", "Type", "Category", "Amount"],
      ["2026-01-01", "Example paycheck", "income", "Income", 3000],
      ["2026-01-02", "Example groceries", "expense", "Groceries", 100]
    ]), "Transactions");

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["Month", "Type", "Category", "Amount"],
      ["2026-01", "Income", "Income", 6000],
      ["2026-01", "Expense", "Housing", 2100]
    ]), "Budgets");

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["ProfileJSON"],
      [JSON.stringify(profile)]
    ]), "Profile");

    XLSX.writeFile(workbook, "household-budget-template.xlsx");
    showStatus("Template downloaded.");
  }

  async function importExcel(event) {
    if (!requireXlsx()) return;

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });

      const rowsFrom = name => {
        const sheet = workbook.SheetNames.find(
          item => item.toLowerCase() === name.toLowerCase()
        );
        return sheet
          ? XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: "" })
          : [];
      };

      const importedTransactions = rowsFrom("Transactions").map(row => {
        const date = String(row.Date ?? row.date ?? "").slice(0, 10);
        const amount = Number(row.Amount ?? row.amount);

        if (!date || !Number.isFinite(amount) || amount <= 0) return null;

        return {
          id: makeId(),
          date,
          description: String(row.Description ?? row.description ?? ""),
          type: String(row.Type ?? row.type ?? "expense").toLowerCase() === "income"
            ? "income"
            : "expense",
          category: String(row.Category ?? row.category ?? "Other"),
          amount
        };
      }).filter(Boolean);

      const importedBudgets = {};

      rowsFrom("Budgets").forEach(row => {
        const month = String(row.Month ?? row.month ?? "");
        const type = String(row.Type ?? row.type ?? "").toLowerCase();
        const category = String(row.Category ?? row.category ?? "");
        const amount = Number(row.Amount ?? row.amount);

        if (!/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(amount)) return;

        importedBudgets[month] ??= { income: 0, expenses: {} };

        if (type === "income") {
          importedBudgets[month].income = amount;
        }
        if (type === "expense" && category) {
          importedBudgets[month].expenses[category] = amount;
        }
      });

      let importedProfile = null;
      const profileRows = rowsFrom("Profile");

      if (profileRows[0]?.ProfileJSON) {
        importedProfile = JSON.parse(profileRows[0].ProfileJSON);
      }

      if (
        !importedTransactions.length &&
        !Object.keys(importedBudgets).length &&
        !importedProfile
      ) {
        throw new Error("No usable budget data found in this workbook.");
      }

      transactions = importedTransactions;
      monthlyBudgets = importedBudgets;

      if (importedProfile) {
        profile = mergeProfile(importedProfile);
      }

      renderDashboard();
      renderProfile();
      renderHome();
      renderHistory();
      showStatus("Workbook imported. Your budget is ready for this visit.");
    } catch (error) {
      showStatus(error.message || "Could not read that Excel file.");
    } finally {
      event.target.value = "";
    }
  }

  async function loadWeather() {
    const target = document.getElementById("weather-forecast-results");
    const button = document.getElementById("load-weather-forecast");

    if (!target) return;

    const latText = value("home-latitude").trim();
    const lonText = value("home-longitude").trim();
    const lat = Number(latText);
    const lon = Number(lonText);

    if (
      !latText ||
      !lonText ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      target.textContent = "Enter a valid latitude and longitude.";
      return;
    }

    const originalButtonText = button?.textContent;
    if (button) {
      button.disabled = true;
      button.textContent = "Loading forecast…";
    }

    target.textContent = "Loading the 7-day weather forecast…";

    try {
      const pointsResponse = await fetch(
        `https://api.weather.gov/points/${lat},${lon}`,
        { headers: { Accept: "application/geo+json" } }
      );

      if (!pointsResponse.ok) {
        throw new Error(
          "Could not retrieve forecast information for those coordinates. The weather service may only support locations in the United States."
        );
      }

      const points = await pointsResponse.json();
      const forecastUrl = points.properties?.forecast;

      if (!forecastUrl) {
        throw new Error("The weather service did not return a forecast URL.");
      }

      const forecastResponse = await fetch(forecastUrl, {
        headers: { Accept: "application/geo+json" }
      });

      if (!forecastResponse.ok) {
        throw new Error("Could not retrieve the weather forecast.");
      }

      const forecast = await forecastResponse.json();
      const periods = forecast.properties?.periods || [];
      const byDate = new Map();

      periods.forEach(period => {
        const date = period.startTime?.slice(0, 10);
        if (!date) return;

        if (!byDate.has(date)) byDate.set(date, {});

        const day = byDate.get(date);
        if (period.isDaytime) {
          day.daytime = period;
        } else {
          day.nighttime = period;
        }
      });

      const days = Array.from(byDate.entries())
        .map(([date, periodsForDay]) => {
          const daytime = periodsForDay.daytime;
          const nighttime = periodsForDay.nighttime;
          const temperatures = [daytime?.temperature, nighttime?.temperature]
            .map(Number)
            .filter(Number.isFinite);

          if (!temperatures.length) return null;

          const averageTemperature =
            temperatures.reduce((sum, temperature) => sum + temperature, 0) /
            temperatures.length;

          return {
            date,
            daytime,
            nighttime,
            high: daytime?.temperature,
            low: nighttime?.temperature,
            averageTemperature,
            hdd: Math.max(0, 65 - averageTemperature)
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 7);

      if (!days.length) {
        throw new Error("The weather service did not return usable daily temperatures.");
      }

      const totalHdd = days.reduce((sum, day) => sum + day.hdd, 0);
      const formatter = new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        timeZone: "UTC"
      });

      const lines = days.map(day => {
        const dateLabel = formatter.format(new Date(`${day.date}T12:00:00Z`));
        const highText = Number.isFinite(Number(day.high))
          ? `${day.high}°F`
          : "not available";
        const lowText = Number.isFinite(Number(day.low))
          ? `${day.low}°F`
          : "not available";
        const conditions =
          day.daytime?.shortForecast ||
          day.nighttime?.shortForecast ||
          "Conditions not available";

        return `${dateLabel}: High ${highText}, low ${lowText}. ${conditions}. Estimated average: ${day.averageTemperature.toFixed(1)}°F; ${day.hdd.toFixed(1)} heating degree days.`;
      });

      const loadedAt = new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date());

      target.textContent =
        `7-day forecast for ${lat.toFixed(4)}, ${lon.toFixed(4)}\n` +
        `Loaded ${loadedAt}\n\n` +
        `${lines.join("\n")}\n\n` +
        `Estimated total: ${totalHdd.toFixed(1)} heating degree days over ${days.length} days. ` +
        `This uses a 65°F baseline. It is a weather-based estimate, not a prediction of your actual heating bill.`;
    } catch (error) {
      target.textContent = error.message || "Unable to load weather data.";
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalButtonText || "Load 7-day weather forecast";
      }
    }
  }

  function bindEvents() {
    document.querySelectorAll(".tab-button").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".tab-button").forEach(item =>
          item.classList.toggle("active", item === button)
        );

        document.querySelectorAll(".tab-panel").forEach(panel => {
          panel.hidden = panel.id !== button.dataset.tab;
        });

        if (button.dataset.tab === "budget-history") {
          renderHistory();
        }
      });
    });

    document.getElementById("previous-month").addEventListener("click", () => {
      currentMonth = shiftMonth(currentMonth, -1);
      renderDashboard();
    });

    document.getElementById("next-month").addEventListener("click", () => {
      currentMonth = shiftMonth(currentMonth, 1);
      renderDashboard();
    });

    document.getElementById("transaction-form").addEventListener("submit", event => {
      event.preventDefault();

      const data = new FormData(event.currentTarget);
      const amount = Number(data.get("amount"));
      if (!Number.isFinite(amount) || amount <= 0) return;

      transactions.push({
        id: makeId(),
        date: String(data.get("date")),
        description: String(data.get("description")).trim(),
        type: String(data.get("type")),
        category: String(data.get("category")).trim(),
        amount
      });

      event.currentTarget.reset();
      setValue("transaction-date", new Date().toISOString().slice(0, 10));
      renderDashboard();
      renderHistory();
    });

    document.getElementById("transaction-list").addEventListener("click", event => {
      const button = event.target.closest("[data-delete]");
      if (!button) return;

      transactions = transactions.filter(item => item.id !== button.dataset.delete);
      renderDashboard();
      renderHistory();
    });

    document.getElementById("household-profile-form").addEventListener("submit", event => {
      event.preventDefault();

      profile.state = value("profile-state");
      profile.city = value("profile-city");
      profile.homeType = value("profile-home-type");
      profile.householdSize = Number(value("profile-household-size")) || 1;
      profile.childrenCount = Number(value("profile-children-count")) || 0;
      profile.childrenAges = value("profile-children-ages");

      updateCostEstimates();
      showStatus("Profile updated for this visit. Export to save it.");
    });

    document.getElementById("save-benchmarks").addEventListener("click", () => {
      profile.benchmarks.monthlyIncome =
        Number(document.querySelector("[data-income-benchmark]")?.value) || 0;

      document.querySelectorAll("[data-expense-benchmark]").forEach(input => {
        profile.benchmarks.expenses[input.dataset.expenseBenchmark] =
          Number(input.value) || 0;
      });

      renderHistory();
      showStatus("Benchmarks updated for this visit. Export to save them.");
    });

    const homeFields = {
      "home-address": "address",
      "home-city": "city",
      "home-state": "state",
      "home-zip": "zip",
      "home-latitude": "latitude",
      "home-longitude": "longitude",
      "home-square-footage": "squareFootage",
      "home-year-built": "yearBuilt",
      "home-climate-zone": "climateZone",
      "home-utility-territory": "utilityTerritory",
      "oil-price-per-gallon": "oilPricePerGallon",
      "oil-gallons-used": "oilGallonsUsed",
      "water-baseline-cost": "waterBaselineCost",
      "water-baseline-household-size": "waterBaselineHouseholdSize",
      "water-seasonal-adjustment": "waterSeasonalAdjustment",
      "water-temperature-adjustment": "waterTemperatureAdjustment",
      "water-rainfall-adjustment": "waterRainfallAdjustment"
    };

    Object.entries(homeFields).forEach(([id, key]) => {
      const input = document.getElementById(id);

      input.addEventListener("input", () => {
        profile.home[key] = input.value;
        updateCostEstimates();
      });
    });

    document.getElementById("load-weather-forecast")
      .addEventListener("click", loadWeather);
    document.getElementById("export-excel")
      .addEventListener("click", exportExcel);
    document.getElementById("download-template")
      .addEventListener("click", downloadTemplate);
    document.getElementById("import-excel")
      .addEventListener("change", importExcel);
  }

  function initialize() {
    seedDemoData();
    bindEvents();
    renderDashboard();
    renderProfile();
    renderHome();

    const dateInput = document.getElementById("transaction-date");
    if (dateInput) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }

    renderHistory();
  }

  initialize();
})();
