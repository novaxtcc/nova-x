/**
 * ===================================================================
 * Módulo responsável pelos gráficos e atualização de preços da NVX
 * ===================================================================
 */
(function () {
    'use strict';

    const DEFAULT_PRICE = (() => {
        if (typeof window.getPrecoNVX === 'function') {
            return Number(window.getPrecoNVX()) || 3.0;
        }
        if (typeof window.precoNVX === 'number') {
            return window.precoNVX;
        }
        return 3.0;
    })();

    let chartInstance = null;
    let currentChartPeriod = '1D';
    let priceHistory = [{ time: Date.now(), price: DEFAULT_PRICE }];

    /**
     * Retorna o preço atual global da NVX.
     */
    function getCurrentPrice() {
        if (typeof window.getPrecoNVX === 'function') {
            return Number(window.getPrecoNVX()) || DEFAULT_PRICE;
        }
        if (typeof window.precoNVX === 'number') {
            return window.precoNVX;
        }
        return DEFAULT_PRICE;
    }

    /**
     * Atualiza o preço global da NVX.
     */
    function setCurrentPrice(value) {
        if (typeof window.setPrecoNVX === 'function') {
            window.setPrecoNVX(value);
        } else {
            window.precoNVX = value;
        }
    }

    /**
     * Reinicia o histórico de preços com 365 pontos simulados.
     */
    function initializePriceHistory() {
        const now = Date.now();
        priceHistory = [];

        const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
        let currentPrice = 2.50;

        for (let i = 0; i < 365; i++) {
            const timestamp = oneYearAgo + (i * 24 * 60 * 60 * 1000);
            const variation = (Math.random() - 0.5) * 0.04;
            currentPrice = Math.max(1.50, Math.min(5.00, currentPrice * (1 + variation)));

            priceHistory.push({
                time: timestamp,
                price: parseFloat(currentPrice.toFixed(3))
            });
        }
    }

    /**
     * Gera dados realistas para o gráfico quando a API não retorna valores úteis.
     */
    function generateRealisticData(points, basePrice, maxVariation) {
        const data = [];
        const now = Date.now();
        let currentPrice = basePrice;

        for (let i = 0; i < points; i++) {
            const variation = (Math.random() - 0.5) * maxVariation * 2;
            currentPrice = Math.max(1.50, Math.min(5.00, currentPrice * (1 + variation)));

            data.push({
                x: now - ((points - i - 1) * Math.floor((24 * 60 * 60 * 1000) / points)),
                y: parseFloat(currentPrice.toFixed(3))
            });
        }

        return data;
    }

    /**
     * Busca dados do gráfico na API e aplica filtros por período.
     */
    async function getChartData(period) {
        try {
            const response = await fetch('https://server-bhzh.onrender.com/cambio');

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const apiData = await response.json();

            if (!apiData || apiData.length === 0) {
                console.warn('[NVX] API sem dados, usando fallback.');
                return generateRealisticData(24, getCurrentPrice(), 0.01);
            }

            const dataPoints = apiData.map(item => {
                const timestamp = new Date(item.data).getTime();
                const price = parseFloat(item.valor);
                return { x: timestamp, y: price };
            });

            const now = Date.now();
            let filteredData = dataPoints;

            switch (period) {
                case '1D': {
                    const oneDayAgo = now - (24 * 60 * 60 * 1000);
                    filteredData = dataPoints.filter(p => p.x > oneDayAgo);
                    if (filteredData.length < 2) {
                        filteredData = generateRealisticData(24, getCurrentPrice(), 0.01);
                    }
                    break;
                }
                case '1W': {
                    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
                    filteredData = dataPoints.filter(p => p.x > oneWeekAgo);
                    if (filteredData.length < 2) {
                        filteredData = generateRealisticData(7, getCurrentPrice(), 0.015);
                    }
                    break;
                }
                case '1M': {
                    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
                    filteredData = dataPoints.filter(p => p.x > oneMonthAgo);
                    if (filteredData.length < 2) {
                        filteredData = generateRealisticData(30, getCurrentPrice(), 0.02);
                    }
                    break;
                }
                case '1Y': {
                    filteredData = dataPoints.length ? dataPoints : generateRealisticData(365, getCurrentPrice(), 0.04);
                    break;
                }
                default:
                    filteredData = dataPoints;
            }

            if (filteredData.length > 0) {
                const sortedData = [...filteredData].sort((a, b) => a.x - b.x);
                const latestPrice = parseFloat(sortedData[sortedData.length - 1].y.toFixed(3));
                setCurrentPrice(latestPrice);

                const priceElement = document.getElementById('precoNVX');
                if (priceElement) {
                    priceElement.textContent = `R$ ${latestPrice.toFixed(2)}`;
                }

                priceHistory = sortedData.map(item => ({
                    time: item.x,
                    price: item.y
                }));
            }

            return filteredData.sort((a, b) => a.x - b.x);
        } catch (error) {
            console.error('[NVX] Erro ao buscar dados da API:', error);

            switch (period) {
                case '1D': return generateRealisticData(24, getCurrentPrice(), 0.01);
                case '1W': return generateRealisticData(7, getCurrentPrice(), 0.015);
                case '1M': return generateRealisticData(30, getCurrentPrice(), 0.02);
                case '1Y': return generateRealisticData(365, getCurrentPrice(), 0.04);
                default: return generateRealisticData(24, getCurrentPrice(), 0.01);
            }
        }
    }

    /**
     * Inicializa o gráfico com base no período atual.
     */
    async function initializeChart() {
        try {
            const data = await getChartData(currentChartPeriod);

            if (!data || data.length === 0) {
                console.error('[NVX] Sem dados para renderizar o gráfico.');
                return;
            }

            const options = {
                series: [{
                    name: 'Preço NVX',
                    data,
                    color: '#ef9b53'
                }],
                chart: {
                    type: 'area',
                    height: 300,
                    toolbar: { show: false },
                    zoom: { enabled: false },
                    animations: {
                        enabled: true,
                        speed: 800,
                        animateGradually: {
                            enabled: true,
                            delay: 150
                        }
                    }
                },
                dataLabels: { enabled: false },
                stroke: {
                    curve: 'smooth',
                    width: 3,
                    lineCap: 'round'
                },
                fill: {
                    type: 'gradient',
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.45,
                        opacityTo: 0.05,
                        stops: [20, 100, 100, 100]
                    }
                },
                grid: {
                    borderColor: '#e1e5e9',
                    strokeDashArray: 0,
                    xaxis: { lines: { show: true } },
                    yaxis: { lines: { show: true } }
                },
                xaxis: {
                    type: 'datetime',
                    axisBorder: { show: false },
                    axisTicks: { show: false },
                    labels: {
                        style: { colors: '#666', fontSize: '12px' },
                        formatter: (value) => {
                            const date = new Date(parseInt(value, 10));
                            if (currentChartPeriod === '1D') {
                                return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                            }
                            if (currentChartPeriod === '1W') {
                                return date.toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric' });
                            }
                            return date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
                        }
                    }
                },
                yaxis: {
                    title: {
                        text: 'Preço (R$)',
                        style: { color: '#666', fontSize: '12px', fontWeight: 600 }
                    },
                    labels: {
                        style: { colors: '#666', fontSize: '12px' },
                        formatter: (value) => `R$ ${value.toFixed(2)}`
                    }
                },
                tooltip: {
                    enabled: true,
                    theme: 'light',
                    x: {
                        formatter: (value) => {
                            const date = new Date(parseInt(value, 10));
                            return date.toLocaleDateString('pt-BR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            });
                        }
                    },
                    y: {
                        formatter: (value) => `R$ ${value.toFixed(3)}`
                    },
                    style: { fontSize: '12px' }
                },
                colors: ['#ef9b53']
            };

            if (chartInstance) {
                chartInstance.destroy();
            }

            const container = document.querySelector('#chartContainer');
            if (!container) {
                console.warn('[NVX] Container do gráfico não encontrado.');
                return;
            }

            chartInstance = new ApexCharts(container, options);
            chartInstance.render();
        } catch (error) {
            console.error('[NVX] Erro ao inicializar o gráfico:', error);
        }
    }

    /**
     * Altera o período exibido no gráfico.
     */
    async function changeChartPeriod(period, event) {
        try {
            document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
            if (event && event.target) {
                event.target.classList.add('active');
            }

            currentChartPeriod = period;
            await initializeChart();
        } catch (error) {
            console.error('[NVX] Erro ao mudar período do gráfico:', error);
        }
    }

    /**
     * Atualiza os números exibidos quando o preço varia em tempo real.
     */
    function updatePriceInterface(oldPrice) {
        const formatCurrencyFn = typeof window.formatCurrency === 'function'
            ? window.formatCurrency
            : (value) => `R$ ${Number(value).toFixed(2)}`;

        const saldoConvertidoElement = document.getElementById('saldoConvertido');
        if (saldoConvertidoElement) {
            const saldoNVXAtual = typeof window.saldoNVXAtual === 'number' ? window.saldoNVXAtual : 0;
            const novoValorConvertido = formatCurrencyFn(saldoNVXAtual * getCurrentPrice(), 'BRL');
            saldoConvertidoElement.textContent = `≈ ${novoValorConvertido}`;
        }

        const priceElement = document.getElementById('nvxPrice');
        if (priceElement) {
            priceElement.textContent = formatCurrencyFn(getCurrentPrice(), 'BRL');
        }

        const conversionRateBRL = document.getElementById('conversionRateBRL');
        if (conversionRateBRL) {
            const nvxPorReal = (1 / getCurrentPrice()).toFixed(2);
            conversionRateBRL.innerHTML = `<strong>${nvxPorReal} NVX por R$ 1</strong>`;
        }

        const conversionRateNVX = document.getElementById('conversionRateNVX');
        if (conversionRateNVX) {
            conversionRateNVX.innerHTML = `<strong>${formatCurrencyFn(getCurrentPrice(), 'BRL')} por NVX</strong>`;
        }

        const priceChangeElement = document.getElementById('priceChangePercent');
        if (priceChangeElement && typeof oldPrice === 'number' && oldPrice > 0) {
            const percentChange = ((getCurrentPrice() - oldPrice) / oldPrice) * 100;
            const isPositive = percentChange >= 0;

            priceChangeElement.innerHTML = `
                <ion-icon name="${isPositive ? 'trending-up' : 'trending-down'}"></ion-icon>
                <span>${isPositive ? '+' : ''}${percentChange.toFixed(2)}%</span>
            `;

            priceChangeElement.classList.remove('price-up', 'price-down');
            priceChangeElement.classList.add('price-change', isPositive ? 'price-up' : 'price-down');
        }

        if (chartInstance) {
            initializeChart();
        }
    }

    /**
     * Cria variações aleatórias do preço para simular mercado em tempo real.
     */
    function updateRealTimePrices() {
        const oldPrice = getCurrentPrice();
        const variation = (Math.random() - 0.5) * 0.02;
        const newPrice = Math.max(1.50, Math.min(5.00, oldPrice * (1 + variation)));

        const normalizedPrice = parseFloat(newPrice.toFixed(3));
        setCurrentPrice(normalizedPrice);

        priceHistory.push({
            time: Date.now(),
            price: normalizedPrice
        });

        const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
        priceHistory = priceHistory.filter(entry => entry.time > oneYearAgo);

        updatePriceInterface(oldPrice);
    }

    /**
     * Inicia a rotina de atualização de preços em tempo real.
     */
    function initializePriceUpdates() {
        initializePriceHistory();

        setTimeout(() => {
            updateRealTimePrices();

            const scheduleNextPriceUpdate = () => {
                const randomInterval = 20000 + Math.random() * 40000;
                setTimeout(() => {
                    updateRealTimePrices();
                    scheduleNextPriceUpdate();
                }, randomInterval);
            };

            scheduleNextPriceUpdate();
        }, 5000);
    }

    /**
     * Re-renderiza o gráfico quando a janela é redimensionada.
     */
    function handleResize() {
        if (chartInstance) {
            window.requestAnimationFrame(() => {
                initializeChart();
            });
        }
    }

    const chartAPI = {
        initializePriceHistory,
        generateRealisticData,
        getChartData,
        initializeChart,
        changeChartPeriod,
        updateRealTimePrices,
        updatePriceInterface,
        initializePriceUpdates,
        handleResize
    };

    window.NVXChart = chartAPI;
    window.initializeChart = chartAPI.initializeChart;
    window.changeChartPeriod = chartAPI.changeChartPeriod;
    window.initializePriceUpdates = chartAPI.initializePriceUpdates;
})();
