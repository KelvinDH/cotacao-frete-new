
import React, { useState, useEffect } from 'react';
import { FreightMap, User } from "@/components/ApiDatabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Search, Download, Filter, BarChart2, Map, MapPin, X, TrendingUp, DollarSign, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Chart } from "react-google-charts";

export default function ReportsPage() {
  const [freightMaps, setFreightMaps] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [mapData, setMapData] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  
  // NOVO ESTADO: Para controlar a animação de saída do modal
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  // ✅ NOVO ESTADO: Para controlar apenas a visibilidade do modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toBrazilDateTime = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return new Date(date.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const brazilDate = toBrazilDateTime(dateString);
      return format(brazilDate, 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch (error) {
      return 'Data inválida';
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const user = await User.me();
        setCurrentUser(user);
        
        const freights = await FreightMap.list('-created_date');
        setFreightMaps(freights);
        processMapData(freights);

      } catch (error) {
        console.error("Error loading data:", error);
      }
      setLoading(false);
    };

    loadData();
  }, []);
  
  const processMapData = (freights) => {
    const stateCounts = {};
    freights.forEach(freight => {
      const originState = freight.origin?.split('/')?.[1]?.toUpperCase().trim();
      const destState = freight.destination?.split('/')?.[1]?.toUpperCase().trim();
      if (originState) stateCounts[originState] = (stateCounts[originState] || 0) + 1;
      if (destState) stateCounts[destState] = (stateCounts[destState] || 0) + 1;
    });
    const dataForMap = [['State', 'Fretes']];
    for (const state in stateCounts) {
      if (state.length === 2) dataForMap.push([`BR-${state}`, stateCounts[state]]);
    }
    setMapData(dataForMap);
  };

  const handleChartSelect = ({ chartWrapper }) => {
    const chart = chartWrapper.getChart();
    const selection = chart.getSelection();
    if (selection.length > 0) {
      const selectedRow = selection[0].row;
      const dataTable = chartWrapper.getDataTable();
      const stateAbbr = dataTable.getValue(selectedRow, 0).replace('BR-', '');
      setSelectedState(stateAbbr);
      // ✅ Abre o modal ao selecionar o estado
      setIsModalOpen(true);
    }
  };
  
  // ✅ ATUALIZADO: A função agora apenas fecha o modal, não limpa o filtro
  const handleCloseModal = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsModalOpen(false); // Fecha o modal
      setIsAnimatingOut(false);
    }, 300); // Duração da animação em milissegundos
  };

  // ✅ NOVO: Função dedicada para limpar o filtro de estado
  const clearStateFilter = () => {
    setSelectedState(null);
  };

  const getFilteredFreights = () => {
    return freightMaps.filter(freight => {
      const matchesStatus = statusFilter === 'all' || freight.status === statusFilter;
      const matchesModality = modalityFilter === 'all' || freight.loadingMode === modalityFilter;
      const matchesSearch = !searchTerm || (
        freight.mapNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        freight.origin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        freight.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        freight.selectedCarrier?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      // ✅ O filtro de estado agora é persistente na página
      const matchesState = !selectedState || freight.destination?.toUpperCase().includes(selectedState);
      
      return matchesStatus && matchesModality && matchesSearch && matchesState;
    });
  };

  const downloadCSV = () => {
    const csvContent = [
      ['Mapa', 'Origem', 'Destino', 'Transportadora', 'Status', 'Modalidade', 'Valor Final', 'Data Criação'],
      ...filteredFreights.map(freight => [
        freight.mapNumber || '',
        freight.origin || '',
        freight.destination || '',
        freight.selectedCarrier || '',
        freight.status || '',
        freight.loadingMode || '',
        freight.finalValue ? `R$ ${freight.finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
        formatDate(freight.created_date)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_fretes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredFreights = getFilteredFreights();
  
  // ✅ O modal agora usa a mesma lógica de filtro, mas sem o termo de busca geral
  const modalFreights = selectedState 
    ? freightMaps.filter(f => {
        const destinationState = f.destination?.split('/')?.[1]?.toUpperCase().trim();
        const matchesState = destinationState === selectedState;
        const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
        const matchesModality = modalityFilter === 'all' || f.loadingMode === modalityFilter;
        return matchesState && matchesStatus && matchesModality;
      })
    : [];

  const summaryData = {
    totalFreights: filteredFreights.length,
    totalValueContracted: filteredFreights
      .filter(f => f.status === 'contracted' && f.finalValue)
      .reduce((acc, f) => acc + f.finalValue, 0),
    negotiatingCount: filteredFreights.filter(f => f.status === 'negotiating').length,
  };

  return (
    <div className="p-6 bg-gray-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          {/* <h2 className="text-3xl font-bold text-gray-800 flex items-center">
            <BarChart2 className="w-8 h-8 mr-3 text-green-600" />
            Dashboard de Relatórios
          </h2>
          <p className="text-gray-600 mt-1">Visualize e filtre todos os fretes do sistema.</p> */}
        </div>
        <Button onClick={downloadCSV} disabled={filteredFreights.length === 0} className="mt-4 md:mt-0">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Fretes</CardTitle>
            <Package className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.totalFreights}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Contratado</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {summaryData.totalValueContracted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fretes em Negociação</CardTitle>
            <TrendingUp className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.negotiatingCount}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Mapa Interativo em Destaque */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Map className="w-5 h-5 mr-2 text-blue-600"/>
            Distribuição de Fretes no Brasil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">Clique em um estado para visualizar fretes específicos.</p>
          {loading ? (
            <div className="flex justify-center items-center h-[500px]">
              <p>Carregando mapa...</p>
            </div>
          ) : mapData.length > 1 ? (
            <Chart
              chartType="GeoChart"
              width="100%"
              height="500px"
              data={mapData}
              options={{
                region: 'BR',
                displayMode: 'regions',
                resolution: 'provinces',
                colorAxis: { colors: ['#a7f3d0', '#34d399', '#059669'] },
                backgroundColor: '#ffffff',
                datalessRegionColor: '#cfcfd1',
                tooltip: { textStyle: { color: '#374151' } },
                legend: 'none'
              }}
              chartEvents={[{ eventName: 'select', callback: handleChartSelect }]}
            />
          ) : (
            <div className="flex justify-center items-center h-[500px] text-gray-500">
              <p>Sem dados para exibir o mapa.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna dos Filtros */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input 
                  type="text" 
                  placeholder="Buscar..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="negotiating">Negociando</SelectItem>
                  <SelectItem value="contracted">Contratado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={modalityFilter} onValueChange={setModalityFilter}>
                <SelectTrigger><SelectValue placeholder="Modalidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="paletizados">Paletizados</SelectItem>
                  <SelectItem value="bag">BAG</SelectItem>
                  <SelectItem value="granel">Granel</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Coluna da Tabela de Dados */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Dados Detalhados dos Fretes</CardTitle>
              {/* ✅ NOVO: Banner que mostra o filtro de estado ativo */}
              {selectedState && (
                <div className="mt-3 p-3 bg-blue-100 border border-blue-200 text-blue-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Exibindo fretes para {selectedState}</span>
                  </div>
                  {/* ✅ O botão agora chama a função para limpar o filtro */}
                  <Button variant="ghost" size="sm" onClick={clearStateFilter} className="text-blue-700 hover:bg-blue-200">
                    <X className="w-4 h-4 mr-1"/> Limpar Filtro de Estado
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <p>Carregando dados...</p>
                </div>
              ) : filteredFreights.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="font-semibold">Nenhum frete encontrado</p>
                  <p className="text-sm">Tente ajustar os filtros.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium text-gray-600">Mapa</th>
                        <th className="text-left p-3 font-medium text-gray-600">Rota</th>
                        <th className="text-left p-3 font-medium text-gray-600">Status</th>
                        <th className="text-left p-3 font-medium text-gray-600">Valor Final</th>
                        <th className="text-left p-3 font-medium text-gray-600">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFreights.map((freight) => (
                        <tr key={freight.id} className="border-b hover:bg-gray-100/50">
                          <td className="p-3 font-semibold">{freight.mapNumber}</td>
                          <td className="p-3">
                            <div className="font-medium">{freight.origin} → {freight.destination}</div>
                            <div className="text-xs text-gray-500">{freight.selectedCarrier}</div>
                          </td>
                          <td className="p-3">
                            <Badge className={
                              freight.status === 'contracted' ? 'bg-green-100 text-green-800' :
                              freight.status === 'negotiating' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {freight.status === 'contracted' ? 'Contratado' :
                               freight.status === 'negotiating' ? 'Negociando' : 'Rejeitado'}
                            </Badge>
                          </td>
                          <td className="p-3 font-medium text-gray-800">
                            {freight.finalValue ? 
                              `R$ ${freight.finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'
                            }
                          </td>
                          <td className="p-3 text-gray-600">{formatDate(freight.created_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL PARA EXIBIR FRETES DO ESTADO */}
      {/* ✅ ATUALIZADO: Condição de renderização e classes de centralização */}
      {isModalOpen && selectedState && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div 
            onClick={handleCloseModal} 
            className={`fixed inset-0 bg-black/60 transition-opacity duration-300 ${isAnimatingOut ? 'opacity-0' : 'opacity-100'}`}
          />
          
          {/* Painel do Modal */}
          <div 
            className={`relative bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col transform transition-all duration-300 ease-out ${isAnimatingOut ? 'opacity-0 -translate-y-10' : 'opacity-100 translate-y-0'}`}
          >
            {/* Cabeçalho do Modal */}
            <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg">
              <h3 id="modal-title" className="text-xl font-bold text-gray-800 flex items-center">
                <MapPin className="mr-2 text-blue-600"/>
                Fretes para o estado de {selectedState}
              </h3>
              <Button variant="ghost" size="icon" onClick={handleCloseModal}>
                <X className="w-5 h-5 text-red-500 hover:text-red-800"/>
              </Button>
            </div>

            {/* Resumo de Métricas do Estado */}
            <div className="p-4 border-b bg-blue-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total de Fretes</p>
                      <p className="text-2xl font-bold text-gray-800">{modalFreights.length}</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Valor Total Contratado</p>
                      <p className="text-2xl font-bold text-green-600">
                        R$ {modalFreights
                          .filter(f => f.status === 'contracted' && f.finalValue)
                          .reduce((acc, f) => acc + f.finalValue, 0)
                          .toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                        }
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Fretes em Negociação</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {modalFreights.filter(f => f.status === 'negotiating').length}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Corpo do Modal com Tabela */}
            <div className="p-4 overflow-y-auto">
              {modalFreights.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="font-semibold">Nenhum frete encontrado</p>
                  <p className="text-sm">Não há fretes registrados para este estado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium text-gray-600">Mapa</th>
                        <th className="text-left p-3 font-medium text-gray-600">Rota</th>
                        <th className="text-left p-3 font-medium text-gray-600">Status</th>
                        <th className="text-left p-3 font-medium text-gray-600">Valor Final</th>
                        <th className="text-left p-3 font-medium text-gray-600">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalFreights.map((freight) => (
                        <tr key={freight.id} className="border-b hover:bg-gray-100/50">
                          <td className="p-3 font-semibold">{freight.mapNumber}</td>
                          <td className="p-3">
                            <div className="font-medium">{freight.origin} → {freight.destination}</div>
                            <div className="text-xs text-gray-500">{freight.selectedCarrier}</div>
                          </td>
                          <td className="p-3">
                            <Badge className={
                              freight.status === 'contracted' ? 'bg-green-100 text-green-800' :
                              freight.status === 'negotiating' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {freight.status === 'contracted' ? 'Contratado' :
                               freight.status === 'negotiating' ? 'Negociando' : 'Rejeitado'}
                            </Badge>
                          </td>
                          <td className="p-3 font-medium text-gray-800">
                            {freight.finalValue ? 
                              `R$ ${freight.finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'
                            }
                          </td>
                          <td className="p-3 text-gray-600">{formatDate(freight.created_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
