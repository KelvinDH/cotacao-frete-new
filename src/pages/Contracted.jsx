
import React, { useState, useEffect } from 'react';
import { CheckCircle, Calendar, Download, TrendingDown, Percent, DollarSign, Package, ChevronUp, ChevronDown, Search, FileText, MapPin, Weight, Truck as TruckIcon, Route as RouteIcon, Users, PiggyBank, CalendarDays, Info, Upload, FileCheck, Loader2 } from "lucide-react"; // Added Info icon, Upload, FileCheck, Loader2
import { FreightMap } from "@/api/entities";
import { UploadFile } from "@/api/integrations"; // Added UploadFile integration
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // Added Button

export default function ContractedPage() {
  const [freightMaps, setFreightMaps] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedDetails, setExpandedDetails] = useState({}); // For main details
  const [expandedHistory, setExpandedHistory] = useState({}); // For proposal history
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingNfForMap, setUploadingNfForMap] = useState(null); // New state for tracking NF upload

  useEffect(() => {
    loadFreightMaps();
  }, []);

  const loadFreightMaps = async () => {
    const maps = await FreightMap.filter({ status: 'contracted' });
    setFreightMaps(maps);
    setLoading(false);
  };

  const handleInvoiceUpload = async (file, mapId) => {
    if (!file) return;
    setUploadingNfForMap(mapId);
    try {
        const { file_url } = await UploadFile({ file });
        
        const mapToUpdate = freightMaps.find(m => m.id === mapId);
        const existingUrls = mapToUpdate.invoiceUrls || [];
        const newUrls = [...existingUrls, file_url];

        await FreightMap.update(mapId, { invoiceUrls: newUrls });

        // Update local state to reflect the change immediately
        setFreightMaps(prevMaps =>
            prevMaps.map(m => (m.id === mapId ? { ...m, invoiceUrls: newUrls } : m))
        );
    } catch (error) {
        console.error("Erro ao fazer upload da NF:", error);
        alert("Ocorreu um erro ao enviar a nota fiscal. Tente novamente.");
    }
    setUploadingNfForMap(null);
  };
  
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
  };
  
  const formatShortDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd/MM/yy', { locale: ptBR });
  };

  const calculatePercentageVsMap = (finalValue, mapValue) => {
    if (mapValue === 0) return 0;
    return ((finalValue / mapValue) * 100); 
  };
  
  const calculateSavingsPercentage = (proposalValue, finalValue) => {
    if (proposalValue === 0 || proposalValue === undefined || proposalValue === null) return 0;
    const saving = proposalValue - finalValue;
    if (proposalValue === 0) return 0;
    return (saving / proposalValue) * 100;
  }

  const toggleDetails = (mapId) => {
    setExpandedDetails(prev => ({...prev, [mapId]: !prev[mapId]}));
  };

  const toggleHistory = (mapId) => {
    setExpandedHistory(prev => ({...prev, [mapId]: !prev[mapId]}));
  };

  const getFilteredAndSortedMaps = () => {
    let filtered = freightMaps;
    if (searchTerm) {
      filtered = freightMaps.filter(map => 
        map.mapNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        map.selectedCarrier?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.contractedAt).getTime();
      const dateB = new Date(b.contractedAt).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando fretes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
          Fretes Contratados
        </h2>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              type="text"
              placeholder="Pesquisar Nº Mapa/Transp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full md:w-64"
            />
          </div>
          
          <button
            onClick={toggleSortOrder}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-2 whitespace-nowrap bg-white px-3 py-2 rounded-md border shadow-sm"
          >
            <Calendar className="w-5 h-5" />
            {sortOrder === 'desc' ? 'Mais recentes' : 'Mais antigos'}
          </button>
        </div>
      </div>
      
      {getFilteredAndSortedMaps().length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {freightMaps.length === 0 ? (
            <>
              Nenhum frete contratado ainda.
              <p className="mt-2 text-sm">
                Finalize as negociações na aba de Negociação.
              </p>
            </>
          ) : (
            <>
              Nenhum mapa encontrado com o número "{searchTerm}".
              <p className="mt-2 text-sm">
                Tente outro número de mapa.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {getFilteredAndSortedMaps().map((map) => {
            const proposalValue = map.carrierProposals && map.selectedCarrier ? map.carrierProposals[map.selectedCarrier] : map.finalValue; // Fallback if proposal not found
            const savings = proposalValue - map.finalValue;
            const percentageVsMap = calculatePercentageVsMap(map.finalValue, map.mapValue);
            const isDetailsExpanded = !!expandedDetails[map.id];
            const isHistoryExpanded = !!expandedHistory[map.id];
            
            return (
              <div key={map.id} className="border-2 border-green-200 rounded-xl bg-white shadow-lg hover:shadow-xl transition-shadow">
                {/* Header Section - Always Visible */}
                <div className="p-4 md:p-6 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-green-700 flex items-center">
                        <FileText className="w-5 h-5 mr-2" />
                        Mapa Nº: {map.mapNumber}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        <Users className="w-4 h-4 inline-block mr-1" />
                        Transportadora: <span className="font-medium text-blue-600">{map.selectedCarrier || 'N/A'}</span>
                      </p>
                    </div>
                    <div className="text-sm text-gray-600 mt-2 sm:mt-0 sm:text-right">
                       <p className="flex items-center justify-start sm:justify-end">
                         <CalendarDays className="w-4 h-4 mr-1 text-gray-500" />
                         Carreg.: {formatShortDate(map.loadingDate)}
                       </p>
                       <p className="flex items-center justify-start sm:justify-end mt-1">
                         <Calendar className="w-4 h-4 mr-1 text-gray-500" />
                         Contratado: {formatDate(map.contractedAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDetails(map.id)}
                    className="w-full mt-4 flex items-center justify-center text-gray-600 hover:text-gray-800"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    {isDetailsExpanded ? 'Ocultar Detalhes' : 'Mostrar Detalhes'}
                    {isDetailsExpanded ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                  </Button>
                </div>

                {/* Expandable Details Section */}
                {isDetailsExpanded && (
                  <div className="p-4 md:p-6">
                    {/* Route & Load Details */}
                    <div className="mb-6">
                      <h4 className="text-md font-semibold text-gray-700 mb-3">Detalhes da Carga e Rota</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <label className="text-xs text-gray-500 flex items-center"><MapPin className="w-3 h-3 mr-1"/>Origem</label>
                          <p className="font-medium text-gray-800">{map.origin}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <label className="text-xs text-gray-500 flex items-center"><MapPin className="w-3 h-3 mr-1"/>Destino</label>
                          <p className="font-medium text-gray-800">{map.destination}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <label className="text-xs text-gray-500 flex items-center"><RouteIcon className="w-3 h-3 mr-1"/>KM Total</label>
                          <p className="font-medium text-gray-800">{map.totalKm}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <label className="text-xs text-gray-500 flex items-center"><Weight className="w-3 h-3 mr-1"/>Peso</label>
                          <p className="font-medium text-gray-800">{map.weight} kg</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <label className="text-xs text-gray-500 flex items-center"><TruckIcon className="w-3 h-3 mr-1"/>Caminhão</label>
                          <p className="font-medium text-gray-800">{map.truckType}</p>
                        </div>
                         <div className="bg-gray-50 p-3 rounded-lg">
                          <label className="text-xs text-gray-500 flex items-center"><Package className="w-3 h-3 mr-1"/>Modalidade</label>
                           <Badge variant="outline" className={map.loadingMode === 'paletizados' ? "border-blue-500 text-blue-700" : "border-purple-500 text-purple-700"}>
                            {map.loadingMode === 'paletizados' ? 'Paletizados' : 'BAG'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {/* Financial Summary */}
                    <div className="mb-6">
                       <h4 className="text-md font-semibold text-gray-700 mb-3">Resumo Financeiro</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                          <label className="text-xs text-yellow-700 flex items-center"><DollarSign className="w-3 h-3 mr-1"/>Valor Mapa</label>
                          <p className="font-semibold text-yellow-800 text-lg">R$ {map.mapValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                          <label className="text-xs text-blue-700 flex items-center"><DollarSign className="w-3 h-3 mr-1"/>Proposta Transp.</label>
                          <p className="font-semibold text-blue-800 text-lg">R$ {proposalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                          <label className="text-xs text-green-700 flex items-center"><DollarSign className="w-3 h-3 mr-1"/>Valor Final</label>
                          <p className="font-semibold text-green-800 text-lg">R$ {map.finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                         <div className="bg-teal-50 border border-teal-200 p-3 rounded-lg">
                          <label className="text-xs text-teal-700 flex items-center"><Percent className="w-3 h-3 mr-1"/>% do Valor Mapa</label>
                          <p className="font-semibold text-teal-800 text-lg">{percentageVsMap.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%</p>
                        </div>
                      </div>
                       <div className="mt-4 bg-green-100 border border-green-300 p-4 rounded-lg flex items-center justify-center">
                          <PiggyBank className="w-8 h-8 text-green-700 mr-3"/>
                          <div>
                            <label className="text-sm text-green-800">Economia Gerada</label>
                            <p className="font-bold text-green-700 text-2xl">R$ {savings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                             <p className="text-xs text-green-600">({calculateSavingsPercentage(proposalValue, map.finalValue).toFixed(2)}% da proposta)</p>
                          </div>
                        </div>
                    </div>

                    {/* Invoice Upload Section */}
                    <div className="mt-6">
                      <h4 className="text-md font-semibold text-gray-700 mb-3">Notas Fiscais</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
                        {/* List existing invoices */}
                        {map.invoiceUrls && map.invoiceUrls.length > 0 && (
                          <div className="space-y-2">
                            {map.invoiceUrls.map((url, index) => (
                              <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                                <div className="flex items-center text-green-700">
                                  <FileCheck className="w-5 h-5 mr-2" />
                                  <span className="font-medium text-sm">Nota Fiscal {index + 1}</span>
                                </div>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                                >
                                  Visualizar
                                </a>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Upload section */}
                        {uploadingNfForMap === map.id ? (
                          <div className="flex items-center justify-center text-gray-600 py-3">
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            <span>Enviando NF...</span>
                          </div>
                        ) : (
                          <div>
                            <label htmlFor={`nf-upload-${map.id}`} className="w-full">
                              <div className="flex items-center justify-center w-full px-4 py-3 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition-colors">
                                <Upload className="w-5 h-5 mr-2" />
                                {map.invoiceUrls && map.invoiceUrls.length > 0 ? 'Anexar outra NF' : 'Anexar NF'}
                              </div>
                            </label>
                            <input
                              type="file"
                              id={`nf-upload-${map.id}`}
                              className="hidden"
                              onChange={(e) => handleInvoiceUpload(e.target.files[0], map.id)}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Proposal History (Expandable) */}
                    <div className="mt-6">
                      <button
                        onClick={() => toggleHistory(map.id)}
                        className="w-full flex items-center justify-between gap-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 py-2 px-3 rounded-md bg-gray-100 hover:bg-gray-200"
                      >
                        <span className="font-medium">Histórico de Propostas da Negociação</span>
                        {isHistoryExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>

                      {isHistoryExpanded && map.carrierProposals && (
                        <div className="mt-4 bg-white rounded-lg p-4 border">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(map.carrierProposals).map(([carrier, value]) => {
                              if (!value || value <= 0) return null;
                              
                              const proposalPercentageVsMap = calculatePercentageVsMap(value, map.mapValue);
                              
                              return (
                                <div key={carrier} className={`p-3 rounded-lg border ${carrier === map.selectedCarrier ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-gray-700 text-sm">{carrier}</span>
                                    {carrier === map.selectedCarrier && (
                                      <Badge variant="default" className="bg-blue-600 text-white text-xs">Selecionada</Badge>
                                    )}
                                  </div>
                                  <p className="text-gray-800 font-semibold">
                                    R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    ({proposalPercentageVsMap.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}% do Valor Mapa)
                                  </p>
                                </div>
                              );
                            })}
                            {Object.keys(map.carrierProposals).filter(k => map.carrierProposals[k] > 0).length === 0 && (
                                <p className="text-sm text-gray-500 col-span-full text-center">Nenhuma proposta registrada para este mapa.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
