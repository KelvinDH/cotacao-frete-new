import React, { useState, useEffect } from 'react';
import { HandshakeIcon, Percent, CheckCircle, DollarSign, Weight, MapPin, FileText, Truck, Route, CalendarDays, Search, ChevronDown, ChevronUp, Image as ImageIcon, Info, Edit, X, Save } from "lucide-react";
import { FreightMap } from "@/api/entities";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function NegotiationPage() {
  const [freightMaps, setFreightMaps] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [finalValue, setFinalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDetails, setExpandedDetails] = useState({});
  const [editingFreight, setEditingFreight] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [proposalInputs, setProposalInputs] = useState({});

  useEffect(() => {
    loadFreightMaps();
  }, []);

  const loadFreightMaps = async () => {
    setLoading(true);
    const maps = await FreightMap.filter({ status: 'negotiating' });
    setFreightMaps(maps);
    setLoading(false);
  };

  const handleProposalInputChange = (mapId, carrier, value) => {
    setProposalInputs(prev => ({
      ...prev,
      [mapId]: {
        ...prev[mapId],
        [carrier]: value
      }
    }));
  };

  const handleCarrierProposalChange = async (freightId, carrier) => {
    const value = proposalInputs[freightId]?.[carrier] || 0;
    if (value <= 0) return;

    const freight = freightMaps.find(map => map.id === freightId);
    if (!freight) return;

    const updatedProposals = {
      ...freight.carrierProposals,
      [carrier]: value
    };

    await FreightMap.update(freightId, {
      carrierProposals: updatedProposals
    });

    await loadFreightMaps();
  };

  const startEditing = (freight) => {
    setEditingFreight(freight.id);
    setEditedValues({
      loadingDate: freight.loadingDate,
      mapValue: freight.mapValue,
      weight: freight.weight
    });
  };

  const cancelEditing = () => {
    setEditingFreight(null);
    setEditedValues({});
  };

  const saveEdits = async (freightId) => {
    try {
      await FreightMap.update(freightId, editedValues);
      setEditingFreight(null);
      setEditedValues({});
      await loadFreightMaps();
    } catch (error) {
      console.error("Error saving edits:", error);
      alert("Erro ao salvar alterações. Tente novamente.");
    }
  };

  const finalizeNegotiation = async (freightId) => {
    if (!selectedProposal || finalValue <= 0) return;

    await FreightMap.update(freightId, {
      selectedCarrier: selectedProposal.carrier,
      finalValue: finalValue,
      status: 'contracted',
      contractedAt: new Date().toISOString()
    });

    setSelectedProposal(null);
    setFinalValue(0);
    await loadFreightMaps();
  };

  const getFilteredMaps = () => {
    if (!searchTerm) return freightMaps;
    return freightMaps.filter(map => 
      map.mapNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };
  
  const toggleDetails = (mapId) => {
    setExpandedDetails(prev => ({
      ...prev,
      [mapId]: !prev[mapId]
    }));
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
          <HandshakeIcon className="w-6 h-6 mr-2 text-green-600" />
          Negociação de Fretes
        </h2>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
          <Input
            type="text"
            placeholder="Pesquisar por Nº Mapa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full md:w-64"
          />
        </div>
      </div>

      {getFilteredMaps().length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Nenhum mapa disponível para negociação.
        </div>
      ) : (
        <div className="space-y-6">
          {getFilteredMaps().map((map) => (
            <div key={map.id} className="border rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow bg-white">
              <div className="flex flex-wrap items-center justify-between mb-3">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-gray-600 mr-2" />
                  <h3 className="font-semibold text-gray-800">
                    Mapa Nº: {map.mapNumber}
                  </h3>
                </div>
                
                {editingFreight === map.id ? (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={cancelEditing}
                      className="text-gray-600"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => saveEdits(map.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Salvar
                    </Button>
                  </div>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => startEditing(map)}
                    className="text-blue-600"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-3 mb-4">
                <div>
                  <label className="text-xs text-gray-500">Data Carreg.</label>
                  {editingFreight === map.id ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {editedValues.loadingDate ? 
                            format(new Date(editedValues.loadingDate), "dd/MM/yy", { locale: ptBR }) : 
                            'Selecionar data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={editedValues.loadingDate ? new Date(editedValues.loadingDate) : undefined}
                          onSelect={(date) => setEditedValues({
                            ...editedValues, 
                            loadingDate: date ? date.toISOString().split('T')[0] : ''
                          })}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <p className="font-semibold text-gray-800">
                      {map.loadingDate ? format(new Date(map.loadingDate), "dd/MM/yy", { locale: ptBR }) : 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500">Origem</label>
                  <p className="font-semibold text-gray-800 truncate" title={map.origin}>{map.origin}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Destino</label>
                  <p className="font-semibold text-gray-800 truncate" title={map.destination}>{map.destination}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Peso (kg)</label>
                  {editingFreight === map.id ? (
                    <Input
                      type="number"
                      min="0"
                      value={editedValues.weight || ''}
                      onChange={e => setEditedValues({...editedValues, weight: parseFloat(e.target.value) || 0})}
                      className="h-9 text-sm"
                    />
                  ) : (
                    <p className="font-semibold text-gray-800">{map.weight}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500">Valor Mapa (R$)</label>
                  {editingFreight === map.id ? (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editedValues.mapValue || ''}
                      onChange={e => setEditedValues({...editedValues, mapValue: parseFloat(e.target.value) || 0})}
                      className="h-9 text-sm"
                    />
                  ) : (
                    <p className="font-semibold text-gray-800">{map.mapValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500">Caminhão</label>
                  <p className="font-semibold text-gray-800 truncate" title={map.truckType}>{map.truckType}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">KM Total</label>
                  <p className="font-semibold text-gray-800">{map.totalKm}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Modalidade</label>
                  <p className="font-semibold text-gray-800">
                    {map.loadingMode === 'paletizados' ? 'Paletizados' : 'BAG'}
                  </p>
                </div>
              </div>

              {(map.routeInfo || map.mapImage) && (
                <div className="mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDetails(map.id)}
                    className="w-full flex items-center justify-between text-gray-600 hover:text-gray-800"
                  >
                    <span className="flex items-center">
                      <Info className="w-4 h-4 mr-2" />
                      Detalhes Adicionais (Roteiro/Mapa)
                    </span>
                    {expandedDetails[map.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  {expandedDetails[map.id] && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border rounded-md bg-gray-50">
                      {map.routeInfo && (
                        <div>
                          <label className="text-sm text-gray-600 mb-1 block font-medium">Roteiro</label>
                          <p className="bg-white p-3 rounded-md text-gray-700 whitespace-pre-line text-sm border max-h-32 overflow-y-auto">
                            {map.routeInfo}
                          </p>
                        </div>
                      )}
                      {map.mapImage && (
                        <div>
                          <label className="text-sm text-gray-600 mb-1 block font-medium">Mapa</label>
                          <a href={map.mapImage} target="_blank" rel="noopener noreferrer" className="block">
                            <img
                              src={map.mapImage}
                              alt="Mapa do frete"
                              className="max-h-48 w-full object-contain rounded-md border hover:opacity-80 transition-opacity"
                            />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Registrar / Ver Propostas</h4>
                <div className="space-y-3">
                    {Object.keys(map.carrierProposals).map(carrier => (
                      <div key={carrier} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-800 text-sm w-full sm:w-1/3">{carrier}</span>
                        <div className="flex items-center gap-2 w-full sm:w-2/3">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="R$ 0,00"
                            className="flex-1 px-3 py-2 text-sm border-gray-300 rounded-md"
                            value={proposalInputs[map.id]?.[carrier] || map.carrierProposals[carrier] || ''}
                            onChange={(e) => handleProposalInputChange(map.id, carrier, parseFloat(e.target.value) || 0)}
                          />
                          <Button 
                            size="sm"
                            onClick={() => handleCarrierProposalChange(map.id, carrier)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Selecionar Proposta para Fechamento</h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(map.carrierProposals).filter(([_, proposalValue]) => proposalValue > 0).map(([carrier, proposalValue]) => (
                      <div key={carrier} className="relative">
                        <div 
                          className={`border rounded-lg p-3 cursor-pointer transition-all duration-150 ${
                            selectedProposal?.freightId === map.id && selectedProposal?.carrier === carrier
                              ? 'border-blue-500 bg-blue-50 shadow-md scale-105'
                              : 'hover:border-gray-400 hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedProposal({ freightId: map.id, carrier })}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700">{carrier}</span>
                          </div>
                          <div className="bg-white px-2 py-1 rounded-md border border-gray-200">
                            <span className="font-medium text-sm text-gray-800">
                              R$ {proposalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                   {Object.values(map.carrierProposals).every(val => val <= 0) && (
                      <p className="text-sm text-gray-500">Nenhuma proposta registrada para selecionar.</p>
                   )}
              </div>

              {selectedProposal?.freightId === map.id && (
                <div className="mt-6 p-4 border-t border-dashed bg-green-50 rounded-b-lg">
                  <h3 className="text-md font-semibold mb-3 text-green-700">Finalizar Negociação para Mapa {map.mapNumber}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Transportadora Selecionada
                      </label>
                      <p className="text-md font-semibold text-blue-600">
                        {selectedProposal.carrier}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Proposta Original: R$ {map.carrierProposals[selectedProposal.carrier].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Valor Final do Frete (R$)
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Valor final"
                          className="flex-1 px-3 py-2 text-sm border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={finalValue || ''}
                          onChange={(e) => setFinalValue(parseFloat(e.target.value) || 0)}
                        />
                        <Button
                          size="sm"
                          onClick={() => finalizeNegotiation(map.id)}
                          disabled={finalValue <= 0}
                          className={`px-3 py-2 transition-colors duration-200 ${
                            finalValue <= 0
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}