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
const seasonMonthSelector = document.getElementById('seasonMonthSelector');
const seasonMonth = document.getElementById('seasonMonth');

// Event listeners
fileUpload.addEventListener('change', handleFileUpload);
analysisType.addEventListener('change', updateChart);
periodType.addEventListener('change', handlePeriodTypeChange);
calculationType.addEventListener('change', updateChart);
threshold.addEventListener('input', updateThreshold);
startYear.addEventListener('change', updateChart);
endYear.addEventListener('change', updateChart);
downloadButton.addEventListener('click', downloadChartData);
seasonMonth.addEventListener('change', updateChart);

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    setError('שגיאה בניתוח הקובץ');
                } else {
                    setError(null);
                    data = results.data;
                    updateChart();
                }
            }
        });
    }
}

function handlePeriodTypeChange() {
    const selectedPeriod = periodType.value;
    seasonMonthSelector.style.display = selectedPeriod !== 'year' ? 'block' : 'none';
    
    // Clear existing options
    seasonMonth.innerHTML = '';
    
    if (selectedPeriod === 'season') {
        const seasons = ['חורף', 'אביב', 'קיץ', 'סתיו'];
        seasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season;
            option.textContent = season;
            seasonMonth.appendChild(option);
        });
    } else if (selectedPeriod === 'month') {
        const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index + 1;  // 1-based month number
            option.textContent = month;
            seasonMonth.appendChild(option);
        });
    }
    
    updateChart();
}

function processData(rawData) {
    const filteredData = rawData.filter(row => row.year >= parseInt(startYear.value) && row.year <= parseInt(endYear.value));

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
        const year = row.year;
        if (!annualData[year]) {
            annualData[year] = [];
        }
        annualData[year].push(parseFloat(row[analysisType.value]));
    });

    return Object.entries(annualData).map(([year, values]) => ({
        year: parseInt(year),
        value: calculateMetric(values)
    }));
}

function computeSeasonalMetrics(data) {
    const seasonalData = {};
    const seasons = {
        'חורף': [12, 1, 2],
        'אביב': [3, 4, 5],
        'קיץ': [6, 7, 8],
        'סתיו': [9, 10, 11]
    };

    data.forEach(row => {
        const year = row.year;
        const month = parseInt(row.month);
        const season = Object.entries(seasons).find(([, months]) => months.includes(month))[0];

        if (!seasonalData[year]) {
            seasonalData[year] = {};
        }
        if (!seasonalData[year][season]) {
            seasonalData[year][season] = [];
        }
        seasonalData[year][season].push(parseFloat(row[analysisType.value]));
    });

    const selectedSeason = seasonMonth.value;
    return Object.entries(seasonalData).map(([year, seasons]) => ({
        year: parseInt(year),
        value: calculateMetric(seasons[selectedSeason] || [])
    }));
}

function computeMonthlyMetrics(data) {
    const monthlyData = {};

    data.forEach(row => {
        const year = row.year;
        const month = parseInt(row.month);
        if (!monthlyData[year]) {
            monthlyData[year] = {};
        }
        if (!monthlyData[year][month]) {
            monthlyData[year][month] = [];
        }
        monthlyData[year][month].push(parseFloat(row[analysisType.value]));
    });

    const selectedMonth = parseInt(seasonMonth.value);
    return Object.entries(monthlyData).map(([year, months]) => ({
        year: parseInt(year),
        value: calculateMetric(months[selectedMonth] || [])
    }));
}

function calculateMetric(values) {
    if (values.length === 0) return 0;

    if (calculationType.value === 'average') {
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    } else if (calculationType.value === 'aboveThreshold') {
        return values.filter(val => val > parseFloat(threshold.value)).length;
    } else if (calculationType.value === 'belowThreshold') {
        return values.filter(val => val < parseFloat(threshold.value)).length;
    }
}

function updateChart() {
    if (data.length === 0) {
        setError('אנא טען קובץ נתונים תחילה');
        return;
    }

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
                                <div class="custom-tooltip bg-white p-4 border border-gray-300 rounded shadow">
                                    <p class="label font-bold">שנה: ${payload[0].payload.year}</p>
                                    <p>ערך: ${payload[0].value.toFixed(2)}</p>
                                    <p>ניתוח: ${analysisType.value}, תקופה: ${periodType.value}, חישוב: ${calculationType.value}</p>
                                </div>
                            `;
                        }
                        return null;
                    }
                }),
                Recharts.Legend(),
                Recharts.Line({
                    type: "monotone",
                    dataKey: "value",
                    stroke: "#8884d8",
                    activeDot: { r: 8 }
                })
            ]
        })
    });

    const chartContainer = document.getElementById('chart');
    chartContainer.innerHTML = '';
    Recharts.render(chart, chartContainer);
}

function updateThreshold() {
    thresholdValue.textContent = `${threshold.value}°C`;
    updateChart();
}

function setError(message) {
    errorElement.textContent = message || '';
}

function downloadChartData() {
    const chartData = processData(data);
    const csvContent = "data:text/csv;charset=utf-8," + 
        chartData.map(row => `${row.year},${row.value}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "chart_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initial setup
handlePeriodTypeChange();
updateThreshold();
