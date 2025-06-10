import React from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Truck, FileText, HandshakeIcon, CheckCircle, BarChart, Users, LogOut } from "lucide-react";
import { BarChart as BarChartIconLucide } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function Layout({ children, currentPageName }) {
  const { user, logout, isAdmin } = useAuth();

  const allNavigation = [
    { name: 'Cotação', path: 'Quote', icon: FileText },
    { name: 'Negociação', path: 'Negotiation', icon: HandshakeIcon },
    { name: 'Contratados', path: 'Contracted', icon: CheckCircle },
    { name: 'Relatórios', path: 'Reports', icon: BarChart },
    { name: 'Gráficos', path: 'ChartsPage', icon: BarChartIconLucide },
  ];

  // Add admin-only pages
  if (isAdmin) {
    allNavigation.push({ name: 'Usuários', path: 'UserManagement', icon: Users });
  }

  const handleLogout = async () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      await logout();
    }
  };

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
        <div className="container mx-auto px-4 h-full flex items-center justify-between relative z-10">
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
          
          {/* User info and logout */}
          <div className="flex items-center gap-4 text-white">
            <div className="text-right">
              <p className="text-sm opacity-90">Bem-vindo,</p>
              <p className="font-semibold">{user?.email}</p>
              {isAdmin && (
                <span className="text-xs bg-red-500 px-2 py-1 rounded-full">Admin</span>
              )}
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="text-white border-white hover:bg-white hover:text-gray-800"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 -mt-6">
        <div className="flex justify-start mb-6">
          <div className="bg-white rounded-lg shadow-md p-1 border-t-4 border-green-600">
            {allNavigation.map((item) => {
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