
import React, { useState, useEffect } from 'react';
import { Truck, Plus, Edit, Trash2, Search, Package, DollarSign, Weight, AlertCircle, CheckCircle } from 'lucide-react';
import { TruckType } from '@/components/ApiDatabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from "@/components/ui/label";

export default function TruckTypesPage() {
  const [truckTypes, setTruckTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    baseRate: '',
    modality: 'paletizados'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTruckTypes();
  }, []);

  const loadTruckTypes = async () => {
    try {
      const truckTypesList = await TruckType.list();
      setTruckTypes(truckTypesList);
    } catch (error) {
      console.error('Error loading truck types:', error);
      setError('Falha ao carregar tipos de caminhão. Verifique se a API está online.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      capacity: '',
      baseRate: '',
      modality: 'paletizados'
    });
    setEditingTruck(null);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.name || !formData.capacity || !formData.baseRate) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return false;
    }

    if (parseFloat(formData.capacity) <= 0) {
      setError('A capacidade deve ser maior que zero');
      return false;
    }

    if (parseFloat(formData.baseRate) <= 0) {
      setError('A tarifa base deve ser maior que zero');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const truckData = {
        name: formData.name,
        capacity: parseFloat(formData.capacity),
        baseRate: parseFloat(formData.baseRate),
        modality: formData.modality
      };

      if (editingTruck) {
        await TruckType.update(editingTruck.id, truckData);
        setSuccess('Tipo de caminhão atualizado com sucesso!');
      } else {
        await TruckType.create(truckData);
        setSuccess('Tipo de caminhão criado com sucesso!');
      }
      
      await loadTruckTypes();
      resetForm();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMessage = err.message || 'Erro ao salvar tipo de caminhão';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (truck) => {
    setEditingTruck(truck);
    setFormData({
      name: truck.name,
      capacity: truck.capacity.toString(),
      baseRate: truck.baseRate.toString(),
      modality: truck.modality
    });
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (truckId) => {
    if (window.confirm('Tem certeza que deseja excluir este tipo de caminhão?')) {
      try {
        await TruckType.delete(truckId);
        await loadTruckTypes();
        setSuccess('Tipo de caminhão excluído com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        setError('Erro ao excluir tipo de caminhão');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const filteredTruckTypes = truckTypes.filter(truck =>
    truck.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    truck.modality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getModalityColor = (modality) => {
      switch (modality) {
        case 'paletizados': return 'bg-blue-100 text-blue-800';
        case 'bag': return 'bg-purple-100 text-purple-800';
        case 'granel': return 'bg-orange-100 text-orange-800'; // Updated color for granel
        default: return 'bg-gray-100 text-gray-800';
      }
  };

  const getModalityLabel = (modality) => {
      switch (modality) {
        case 'paletizados': return 'Paletizados';
        case 'bag': return 'BAG';
        case 'granel': return 'Granel';
        default: return modality;
      }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        {/* <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Truck className="w-6 h-6 mr-2 text-green-600" />
          Tipos de Caminhão
        </h2> */}
        <Button 
          onClick={() => { setShowForm(true); setEditingTruck(null); }}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Tipo
        </Button>
      </div>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
          <span className="text-green-700 text-sm">{success}</span>
        </div>
      )}
      
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {showForm && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>
              {editingTruck ? 'Editar Tipo de Caminhão' : 'Criar Novo Tipo de Caminhão'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome do Tipo *</Label>
                <div className="relative mt-1">
                  <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    id="name" 
                    type="text" 
                    value={formData.name} 
                    onChange={(e) => handleInputChange('name', e.target.value)} 
                    placeholder="Ex: Truck Paletizado Grande" 
                    className="pl-10" 
                    required 
                    maxLength={50}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="capacity">Capacidade (toneladas) *</Label>
                <div className="relative mt-1">
                  <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    id="capacity" 
                    type="number" 
                    step="0.1"
                    value={formData.capacity} 
                    onChange={(e) => {
                      if (e.target.value.length > 7) return;
                      handleInputChange('capacity', e.target.value)
                    }} 
                    placeholder="Ex: 10.5" 
                    className="pl-10" 
                    required 
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="baseRate">Tarifa Base (R$/km) *</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    id="baseRate" 
                    type="number" 
                    step="0.01"
                    value={formData.baseRate} 
                    onChange={(e) => {
                      if (e.target.value.length > 7) return;
                      handleInputChange('baseRate', e.target.value)
                    }} 
                    placeholder="Ex: 2.50" 
                    className="pl-10" 
                    required 
                  />
                </div>
              </div>
              
              <div>
                <Label>Modalidade *</Label>
                <Select value={formData.modality} onValueChange={(value) => handleInputChange('modality', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione a modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paletizados">Paletizados</SelectItem>
                    <SelectItem value="bag">BAG</SelectItem>
                    <SelectItem value="granel">Granel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                  {loading ? 'Salvando...' : (editingTruck ? 'Atualizar Tipo' : 'Criar Tipo')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tipos de Caminhão Cadastrados</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input 
              type="text" 
              placeholder="Buscar por nome ou modalidade..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10" 
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTruckTypes.map((truck) => (
              <div key={truck.id} className="p-4 border rounded-lg flex justify-between items-start">
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Truck className="w-4 h-4 mr-2 text-gray-600" />
                    {truck.name}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <Weight className="w-3 h-3 mr-1" />
                      {truck.capacity}t
                    </span>
                    <span className="flex items-center">
                      <DollarSign className="w-3 h-3 mr-1" />
                      R$ {truck.baseRate.toFixed(2)}/km
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge className={getModalityColor(truck.modality)}>
                      {getModalityLabel(truck.modality)}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleEdit(truck)} variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    onClick={() => handleDelete(truck.id)} 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredTruckTypes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>{searchTerm ? 'Nenhum tipo encontrado.' : 'Nenhum tipo de caminhão cadastrado.'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
