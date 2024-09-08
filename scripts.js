(function() {
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
            data = results.data;
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
      return computeSeasonalMetrics(filteredData);
    } else if (periodType.value === 'month') {
      return computeMonthlyMetrics(filteredData);
    }
  }

  function computeAnnualMetrics(data) {
    const annualData = {};
    
    data.forEach(row => {
      const { year, month, day, TX, TN } = row;
      if (!annualData[year]) annualData[year] = {};
      if (!annualData[year][month]) annualData[year][month] = {};
      annualData[year][month][day] = { TX, TN };
    });

    return Object.keys(annualData).map(year => {
      const yearData = annualData[year];
      let totalTX = 0, totalTN = 0, daysCount = 0;
      let aboveThresholdCount = 0, belowThresholdCount = 0;

      Object.values(yearData).forEach(monthData => {
        Object.values(monthData).forEach(dayData => {
          if (dayData.TX !== null) {
            totalTX += dayData.TX;
            if (dayData.TX > threshold.value) aboveThresholdCount++;
          }
          if (dayData.TN !== null) {
            totalTN += dayData.TN;
            if (dayData.TN < threshold.value) belowThresholdCount++;
          }
          daysCount++;
        });
      });

      let value;
      if (calculationType.value === 'average') {
        value = (totalTX + totalTN) / (daysCount * 2);
      } else if (calculationType.value === 'aboveThreshold') {
        value = aboveThresholdCount;
      } else if (calculationType.value === 'belowThreshold') {
        value = belowThresholdCount;
      }

      return { year: parseInt(year), value };
    });
  }

  function computeSeasonalMetrics(data) {
    // Implement seasonal calculation logic
    // This is a placeholder and needs to be implemented
    return [];
  }

  function computeMonthlyMetrics(data) {
    // Implement monthly calculation logic
    // This is a placeholder and needs to be implemented
    return [];
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

})();
