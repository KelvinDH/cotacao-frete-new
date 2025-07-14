
import React, { useState, useEffect } from 'react';
import { UserPlus, User as UserIcon, Mail, Lock, Building, AlertCircle, CheckCircle, Edit, Trash2, Search } from 'lucide-react';
import { User, Carrier } from '@/components/ApiDatabase'; 
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [carriers, setCarriers] = useState([]); // New state for carriers
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'user',
    carrierName: '',
    active: true,
    requirePasswordChange: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsersAndCarriers(); // Updated function call
  }, []);

  const loadUsersAndCarriers = async () => {
    try {
      const usersList = await User.list();
      const carriersList = await Carrier.list(); // Fetch carriers
      setUsers(usersList);
      setCarriers(carriersList.filter(c => c.active)); // Only show active carriers
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Falha ao carregar dados. Verifique se a API está online.');
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      userType: 'user',
      carrierName: '',
      active: true,
      requirePasswordChange: false
    });
    setEditingUser(null);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  const handleInputChange = (field, value) => {
    // Validações específicas por campo
    if (field === 'username') {
      // Username: apenas letras, números e pontos/underscores, máximo 25 caracteres
      if (value.length <= 25 && /^[a-zA-Z0-9._]*$/.test(value)) {
        setFormData(prev => ({ ...prev, [field]: value }));
      }
    } else if (field === 'fullName') {
      // Nome completo: apenas letras e espaços, máximo 50 caracteres
      if (value.length <= 50 && /^[a-zA-ZÀ-ÿ\s]*$/.test(value)) {
        setFormData(prev => ({ ...prev, [field]: value }));
      }
    } else if (field === 'email') {
      // Email: máximo 60 caracteres
      if (value.length <= 60) {
        setFormData(prev => ({ ...prev, [field]: value }));
      }
    } else if (field === 'password' || field === 'confirmPassword') {
      // Senha: máximo 50 caracteres
      if (value.length <= 50) {
        setFormData(prev => ({ ...prev, [field]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Limpar campo de transportadora quando mudar o tipo de usuário
    if (field === 'userType' && value !== 'carrier') {
      setFormData(prev => ({ ...prev, carrierName: '' }));
    }
    
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.fullName || !formData.username || !formData.email) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return false;
    }

    if (!editingUser && !formData.password) {
      setError('Senha é obrigatória para novos usuários');
      return false;
    }

    if (formData.password && formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return false;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }

    if (formData.userType === 'carrier' && !formData.carrierName) {
      setError('Transportadora é obrigatória para usuários do tipo Transportadora'); // Updated error message
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor, insira um email válido');
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
      const userData = {
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        userType: formData.userType,
        carrierName: formData.userType === 'carrier' ? formData.carrierName : null,
        active: formData.active,
        requirePasswordChange: formData.requirePasswordChange
      };

      // Só inclui a senha se ela foi digitada
      if (formData.password) {
        userData.password = formData.password;
      }

      if (editingUser) {
        await User.update(editingUser.id, userData);
        setSuccess('Usuário atualizado com sucesso!');
      } else {
        await User.create(userData);
        setSuccess('Usuário criado com sucesso!');
      }
      
      await loadUsersAndCarriers(); // Updated function call
      resetForm();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMessage = err.response && err.response.data && err.response.data.error 
                           ? err.response.data.error 
                           : err.message || 'Erro ao salvar usuário';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: '',
      userType: user.userType,
      carrierName: user.carrierName || '',
      active: user.active,
      requirePasswordChange: user.requirePasswordChange || false
    });
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await User.delete(userId);
        await loadUsersAndCarriers(); // Updated function call
        setSuccess('Usuário excluído com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        setError('Erro ao excluir usuário');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  // CORREÇÃO: Função para abrir o formulário de novo usuário
  const handleNewUser = () => {
    resetForm(); // Limpa o formulário
    setEditingUser(null); // Garante que não estamos editando
    setShowForm(true); // Mostra o formulário
    setError(''); // Limpa erros
    setSuccess(''); // Limpa mensagens de sucesso
  };

  const filteredUsers = users.filter(user =>
    (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.carrierName && user.carrierName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getUserTypeColor = (userType) => {
    switch (userType) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'carrier': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserTypeLabel = (userType) => {
    switch (userType) {
      case 'admin': return 'Administrador';
      case 'carrier': return 'Transportadora';
      default: return 'Usuário';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        {/* <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <UserIcon className="w-6 h-6 mr-2 text-green-600" />
          Gerenciamento de Usuários
        </h2> */}
        <Button 
          onClick={handleNewUser}
          className="bg-green-600 hover:bg-green-700"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Mensagens de Feedback */}
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

      {/* Formulário de Usuário */}
      {showForm && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{editingUser ? 'Editar Usuário' : 'Criar Novo Usuário'}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={resetForm}
              >
                ✕ Fechar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Nome Completo *</Label>
                <div className="relative mt-1">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    id="fullName" 
                    type="text" 
                    value={formData.fullName} 
                    onChange={(e) => handleInputChange('fullName', e.target.value)} 
                    placeholder="Digite o nome completo" 
                    className="pl-10" 
                    required 
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Apenas letras e espaços - máximo 50 caracteres</p>
              </div>
              
              <div>
                <Label htmlFor="username">Nome de Usuário *</Label>
                <div className="relative mt-1">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    id="username" 
                    type="text" 
                    value={formData.username} 
                    onChange={(e) => handleInputChange('username', e.target.value)} 
                    placeholder="Digite o nome de usuário" 
                    className="pl-10" 
                    required 
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Letras, números, pontos e underscores - máximo 25 caracteres</p>
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={(e) => handleInputChange('email', e.target.value)} 
                    placeholder="Digite o email" 
                    className="pl-10" 
                    required 
                  />
                </div>
              </div>
              
              <div>
                <Label>Tipo de Usuário *</Label>
                <Select value={formData.userType} onValueChange={(value) => handleInputChange('userType', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="carrier">Transportadora</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.userType === 'carrier' && (
                <div className="md:col-span-2">
                  <Label htmlFor="carrierName">Transportadora *</Label> {/* Updated Label */}
                  <Select value={formData.carrierName} onValueChange={(value) => handleInputChange('carrierName', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione a transportadora" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Add an empty option if desired, or ensure selection is required */}
                      {carriers.length > 0 ? (
                        carriers.map((carrier) => (
                          <SelectItem key={carrier.id} value={carrier.name}>
                            <div className="flex items-center">
                              <Building className="w-4 h-4 mr-2 text-gray-500" />
                              {carrier.name}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value={null} disabled>Nenhuma transportadora ativa encontrada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <Label htmlFor="password">Senha {editingUser ? '(Opcional)' : '*'}</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    id="password" 
                    type="password" 
                    value={formData.password} 
                    onChange={(e) => handleInputChange('password', e.target.value)} 
                    placeholder={editingUser ? "Deixe em branco para manter" : "Mínimo 6 caracteres"} 
                    className="pl-10" 
                    required={!editingUser} 
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirmar Senha {editingUser ? '(Opcional)' : '*'}</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={formData.confirmPassword} 
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)} 
                    placeholder="Confirme a senha" 
                    className="pl-10" 
                    required={!editingUser && !!formData.password} 
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="active-mode" 
                  checked={formData.active} 
                  onCheckedChange={(checked) => handleInputChange('active', checked)} 
                />
                <Label htmlFor="active-mode">Usuário Ativo</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  id="require-password-change" 
                  checked={formData.requirePasswordChange} 
                  onCheckedChange={(checked) => handleInputChange('requirePasswordChange', checked)} 
                />
                <Label htmlFor="require-password-change">Exigir troca de senha no primeiro login</Label>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Salvando...' : (editingUser ? 'Atualizar Usuário' : 'Criar Usuário')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input 
              type="text" 
              placeholder="Buscar por nome, email, transportadora..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10" 
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="p-4 border rounded-lg flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-semibold text-gray-900">{user.fullName}</h3>
                  <p className="text-sm text-gray-600"><strong>Usuário:</strong> {user.username}</p>
                  <p className="text-sm text-gray-600"><strong>Email:</strong> {user.email}</p>
                  {user.carrierName && <p className="text-sm text-gray-600"><strong>Transportadora:</strong> {user.carrierName}</p>}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <Badge className={getUserTypeColor(user.userType)}>
                      {getUserTypeLabel(user.userType)}
                    </Badge>
                    <Badge 
                      variant={user.active ? 'default' : 'secondary'} 
                      className={user.active ? 'bg-green-100 text-green-800' : ''}
                    >
                      {user.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {user.requirePasswordChange && (
                      <Badge className="bg-orange-100 text-orange-800">
                        Trocar Senha
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleEdit(user)} 
                    variant="outline" 
                    size="sm"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    onClick={() => handleDelete(user.id)} 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>{searchTerm ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
