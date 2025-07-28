
import React, { useState, useEffect } from 'react';
import { FileText, Plus, MapPin, Weight, DollarSign, Calendar, Truck, Route, Upload, Image as ImageIcon, Eye, X, CheckCircle, Users, Loader2, Map, ChevronDown } from "lucide-react";
import { FreightMap, TruckType, Carrier, User, UploadFile } from "@/components/ApiDatabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBrazilIsoNow } from '../utils/getBrazilIsoNow';
import { sendEmail } from '../utils/sendEmail';
import RouteMapComponent from '../components/RouteMapComponent';
import CityCombobox from '../components/CityCombobox'; // ✅ IMPORTADO O NOVO COMPONENTE

// IMPORTANDO DADOS LOCAIS
import { states as statesData } from '../components/data/states';
import { cities as allCitiesData } from '../components/data/cities';

// Opções pré-definidas para o campo Gerente
const managerOptions = ["TIAGO LOPES TOLENTINO", "CLAUDIO FEUSER", "DIEGO JOSÉ MANIAS MARSÃO", "VENDA DIRETA", "VerdeLog"];

export default function QuotePage() {
  const [formData, setFormData] = useState({
    mapNumber: '',
    origin: 'Pederneiras/SP', // Valor fixo pré-definido
    destinationState: '', // Novo campo para o estado de destino
    destinationCity: '', // Novo campo para a cidade de destino
    totalKm: '',
    weight: '',
    mapValue: '',
    truckType: '',
    selectedCarriers: [],
    loadingMode: '',
    loadingDate: null,
    routeInfo: '',
    mapImage: ''
  });

  const [truckTypes, setTruckTypes] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  // Novos estados para Gerente/Valor e para o tipo de usuário
  const [managerFields, setManagerFields] = useState([{ gerente: '', valor: '' }]);
  const [currentUser, setCurrentUser] = useState(null);

  // Novos estados para seleção de destino e cálculo de rota
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  // NOVOS ESTADOS para a integração com OpenRouteService
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(''); // Initialize with empty string

  const [showRouteMap, setShowRouteMap] = useState(false);

  useEffect(() => {
    // Efeito para carregar dados iniciais (agora só para Transportadoras e Tipos de Caminhão)
    const loadInitialData = async () => {
      try {
        const [truckData, carrierData] = await Promise.all([
          TruckType.list(),
          Carrier.list()
        ]);
        setTruckTypes(truckData);
        setCarriers(carrierData.filter(c => c.active));
        // CARREGANDO ESTADOS DO ARQUIVO LOCAL
        setStates(statesData.sort((a, b) => a.Nome.localeCompare(b.Nome)));
      } catch (error) {
        console.error("Erro ao buscar dados iniciais:", error);
        alert("Erro ao carregar dados iniciais.");
      }
    };
    loadInitialData();

    const fetchUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Não foi possível buscar o usuário:", error);
        setCurrentUser({ userType: 'admin' });
      }
    };
    fetchUser();
  }, []);

  // Efeito para buscar cidades quando o estado muda (agora filtra do arquivo local)
  useEffect(() => {
    if (formData.destinationState) {
      // FILTRANDO CIDADES DO ARQUIVO LOCAL
      const filteredCities = allCitiesData.filter(
        city => city.Estado == formData.destinationState
      );
      setCities(filteredCities.sort((a, b) => a.Nome.localeCompare(b.Nome)));
    } else {
      setCities([]); // Limpa as cidades se nenhum estado estiver selecionado
    }
    // Reseta a cidade selecionada quando o estado muda
    handleInputChange('destinationCity', '');
  }, [formData.destinationState]);

  // NOVO useEffect para calcular rota quando origem e destino mudarem
  useEffect(() => {
    if (formData.destinationCity && formData.destinationState) {
      calculateRouteWithMap();
    } else {
      setRouteData(null);
      setRouteError('');
      handleInputChange('totalKm', '');
      setShowRouteMap(false); // Hide map if destination is not fully selected
    }
  }, [formData.destinationCity, formData.destinationState, states]); // Depende de 'states' para garantir que o nome do estado está disponível

  // NOVA FUNÇÃO: Calcular rota com OpenRouteService - CORRIGIDA
  const calculateRouteWithMap = async () => {
    if (!formData.destinationCity || !formData.destinationState) return;

    setRouteLoading(true);
    setRouteError('');

    try {
      const selectedStateObj = states.find(s => s.ID == formData.destinationState);
      if (!selectedStateObj) {
        setRouteError('Estado inválido selecionado. Não foi possível calcular a rota.');
        setRouteLoading(false);
        return;
      }

      // CORRIGIDO: Chamando a rota correta no seu servidor local
      const response = await fetch('http://localhost:3001/api/calculate-route', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            originCity: 'Pederneiras',
            originState: 'SP',
            destinationCity: formData.destinationCity,
            destinationState: selectedStateObj.Sigla
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Dados da rota recebidos no frontend:", data); // Log para depuração
        setRouteData(data);
        // ATUALIZADO: Usa a distância da rota para preencher o campo
        handleInputChange('totalKm', data.route.distance.toString());
        setRouteError('');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao processar a resposta do servidor.' }));
        throw new Error(errorData.error || 'Erro ao calcular rota');
      }

    } catch (error) {
      console.error("Erro ao calcular rota:", error);
      setRouteError('Não foi possível calcular a rota. Insira a distância manualmente.');
      setRouteData(null);
      handleInputChange('totalKm', ''); // Limpa o KM em caso de erro
    } finally {
      setRouteLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    // Impede alteração do campo origin
    if (field === 'origin') return;

    // Se o estado for alterado, limpa a cidade e km
    if (field === 'destinationState') {
      setFormData(prev => ({
        ...prev,
        destinationState: value,
        destinationCity: '', // Limpa a cidade quando o estado muda
        totalKm: '' // Limpa o KM quando o estado muda
      }));
      setRouteError(''); // Limpa o erro de rota
      setRouteData(null); // Clear route data
      setShowRouteMap(false); // Hide map
    } else if (field === 'destinationCity') { // Quando a cidade muda, limpa o KM para recalcular
      setFormData(prev => ({
        ...prev,
        destinationCity: value,
        totalKm: '' // Limpa o KM quando a cidade muda
      }));
      setRouteError(''); // Limpa o erro de rota
      setRouteData(null); // Clear route data
      setShowRouteMap(false); // Hide map
    } else if (field === 'loadingMode') {
      setFormData(prev => ({
        ...prev,
        loadingMode: value,
        selectedCarriers: [], // Limpa as transportadoras selecionadas
        truckType: '' // Limpa o tipo de caminhão selecionado
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleMapNumberChange = (value) => {
    const digitsOnly = value.replace(/\D/g, '');
    const truncatedDigits = digitsOnly.slice(0, 8);

    let maskedValue = truncatedDigits;
    if (truncatedDigits.length > 2) {
      maskedValue = `${truncatedDigits.slice(0, 2)}/${truncatedDigits.slice(2)}`;
    }

    handleInputChange('mapNumber', maskedValue);
  };

  const handleCarrierToggle = (carrierName, checked) => {
    setFormData(prev => ({
      ...prev,
      selectedCarriers: checked
        ? [...prev.selectedCarriers, carrierName]
        : prev.selectedCarriers.filter(name => name !== carrierName)
    }));
  };

  // Função para calcular o total dos valores dos gerentes
  const calculateManagersTotal = () => {
    return managerFields.reduce((total, field) => {
      const valor = parseFloat(field.valor) || 0;
      return total + valor;
    }, 0);
  };

  // Função para verificar se pode adicionar mais gerentes
  const canAddMoreManagers = () => {
    const mapValue = parseFloat(formData.mapValue) || 0;
    const managersTotal = calculateManagersTotal();
    return mapValue > 0 && managersTotal < mapValue;
  };

  // Função para obter o valor restante disponível
  const getRemainingValue = () => {
    const mapValue = parseFloat(formData.mapValue) || 0;
    const managersTotal = calculateManagersTotal();
    return Math.max(0, mapValue - managersTotal);
  };

  // Funções para gerenciar os campos de Gerente/Valor
  const handleManagerChange = (index, field, value) => {
    const updatedFields = [...managerFields];

    // Validação para o campo valor
    if (field === 'valor') {
      // Limita a 9 dígitos
      if (value.length > 9) return;

      const numericValue = parseFloat(value) || 0;
      const mapValue = parseFloat(formData.mapValue) || 0;

      // Validação 1: Valor individual não pode ser maior que o valor do mapa
      if (mapValue > 0 && numericValue > mapValue) {
        alert(`O valor do gerente (${numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) não pode ser maior que o valor do mapa (R$ ${mapValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
        return;
      }

      // Calcular o total atual sem este campo para verificar se a soma ultrapassa o limite
      const currentTotalExcludingThisField = managerFields.reduce((total, f, i) => {
        if (i === index) return total; // Pula o campo atual
        return total + (parseFloat(f.valor) || 0);
      }, 0);

      // Validação 2: A soma dos valores dos gerentes não pode ultrapassar o valor do mapa
      if (mapValue > 0 && (currentTotalExcludingThisField + numericValue) > mapValue) {
        const remaining = Math.max(0, mapValue - currentTotalExcludingThisField);
        alert(`O valor excede o limite do mapa. Valor máximo disponível para este campo: R$ ${remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        return;
      }
    }

    updatedFields[index][field] = value;
    setManagerFields(updatedFields);
  };

  const addManagerField = () => {
    if (!formData.mapValue || parseFloat(formData.mapValue) === 0) {
      alert("Por favor, preencha o 'Valor do Mapa' antes de adicionar gerentes.");
      return;
    }

    if (!canAddMoreManagers()) {
      const mapValue = parseFloat(formData.mapValue) || 0;
      const managersTotal = calculateManagersTotal();

      if (managersTotal >= mapValue) {
        alert(`Não é possível adicionar mais gerentes. O valor total dos gerentes (R$ ${managersTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) já atingiu o valor do mapa (R$ ${mapValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
      } else {
        alert(`Valor do mapa insuficiente para adicionar mais gerentes. Complete o valor dos gerentes existentes primeiro.`);
      }
      return;
    }
    setManagerFields([...managerFields, { gerente: '', valor: '' }]);
  };

  const removeManagerField = (index) => {
    const updatedFields = [...managerFields];
    updatedFields.splice(index, 1);
    setManagerFields(updatedFields);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        mapImage: file_url
      }));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Erro ao fazer upload da imagem. Verifique se a API está rodando.");
    } finally {
      setUploadingImage(false);
    }
  };

  // NOVA FUNÇÃO: Para mapear modalidades fracionadas às suas principais
  const getCompatibleModality = (selectedModality) => {
    switch (selectedModality) {
      case 'bag_fracionado':
        return 'bag';
      case 'paletizados_fracionado':
        return 'paletizados';
      default:
        return selectedModality;
    }
  };

  // Função para filtrar tipos de caminhão baseado na modalidade selecionada
  const getFilteredTruckTypes = () => {
    if (!formData.loadingMode) {
      return [];
    }
    // ATUALIZADO: Usa a modalidade compatível para filtrar
    const compatibleModality = getCompatibleModality(formData.loadingMode);
    return truckTypes.filter(truck => truck.modality === compatibleModality);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação atualizada para os novos campos de destino
    if (!formData.mapNumber || !formData.origin || !formData.destinationState || !formData.destinationCity || !formData.totalKm || !formData.weight || !formData.mapValue || !formData.truckType || formData.selectedCarriers.length === 0 || !formData.loadingMode || !formData.loadingDate) {
      alert("Por favor, preencha todos os campos obrigatórios e selecione pelo menos uma transportadora");
      return;
    }

    // Construir string de destino completa (Ex: "Cidade/UF")
    const selectedStateObj = states.find(s => s.ID == formData.destinationState);
    const fullDestination = selectedStateObj ? `${formData.destinationCity}/${selectedStateObj.Sigla}` : `${formData.destinationCity}/${formData.destinationState}`;

    // NOVA LÓGICA: Filtrar apenas transportadoras que ainda não receberam este mapa
    let carriersToSend = [];
    let duplicateCarriers = [];

    try {
      const allMaps = await FreightMap.list();

      // Separar transportadoras que já receberam este mapa das que não receberam
      duplicateCarriers = formData.selectedCarriers.filter(carrierName =>
        allMaps.some(map => map.mapNumber === formData.mapNumber && map.selectedCarrier === carrierName)
      );

      // Manter apenas as transportadoras que ainda não receberam este mapa
      carriersToSend = formData.selectedCarriers.filter(carrierName =>
        !allMaps.some(map => map.mapNumber === formData.mapNumber && map.selectedCarrier === carrierName)
      );

      // Avisar sobre transportadoras que já receberam, mas continuar com as outras
      if (duplicateCarriers.length > 0) {
        const message = `As seguintes transportadoras já receberam o mapa ${formData.mapNumber}: ${duplicateCarriers.join(', ')}.\n\nA cotação será enviada apenas para as demais transportadoras selecionadas.`;
        if (!confirm(message + "\n\nDeseja continuar?")) {
          return;
        }
      }

      // Se não sobrou nenhuma transportadora para enviar
      if (carriersToSend.length === 0) {
        alert(`Todas as transportadoras selecionadas já receberam o mapa ${formData.mapNumber}. Selecione outras transportadoras ou use um número de mapa diferente.`);
        return;
      }
    } catch (error) {
      console.error("Erro ao verificar mapa existente:", error);
      // Em caso de erro, continua com todas as transportadoras selecionadas
      carriersToSend = [...formData.selectedCarriers];
      duplicateCarriers = []; // Clear duplicates if we can't verify
    }

    // Validação final dos gerentes antes do submit
    const mapValue = parseFloat(formData.mapValue) || 0;
    const managersTotal = calculateManagersTotal();

    if (currentUser && currentUser.userType !== 'carrier') {
      if (managersTotal > mapValue) {
        alert(`Erro: O valor total dos gerentes (R$ ${managersTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede o valor do mapa (R$ ${mapValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Por favor, ajuste os valores.`);
        return;
      }
      if (managersTotal < mapValue && managerFields.some(f => f.gerente || f.valor)) {
        alert(`Atenção: O valor total dos gerentes (R$ ${managersTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) é menor que o valor do mapa (R$ ${mapValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Considere ajustar ou adicionar mais gerentes.`);
      }
    }

    setLoading(true);
    try {
      const baseFreightData = {
        mapNumber: formData.mapNumber,
        mapImage: formData.mapImage,
        origin: formData.origin,
        destination: fullDestination, // Usa o destino completo construído
        totalKm: parseInt(formData.totalKm),
        weight: parseFloat(formData.weight),
        mapValue: parseFloat(formData.mapValue),
        truckType: formData.truckType,
        loadingMode: formData.loadingMode,
        loadingDate: formData.loadingDate ? format(formData.loadingDate, 'yyyy-MM-dd') : '',
        routeInfo: formData.routeInfo,
        managers: managerFields
          .filter(f => f.gerente && f.valor && parseFloat(f.valor) > 0)
          .map(f => ({ ...f, valor: parseFloat(f.valor) })),
        carrierProposals: {},
        status: 'negotiating',
        invoiceUrls: [],
        // ✅ NOVO: Salvar os dados da rota calculada
        routeData: routeData ? {
          origin: routeData.origin.coordinates,
          destination: routeData.destination.coordinates,
          route: {
            distance: routeData.route.distance,
            duration: routeData.route.duration,
            geometry: routeData.route.geometry
          }
        } : null,
        created_date: getBrazilIsoNow(),
        updated_date: getBrazilIsoNow()
      };

      // CRIAR UM MAPA APENAS PARA AS TRANSPORTADORAS QUE AINDA NÃO RECEBERAM
      const freightPromises = carriersToSend.map(carrierName => {
        return FreightMap.create({
          ...baseFreightData,
          selectedCarrier: carrierName
        });
      });

      await Promise.all(freightPromises);

      // ENVIAR EMAILS PARA AS TRANSPORTADORAS (apenas para as que receberam a cotação)
      try {
        // Buscar usuários do tipo carrier para obter seus emails
        const users = await User.list();

        const emailPromises = carriersToSend.map(async (carrierName) => {
          // Encontrar o usuário carrier correspondente à transportadora
          const carrierUser = users.find(user =>
            user.userType === 'carrier' &&
            user.carrierName === carrierName &&
            user.active
          );

          if (!carrierUser) {
            console.warn(`Usuário não encontrado para a transportadora: ${carrierName}. Email não enviado.`);
            return undefined;
          }

          let loadingModeText = '';
          switch (formData.loadingMode) {
            case 'paletizados':
              loadingModeText = 'Paletizados';
              break;
            case 'bag':
              loadingModeText = 'BAG';
              break;
            case 'granel':
              loadingModeText = 'Granel';
              break;
            case 'bag_fracionado':
              loadingModeText = 'BAG Fracionado';
              break;
            case 'paletizados_fracionado':
              loadingModeText = 'Paletizados Fracionado';
              break;
            default:
              loadingModeText = formData.loadingMode;
          }

          const emailSubject = `🚛 Nova Cotação de Frete - Mapa ${formData.mapNumber}`;
          const emailBody = `
            <h2>Olá, ${carrierUser.fullName}!</h2>
            <p>Você recebeu uma nova cotação de frete:</p>

            <h3>📋 DETALHES DA COTAÇÃO:</h3>
            <ul>
              <li><strong>Mapa:</strong> ${formData.mapNumber}</li>
              <li><strong>Rota:</strong> ${formData.origin} → ${fullDestination}</li>
              <li><strong>Distância:</strong> ${formData.totalKm} km</li>
              <li><strong>Peso:</strong> ${formData.weight} kg</li>
              <li><strong>Valor do Mapa:</strong> R$ ${parseFloat(formData.mapValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</li>
              <li><strong>Tipo de Caminhão:</strong> ${formData.truckType}</li>
              <li><strong>Modalidade:</b> ${loadingModeText}</li>
              <li><strong>Data de Carregamento:</strong> ${formData.loadingDate ? format(formData.loadingDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Não informada'}</li>
            </ul>

            <p>⏰ <strong>Acesse o sistema para enviar sua proposta!</strong></p>

            <p>Atenciosamente,<br>Equipe UnionAgro</p>
          `;

          return sendEmail({
            to: carrierUser.email,
            subject: emailSubject,
            html: emailBody
          });
        });

        // Filtrar emails válidos antes de enviar
        const validEmailPromises = emailPromises.filter(promise => promise !== undefined);
        if (validEmailPromises.length > 0) {
          await Promise.all(validEmailPromises);
          console.log('Emails enviados para as transportadoras com sucesso!');
        } else {
          console.log('Nenhum email para transportadoras elegíveis foi enviado.');
        }
      } catch (emailError) {
        console.error('Erro ao enviar emails para transportadoras:', emailError);
        // Não bloqueia o fluxo principal se houver erro no email
      }

      // MENSAGEM DE SUCESSO PERSONALIZADA
      let successMessage = `Cotação criada com sucesso para ${carriersToSend.length} transportadora(s)!`;
      if (duplicateCarriers.length > 0) {
        successMessage += `\n\nNota: ${duplicateCarriers.length} transportadora(s) foram puladas por já terem recebido este mapa.`;
      }
      successMessage += '\n\nEmails de notificação foram enviados.';

      alert(successMessage);

      // Reset do form mantendo a origem fixa e limpando os novos campos de destino
      setFormData({
        mapNumber: '',
        origin: 'Pederneiras/SP', // Mantém origem fixa no reset
        destinationState: '',
        destinationCity: '',
        totalKm: '',
        weight: '',
        mapValue: '',
        truckType: '',
        selectedCarriers: [],
        loadingMode: '',
        loadingDate: null,
        routeInfo: '',
        mapImage: ''
      });
      setManagerFields([{ gerente: '', valor: '' }]);
      setRouteError(''); // Limpa o erro de rota no reset
      setRouteData(null); // Clear route data on reset
      setShowRouteMap(false); // Hide map on reset
    } catch (error) {
      console.error("Error creating freight map:", error);
      alert("Erro ao criar cotação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      mapImage: ''
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Formulário Principal Centralizado */}
        <Card className="shadow-xl border-0 mt-4">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
            <CardTitle className="text-xl">Informações da Cotação</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Identificação */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-600" />
                  Identificação
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número do Mapa *
                    </label>
                    <Input
                      type="text"
                      value={formData.mapNumber}
                      onChange={(e) => handleMapNumberChange(e.target.value)}
                      placeholder="00/000000"
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                      maxLength={9}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modalidade de Carregamento *
                    </label>
                    <Select value={formData.loadingMode} onValueChange={(value) => handleInputChange('loadingMode', value)}>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Selecione a modalidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paletizados">📦 Paletizados</SelectItem>
                        <SelectItem value="bag">🎒 BAG</SelectItem>
                        <SelectItem value="granel">🌾 Granel</SelectItem>
                        <SelectItem value="bag_fracionado">🎒 BAG Fracionado</SelectItem>
                        <SelectItem value="paletizados_fracionado">📦 Paletizados Fracionado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* SEÇÃO DO MAPA - CENTRALIZADA E MAIOR */}
              <div className="bg-indigo-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-6 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 mr-2 text-indigo-600" />
                  Mapa da Rota
                </h3>

                <div className="flex justify-center">
                  {!formData.mapImage ? (
                    <div className="w-full max-w-2xl border-2 border-dashed border-indigo-300 rounded-lg p-12 text-center hover:border-indigo-400 transition-colors bg-white">
                      <div className="space-y-6">
                        <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
                          <Upload className="w-10 h-10 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-lg text-gray-700 font-medium">Anexar Imagem do Mapa</p>
                          <p className="text-sm text-gray-500 mt-2">PNG, JPG até 10MB</p>
                        </div>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            disabled={uploadingImage}
                            className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 px-8 py-3"
                          >
                            {uploadingImage ? (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                Enviando...
                              </div>
                            ) : (
                              <>
                                <Upload className="w-5 h-5 mr-2" />
                                Escolher Arquivo
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-2xl space-y-4">
                      {/* Preview da Imagem */}
                      <div className="relative group bg-white rounded-lg p-4 shadow-sm">
                        <img
                          src={formData.mapImage}
                          alt="Mapa da Rota"
                          className="w-full h-[500px] object-contain rounded-lg"
                        />
                        <div className="absolute inset-4 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-3">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setShowImagePreview(true)}
                              className="bg-white text-gray-800 hover:bg-gray-100"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={removeImage}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Informações da Imagem */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center text-green-700 mb-2">
                          <CheckCircle className="w-6 h-6 mr-2" />
                          <span className="font-medium text-lg">Imagem carregada com sucesso!</span>
                        </div>
                        <p className="text-sm text-green-600">
                          Clique na imagem para visualizar em tamanho maior
                        </p>
                      </div>

                      {/* Botão para trocar imagem */}
                      <div className="relative flex justify-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="border-gray-300 px-8"
                          disabled={uploadingImage}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Trocar Imagem
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Informações da Rota - ATUALIZADA */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                  Informações da Rota
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Origem (Fixo)
                    </label>
                    <Input
                      type="text"
                      value={formData.origin}
                      readOnly
                      disabled
                      className="border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ⚠️ Origem fixa do sistema
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado de Destino *
                    </label>
                    <Select value={formData.destinationState} onValueChange={(value) => handleInputChange('destinationState', value)}>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map(state => (
                          <SelectItem key={state.ID} value={state.ID}>{state.Nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cidade de Destino *
                    </label>
                    {/* ✅ SUBSTITUÍDO O SELECT PELO COMBOBOX */}
                    <CityCombobox
                      value={formData.destinationCity}
                      onChange={(value) => handleInputChange('destinationCity', value)}
                      disabled={!formData.destinationState || routeLoading}
                      cities={cities}
                      placeholder={
                        !formData.destinationState ? 'Selecione um estado primeiro' :
                        'Selecione a cidade'
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Distância Total (km) *
                    </label>
                    <div className="relative">
                      <Route className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="number"
                        value={formData.totalKm}
                        onChange={(e) => handleInputChange('totalKm', e.target.value)}
                        placeholder={routeLoading ? "Calculando..." : (routeError ? "Insira manualmente" : "Calculado automaticamente")}
                        className="pl-10 border-gray-300 focus:border-blue-500"
                        required
                        readOnly={!routeError && !routeLoading && routeData}
                        disabled={routeLoading}
                      />
                      {routeLoading && <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />}
                    </div>
                    {routeError && <p className="text-xs text-red-600 mt-1">{routeError}</p>}
                    {routeData && !routeError && (
                      <p className="text-xs text-green-600 mt-1">
                        Rota calculada automaticamente • {Math.floor(routeData.route.duration / 60)}h {Math.round(routeData.route.duration % 60)}m
                      </p>
                    )}
                  </div>
                </div>

                {/* NOVO: Botão para mostrar/ocultar mapa */}
                {routeData && (
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowRouteMap(!showRouteMap)}
                      className="w-full flex items-center justify-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      <Map className="w-4 h-4" />
                      {showRouteMap ? 'Ocultar Mapa da Rota' : 'Visualizar Mapa da Rota'}
                      <ChevronDown className={`w-4 h-4 transition-transform ${showRouteMap ? 'rotate-180' : ''}`} />
                    </Button>

                    {/* NOVO: Componente do mapa */}
                    {showRouteMap && (
                      <div className="mt-4 rounded-lg overflow-hidden border border-blue-200">
                        <RouteMapComponent
                          origin={routeData.origin.coordinates}
                          destination={routeData.destination.coordinates}
                          // ATUALIZADO: Passa o objeto de rota completo para o componente do mapa
                          route={routeData.route}
                          height="400px"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Carga e Valores */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <Weight className="w-5 h-5 mr-2 text-yellow-600" />
                  Carga e Valores
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Peso (kg) *
                    </label>
                    <div className="relative">
                      <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.weight}
                        onChange={(e) => {
                          if (e.target.value.length > 9) return;
                          handleInputChange('weight', e.target.value)
                        }}
                        placeholder="Ex: 15000"
                        className="pl-10 border-gray-300 focus:border-yellow-500"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor do Mapa (R$) *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.mapValue}
                        onChange={(e) => {
                          if (e.target.value.length > 9) return;
                          handleInputChange('mapValue', e.target.value)
                        }}
                        placeholder="Ex: 2500.00"
                        className="pl-10 border-gray-300 focus:border-yellow-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO CONDICIONAL: Gerente e Valor */}
              {currentUser && currentUser.userType !== 'carrier' && (
                <div className="bg-teal-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-teal-600" />
                    Gerentes e Valores
                  </h3>

                  {/* Indicador de valor total e restante */}
                  {formData.mapValue && parseFloat(formData.mapValue) > 0 && (
                    <div className="mb-4 p-3 bg-white border border-teal-200 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xs text-gray-600">Valor do Mapa</p>
                          <p className="font-bold text-teal-700">
                            R$ {parseFloat(formData.mapValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Total Gerentes</p>
                          <p className="font-bold text-blue-700">
                            R$ {calculateManagersTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Valor Restante</p>
                          <p className={`font-bold ${getRemainingValue() > 0 ? 'text-green-700' : 'text-red-700'}`}>
                            R$ {getRemainingValue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Barra de progresso visual */}
                      <div className="mt-3">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              calculateManagersTotal() >= parseFloat(formData.mapValue)
                                ? 'bg-red-500'
                                : calculateManagersTotal() > parseFloat(formData.mapValue) * 0.8
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min(100, (calculateManagersTotal() / parseFloat(formData.mapValue)) * 100)}%`
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          {((calculateManagersTotal() / parseFloat(formData.mapValue)) * 100).toFixed(1)}% do valor total
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {managerFields.map((field, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Gerente
                          </label>
                          <Select value={field.gerente} onValueChange={(value) => handleManagerChange(index, 'gerente', value)}>
                            <SelectTrigger className="border-gray-300 bg-white">
                              <SelectValue placeholder="Selecione o gerente" />
                            </SelectTrigger>
                            <SelectContent>
                              {managerOptions.map(option => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Valor (R$)
                            {formData.mapValue && index === managerFields.length - 1 && getRemainingValue() > 0 && (
                              <span className="text-xs text-green-600 ml-1">
                                (Máx: R$ {getRemainingValue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                              </span>
                            )}
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            value={field.valor}
                            onChange={(e) => handleManagerChange(index, 'valor', e.target.value)}
                            placeholder="0.00"
                            className="border-gray-300 bg-white focus:border-teal-500"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeManagerField(index)}
                          className="text-red-500 hover:bg-red-100 mt-5"
                          disabled={managerFields.length === 1}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addManagerField}
                    className={`mt-4 border-dashed ${
                      canAddMoreManagers()
                        ? 'border-teal-400 text-teal-600 hover:bg-teal-100 hover:text-teal-700'
                        : 'border-gray-300 text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!canAddMoreManagers()}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Gerente
                    {!canAddMoreManagers() && formData.mapValue && calculateManagersTotal() >= parseFloat(formData.mapValue) && (
                      <span className="ml-2 text-xs">(Valor completo)</span>
                    )}
                  </Button>

                  {/* Alerta quando valor está próximo do limite */}
                  {formData.mapValue && calculateManagersTotal() > 0 && calculateManagersTotal() < parseFloat(formData.mapValue) && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        ⚠️ Atenção: O valor total dos gerentes (R$ {calculateManagersTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) é menor que o valor do mapa (R$ {parseFloat(formData.mapValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Considere ajustar ou adicionar mais gerentes.
                      </p>
                    </div>
                  )}

                  {/* Alerta quando valor excede o limite */}
                  {formData.mapValue && calculateManagersTotal() > parseFloat(formData.mapValue) && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs text-red-800">
                        ❌ Erro: O valor total dos gerentes (R$ {calculateManagersTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede o valor do mapa (R$ {parseFloat(formData.mapValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Informações de Transporte */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <Truck className="w-5 h-5 mr-2 text-purple-600" />
                  Informações de Transporte
                </h3>
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Caminhão *
                    </label>
                    {!formData.loadingMode ? (
                      <div className="p-3 bg-gray-100 border border-gray-300 rounded-md text-gray-500 text-center">
                        Selecione primeiro a "Modalidade de Carregamento" para ver os tipos de caminhão disponíveis
                      </div>
                    ) : getFilteredTruckTypes().length === 0 ? (
                      <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-md text-yellow-800 text-center">
                        Nenhum tipo de caminhão cadastrado para a modalidade "{
                          formData.loadingMode === 'paletizados' ? 'Paletizados' :
                          formData.loadingMode === 'bag' ? 'BAG' :
                          formData.loadingMode === 'granel' ? 'Granel' :
                          formData.loadingMode === 'bag_fracionado' ? 'BAG Fracionado' :
                          formData.loadingMode === 'paletizados_fracionado' ? 'Paletizados Fracionado' :
                          formData.loadingMode
                        }"
                      </div>
                    ) : (
                      <Select value={formData.truckType} onValueChange={(value) => handleInputChange('truckType', value)}>
                        <SelectTrigger className="border-gray-300">
                          <SelectValue placeholder="Selecione o tipo de caminhão" />
                        </SelectTrigger>
                        <SelectContent>
                          {getFilteredTruckTypes().map((truck) => (
                            <SelectItem key={truck.id} value={truck.name}>
                              <div className="flex items-center">
                                <Truck className="w-4 h-4 mr-2" />
                                {truck.name} ({truck.capacity}t - R${truck.baseRate}/km)
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Transportadoras * (Selecione uma ou mais)
                    </label>
                    <div className="border rounded-lg p-4 bg-white max-h-48 overflow-y-auto border-gray-300">
                      {carriers.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Nenhuma transportadora cadastrada</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {carriers
                            .filter(carrier => carrier.active)
                            .filter(carrier => {
                              if (!formData.loadingMode) return true;
                              // ATUALIZADO: Usa a modalidade compatível para filtrar transportadoras
                              const compatibleModality = getCompatibleModality(formData.loadingMode);
                              const carrierModalities = Array.isArray(carrier.modalities)
                                ? carrier.modalities
                                : (carrier.type ? [carrier.type] : []);
                              return carrierModalities.includes(compatibleModality);
                            })
                            .map((carrier) => {
                              // Obter modalidades da transportadora
                              const carrierModalities = Array.isArray(carrier.modalities)
                                ? carrier.modalities
                                : (carrier.type ? [carrier.type] : []);

                              return (
                                <div key={carrier.id} className="flex items-center space-x-3 p-2 hover:bg-purple-50 rounded">
                                  <Checkbox
                                    id={`carrier-${carrier.id}`}
                                    checked={formData.selectedCarriers.includes(carrier.name)}
                                    onCheckedChange={(checked) => handleCarrierToggle(carrier.name, checked)}
                                  />
                                  <label
                                    htmlFor={`carrier-${carrier.id}`}
                                    className="text-sm font-medium cursor-pointer flex-1"
                                  >
                                    <div className="flex items-center">
                                      🚛 <span className="ml-1">{carrier.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 block">
                                      {carrierModalities.map(mod =>
                                        mod === 'paletizados' ? 'Paletizados' :
                                        mod === 'bag' ? 'BAG' :
                                        mod === 'granel' ? 'Granel' :
                                        mod === 'bag_fracionado' ? 'BAG Fracionado' :
                                        mod === 'paletizados_fracionado' ? 'Paletizados Fracionado' :
                                        mod
                                      ).join(', ')}
                                    </span>
                                  </label>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                    {formData.selectedCarriers.length > 0 && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700 font-medium">
                          ✓ {formData.selectedCarriers.length} transportadora(s) selecionada(s):
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.selectedCarriers.map((carrierName, index) => (
                            <Badge key={index} className="bg-green-100 text-green-800">
                              {carrierName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Carregamento *
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left border-gray-300">
                        <Calendar className="mr-2 h-4 w-4" />
                        {formData.loadingDate ? format(formData.loadingDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={formData.loadingDate}
                        onSelect={(date) => handleInputChange('loadingDate', date)}
                        locale={ptBR}
                        disabled={(date) => date < new Date().setHours(0, 0, 0, 0)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Roteiro */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-4">
                  Roteiro
                </h3>
                <Textarea
                  value={formData.routeInfo}
                  onChange={(e) => handleInputChange('routeInfo', e.target.value)}
                  placeholder="Descreva informações adicionais sobre a rota, restrições, observações especiais..."
                  rows={4}
                  className="border-gray-300 focus:border-green-500"
                />
              </div>

              {/* Botão Submit */}
              <div className="flex justify-center pt-6">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white px-12 py-4 text-lg shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      Criando Cotação...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Plus className="w-6 h-6 mr-3" />
                      Criar Cotação
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Modal de Preview da Imagem */}
        {showImagePreview && formData.mapImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-5xl max-h-full">
              <Button
                onClick={() => setShowImagePreview(false)}
                className="absolute -top-4 -right-4 bg-white text-gray-800 hover:bg-gray-100 rounded-full p-3 shadow-lg z-10"
              >
                <X className="w-6 h-6" />
              </Button>
              <img
                src={formData.mapImage}
                alt="Mapa da Rota - Visualização Completa"
                className="max-w-full max-h-screen object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
