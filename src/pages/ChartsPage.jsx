
import React, { useState, useEffect } from 'react';
import { FreightMap } from "@/components/ApiDatabase";
import { BarChart as BarChartIcon, PieChart as PieChartIcon, TrendingUp, Loader2, DollarSign, Map, Truck, TrendingDown as SavingsIcon, Percent, Filter, User as UserIcon, MapPin, Expand, X as XIcon } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector
} from 'recharts';
import { format, parseISO } from 'date-fns';
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
  DialogClose
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
  const [availableManagers, setAvailableManagers] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0); // New metric

  // NOVO ESTADO: Para controlar o modal de visualização do gráfico
  const [modalContent, setModalContent] = useState(null);

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

      // Extract unique managers for the filter dropdown
      const managers = [...new Set(maps.flatMap(map => map.managers ? map.managers.map(m => m.gerente) : []))];
      setAvailableManagers(managers.sort());

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
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
        <p className="ml-4 text-lg text-gray-600">Carregando gráficos...</p>
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
    <div className="p-6 space-y-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
        <BarChartIcon className="w-8 h-8 mr-3 text-green-600" />
        Análise Gráfica de Fretes
      </h2>

      {/* FILTERS SECTION */}
      <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center text-gray-600 font-semibold">
          <Filter className="w-5 h-5 mr-2"/>
          Filtros:
        </div>
        <div className="w-full md:w-auto min-w-[180px]">
          <Select value={selectedModality} onValueChange={setSelectedModality}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por modalidade..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Modalidades</SelectItem>
              <SelectItem value="paletizados">Paletizados</SelectItem>
              <SelectItem value="bag">BAG</SelectItem>
              <SelectItem value="granel">Granel</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-auto min-w-[180px]">
          <Select value={selectedManager} onValueChange={setSelectedManager} disabled={availableManagers.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por gerente..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Gerentes</SelectItem>
              {availableManagers.map(manager => (
                <SelectItem key={manager} value={manager}>{manager}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
                options: {
                  title: 'Valor Médio por Quilômetro por Cidade', hAxis: { title: 'Cidade' }, vAxis: { title: 'R$ por KM' }, colors: ['#8b5cf6'], backgroundColor: 'transparent', titleTextStyle: { color: '#374151', fontSize: 16 }, legend: { position: 'none' }
                }
              })}
            >
                {chartsData.valuePerKmByCity && chartsData.valuePerKmByCity.length > 1 ? (
                  <Chart
                    chartType="ColumnChart"
                    data={chartsData.valuePerKmByCity}
                    options={{ colors: ['#8b5cf6'], backgroundColor: 'transparent', legend: { position: 'none' } }}
                    width="100%"
                    height="300px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>Sem dados suficientes para exibir o gráfico</p>
                  </div>
                )}
            </ChartCard>

            <ChartCard
              title="Valor por KM por Estado (Destino)"
              icon={<MapPin className="w-5 h-5 mr-2 text-indigo-600" />}
              onExpand={() => openChartModal({
                title: 'Valor por KM por Estado (Destino)',
                type: 'google-column',
                data: chartsData.valuePerKmByState,
                options: {
                  title: 'Valor Médio por Quilômetro por Estado', hAxis: { title: 'Estado' }, vAxis: { title: 'R$ por KM' }, colors: ['#6366f1'], backgroundColor: 'transparent', titleTextStyle: { color: '#374151', fontSize: 16 }, legend: { position: 'none' }
                }
              })}
            >
                {chartsData.valuePerKmByState && chartsData.valuePerKmByState.length > 1 ? (
                  <Chart
                    chartType="ColumnChart"
                    data={chartsData.valuePerKmByState}
                    options={{ colors: ['#6366f1'], backgroundColor: 'transparent', legend: { position: 'none' } }}
                    width="100%"
                    height="300px"
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
                type: 'bar',
                data: valueByCarrier,
                yAxisFormatter: (value) => `R$${(value/1000).toFixed(0)}k`,
                tooltipFormatter: (value) => [`R$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Valor Total"],
                barFill: "#22c55e",
                barName: "Valor Total"
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
                type: 'bar-vertical',
                data: countByState,
                tooltipFormatter: (value) => [value, "Nº de Fretes"],
                barFill: "#3b82f6",
                barName: "Nº de Fretes"
              })}
            >
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={countByState} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" style={{ fontSize: '12px' }} />
                  <Tooltip formatter={(value) => [value, "Nº de Fretes"]} />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="value" fill="#3b82f6" name="Nº de Fretes" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Distribuição por Modalidade de Carregamento"
              icon={<Truck className="w-5 h-5 mr-2 text-purple-500" />}
              onExpand={() => openChartModal({
                title: 'Distribuição por Modalidade de Carregamento',
                type: 'pie',
                data: loadingModeDist
              })}
            >
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    activeIndex={activePieIndex}
                    activeShape={renderActiveShape}
                    data={loadingModeDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    onMouseEnter={onPieEnter}
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
                type: 'bar',
                data: savingsByCarrier,
                yAxisFormatter: (value) => `R$${value.toFixed(0)}`,
                tooltipFormatter: (value) => [`R$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Economia Média"],
                barFill: "#14b8a6",
                barName: "Economia Média"
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
                type: 'bar',
                data: savingsPercentageByCarrier,
                yAxisFormatter: (value) => `${value.toFixed(0)}%`,
                tooltipFormatter: (value) => [`${value.toFixed(2)}%`, "Média do Valor Final"],
                barFill: "#f97316",
                barName: "% Valor Final vs Proposta",
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
              icon={<Truck className="w-5 h-5 mr-2 text-indigo-500" />}
              onExpand={() => openChartModal({
                title: 'Quilometragem Total por Transportadora',
                type: 'bar',
                data: kmByCarrier,
                yAxisFormatter: (value) => `${(value/1000).toFixed(1)}k km`,
                tooltipFormatter: (value) => [`${value.toLocaleString('pt-BR')} km`, "KM Total"],
                barFill: "#2E7D32",
                barName: "Quilometragem Total"
              })}
            >
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={kmByCarrier} margin={{ top: 5, right: 30, left: 40, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} style={{ fontSize: '12px' }}/>
                  <YAxis tickFormatter={(value) => `${(value/1000).toFixed(1)}k km`} />
                  <Tooltip formatter={(value) => [`${value.toLocaleString('pt-BR')} km`, "KM Total"]} />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="value" name="Quilometragem Total" fill="#2E7D32" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard
            title="Volume de Fretes Contratados ao Longo do Tempo"
            icon={<TrendingUp className="w-5 h-5 mr-2 text-indigo-500" />}
            onExpand={() => openChartModal({
              title: 'Volume de Fretes Contratados ao Longo do Tempo',
              type: 'bar',
              data: freightsOverTime,
              xAxisDataKey: "month", // Special case for freightsOverTime
              barFill: "#6366f1",
              barName: "Nº de Fretes"
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
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-2xl">{modalContent?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-grow p-6 overflow-y-auto">
            {modalContent?.type === 'google-column' ? (
              <Chart
                chartType="ColumnChart"
                data={modalContent.data}
                options={modalContent.options} // Pass the full options object
                width="100%"
                height="100%"
                legendToggle
              />
            ) : modalContent?.type === 'bar' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modalContent.data} margin={{ top: 20, right: 30, left: 40, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey={modalContent.xAxisDataKey || "name"} // Use specific dataKey or default to "name"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    tickFormatter={modalContent.yAxisFormatter}
                    domain={modalContent.yAxisDomain}
                  />
                  <Tooltip formatter={modalContent.tooltipFormatter} />
                  <Legend />
                  <Bar
                    dataKey="value"
                    fill={modalContent.barFill || COLORS[0]}
                    name={modalContent.barName || "Valor"}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : modalContent?.type === 'bar-vertical' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modalContent.data} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    style={{ fontSize: '12px' }}
                    width={120}
                  />
                  <Tooltip formatter={modalContent.tooltipFormatter} />
                  <Legend />
                  <Bar
                    dataKey="value"
                    fill={modalContent.barFill || COLORS[1]}
                    name={modalContent.barName || "Valor"}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : modalContent?.type === 'pie' && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modalContent.data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius="80%"
                    fill="#8884d8" // Default fill, cells will override
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {modalContent.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <DialogFooter className="p-4 border-t bg-gray-50">
            <Button onClick={closeChartModal} variant="outline">
              <XIcon className="w-4 h-4 mr-2" />
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
