// Utilitários para formatação de dados
export const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

export const formatNumber = (value, options = {}) => {
    return new Intl.NumberFormat('pt-BR', options).format(value);
};

export const formatDate = (dateString, options = {}) => {
    if (!dateString) return 'N/A';
    
    const defaultOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...options
    };
    
    return new Intl.DateTimeFormat('pt-BR', defaultOptions).format(new Date(dateString));
};

export const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    return new Intl.DateTimeFormat('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(dateString));
};

export const formatWeight = (weight) => {
    return `${formatNumber(weight)} kg`;
};

export const formatDistance = (distance) => {
    return `${formatNumber(distance)} km`;
};

export const getDestinationState = (destination) => {
    if (!destination) return '';
    const parts = destination.split('/');
    return parts.pop()?.trim().toUpperCase() || '';
};

export const calculatePercentage = (value, total) => {
    if (total === 0) return 0;
    return (value / total) * 100;
};

export const calculateSavings = (originalValue, finalValue) => {
    return originalValue - finalValue;
};

export const calculateSavingsPercentage = (originalValue, finalValue) => {
    if (originalValue === 0) return 0;
    const savings = calculateSavings(originalValue, finalValue);
    return (savings / originalValue) * 100;
};