// Constantes do sistema
export const USER_TYPES = {
    user: { 
        label: 'Usuário', 
        color: 'bg-blue-100 text-blue-800',
        permissions: ['view_quotes', 'create_quotes']
    },
    carrier: { 
        label: 'Transportadora', 
        color: 'bg-purple-100 text-purple-800',
        permissions: ['view_quotes', 'submit_proposals']
    },
    admin: { 
        label: 'Administrador', 
        color: 'bg-red-100 text-red-800',
        permissions: ['*']
    }
};

export const FREIGHT_STATUS = {
    negotiating: {
        label: 'Em Negociação',
        color: 'bg-yellow-100 text-yellow-800'
    },
    contracted: {
        label: 'Contratado',
        color: 'bg-green-100 text-green-800'
    },
    cancelled: {
        label: 'Cancelado',
        color: 'bg-red-100 text-red-800'
    }
};

export const LOADING_MODES = {
    paletizados: {
        label: 'Paletizados',
        color: 'bg-blue-100 text-blue-800'
    },
    bag: {
        label: 'BAG',
        color: 'bg-purple-100 text-purple-800'
    }
};

export const BRAZILIAN_STATES = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const API_ENDPOINTS = {
    FREIGHT_MAPS: '/freight-maps',
    USERS: '/users',
    TRUCK_TYPES: '/truck-types',
    CARRIERS: '/carriers',
    UPLOAD: '/upload'
};

export const VALIDATION_RULES = {
    PASSWORD_MIN_LENGTH: 6,
    USERNAME_MIN_LENGTH: 3,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf']
};