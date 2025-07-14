import React, { useState, useEffect } from 'react';
import { Package, Calendar, MapPin, Weight, DollarSign, Truck, Route, FileText, Eye, Download, User as UserIcon, Building } from "lucide-react";
import { FreightMap, User } from "@/components/ApiDatabase";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CarrierFreightsPage() {
  const [freightMaps, setFreightMaps] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUserAndFreights();
  }, []);

  const loadUserAndFreights = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      if (user && user.userType === 'carrier') {
        // Buscar apenas fretes contratados com esta transportadora
        const allFreights = await FreightMap.filter({ status: 'contracted' });
        const carrierFreights = allFreights.filter(freight => 
          freight.selectedCarrier === user.carrierName
        );
        setFreightMaps(carrierFreights);
      }
    } catch (error) {
      console.error("Error loading carrier freights:", error);
      alert("Erro ao carregar fretes. Verifique se a API está rodando.");
    }
    setLoading(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    }
  };

  const getFilteredFreights = () => {
    if (!searchTerm) return freightMaps;
    return freightMaps.filter(freight => 
      freight.mapNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      freight.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      freight.destination.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getTotalStats = () => {
    const totalValue = freightMaps.reduce((sum, freight) => sum + freight.finalValue, 0);
    const totalKm = freightMaps.reduce((sum, freight) => sum + freight.totalKm, 0);
    const totalWeight = freightMaps.reduce((sum, freight) => sum + freight.weight, 0);
    
    return { totalValue, totalKm, totalWeight, count: freightMaps.length };
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando seus fretes...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.userType !== 'carrier') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-8 text-red-500">
          <Package className="w-16 h-16 mx-auto mb-4" />
          <h3 className="text-xl font-semibold">Acesso Restrito</h3>
          <p>Esta página é exclusiva para transportadoras.</p>
        </div>
      </div>
    );
  }

  const stats = getTotalStats();

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
              <div className="bg-blue-100 p-3 rounded-xl mr-4">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              Meus Fretes Fechados
            </h1>
            <p className="text-gray-600 mt-2 ml-16">
              Fretes contratados com <span className="font-semibold text-blue-600">{currentUser.carrierName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-l-4 border-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Total de Fretes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.count}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Route className="w-4 h-4 mr-2" />
              KM Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">
              {stats.totalKm.toLocaleString('pt-BR')} km
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Weight className="w-4 h-4 mr-2" />
              Peso Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              {stats.totalWeight.toLocaleString('pt-BR')} kg
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          type="text"
          placeholder="Buscar por número do mapa, origem ou destino..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Freight List */}
      {getFilteredFreights().length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
          {freightMaps.length === 0 ? (
            <>
              <h3 className="text-xl font-semibold mb-2">Nenhum frete fechado</h3>
              <p>Ainda não há fretes contratados com sua transportadora.</p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-semibold mb-2">Nenhum resultado encontrado</h3>
              <p>Tente ajustar os termos da busca.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {getFilteredFreights().map((freight) => (
            <Card key={freight.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl text-gray-800 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-blue-600" />
                      Mapa: {freight.mapNumber}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Contratado em: {formatDateTime(freight.contractedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={freight.loadingMode === 'paletizados' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                      {freight.loadingMode === 'paletizados' ? 'Paletizados' : 'BAG'}
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Fechado
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Route Info */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-700 border-b pb-2">Rota</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" /> Origem
                        </p>
                        <p className="font-medium">{freight.origin}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" /> Destino
                        </p>
                        <p className="font-medium">{freight.destination}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Route className="w-3 h-3 mr-1" /> Distância
                        </p>
                        <p className="font-medium">{freight.totalKm} km</p>
                      </div>
                    </div>
                  </div>

                  {/* Load Info */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-700 border-b pb-2">Carga</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Weight className="w-3 h-3 mr-1" /> Peso
                        </p>
                        <p className="font-medium">{freight.weight.toLocaleString('pt-BR')} kg</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Truck className="w-3 h-3 mr-1" /> Tipo Caminhão
                        </p>
                        <p className="font-medium">{freight.truckType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" /> Carregamento
                        </p>
                        <p className="font-medium">{formatDate(freight.loadingDate)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Info */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-700 border-b pb-2">Financeiro</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <DollarSign className="w-3 h-3 mr-1" /> Valor Mapa
                        </p>
                        <p className="font-medium">R$ {freight.mapValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <DollarSign className="w-3 h-3 mr-1" /> Valor Final
                        </p>
                        <p className="font-bold text-green-600 text-lg">
                          R$ {freight.finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">% do Valor Mapa</p>
                        <p className="font-medium">
                          {((freight.finalValue / freight.mapValue) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-700 border-b pb-2">Observações</h4>
                    <div className="space-y-2">
                      {freight.routeInfo ? (
                        <div>
                          <p className="text-sm text-gray-500">Informações da Rota</p>
                          <p className="text-sm bg-gray-50 p-2 rounded">{freight.routeInfo}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Nenhuma observação adicional</p>
                      )}
                      
                      {freight.invoiceUrls && freight.invoiceUrls.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Notas Fiscais</p>
                          <div className="space-y-1">
                            {freight.invoiceUrls.map((url, index) => (
                              <a
                                key={index}
                                href__={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                NF {index + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}