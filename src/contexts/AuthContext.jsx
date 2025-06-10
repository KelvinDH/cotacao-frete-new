import React, { createContext, useContext, useState, useEffect } from 'react';
import { Auth } from '@/api/entities';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Verifica se há um usuário logado no localStorage
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.log('No authenticated user');
      setUser(null);
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      // Simulação de login para admin - em produção, usar Auth.signIn
      if (email === 'admin@unionagro.com' && password === 'admin123') {
        const adminUser = {
          id: 'admin-1',
          email: 'admin@unionagro.com',
          fullName: 'Administrador',
          userType: 'admin'
        };
        
        setUser(adminUser);
        localStorage.setItem('currentUser', JSON.stringify(adminUser));
        return { success: true };
      }
      
      // Para outros usuários, tentar autenticação real
      // Comentado até que o SDK esteja configurado corretamente
      /*
      const result = await Auth.signIn({ email, password });
      setUser(result.user);
      localStorage.setItem('currentUser', JSON.stringify(result.user));
      return { success: true };
      */
      
      return { success: false, error: 'Credenciais inválidas' };
    } catch (error) {
      return { success: false, error: error.message || 'Erro ao fazer login' };
    }
  };

  const logout = async () => {
    try {
      // Limpar dados locais
      setUser(null);
      localStorage.removeItem('currentUser');
      
      // Em produção, usar Auth.signOut()
      // await Auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.userType === 'admin' || user?.email === 'admin@unionagro.com'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};