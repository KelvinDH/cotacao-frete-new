
import React, { useState, useEffect } from 'react';
import { HandshakeIcon, Percent, CheckCircle, DollarSign, Weight, MapPin, FileText, Truck, Route, CalendarDays, Search, ChevronDown, ChevronUp, Image as ImageIcon, Info, Edit, X, Save, Plus, Trash2 } from "lucide-react";
import { FreightMap, Carrier, User } from "@/components/ApiDatabase";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function NegotiationPage() {
  const [freightMaps, setFreightMaps] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [finalValue, setFinalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDetails, setExpandedDetails] = useState({});
  const [editingFreight, setEditingFreight] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  const [newProposals, setNewProposals] = useState({}); // Para propostas novas sendo adicionadas

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const maps = await FreightMap.filter({ status: 'negotiating' });
      const carriersList = await Carrier.list();
      setFreightMaps(maps);
      setCarriers(carriersList);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Erro ao carregar dados. Verifique se a API está rodando.");
    }
    setLoading(false);
  };

  const addNewProposalField = (freightId) => {
    setNewProposals(prev => ({
      ...prev,
      [freightId]: [
        ...(prev[freightId] || []),
        { carrierId: '', carrierName: '', proposalValue: '' }
      ]
    }));
  };

  const removeProposalField = (freightId, index) => {
    setNewProposals(prev => ({
      ...prev,
      [freightId]: prev[freightId].filter((_, i) => i !== index)
    }));
  };

  const updateProposalField = (freightId, index, field, value) => {
    setNewProposals(prev => ({
      ...prev,
      [freightId]: prev[freightId].map((proposal, i) => 
        i === index 
          ? { 
              ...proposal, 
              [field]: value,
              ...(field === 'carrierId' && { carrierName: carriers.find(c => c.id === value)?.name || '' })
            }
          : proposal
      )
    }));
  };

  const saveNewProposals = async (freightId) => {
    const proposals = newProposals[freightId] || [];
    const validProposals = proposals.filter(p => p.carrierId && p.proposalValue);
    
    if (validProposals.length === 0) {
      alert('Adicione pelo menos uma proposta válida');
      return;
    }

    try {
      const freight = freightMaps.find(map => map.id === freightId);
      const updatedProposals = { ...freight.carrierProposals };

      validProposals.forEach(proposal => {
        updatedProposals[proposal.carrierName] = parseFloat(proposal.proposalValue);
      });

      // CORREÇÃO: Enviar apenas o campo que queremos atualizar
      await FreightMap.update(freightId, {
        carrierProposals: updatedProposals
      });

      // Limpar campos de nova proposta
      setNewProposals(prev => ({
        ...prev,
        [freightId]: []
      }));

      await loadData();
      alert('Propostas adicionadas com sucesso!');
    } catch (error) {
      console.error("Error saving proposals:", error);
      alert("Erro ao salvar propostas. Tente novamente.");
    }
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
      
      setFreightMaps(prevMaps => 
        prevMaps.map(map => 
          map.id === freightId ? { ...map, ...editedValues } : map
        )
      );
      
      setEditingFreight(null);
      setEditedValues({});
    } catch (error) {
      console.error("Error saving edits:", error);
      alert("Erro ao salvar alterações. Tente novamente.");
    }
  };

  const finalizeNegotiation = async (freightId) => {
    if (!selectedProposal || finalValue <= 0) return;

    try {
      // CORREÇÃO: Enviar apenas os campos necessários para finalizar
      await FreightMap.update(freightId, {
        selectedCarrier: selectedProposal.carrier,
        finalValue: finalValue,
        status: 'contracted',
        contractedAt: new Date().toISOString()
      });

      await loadData();
      setSelectedProposal(null);
      setFinalValue(0);
      alert('Negociação finalizada com sucesso!');
    } catch (error) {
      console.error("Error finalizing negotiation:", error);
      alert("Erro ao finalizar negociação. Tente novamente.");
    }
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
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar por número do mapa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-64"
            />
          </div>
        </div>
      </div>

      {getFilteredMaps().length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'Nenhum frete encontrado para esta busca.' : 'Nenhum frete em negociação.'}
        </div>
      ) : (
        <div className="space-y-6">
          {getFilteredMaps().map((map) => (
            <div key={map.id} className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              {/* Header */}
              <div className="bg-blue-50 p-4 border-b border-blue-200 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <FileText className="w-5 h-5 text-blue-700" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-800">Mapa: {map.mapNumber}</h3>
                    <p className="text-xs text-gray-500">
                      Criado em: {format(new Date(map.created_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {map.loadingMode === 'paletizados' ? (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      Paletizados
                    </span>
                  ) : (
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                      BAG
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleDetails(map.id)}
                  >
                    {expandedDetails[map.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Basic Info */}
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 flex items-center">
                      <MapPin className="w-3 h-3 mr-1" /> Origem
                    </p>
                    <p className="font-medium">{map.origin}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 flex items-center">
                      <MapPin className="w-3 h-3 mr-1" /> Destino
                    </p>
                    <p className="font-medium">{map.destination}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 flex items-center">
                      <Weight className="w-3 h-3 mr-1" /> Peso
                    </p>
                    <p className="font-medium">{map.weight?.toLocaleString('pt-BR')} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 flex items-center">
                      <DollarSign className="w-3 h-3 mr-1" /> Valor Mapa
                    </p>
                    <p className="font-medium text-green-600">
                      R$ {map.mapValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Carrier Proposals Section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                    <Percent className="w-4 h-4 mr-2" />
                    Propostas das Transportadoras
                  </h4>
                  
                  {/* New Proposal Fields */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="text-sm font-medium text-gray-700">Adicionar Novas Propostas</h5>
                      <Button
                        onClick={() => addNewProposalField(map.id)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>

                    {newProposals[map.id]?.map((proposal, index) => (
                      <div key={index} className="flex gap-2 items-end mb-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">Transportadora</label>
                          <Select
                            value={proposal.carrierId}
                            onValueChange={(value) => updateProposalField(map.id, index, 'carrierId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {carriers
                                .filter(carrier => !Object.keys(map.carrierProposals || {}).includes(carrier.name))
                                .map((carrier) => (
                                  <SelectItem key={carrier.id} value={carrier.id}>
                                    {carrier.name} ({carrier.type})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">Valor da Proposta (R$)</label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={proposal.proposalValue}
                            onChange={(e) => updateProposalField(map.id, index, 'proposalValue', e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={() => removeProposalField(map.id, index)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    {newProposals[map.id]?.length > 0 && (
                      <div className="flex justify-end mt-3">
                        <Button
                          onClick={() => saveNewProposals(map.id)}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          Salvar Propostas
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Existing Proposals */}
                  {map.carrierProposals && Object.keys(map.carrierProposals).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(map.carrierProposals).map(([carrier, value]) => (
                        <div key={carrier} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{carrier}</p>
                            <p className="text-sm text-gray-600">Proposta de frete</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-500">
                              {((value / map.mapValue) * 100 - 100).toFixed(1)}% do valor mapa
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      Nenhuma proposta recebida ainda
                    </p>
                  )}
                </div>

                {/* Contract Section */}
                {map.carrierProposals && Object.keys(map.carrierProposals).length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Fechar Contrato
                    </h4>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">Transportadora Selecionada</label>
                        <select
                          className="w-full px-3 py-2 border rounded-md"
                          value={selectedProposal?.carrier || ''}
                          onChange={(e) => {
                            const carrier = e.target.value;
                            const value = map.carrierProposals[carrier];
                            setSelectedProposal({ carrier, value });
                            setFinalValue(value);
                          }}
                        >
                          <option value="">Selecione uma transportadora</option>
                          {Object.entries(map.carrierProposals).map(([carrier, value]) => (
                            <option key={carrier} value={carrier}>
                              {carrier} - R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">Valor Final (R$)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={finalValue}
                          onChange={(e) => setFinalValue(parseFloat(e.target.value))}
                        />
                      </div>
                      <Button
                        onClick={() => finalizeNegotiation(map.id)}
                        disabled={!selectedProposal || finalValue <= 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Fechar Contrato
                      </Button>
                    </div>
                  </div>
                )}

                {/* Expanded Details */}
                {expandedDetails[map.id] && (
                  <div className="border-t pt-4 mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 flex items-center">
                          <Route className="w-3 h-3 mr-1" /> Distância
                        </p>
                        <p className="font-medium">{map.totalKm} km</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 flex items-center">
                          <Truck className="w-3 h-3 mr-1" /> Tipo de Caminhão
                        </p>
                        <p className="font-medium">{map.truckType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 flex items-center">
                          <CalendarDays className="w-3 h-3 mr-1" /> Data Carregamento
                        </p>
                        <p className="font-medium">
                          {map.loadingDate ? format(parseISO(map.loadingDate), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    {map.routeInfo && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 flex items-center mb-2">
                          <Info className="w-3 h-3 mr-1" /> Informações da Rota
                        </p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                          {map.routeInfo}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
