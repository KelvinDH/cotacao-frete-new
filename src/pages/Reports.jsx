
import React, { useState, useEffect } from 'react';
import { BarChart, TrendingDown, Percent, Package, ChevronDown, ChevronUp, MapPinned, X, DollarSign } from "lucide-react";
import { FreightMap } from "@/api/entities";
import { format } from "date-fns";

// Lista completa de estados brasileiros com siglas
const states = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Coordenadas SVG aproximadas para cada estado no mapa do Brasil (usadas para posicionar os textos)
const stateCoordinates = {
  'AC': { x: 85, y: 210 },
  'AL': { x: 480, y: 240 },
  'AP': { x: 310, y: 120 },
  'AM': { x: 180, y: 170 },
  'BA': { x: 420, y: 260 },
  'CE': { x: 450, y: 190 },
  'DF': { x: 350, y: 270 },
  'ES': { x: 430, y: 310 },
  'GO': { x: 340, y: 290 },
  'MA': { x: 380, y: 190 },
  'MT': { x: 270, y: 260 },
  'MS': { x: 280, y: 320 },
  'MG': { x: 380, y: 310 },
  'PA': { x: 300, y: 180 },
  'PB': { x: 470, y: 210 },
  'PR': { x: 310, y: 360 },
  'PE': { x: 460, y: 220 },
  'PI': { x: 400, y: 210 },
  'RJ': { x: 410, y: 340 },
  'RN': { x: 470, y: 200 },
  'RS': { x: 300, y: 420 },
  'RO': { x: 190, y: 240 },
  'RR': { x: 210, y: 120 },
  'SC': { x: 310, y: 390 },
  'SP': { x: 340, y: 340 },
  'SE': { x: 470, y: 250 },
  'TO': { x: 350, y: 230 }
};

// Caminhos SVG simplificados para cada estado brasileiro (para o mapa político)
const statePaths = {
  'AC': "M50,180 L100,170 L120,200 L90,230 L60,220 Z",
  'AL': "M460,220 L490,210 L500,240 L480,250 L470,240 Z",
  'AP': "M290,80 L320,70 L330,100 L310,120 L300,110 Z",
  'AM': "M80,140 L180,130 L200,180 L150,200 L100,190 Z",
  'BA': "M380,200 L450,190 L470,280 L420,300 L390,250 Z",
  'CE': "M430,160 L470,150 L480,190 L450,200 L440,180 Z",
  'DF': "M340,250 L360,240 L370,270 L350,280 Z",
  'ES': "M410,290 L440,280 L450,310 L420,320 Z",
  'GO': "M320,240 L380,230 L390,290 L340,300 L330,270 Z",
  'MA': "M360,150 L420,140 L430,190 L380,200 L370,170 Z",
  'MT': "M200,200 L320,190 L330,260 L220,270 L210,240 Z",
  'MS': "M220,270 L320,260 L330,330 L240,340 L230,300 Z",
  'MG': "M320,260 L410,250 L420,320 L340,330 L330,290 Z",
  'PA': "M200,120 L360,110 L370,170 L220,180 L210,150 Z",
  'PB': "M450,180 L480,170 L490,200 L460,210 Z",
  'PR': "M280,320 L340,310 L350,360 L290,370 Z",
  'PE': "M440,180 L480,170 L490,210 L450,220 L440,200 Z",
  'PI': "M370,170 L430,160 L440,210 L380,220 L370,190 Z",
  'RJ': "M380,310 L420,300 L430,340 L390,350 Z",
  'RN': "M450,150 L480,140 L490,170 L460,180 Z",
  'RS': "M250,370 L320,360 L330,420 L260,430 Z",
  'RO': "M140,200 L200,190 L210,240 L160,250 L150,220 Z",
  'RR': "M150,60 L220,50 L230,110 L170,120 L160,90 Z",
  'SC': "M280,360 L340,350 L350,390 L290,400 Z",
  'SP': "M320,310 L380,300 L390,350 L330,360 Z",
  'SE': "M450,220 L480,210 L490,240 L460,250 Z",
  'TO': "M330,190 L380,180 L390,240 L340,250 Z"
};

