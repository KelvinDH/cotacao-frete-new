// Local Database System using localStorage

class LocalDatabase {
    constructor() {
        this.initializeDatabase();
    }

    initializeDatabase() {
        // Initialize sample data if not exists
        if (!localStorage.getItem('freightMaps')) {
            this.initializeSampleData();
        }
        if (!localStorage.getItem('users')) {
            this.initializeUsers();
        }
    }

    initializeUsers() {
        const adminUser = {
            id: crypto.randomUUID(),
            fullName: "Administrador Sistema",
            username: "admin",
            email: "admin@unionagro.com",
            password: "admin123", // Em produção, isso seria hasheado
            userType: "admin",
            carrierName: null,
            active: true,
            created_date: new Date().toISOString(),
            updated_date: new Date().toISOString(),
            created_by: "system"
        };

        const sampleUsers = [adminUser];
        localStorage.setItem('users', JSON.stringify(sampleUsers));
    }

    initializeSampleData() {
        // Sample Freight Maps
        const sampleFreightMaps = [
            {
                id: crypto.randomUUID(),
                mapNumber: "MAP001",
                origin: "Pederneiras/SP",
                destination: "São Paulo/SP",
                totalKm: 350,
                weight: 15000,
                mapValue: 2500.00,
                truckType: "Truck Paletizado 1",
                loadingMode: "paletizados",
                loadingDate: "2024-01-15",
                routeInfo: "Rota via Rodovia SP-300",
                carrierProposals: {
                    "Transportadora São Paulo": 2200,
                    "Universal Transportes": 2300
                },
                status: "negotiating",
                invoiceUrls: [],
                created_date: new Date().toISOString(),
                updated_date: new Date().toISOString(),
                created_by: "system"
            },
            {
                id: crypto.randomUUID(),
                mapNumber: "MAP002",
                origin: "Pederneiras/SP",
                destination: "Belo Horizonte/MG",
                totalKm: 420,
                weight: 12000,
                mapValue: 2800.00,
                truckType: "Truck BAG 1",
                loadingMode: "bag",
                loadingDate: "2024-01-20",
                routeInfo: "Rota via BR-381",
                carrierProposals: {
                    "BAG Express": 2600,
                    "Cargas Rio": 2650
                },
                status: "negotiating",
                invoiceUrls: [],
                created_date: new Date().toISOString(),
                updated_date: new Date().toISOString(),
                created_by: "system"
            },
            {
                id: crypto.randomUUID(),
                mapNumber: "MAP003",
                origin: "São Paulo/SP",
                destination: "Rio de Janeiro/RJ",
                totalKm: 430,
                weight: 18000,
                mapValue: 3200.00,
                truckType: "Truck Paletizado 2",
                loadingMode: "paletizados",
                loadingDate: "2024-01-10",
                routeInfo: "Rota via BR-116",
                carrierProposals: {
                    "Fretes Minas": 2900,
                    "Universal Transportes": 3000
                },
                selectedCarrier: "Fretes Minas",
                finalValue: 2900,
                status: "contracted",
                contractedAt: "2024-01-12T10:30:00Z",
                invoiceUrls: [],
                created_date: new Date().toISOString(),
                updated_date: new Date().toISOString(),
                created_by: "system"
            }
        ];

        // Sample Truck Types
        const sampleTruckTypes = [
            {
                id: crypto.randomUUID(),
                name: "Truck Paletizado 1",
                capacity: 10.5,
                baseRate: 2.5,
                modality: "paletizados",
                created_date: new Date().toISOString(),
                updated_date: new Date().toISOString(),
                created_by: "system"
            },
            {
                id: crypto.randomUUID(),
                name: "Truck Paletizado 2",
                capacity: 12.0,
                baseRate: 2.8,
                modality: "paletizados",
                created_date: new Date().toISOString(),
                updated_date: new Date().toISOString(),
                created_by: "system"
            },
            {
                id: crypto.randomUUID(),
                name: "Truck BAG 1",
                capacity: 8.0,
                baseRate: 2.2,
                modality: "bag",
                created_date: new Date().toISOString(),
                updated_date: new Date().toISOString(),
                created_by: "system"
            },
            {
                id: crypto.randomUUID(),
                name: "Truck BAG 2",
                capacity: 9.5,
                baseRate: 2.4,
                modality: "bag",
                created_date: new Date().toISOString(),
                updated_date: new Date().toISOString(),
                created_by: "system"
            }
        ];

        // Sample Carriers
        const sampleCarriers = [
            {
                id: crypto.randomUUID(),
                name: "Transportadora São Paulo",
                type: "paletizados",
                active: true,
                created_date: new Date().toISOString(),
                updated_date: new Date().toISOString(),
                created_by: "system"
            },
            {
                id: crypto.randomUUID(),
                name: "Fretes Minas",
                type: "paletizados",
                active: true,
                created_date: new Date().toISOString(),
                updated_date: new Date().toISOString(),
                created_by: "system"
            },
            {
                id: crypto.randomUUID(),
                name: "BAG Express",
                type: "bag",
                active: true,
                created_date: new Date().toISOString(),
                updated_date: new Date().toISOString(),
                created_by: "system"
            },
            {
                id: crypto.randomUUID(),
                name: "Cargas Rio",
                type: "bag",
                active: true,
                created_date: new Date().toISOString(),
                updated_date: new Date().toISOString(),
                created_by: "system"
            },
            {
                id: crypto.randomUUID(),
                name: "Universal Transportes",
                type: "paletizados",
                active: true,
                created_date: new Date().toISOString(),
                updated_date: new Date().toISOString(),
                created_by: "system"
            }
        ];

        // Store in localStorage
        localStorage.setItem('freightMaps', JSON.stringify(sampleFreightMaps));
        localStorage.setItem('truckTypes', JSON.stringify(sampleTruckTypes));
        localStorage.setItem('carriers', JSON.stringify(sampleCarriers));
    }

