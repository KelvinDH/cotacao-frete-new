// Serviço centralizado para comunicação com a API
const API_BASE_URL = 'http://localhost:3001/api';

class ApiService {
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

    // Métodos específicos para cada entidade
    async getFreightMaps(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = `/freight-maps${queryParams ? `?${queryParams}` : ''}`;
        return this.request(endpoint);
    }

    async createFreightMap(data) {
        return this.request('/freight-maps', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateFreightMap(id, data) {
        return this.request(`/freight-maps/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteFreightMap(id) {
        return this.request(`/freight-maps/${id}`, {
            method: 'DELETE',
        });
    }

    async getUsers() {
        return this.request('/users');
    }

    async createUser(data) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateUser(id, data) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE',
        });
    }

    async getTruckTypes() {
        return this.request('/truck-types');
    }

    async createTruckType(data) {
        return this.request('/truck-types', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateTruckType(id, data) {
        return this.request(`/truck-types/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteTruckType(id) {
        return this.request(`/truck-types/${id}`, {
            method: 'DELETE',
        });
    }

    async getCarriers() {
        return this.request('/carriers');
    }

    async createCarrier(data) {
        return this.request('/carriers', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateCarrier(id, data) {
        return this.request(`/carriers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteCarrier(id) {
        return this.request(`/carriers/${id}`, {
            method: 'DELETE',
        });
    }
}

export const apiService = new ApiService();