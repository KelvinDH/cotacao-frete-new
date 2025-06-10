import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Package, FileText, MapPin, Weight, DollarSign, Truck, Route, Upload, Image as ImageIcon, Loader2, ChevronRight, Calendar as CalendarIcon, CalendarDays } from "lucide-react";
import { FreightMap, TruckType, Carrier } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function QuotePage() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [allTruckTypes, setAllTruckTypes] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [showCarrierSelection, setShowCarrierSelection] = useState(false);
  const [selectedCarriers, setSelectedCarriers] = useState([]);
  const [quote, setQuote] = useState({
    mapNumber: '',
    mapImage: '',
    origin: 'Pederneiras/SP',
    destination: '',
    totalKm: 0,
    weight: 0,
    mapValue: 0,
    truckType: '',
    value: 0,
    loadingMode: 'paletizados',
    routeInfo: '',
    loadingDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadTruckTypes();
    loadCarriers();
  }, []);

  const loadTruckTypes = async () => {
    const types = await TruckType.list();
    setAllTruckTypes(types);
    
    if (types.length > 0) {
      const validTypes = types.filter(t => t.modality === 'paletizados');
      if (validTypes.length > 0) {
        setQuote(prev => ({ ...prev, truckType: validTypes[0].name }));
      }
    }
  };

  const getFilteredTruckTypes = () => {
    return allTruckTypes.filter(truck => truck.modality === quote.loadingMode);
  };

  const handleLoadingModeChange = (mode) => {
    const filteredTrucks = allTruckTypes.filter(t => t.modality === mode);
    setQuote(prev => ({
      ...prev,
      loadingMode: mode,
      truckType: filteredTrucks.length > 0 ? filteredTrucks[0].name : ''
    }));
  };

  const loadCarriers = async () => {
    const allCarriers = await Carrier.list();
    setCarriers(allCarriers);
    // By default, select all carriers
    setSelectedCarriers(allCarriers.map(c => c.name));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setQuote(prev => ({ ...prev, mapImage: file_url }));
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      alert('Erro ao fazer upload da imagem. Tente novamente.');
    }
    setUploading(false);
  };

  const saveFreight = async (e) => {
    e.preventDefault();
    
    const carrierProposals = {};
    selectedCarriers.forEach(carrier => {
      if (carrier) {
        carrierProposals[carrier] = 0;
      }
    });
    
    await FreightMap.create({
      ...quote,
      carrierProposals,
      status: 'negotiating'
    });
    
    navigate(createPageUrl("Negotiation"));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <form onSubmit={saveFreight} className="space-y-6">
        <div>
          <label className="flex items-center text-gray-700 font-medium mb-2">
            <Package className="w-4 h-4 mr-2 text-green-600" />
            Modalidade de Carregamento
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className={`p-4 rounded-lg border-2 transition-colors duration-200 flex flex-col items-center gap-2 ${
                quote.loadingMode === 'paletizados'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
              onClick={() => handleLoadingModeChange('paletizados')}
            >
              <Package className="w-6 h-6" />
              <span className="font-medium">Paletizados</span>
            </button>
            <button
              type="button"
              className={`p-4 rounded-lg border-2 transition-colors duration-200 flex flex-col items-center gap-2 ${
                quote.loadingMode === 'bag'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
              onClick={() => handleLoadingModeChange('bag')}
            >
              <Package className="w-6 h-6" />
              <span className="font-medium">BAG</span>
            </button>
          </div>
        </div>

        <div>
          <label className="flex items-center text-gray-700 font-medium mb-2">
            <ImageIcon className="w-4 h-4 mr-2 text-green-600" />
            Mapa
          </label>
          <div className="mt-2">
            {quote.mapImage ? (
              <div className="relative">
                <img
                  src={quote.mapImage}
                  alt="Mapa carregado"
                  className="w-full max-h-64 object-contain rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => setQuote(prev => ({ ...prev, mapImage: '' }))}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="map-image"
                />
                <label
                  htmlFor="map-image"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      <span className="text-sm text-gray-500">Carregando imagem...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-500">Clique para fazer upload da imagem do mapa</span>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center text-gray-700 font-medium mb-2">
              <FileText className="w-4 h-4 mr-2 text-green-600" />
              Nº Mapa
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={quote.mapNumber}
              onChange={(e) => setQuote({...quote, mapNumber: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="flex items-center text-gray-700 font-medium mb-2">
              <CalendarDays className="w-4 h-4 mr-2 text-green-600" />
              Data de Carregamento
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={`w-full justify-start text-left font-normal ${
                    !quote.loadingDate && "text-muted-foreground"
                  }`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {quote.loadingDate && isValid(new Date(quote.loadingDate))
                    ? format(new Date(quote.loadingDate), "PPP", { locale: ptBR })
                    : <span>Escolha uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={quote.loadingDate ? new Date(quote.loadingDate) : undefined}
                  onSelect={(date) => setQuote({...quote, loadingDate: date ? date.toISOString().split('T')[0] : ''})}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center text-gray-700 font-medium mb-2">
              <MapPin className="w-4 h-4 mr-2 text-green-600" />
              Origem
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
              value={quote.origin}
              disabled
            />
          </div>

          <div>
            <label className="flex items-center text-gray-700 font-medium mb-2">
              <MapPin className="w-4 h-4 mr-2 text-green-600" />
              Destino
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={quote.destination}
              onChange={(e) => setQuote({...quote, destination: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center text-gray-700 font-medium mb-2">
              <Route className="w-4 h-4 mr-2 text-green-600" />
              KM Total
            </label>
            <input
              type="number"
              min="0"
              step="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={quote.totalKm || ''}
              onChange={(e) => setQuote({...quote, totalKm: parseInt(e.target.value) || 0})}
              required
            />
          </div>

          <div>
            <label className="flex items-center text-gray-700 font-medium mb-2">
              <Weight className="w-4 h-4 mr-2 text-green-600" />
              Peso (kg)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={quote.weight || ''}
              onChange={(e) => setQuote({...quote, weight: parseFloat(e.target.value)})}
              required
            />
          </div>
        </div>

        <div>
          <label className="flex items-center text-gray-700 font-medium mb-2">
            <DollarSign className="w-4 h-4 mr-2 text-green-600" />
            Valor Mapa (R$)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={quote.mapValue || ''}
            onChange={(e) => setQuote({...quote, mapValue: parseFloat(e.target.value)})}
            required
          />
        </div>

        <div>
          <label className="flex items-center text-gray-700 font-medium mb-2">
            <Truck className="w-4 h-4 mr-2 text-green-600" />
            Tipo de Caminhão
          </label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            value={quote.truckType}
            onChange={(e) => setQuote({...quote, truckType: e.target.value})}
            required
          >
            <option value="">Selecione um tipo de caminhão</option>
            {getFilteredTruckTypes().map((truck) => (
              <option key={truck.id} value={truck.name}>
                {truck.name} ({truck.capacity} toneladas)
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowCarrierSelection(!showCarrierSelection)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-2"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${showCarrierSelection ? 'rotate-90' : ''}`} />
            <span className="font-medium">Selecionar Transportadoras</span>
            <span className="text-sm text-gray-500">
              ({selectedCarriers.filter(Boolean).length} selecionadas)
            </span>
          </button>

          {showCarrierSelection && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-600">
                  Escolha as transportadoras para enviar a cotação
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCarriers(carriers.map(c => c.name))}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Selecionar Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCarriers([])}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Limpar
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {carriers.map((carrier) => {
                  const carrierName = carrier.name;
                  if (!carrierName) return null;
                  
                  return (
                    <label
                      key={carrier.id}
                      className="flex items-center gap-2 p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCarriers.includes(carrierName)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCarriers([...selectedCarriers, carrierName]);
                          } else {
                            setSelectedCarriers(selectedCarriers.filter(c => c !== carrierName));
                          }
                        }}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="flex-1 text-gray-700">{carrierName}</span>
                      <Badge className={carrier.type === 'paletizados' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                        {carrier.type === 'paletizados' ? 'Paletizados' : 'BAG'}
                      </Badge>
                    </label>
                  );
                })}
              </div>

              {selectedCarriers.length === 0 && (
                <p className="text-sm text-red-600 mt-2">
                  Selecione pelo menos uma transportadora
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="flex items-center text-gray-700 font-medium mb-2">
            <Route className="w-4 h-4 mr-2 text-green-600" />
            Roteiro
          </label>
          <textarea
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={quote.routeInfo}
            onChange={(e) => setQuote({...quote, routeInfo: e.target.value})}
            rows={3}
            placeholder="Informações sobre o trajeto, pontos de referência, observações..."
          />
        </div>

        <button
          type="submit"
          disabled={selectedCarriers.length === 0}
          className={`w-full py-3 px-6 rounded-md flex items-center justify-center ${
            selectedCarriers.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 transition-colors duration-200'
          } text-white`}
        >
          <Truck className="w-5 h-5 mr-2" />
          Salvar Frete
        </button>
      </form>
    </div>
  );
}