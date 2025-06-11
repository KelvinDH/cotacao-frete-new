import React, { useState, useEffect } from 'react';
import { FileText, Plus, MapPin, Weight, DollarSign, Calendar, Truck, Route, Upload, Image as ImageIcon, X, Eye } from "lucide-react";
import { FreightMap, TruckType, Carrier, UploadFile } from "@/components/ApiDatabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function QuotePage() {
  const [formData, setFormData] = useState({
    mapNumber: '',
    origin: '',
    destination: '',
    totalKm: '',
    weight: '',
    mapValue: '',
    truckType: '',
    selectedCarrier: '',
    loadingMode: '',
    loadingDate: null,
    routeInfo: '',
    mapImage: ''
  });

  const [truckTypes, setTruckTypes] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    loadTruckTypesAndCarriers();
  }, []);

  const loadTruckTypesAndCarriers = async () => {
    try {
      const trucks = await TruckType.list();
      const carriersList = await Carrier.list();
      setTruckTypes(trucks);
      setCarriers(carriersList);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Erro ao carregar dados. Verifique se a API está rodando.");
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Criar preview local da imagem
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    setUploadingImage(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        mapImage: file_url
      }));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Erro ao fazer upload da imagem. Verifique se a API está rodando.");
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      mapImage: ''
    }));
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.mapNumber || !formData.origin || !formData.destination || !formData.totalKm || !formData.weight || !formData.mapValue || !formData.truckType || !formData.selectedCarrier || !formData.loadingMode || !formData.loadingDate) {
      alert("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const freightData = {
        ...formData,
        totalKm: parseInt(formData.totalKm),
        weight: parseFloat(formData.weight),
        mapValue: parseFloat(formData.mapValue),
        loadingDate: formData.loadingDate ? format(formData.loadingDate, 'yyyy-MM-dd') : '',
        carrierProposals: {},
        status: 'negotiating',
        invoiceUrls: []
      };

      await FreightMap.create(freightData);
      
      alert("Cotação criada com sucesso!");
      
      // Reset form
      setFormData({
        mapNumber: '',
        origin: '',
        destination: '',
        totalKm: '',
        weight: '',
        mapValue: '',
        truckType: '',
        selectedCarrier: '',
        loadingMode: '',
        loadingDate: null,
        routeInfo: '',
        mapImage: ''
      });
      setImagePreview(null);
    } catch (error) {
      console.error("Error creating freight map:", error);
      alert("Erro ao criar cotação. Verifique se a API está rodando.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 flex items-center justify-center mb-2">
            <FileText className="w-8 h-8 mr-3 text-green-600" />
            Nova Cotação de Frete
          </h2>
          <p className="text-gray-600">Preencha as informações para criar uma nova cotação</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl p-8 space-y-8">
          {/* Seção 1: Identificação e Imagem */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-green-600" />
              Identificação do Mapa
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número do Mapa *
                </label>
                <Input
                  type="text"
                  value={formData.mapNumber}
                  onChange={(e) => handleInputChange('mapNumber', e.target.value)}
                  placeholder="Ex: MAP001"
                  className="text-lg"
                  required
                />
              </div>
              
              {/* Upload de Imagem com Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagem do Mapa
                </label>
                
                {!imagePreview && !formData.mapImage ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                      id="image-upload"
                    />
                    <label 
                      htmlFor="image-upload" 
                      className="cursor-pointer flex flex-col items-center"
                    >
                      {uploadingImage ? (
                        <div className="flex items-center text-green-600">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mr-2"></div>
                          Carregando...
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">Clique para fazer upload</span>
                          <span className="text-xs text-gray-400 mt-1">PNG, JPG até 10MB</span>
                        </>
                      )}
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-green-700 flex items-center">
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Imagem do Mapa
                        </span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowImageModal(true)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Visualizar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={removeImage}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Remover
                          </Button>
                        </div>
                      </div>
                      
                      <div className="w-full h-32 bg-white rounded border overflow-hidden">
                        <img 
                          src={imagePreview || formData.mapImage} 
                          alt="Preview do mapa" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seção 2: Rota */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-blue-600" />
              Informações da Rota
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <MapPin className="w-4 h-4 mr-1 text-green-600" />
                  Origem *
                </label>
                <Input
                  type="text"
                  value={formData.origin}
                  onChange={(e) => handleInputChange('origin', e.target.value)}
                  placeholder="Ex: São Paulo/SP"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <MapPin className="w-4 h-4 mr-1 text-red-600" />
                  Destino *
                </label>
                <Input
                  type="text"
                  value={formData.destination}
                  onChange={(e) => handleInputChange('destination', e.target.value)}
                  placeholder="Ex: Rio de Janeiro/RJ"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Route className="w-4 h-4 mr-1 text-purple-600" />
                  Distância Total (km) *
                </label>
                <Input
                  type="number"
                  value={formData.totalKm}
                  onChange={(e) => handleInputChange('totalKm', e.target.value)}
                  placeholder="Ex: 450"
                  required
                />
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Informações Adicionais da Rota
              </label>
              <Textarea
                value={formData.routeInfo}
                onChange={(e) => handleInputChange('routeInfo', e.target.value)}
                placeholder="Descreva informações adicionais sobre a rota, pedágios, restrições, etc..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          {/* Seção 3: Carga e Valores */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Weight className="w-5 h-5 mr-2 text-orange-600" />
              Informações da Carga
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Weight className="w-4 h-4 mr-1 text-orange-600" />
                  Peso (kg) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  placeholder="Ex: 15000"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                  Valor do Mapa (R$) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.mapValue}
                  onChange={(e) => handleInputChange('mapValue', e.target.value)}
                  placeholder="Ex: 2500.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-1 text-blue-600" />
                  Data de Carregamento *
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      {formData.loadingDate ? format(formData.loadingDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={formData.loadingDate}
                      onSelect={(date) => handleInputChange('loadingDate', date)}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Seção 4: Especificações */}
          <div className="pb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Truck className="w-5 h-5 mr-2 text-indigo-600" />
              Especificações do Transporte
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Truck className="w-4 h-4 mr-1 text-indigo-600" />
                  Tipo de Caminhão *
                </label>
                <Select value={formData.truckType} onValueChange={(value) => handleInputChange('truckType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de caminhão" />
                  </SelectTrigger>
                  <SelectContent>
                    {truckTypes.map((truck) => (
                      <SelectItem key={truck.id} value={truck.name}>
                        {truck.name} ({truck.capacity}t - R${truck.baseRate}/km)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transportadora *
                </label>
                <Select value={formData.selectedCarrier} onValueChange={(value) => handleInputChange('selectedCarrier', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a transportadora" />
                  </SelectTrigger>
                  <SelectContent>
                    {carriers.map((carrier) => (
                      <SelectItem key={carrier.id} value={carrier.name}>
                        {carrier.name} ({carrier.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modalidade de Carregamento *
                </label>
                <Select value={formData.loadingMode} onValueChange={(value) => handleInputChange('loadingMode', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paletizados">Paletizados</SelectItem>
                    <SelectItem value="bag">BAG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Criando Cotação...
                </div>
              ) : (
                <div className="flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Criar Cotação
                </div>
              )}
            </Button>
          </div>
        </form>

        {/* Modal para visualizar imagem */}
        {showImageModal && (imagePreview || formData.mapImage) && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-semibold">Visualizar Imagem do Mapa</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImageModal(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-4">
                <img 
                  src={imagePreview || formData.mapImage} 
                  alt="Imagem do mapa" 
                  className="max-w-full max-h-[70vh] object-contain mx-auto"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}