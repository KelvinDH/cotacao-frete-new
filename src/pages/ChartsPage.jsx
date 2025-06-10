
import React, { useState, useEffect } from 'react';
import { FreightMap } from "@/api/entities";
import { BarChart as BarChartIcon, PieChart as PieChartIcon, TrendingUp, Loader2, DollarSign, Map, Truck, TrendingDown as SavingsIcon, Percent } from 'lucide-react'; // Added more icons
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Helper to get destination state
const statesList = ['SP', 'MS', 'MT', 'GO', 'TO', 'MG', 'RS', 'PE', 'PI', 'RR', 'PR', 'PA', 'BA', 'RO', 'MA'];
const getDestinationState = (destination) => {
  if (!destination) return 'N/A';
  const parts = destination.split('/');
  const state = parts.pop()?.trim().toUpperCase();
  return statesList.includes(state) ? state : 'Outro';
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82Ca9D', '#FF7F50', '#DC143C'];

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
  
  const [valueByCarrier, setValueByCarrier] = useState([]);
  const [countByState, setCountByState] = useState([]);
  const [loadingModeDist, setLoadingModeDist] = useState([]);
  const [savingsByCarrier, setSavingsByCarrier] = useState([]);
  const [freightsOverTime, setFreightsOverTime] = useState([]);
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [kmByCarrier, setKmByCarrier] = useState([]);
  const [valuePercentageData, setValuePercentageData] = useState({
    totalMapValue: 0,
    totalFinalValue: 0,
    percentage: 0,
    savings: 0,
    savingsPercentage: 0
  });

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const maps = await FreightMap.filter({ status: 'contracted' });
      setFreightData(maps);
      processDataForCharts(maps);
    } catch (error) {
      console.error("Error loading freight data for charts:", error);
    }
    setLoading(false);
  };

  const processDataForCharts = (maps) => {
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
    setCountByState(Object.entries(stateCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count));
    
    // 3. Loading Mode Distribution
    const modeCounts = maps.reduce((acc, map) => {
      const mode = map.loadingMode === 'paletizados' ? 'Paletizados' : 'BAG';
      acc[mode] = (acc[mode] || 0) + 1;
      return acc;
    }, {});
    setLoadingModeDist(Object.entries(modeCounts).map(([name, value]) => ({ name, value })));

    // 4. Savings by Carrier
    const carrierSavings = maps.reduce((acc, map) => {
        const proposal = map.carrierProposals[map.selectedCarrier] || map.finalValue; // fallback if proposal missing
        const saving = proposal - map.finalValue;
        acc[map.selectedCarrier] = (acc[map.selectedCarrier] || 0) + saving;
        return acc;
    }, {});
    setSavingsByCarrier(Object.entries(carrierSavings).map(([name, savings]) => ({name, savings})).sort((a,b) => b.savings - a.savings));

    // 5. Freights (Value) Over Time (Monthly)
    const monthlyValues = maps.reduce((acc, map) => {
        if (map.contractedAt) {
            const monthYear = format(parseISO(map.contractedAt), 'MMM/yy', { locale: ptBR });
            acc[monthYear] = (acc[monthYear] || 0) + map.finalValue;
        }
        return acc;
    }, {});

    const sortedMonthlyValues = Object.entries(monthlyValues)
        .map(([monthYear, value]) => ({
            monthYear,
            value,
            sortDate: new Date(
                `01 ${monthYear.split('/')[0]} 20${monthYear.split('/')[1]}`
            ),
        }))
        .sort((a, b) => a.sortDate - b.sortDate) 
        .map(({ monthYear, value }) => ({ name: monthYear, value })); 

    setFreightsOverTime(sortedMonthlyValues);

    const carrierKms = maps.reduce((acc, map) => {
      if (map.selectedCarrier) {
        acc[map.selectedCarrier] = (acc[map.selectedCarrier] || 0) + (map.totalKm || 0);
      }
      return acc;
    }, {});
    
    setKmByCarrier(
      Object.entries(carrierKms)
        .map(([name, totalKm]) => ({ name, totalKm }))
        .sort((a, b) => b.totalKm - a.totalKm)
    );

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
  };

  const onPieEnter = (_, index) => {
    setActivePieIndex(index);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
        <p className="ml-4 text-lg text-gray-600">Carregando gráficos...</p>
      </div>
    );
  }
  
  if (freightData.length === 0) {
      return (
          <div className="text-center py-12">
              <BarChartIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700">Sem Dados para Gráficos</h3>
              <p className="text-gray-500">Não há fretes contratados suficientes para gerar gráficos.</p>
          </div>
      )
  }

  const ChartCard = ({ title, icon, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
        {icon}
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        {children}
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="p-6 space-y-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
        <BarChartIcon className="w-8 h-8 mr-3 text-green-600" />
        Análise Gráfica de Fretes
      </h2>

      {/* New Percentage Value Card */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
          <Percent className="w-5 h-5 mr-2 text-purple-600" />
          Comparativo: Valor Final vs. Valor Mapa
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Percentage Visual */}
          <div className="col-span-1 lg:col-span-3 flex flex-col items-center justify-center">
            <div className="relative w-64 h-64">
              <div className="w-full h-full rounded-full border-8 border-gray-100" />
              <div 
                className="absolute top-0 left-0 border-8 border-green-500 rounded-full"
                style={{ 
                  width: '100%', 
                  height: '100%',
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin(valuePercentageData.percentage * 0.01 * 2 * Math.PI)}% ${50 - 50 * Math.cos(valuePercentageData.percentage * 0.01 * 2 * Math.PI)}%, 50% 50%)`
                }}
              />
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-600">
                    {valuePercentageData.percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                  </p>
                  <p className="text-sm text-gray-500">do Valor Mapa</p>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-6 font-medium">
              Valor Final representa {valuePercentageData.percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do Valor Mapa original
            </div>
          </div>

          {/* Values Cards */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm text-gray-600 mb-1">Valor Mapa Agregado</p>
            <p className="text-xl font-bold text-yellow-700">
              R$ {valuePercentageData.totalMapValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-gray-600 mb-1">Valor Final Agregado</p>
            <p className="text-xl font-bold text-green-700">
              R$ {valuePercentageData.totalFinalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
            <p className="text-sm text-gray-600 mb-1">Economia Gerada (R$)</p>
            <p className="text-xl font-bold text-teal-700">
              R$ {valuePercentageData.savings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              <span className="text-sm font-normal ml-2">
                ({valuePercentageData.savingsPercentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)
              </span>
            </p>
          </div>
        </div>

      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartCard title="Valor Total por Transportadora (R$)" icon={<DollarSign className="w-5 h-5 mr-2 text-green-500" />}>
          <BarChart data={valueByCarrier} margin={{ top: 5, right: 20, left: 30, bottom: 50 }}> {/* Increased bottom margin */}
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} style={{ fontSize: '12px' }} />
            <YAxis tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`} />
            <Tooltip formatter={(value) => [`R$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Valor Total"]} />
            <Legend verticalAlign="top" />
            <Bar dataKey="value" fill="#22c55e" name="Valor Total" />
          </BarChart>
        </ChartCard>

        <ChartCard title="Contagem de Fretes por Estado (Destino)" icon={<Map className="w-5 h-5 mr-2 text-blue-500" />}>
          <BarChart data={countByState} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" style={{ fontSize: '12px' }}/>
            <YAxis />
            <Tooltip formatter={(value) => [value, "Nº Fretes"]} />
            <Legend verticalAlign="top" />
            <Bar dataKey="count" fill="#8BC34A" name="Nº Fretes" />
          </BarChart>
        </ChartCard>

        <ChartCard title="Distribuição por Modalidade de Carregamento" icon={<PieChartIcon className="w-5 h-5 mr-2 text-yellow-500" />}>
          <PieChart>
            <Pie
              activeIndex={activePieIndex}
              activeShape={renderActiveShape}
              data={loadingModeDist}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#CDDC39"
              dataKey="value"
              onMouseEnter={onPieEnter}
            >
              {loadingModeDist.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [value, name]}/>
            <Legend verticalAlign="top" />
          </PieChart>
        </ChartCard>
        
        <ChartCard title="Economia Gerada por Transportadora (R$)" icon={<SavingsIcon className="w-5 h-5 mr-2 text-teal-500" />}>
          <BarChart data={savingsByCarrier} margin={{ top: 5, right: 20, left: 30, bottom: 50 }}> {/* Increased bottom margin */}
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} style={{ fontSize: '12px' }} />
            <YAxis tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`} />
            <Tooltip formatter={(value) => [`R$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Economia Total"]} />
            <Legend verticalAlign="top" />
            <Bar dataKey="savings" fill="#008B45" name="Economia" />
          </BarChart>
        </ChartCard>

        <ChartCard title="Quilometragem Total por Transportadora" icon={<Truck className="w-5 h-5 mr-2 text-indigo-500" />}>
          <BarChart data={kmByCarrier} margin={{ top: 5, right: 30, left: 40, bottom: 50 }}> {/* Increased bottom margin */}
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} style={{ fontSize: '12px' }}/>
            <YAxis tickFormatter={(value) => `${(value/1000).toFixed(1)}k km`} />
            <Tooltip formatter={(value) => [`${value.toLocaleString('pt-BR')} km`, "KM Total"]} />
            <Legend verticalAlign="top" />
            <Bar dataKey="totalKm" name="Quilometragem Total" fill="#2E7D32" />
          </BarChart>
        </ChartCard>
      </div>

       <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mt-8">
          <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
            <TrendingUp className="w-6 h-6 mr-2 text-blue-500" />
            Valor Total de Fretes Contratados ao Longo do Tempo (R$)
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={freightsOverTime} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" style={{ fontSize: '12px' }}/>
              <YAxis tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => [`R$${value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, "Valor Total no Mês"]} />
              <Legend verticalAlign="top" />
              <Bar dataKey="value" name="Valor Contratado" fill="#4A90E2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
    </div>
  );
}
