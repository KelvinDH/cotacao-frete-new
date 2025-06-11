import { VALIDATION_RULES } from './constants';

export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password) => {
    return password && password.length >= VALIDATION_RULES.PASSWORD_MIN_LENGTH;
};

export const validateUsername = (username) => {
    return username && username.length >= VALIDATION_RULES.USERNAME_MIN_LENGTH;
};

export const validateRequired = (value) => {
    return value !== null && value !== undefined && value.toString().trim() !== '';
};

export const validatePositiveNumber = (value) => {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
};

export const validateFileSize = (file) => {
    return file.size <= VALIDATION_RULES.MAX_FILE_SIZE;
};

export const validateFileType = (file, allowedTypes) => {
    return allowedTypes.includes(file.type);
};

export const validateImageFile = (file) => {
    return validateFileSize(file) && validateFileType(file, VALIDATION_RULES.ALLOWED_IMAGE_TYPES);
};

export const validateDocumentFile = (file) => {
    return validateFileSize(file) && validateFileType(file, VALIDATION_RULES.ALLOWED_DOCUMENT_TYPES);
};

export const validateFreightMapForm = (formData) => {
    const errors = {};

    if (!validateRequired(formData.mapNumber)) {
        errors.mapNumber = 'Número do mapa é obrigatório';
    }

    if (!validateRequired(formData.origin)) {
        errors.origin = 'Origem é obrigatória';
    }

    if (!validateRequired(formData.destination)) {
        errors.destination = 'Destino é obrigatório';
    }

    if (!validatePositiveNumber(formData.totalKm)) {
        errors.totalKm = 'Distância deve ser um número positivo';
    }

    if (!validatePositiveNumber(formData.weight)) {
        errors.weight = 'Peso deve ser um número positivo';
    }

    if (!validatePositiveNumber(formData.mapValue)) {
        errors.mapValue = 'Valor do mapa deve ser um número positivo';
    }

    if (!validateRequired(formData.truckType)) {
        errors.truckType = 'Tipo de caminhão é obrigatório';
    }

    if (!validateRequired(formData.selectedCarrier)) {
        errors.selectedCarrier = 'Transportadora é obrigatória';
    }

    if (!validateRequired(formData.loadingMode)) {
        errors.loadingMode = 'Modalidade de carregamento é obrigatória';
    }

    if (!formData.loadingDate) {
        errors.loadingDate = 'Data de carregamento é obrigatória';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

export const validateUserForm = (formData, isEditing = false) => {
    const errors = {};

    if (!validateRequired(formData.fullName)) {
        errors.fullName = 'Nome completo é obrigatório';
    }

    if (!validateUsername(formData.username)) {
        errors.username = `Nome de usuário deve ter pelo menos ${VALIDATION_RULES.USERNAME_MIN_LENGTH} caracteres`;
    }

    if (!validateEmail(formData.email)) {
        errors.email = 'Email inválido';
    }

    if (!isEditing && !validatePassword(formData.password)) {
        errors.password = `Senha deve ter pelo menos ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} caracteres`;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'As senhas não coincidem';
    }

    if (formData.userType === 'carrier' && !validateRequired(formData.carrierName)) {
        errors.carrierName = 'Nome da transportadora é obrigatório';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};