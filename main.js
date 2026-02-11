/********** INDICATOR MAPPING **********/
const indicatorMapping = {
  "NY.GDP.MKTP.CD": "GDP (current US$)",
  "NY.GDP.PCAP.CD": "GDP per capita (current US$)",
  "SP.POP.TOTL": "Population",
  "SP.DYN.LE00.IN": "Life Expectancy at Birth",
  "SL.UEM.TOTL.ZS": "Unemployment Rate (%)",
  "SE.PRM.TENR": "Primary Enrollment Rate (%)",
  "SE.SEC.ENRR": "Secondary Enrollment Rate (%)",
  "SE.TER.ENRR": "Tertiary Enrollment Rate (%)",
  "SH.XPD.CHEX.GD.ZS": "Health Expenditure (% of GDP)",
  "EN.ATM.CO2E.KT": "CO2 Emissions (kt)",
  "SP.URB.TOTL.IN.ZS": "Urban Population (% of Total)",
  "SP.RUR.TOTL.ZS": "Rural Population (% of Total)",
  "BX.KLT.DINV.CD.WD": "Net FDI (current US$)",
  "FP.CPI.TOTL.ZG": "Inflation, consumer prices (annual %)",
  "IT.CEL.SETS.P2": "Mobile Cellular Subscriptions (per 100 ppl)",
  "EG.ELC.ACCS.ZS": "Access to Electricity (% of population)",
  "SE.XPD.TOTL.GD.ZS": "R&D Expenditure (% of GDP)",
  "SP.DYN.IMRT.IN": "Infant Mortality Rate (per 1,000 live births)"
};

// Populate the multi-select for indicators
const indicatorSelect = document.getElementById("indicatorSelect");
for (const code in indicatorMapping) {
  const option = document.createElement("option");
  option.value = code;
  option.textContent = indicatorMapping[code];
  indicatorSelect.appendChild(option);
}

/********** DATA SCOPE MANAGEMENT **********/
const dataScope = document.getElementById("dataScope");
const countryGroup = document.getElementById("countryGroup");
const continentGroup = document.getElementById("continentGroup");

dataScope.addEventListener("change", function() {
  const scope = dataScope.value;
  if (scope === "country") {
    countryGroup.style.display = "block";
    continentGroup.style.display = "none";
  } else if (scope === "continent") {
    countryGroup.style.display = "none";
    continentGroup.style.display = "block";
  } else { // "world"
    countryGroup.style.display = "none";
    continentGroup.style.display = "none";
  }
});

/********** CHART.JS SETUP **********/
let chartInstance = null;
function updateChart(datasets) {
  const ctx = document.getElementById("chartCanvas").getContext("2d");
  if (chartInstance) { chartInstance.destroy(); }
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { datasets: datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: { mode: 'index', intersect: false }
      },
      parsing: false,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: { display: true, text: 'Year' },
          ticks: { stepSize: 1 }
        },
        y: { title: { display: true, text: 'Value' } }
      }
    }
  });
}

/********** LOADING DATA FROM WORLD BANK API **********/
document.getElementById("loadDataButton").addEventListener("click", function() {
  // Determine the code to use based on scope: country, continent or world
  let code;
  const scope = dataScope.value;
  if (scope === "world") {
    code = "WLD";
  } else if (scope === "continent") {
    const continentSelect = document.getElementById("continentSelect");
    code = continentSelect.value;
  } else { // country
    const countrySelect = document.getElementById("countrySelect");
    code = countrySelect.value;
  }
  
  const selectedOptions = Array.from(indicatorSelect.selectedOptions);
  if (selectedOptions.length === 0) {
    alert("Select at least one indicator.");
    return;
  }
  const indicators = selectedOptions.map(opt => opt.value);
  const startYear = document.getElementById("startYear").value;
  const endYear = document.getElementById("endYear").value;
  
  // For each indicator, compose the URL for the API and fetch the data
  const promises = indicators.map(indicatorCode => {
    const url = `https://api.worldbank.org/v2/country/${code}/indicator/${indicatorCode}?format=json&date=${startYear}:${endYear}&per_page=100`;
    return fetch(url)
      .then(response => response.json())
      .then(data => {
        if (!data[1]) return { indicator: indicatorCode, records: [] };
        const records = data[1]
          .filter(item => item.value !== null)
          .map(item => ({
            year: parseInt(item.date),
            value: item.value
          }))
          .sort((a, b) => a.year - b.year);
        return { indicator: indicatorCode, records: records };
      });
  });
  
  Promise.all(promises)
    .then(results => {
      // Create a dataset for each indicator for Chart.js
      const datasets = results.map((result, idx) => {
        const dataPoints = result.records.map(record => ({
          x: record.year,
          y: record.value
        }));
        // Generate variable colors for each dataset
        const baseR = 50 + idx * 50,
              baseG = 90,
              baseB = 135;
        return {
          label: indicatorMapping[result.indicator] || result.indicator,
          data: dataPoints,
          backgroundColor: `rgba(${baseR}, ${baseG}, ${baseB}, 0.3)`,
          borderColor: `rgba(${baseR}, ${baseG}, ${baseB}, 1)`,
          borderWidth: 2,
          fill: true,
          tension: 0.2
        };
      });
      updateChart(datasets);
    })
    .catch(error => {
      console.error("Error in fetch:", error);
      alert("Error retrieving data. Please try again.");
    });
});
