import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Usuários pré-cadastrados
  const users = [
    { id: 1, username: 'admin', password: 'admin123', name: 'Administrador' },
    { id: 2, username: 'user1', password: 'user123', name: 'Usuário 1' },
    { id: 3, username: 'user2', password: 'user456', name: 'Usuário 2' },
    { id: 4, username: 'demo', password: 'demo123', name: 'Usuário Demo' }
  ];

  useEffect(() => {
    // Verificar se há uma sessão salva no localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = (username, password) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      const userWithoutPassword = { id: user.id, username: user.username, name: user.name };
      setCurrentUser(userWithoutPassword);
      setIsAuthenticated(true);
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      return { success: true };
    }
    return { success: false, message: 'Usuário ou senha inválidos' };
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('currentUser');
  };

  const value = {
    isAuthenticated,
    currentUser,
    login,
    logout,
    loading,
    users: users.map(u => ({ id: u.id, username: u.username, name: u.name })) // Sem senhas
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

