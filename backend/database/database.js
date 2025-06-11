const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

console.log('📂 Configurando banco de dados...');

const dbPath = path.join(__dirname, 'freight.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erro ao abrir banco:', err.message);
    } else {
        console.log('✅ Conectado ao banco SQLite');
    }
});

// Função para gerar ID
function generateId() {
    return crypto.randomUUID();
}

function insertAdminUser() {
    const bcrypt = require('bcryptjs');
    
    // Verificar se admin já existe
    db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
        if (err) {
            console.error('❌ Erro ao verificar admin:', err);
            return;
        }
        
        if (!row) {
            // Criar usuário admin
            const adminPassword = bcrypt.hashSync('admin123', 10);
            db.run(`
                INSERT INTO users (id, fullName, username, email, password, userType, active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                generateId(),
                'Administrador Sistema',
                'admin',
                'admin@unionagro.com',
                adminPassword,
                'admin',
                1
            ], (err) => {
                if (err) {
                    console.error('❌ Erro ao criar admin:', err);
                } else {
                    console.log('✅ Usuário admin criado');
                }
            });
        } else {
            console.log('✅ Usuário admin já existe');
        }
    });
}

function insertInitialCarriers() {
    // Verificar se já existem transportadoras
    db.get('SELECT COUNT(*) as count FROM carriers', (err, row) => {
        if (err) {
            console.error('❌ Erro ao verificar carriers:', err);
            return;
        }
        
        if (row.count === 0) {
            // Inserir transportadoras iniciais
            const carriers = [
                { name: 'Transportes ABC Ltda', type: 'paletizados', active: 1 },
                { name: 'Logística XYZ Express', type: 'bag', active: 1 },
                { name: 'Cargas Rápidas SA', type: 'paletizados', active: 1 },
                { name: 'Frete Total Express', type: 'bag', active: 1 }
            ];

            carriers.forEach(carrier => {
                db.run(
                    'INSERT INTO carriers (id, name, type, active) VALUES (?, ?, ?, ?)',
                    [generateId(), carrier.name, carrier.type, carrier.active],
                    function(err) {
                        if (err) {
                            console.error('❌ Erro ao inserir carrier:', err);
                        } else {
                            console.log(`✅ Transportadora criada: ${carrier.name}`);
                        }
                    }
                );
            });
        } else {
            console.log('✅ Transportadoras já existem');
        }
    });
}

function insertInitialTruckTypes() {
    // Verificar se já existem tipos de caminhão
    db.get('SELECT COUNT(*) as count FROM truck_types', (err, row) => {
        if (err) {
            console.error('❌ Erro ao verificar truck_types:', err);
            return;
        }
        
        if (row.count === 0) {
            // Inserir tipos de caminhão iniciais
            const truckTypes = [
                { name: 'Truck Paletizado Grande', capacity: 15.0, baseRate: 3.50, modality: 'paletizados' },
                { name: 'Truck BAG Médio', capacity: 12.0, baseRate: 3.20, modality: 'bag' },
                { name: 'Carreta Paletizada', capacity: 25.0, baseRate: 4.20, modality: 'paletizados' },
                { name: 'Truck BAG Pequeno', capacity: 8.0, baseRate: 2.80, modality: 'bag' }
            ];

            truckTypes.forEach(truck => {
                db.run(
                    'INSERT INTO truck_types (id, name, capacity, baseRate, modality) VALUES (?, ?, ?, ?, ?)',
                    [generateId(), truck.name, truck.capacity, truck.baseRate, truck.modality],
                    function(err) {
                        if (err) {
                            console.error('❌ Erro ao inserir truck type:', err);
                        } else {
                            console.log(`✅ Tipo de caminhão criado: ${truck.name}`);
                        }
                    }
                );
            });
        } else {
            console.log('✅ Tipos de caminhão já existem');
        }
    });
}

function addMissingColumns() {
    // Verificar se a coluna mapImage existe na tabela freight_maps
    db.all("PRAGMA table_info(freight_maps)", (err, columns) => {
        if (err) {
            console.error('❌ Erro ao verificar colunas de freight_maps:', err);
            return;
        }
        
        const hasMapImage = columns.some(col => col.name === 'mapImage');
        
        if (!hasMapImage) {
            // Adicionar coluna mapImage
            db.run("ALTER TABLE freight_maps ADD COLUMN mapImage TEXT", (err) => {
                if (err) {
                    console.error('❌ Erro ao adicionar coluna mapImage:', err);
                } else {
                    console.log('✅ Coluna mapImage adicionada à tabela freight_maps');
                }
            });
        } else {
            console.log('✅ Coluna mapImage já existe');
        }
    });
}

// Inicializar tabelas
db.serialize(() => {
    console.log('📋 Criando tabelas...');
    
    // Tabela de usuários
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            fullName TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            userType TEXT DEFAULT 'user',
            carrierName TEXT,
            active BOOLEAN DEFAULT 1,
            created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela users:', err);
        } else {
            console.log('✅ Tabela users OK');
            insertAdminUser();
        }
    });

    // Tabela de transportadoras
    db.run(`
        CREATE TABLE IF NOT EXISTS carriers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('paletizados', 'bag')),
            active BOOLEAN DEFAULT 1,
            created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela carriers:', err);
        } else {
            console.log('✅ Tabela carriers OK');
            insertInitialCarriers();
        }
    });

    // Tabela de tipos de caminhão
    db.run(`
        CREATE TABLE IF NOT EXISTS truck_types (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            capacity REAL NOT NULL,
            baseRate REAL NOT NULL,
            modality TEXT NOT NULL CHECK(modality IN ('paletizados', 'bag')),
            created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela truck_types:', err);
        } else {
            console.log('✅ Tabela truck_types OK');
            insertInitialTruckTypes();
        }
    });

    // Tabela de mapas de frete
    db.run(`
        CREATE TABLE IF NOT EXISTS freight_maps (
            id TEXT PRIMARY KEY,
            mapNumber TEXT NOT NULL,
            origin TEXT NOT NULL,
            destination TEXT NOT NULL,
            totalKm INTEGER NOT NULL,
            weight REAL NOT NULL,
            mapValue REAL NOT NULL,
            truckType TEXT NOT NULL,
            loadingMode TEXT,
            loadingDate TEXT NOT NULL,
            routeInfo TEXT,
            carrierProposals TEXT DEFAULT '{}',
            selectedCarrier TEXT,
            finalValue REAL,
            status TEXT DEFAULT 'negotiating',
            contractedAt TEXT,
            invoiceUrls TEXT DEFAULT '[]',
            mapImage TEXT,
            created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela freight_maps:', err);
        } else {
            console.log('✅ Tabela freight_maps OK');
        }
    });

    // Verificar e adicionar colunas faltantes em tabelas existentes
    addMissingColumns();
});

module.exports = db;