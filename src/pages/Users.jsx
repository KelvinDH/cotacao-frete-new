import React, { useState, useEffect } from 'react';
import { UserPlus, User as UserIcon, Mail, Lock, Building, AlertCircle, CheckCircle, Edit, Trash2, Search } from 'lucide-react';
// A MUDANÇA MAIS IMPORTANTE ESTÁ AQUI:
// Trocamos 'LocalDatabase' por 'ApiDatabase'
import { User } from '@/components/ApiDatabase'; 
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
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
    active: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersList = await User.list();
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Falha ao carregar usuários. Verifique se a API está online.');
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
      active: true
    });
    setEditingUser(null);
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
      setError('Nome da transportadora é obrigatório para usuários do tipo Transportadora');
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
        active: formData.active
      };

      // Só inclua a senha se ela foi digitada
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
      
      await loadUsers();
      resetForm();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMessage = err.response ? (await err.response.json()).error : err.message;
      setError(errorMessage || 'Erro ao salvar usuário');
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
      active: user.active
    });
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await User.delete(userId);
        await loadUsers();
        setSuccess('Usuário excluído com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        setError('Erro ao excluir usuário');
        setTimeout(() => setError(''), 3000);
      }
    }
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
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <UserIcon className="w-6 h-6 mr-2 text-green-600" />
          Gerenciamento de Usuários
        </h2>
        <Button 
          onClick={() => { setShowForm(true); setEditingUser(null); }}
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
            <CardTitle>
              {editingUser ? 'Editar Usuário' : 'Criar Novo Usuário'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Campos do Formulário */}
              <div>
                <Label htmlFor="fullName">Nome Completo *</Label>
                <div className="relative mt-1">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input id="fullName" type="text" value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} placeholder="Digite o nome completo" className="pl-10" required />
                </div>
              </div>
              <div>
                <Label htmlFor="username">Nome de Usuário *</Label>
                <div className="relative mt-1">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input id="username" type="text" value={formData.username} onChange={(e) => handleInputChange('username', e.target.value)} placeholder="Digite o nome de usuário" className="pl-10" required />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="Digite o email" className="pl-10" required />
                </div>
              </div>
              <div>
                <Label>Tipo de Usuário *</Label>
                <Select value={formData.userType} onValueChange={(value) => handleInputChange('userType', value)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="carrier">Transportadora</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.userType === 'carrier' && (
                <div className="md:col-span-2">
                  <Label htmlFor="carrierName">Nome da Transportadora *</Label>
                  <div className="relative mt-1">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input id="carrierName" type="text" value={formData.carrierName} onChange={(e) => handleInputChange('carrierName', e.target.value)} placeholder="Digite o nome da transportadora" className="pl-10" required />
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="password">Senha {editingUser ? '(Opcional)' : '*'}</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input id="password" type="password" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} placeholder={editingUser ? "Deixe em branco para manter" : "Mínimo 6 caracteres"} className="pl-10" required={!editingUser} />
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmar Senha {editingUser ? '(Opcional)' : '*'}</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} placeholder="Confirme a senha" className="pl-10" required={!editingUser && !!formData.password} />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="active-mode" checked={formData.active} onCheckedChange={(checked) => handleInputChange('active', checked)} />
                <Label htmlFor="active-mode">Usuário Ativo</Label>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
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
            <Input type="text" placeholder="Buscar por nome, email, transportadora..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
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
                  <div className="flex items-center gap-2 pt-1">
                    <Badge className={getUserTypeColor(user.userType)}>{getUserTypeLabel(user.userType)}</Badge>
                    <Badge variant={user.active ? 'default' : 'secondary'} className={user.active ? 'bg-green-100 text-green-800' : ''}>{user.active ? 'Ativo' : 'Inativo'}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleEdit(user)} variant="outline" size="sm"><Edit className="w-4 h-4" /></Button>
                  <Button onClick={() => handleDelete(user.id)} variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
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