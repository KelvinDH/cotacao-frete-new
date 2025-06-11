import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash2, Search, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { Carrier } from '@/components/ApiDatabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function CarriersPage() {
  const [carriers, setCarriers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'paletizados',
    active: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCarriers();
  }, []);

  const loadCarriers = async () => {
    try {
      const carriersList = await Carrier.list();
      setCarriers(carriersList);
    } catch (error) {
      console.error('Error loading carriers:', error);
      setError('Falha ao carregar transportadoras. Verifique se a API está online.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'paletizados',
      active: true
    });
    setEditingCarrier(null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setError('O nome da transportadora é obrigatório.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (editingCarrier) {
        await Carrier.update(editingCarrier.id, formData);
        setSuccess('Transportadora atualizada com sucesso!');
      } else {
        await Carrier.create(formData);
        setSuccess('Transportadora criada com sucesso!');
      }
      
      await loadCarriers();
      resetForm();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Erro ao salvar transportadora.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (carrier) => {
    setEditingCarrier(carrier);
    setFormData({
      name: carrier.name,
      type: carrier.type,
      active: carrier.active
    });
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (carrierId) => {
    if (window.confirm('Tem certeza que deseja excluir esta transportadora?')) {
      try {
        await Carrier.delete(carrierId);
        await loadCarriers();
        setSuccess('Transportadora excluída com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        setError('Erro ao excluir transportadora.');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const filteredCarriers = carriers.filter(carrier =>
    carrier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const getModalityColor = (modality) => {
    return modality === 'paletizados' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-green-600" />
          Gerenciar Transportadoras
        </h2>
        <Button 
          onClick={() => { setShowForm(true); setEditingCarrier(null); }}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Transportadora
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
            <CardTitle>{editingCarrier ? 'Editar Transportadora' : 'Criar Nova Transportadora'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Transportadora *</Label>
                <Input id="name" type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="Digite o nome" className="mt-1" required />
              </div>
              
              <div>
                <Label>Modalidade Principal *</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paletizados">Paletizados</SelectItem>
                    <SelectItem value="bag">BAG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Switch id="active-mode" checked={formData.active} onCheckedChange={(checked) => handleInputChange('active', checked)} />
                <Label htmlFor="active-mode">Transportadora Ativa</Label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                  {loading ? 'Salvando...' : (editingCarrier ? 'Atualizar' : 'Criar')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transportadoras Cadastradas</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCarriers.map((carrier) => (
              <div key={carrier.id} className="p-4 border rounded-lg flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-semibold text-gray-900">{carrier.name}</h3>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge className={getModalityColor(carrier.type)}>
                       {carrier.type === 'paletizados' ? 'Paletizados' : 'BAG'}
                    </Badge>
                    <Badge variant={carrier.active ? 'default' : 'secondary'} className={carrier.active ? 'bg-green-100 text-green-800' : ''}>{carrier.active ? 'Ativa' : 'Inativa'}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleEdit(carrier)} variant="outline" size="sm"><Edit className="w-4 h-4" /></Button>
                  <Button onClick={() => handleDelete(carrier.id)} variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
             {filteredCarriers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <p>{searchTerm ? 'Nenhuma transportadora encontrada.' : 'Nenhuma transportadora cadastrada.'}</p>
                </div>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}