
import React, { useState, useEffect } from 'react';
import { Package, Calendar, MapPin, Loader2, Search, ChevronDown, ChevronUp, FileText, Upload, Eye, Trash2, Download, DollarSign, TrendingDown, Percent, Route, Weight, Truck as TruckIcon, Edit, CheckCircle, Clock, Handshake as HandshakeIcon, Users, Map, Paperclip, AlertTriangle, User as UserIcon, Truck, BarChart2, Save, Ban, X, CalendarDays, ChevronLeft, ChevronRight, ArrowLeftCircle, AlertCircle } from "lucide-react";
import { FreightMap, User as ApiUser, UploadFile, TruckType, Carrier } from "@/components/ApiDatabase";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger, // Added as per outline
  DialogFooter,
  DialogClose // Added as per outline
} from "@/components/ui/dialog";

export default function ContractedPage() {
  const [contractedFreights, setContractedFreights] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDetails, setExpandedDetails] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [modalityFilter, setModalityFilter] = useState('all');

  const [lastViewedAttachments, setLastViewedAttachments] = useState({});
  const [allFreightMaps, setAllFreightMaps] = useState([]);

  // ✅ NOVOS ESTADOS PARA EDIÇÃO COMPLETA
  const [editingMapId, setEditingMapId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [originalEditData, setOriginalEditData] = useState({});
  const [editObservation, setEditObservation] = useState('');
  const [truckTypes, setTruckTypes] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // ✅ NOVOS ESTADOS PARA PAGINAÇÃO
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // NOVOS ESTADOS para reabrir negociação
  const [reopeningFreight, setReopeningFreight] = useState(null);
  const [reopenJustification, setReopenJustification] = useState('');
  const [isReopening, setIsReopening] = useState(false);

  // Placeholder for sendEmail function - in a real app, this would be an actual import from a utility file
  const sendEmail = async ({ to, subject, html }) => {
    console.log(`Simulating email send to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html}`);
    // In a real application, you'd integrate with an email service here.
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 500));
  };

  const getBrazilIsoNow = () => {
    const now = new Date();
    // This is a simplified approach for Brazil's timezone (GMT-3 for most of the year).
    // For production, consider using a more robust library like date-fns-tz.
    const offset = now.getTimezoneOffset() + (3 * 60); // Adjusting local offset to Brazil's GMT-3 offset
    const brazilTime = new Date(now.getTime() - (offset * 60 * 1000));
    return brazilTime.toISOString();
  };

  useEffect(() => {
    loadData();
    // Carregar os timestamps de visualização do localStorage
    loadLastViewedTimes();
  }, []);

  const loadLastViewedTimes = () => {
    try {
      const stored = localStorage.getItem('lastViewedAttachments');
      if (stored) {
        setLastViewedAttachments(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erro ao carregar timestamps de visualização:', error);
    }
  };

  const markAttachmentAsViewed = (freightId) => {
    const now = new Date().toISOString();
    const updated = {
      ...lastViewedAttachments,
      [freightId]: now
    };
    setLastViewedAttachments(updated);
    localStorage.setItem('lastViewedAttachments', JSON.stringify(updated));
  };

  const hasNewAttachments = (freight) => {
    if (!freight.invoiceUrls || freight.invoiceUrls.length === 0) {
      return false;
    }

    const lastViewedTime = lastViewedAttachments[freight.id];
    if (!lastViewedTime) {
      return true;
    }

    const hasNewerAttachment = freight.invoiceUrls.some(invoice =>
      new Date(invoice.uploadedAt) > new Date(lastViewedTime)
    );

    return hasNewerAttachment;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await ApiUser.me();
      setCurrentUser(user);

      const allMaps = await FreightMap.list('-created_date');
      setAllFreightMaps(allMaps);

      // ✅ CARREGAR DADOS PARA EDIÇÃO
      const [truckTypesList, carriersList] = await Promise.all([
        TruckType.list(),
        Carrier.list()
      ]);
      setTruckTypes(truckTypesList);
      setCarriers(carriersList);

      let freightsToDisplay;
      if (user && user.userType === 'carrier') {
        freightsToDisplay = allMaps.filter(map =>
          map.status === 'contracted' && map.selectedCarrier === user.carrierName
        );
      } else {
        freightsToDisplay = allMaps.filter(map => map.status === 'contracted');
      }
      setContractedFreights(freightsToDisplay);
    } catch (error) {
      console.error("Error loading freights:", error);
      alert("Erro ao carregar fretes contratados. Verifique a API.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const brazilDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      return format(brazilDate, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return 'Data inválida';
    }
  };

  const formatToBrazilTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const brazilDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      return format(brazilDate, 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar data e hora:", error);
      return 'Data/Hora inválida';
    }
  };

  const handleFileUpload = async (event, freightId) => {
    const files = Array.from(event.target.files);
    const validExtensions = ['pdf', 'xml', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
    const maxFileSizeMB = 10;
    const maxFileSize = maxFileSizeMB * 1024 * 1024;

    const validFiles = files.filter(file => {
      const extension = file.name.toLowerCase().split('.').pop();
      if (!validExtensions.includes(extension)) {
        alert(`O arquivo ${file.name} tem uma extensão não permitida (${extension}). Apenas ${validExtensions.join(', ')} são aceitos.`);
        return false;
      }
      if (file.size > maxFileSize) {
        alert(`O arquivo ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB) excede o tamanho máximo permitido de ${maxFileSizeMB} MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      return;
    }

    setUploadingFiles(prev => ({ ...prev, [freightId]: true }));

    try {
      const uploadedBy = currentUser?.userType === 'carrier' ? currentUser.carrierName : currentUser?.email;

      const uploadPromises = validFiles.map(async (file) => {
        const result = await UploadFile({ file });
        return {
          name: file.name,
          url: result.file_url,
          uploadedAt: new Date().toISOString(),
          uploadedBy: uploadedBy || 'Sistema'
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      const freight = contractedFreights.find(f => f.id === freightId);
      const currentInvoices = freight.invoiceUrls || [];
      const updatedInvoices = [...currentInvoices, ...uploadedFiles];

      await FreightMap.update(freightId, { invoiceUrls: updatedInvoices });

      await loadData();
      alert(`${uploadedFiles.length} arquivo(s) enviado(s) com sucesso!`);

      localStorage.setItem('newInvoiceUploaded', new Date().toISOString());

    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Erro ao enviar arquivos.");
    } finally {
      setUploadingFiles(prev => ({ ...prev, [freightId]: false }));
    }
  };

  const handleDeleteFile = async (freightId, fileUrl) => {
    if (!window.confirm('Confirma a remoção deste arquivo?')) return;

    try {
      const freight = contractedFreights.find(f => f.id === freightId);
      const updatedInvoices = freight.invoiceUrls.filter(invoice => invoice.url !== fileUrl);

      await FreightMap.update(freightId, { invoiceUrls: updatedInvoices });
      await loadData();
      alert('Arquivo removido com sucesso!');
    } catch (error) {
      console.error("Error removing invoice:", error);
      alert("Erro ao remover arquivo.");
    }
  };

  const handleDeleteFreight = async (freightId, mapNumber) => {
    if (window.confirm(`Tem certeza que deseja excluir permanentemente o mapa ${mapNumber}? Esta ação é irreversível.`)) {
      try {
        await FreightMap.delete(freightId);
        alert(`Mapa ${mapNumber} excluído com sucesso.`);
        await loadData();
      } catch (error) {
        console.error("Ocorreu um erro ao excluir o frete:", error);
        alert("Ocorreu um erro ao excluir o frete.");
      }
    }
  };

  // ✅ NOVA FUNÇÃO: Iniciar edição completa
  const handleStartEdit = (freight) => {
    setEditingMapId(freight.id);
    setEditFormData({
      mapNumber: freight.mapNumber,
      origin: freight.origin,
      destination: freight.destination,
      totalKm: freight.totalKm,
      weight: freight.weight,
      mapValue: freight.mapValue,
      truckType: freight.truckType,
      selectedCarrier: freight.selectedCarrier,
      loadingMode: freight.loadingMode,
      loadingDate: freight.loadingDate ? new Date(freight.loadingDate) : null,
      routeInfo: freight.routeInfo || '',
      mapImage: freight.mapImage || '',
      managers: freight.managers || [],
      finalValue: freight.finalValue || freight.mapValue
    });
    setOriginalEditData({
      mapValue: freight.mapValue,
      selectedCarrier: freight.selectedCarrier,
      finalValue: freight.finalValue || freight.mapValue
    });
    setEditObservation('');
  };

  // ✅ NOVA FUNÇÃO: Cancelar edição
  const handleCancelEdit = () => {
    setEditingMapId(null);
    setEditFormData({});
    setOriginalEditData({});
    setEditObservation('');
    setShowImagePreview(false); // Close preview if open
  };

  // ✅ NOVA FUNÇÃO: Salvar edição completa
  const handleSaveEdit = async () => {
    const valueChanged = parseFloat(editFormData.mapValue) !== parseFloat(originalEditData.mapValue);
    const carrierChanged = editFormData.selectedCarrier !== originalEditData.selectedCarrier;
    const finalValueChanged = parseFloat(editFormData.finalValue) !== parseFloat(originalEditData.finalValue);

    if ((valueChanged || carrierChanged || finalValueChanged) && !editObservation.trim()) {
      alert('A observação é obrigatória ao alterar o valor do frete, transportadora ou valor final.');
      return;
    }

    try {
      const updateData = {
        ...editFormData,
        loadingDate: editFormData.loadingDate ? format(editFormData.loadingDate, 'yyyy-MM-dd') : null, // Convert Date object to string
        managers: editFormData.managers || []
      };

      if (valueChanged || carrierChanged || finalValueChanged) {
        let details = [];
        if (valueChanged) {
          details.push(`Valor do mapa alterado de R$ ${originalEditData.mapValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para R$ ${parseFloat(editFormData.mapValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        }
        if (carrierChanged) {
          details.push(`Transportadora alterada de "${originalEditData.selectedCarrier}" para "${editFormData.selectedCarrier}"`);
        }
        if (finalValueChanged) {
          details.push(`Valor final alterado de R$ ${originalEditData.finalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para R$ ${parseFloat(editFormData.finalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        }

        const newObservation = {
          observation: editObservation,
          user: currentUser.fullName || currentUser.email,
          timestamp: new Date().toISOString(),
          details: details.join('. ')
        };

        const currentFreight = contractedFreights.find(f => f.id === editingMapId);
        updateData.editObservations = [...(currentFreight.editObservations || []), newObservation];
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

  // ✅ NOVA FUNÇÃO: Upload de imagem na edição
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

  // ✅ NOVA FUNÇÃO: Remover imagem na edição
  const removeEditImage = () => {
    setEditFormData(prev => ({ ...prev, mapImage: '' }));
  };

  // ✅ NOVA FUNÇÃO: Filtrar tipos de caminhão por modalidade
  const getFilteredTruckTypes = (loadingMode) => {
    if (!loadingMode || !truckTypes) return [];
    const compatibleModality = loadingMode.includes('fracionado') ? loadingMode.replace('_fracionado', '') : loadingMode;
    return truckTypes.filter(truck => truck.modality === compatibleModality);
  };


  const calculateFreightData = (freight) => {
    const proposalValue = freight.carrierProposals?.[freight.selectedCarrier] || freight.finalValue;
    const mapValuePercentage = freight.mapValue > 0 ? (freight.finalValue / freight.mapValue) * 100 : 0;
    const economyGenerated = proposalValue - freight.finalValue;

    return {
      proposalValue,
      mapValuePercentage,
      economyGenerated
    };
  };

  const getPageTitle = () => {
    if (currentUser && currentUser.userType === 'carrier') {
      return "Meus Fretes Fechados";
    }
    return "Fretes Contratados";
  };

  const getPageSubTitle = () => {
    if (currentUser && currentUser.userType === 'carrier') {
      return "Todos os fretes que foram fechados e contratados.";
    }
    return "Todos os fretes que foram fechados e contratados.";
  };

  const toggleDetails = (mapNumber) => {
    setExpandedDetails(prev => ({ ...prev, [mapNumber]: !prev[mapNumber] }));
  };

  const handleDownload = (freight, invoice) => {
    markAttachmentAsViewed(freight.id);
    window.open(invoice.url, '_blank');
  };

  const handleCardClick = (freightsInGroup) => {
    freightsInGroup.forEach(freight => {
      if (hasNewAttachments(freight)) {
        markAttachmentAsViewed(freight.id);
      }
    });
  };

  const getModalityText = (loadingMode) => {
    switch (loadingMode) {
      case 'paletizados': return '📦 Paletizados';
      case 'bag': return '🎒 BAG';
      case 'granel': return '🌾 Granel';
      case 'bag_fracionado': return '🎒 BAG Fracionado';
      case 'paletizados_fracionado': return '📦 Paletizados Fracionado';
      default: return loadingMode;
    }
  };

  const getGroupedFreights = () => {
    const grouped = contractedFreights.reduce((acc, freight) => {
      if (!acc[freight.mapNumber]) {
        acc[freight.mapNumber] = [];
      }
      acc[freight.mapNumber].push(freight);
      return acc;
    }, {});

    const filteredGroups = Object.entries(grouped)
      .filter(([, group]) => {
        const hasContracted = group.some(f => f.status === 'contracted');
        if (!hasContracted) return false;

        if (currentUser && currentUser.userType === 'carrier') {
          return group.some(f => f.selectedCarrier === currentUser.carrierName && f.status === 'contracted');
        }

        return true;
      })
      .filter(([mapNumber, group]) => {
        const mainFreightForFilters = group.find(f => f.status === 'contracted') || group[0];

        const searchMatch = !searchTerm ||
          mapNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (mainFreightForFilters.origin && mainFreightForFilters.origin.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (mainFreightForFilters.destination && mainFreightForFilters.destination.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (mainFreightForFilters.selectedCarrier && mainFreightForFilters.selectedCarrier.toLowerCase().includes(searchTerm.toLowerCase()));

        const modalityMatch = modalityFilter === 'all' || mainFreightForFilters.loadingMode === modalityFilter;

        return searchMatch && modalityMatch;
      })
      .sort(([, groupA], [, groupB]) => {
        return new Date(groupB[0].created_date) - new Date(groupA[0].created_date);
      });

    return filteredGroups;
  };

  // ✅ NOVA FUNÇÃO: Aplicar paginação
  const getPaginatedFreights = () => {
    const allGroups = getGroupedFreights();
    const totalItems = allGroups.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Ajustar página atual se necessário
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

  // ✅ NOVA FUNÇÃO: Navegar páginas
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= paginationData.totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // NOVA FUNÇÃO: Reabrir frete para negociação (ATUALIZADA)
  const handleReopenNegotiation = async () => {
    if (!reopeningFreight) return;

    // Validação
    if (!reopenJustification.trim() || reopenJustification.trim().length < 10) {
      alert('Por favor, forneça uma justificativa com pelo menos 10 caracteres para reabrir a negociação.');
      return;
    }

    setIsReopening(true);
    try {
      // Criar observação sobre a reabertura
      const reopenObservation = {
        observation: `Frete reaberto para negociação. Justificativa: ${reopenJustification.trim()}`,
        user: currentUser.fullName, // Updated as per outline
        timestamp: getBrazilIsoNow(),
        details: 'Reabertura para negociação'
      };

      // Atualizar o frete para status 'negotiating' e adicionar observação
      const updatedFreight = {
        ...reopeningFreight,
        status: 'negotiating',
        contractedAt: null, // Remove a data de contratação
        finalValue: null, // Remove o valor final
        justification: null, // Remove a justificativa anterior
        finalizationObservation: null, // Remove observação de finalização anterior
        editObservations: [...(reopeningFreight.editObservations || []), reopenObservation],
        updated_date: getBrazilIsoNow()
      };

      await FreightMap.update(reopeningFreight.id, updatedFreight);
      
      // Enviar email para a transportadora notificando sobre a reabertura (preserved)
      try {
        const users = await ApiUser.list(); // Using ApiUser to list users
        const carrierUser = users.find(user => 
          user.userType === 'carrier' && 
          user.carrierName === reopeningFreight.selectedCarrier && 
          user.active
        );
        
        if (carrierUser) {
          const emailSubject = `🔄 Frete Reaberto para Negociação - Mapa ${reopeningFreight.mapNumber}`;
          const emailBody = `
            <h2>Olá, ${carrierUser.fullName}!</h2>
            <p>O frete do mapa <strong>${reopeningFreight.mapNumber}</strong> com rota de <strong>${reopeningFreight.origin}</strong> para <strong>${reopeningFreight.destination}</strong> foi reaberto para negociação.</p>
            
            <h3>📋 JUSTIFICATIVA PARA REABERTURA:</h3>
            <p><em>"${reopenJustification.trim()}"</em></p>
            
            <p>Acesse o sistema para visualizar os detalhes e continuar a negociação.</p>
            
            <p>Atenciosamente,<br>Equipe UnionAgro</p>
          `;

          await sendEmail({
            to: carrierUser.email,
            subject: emailSubject,
            html: emailBody
          });
        } else {
            console.warn(`Carrier user for ${reopeningFreight.selectedCarrier} not found or not active. Email not sent.`);
        }
      } catch (emailError) {
        console.error('Erro ao enviar email de notificação:', emailError);
        // Não bloqueia o fluxo principal se houver erro no email
      }

      alert('Frete reaberto para negociação com sucesso!');
      
      // Resetar estados do modal
      setReopeningFreight(null);
      setReopenJustification('');
      
      // Recarregar dados
      await loadData(); // Changed from loadFreightMaps() to loadData()
      
    } catch (error) {
      console.error('Erro ao reabrir frete para negociação:', error);
      alert('Erro ao reabrir frete para negociação. Tente novamente.');
    } finally {
      setIsReopening(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="ml-3 text-gray-600">Carregando fretes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{getPageTitle()}</h1>
        <p className="text-gray-600 mt-1">{getPageSubTitle()}</p>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Buscar por mapa, rota ou transportadora..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {paginationData.groups.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>Nenhum frete encontrado.</p>
        </div>
      ) : (
        <>
          {/* ✅ INFORMAÇÕES DE PAGINAÇÃO */}
          <div className="mb-4 flex justify-between items-center text-sm text-gray-600">
            <p>
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, paginationData.totalItems)} de {paginationData.totalItems} frete(s)
            </p>
            <p>Página {currentPage} de {paginationData.totalPages}</p>
          </div>

          <div className="space-y-6">
            {paginationData.groups.map(([mapNumber, freightsInGroup]) => {
              const firstFreight = freightsInGroup.find(f => f.status === 'contracted') || freightsInGroup[0];
              const isDetailsExpanded = expandedDetails[mapNumber];
              const groupHasNewAttachments = freightsInGroup.some(freight => hasNewAttachments(freight));

              // Existing: List of FreightMap objects that have proposals for this mapNumber
              const allRelevantProposalsMaps = allFreightMaps.filter(
                map => map.mapNumber === mapNumber &&
                map.carrierProposals &&
                Object.keys(map.carrierProposals).length > 0
              );

              // ✅ CÁLCULO DAS ESTATÍSTICAS DE PROPOSTAS
              const allProposalsForMap = allFreightMaps
                .filter(map => map.mapNumber === mapNumber)
                .flatMap(map => map.carrierProposals ? Object.values(map.carrierProposals) : [])
                .filter(value => typeof value === 'number' && value > 0);

              const totalPropostas = allProposalsForMap.length;
              const menorProposta = totalPropostas > 0 ? Math.min(...allProposalsForMap) : 0;
              const maiorProposta = totalPropostas > 0 ? Math.max(...allProposalsForMap) : 0;

              return (
                <Card
                  key={mapNumber}
                  className={`overflow-hidden shadow-lg transition-all duration-300 ${groupHasNewAttachments
                    ? 'bg-purple-50 border-2 border-purple-400 cursor-pointer'
                    : 'border-2 border-transparent hover:border-blue-300'
                    }`}
                  onClick={() => handleCardClick(freightsInGroup)}
                >
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                            Mapa {mapNumber}
                          </span>
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            ✅ Contratado
                          </Badge>
                          {getModalityText(firstFreight.loadingMode) && (
                            <Badge className="bg-purple-100 text-purple-800 text-xs">
                              {getModalityText(firstFreight.loadingMode)}
                            </Badge>
                          )}
                          {groupHasNewAttachments && (
                            <Badge className="bg-purple-100 text-purple-800 text-xs animate-pulse">
                              📎 Novos Anexos
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-gray-600 mt-1 text-sm">
                          <span className="font-medium">{firstFreight.origin}</span> → <span className="font-medium">{firstFreight.destination}</span>
                          <span className="mx-2">•</span>
                          <span>{firstFreight.totalKm} km</span>
                          <span className="mx-2">•</span>
                          <span>{firstFreight.weight?.toLocaleString('pt-BR')} kg</span>
                          <span className="mx-2">•</span>
                          <span className="font-medium text-green-600">{firstFreight.selectedCarrier}</span>
                        </p>
                      </div>

                      {/* ✅ BOTÕES REPOSICIONADOS: Editar e Excluir lado a lado */}
                      {currentUser?.userType !== 'carrier' && editingMapId !== firstFreight.id && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { // Stop propagation
                              e.stopPropagation();
                              handleStartEdit(firstFreight);
                            }}
                            className="bg-blue-600 text-white hover:bg-blue-700"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar Frete
                          </Button>
                          {/* NOVA AÇÃO: Botão para reabrir negociação (apenas para admin/user) */}
                          {currentUser && (currentUser.userType === 'admin' || currentUser.userType === 'user') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { // Stop propagation
                                e.stopPropagation();
                                setReopeningFreight(firstFreight);
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-300"
                            >
                              <ArrowLeftCircle className="w-4 h-4 mr-2" />
                              Reabrir Negociação
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { // Stop propagation
                              e.stopPropagation();
                              handleDeleteFreight(firstFreight.id, firstFreight.mapNumber);
                            }}
                            className="bg-red-600 text-white hover:bg-red-700"
                            title={`Excluir Mapa ${firstFreight.mapNumber}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 md:p-6 space-y-6">
                    {/* ✅ FORMULÁRIO DE EDIÇÃO COMPLETA */}
                    {editingMapId === firstFreight.id && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                        <h4 className="font-semibold text-yellow-800 mb-4 flex items-center">
                          <Edit className="w-5 h-5 mr-2" />
                          Editando Frete Contratado - Mapa {firstFreight.mapNumber}
                        </h4>

                        <div className="space-y-6">
                          {/* Identificação */}
                          <div className="bg-white rounded-lg p-4 shadow-sm">
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
                                <Select value={editFormData.loadingMode || ''} onValueChange={(value) => setEditFormData(prev => ({ ...prev, loadingMode: value, truckType: '' }))}>
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
                          <div className="bg-white rounded-lg p-4 shadow-sm">
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
                          <div className="bg-white rounded-lg p-4 shadow-sm">
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
                                  onWheel={(e) => e.target.blur()}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Carga e Valores */}
                          <div className="bg-white rounded-lg p-4 shadow-sm">
                            <h5 className="font-medium text-gray-800 mb-3">Carga e Valores</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor="edit-weight">Peso (kg)</Label>
                                <Input
                                  id="edit-weight"
                                  type="number"
                                  step="0.01"
                                  value={editFormData.weight || ''}
                                  onChange={(e) => setEditFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                                  onWheel={(e) => e.target.blur()}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-mapValue">Valor do Mapa (R$)</Label>
                                <Input
                                  id="edit-mapValue"
                                  type="number"
                                  step="0.01"
                                  value={editFormData.mapValue || ''}
                                  onChange={(e) => setEditFormData(prev => ({ ...prev, mapValue: parseFloat(e.target.value) || 0 }))}
                                  onWheel={(e) => e.target.blur()}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-finalValue">Valor Final Contratado (R$)</Label>
                                <Input
                                  id="edit-finalValue"
                                  type="number"
                                  step="0.01"
                                  value={editFormData.finalValue || ''}
                                  onChange={(e) => setEditFormData(prev => ({ ...prev, finalValue: parseFloat(e.target.value) || 0 }))}
                                  className="font-semibold border-green-300"
                                  onWheel={(e) => e.target.blur()}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Transporte */}
                          <div className="bg-white rounded-lg p-4 shadow-sm">
                            <h5 className="font-medium text-gray-800 mb-3">Informações de Transporte</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <Label htmlFor="edit-selectedCarrier">Transportadora Contratada</Label>
                                <Select value={editFormData.selectedCarrier || ''} onValueChange={(value) => setEditFormData(prev => ({ ...prev, selectedCarrier: value }))}>
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
                                <Select value={editFormData.truckType || ''} onValueChange={(value) => setEditFormData(prev => ({ ...prev, truckType: value }))}>
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
                                  <Button variant="outline" className="w-full justify-start text-left font-normal">
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
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>

                          {/* Observações */}
                          <div className="bg-white rounded-lg p-4 shadow-sm">
                            <h5 className="font-medium text-gray-800 mb-3">Informações da Rota/Observações Adicionais</h5>
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
                            <p className="text-sm text-orange-700 mb-2">Obrigatória se alterar transportadora, valor do mapa ou valor final.</p>
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
                            <Button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700">
                              <Save className="w-4 h-4 mr-2" />
                              Salvar Alterações
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Informações da Rota/Valor Contratado */}
                    {editingMapId !== firstFreight.id && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-2xl font-bold text-green-600">
                            R$ {firstFreight.finalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                          </div>
                          <div className="text-xs text-gray-500">Valor Final</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-2xl font-bold text-blue-600">
                            R$ {menorProposta > 0 ? menorProposta.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">Menor Proposta</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-2xl font-bold text-purple-600">
                             R$ {maiorProposta > 0 ? maiorProposta.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">Maior Proposta</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-2xl font-bold text-orange-600">
                            {totalPropostas}
                          </div>
                          <div className="text-xs text-gray-500">Total Propostas</div>
                        </div>
                      </div>
                    )}

                    {/* Propostas Recebidas para este Mapa */}
                    {currentUser && (currentUser.userType === 'admin' || currentUser.userType === 'user') && allRelevantProposalsMaps.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                          <DollarSign className="w-5 h-5 mr-2" />
                          Propostas Recebidas para este Mapa
                        </h4>
                        {(() => {
                          const allProposalsForMap = allFreightMaps
                            .filter(map => map.mapNumber === mapNumber)
                            .flatMap(map => map.carrierProposals ? 
                              Object.entries(map.carrierProposals).map(([carrier, value]) => ({ carrier, value })) : []
                            )
                            .filter(proposal => proposal.value > 0);

                          if (allProposalsForMap.length === 0) {
                            return (
                              <p className="text-gray-500 text-sm">Nenhuma proposta recebida</p>
                            );
                          }

                          const sortedProposals = allProposalsForMap.sort((a, b) => a.value - b.value);

                          return (
                            <div className="space-y-2">
                              {sortedProposals.map((proposal, index) => (
                                <div key={`${proposal.carrier}-${index}`} 
                                     className={`flex justify-between items-center p-3 rounded-lg ${
                                       proposal.carrier === firstFreight.selectedCarrier 
                                         ? 'bg-green-100 border border-green-300' 
                                         : 'bg-white border border-gray-200'
                                     }`}>
                                  <span className="font-medium text-gray-800 flex items-center">
                                    {proposal.carrier === firstFreight.selectedCarrier && (
                                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                                    )}
                                    {proposal.carrier}
                                    {proposal.carrier === firstFreight.selectedCarrier && (
                                      <Badge className="ml-2 bg-green-600 text-white text-xs">CONTRATADO</Badge>
                                    )}
                                  </span>
                                  <span className="font-bold text-lg text-green-600">
                                    R$ {proposal.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Histórico de Propostas + Imagem do Mapa lado a lado */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {currentUser && currentUser.userType === 'carrier' && (
                        <div className="bg-green-50 rounded-lg p-6 border border-green-200 flex flex-col items-center justify-center text-center">
                          <CheckCircle className="w-12 h-12 text-green-600 mb-3" />
                          <h4 className="text-lg font-semibold text-green-800 mb-2">
                            Valor Final Contratado
                          </h4>
                          <p className="text-4xl font-bold text-green-700">
                            R$ {firstFreight.finalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            Este é o valor acordado para este frete.
                          </p>
                        </div>
                      )}

                      {firstFreight.mapImage && (
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <Map className="w-5 h-5 mr-2 text-blue-600" />
                            Mapa da Rota
                          </h4>
                          <a href={firstFreight.mapImage} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                            <img
                              src={firstFreight.mapImage}
                              alt="Mapa da Rota"
                              className="w-full h-full object-contain max-h-[400px] rounded-md bg-white p-1 border"
                            />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Informações dos Gerentes */}
                    {currentUser?.userType !== 'carrier' && firstFreight.managers?.length > 0 && (
                      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                          <Users className="w-5 h-5 mr-2 text-teal-600" />
                          Gerentes Associados
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {firstFreight.managers.map((m, i) => (
                            <div key={i} className="bg-white p-2 rounded border">
                              <p className="font-medium text-gray-700">{m.gerente}</p>
                              <p className="text-sm text-teal-700 font-semibold">R$ {parseFloat(m.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Exibir observações de finalização se existirem */}
                    {firstFreight.finalizationObservation && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h5 className="font-semibold text-blue-800 mb-2">📝 Observações da Finalização:</h5>
                        <p className="text-sm text-gray-700 italic">"{firstFreight.finalizationObservation}"</p>
                      </div>
                    )}

                    {/* Seção de Fretes Contratados - This section iterates through individual freights in the group */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-3 border-t pt-4">
                        Detalhes do Frete Contratado
                      </h4>
                      <div className="space-y-4">
                        {freightsInGroup
                          .filter(f => f.status === 'contracted')
                          .map((freight) => {
                            const freightData = calculateFreightData(freight);

                            return (
                              <div
                                key={freight.id}
                                className="p-4 rounded-lg border bg-white border-gray-200 shadow-sm"
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <h5 className="font-semibold text-gray-800 flex items-center">
                                    🚛 {freight.selectedCarrier}
                                  </h5>
                                  <Badge className="bg-green-100 text-green-800">
                                    R$ {freight.finalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                    <p className="text-xs text-gray-600">Valor do Mapa</p>
                                    <p className="font-bold text-yellow-700">
                                      R$ {freight.mapValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>

                                  {currentUser?.userType !== 'carrier' && (
                                    <>
                                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                        <p className="text-xs text-gray-600">% do Valor Mapa</p>
                                        <p className="font-bold text-blue-700">
                                          {freightData.mapValuePercentage.toFixed(1)}%
                                        </p>
                                      </div>
                                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                        <p className="text-xs text-gray-600">Economia Gerada</p>
                                        <p className="font-bold text-green-700">
                                          R$ {freightData.economyGenerated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                      </div>
                                    </>
                                  )}

                                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                    <p className="text-xs text-gray-600">Proposta Original</p>
                                    <p className="font-bold text-purple-700">
                                      R$ {freightData.proposalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                  <h4 className="font-semibold text-gray-800 mb-3">Informações Técnicas do Frete</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex items-center gap-2">
                                      <Route className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <p className="text-xs text-gray-500">KM Total</p>
                                        <p className="font-medium">{freight.totalKm} km</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Weight className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <p className="text-xs text-gray-500">Peso</p>
                                        <p className="font-medium">{freight.weight?.toLocaleString('pt-BR')} kg</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <TruckIcon className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <p className="text-xs text-gray-500">Tipo de Caminhão</p>
                                        <p className="font-medium">{freight.truckType}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Anexos do Frete */}
                                <div className="bg-white rounded-lg p-4 border shadow-sm">
                                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                    <Paperclip className="w-5 h-5 mr-2 text-green-600" />
                                    Anexos do Frete
                                  </h4>
                                  {freight.invoiceUrls && freight.invoiceUrls.length > 0 ? (
                                    <div className="space-y-3">
                                      {freight.invoiceUrls.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                          <div className="flex items-center">
                                            <FileText className="w-5 h-5 text-blue-600 mr-3" />
                                            <div>
                                              <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                                onClick={() => handleDownload(freight, file)}
                                              >
                                                {file.name}
                                              </a>
                                              <p className="text-xs text-gray-500">
                                                Anexado em {formatDate(file.uploadedAt)} por {' '}
                                                <span className={`font-semibold px-2 py-1 rounded-full text-xs ${
                                                  file.uploadedBy?.includes('@')
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-orange-100 text-orange-800'
                                                }`}>
                                                  {file.uploadedBy || 'Sistema'}
                                                </span>
                                              </p>
                                          </div>
                                        </div>
                                        {(currentUser?.userType !== 'carrier' || (currentUser?.userType === 'carrier' && freight.selectedCarrier === currentUser.carrierName)) && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteFile(freight.id, file.url)}
                                            className="text-red-500 hover:bg-red-100"
                                            title="Remover arquivo"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-gray-500">
                                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>Nenhum arquivo anexado ainda</p>
                                  </div>
                                )}

                                {/* Upload de Arquivos para Transportadoras e Admins */}
                                {(currentUser?.userType !== 'carrier' || (currentUser?.userType === 'carrier' && freight.selectedCarrier === currentUser.carrierName)) && (
                                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <h5 className="font-semibold text-gray-800 mb-3">
                                      📎 Anexar Documentos do Frete
                                    </h5>
                                    <div className="relative">
                                      <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.xml,.jpg,.jpeg,.png,.doc,.docx"
                                        onChange={(e) => handleFileUpload(e, freight.id)}
                                        disabled={uploadingFiles[freight.id]}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        id={`file-upload-${freight.id}`}
                                      />
                                      <label
                                        htmlFor={`file-upload-${freight.id}`}
                                        className={`w-full flex items-center justify-center p-3 border border-blue-300 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors ${uploadingFiles[freight.id] ? 'opacity-50 cursor-not-allowed' : ''
                                          }`}
                                      >
                                        {uploadingFiles[freight.id] ? (
                                          <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                            Enviando...
                                          </div>
                                        ) : (
                                          <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Selecionar Arquivos
                                          </>
                                        )}
                                      </label>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                      Formatos aceitos: PDF, XML, JPG, PNG, DOC, DOCX (máx. 10MB cada)
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="bg-gray-50 p-3 flex justify-between items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDetails(mapNumber)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {isDetailsExpanded ? 'Ocultar' : 'Ver'} Detalhes Adicionais
                      {isDetailsExpanded ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                    </Button>

                    {/* Cancel button if editing, so it's always accessible */}
                    {editingMapId === firstFreight.id && (
                      <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              handleCancelEdit();
                          }}
                          className="text-red-600 hover:text-red-700"
                      >
                          <Ban className="w-4 h-4 mr-2"/>
                          Cancelar Edição
                      </Button>
                    )}
                  </CardFooter>

                  {isDetailsExpanded && (
                    <CardContent className="p-4 md:p-6 space-y-4 pt-0 bg-gray-50">
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <Route className="w-5 h-5 mr-2 text-indigo-600" />
                          Informações do Roteiro
                        </h4>

                        {firstFreight.routeInfo ? (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {firstFreight.routeInfo}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                            <p className="text-gray-500 italic">
                              Nenhuma informação adicional sobre o roteiro foi fornecida.
                            </p>
                          </div>
                        )}

                        <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                          <h5 className="font-semibold text-gray-800 mb-3">Informações Técnicas</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Distância Total</p>
                              <p className="font-medium text-gray-800">{firstFreight.totalKm} km</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Tipo de Caminhão</p>
                              <p className="font-medium text-gray-800">{firstFreight.truckType}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Data de Carregamento</p>
                              <p className="font-medium text-gray-800">{formatDate(firstFreight.loadingDate)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Modalidade</p>
                              <p className="font-medium text-gray-800">
                                {firstFreight.loadingMode === 'paletizados' ? 'Paletizados' :
                                  firstFreight.loadingMode === 'bag' ? 'BAG' :
                                  firstFreight.loadingMode === 'granel' ? 'Granel' :
                                  firstFreight.loadingMode === 'paletizados_fracionado' ? 'Paletizados Fracionado' :
                                  firstFreight.loadingMode === 'bag_fracionado' ? 'BAG Fracionado' :
                                  firstFreight.loadingMode}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-gray-200 pt-4">
                          {firstFreight.justification && (
                            <div className="mb-4">
                              <p className="text-xs text-gray-500 mb-1">Justificativa da Escolha</p>
                              <p className="text-sm bg-orange-50 p-3 rounded-lg border border-orange-200">{firstFreight.justification}</p>
                            </div>
                          )}

                          {firstFreight.editObservations && firstFreight.editObservations.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Histórico de Edições</p>
                              <div className="space-y-2">
                                {firstFreight.editObservations.map((obs, i) => (
                                  <div key={i} className="text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                    <p className="font-semibold">{obs.details}</p>
                                    <p className="italic">"{obs.observation}"</p>
                                    <p className="text-xs text-gray-500 mt-1"> - {format(new Date(obs.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })} por {obs.user}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    </CardContent>
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
                </Card>
              );
            })}
          </div>

          {/* ✅ CONTROLES DE PAGINAÇÃO */}
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
                    // Mostrar até 5 páginas: atual, 2 antes e 2 depois
                    const maxPagesToShow = 5;
                    const half = Math.floor(maxPagesToShow / 2);
                    if (paginationData.totalPages <= maxPagesToShow) {
                      return true; // Show all pages if total pages are less than or equal to 5
                    }
                    if (currentPage <= half) {
                      return page <= maxPagesToShow; // Show first 5 pages
                    }
                    if (currentPage > paginationData.totalPages - half) {
                      return page > paginationData.totalPages - maxPagesToShow; // Show last 5 pages
                    }
                    return Math.abs(page - currentPage) <= half; // Show current page + half on each side
                  })
                  .map(page => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className={page === currentPage ? "bg-green-600 text-white" : ""}
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

      {/* NOVO MODAL: Reabrir Negociação (ATUALIZADO) */}
      <Dialog open={!!reopeningFreight} onOpenChange={() => setReopeningFreight(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reabrir Frete para Negociação</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Informações do Frete</h4>
              <div className="space-y-1 text-sm text-blue-700">
                <p><strong>Mapa:</strong> {reopeningFreight?.mapNumber}</p>
                <p><strong>Transportadora:</strong> {reopeningFreight?.selectedCarrier}</p>
                <p><strong>Rota:</strong> {reopeningFreight?.origin} → {reopeningFreight?.destination}</p>
                <p><strong>Valor Final:</strong> R$ {reopeningFreight?.finalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p> {/* Changed text from "Valor Final Contratado" to "Valor Final" */}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Atenção!</p>
                  <p>Esta ação irá retornar o frete para a página de negociação e permitirá um novo acordo de valores.</p> {/* Updated message as per outline */}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="reopen-justification" className="text-sm font-medium text-gray-700">
                Justificativa para Reabertura *
              </Label>
              <Textarea
                id="reopen-justification"
                value={reopenJustification}
                onChange={(e) => setReopenJustification(e.target.value)}
                placeholder="Descreva o motivo para reabrir este frete..." // Updated placeholder as per outline
                className="mt-2"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                Campo obrigatório. ({reopenJustification.trim().length}/500) {/* Updated text for char count */}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setReopeningFreight(null);
                setReopenJustification(''); // Clear justification on cancel (already existing, but explicitly kept)
              }}
              disabled={isReopening}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleReopenNegotiation}
              disabled={isReopening || !reopenJustification.trim() || reopenJustification.trim().length < 10} // Kept robust validation
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isReopening ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Reabrindo...
                </>
              ) : (
                <>
                  <ArrowLeftCircle className="w-4 h-4 mr-2" />
                  Confirmar e Reabrir {/* Updated button text */}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