    // Generic CRUD operations
    getAll(entityName) {
        const data = localStorage.getItem(entityName);
        return data ? JSON.parse(data) : [];
    }

    getById(entityName, id) {
        const items = this.getAll(entityName);
        return items.find(item => item.id === id);
    }

    create(entityName, data) {
        const items = this.getAll(entityName);
        const newItem = {
            ...data,
            id: crypto.randomUUID(),
            created_date: new Date().toISOString(),
            updated_date: new Date().toISOString(),
            created_by: "user"
        };
        items.push(newItem);
        localStorage.setItem(entityName, JSON.stringify(items));
        return newItem;
    }

    update(entityName, id, updateData) {
        const items = this.getAll(entityName);
        const index = items.findIndex(item => item.id === id);
        
        if (index !== -1) {
            items[index] = {
                ...items[index],
                ...updateData,
                updated_date: new Date().toISOString()
            };
            localStorage.setItem(entityName, JSON.stringify(items));
            return items[index];
        }
        
        throw new Error(`Item with id ${id} not found`);
    }

    delete(entityName, id) {
        const items = this.getAll(entityName);
        const filteredItems = items.filter(item => item.id !== id);
        
        if (filteredItems.length === items.length) {
            throw new Error(`Item with id ${id} not found`);
        }
        
        localStorage.setItem(entityName, JSON.stringify(filteredItems));
        return { success: true };
    }

    filter(entityName, filters = {}) {
        const items = this.getAll(entityName);
        return items.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
                if (value === undefined || value === null) return true;
                return item[key] === value;
            });
        });
    }

    // Authentication methods
    login(username, password) {
        const users = this.getAll('users');
        const user = users.find(u => 
            (u.username === username || u.email === username) && 
            u.password === password && 
            u.active
        );
        
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            return user;
        }
        
        throw new Error('Credenciais inválidas');
    }

    logout() {
        localStorage.removeItem('currentUser');
        return { success: true };
    }

    getCurrentUser() {
        const userData = localStorage.getItem('currentUser');
        return userData ? JSON.parse(userData) : null;
    }

    isUsernameTaken(username, excludeId = null) {
        const users = this.getAll('users');
        return users.some(u => u.username === username && u.id !== excludeId);
    }

    isEmailTaken(email, excludeId = null) {
        const users = this.getAll('users');
        return users.some(u => u.email === email && u.id !== excludeId);
    }

    // File simulation
    uploadFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const fileId = crypto.randomUUID();
                const fileData = {
                    id: fileId,
                    name: file.name,
                    data: e.target.result,
                    type: file.type,
                    uploaded_at: new Date().toISOString()
                };
                
                const files = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
                files.push(fileData);
                localStorage.setItem('uploadedFiles', JSON.stringify(files));
                
                resolve({ file_url: `local://file/${fileId}` });
            };
            reader.readAsDataURL(file);
        });
    }

    getFile(fileId) {
        const files = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
        return files.find(file => file.id === fileId);
    }
}