export default function ReportsPage() {
  const [freightMaps, setFreightMaps] = useState([]);
  const [expandedCarrierFreights, setExpandedCarrierFreights] = useState([]);
  const [expandedCarrierStates, setExpandedCarrierStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState(null);
  const [stateFreights, setStateFreights] = useState([]);
  const [stateHover, setStateHover] = useState(null);

  useEffect(() => {
    loadFreightMaps();
  }, []);

  useEffect(() => {
    if (selectedState) {
      filterFreightsByState(selectedState);
    }
  }, [selectedState, freightMaps]);

  const loadFreightMaps = async () => {
    const maps = await FreightMap.filter({ status: 'contracted' });
    setFreightMaps(maps);
    setLoading(false);
  };

  const toggleCarrierFreights = (carrier) => {
    setExpandedCarrierFreights(prev => 
      prev.includes(carrier)
        ? prev.filter(c => c !== carrier)
        : [...prev, carrier]
    );
  };

  const toggleCarrierStates = (carrier) => {
    setExpandedCarrierStates(prev => 
      prev.includes(carrier)
        ? prev.filter(c => c !== carrier)
        : [...prev, carrier]
    );
  };

  const getDestinationState = (destination) => {
    if (!destination) return '';
    const state = destination.split('/').pop()?.trim().toUpperCase() || '';
    return states.includes(state) ? state : '';
  };

  const selectState = (state) => {
    setSelectedState(state);
  };

  const clearStateSelection = () => {
    setSelectedState(null);
    setStateFreights([]);
  };

  const filterFreightsByState = (state) => {
    const filteredFreights = freightMaps.filter(freight => {
      const destinationState = getDestinationState(freight.destination);
      return destinationState === state;
    });
    setStateFreights(filteredFreights);
  };

  const getCarrierStats = () => {
    const stats = {};
    const freights = selectedState ? stateFreights : freightMaps;

    freights.forEach(map => {
      if (!stats[map.selectedCarrier]) {
        stats[map.selectedCarrier] = {
          freightCount: 0,
          totalValue: 0,
          totalSavings: 0,
          averageSavings: 0,
          freightList: [],
          loadsByState: {},
          loadingMode: map.loadingMode // Store loading mode for filtering
        };
      }

      const carrierStats = stats[map.selectedCarrier];
      const proposalValue = map.carrierProposals[map.selectedCarrier];
      
      carrierStats.freightCount++;
      carrierStats.totalValue += map.finalValue;
      carrierStats.totalSavings += (proposalValue - map.finalValue);
      carrierStats.freightList.push(map);

      // Process only destination state
      const destinationState = getDestinationState(map.destination);
      if (destinationState) {
        carrierStats.loadsByState[destinationState] = (carrierStats.loadsByState[destinationState] || 0) + 1;
      }

      carrierStats.averageSavings = carrierStats.totalSavings / carrierStats.freightCount;
    });

    return stats;
  };

  const getTotalStats = () => {
    const freights = selectedState ? stateFreights : freightMaps;
    const totalFreight = freights.length;
    const totalValue = freights.reduce((sum, map) => sum + map.finalValue, 0); // Sum of finalValue
    const totalMapValue = freights.reduce((sum, map) => sum + map.mapValue, 0); // Sum of mapValue
    const totalSavings = freights.reduce((sum, map) => {
      const proposalValue = map.carrierProposals[map.selectedCarrier];
      // Ensure proposalValue is a number, fallback to finalValue if not present or invalid, to avoid NaN savings.
      const validProposal = (typeof proposalValue === 'number' && !isNaN(proposalValue)) ? proposalValue : map.finalValue;
      return sum + (validProposal - map.finalValue);
    }, 0);

    const loadsByState = freights.reduce((acc, freight) => {
      const destinationState = getDestinationState(freight.destination);
      if (destinationState) {
        acc[destinationState] = (acc[destinationState] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      totalFreight,
      totalValue, // Sum of final contracted values
      totalMapValue, // Sum of initial map values
      totalSavings,
      // Average savings is still calculated for the per-state view if needed, but not shown in general summary
      averageSavings: totalFreight > 0 ? totalSavings / totalFreight : 0, 
      loadsByState
    };
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  // If a state is selected, show details for that state
  if (selectedState) {
    // Recalculate for the selected state's context
    const stateStats = {
      totalFreight: stateFreights.length,
      totalValue: stateFreights.reduce((sum, map) => sum + map.finalValue, 0),
      totalSavings: stateFreights.reduce((sum, map) => {
        const proposalValue = map.carrierProposals[map.selectedCarrier];
        const validProposal = (typeof proposalValue === 'number' && !isNaN(proposalValue)) ? proposalValue : map.finalValue;
        return sum + (validProposal - map.finalValue);
      }, 0),
      averageSavings: stateFreights.length > 0 
        ? stateFreights.reduce((sum, map) => {
            const proposalValue = map.carrierProposals[map.selectedCarrier];
            const validProposal = (typeof proposalValue === 'number' && !isNaN(proposalValue)) ? proposalValue : map.finalValue;
            return sum + (validProposal - map.finalValue);
          }, 0) / stateFreights.length
        : 0
    };
    
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <MapPinned className="w-6 h-6 mr-2 text-blue-600" />
            Fretes para {selectedState}
          </h2>
          <button 
            onClick={clearStateSelection}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <X className="w-5 h-5 mr-1" />
            Voltar ao resumo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Total de Fretes</p>
            <p className="text-2xl font-bold text-blue-600">{stateStats.totalFreight}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Valor Total (R$)</p>
            <p className="text-2xl font-bold text-blue-600">
              {stateStats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Economia Total (R$)</p>
            <p className="text-2xl font-bold text-green-600">
              {stateStats.totalSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Economia Média por Frete (R$)</p>
            <p className="text-2xl font-bold text-green-600">
              {stateStats.averageSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {stateFreights.length === 0 ? (
          <div className="text-center py-6 bg-white rounded-lg shadow">
            <p className="text-gray-500">Não há fretes registrados para o estado {selectedState}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stateFreights.map(freight => (
              <div key={freight.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-blue-500">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-800">Mapa: {freight.mapNumber}</h3>
                    <p className="text-sm text-gray-500">Contratado em: {format(new Date(freight.contractedAt), 'dd/MM/yyyy')}</p>
                  </div>
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {freight.loadingMode === 'paletizados' ? 'Paletizados' : 'BAG'}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Origem</p>
                    <p className="font-medium">{freight.origin}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Destino</p>
                    <p className="font-medium">{freight.destination}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Transportadora</p>
                    <p className="font-medium text-blue-600">{freight.selectedCarrier}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Valor Final</p>
                    <p className="font-medium text-green-600">
                      R$ {freight.finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Peso</p>
                    <p className="font-medium">{freight.weight} kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tipo de Caminhão</p>
                    <p className="font-medium">{freight.truckType}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Main Reports Page View (Resumo Geral)
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <BarChart className="w-6 h-6 mr-2 text-green-600" />
          Relatório de Fretes
        </h2>
      </div>

      {freightMaps.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Nenhum frete contratado ainda.
          <p className="mt-2 text-sm">
            Finalize as negociações na aba de Negociação para gerar relatórios.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-8 bg-blue-50 rounded-lg p-6 shadow-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Resumo Geral</h3>
            {(() => {
              const stats = getTotalStats();
              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                      <p className="text-sm text-gray-600">Total de Fretes</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.totalFreight}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
                      <p className="text-sm text-gray-600 flex items-center"><DollarSign className="w-4 h-4 mr-1 text-yellow-600"/>Valor Mapa Agregado (R$)</p>
                      <p className="text-2xl font-bold text-yellow-700">
                        {stats.totalMapValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                      <p className="text-sm text-gray-600 flex items-center"><DollarSign className="w-4 h-4 mr-1 text-green-600"/>Valor Final Agregado (R$)</p>
                      <p className="text-2xl font-bold text-green-700">
                        {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-teal-500">
                      <p className="text-sm text-gray-600 flex items-center"><TrendingDown className="w-4 h-4 mr-1 text-teal-600"/>Economia Total (R$)</p>
                      <p className="text-2xl font-bold text-teal-700">
                        {stats.totalSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Mapa do Brasil Interativo */}
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center mb-4">
                      <MapPinned className="w-5 h-5 text-blue-600 mr-2" />
                      <h4 className="text-lg font-semibold">Cargas por Estado (Destino)</h4>
                      <span className="text-sm text-gray-500 ml-2">Clique em um estado no mapa ou na lista abaixo</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      {/* Mapa SVG político do Brasil */}
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                        <svg viewBox="0 0 600 500" className="w-full h-auto">
                          {/* Definindo paths para cada estado brasileiro */}
                          {states.map(state => {
                            const count = stats.loadsByState[state] || 0;
                            const hasFreights = count > 0;
                            const isSelected = selectedState === state;
                            const isHovered = stateHover === state;
                            
                            // Cor baseada na seleção/hover/contagem
                            let fill = "#e5e7eb"; // Cinza para estados sem fretes
                            let stroke = "#94a3b8";
                            if (hasFreights) {
                              fill = "#dbeafe"; // Azul claro para estados com fretes
                              stroke = "#3b82f6";
                              if (isSelected || isHovered) {
                                fill = "#93c5fd"; // Azul mais intenso para selecionado/hover
                                stroke = "#1d4ed8";
                              }
                            }
                            
                            return (
                              <g key={state}>
                                <path
                                  d={statePaths[state]}
                                  fill={fill}
                                  stroke={stroke}
                                  strokeWidth={isSelected || isHovered ? "3" : "1"}
                                  opacity={hasFreights ? 1 : 0.6}
                                  className={`transition-all duration-200 ${hasFreights ? 'cursor-pointer' : 'cursor-default'}`}
                                  onClick={() => hasFreights && selectState(state)}
                                  onMouseEnter={() => setStateHover(state)}
                                  onMouseLeave={() => setStateHover(null)}
                                />
                                
                                {/* Label do estado */}
                                <text 
                                  x={stateCoordinates[state]?.x || 0} 
                                  y={stateCoordinates[state]?.y || 0} 
                                  textAnchor="middle" 
                                  dominantBaseline="middle"
                                  fill="#374151"
                                  fontSize="12"
                                  fontWeight="bold"
                                  pointerEvents="none"
                                >
                                  {state}
                                </text>
                                
                                {/* Contagem para estados com fretes */}
                                {hasFreights && (
                                  <text 
                                    x={stateCoordinates[state]?.x || 0} 
                                    y={(stateCoordinates[state]?.y || 0) + 15}
                                    textAnchor="middle"
                                    fill="#1e40af"
                                    fontSize="11"
                                    fontWeight="bold"
                                    className="text-shadow"
                                  >
                                    ({count})
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </svg>
                        
                        {/* Legenda do mapa */}
                        <div className="absolute bottom-2 right-2 bg-white bg-opacity-90 p-3 rounded-md text-xs border border-gray-200 shadow-sm">
                          <div className="flex items-center mb-2">
                            <div className="w-4 h-3 bg-blue-100 border border-blue-500 mr-2 rounded"></div>
                            <span>Estado com fretes</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-4 h-3 bg-gray-200 border border-gray-400 mr-2 rounded"></div>
                            <span>Sem fretes registrados</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Lista de estados */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-2">
                        {states.map(state => (
                          <button
                            key={state}
                            onClick={() => stats.loadsByState[state] && selectState(state)}
                            className={`p-3 rounded-lg text-left transition-all duration-200 transform hover:scale-105 ${
                              stats.loadsByState[state] 
                                ? 'bg-blue-100 hover:bg-blue-200 shadow-sm border border-blue-300 cursor-pointer' 
                                : 'bg-gray-100 cursor-default opacity-60'
                            } ${selectedState === state ? 'ring-2 ring-blue-500' : ''}`}
                            disabled={!stats.loadsByState[state]}
                            onMouseEnter={() => setStateHover(state)}
                            onMouseLeave={() => setStateHover(null)}
                          >
                            <p className="text-sm font-medium text-gray-700">{state}</p>
                            <p className={`text-xl font-bold ${stats.loadsByState[state] ? 'text-blue-700' : 'text-gray-400'}`}>
                              {stats.loadsByState[state] || 0}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Relatório por Transportadora section */}
          <div className="space-y-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-0">Relatório por Transportadora</h3>
            
            {/* Paletizados Section */}
            <div className="bg-sky-50 p-6 rounded-lg shadow-md">
              <h4 className="text-lg font-semibold text-sky-700 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Modalidade: Paletizados
              </h4>
              <div className="space-y-4">
                {Object.entries(getCarrierStats())
                  .filter(([_, stats]) => stats.loadingMode === 'paletizados')
                  .map(([carrier, stats]) => {
                    const isExpandedFreights = expandedCarrierFreights.includes(`${carrier}-paletizados-freights`);
                    const isExpandedStates = expandedCarrierStates.includes(`${carrier}-paletizados-states`);
                    
                    return (
                      <div key={`${carrier}-paletizados`} className="border bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-md font-semibold text-gray-700">{carrier}</h5>
                          <span className="text-sm text-gray-500 bg-sky-100 px-2 py-1 rounded-full">
                            {stats.freightCount} {stats.freightCount === 1 ? 'frete' : 'fretes'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <div className="bg-gray-100 p-2 rounded">
                            <p className="text-xs text-gray-500">Valor Total (R$)</p>
                            <p className="text-sm font-semibold text-gray-700">
                              {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="bg-gray-100 p-2 rounded">
                            <p className="text-xs text-gray-500">Economia Total (R$)</p>
                            <p className="text-sm font-semibold text-green-600">
                              {stats.totalSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="bg-gray-100 p-2 rounded">
                            <p className="text-xs text-gray-500">Economia Média (R$)</p>
                            <p className="text-sm font-semibold text-green-600">
                              {stats.averageSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <button
                            onClick={() => toggleCarrierStates(`${carrier}-paletizados-states`)}
                            className="flex items-center justify-between gap-2 text-gray-600 hover:text-sky-700 transition-colors duration-200 w-full text-sm py-1 px-2 rounded bg-sky-100 hover:bg-sky-200"
                          >
                            <span className="font-medium">Cargas por Estado (Destino)</span>
                            {isExpandedStates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {isExpandedStates && (
                            <div className="bg-white p-3 rounded-md border border-sky-200">
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {states.map(state => (
                                  <div key={state} className="p-1.5 bg-sky-50 rounded border border-sky-100 text-center">
                                    <p className="text-xs font-medium text-gray-500">{state}</p>
                                    <p className="text-sm font-semibold text-sky-700">
                                      {stats.loadsByState[state] || 0}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => toggleCarrierFreights(`${carrier}-paletizados-freights`)}
                             className="flex items-center justify-between gap-2 text-gray-600 hover:text-sky-700 transition-colors duration-200 w-full text-sm py-1 px-2 rounded bg-sky-100 hover:bg-sky-200"
                          >
                            <span className="font-medium">Fretes Realizados</span>
                             {isExpandedFreights ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {isExpandedFreights && (
                            <div className="space-y-2 text-xs max-h-48 overflow-y-auto p-2 bg-white border border-sky-200 rounded-md">
                              {stats.freightList.map(freight => (
                                <div key={freight.id} className="bg-sky-50 p-2 rounded border border-sky-100">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium">Mapa: {freight.mapNumber}</span>
                                    <span className="text-gray-500">{format(new Date(freight.contractedAt), 'dd/MM/yy')}</span>
                                  </div>
                                  <p>Dest: {freight.destination} | Valor: R$ {freight.finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {Object.entries(getCarrierStats()).filter(([_, stats]) => stats.loadingMode === 'paletizados').length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">Nenhum frete paletizado registrado.</p>
                  )}
              </div>
            </div>

            {/* BAG Section */}
            <div className="bg-purple-50 p-6 rounded-lg shadow-md">
              <h4 className="text-lg font-semibold text-purple-700 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Modalidade: BAG
              </h4>
              <div className="space-y-4">
                {Object.entries(getCarrierStats())
                  .filter(([_, stats]) => stats.loadingMode === 'bag')
                  .map(([carrier, stats]) => {
                    const isExpandedFreights = expandedCarrierFreights.includes(`${carrier}-bag-freights`);
                    const isExpandedStates = expandedCarrierStates.includes(`${carrier}-bag-states`);
                    
                    return (
                       <div key={`${carrier}-bag`} className="border bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-md font-semibold text-gray-700">{carrier}</h5>
                          <span className="text-sm text-gray-500 bg-purple-100 px-2 py-1 rounded-full">
                            {stats.freightCount} {stats.freightCount === 1 ? 'frete' : 'fretes'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <div className="bg-gray-100 p-2 rounded">
                            <p className="text-xs text-gray-500">Valor Total (R$)</p>
                            <p className="text-sm font-semibold text-gray-700">
                              {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="bg-gray-100 p-2 rounded">
                            <p className="text-xs text-gray-500">Economia Total (R$)</p>
                            <p className="text-sm font-semibold text-green-600">
                              {stats.totalSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="bg-gray-100 p-2 rounded">
                            <p className="text-xs text-gray-500">Economia Média (R$)</p>
                            <p className="text-sm font-semibold text-green-600">
                              {stats.averageSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <button
                            onClick={() => toggleCarrierStates(`${carrier}-bag-states`)}
                             className="flex items-center justify-between gap-2 text-gray-600 hover:text-purple-700 transition-colors duration-200 w-full text-sm py-1 px-2 rounded bg-purple-100 hover:bg-purple-200"
                          >
                            <span className="font-medium">Cargas por Estado (Destino)</span>
                             {isExpandedStates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {isExpandedStates && (
                            <div className="bg-white p-3 rounded-md border border-purple-200">
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {states.map(state => (
                                  <div key={state} className="p-1.5 bg-purple-50 rounded border border-purple-100 text-center">
                                    <p className="text-xs font-medium text-gray-500">{state}</p>
                                    <p className="text-sm font-semibold text-purple-700">
                                      {stats.loadsByState[state] || 0}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => toggleCarrierFreights(`${carrier}-bag-freights`)}
                            className="flex items-center justify-between gap-2 text-gray-600 hover:text-purple-700 transition-colors duration-200 w-full text-sm py-1 px-2 rounded bg-purple-100 hover:bg-purple-200"
                          >
                            <span className="font-medium">Fretes Realizados</span>
                            {isExpandedFreights ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {isExpandedFreights && (
                            <div className="space-y-2 text-xs max-h-48 overflow-y-auto p-2 bg-white border border-purple-200 rounded-md">
                              {stats.freightList.map(freight => (
                                <div key={freight.id} className="bg-purple-50 p-2 rounded border border-purple-100">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium">Mapa: {freight.mapNumber}</span>
                                    <span className="text-gray-500">{format(new Date(freight.contractedAt), 'dd/MM/yy')}</span>
                                  </div>
                                   <p>Dest: {freight.destination} | Valor: R$ {freight.finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {Object.entries(getCarrierStats()).filter(([_, stats]) => stats.loadingMode === 'bag').length === 0 && (
                     <p className="text-sm text-gray-500 text-center py-4">Nenhum frete BAG registrado.</p>
                  )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
