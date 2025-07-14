
import React, { useState, useEffect } from 'react';
import { HandshakeIcon, Percent, CheckCircle, DollarSign, Weight, MapPin, FileText, Truck, Route, CalendarDays, Search, ChevronDown, ChevronUp, Info, Send, XCircle, Users, Clock, AlertTriangle, Edit, Trash2, Map, Save, Ban, Upload, Eye, X, ChevronLeft, ChevronRight } from "lucide-react";
import { FreightMap, Carrier, User, TruckType, UploadFile } from "@/components/ApiDatabase";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sendEmail } from '../utils/sendEmail';
import { getBrazilIsoNow } from '../utils/getBrazilIsoNow';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";


export default function NegotiationPage() {
  const [freightMaps, setFreightMaps] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDetails, setExpandedDetails] = useState({});
  const [modalityFilter, setModalityFilter] = useState('all');
  
  // Estados para as funcionalidades
  const [carrierProposalInput, setCarrierProposalInput] = useState({});
  const [userCounterProposal, setUserCounterProposal] = useState({});
  const [justificationText, setJustificationText] = useState({});
  const [showJustificationModal, setShowJustificationModal] = useState({});
  const [finalizationObservation, setFinalizationObservation] = useState({});

  // Estados para edição da proposta
  const [editingProposalId, setEditingProposalId] = useState(null);
  const [proposalEditData, setProposalEditData] = useState({ mapValue: '', selectedCarrier: '', observation: '' });
  const [originalProposalData, setOriginalProposalData] = useState(null);

  // Estados para edição completa
  const [editingMapId, setEditingMapId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [originalEditData, setOriginalEditData] = useState({}); // For comparing mapValue and selectedCarrier
  const [editObservation, setEditObservation] = useState(''); // For observation on map edit
  const [truckTypes, setTruckTypes] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  // NOVOS ESTADOS PARA PAGINAÇÃO E FILTRO DE STATUS
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [statusFilter, setStatusFilter] = useState('negotiating'); // Default for admins, will be overridden for carriers in loadData

  // Helper para formatar a data para o fuso do Brasil (UTC-3)
  const formatToBrazilTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return 'Data inválida';

      // Converte para o horário de Brasília (UTC-3)
      const brazilDate = new Date(date.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
      
      const day = String(brazilDate.getDate()).padStart(2, '0');
      const month = String(brazilDate.getMonth() + 1).padStart(2, '0');
      const year = brazilDate.getFullYear();
      const hours = String(brazilDate.getHours()).padStart(2, '0');
      const minutes = String(brazilDate.getMinutes()).padStart(2, '0');

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (e) {
      console.error("Erro ao formatar data:", e);
      return 'Data inválida';
    }
  };

  useEffect(() => {
    loadData();
  }, []); // Load data only once on mount

  // Reset current page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1); 
  }, [searchTerm, modalityFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      // Carregar dados necessários para edição
      const [truckTypesList, carriersList] = await Promise.all([
        TruckType.list(),
        Carrier.list()
      ]);
      setTruckTypes(truckTypesList);
      setCarriers(carriersList);
      
      let mapsToShow = [];

      if (user && user.userType === 'carrier') {
        // Carriers see freights where they are the selected carrier,
        // and which are either negotiating, rejected, or contracted by them.
        const negotiatingMaps = await FreightMap.filter({ status: 'negotiating', selectedCarrier: user.carrierName });
        const rejectedMaps = await FreightMap.filter({ status: 'rejected', selectedCarrier: user.carrierName });
        const contractedMaps = await FreightMap.filter({ status: 'contracted', selectedCarrier: user.carrierName });
        mapsToShow = [...negotiatingMaps, ...rejectedMaps, ...contractedMaps];
        setStatusFilter('all'); // Carrier should see all their relevant freights by default
      } else {
        // Admins/Users see all relevant freights for negotiation and review
        const allNegotiatingMaps = await FreightMap.filter({ status: 'negotiating' });
        const allContractedMaps = await FreightMap.filter({ status: 'contracted' });
        const allRejectedMaps = await FreightMap.filter({ status: 'rejected' });
        mapsToShow = [...allNegotiatingMaps, ...allContractedMaps, ...allRejectedMaps];
        setStatusFilter('negotiating'); // Default filter to show only negotiating for admins/users
      }

      // Sort all maps by creation date, latest first, before setting.
      // This ensures consistent sorting for grouping and pagination.
      mapsToShow.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

      setFreightMaps(mapsToShow);
      
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Erro ao carregar dados. Verifique se a API está rodando.");
    }
    setLoading(false);
  };

  // Iniciar edição da proposta
  const handleStartProposalEdit = (map) => {
    setEditingProposalId(map.id);
    const data = {
      mapValue: map.mapValue,
      selectedCarrier: map.selectedCarrier,
      observation: ''
    };
    setProposalEditData(data);
    setOriginalProposalData(data);
  };
  
  // Cancelar edição da proposta
  const handleCancelProposalEdit = () => {
    setEditingProposalId(null);
    setProposalEditData({ mapValue: '', selectedCarrier: '', observation: '' });
    setOriginalProposalData(null);
  };

  // Salvar edição da proposta
  const handleSaveProposalEdit = async (mapId) => {
    const map = freightMaps.find(m => m.id === mapId);
    if (!map) return;
  
    const valueChanged = parseFloat(proposalEditData.mapValue) !== parseFloat(originalProposalData.mapValue);
    const carrierChanged = proposalEditData.selectedCarrier !== originalProposalData.selectedCarrier;
  
    if ((valueChanged || carrierChanged) && !proposalEditData.observation.trim()) {
      alert('A observação é obrigatória ao alterar o valor ou a transportadora.');
      return;
    }
  
    try {
      const updateData = {
        mapValue: parseFloat(proposalEditData.mapValue),
        selectedCarrier: proposalEditData.selectedCarrier,
      };
  
      if (valueChanged || carrierChanged) {
        let details = [];
        if (valueChanged) {
          details.push(`Valor do mapa alterado de R$ ${originalProposalData.mapValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para R$ ${parseFloat(proposalEditData.mapValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
        }
        if (carrierChanged) {
          details.push(`Transportadora alterada de "${originalProposalData.selectedCarrier}" para "${proposalEditData.selectedCarrier}".`);
        }
  
        const newObservation = {
          observation: proposalEditData.observation,
          user: currentUser.fullName,
          timestamp: new Date().toISOString(),
          details: details.join(' ')
        };
        updateData.editObservations = [...(map.editObservations || []), newObservation];
      }
  
      await FreightMap.update(mapId, updateData);
      alert('Proposta atualizada com sucesso!');
      handleCancelProposalEdit();
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar a edição da proposta:", error);
      alert("Falha ao salvar. Tente novamente.");
    }
  };


  // Iniciar edição completa
  const handleStartEdit = (map) => {
    setEditingMapId(map.id);
    setEditFormData({
      mapNumber: map.mapNumber,
      origin: map.origin,
      destination: map.destination,
      totalKm: map.totalKm,
      weight: map.weight,
      mapValue: map.mapValue,
      truckType: map.truckType,
      selectedCarrier: map.selectedCarrier,
      loadingMode: map.loadingMode,
      loadingDate: map.loadingDate ? new Date(map.loadingDate) : null,
      routeInfo: map.routeInfo || '',
      mapImage: map.mapImage || '',
      managers: map.managers || []
    });
    setOriginalEditData({
      mapValue: map.mapValue,
      selectedCarrier: map.selectedCarrier
    });
    setEditObservation('');
  };

  // Cancelar edição completa
  const handleCancelEdit = () => {
    setEditingMapId(null);
    setEditFormData({});
    setOriginalEditData({});
    setEditObservation('');
  };

  // Salvar edição completa
  const handleSaveEdit = async () => {
    const valueChanged = parseFloat(editFormData.mapValue) !== parseFloat(originalEditData.mapValue);
    const carrierChanged = editFormData.selectedCarrier !== originalEditData.selectedCarrier;
    
    if ((valueChanged || carrierChanged) && !editObservation.trim()) {
      alert('A observação é obrigatória ao alterar o valor do frete ou a transportadora.');
      return;
    }

    try {
      const updateData = {
        ...editFormData,
        loadingDate: editFormData.loadingDate ? format(editFormData.loadingDate, 'yyyy-MM-dd') : null,
        managers: editFormData.managers || [] // Ensure managers is included
      };

      if (valueChanged || carrierChanged) {
        let details = [];
        if (valueChanged) {
          details.push(`Valor alterado de R$ ${originalEditData.mapValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para R$ ${parseFloat(editFormData.mapValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        }
        if (carrierChanged) {
          details.push(`Transportadora alterada de "${originalEditData.selectedCarrier}" para "${editFormData.selectedCarrier}"`);
        }

        const newObservation = {
          observation: editObservation,
          user: currentUser.fullName,
          timestamp: new Date().toISOString(),
          details: details.join('. ')
        };
        
        const currentMap = freightMaps.find(m => m.id === editingMapId);
        updateData.editObservations = [...(currentMap.editObservations || []), newObservation];
      }

      await FreightMap.update(editingMapId, updateData);
      alert('Dados atualizados com sucesso!');
      handleCancelEdit();
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar edição:", error);
      alert("Falha ao salvar. Tente novamente.");
    }
  };

  // Upload de imagem na edição
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await UploadFile({ file });
      setEditFormData(prev => ({ ...prev, mapImage: file_url }));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Erro ao fazer upload da imagem.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Remover imagem na edição
  const removeEditImage = () => {
    setEditFormData(prev => ({ ...prev, mapImage: '' }));
  };

  // Filtrar tipos de caminhão por modalidade
  const getFilteredTruckTypes = (loadingMode) => {
    const compatibleModality = loadingMode === 'bag_fracionado' ? 'bag' : 
                               loadingMode === 'paletizados_fracionado' ? 'paletizados' : 
                               loadingMode;
    return truckTypes.filter(truck => truck.modality === compatibleModality);
  };


  // Funções de Ação
  const handleCarrierProposalSubmit = async (freightId) => {
    const proposalValue = carrierProposalInput[freightId]; 
    if (!proposalValue || parseFloat(proposalValue) <= 0) {
      alert('Por favor, insira um valor de proposta válido.');
      return;
    }

    const freight = freightMaps.find(map => map.id === freightId);
    const mapValue = parseFloat(freight.mapValue);
    const proposalValueNum = parseFloat(proposalValue);

    if (proposalValueNum > mapValue) {
      alert(`A proposta não pode ser maior que o valor do mapa (R$ ${mapValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
      return;
    }

    try {
      const updatedProposals = { ...freight.carrierProposals, [currentUser.carrierName]: proposalValueNum };
      await FreightMap.update(freightId, { carrierProposals: updatedProposals });

      // ENVIAR EMAIL PARA ADMINISTRADORES/USUÁRIOS
      try {
        // Buscar usuários do tipo admin e user para notificar
        const users = await User.list();
        const adminsAndUsers = users.filter(user => 
          (user.userType === 'admin' || user.userType === 'user') && user.active
        );

        const emailPromises = adminsAndUsers.map(async (user) => {
          const emailSubject = `💰 Nova Proposta Recebida - Mapa ${freight.mapNumber}`;
          const emailBody = `
            <h2>Olá, ${user.fullName}!</h2>
            <p>Uma nova proposta foi recebida:</p>
            
            <h3>📋 DETALHES:</h3>
            <ul>
              <li><strong>Mapa:</strong> ${freight.mapNumber}</li>
              <li><strong>Transportadora:</strong> ${currentUser.carrierName}</li>
              <li><strong>Proposta:</strong> R$ ${proposalValueNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</li>
              <li><strong>Valor do Mapa:</strong> R$ ${mapValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</li>
              <li><strong>Percentual:</strong> ${((proposalValueNum / mapValue) * 100).toFixed(1)}%</li>
              <li><strong>Rota:</strong> ${freight.origin} → ${freight.destination}</li>
            </ul>
            
            <p>🔍 <strong>Acesse o sistema na aba "Negociação" para analisar e tomar uma decisão.</strong></p>
            
            <p>Atenciosamente,<br>Sistema UnionAgro</p>
          `;

          return sendEmail({
            to: user.email,
            subject: emailSubject,
            html: emailBody
          });
        });

        await Promise.all(emailPromises);
        console.log('Emails enviados para administradores com sucesso!');
      } catch (emailError) {
        console.error('Erro ao enviar emails para administradores:', emailError);
        // Não bloqueia o fluxo se houver erro no email
      }

      setCarrierProposalInput(prev => ({ ...prev, [freightId]: '' }));
      await loadData();
      alert('Proposta enviada com sucesso! Os administradores foram notificados por email.');
    } catch (error) {
      console.error("Error saving carrier proposal:", error);
      alert("Erro ao enviar proposta. Tente novamente.");
    }
  };

  // Função para encontrar a menor proposta de um grupo de mapas
  const getLowestProposalForMapGroup = (mapsInGroup) => {
    let lowestValue = Infinity;
    let lowestCarrier = null;

    mapsInGroup.forEach(map => {
      if (map.carrierProposals && map.carrierProposals[map.selectedCarrier]) {
        const proposalValue = map.carrierProposals[map.selectedCarrier];
        if (proposalValue < lowestValue) {
          lowestValue = proposalValue;
          lowestCarrier = map.selectedCarrier;
        }
      }
    });

    return { lowestValue, lowestCarrier };
  };

  const handleUserCounterProposalAndFinalize = async (freightId) => {
    const counterValue = userCounterProposal[freightId];
    if (!counterValue || parseFloat(counterValue) <= 0) {
      alert('Por favor, insira um valor de contraproposta válido.');
      return;
    }

    const freight = freightMaps.find(map => map.id === freightId);
    if (!freight || !freight.selectedCarrier) {
      alert('Erro: Transportadora não identificada para este frete.');
      return;
    }

    const carrierProposalValue = freight.carrierProposals?.[freight.selectedCarrier];
    if (carrierProposalValue && parseFloat(counterValue) > carrierProposalValue) {
      alert(`O valor final não pode ser maior que a proposta da transportadora (R$ ${carrierProposalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`);
      return;
    }

    // Encontrar todas as propostas do mesmo mapa
    const mapsInGroup = freightMaps.filter(m => m.mapNumber === freight.mapNumber);
    const { lowestValue, lowestCarrier } = getLowestProposalForMapGroup(mapsInGroup);

    // Verificar se não está escolhendo a mais barata
    const isChoosingCheapest = freight.selectedCarrier === lowestCarrier;
    
    if (!isChoosingCheapest && lowestCarrier && lowestValue !== Infinity) { // Added condition to check if lowestValue is actually found
      // Mostrar modal de justificativa
      setShowJustificationModal(prev => ({ ...prev, [freightId]: true }));
      return;
    }

    // Se é a mais barata ou não há outras propostas, finalizar diretamente
    await finalizeFreight(freightId, counterValue, '');
  };

  const finalizeFreight = async (freightId, counterValue, justification = '') => {
    const freight = freightMaps.find(map => map.id === freightId);

    try {
      const updateData = {
        finalValue: parseFloat(counterValue),
        status: 'contracted',
        contractedAt: new Date().toISOString()
      };

      if (justification.trim()) {
        updateData.justification = justification.trim();
      }

      if (finalizationObservation[freightId]?.trim()) {
        updateData.finalizationObservation = finalizationObservation[freightId].trim();
      }

      await FreightMap.update(freightId, updateData);
      
      // LÓGICA CORRIGIDA: Atualiza o status dos perdedores em vez de deletar
      const mapsInGroup = freightMaps.filter(m => m.mapNumber === freight.mapNumber);
      for (const otherMap of mapsInGroup) {
        if (otherMap.id !== freightId) {
          await FreightMap.update(otherMap.id, { 
            status: 'rejected',
            rejectedReason: 'Outra proposta foi aceita para este mapa.' 
          });
        }
      }

      // ENVIAR EMAIL PARA A TRANSPORTADORA CONTRATADA
      try {
        const users = await User.list();
        const contractedCarrierUser = users.find(user => 
          user.userType === 'carrier' && 
          user.carrierName === freight.selectedCarrier && 
          user.active
        );

        if (contractedCarrierUser) {
          const contractEmailSubject = `🎉 Parabéns! Frete Contratado - Mapa ${freight.mapNumber}`;
          const contractEmailBody = `
            <h2>🎉 Parabéns, ${contractedCarrierUser.fullName}!</h2>
            <p><strong>Seu frete foi aprovado e contratado!</strong></p>
            
            <h3>📋 DETALHES DO FRETE CONTRATADO:</h3>
            <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>Mapa:</strong> ${freight.mapNumber}</li>
                <li><strong>Rota:</strong> ${freight.origin} → ${freight.destination}</li>
                <li><strong>Distância:</strong> ${freight.totalKm} km</li>
                <li><strong>Peso:</strong> ${freight.weight?.toLocaleString('pt-BR')} kg</li>
                <li><strong>Valor Final Contratado:</strong> <span style="color: #059669; font-weight: bold;">R$ ${parseFloat(counterValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></li>
                <li><strong>Tipo de Caminhão:</strong> ${freight.truckType}</li>
                <li><strong>Modalidade:</strong> ${
                  freight.loadingMode === 'paletizados' ? 'Paletizados' : 
                  freight.loadingMode === 'bag' ? 'BAG' : 
                  freight.loadingMode === 'granel' ? 'Granel' : 
                  freight.loadingMode === 'bag_fracionado' ? 'BAG Fracionado' : 
                  'Paletizados Fracionado'
                }</li>
                <li><strong>Data de Carregamento:</strong> ${freight.loadingDate ? format(new Date(freight.loadingDate), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informada'}</li>
              </ul>
            </div>
            
            ${justification ? `
            <h3>📝 Observações:</h3>
            <div style="background-color: #fef3c7; padding: 10px; border-radius: 6px; font-style: italic;">
              "${justification}"
            </div>
            ` : ''}

            ${updateData.finalizationObservation ? `
            <h3>📄 Observações da Finalização:</h3>
            <div style="background-color: #e0f2f7; padding: 10px; border-radius: 6px; font-style: italic;">
              "${updateData.finalizationObservation}"
            </div>
            ` : ''}
            
            <h3>🚚 Próximos Passos:</h3>
            <ol style="padding-left: 20px;">
              <li>Confirme a disponibilidade do caminhão para a data de carregamento</li>
              <li>Entre em contato com nossa equipe para coordenar os detalhes</li>
              <li>Após a entrega, anexe os documentos fiscais no sistema</li>
            </ol>
            
            <p style="margin-top: 20px;"><strong>Parabéns pela parceria e bom frete!</strong></p>
            
            <p>Atenciosamente,<br>Equipe UnionAgro</p>
          `;

          await sendEmail({
            to: contractedCarrierUser.email,
            subject: contractEmailSubject,
            html: contractEmailBody
          });
        }

        // ENVIAR EMAILS PARA AS TRANSPORTADORAS NÃO SELECIONADAS
        const rejectedCarrierEmails = mapsInGroup.filter(m => m.id !== freightId).map(async (rejectedMap) => {
          const rejectedCarrierUser = users.find(user => 
            user.userType === 'carrier' && 
            user.carrierName === rejectedMap.selectedCarrier && 
            user.active
          );

          if (rejectedCarrierUser) {
            const rejectionEmailSubject = `📋 Resultado da Cotação - Mapa ${freight.mapNumber}`;
            const rejectionEmailBody = `
              <h2>Olá, ${rejectedCarrierUser.fullName}</h2>
              <p>Informamos sobre o resultado da cotação do Mapa ${freight.mapNumber}:</p>
              
              <h3>📋 DETALHES DA COTAÇÃO:</h3>
              <ul>
                <li><strong>Mapa:</strong> ${freight.mapNumber}</li>
                <li><strong>Rota:</strong> ${freight.origin} → ${freight.destination}</li>
                <li><strong>Distância:</strong> ${freight.totalKm} km</li>
                <li><strong>Peso:</strong> ${freight.weight?.toLocaleString('pt-BR')} kg</li>
                <li><strong>Modalidade:</strong> ${
                  freight.loadingMode === 'paletizados' ? 'Paletizados' : 
                  freight.loadingMode === 'bag' ? 'BAG' : 
                  freight.loadingMode === 'granel' ? 'Granel' : 
                  freight.loadingMode === 'bag_fracionado' ? 'BAG Fracionado' : 
                  'Paletizados Fracionado'
                }</li>
              </ul>
              
              <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
                <h3 style="color: #dc2626; margin-top: 0;">📢 Resultado:</h3>
                <p style="margin-bottom: 0;"><strong>O frete foi fechado com outra transportadora. Agradecemos a sua participação!</strong></p>
              </div>
              
              <p>Agradecemos sua participação no processo de cotação. Continue participando de nossas próximas oportunidades!</p>
              
              <p>🚛 <strong>Acompanhe novas cotações no sistema e continue crescendo conosco!</strong></p>
              
              <p>Atenciosamente,<br>Equipe UnionAgro</p>
            `;

            return sendEmail({
              to: rejectedCarrierUser.email,
              subject: rejectionEmailSubject,
              html: rejectionEmailBody
            });
          }
          return null; // Return null for carriers without users or inactive
        });

        // Aguarda todos os emails de rejeição serem enviados
        await Promise.all(rejectedCarrierEmails.filter(Boolean));

        console.log('Emails de contratação e rejeição enviados com sucesso!');
      } catch (emailError) {
        console.error('Erro ao enviar emails de contratação/rejeição:', emailError);
        // Não bloqueia o fluxo principal se houver erro no email
      }
      
      setUserCounterProposal(prev => ({ ...prev, [freightId]: '' }));
      setJustificationText(prev => ({ ...prev, [freightId]: '' }));
      setFinalizationObservation(prev => ({ ...prev, [freightId]: '' }));
      setShowJustificationModal(prev => ({ ...prev, [freightId]: false }));
      
      alert(`Frete contratado com sucesso! As transportadoras foram notificadas por email.`);
      await loadData();
    } catch (error) {
      console.error("Error finalizing freight:", error);
      alert("Erro ao finalizar frete. Tente novamente.");
    }
  };

  const handleJustificationSubmit = (freightId) => {
    const justification = justificationText[freightId];
    if (!justification || justification.trim().length < 10) {
      alert('Por favor, forneça uma justificativa com pelo menos 10 caracteres.');
      return;
    }

    const counterValue = userCounterProposal[freightId];
    finalizeFreight(freightId, counterValue, justification);
  };

  const cancelJustification = (freightId) => {
    setShowJustificationModal(prev => ({ ...prev, [freightId]: false }));
    setJustificationText(prev => ({ ...prev, [freightId]: '' }));
  };
  
  const handleRejectFreight = async (freightId) => {
    const freight = freightMaps.find(map => map.id === freightId);
    if (!window.confirm(`Confirma que NÃO deseja fechar o frete com ${freight.selectedCarrier}? A transportadora será notificada.`)) return;

    try {
      await FreightMap.update(freightId, { 
        status: 'rejected',
        rejectedReason: 'Rejeitado pelo cliente'
      });

      // ENVIAR EMAIL PARA A TRANSPORTADORA REJEITADA
      try {
        const users = await User.list();
        const rejectedCarrierUser = users.find(user => 
          user.userType === 'carrier' && 
          user.carrierName === freight.selectedCarrier && 
          user.active
        );

        if (rejectedCarrierUser) {
          const rejectionEmailSubject = `📋 Resultado da Cotação - Mapa ${freight.mapNumber}`;
          const rejectionEmailBody = `
            <h2>Olá, ${rejectedCarrierUser.fullName}</h2>
            <p>Informamos sobre o resultado da sua proposta para o Mapa ${freight.mapNumber}:</p>
            
            <h3>📋 DETALHES DA COTAÇÃO:</h3>
            <ul>
              <li><strong>Mapa:</strong> ${freight.mapNumber}</li>
              <li><strong>Rota:</strong> ${freight.origin} → ${freight.destination}</li>
              <li><strong>Distância:</strong> ${freight.totalKm} km</li>
              <li><strong>Peso:</strong> ${freight.weight?.toLocaleString('pt-BR')} kg</li>
              <li><strong>Modalidade:</strong> ${
                  freight.loadingMode === 'paletizados' ? 'Paletizados' : 
                  freight.loadingMode === 'bag' ? 'BAG' : 
                  freight.loadingMode === 'granel' ? 'Granel' : 
                  freight.loadingMode === 'bag_fracionado' ? 'BAG Fracionado' : 
                  'Paletizados Fracionado'
                }</li>
              <li><strong>Sua Proposta:</strong> R$ ${freight.carrierProposals?.[freight.selectedCarrier]?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || 'N/A'}</li>
            </ul>
            
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
              <h3 style="color: #dc2626; margin-top: 0;">📢 Resultado:</h3>
              <p style="margin-bottom: 0;"><strong>Infelizmente, desta vez o cliente optou por não seguir com sua proposta.</strong></p>
            </div>
            
            <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <h3 style="color: #1d4ed8; margin-top: 0;">💪 Não desanime!</h3>
              <p style="margin-bottom: 0;">Continue participando de nossas cotações. Cada experiência nos ajuda a melhorar e encontrar as melhores oportunidades para sua transportadora!</p>
            </div>
            
            <p>🚛 <strong>Fique atento às próximas cotações no sistema!</strong></p>
            
            <p>Atenciosamente,<br>Equipe UnionAgro</p>
          `;

          await sendEmail({
            to: rejectedCarrierUser.email,
            subject: rejectionEmailSubject,
            html: rejectionEmailBody
          });

          console.log('Email de rejeição enviado com sucesso!');
        }
      } catch (emailError) {
        console.error('Erro ao enviar email de rejeição:', emailError);
        // Não bloqueia o fluxo principal se houver erro no email
      }

      alert(`Frete rejeitado. ${freight.selectedCarrier} foi notificada por email.`);
      await loadData();
    } catch (error) {
      console.error("Error rejecting freight:", error);
      alert("Erro ao rejeitar frete. Tente novamente.");
    }
  };

  const handleDeleteFreight = async (freightId, mapNumber) => {
    if (window.confirm(`Tem certeza que deseja excluir permanentemente o mapa ${mapNumber}? Esta ação é irreversível.`)) {
      try {
        await FreightMap.delete(freightId);
        alert(`Mapa ${mapNumber} excluído com sucesso.`);
        await loadData();
      } catch (error) {
        console.error("Erro ao excluir frete:", error);
        alert("Ocorreu um erro ao excluir o frete.");
      }
    }
  };

  // Funções Auxiliares
  const getGroupedFreights = () => {
    const grouped = freightMaps.reduce((acc, freight) => {
      if (!acc[freight.mapNumber]) {
        acc[freight.mapNumber] = [];
      }
      acc[freight.mapNumber].push(freight);
      return acc;
    }, {});

    const filteredGroups = Object.entries(grouped)
      .filter(([mapNumber, group]) => {
        const mainFreightForFilters = group[0]; // Use the first freight in the group for common filters
        
        // Filter by carrier if current user is a carrier
        if (currentUser && currentUser.userType === 'carrier') {
          const hasCarrierFreight = group.some(f => f.selectedCarrier === currentUser.carrierName);
          if (!hasCarrierFreight) return false;
        }

        const searchMatch = !searchTerm ||
          mapNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (mainFreightForFilters.origin && mainFreightForFilters.origin.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (mainFreightForFilters.destination && mainFreightForFilters.destination.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (mainFreightForFilters.selectedCarrier && mainFreightForFilters.selectedCarrier.toLowerCase().includes(searchTerm.toLowerCase()));

        const statusMatch = statusFilter === 'all' || 
          (statusFilter === 'with_proposals' && group.some(f => f.carrierProposals && Object.keys(f.carrierProposals).length > 0)) ||
          (statusFilter === 'without_proposals' && group.every(f => !f.carrierProposals || Object.keys(f.carrierProposals).length === 0)) ||
          group.some(f => f.status === statusFilter); // Checks if ANY freight in the group matches the status

        const modalityMatch = modalityFilter === 'all' || mainFreightForFilters.loadingMode === modalityFilter;

        return searchMatch && statusMatch && modalityMatch;
      })
      .sort(([, groupA], [, groupB]) => {
        // Sort by the created date of the first item in the group (which should be consistent)
        return new Date(groupB[0].created_date) - new Date(groupA[0].created_date);
      });

    return filteredGroups;
  };

  // Aplicar paginação
  const getPaginatedFreights = () => {
    const allGroups = getGroupedFreights();
    const totalItems = allGroups.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Adjust current page if it's out of bounds
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedGroups = allGroups.slice(startIndex, endIndex);
    
    return {
      groups: paginatedGroups,
      totalItems,
      totalPages,
      currentPage,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    };
  };

  const paginationData = getPaginatedFreights();
  
  // Navegar páginas
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= paginationData.totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleDetails = (mapNumber) => {
    setExpandedDetails(prev => ({ ...prev, [mapNumber]: !prev[mapNumber] }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'negotiating':
        return 'bg-blue-100 text-blue-800';
      case 'contracted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'negotiating':
        return 'Em Negociação';
      case 'contracted':
        return 'Contratado';
      case 'rejected':
        return 'Rejeitado';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  const getModalityText = (loadingMode) => {
    switch (loadingMode) {
      case 'paletizados':
        return '📦 Paletizados';
      case 'bag':
        return '🎒 BAG';
      case 'granel':
        return '🌾 Granel';
      case 'bag_fracionado':
        return '🎒 BAG Fracionado';
      case 'paletizados_fracionado':
        return '📦 Paletizados Fracionado';
      default:
        return loadingMode;
    }
  };

  // Renderização
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {currentUser && currentUser.userType !== 'carrier' && (
            <>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filtrar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="negotiating">Em Negociação</SelectItem>
                  <SelectItem value="contracted">Contratados</SelectItem>
                  <SelectItem value="rejected">Rejeitados</SelectItem>
                  <SelectItem value="with_proposals">Com Propostas</SelectItem>
                  <SelectItem value="without_proposals">Sem Propostas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={modalityFilter} onValueChange={setModalityFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filtrar modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Modalidades</SelectItem>
                  <SelectItem value="paletizados">📦 Paletizados</SelectItem>
                  <SelectItem value="bag">🎒 BAG</SelectItem>
                  <SelectItem value="granel">🌾 Granel</SelectItem>
                  <SelectItem value="bag_fracionado">🎒 BAG Fracionado</SelectItem>
                  <SelectItem value="paletizados_fracionado">📦 Paletizados Fracionado</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Buscar por mapa, origem, destino ou transportadora..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full"
            />
          </div>
        </div>
      </div>

      {paginationData.groups.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-white rounded-lg shadow-md">
          <HandshakeIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold">
            {searchTerm || modalityFilter !== 'all' || statusFilter !== 'negotiating' ? 'Nenhum frete encontrado' : 'Nenhum frete em negociação'}
          </h3>
          <p className="mt-2">
            {searchTerm || modalityFilter !== 'all' || statusFilter !== 'negotiating' ? 'Tente uma busca diferente ou ajuste o filtro.' : 'Novas cotações aparecerão aqui.'}
          </p>
        </div>
      ) : (
        <>
          {/* INFORMAÇÕES DE PAGINAÇÃO */}
          <div className="mb-4 flex justify-between items-center text-sm text-gray-600">
            <p>
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, paginationData.totalItems)} de {paginationData.totalItems} mapa(s)
            </p>
            <p>Página {currentPage} de {paginationData.totalPages}</p>
          </div>

          <div className="space-y-8">
            {paginationData.groups.map(([mapNumber, mapsInGroup]) => {
              const firstMap = mapsInGroup[0];
              const isDetailsExpanded = expandedDetails[mapNumber];
              const { lowestValue, lowestCarrier } = getLowestProposalForMapGroup(mapsInGroup);
              const groupHasNewProposals = mapsInGroup.some(map => Object.keys(map.carrierProposals || {}).length > 0);

              return (
                <Card key={mapNumber} className="overflow-hidden shadow-lg border-2 border-transparent hover:border-blue-300 transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl font-bold text-gray-800 flex flex-wrap items-center gap-2">
                          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                            Mapa {mapNumber}
                          </span>
                          <Badge className={`${getStatusColor(firstMap.status)} text-xs`}>
                            {getStatusText(firstMap.status)}
                          </Badge>
                          <Badge className="bg-purple-100 text-purple-800 text-xs">
                            {getModalityText(firstMap.loadingMode)}
                          </Badge>
                          {groupHasNewProposals && (
                            <Badge className="bg-green-100 text-green-800 text-xs animate-pulse">
                              ✨ Nova Proposta
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-gray-600 mt-2 text-sm flex items-center flex-wrap gap-x-3 gap-y-1">
                          <span className="font-medium">{firstMap.origin}</span> → <span className="font-medium">{firstMap.destination}</span>
                          <span className="mx-1">•</span>
                          <span>{firstMap.totalKm} km</span>
                          <span className="mx-1">•</span>
                          <span>{firstMap.weight?.toLocaleString('pt-BR')} kg</span>
                          <span className="mx-1">•</span>
                          <Clock className="w-3 h-3" />
                          <span className="text-xs text-gray-500">Criado em: {formatToBrazilTime(firstMap.created_date)}</span>
                        </p>
                      </div>
                      
                      <div className="flex flex-col md:flex-row gap-2">
                        {currentUser?.userType !== 'carrier' && firstMap.status === 'negotiating' && editingMapId !== firstMap.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartEdit(firstMap)}
                            className="bg-blue-600 text-white hover:bg-blue-700 shrink-0"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar Mapa
                          </Button>
                        )}
                        {currentUser && currentUser.userType !== 'carrier' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteFreight(firstMap.id, firstMap.mapNumber)}
                            className="shrink-0"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Excluir
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                <CardContent className="p-4 md:p-6 space-y-6">
                  {/* FORMULÁRIO DE EDIÇÃO COMPLETA */}
                  {editingMapId === firstMap.id && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                      <h4 className="font-semibold text-yellow-800 mb-4 flex items-center">
                        <Edit className="w-5 h-5 mr-2" />
                        Editando Mapa {firstMap.mapNumber}
                      </h4>
                      
                      <div className="space-y-6">
                        {/* Identificação */}
                        <div className="bg-white rounded-lg p-4">
                          <h5 className="font-medium text-gray-800 mb-3">Identificação</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="edit-mapNumber">Número do Mapa</Label>
                              <Input
                                id="edit-mapNumber"
                                value={editFormData.mapNumber || ''}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, mapNumber: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-loadingMode">Modalidade</Label>
                              <Select value={editFormData.loadingMode} onValueChange={(value) => setEditFormData(prev => ({ ...prev, loadingMode: value, truckType: '' }))}>
                                <SelectTrigger id="edit-loadingMode">
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

                        {/* Imagem do Mapa */}
                        <div className="bg-white rounded-lg p-4">
                          <h5 className="font-medium text-gray-800 mb-3">Imagem do Mapa</h5>
                          {!editFormData.mapImage ? (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
                                  className="pointer-events-none"
                                >
                                  {uploadingImage ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                                      Enviando...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-2" />
                                      Escolher Imagem
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <img
                                src={editFormData.mapImage}
                                alt="Mapa da Rota"
                                className="w-full h-48 object-contain rounded border"
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => setShowImagePreview(true)}
                                  variant="outline"
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Ver
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={removeEditImage}
                                  className="text-red-600"
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Remover
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Rota */}
                        <div className="bg-white rounded-lg p-4">
                          <h5 className="font-medium text-gray-800 mb-3">Informações da Rota</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="edit-origin">Origem</Label>
                              <Input
                                id="edit-origin"
                                value={editFormData.origin || ''}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, origin: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-destination">Destino</Label>
                              <Input
                                id="edit-destination"
                                value={editFormData.destination || ''}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, destination: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-totalKm">Distância (km)</Label>
                              <Input
                                id="edit-totalKm"
                                type="number"
                                value={editFormData.totalKm || ''}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, totalKm: parseInt(e.target.value) || 0 }))}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Carga e Valores */}
                        <div className="bg-white rounded-lg p-4">
                          <h5 className="font-medium text-gray-800 mb-3">Carga e Valores</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="edit-weight">Peso (kg)</Label>
                              <Input
                                id="edit-weight"
                                type="number"
                                step="0.01"
                                value={editFormData.weight || ''}
                                onChange={(e) => {
                                  if (e.target.value.length > 9) return;
                                  setEditFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))
                                }}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-mapValue">Valor do Frete (R$)</Label>
                              <Input
                                id="edit-mapValue"
                                type="number"
                                step="0.01"
                                value={editFormData.mapValue || ''}
                                onChange={(e) => {
                                  if (e.target.value.length > 9) return;
                                  setEditFormData(prev => ({ ...prev, mapValue: parseFloat(e.target.value) || 0 }))
                                }}
                                className="font-semibold"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Transporte */}
                        <div className="bg-white rounded-lg p-4">
                          <h5 className="font-medium text-gray-800 mb-3">Informações de Transporte</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <Label htmlFor="edit-selectedCarrier">Transportadora</Label>
                              <Select value={editFormData.selectedCarrier} onValueChange={(value) => setEditFormData(prev => ({ ...prev, selectedCarrier: value }))}>
                                <SelectTrigger id="edit-selectedCarrier">
                                  <SelectValue placeholder="Selecione a transportadora" />
                                </SelectTrigger>
                                <SelectContent>
                                  {carriers.filter(c => c.active).map(carrier => (
                                    <SelectItem key={carrier.id} value={carrier.name}>
                                      🚛 {carrier.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="edit-truckType">Tipo de Caminhão</Label>
                              <Select value={editFormData.truckType} onValueChange={(value) => setEditFormData(prev => ({ ...prev, truckType: value }))}>
                                <SelectTrigger id="edit-truckType">
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getFilteredTruckTypes(editFormData.loadingMode).map(truck => (
                                    <SelectItem key={truck.id} value={truck.name}>
                                      {truck.name} ({truck.capacity}t)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="edit-loadingDate">Data de Carregamento</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start">
                                  <CalendarDays className="mr-2 h-4 w-4" />
                                  {editFormData.loadingDate ? format(editFormData.loadingDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <CalendarComponent
                                  mode="single"
                                  selected={editFormData.loadingDate}
                                  onSelect={(date) => setEditFormData(prev => ({ ...prev, loadingDate: date }))}
                                  locale={ptBR}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {/* Observações */}
                        <div className="bg-white rounded-lg p-4">
                          <h5 className="font-medium text-gray-800 mb-3">Observações</h5>
                          <Textarea
                            placeholder="Informações adicionais sobre a rota..."
                            value={editFormData.routeInfo || ''}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, routeInfo: e.target.value }))}
                            rows={3}
                          />
                        </div>

                        {/* Observação da Edição */}
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <Label htmlFor="edit-observation">Observação da Edição *</Label>
                          <p className="text-sm text-orange-700 mb-2">Obrigatória se alterar transportadora ou valor do frete</p>
                          <Textarea
                            id="edit-observation"
                            placeholder="Descreva o motivo das alterações..."
                            value={editObservation}
                            onChange={(e) => setEditObservation(e.target.value)}
                            rows={3}
                          />
                        </div>

                        {/* Botões */}
                        <div className="flex gap-3 justify-end">
                          <Button variant="outline" onClick={handleCancelEdit}>
                            <Ban className="w-4 h-4 mr-2" />
                            Cancelar
                          </Button>
                          <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Alterações
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Informações da Rota */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
                      <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">Origem → Destino</p>
                          <p className="font-bold text-lg text-gray-800">{firstMap.origin} → {firstMap.destination}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">Peso Total</p>
                          <p className="font-bold text-lg text-gray-800">{firstMap.weight?.toLocaleString('pt-BR')} kg</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-sm text-green-700">Valor do Mapa</p>
                          <p className="font-bold text-lg text-green-800">R$ {firstMap.mapValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                  </div>

                  {/* Indicador da menor proposta */}
                  {lowestCarrier && currentUser?.userType !== 'carrier' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        <strong>Menor proposta:</strong> {lowestCarrier} - R$ {lowestValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}

                  {/* Informações dos Gerentes */}
                  {currentUser?.userType !== 'carrier' && firstMap.managers?.length > 0 && (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-teal-600" /> Gerentes Associados
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {firstMap.managers.map((m, i) => (
                          <div key={i} className="bg-white p-2 rounded border">
                            <p className="font-medium text-gray-700">{m.gerente}</p>
                            <p className="text-sm text-teal-700 font-semibold">R$ {parseFloat(m.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Imagem do Mapa */}
                  {firstMap.mapImage && (
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Map className="w-5 h-5 mr-2 text-blue-600" />
                        Mapa da Rota
                      </h4>
                      <div className="flex justify-center">
                        <a href={firstMap.mapImage} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={firstMap.mapImage}
                            alt="Mapa da Rota"
                            className="max-w-full h-auto max-h-[400px] object-contain rounded-md shadow-sm"
                          />
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {/* SEÇÃO ATUALIZADA: Propostas com funcionalidade de edição */}
                  <div className="pt-6 border-t">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">
                      {currentUser?.userType === 'carrier' ? 'Sua Negociação' : 'Propostas das Transportadoras'}
                    </h4>
                    <div className="space-y-4">
                        {mapsInGroup.map((map) => (
                            <div key={map.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                { editingProposalId === map.id ? (
                                  // FORMULÁRIO DE EDIÇÃO DA PROPOSTA
                                  <div className="space-y-4">
                                    <h5 className="font-semibold text-gray-800">Editando Proposta para {map.selectedCarrier}</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <Label htmlFor="edit-carrier">Transportadora</Label>
                                        <Select 
                                          value={proposalEditData.selectedCarrier} 
                                          onValueChange={(value) => setProposalEditData(p => ({...p, selectedCarrier: value}))}
                                        >
                                          <SelectTrigger id="edit-carrier"><SelectValue placeholder="Selecione a transportadora"/></SelectTrigger>
                                          <SelectContent>
                                            {carriers.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label htmlFor="edit-mapValue">Valor do Mapa (R$)</Label>
                                        <Input 
                                          id="edit-mapValue" 
                                          type="number" 
                                          step="0.01"
                                          value={proposalEditData.mapValue} 
                                          onChange={(e) => setProposalEditData(p => ({...p, mapValue: e.target.value}))}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <Label htmlFor="edit-observation">Observação (Obrigatória se houver alteração)</Label>
                                      <Textarea 
                                        id="edit-observation" 
                                        placeholder="Descreva o motivo da alteração..." 
                                        value={proposalEditData.observation} 
                                        onChange={(e) => setProposalEditData(p => ({...p, observation: e.target.value}))}
                                        rows={3}
                                        className="resize-none"
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <Button variant="ghost" size="sm" onClick={handleCancelProposalEdit}><Ban className="w-4 h-4 mr-2"/>Cancelar</Button>
                                      <Button size="sm" onClick={() => handleSaveProposalEdit(map.id)} className="bg-blue-600 hover:bg-blue-700">
                                        <Save className="w-4 h-4 mr-2"/>Salvar Alterações
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  // VISUALIZAÇÃO PADRÃO DA PROPOSTA
                                  <>
                                    <div className="flex justify-between items-start">
                                      <h5 className="font-semibold text-gray-800 flex items-center mb-3">
                                          🚛 {map.selectedCarrier}
                                          {map.status === 'rejected' && <Badge variant="destructive" className="ml-2">Encerrado</Badge>}
                                          {currentUser?.userType !== 'carrier' && map.selectedCarrier === lowestCarrier && lowestCarrier && lowestValue !== Infinity && (
                                            <Badge className="ml-2 bg-green-100 text-green-800">💰 Menor Valor</Badge>
                                          )}
                                      </h5>
                                      {currentUser?.userType !== 'carrier' && map.status === 'negotiating' && (
                                        <Button variant="outline" size="sm" onClick={() => handleStartProposalEdit(map)}>
                                          <Edit className="w-4 h-4 mr-2"/> Editar
                                        </Button>
                                      )}
                                    </div>

                                  {/* Modal de Justificativa */}
                                  {showJustificationModal[map.id] && (
                                    <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                      <div className="flex items-center mb-3">
                                        <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                                        <h6 className="font-semibold text-orange-800">
                                          Justificativa Obrigatória
                                        </h6>
                                      </div>
                                      <p className="text-sm text-orange-700 mb-3">
                                        Você está escolhendo {map.selectedCarrier} (R$ {map.carrierProposals?.[map.selectedCarrier]?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) 
                                        ao invés da menor proposta de {lowestCarrier} (R$ {lowestValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). 
                                        Por favor, justifique esta decisão:
                                      </p>
                                      <div className="space-y-3">
                                        <Textarea
                                          placeholder="Digite a justificativa..."
                                          value={justificationText[map.id] || ''}
                                          onChange={(e) => setJustificationText(prev => ({ ...prev, [map.id]: e.target.value }))}
                                          rows={3}
                                          className="resize-none"
                                        />
                                        <div className="flex gap-2">
                                          <Button 
                                            onClick={() => handleJustificationSubmit(map.id)}
                                            className="bg-orange-600 hover:bg-orange-700"
                                            disabled={!justificationText[map.id] || justificationText[map.id].trim().length < 10}
                                          >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Confirmar e Fechar Frete
                                          </Button>
                                          <Button 
                                            variant="outline" 
                                            onClick={() => cancelJustification(map.id)}
                                          >
                                            Cancelar
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Visão da Transportadora */}
                                  {currentUser?.userType === 'carrier' && map.selectedCarrier === currentUser.carrierName && (
                                      map.status === 'rejected' ? (
                                          <div className="text-center p-3 bg-red-50 rounded-md">
                                              <p className="font-medium text-red-700">
                                                {map.rejectedReason || 'O cliente não seguiu com esta negociação.'}
                                              </p>
                                          </div>
                                      ) : map.carrierProposals?.[currentUser.carrierName] ? (
                                          <div className="p-3 bg-green-50 rounded-md">
                                              <p className="text-sm text-gray-600">Proposta enviada:</p>
                                              <p className="text-lg font-bold text-green-600">R$ {map.carrierProposals[currentUser.carrierName].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                          </div>
                                      ) : (
                                          <div className="flex gap-2 items-center">
                                              <Input 
                                                type="number" 
                                                step="0.01" 
                                                placeholder="Sua proposta (R$)" 
                                                onChange={(e) => {
                                                  if (e.target.value.length > 9) return; 
                                                  setCarrierProposalInput(prev => ({...prev, [map.id]: e.target.value}))
                                                }} 
                                              />
                                              <Button onClick={() => handleCarrierProposalSubmit(map.id)}>
                                                <Send className="w-4 h-4 mr-2" /> Enviar
                                              </Button>
                                          </div>
                                      )
                                  )}

                                  {/* Visão do Admin/Usuário */}
                                  {currentUser?.userType !== 'carrier' && map.status === 'negotiating' && !showJustificationModal[map.id] && (
                                      map.carrierProposals?.[map.selectedCarrier] ? (
                                          <div className="space-y-4">
                                              <div className="grid md:grid-cols-2 gap-4 items-center">
                                                  <div className="p-3 border rounded-lg">
                                                      <p className="text-sm text-gray-600">Proposta de {map.selectedCarrier}</p>
                                                      <p className="text-lg font-bold text-green-600">R$ {map.carrierProposals[map.selectedCarrier].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                      <p className="text-xs text-blue-600 font-medium mt-1">
                                                        {((map.carrierProposals[map.selectedCarrier] / firstMap.mapValue) * 100).toFixed(1)}% do valor do mapa
                                                      </p>
                                                  </div>
                                                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                                      <label className="block text-sm font-medium text-gray-700 mb-2">Definir valor final e fechar frete:</label>
                                                      <div className="flex gap-2 items-center">
                                                          <Input 
                                                            type="number" 
                                                            step="0.01" 
                                                            placeholder="Valor final (R$)" 
                                                            onChange={(e) => {
                                                              if (e.target.value.length > 9) return; 
                                                              setUserCounterProposal(prev => ({...prev, [map.id]: e.target.value}))
                                                            }} 
                                                          />
                                                          <Button onClick={() => handleUserCounterProposalAndFinalize(map.id)} disabled={!userCounterProposal[map.id]} className="bg-green-600 hover:bg-green-700">
                                                            <CheckCircle className="w-4 h-4 mr-2" />Fechar
                                                          </Button>
                                                          <Button onClick={() => handleRejectFreight(map.id)} variant="outline" size="icon" className="text-red-500 hover:bg-red-50">
                                                            <XCircle className="w-5 h-5" />
                                                          </Button>
                                                      </div>
                                                  </div>
                                              </div>
                                              
                                              {/* NOVO: Campo de observação para finalização */}
                                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                                      Observações da finalização (opcional):
                                                  </label>
                                                  <Textarea
                                                      placeholder="Digite observações sobre a finalização deste frete..."
                                                      value={finalizationObservation[map.id] || ''}
                                                      onChange={(e) => setFinalizationObservation(prev => ({ ...prev, [map.id]: e.target.value }))}
                                                      rows={2}
                                                      className="resize-none"
                                                  />
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="text-center p-3 bg-gray-100 rounded-md">
                                              <p className="text-gray-500">Aguardando proposta de {map.selectedCarrier}...</p>
                                          </div>
                                      )
                                  )}
                                  </>
                                )}
                            </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="bg-gray-50 p-3 flex justify-between items-center">
                  <Button variant="ghost" size="sm" onClick={() => toggleDetails(mapNumber)} className="text-blue-600 hover:text-blue-700">
                    {isDetailsExpanded ? 'Ocultar' : 'Ver'} Detalhes da Rota
                    {isDetailsExpanded ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                  </Button>
                </CardFooter>

                {isDetailsExpanded && (
                  <div className="border-t bg-white p-4 md:p-6 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div><p className="text-xs text-gray-500">Distância</p><p className="font-medium">{firstMap.totalKm} km</p></div>
                          <div><p className="text-xs text-gray-500">Tipo Caminhão</p><p className="font-medium">{firstMap.truckType}</p></div>
                          <div><p className="text-xs text-gray-500">Data Carregamento</p><p className="font-medium">{firstMap.loadingDate ? format(parseISO(firstMap.loadingDate), "dd/MM/yyyy") : 'N/A'}</p></div>
                      </div>
                      {firstMap.routeInfo && <div><p className="text-xs text-gray-500 mb-1">Roteiro</p><p className="text-sm bg-gray-50 p-3 rounded-lg">{firstMap.routeInfo}</p></div>}
                      
                      {/* Exibição do histórico de edições */}
                      {firstMap.editObservations && firstMap.editObservations.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1 mt-4">Histórico de Edições</p>
                          <div className="space-y-2">
                            {firstMap.editObservations.map((obs, i) => (
                              <div key={i} className="text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                <p className="font-semibold">{obs.details}</p>
                                <p className="italic text-gray-700">"{obs.observation}"</p>
                                <p className="text-xs text-gray-500 mt-1"> - {obs.user} em {format(new Date(obs.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </Card>
              );
            })}
          </div>

          {/* CONTROLES DE PAGINAÇÃO */}
          {paginationData.totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!paginationData.hasPrevPage}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: paginationData.totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show current page, 2 pages before, and 2 pages after for pagination controls
                    if (paginationData.totalPages <= 5) return true; // Show all if 5 or less
                    return Math.abs(page - currentPage) <= 2;
                  })
                  .map(page => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className={page === currentPage ? "bg-blue-600 text-white" : ""}
                    >
                      {page}
                    </Button>
                  ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!paginationData.hasNextPage}
                className="flex items-center gap-1"
              >
                Próxima
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modal de Preview da Imagem */}
      {showImagePreview && editFormData.mapImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-5xl max-h-full">
            <Button
              onClick={() => setShowImagePreview(false)}
              className="absolute -top-4 -right-4 bg-white text-gray-800 hover:bg-gray-100 rounded-full p-3 shadow-lg z-10"
            >
              <X className="w-6 h-6" />
            </Button>
            <img
              src={editFormData.mapImage}
              alt="Preview da Imagem"
              className="max-w-full max-h-screen object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
