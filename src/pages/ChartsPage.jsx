
import React, { useState, useEffect } from 'react';
import { FreightMap } from "@/components/ApiDatabase";
import { BarChart as BarChartIcon, PieChart as PieChartIcon, TrendingUp, Loader2, DollarSign, Map, Truck, TrendingDown as SavingsIcon, Percent, Filter, MapPin, Expand, X as XIcon, Route } from 'lucide-react'; // Added Route icon
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Chart } from 'react-google-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';

// Helper to get destination state
const statesList = ['SP', 'MS', 'MT', 'GO', 'TO', 'MG', 'RS', 'PE', 'PI', 'RR', 'PR', 'PA', 'BA', 'RO', 'MA'];
const getDestinationState = (destination) => {
  if (!destination) return 'N/A';
  const parts = destination.split('/');
  const state = parts.pop()?.trim().toUpperCase();
  return statesList.includes(state) ? state : 'Outro';
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4d'];

const renderActiveShape = (props) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} fontWeight="bold">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${value} Fretes`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

const formatCurrency = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ChartsPage() {
  const [loading, setLoading] = useState(true);
  const [freightData, setFreightData] = useState([]);

  // State for processed chart data (will be derived from filtered data)
  const [valueByCarrier, setValueByCarrier] = useState([]);
  const [countByState, setCountByState] = useState([]);
  const [loadingModeDist, setLoadingModeDist] = useState([]);
  const [savingsByCarrier, setSavingsByCarrier] = useState([]);
  const [freightsOverTime, setFreightsOverTime] = useState([]);
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [kmByCarrier, setKmByCarrier] = useState([]);
  const [savingsPercentageByCarrier, setSavingsPercentageByCarrier] = useState([]); // NEW STATE FOR PERCENTAGE SAVINGS
  const [valuePercentageData, setValuePercentageData] = useState({
    totalMapValue: 0,
    totalFinalValue: 0,
    percentage: 0,
    savings: 0,
    savingsPercentage: 0
  });

  // State for Google Charts data (NEW)
  const [chartsData, setChartsData] = useState({
    valuePerKmByCity: [['Cidade', 'Valor por KM (R$)']],
    valuePerKmByState: [['Estado', 'Valor por KM (R$)']]
  });

  // State for filters and new metric
  const [selectedModality, setSelectedModality] = useState('all');
  const [selectedManager, setSelectedManager] = useState('all');
  // Removed availableManagers state as managerOptions will be hardcoded for the dropdown.
  const [totalSpent, setTotalSpent] = useState(0); // New metric

  // NOVO ESTADO: Para controlar o modal de visualização do gráfico
  const [modalContent, setModalContent] = useState(null);

  // ✅ CORRIGIDO: Lista de gerentes incluindo VENDA DIRETA e VerdeLog
  const managerOptions = ["TIAGO LOPES TOLENTINO", "CLAUDIO FEUSER", "DIEGO JOSÉ MANIAS MARSÃO", "VENDA DIRETA", "VerdeLog"];

  // Função para converter para horário de Brasília
  const toBrazilDateTime = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return new Date(date.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Fetch all contracted freights once
      const maps = await FreightMap.filter({ status: 'contracted' });
      setFreightData(maps);

      // Removed setAvailableManagers as managerOptions will be hardcoded for the dropdown.

    } catch (error) {
      console.error("Error loading freight data for charts:", error);
      alert("Erro ao carregar dados para gráficos. Verifique se a API está rodando.");
    }
    setLoading(false);
  };

  // This new useEffect will run whenever filters or the base data change
  useEffect(() => {
    let filteredMaps = freightData;

    if (selectedModality !== 'all') {
      filteredMaps = filteredMaps.filter(map => map.loadingMode === selectedModality);
    }

    if (selectedManager !== 'all') {
      filteredMaps = filteredMaps.filter(map =>
        map.managers && map.managers.some(m => m.gerente === selectedManager)
      );
    }

    processDataForCharts(filteredMaps);

    const total = filteredMaps.reduce((sum, map) => sum + map.finalValue, 0);
    setTotalSpent(total);

  }, [freightData, selectedModality, selectedManager]);

  const processDataForCharts = (maps) => {
    if (maps.length === 0) {
      setValueByCarrier([]);
      setCountByState([]);
      setLoadingModeDist([]);
      setSavingsByCarrier([]);
      setFreightsOverTime([]);
      setKmByCarrier([]);
      setSavingsPercentageByCarrier([]); // Reset new state
      setValuePercentageData({ totalMapValue: 0, totalFinalValue: 0, percentage: 0, savings: 0, savingsPercentage: 0 });
      // Reset Google Charts data as well
      setChartsData({
        valuePerKmByCity: [['Cidade', 'Valor por KM (R$)']],
        valuePerKmByState: [['Estado', 'Valor por KM (R$)']]
      });
      return;
    }

    // 1. Value by Carrier
    const carrierValues = maps.reduce((acc, map) => {
      acc[map.selectedCarrier] = (acc[map.selectedCarrier] || 0) + map.finalValue;
      return acc;
    }, {});
    setValueByCarrier(Object.entries(carrierValues).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value));

    // 2. Count by Destination State
    const stateCounts = maps.reduce((acc, map) => {
      const state = getDestinationState(map.destination);
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});
    setCountByState(Object.entries(stateCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value));

    // 3. Loading Mode Distribution (updated to handle granel)
    const modeCounts = maps.reduce((acc, map) => {
      const mode = map.loadingMode === 'paletizados' ? 'Paletizados'
                 : map.loadingMode === 'bag' ? 'BAG'
                 : 'Granel'; // Assuming 'granel' is the third possibility or fallback
      acc[mode] = (acc[mode] || 0) + 1;
      return acc;
    }, {});
    setLoadingModeDist(Object.entries(modeCounts).map(([name, value]) => ({ name, value })));

    // 4. Savings by Carrier (now average savings)
    const carrierSavings = maps.reduce((acc, map) => {
        const proposal = map.carrierProposals?.[map.selectedCarrier] || map.finalValue;
        const saving = proposal - map.finalValue;
        if (!acc[map.selectedCarrier]) {
            acc[map.selectedCarrier] = { total: 0, count: 0 };
        }
        acc[map.selectedCarrier].total += saving;
        acc[map.selectedCarrier].count += 1;
        return acc;
    }, {});
    setSavingsByCarrier(
      Object.entries(carrierSavings)
        .map(([name, data]) => ({ name, value: data.total / data.count }))
        .sort((a, b) => b.value - a.value)
    );

    // 5. Freights (Count) Over Time (Monthly)
    const monthlyCounts = maps.reduce((acc, map) => {
        if (map.contractedAt) {
            // Apply Brazil timezone conversion as per outline
            const brazilDate = toBrazilDateTime(map.contractedAt);
            if (brazilDate) { // Ensure brazilDate is not null
                const monthKey = format(brazilDate, 'MMM/yy', { locale: ptBR });
                acc[monthKey] = (acc[monthKey] || 0) + 1; // Count freights
            }
        }
        return acc;
    }, {});

    const sortedMonthlyCounts = Object.entries(monthlyCounts)
        .map(([monthKey, count]) => ({
            month: monthKey, // Use 'month' as the key for chart
            value: count, // 'value' is now the count
            // Create a sortable date object from 'MMM/yy' format
            // The monthKey itself now accounts for Brazil timezone due to `toBrazilDateTime`
            sortDate: new Date(
                `01 ${monthKey.split('/')[0]} 20${monthKey.split('/')[1]}`
            ),
        }))
        .sort((a, b) => a.sortDate - b.sortDate)
        .map(({ month, value }) => ({ month, value })); // Map to { month, value } for the chart data

    setFreightsOverTime(sortedMonthlyCounts);

    // 6. KM by Carrier
    const carrierKms = maps.reduce((acc, map) => {
      if (map.selectedCarrier) {
        acc[map.selectedCarrier] = (acc[map.selectedCarrier] || 0) + (map.totalKm || 0);
      }
      return acc;
    }, {});

    setKmByCarrier(
      Object.entries(carrierKms)
        .map(([name, value]) => ({ name, value })) // Changed totalKm to value
        .sort((a, b) => b.value - a.value) // Changed totalKm to value
    );

    // 7. Average Savings Percentage by Carrier (New)
    const carrierSavingsPercentage = maps.reduce((acc, map) => {
      const carrierName = map.selectedCarrier;
      const proposalValue = map.carrierProposals?.[carrierName];
      const finalValue = map.finalValue;

      // Only calculate if we have the original proposal value, it's positive, and final value exists
      if (proposalValue && proposalValue > 0 && finalValue !== undefined && finalValue !== null) {
        if (!acc[carrierName]) {
          acc[carrierName] = { sumPercentages: 0, count: 0 };
        }
        const percentage = (finalValue / proposalValue) * 100; // % of final value relative to proposal
        acc[carrierName].sumPercentages += percentage;
        acc[carrierName].count++;
      }
      return acc;
    }, {});

    const avgSavingsPercentageData = Object.entries(carrierSavingsPercentage).map(([name, data]) => {
      const avgPercentage = data.count > 0 ? data.sumPercentages / data.count : 0;
      return {
        name,
        value: parseFloat(avgPercentage.toFixed(2))
      };
    }).sort((a, b) => a.value - b.value); // Sort ascending, lower percentage (more savings) is better

    setSavingsPercentageByCarrier(avgSavingsPercentageData);


    // Process percentage data for the new chart
    const totalMapValue = maps.reduce((sum, map) => sum + map.mapValue, 0);
    const totalFinalValue = maps.reduce((sum, map) => sum + map.finalValue, 0);
    const percentage = totalMapValue > 0 ? (totalFinalValue / totalMapValue) * 100 : 0;
    const savings = totalMapValue - totalFinalValue;
    const savingsPercentage = totalMapValue > 0 ? (savings / totalMapValue) * 100 : 0;

    setValuePercentageData({
      totalMapValue,
      totalFinalValue,
      percentage,
      savings,
      savingsPercentage
    });

    // NEW: Processamento de valor por KM por cidade e estado for Google Charts
    const gc_valuePerKmByCity = [['Cidade', 'Valor por KM (R$)']];
    const gc_valuePerKmByState = [['Estado', 'Valor por KM (R$)']];

    const cityKmData = {};
    const stateKmData = {};

    maps.forEach(freight => {
      if (freight.status === 'contracted' && freight.finalValue && freight.totalKm > 0) {
        // Por cidade (destino)
        if (freight.destination) {
          const cityParts = freight.destination.split('/');
          const city = cityParts.length > 0 ? cityParts[0]?.trim() : '';
          if (city && city !== '') {
            if (!cityKmData[city]) {
              cityKmData[city] = { totalValue: 0, totalKm: 0 };
            }
            cityKmData[city].totalValue += freight.finalValue;
            cityKmData[city].totalKm += freight.totalKm;
          }
        }

        // Por estado (destino)
        if (freight.destination) {
          const stateParts = freight.destination.split('/');
          const state = stateParts.length > 1 ? stateParts[1]?.trim() : '';
          if (state && state !== '') {
            if (!stateKmData[state]) {
              stateKmData[state] = { totalValue: 0, totalKm: 0 };
            }
            stateKmData[state].totalValue += freight.finalValue;
            stateKmData[state].totalKm += freight.totalKm;
          }
        }
      }
    });

    // Convert aggregated data to Google Charts format
    Object.entries(cityKmData).forEach(([city, data]) => {
      const avgValuePerKm = data.totalKm > 0 ? data.totalValue / data.totalKm : 0;
      gc_valuePerKmByCity.push([city, parseFloat(avgValuePerKm.toFixed(2))]);
    });

    Object.entries(stateKmData).forEach(([state, data]) => {
      const avgValuePerKm = data.totalKm > 0 ? data.totalValue / data.totalKm : 0;
      gc_valuePerKmByState.push([state, parseFloat(avgValuePerKm.toFixed(2))]);
    });

    setChartsData({
      valuePerKmByCity: gc_valuePerKmByCity,
      valuePerKmByState: gc_valuePerKmByState
    });
  };

  const onPieEnter = (_, index) => {
    setActivePieIndex(index);
  };

  // Funções para controlar o modal
  const openChartModal = (content) => {
    setModalContent(content);
  };

  const closeChartModal = () => {
    setModalContent(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto" />
          <p className="mt-4 text-lg text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  const ChartCard = ({ title, icon, children, onExpand }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-700 flex items-center pr-2">
          {icon}
          {title}
        </h3>
        {onExpand && (
          <Button variant="ghost" size="icon" onClick={onExpand} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <Expand className="w-5 h-5" />
          </Button>
        )}
      </div>
      <div className="flex-grow">{children}</div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50/50 min-h-screen">
      <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
        <BarChartIcon className="w-8 h-8 mr-3 text-green-600" />
        Análise Gráfica de Fretes
      </h2>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modalidade
              </label>
              <Select value={selectedModality} onValueChange={setSelectedModality}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as Modalidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Modalidades</SelectItem>
                  <SelectItem value="paletizados">Paletizados</SelectItem>
                  <SelectItem value="bag">BAG</SelectItem>
                  <SelectItem value="granel">Granel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gerente
              </label>
              <Select value={selectedManager} onValueChange={setSelectedManager}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os gerentes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os gerentes</SelectItem>
                  {/* ✅ CORRIGIDO: Usar managerOptions em vez de lista hardcoded */}
                  {managerOptions.map(manager => (
                    <SelectItem key={manager} value={manager}>
                      {manager}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-center">
          <DollarSign className="w-8 h-8 mx-auto text-green-600 mb-2" />
          <p className="text-sm text-green-800 font-medium">Total Gasto em Frete</p>
          <p className="text-3xl font-bold text-green-700">
            R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 text-center">
          <Map className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
          <p className="text-sm text-yellow-800 font-medium">Valor Mapa Agregado</p>
          <p className="text-3xl font-bold text-yellow-700">
            R$ {valuePercentageData.totalMapValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-teal-50 p-6 rounded-lg border border-teal-200 text-center">
          <SavingsIcon className="w-8 h-8 mx-auto text-teal-600 mb-2" />
          <p className="text-sm text-teal-800 font-medium">Economia Gerada</p>
          <p className="text-3xl font-bold text-teal-700">
            R$ {valuePercentageData.savings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 text-center">
          <Percent className="w-8 h-8 mx-auto text-purple-600 mb-2" />
          <p className="text-sm text-purple-800 font-medium">% do Valor Mapa</p>
          <p className="text-3xl font-bold text-purple-700">
            {valuePercentageData.percentage.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* CHARTS AREA OR NO DATA MESSAGE */}
      {freightData.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-white rounded-lg shadow-md">
          <PieChartIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold">Nenhum dado para exibir</h3>
          <p className="mt-2">Não há fretes contratados para gerar os gráficos.</p>
        </div>
      ) : valueByCarrier.length === 0 && (selectedModality !== 'all' || selectedManager !== 'all') ? (
         <div className="text-center py-16 text-gray-500 bg-white rounded-lg shadow-md">
            <Filter className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold">Nenhum resultado encontrado com os filtros.</h3>
            <p className="mt-2">Tente ajustar ou limpar os filtros para encontrar dados.</p>
        </div>
      ) : (
        <>
          {/* NEW CHARTS: Value per KM */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard
              title="Valor por KM por Cidade (Destino)"
              icon={<MapPin className="w-5 h-5 mr-2 text-purple-600" />}
              onExpand={() => openChartModal({
                title: 'Valor por KM por Cidade (Destino)',
                type: 'google-column',
                data: chartsData.valuePerKmByCity,
                tableHeaders: ['Cidade', 'Valor por KM (R$)'],
                valueFormatter: (val) => formatCurrency(val),
                options: {
                  title: 'Valor Médio por Quilômetro por Cidade',
                  hAxis: { title: 'Cidade' },
                  vAxis: { title: 'R$ por KM', format: 'R$ #,##0.00' },
                  colors: ['#8b5cf6'],
                  backgroundColor: 'transparent',
                  titleTextStyle: { color: '#374151', fontSize: 16 },
                  legend: { position: 'none' },
                  chartArea: { width: '80%', height: '70%' } // Added chartArea for modal view
                }
              })}
            >
                {chartsData.valuePerKmByCity && chartsData.valuePerKmByCity.length > 1 ? (
                  <Chart
                    chartType="ColumnChart"
                    data={chartsData.valuePerKmByCity}
                    options={{ colors: ['#8b5cf6'], backgroundColor: 'transparent', legend: { position: 'none' } }}
                    width="100%"
                    height="400px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>Sem dados suficientes para exibir o gráfico</p>
                  </div>
                )}
            </ChartCard>

            <ChartCard
              title="Valor por KM por Estado (Destino)"
              icon={<Map className="w-5 h-5 mr-2 text-indigo-600" />}
              onExpand={() => openChartModal({
                title: 'Valor por KM por Estado (Destino)',
                type: 'google-bar', // Changed type to google-bar for modal
                data: chartsData.valuePerKmByState,
                tableHeaders: ['Estado', 'Valor por KM (R$)'],
                valueFormatter: (val) => formatCurrency(val),
                options: {
                  title: 'Valor Médio por Quilômetro por Estado',
                  hAxis: { title: 'R$ por KM', format: 'R$ #,##0.00' },
                  vAxis: { title: 'Estado' },
                  colors: ['#4f46e5'],
                  backgroundColor: 'transparent',
                  titleTextStyle: { color: '#374151', fontSize: 16 },
                  legend: { position: 'none' },
                  chartArea: { width: '70%', height: '80%' } // Added chartArea for modal view
                }
              })}
            >
                {chartsData.valuePerKmByState && chartsData.valuePerKmByState.length > 1 ? (
                  <Chart
                    chartType="BarChart" // Changed to BarChart for consistency with outline's implied preference for modal
                    data={chartsData.valuePerKmByState}
                    options={{ colors: ['#4f46e5'], backgroundColor: 'transparent', legend: { position: 'none' } }}
                    width="100%"
                    height="400px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>Sem dados suficientes para exibir o gráfico</p>
                  </div>
                )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartCard
              title="Valor Total por Transportadora (R$)"
              icon={<DollarSign className="w-5 h-5 mr-2 text-green-500" />}
              onExpand={() => openChartModal({
                title: 'Valor Total por Transportadora (R$)',
                type: 'recharts-bar',
                data: valueByCarrier,
                dataKey: 'value',
                nameKey: 'name',
                chartName: 'Valor Total',
                tableHeaders: ['Transportadora', 'Valor (R$)'],
                valueFormatter: (val) => formatCurrency(val)
              })}
            >
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={valueByCarrier} margin={{ top: 5, right: 20, left: 30, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} style={{ fontSize: '12px' }} />
                  <YAxis tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [`R$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Valor Total"]} />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="value" fill="#22c55e" name="Valor Total" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Contagem de Fretes por Estado (Destino)"
              icon={<Map className="w-5 h-5 mr-2 text-blue-500" />}
              onExpand={() => openChartModal({
                title: 'Contagem de Fretes por Estado (Destino)',
                type: 'recharts-pie', // Changed to pie as per outline
                data: countByState,
                tableHeaders: ['Estado', 'Nº de Fretes'],
                valueFormatter: (val) => val
              })}
            >
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    activeIndex={activePieIndex}
                    activeShape={renderActiveShape}
                    data={countByState}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    fill="#3b82f6"
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                  >
                   {countByState.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Distribuição por Modalidade de Carregamento"
              icon={<Truck className="w-5 h-5 mr-2 text-purple-500" />}
              onExpand={() => openChartModal({
                title: 'Distribuição por Modalidade de Carregamento',
                type: 'recharts-pie',
                data: loadingModeDist,
                tableHeaders: ['Modalidade', 'Nº de Fretes'],
                valueFormatter: (val) => val
              })}
            >
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={loadingModeDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={80} // Set inner and outer for a donut
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                   {loadingModeDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Economia Média por Transportadora (R$)"
              icon={<SavingsIcon className="w-5 h-5 mr-2 text-teal-500" />}
              onExpand={() => openChartModal({
                title: 'Economia Média por Transportadora (R$)',
                type: 'recharts-bar',
                data: savingsByCarrier,
                dataKey: 'value',
                nameKey: 'name',
                chartName: 'Economia Média',
                tableHeaders: ['Transportadora', 'Economia (R$)'],
                valueFormatter: (val) => formatCurrency(val)
              })}
            >
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={savingsByCarrier} margin={{ top: 5, right: 20, left: 30, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} style={{ fontSize: '12px' }}/>
                  <YAxis tickFormatter={(value) => `R$${value.toFixed(0)}`} />
                  <Tooltip formatter={(value) => [`R$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Economia Média"]} />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="value" fill="#14b8a6" name="Economia Média" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* NEW CHART: % do Valor Final / Proposta Inicial */}
            <ChartCard
              title="% do Valor Final / Proposta Inicial"
              icon={<Percent className="w-5 h-5 mr-2 text-orange-500" />}
              onExpand={() => openChartModal({
                title: '% do Valor Final / Proposta Inicial',
                type: 'recharts-bar',
                data: savingsPercentageByCarrier,
                dataKey: 'value',
                nameKey: 'name',
                chartName: '% Valor Final vs Proposta',
                tableHeaders: ['Transportadora', 'Média do Valor Final (%)'],
                valueFormatter: (val) => `${val.toFixed(2)}%`,
                yAxisDomain: [0, 110]
              })}
            >
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={savingsPercentageByCarrier} margin={{ top: 5, right: 20, left: 30, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} style={{ fontSize: '12px' }}/>
                  <YAxis tickFormatter={(value) => `${value.toFixed(0)}%`} domain={[0, 110]} />
                  <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, "Média do Valor Final"]} />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="value" fill="#f97316" name="% Valor Final vs Proposta" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Quilometragem Total por Transportadora"
              icon={<Route className="w-5 h-5 mr-2 text-cyan-500" />}
              onExpand={() => openChartModal({
                title: 'Quilometragem Total por Transportadora',
                type: 'recharts-bar',
                data: kmByCarrier,
                dataKey: 'value',
                nameKey: 'name',
                chartName: 'Distância Total',
                tableHeaders: ['Transportadora', 'Distância (km)'],
                valueFormatter: (val) => `${val.toLocaleString('pt-BR')} km`,
                layout: 'vertical'
              })}
            >
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={kmByCarrier} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `${(value/1000).toFixed(1)}k km`} />
                  <YAxis type="category" dataKey="name" style={{ fontSize: '12px' }} />
                  <Tooltip formatter={(value) => [`${value.toLocaleString('pt-BR')} km`, "KM Total"]} />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="value" name="Quilometragem Total" fill="#2E7D32" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard
            title="Volume de Fretes Contratados ao Longo do Tempo"
            icon={<TrendingUp className="w-5 h-5 mr-2 text-fuchsia-500" />}
            onExpand={() => openChartModal({
              title: 'Volume de Fretes Contratados ao Longo do Tempo',
              type: 'recharts-bar',
              data: freightsOverTime,
              dataKey: 'value', // Corrected from 'count' in outline
              nameKey: 'month', // Corrected from 'date' in outline
              chartName: 'Nº Fretes',
              tableHeaders: ['Mês/Ano', 'Nº de Fretes'],
              valueFormatter: (val) => val
            })}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={freightsOverTime} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" style={{ fontSize: '12px' }} />
                <YAxis />
                <Tooltip />
                <Legend verticalAlign="top" />
                <Bar dataKey="value" fill="#6366f1" name="Nº de Fretes" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {/* Modal para Visualização do Gráfico */}
      <Dialog open={!!modalContent} onOpenChange={closeChartModal}>
        <DialogContent className="max-w-6xl w-full max-h-[90vh] flex flex-col bg-gray-50 p-0">
          <DialogHeader className="p-4 border-b bg-white rounded-t-lg flex-row items-center justify-between">
            <DialogTitle className="text-xl text-gray-800">
              {modalContent?.title}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={closeChartModal} className="rounded-full">
              <XIcon className="w-5 h-5" />
            </Button>
          </DialogHeader>

          <div className="flex-grow p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
            {/* Chart Area */}
            <div className="lg:col-span-2 bg-white rounded-lg p-4 shadow-sm border flex items-center justify-center h-full min-h-[400px]">
              {modalContent && (
                // Use a stable key for Google Charts to force re-render when modal content changes
                modalContent.type.startsWith('google') ? (
                  <Chart
                    key={modalContent.title} // Added key for Google Charts to ensure re-render on content change
                    chartType={modalContent.type === 'google-column' ? "ColumnChart" : "BarChart"}
                    width="100%"
                    height="100%" // Keep 100% as parent div has min-height
                    data={modalContent.data}
                    options={modalContent.options}
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {/* Recharts Bar Chart */}
                    {modalContent.type === 'recharts-bar' && (
                      <BarChart data={modalContent.data} layout={modalContent.layout || 'horizontal'} margin={{ top: 20, right: 30, left: modalContent.layout === 'vertical' ? 100 : 20, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        {modalContent.layout === 'vertical' ? (
                          <>
                            <XAxis type="number" tickFormatter={(value) => value.toLocaleString('pt-BR')} />
                            <YAxis dataKey={modalContent.nameKey} type="category" width={100} interval={0} style={{ fontSize: '12px' }}/>
                          </>
                        ) : (
                          <>
                            <XAxis dataKey={modalContent.nameKey} angle={-45} textAnchor="end" height={80} interval={0} style={{ fontSize: '12px' }} />
                            <YAxis tickFormatter={(value) => value.toLocaleString('pt-BR')} domain={modalContent.yAxisDomain} />
                          </>
                        )}
                        <Tooltip
                          formatter={modalContent.valueFormatter ? (val) => [modalContent.valueFormatter(val), modalContent.chartName] : (val) => [val, modalContent.chartName]}
                          cursor={{fill: 'rgba(239, 246, 255, 0.5)'}}
                        />
                        <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />
                        <Bar dataKey={modalContent.dataKey} name={modalContent.chartName} fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )}
                    {/* Recharts Pie Chart */}
                    {modalContent.type === 'recharts-pie' && (
                      <PieChart>
                        <Pie dataKey="value" data={modalContent.data} cx="50%" cy="50%" outerRadius={150} labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                          {modalContent.data.map((_, index) => <Cell key={`cell-${index}`} fill={['#3b82f6', '#1d4ed8', '#1e40af', '#f97316', '#ea580c', '#c2410c'][index % 6]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => [value, "Nº de Fretes"]} />
                        <Legend />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                )
              )}
            </div>

            {/* Data Table Area */}
            <div className="lg:col-span-1 bg-white rounded-lg border shadow-sm flex flex-col h-full">
              <h4 className="p-4 text-lg font-semibold border-b text-gray-700 flex-shrink-0">Dados Detalhados</h4>
              <div className="flex-grow overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                      <tr>
                        {modalContent?.tableHeaders?.map((header, i) => (
                          <th key={i} className="p-3 font-medium text-gray-600 whitespace-nowrap">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {modalContent?.data?.slice(modalContent.type.startsWith('google') ? 1 : 0).map((row, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-3 whitespace-nowrap">
                            {modalContent.type.startsWith('google') ? row[0] : row[modalContent.nameKey || 'name']}
                          </td>
                          <td className="p-3 font-medium whitespace-nowrap">
                            {modalContent.valueFormatter
                              ? modalContent.valueFormatter(modalContent.type.startsWith('google') ? row[1] : row[modalContent.dataKey || 'value'])
                              : (modalContent.type.startsWith('google') ? row[1] : row[modalContent.dataKey || 'value'])
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 border-t bg-white rounded-b-lg">
            <Button variant="outline" onClick={closeChartModal}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
