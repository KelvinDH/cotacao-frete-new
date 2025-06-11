import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { validateFreightMapForm } from '@/utils/validation';
import { formatDate } from '@/utils/formatters';
import ErrorMessage from '@/components/common/ErrorMessage';
import { FileText, MapPin, Weight, DollarSign, Calendar as CalendarIcon, Truck, Upload, X, Eye } from 'lucide-react';

const FreightMapForm = ({ 
    initialData = {}, 
    truckTypes = [], 
    carriers = [], 
    onSubmit, 
    onCancel, 
    loading = false 
}) => {
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
        mapImage: '',
        ...initialData
    });

    const [errors, setErrors] = useState({});
    const [imagePreview, setImagePreview] = useState(initialData.mapImage || null);
    const [showImageModal, setShowImageModal] = useState(false);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: undefined
            }));
        }
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);

        // Here you would upload the file and get the URL
        // For now, we'll just use the preview
        handleInputChange('mapImage', URL.createObjectURL(file));
    };

    const removeImage = () => {
        setFormData(prev => ({
            ...prev,
            mapImage: ''
        }));
        setImagePreview(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const validation = validateFreightMapForm(formData);
        
        if (!validation.isValid) {
            setErrors(validation.errors);
            return;
        }

        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identification Section */}
            <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-green-600" />
                    Identificação do Mapa
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="mapNumber">Número do Mapa *</Label>
                        <Input
                            id="mapNumber"
                            type="text"
                            value={formData.mapNumber}
                            onChange={(e) => handleInputChange('mapNumber', e.target.value)}
                            placeholder="Ex: MAP001"
                            className="mt-1"
                        />
                        <ErrorMessage message={errors.mapNumber} className="mt-1" />
                    </div>
                    
                    {/* Image Upload */}
                    <div>
                        <Label>Imagem do Mapa</Label>
                        {!imagePreview ? (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors mt-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    id="image-upload"
                                />
                                <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <span className="text-sm text-gray-600">Clique para fazer upload</span>
                                    <span className="text-xs text-gray-400 mt-1">PNG, JPG até 10MB</span>
                                </label>
                            </div>
                        ) : (
                            <div className="relative mt-1">
                                <div className="border rounded-lg p-4 bg-gray-50">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-medium text-green-700 flex items-center">
                                            <FileText className="w-4 h-4 mr-2" />
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
                                            src={imagePreview} 
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

            {/* Route Section */}
            <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                    Informações da Rota
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="origin">Origem *</Label>
                        <Input
                            id="origin"
                            type="text"
                            value={formData.origin}
                            onChange={(e) => handleInputChange('origin', e.target.value)}
                            placeholder="Ex: São Paulo/SP"
                            className="mt-1"
                        />
                        <ErrorMessage message={errors.origin} className="mt-1" />
                    </div>
                    
                    <div>
                        <Label htmlFor="destination">Destino *</Label>
                        <Input
                            id="destination"
                            type="text"
                            value={formData.destination}
                            onChange={(e) => handleInputChange('destination', e.target.value)}
                            placeholder="Ex: Rio de Janeiro/RJ"
                            className="mt-1"
                        />
                        <ErrorMessage message={errors.destination} className="mt-1" />
                    </div>
                    
                    <div>
                        <Label htmlFor="totalKm">Distância Total (km) *</Label>
                        <Input
                            id="totalKm"
                            type="number"
                            value={formData.totalKm}
                            onChange={(e) => handleInputChange('totalKm', e.target.value)}
                            placeholder="Ex: 450"
                            className="mt-1"
                        />
                        <ErrorMessage message={errors.totalKm} className="mt-1" />
                    </div>
                </div>
                
                <div className="mt-4">
                    <Label htmlFor="routeInfo">Informações Adicionais da Rota</Label>
                    <Textarea
                        id="routeInfo"
                        value={formData.routeInfo}
                        onChange={(e) => handleInputChange('routeInfo', e.target.value)}
                        placeholder="Descreva informações adicionais sobre a rota, pedágios, restrições, etc..."
                        rows={3}
                        className="mt-1 resize-none"
                    />
                </div>
            </div>

            {/* Load and Values Section */}
            <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Weight className="w-5 h-5 mr-2 text-orange-600" />
                    Informações da Carga
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="weight">Peso (kg) *</Label>
                        <Input
                            id="weight"
                            type="number"
                            step="0.01"
                            value={formData.weight}
                            onChange={(e) => handleInputChange('weight', e.target.value)}
                            placeholder="Ex: 15000"
                            className="mt-1"
                        />
                        <ErrorMessage message={errors.weight} className="mt-1" />
                    </div>
                    
                    <div>
                        <Label htmlFor="mapValue">Valor do Mapa (R$) *</Label>
                        <Input
                            id="mapValue"
                            type="number"
                            step="0.01"
                            value={formData.mapValue}
                            onChange={(e) => handleInputChange('mapValue', e.target.value)}
                            placeholder="Ex: 2500.00"
                            className="mt-1"
                        />
                        <ErrorMessage message={errors.mapValue} className="mt-1" />
                    </div>
                    
                    <div>
                        <Label>Data de Carregamento *</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left mt-1">
                                    {formData.loadingDate ? formatDate(formData.loadingDate) : 'Selecione a data'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={formData.loadingDate}
                                    onSelect={(date) => handleInputChange('loadingDate', date)}
                                />
                            </PopoverContent>
                        </Popover>
                        <ErrorMessage message={errors.loadingDate} className="mt-1" />
                    </div>
                </div>
            </div>

            {/* Transport Specifications */}
            <div className="pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Truck className="w-5 h-5 mr-2 text-indigo-600" />
                    Especificações do Transporte
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label>Tipo de Caminhão *</Label>
                        <Select value={formData.truckType} onValueChange={(value) => handleInputChange('truckType', value)}>
                            <SelectTrigger className="mt-1">
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
                        <ErrorMessage message={errors.truckType} className="mt-1" />
                    </div>

                    <div>
                        <Label>Transportadora *</Label>
                        <Select value={formData.selectedCarrier} onValueChange={(value) => handleInputChange('selectedCarrier', value)}>
                            <SelectTrigger className="mt-1">
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
                        <ErrorMessage message={errors.selectedCarrier} className="mt-1" />
                    </div>
                    
                    <div>
                        <Label>Modalidade de Carregamento *</Label>
                        <Select value={formData.loadingMode} onValueChange={(value) => handleInputChange('loadingMode', value)}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Selecione a modalidade" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="paletizados">Paletizados</SelectItem>
                                <SelectItem value="bag">BAG</SelectItem>
                            </SelectContent>
                        </Select>
                        <ErrorMessage message={errors.loadingMode} className="mt-1" />
                    </div>
                </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                    {loading ? 'Salvando...' : 'Salvar Cotação'}
                </Button>
            </div>

            {/* Image Modal */}
            {showImageModal && imagePreview && (
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
                                src={imagePreview} 
                                alt="Imagem do mapa" 
                                className="max-w-full max-h-[70vh] object-contain mx-auto"
                            />
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
};

export default FreightMapForm;