// Global variables
let data = [];

// DOM elements
const fileUpload = document.getElementById('fileUpload');
const analysisType = document.getElementById('analysisType');
const periodType = document.getElementById('periodType');
const calculationType = document.getElementById('calculationType');
const threshold = document.getElementById('threshold');
const thresholdValue = document.getElementById('thresholdValue');
const startYear = document.getElementById('startYear');
const endYear = document.getElementById('endYear');
const errorElement = document.getElementById('error');
const downloadButton = document.getElementById('downloadData');

// Event listeners
fileUpload.addEventListener('change', handleFileUpload);
analysisType.addEventListener('change', updateChart);
periodType.addEventListener('change', updateChart);
calculationType.addEventListener('change', updateChart);
threshold.addEventListener('input', updateThreshold);
startYear.addEventListener('change', updateChart);
endYear.addEventListener('change', updateChart);
downloadButton.addEventListener('click', downloadChartData);

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (file) {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Error parsing the file');
        } else {
          setError(null);
          data = processData(results.data);
          updateChart();
        }
      }
    });
  }
}

function processData(rawData) {
  const filteredData = rawData.filter(row => 
    row.year >= startYear.value && row.year <= endYear.value
  );
  
  if (periodType.value === 'year') {
    return computeAnnualMetrics(filteredData);
  } else if (periodType.value === 'season') {
    // Implement computeSeasonalMetrics
    return [];
  } else if (periodType.value === 'month') {
    // Implement computeMonthlyMetrics
    return [];
  }
}

function computeAnnualMetrics(data) {
  const annualData = {};

  data.forEach(row => {
    const year = row.year;
    const month = row.month;
    if (!annualData[year]) {
      annualData[year] = {};
    }
    if (!annualData[year][month]) {
      annualData[year][month] = { TX: [], TN: [] };
    }
    if (row.TX != null) annualData[year][month].TX.push(row.TX);
    if (row.TN != null) annualData[year][month].TN.push(row.TN);
  });

  const result = Object.keys(annualData).map(year => {
    const months = Object.keys(annualData[year]);
    if (months.length < 12) {
      return null;
    }

    let validYear = true;
    months.forEach(month => {
      const TXValues = annualData[year][month].TX;
      const TNValues = annualData[year][month].TN;
      const totalDays = Math.max(TXValues.length, TNValues.length);
      const missingDays = (31 - totalDays);
      if (missingDays > 6) {
        validYear = false;
      }
    });

    if (!validYear) {
      return null;
    }

    let value = 0;
    if (calculationType.value === 'average') {
      let totalTempSum = 0;
      let totalDays = 0;
      months.forEach(month => {
        const allTemps = annualData[year][month].TX.concat(annualData[year][month].TN);
        totalTempSum += allTemps.reduce((sum, temp) => sum + temp, 0);
        totalDays += allTemps.length;
      });
      value = totalTempSum / totalDays;
    } else if (calculationType.value === 'aboveThreshold') {
      value = months.reduce((sum, month) => {
        return sum + annualData[year][month].TX.filter(temp => temp > threshold.value).length;
      }, 0);
    } else if (calculationType.value === 'belowThreshold') {
      value = months.reduce((sum, month) => {
        return sum + annualData[year][month].TN.filter(temp => temp < threshold.value).length;
      }, 0);
    }

    return { year: parseInt(year), value: value };
  }).filter(result => result !== null);

  return result;
}

function updateChart() {
  const chartData = processData(data);
  const chart = Recharts.ResponsiveContainer({
    width: '100%',
    height: 400,
    children: Recharts.LineChart({
      data: chartData,
      children: [
        Recharts.CartesianGrid({ strokeDasharray: "3 3" }),
        Recharts.XAxis({ dataKey: "year" }),
        Recharts.YAxis(),
        Recharts.Tooltip({
          content: ({ payload }) => {
            if (payload && payload.length) {
              return `
                <div>
                  <p>Year: ${payload[0].payload.year}</p>
                  <p>Value: ${payload[0].value}</p>
                  <p>Analysis: ${analysisType.value}, Period: ${periodType.value}, Calculation: ${calculationType.value}</p>
                </div>
              `;
            }
            return null;
          }
        }),
        Recharts.Line({
          type: "monotone",
          dataKey: "value",
          stroke: "#8884d8"
        })
      ]
    })
  });

  const chartContainer = document.getElementById('chart');
  chartContainer.innerHTML = '';
  Recharts.render(chart, chartContainer);
}

function setError(message) {
  errorElement.textContent = message;
}

function updateThreshold() {
  thresholdValue.textContent = threshold.value + '°C';
  updateChart();
}

function downloadChartData() {
  const chartData = processData(data);
  const csv = Papa.unparse(chartData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "chart_data.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
