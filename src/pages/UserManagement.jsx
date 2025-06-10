import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Eye, EyeOff, Search, UserCheck, Building, Shield } from 'lucide-react';
import { AppUser, Carrier } from '@/api/entities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const USER_TYPES = {
  user: { label: 'Usuário', icon: UserCheck, color: 'bg-blue-100 text-blue-800' },
  carrier: { label: 'Transportadora', icon: Building, color: 'bg-purple-100 text-purple-800' },
  admin: { label: 'Administrador', icon: Shield, color: 'bg-red-100 text-red-800' }
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    userType: 'user',
    carrierName: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadUsers();
    loadCarriers();
  }, []);

  const loadUsers = async () => {
    try {
      // Simulação de dados para demonstração
      // Em produção, usar: const userList = await AppUser.list();
      const mockUsers = [
        {
          id: 'admin-1',
          fullName: 'Administrador Sistema',
          username: 'admin',
          email: 'admin@unionagro.com',
          userType: 'admin',
          carrierName: null,
          isActive: true
        },
        {
          id: 'user-1',
          fullName: 'João Silva',
          username: 'joao.silva',
          email: 'joao@unionagro.com',
          userType: 'user',
          carrierName: null,
          isActive: true
        },
        {
          id: 'carrier-1',
          fullName: 'Maria Santos',
          username: 'maria.santos',
          email: 'maria@transportadora.com',
          userType: 'carrier',
          carrierName: 'Transportadora ABC',
          isActive: true
        }
      ];
      
      setUsers(mockUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      // Fallback para dados mock em caso de erro
      setUsers([]);
    }
    setLoading(false);
  };

  const loadCarriers = async () => {
    try {
      const carrierList = await Carrier.list();
      setCarriers(carrierList);
    } catch (error) {
      console.error('Error loading carriers:', error);
      setCarriers([]);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Nome completo é obrigatório';
    }

    if (!formData.username.trim()) {
      errors.username = 'Nome de usuário é obrigatório';
    } else if (formData.username.length < 3) {
      errors.username = 'Nome de usuário deve ter pelo menos 3 caracteres';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email inválido';
    }

    if (!editingUser && !formData.password.trim()) {
      errors.password = 'Senha é obrigatória';
    } else if (!editingUser && formData.password.length < 6) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (formData.userType === 'carrier' && !formData.carrierName.trim()) {
      errors.carrierName = 'Nome da transportadora é obrigatório para usuários do tipo Transportadora';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const userData = {
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        userType: formData.userType,
        carrierName: formData.userType === 'carrier' ? formData.carrierName : null,
        isActive: true
      };

      if (!editingUser) {
        userData.password = formData.password;
        userData.id = `user-${Date.now()}`;
      }

      if (editingUser) {
        // Simular update
        setUsers(prev => prev.map(user => 
          user.id === editingUser.id ? { ...user, ...userData } : user
        ));
        // Em produção: await AppUser.update(editingUser.id, userData);
      } else {
        // Simular create
        setUsers(prev => [...prev, userData]);
        // Em produção: await AppUser.create(userData);
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Erro ao salvar usuário. Verifique se o email e nome de usuário são únicos.');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      password: '',
      userType: user.userType,
      carrierName: user.carrierName || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        // Simular delete
        setUsers(prev => prev.filter(user => user.id !== userId));
        // Em produção: await AppUser.delete(userId);
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Erro ao excluir usuário.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      username: '',
      email: '',
      password: '',
      userType: 'user',
      carrierName: ''
    });
    setFormErrors({});
    setEditingUser(null);
    setShowPassword(false);
  };

  const filteredUsers = users.filter(user =>
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.carrierName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Users className="w-6 h-6 mr-2 text-blue-600" />
          Gerenciamento de Usuários
        </h2>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              type="text"
              placeholder="Pesquisar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full md:w-64"
            />
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={resetForm}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo
                  </label>
                  <Input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className={formErrors.fullName ? 'border-red-500' : ''}
                  />
                  {formErrors.fullName && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome de Usuário
                  </label>
                  <Input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className={formErrors.username ? 'border-red-500' : ''}
                  />
                  {formErrors.username && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={formErrors.email ? 'border-red-500' : ''}
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className={formErrors.password ? 'border-red-500 pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Usuário
                  </label>
                  <Select value={formData.userType} onValueChange={(value) => setFormData({...formData, userType: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="carrier">Transportadora</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.userType === 'carrier' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Transportadora
                    </label>
                    <Input
                      type="text"
                      value={formData.carrierName}
                      onChange={(e) => setFormData({...formData, carrierName: e.target.value})}
                      className={formErrors.carrierName ? 'border-red-500' : ''}
                    />
                    {formErrors.carrierName && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.carrierName}</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {editingUser ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {users.length === 0 ? (
            <>
              Nenhum usuário cadastrado ainda.
              <p className="mt-2 text-sm">
                Clique em "Novo Usuário\" para começar.
              </p>
            </>
          ) : (
            <>
              Nenhum usuário encontrado com o termo "{searchTerm}".
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transportadora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const userTypeInfo = USER_TYPES[user.userType] || USER_TYPES.user;
                  const Icon = userTypeInfo.icon;
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{user.username}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={userTypeInfo.color}>
                          <Icon className="w-3 h-3 mr-1" />
                          {userTypeInfo.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.carrierName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(user)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-800"
                            disabled={user.email === 'admin@unionagro.com'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}