// Export singleton instance
export const localDB = new LocalDatabase();

// Create Entity classes that use the local database
export class LocalEntity {
    constructor(entityName) {
        this.entityName = entityName;
    }

    async list(orderBy = '-created_date', limit = null) {
        let items = localDB.getAll(this.entityName);
        
        // Apply ordering
        if (orderBy.startsWith('-')) {
            const field = orderBy.substring(1);
            items.sort((a, b) => new Date(b[field]) - new Date(a[field]));
        } else {
            items.sort((a, b) => new Date(a[orderBy]) - new Date(b[orderBy]));
        }
        
        // Apply limit
        return limit ? items.slice(0, limit) : items;
    }

    async filter(filters = {}, orderBy = '-created_date', limit = null) {
        let items = localDB.filter(this.entityName, filters);
        
        // Apply ordering
        if (orderBy.startsWith('-')) {
            const field = orderBy.substring(1);
            items.sort((a, b) => new Date(b[field]) - new Date(a[field]));
        } else {
            items.sort((a, b) => new Date(a[orderBy]) - new Date(b[orderBy]));
        }
        
        // Apply limit
        return limit ? items.slice(0, limit) : items;
    }

    async create(data) {
        return localDB.create(this.entityName, data);
    }

    async update(id, data) {
        return localDB.update(this.entityName, id, data);
    }

    async delete(id) {
        return localDB.delete(this.entityName, id);
    }

    async bulkCreate(dataArray) {
        return dataArray.map(data => localDB.create(this.entityName, data));
    }
}

// Create specific entity instances
export const FreightMap = new LocalEntity('freightMaps');
export const TruckType = new LocalEntity('truckTypes');
export const Carrier = new LocalEntity('carriers');
export const UserEntity = new LocalEntity('users');

// Enhanced User entity with authentication
export const User = {
    async me() {
        const user = localDB.getCurrentUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }
        return user;
    },
    
    async list() {
        return localDB.getAll('users');
    },
    
    async login(username, password) {
        return localDB.login(username, password);
    },
    
    async logout() {
        return localDB.logout();
    },
    
    async create(userData) {
        // Validate username uniqueness
        if (localDB.isUsernameTaken(userData.username)) {
            throw new Error('Nome de usuário já está em uso');
        }
        
        // Validate email uniqueness
        if (localDB.isEmailTaken(userData.email)) {
            throw new Error('Email já está em uso');
        }
        
        return localDB.create('users', userData);
    },
    
    async update(id, data) {
        // Validate username uniqueness if changing
        if (data.username && localDB.isUsernameTaken(data.username, id)) {
            throw new Error('Nome de usuário já está em uso');
        }
        
        // Validate email uniqueness if changing
        if (data.email && localDB.isEmailTaken(data.email, id)) {
            throw new Error('Email já está em uso');
        }
        
        return localDB.update('users', id, data);
    },
    
    async updateMyUserData(data) {
        const currentUser = localDB.getCurrentUser();
        if (!currentUser) {
            throw new Error('Usuário não autenticado');
        }
        
        const updatedUser = await this.update(currentUser.id, data);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        return updatedUser;
    },
    
    isAuthenticated() {
        return localDB.getCurrentUser() !== null;
    }
};

// Mock integrations
export const UploadFile = async ({ file }) => {
    return await localDB.uploadFile(file);
};

export default localDB;