

// API Database - Conecta com a API Express
// ✅ LÓGICA ATUALIZADA PARA USAR O HOSTNAME DA REDE OU LOCALHOST
const API_HOST = window.location.hostname;
const API_BASE_URL = `http://${API_HOST}:3001/api`;

class ApiDatabase {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Error - ${endpoint}:`, error);
            throw error;
        }
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Erro no upload');
        }

        return await response.json();
    }
}

const apiDB = new ApiDatabase();

// Entity classes que usam a API
export class ApiEntity {
    constructor(entityName) {
        this.entityName = entityName;
        this.endpoint = `/${entityName}`;
    }

    async list(orderBy = '-created_date', limit = null) {
        const data = await apiDB.request(this.endpoint);
        
        // Apply ordering
        if (orderBy.startsWith('-')) {
            const field = orderBy.substring(1);
            data.sort((a, b) => new Date(b[field]) - new Date(a[field]));
        } else {
            data.sort((a, b) => new Date(a[orderBy]) - new Date(b[orderBy]));
        }
        
        // Apply limit
        return limit ? data.slice(0, limit) : data;
    }

    async filter(filters = {}, orderBy = '-created_date', limit = null) {
        // Constrói a query string a partir do objeto de filtros
        const queryParams = new URLSearchParams(filters).toString();
        const endpointWithQuery = `${this.endpoint}${queryParams ? `?${queryParams}` : ''}`;
        
        const data = await apiDB.request(endpointWithQuery);
        
        // A filtragem agora é feita no servidor. A ordenação e o limite podem continuar no cliente.
        // Aplicar ordenação
        if (orderBy.startsWith('-')) {
            const field = orderBy.substring(1);
            // Ordenação segura para datas
            data.sort((a, b) => (new Date(b[field] || 0) - new Date(a[field] || 0)));
        } else {
            const field = orderBy;
            data.sort((a, b) => (new Date(a[field] || 0) - new Date(b[field] || 0)));
        }
        
        // Aplicar limite
        return limit ? data.slice(0, limit) : data;
    }

    async create(data) {
        return await apiDB.request(this.endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async update(id, data) {
        return await apiDB.request(`${this.endpoint}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async delete(id) {
        return await apiDB.request(`${this.endpoint}/${id}`, {
            method: 'DELETE',
        });
    }

    async bulkCreate(dataArray) {
        const results = [];
        for (const data of dataArray) {
            results.push(await this.create(data));
        }
        return results;
    }
}

// Create specific entity instances
export const FreightMap = new ApiEntity('freight-maps');
export const TruckType = new ApiEntity('truck-types');
export const Carrier = new ApiEntity('carriers');
export const City = new ApiEntity('cities'); // ✅ ADICIONADO: Entidade para buscar cidades

// Enhanced User entity with authentication
export const User = {
    async login(username, password) {
        // Esta função se comunicará com a nova rota /api/login no seu backend
        const response = await apiDB.request('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        
        // Se o login for bem-sucedido, a API retornará os dados do usuário
        if (response && response.id) {
            localStorage.setItem('currentUser', JSON.stringify(response));
        }
        
        return response;
    },

    async logout() {
        localStorage.removeItem('currentUser');
        // Recarrega a página para garantir que o estado do usuário seja limpo
        window.location.reload();
    },
    
    async me() {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        // Modificado para não lançar erro, apenas retorna null se não estiver logado
        return user;
    },
    
    async list() {
        return await apiDB.request('/users');
    },
    
    async create(userData) {
        return await apiDB.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    },
    
    async update(id, data) {
        return await apiDB.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    
    async delete(id) {
        return await apiDB.request(`/users/${id}`, {
            method: 'DELETE',
        });
    },
    
    async updateMyUserData(data) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!currentUser) {
            throw new Error('Usuário não autenticado');
        }
        
        const updatedUser = await this.update(currentUser.id, data);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        return updatedUser;
    },
    
    isAuthenticated() {
        return JSON.parse(localStorage.getItem('currentUser') || 'null') !== null;
    }
};

// Upload function using API
export const UploadFile = async ({ file }) => {
    return await apiDB.uploadFile(file);
};

export default apiDB;

