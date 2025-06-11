
import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Truck, FileText, HandshakeIcon, CheckCircle, BarChart, UserCircle, Settings } from "lucide-react";
import { User } from "@/components/ApiDatabase";
import { BarChart as BarChartIconLucide } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";

export default function Layout({ children, currentPageName }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (err) {
      console.log("No user authenticated, continuing without auth");
    }
    setLoading(false);
  };

  const simulateLogin = async (userType = 'admin') => {
    try {
      const users = await User.list();
      let user = users.find(u => u.userType === userType);
      
      if (!user) {
        // Criar usuário com nome de usuário e email únicos
        user = await User.create({
          fullName: userType === 'admin' ? 'Administrador Sistema' : (userType === 'carrier' ? 'Transportadora Demo' : 'Usuário Demo'),
          username: userType, // Ex: 'admin', 'carrier', 'user'
          email: `${userType}@unionagro.com`, // Ex: 'admin@unionagro.com'
          password: '123456',
          userType: userType,
          carrierName: userType === 'carrier' ? 'Transportadora Demo' : null,
          active: true
        });
      }
      
      // Simular login
      localStorage.setItem('currentUser', JSON.stringify(user));
      setCurrentUser(user);
      setShowUserModal(false);
    } catch (error) {
      console.error(`Error simulating login: - ${error.message}`);
      // Se a criação falhar porque o usuário já existe, apenas faça o login dele
      if (error.message.includes('está em uso')) {
        const users = await User.list();
        const existingUser = users.find(u => u.username === userType);
        if (existingUser) {
          localStorage.setItem('currentUser', JSON.stringify(existingUser));
          setCurrentUser(existingUser);
          setShowUserModal(false);
        }
      } else {
        // Handle other types of errors during simulation
        console.error('An unexpected error occurred during simulateLogin:', error);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
  };

  // Corrigindo o 'path' para Transportadoras
  const allNavigation = [
    { name: 'Cotação', path: 'Quote', icon: FileText },
    { name: 'Negociação', path: 'Negotiation', icon: HandshakeIcon },
    { name: 'Contratados', path: 'Contracted', icon: CheckCircle },
    { name: 'Relatórios', path: 'Reports', icon: BarChart },
    { name: 'Gráficos', path: 'ChartsPage', icon: BarChartIconLucide },
    { name: 'Usuários', path: 'Users', icon: UserCircle },
    { name: 'Tipos Caminhão', path: 'TruckTypes', icon: Truck },
    { name: 'Transportadoras', path: 'Carriers', icon: Settings }, 
  ];

  // Removed the filtering - show all navigation to everyone
  const visibleNavigation = allNavigation;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      <style jsx>{`
        :root {
          --primary-color: #008B45;
          --secondary-color: #8BC34A;
          --accent-color: #CDDC39;
          --background-start: #F1F8E9;
          --background-end: #E8F5E9;
          --text-dark: #2c3e50;
          --text-light: #f8fafc;
        }
      `}</style>
      
      <div 
        className="bg-cover bg-center h-48 md:h-64 relative" 
        style={{ 
          backgroundImage: 'url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/83f4dd_cabealho.jpeg)',
          backgroundPosition: 'center 30%',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover'
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="container mx-auto px-4 h-full flex items-center relative z-10">
          <div className="flex items-center">
            <div className="bg-white p-1 rounded-full mr-4 h-16 w-16 flex items-center justify-center">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/964f10_LogoUnion.jpeg" 
                alt="UnionAgro Logo" 
                className="h-14 w-14 rounded-full object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-white">
              UnionAgro (Cotação de Frete)
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 -mt-6">
        {/* User Control Bar */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="bg-green-100 p-2 rounded-full">
              <UserCircle className="w-6 h-6 text-green-700" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Sistema de Fretes</p>
              {currentUser ? (
                <div>
                  <p className="font-medium text-gray-800">
                    {currentUser.fullName}
                    {currentUser.carrierName && (
                      <span className="ml-2 text-sm text-blue-600">
                        ({currentUser.carrierName})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {currentUser.userType === 'admin' ? 'Administrador' : 
                     currentUser.userType === 'carrier' ? 'Transportadora' : 'Usuário'}
                  </p>
                </div>
              ) : (
                <p className="font-medium text-gray-800">Acesso Público</p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {!currentUser ? (
              <Popover open={showUserModal} onOpenChange={setShowUserModal}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-1" />
                    Simular Usuário
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-3">
                    <h4 className="font-medium">Simular Tipo de Usuário</h4>
                    <p className="text-sm text-gray-600">Para testar as funcionalidades, selecione um tipo de usuário:</p>
                    <div className="space-y-2">
                      <Button 
                        onClick={() => simulateLogin('admin')} 
                        className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                        size="sm"
                      >
                        👤 Administrador
                      </Button>
                      <Button 
                        onClick={() => simulateLogin('carrier')} 
                        className="w-full justify-start bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        🚛 Transportadora
                      </Button>
                      <Button 
                        onClick={() => simulateLogin('user')} 
                        className="w-full justify-start bg-gray-600 hover:bg-gray-700"
                        size="sm"
                      >
                        👥 Usuário
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Button 
                onClick={handleLogout}
                variant="outline" 
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Sair ({currentUser.userType})
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-start mb-6">
          <div className="bg-white rounded-lg shadow-md p-1 border-t-4 border-green-600">
            {visibleNavigation.map((item) => { // Using visibleNavigation instead of allNavigation
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={createPageUrl(item.path)}
                  className={`inline-flex items-center px-6 py-2 rounded-lg transition-colors duration-200 ${
                    currentPageName === item.path
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:bg-green-50'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div className={`bg-white rounded-lg shadow-lg overflow-hidden border-l-4 border-green-600 ${currentPageName === 'ChartsPage' ? 'p-0' : ''}`}>
          {children}
        </div>
        
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} UnionAgro - Cotação de Fretes</p>
        </div>
      </div>
    </div>
  );
}
