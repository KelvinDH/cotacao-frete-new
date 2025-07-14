const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors =require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

console.log('Variáveis de ambiente carregadas:');
console.log('- SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'EXISTE' : 'NÃO EXISTE');
console.log('- SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL || 'NÃO EXISTE');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:3001', 'http://localhost:5173', 'http://10.0.2.4:5173'],
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Conexão com o banco de dados SQLite
let db = null;

const initDatabase = () => {
    db = new sqlite3.Database('./freight_system.db', (err) => {
        if (err) {
            console.error('❌ Erro ao conectar com o banco de dados:', err.message);
        } else {
            console.log('✅ Conectado ao banco de dados SQLite');
            runCarrierMigration(() => {
                createTables();
            });
        }
    });
};

const runCarrierMigration = (callback) => {
    db.all("PRAGMA table_info(carriers)", (err, columns) => {
        if (err) {
            console.error("❌ Erro ao ler estrutura da tabela carriers:", err.message);
            if (callback) callback();
            return;
        }

        const hasTypeColumn = columns.some(col => col.name === 'type');
        const hasModalitiesColumn = columns.some(col => col.name === 'modalities');

        if (hasTypeColumn && !hasModalitiesColumn) {
            console.log("⚠️ Iniciando migração da tabela 'carriers'...");
            db.serialize(() => {
                db.run(`ALTER TABLE carriers ADD COLUMN modalities TEXT`, (err) => {
                    if (err) return console.error("❌ Erro ao adicionar coluna 'modalities':", err.message);
                    console.log("✅ Coluna 'modalities' adicionada.");
                });
                db.run(`UPDATE carriers SET modalities = '["' || type || '"]' WHERE type IS NOT NULL AND type != ''`, function(err) {
                    if (err) return console.error("❌ Erro ao migrar dados para 'modalities':", err.message);
                    console.log(`✅ ${this.changes} registros de transportadoras migrados para o novo formato.`);
                });
                db.run('ALTER TABLE carriers RENAME TO carriers_old');
                db.run(`
                    CREATE TABLE carriers (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        modalities TEXT NOT NULL,
                        active BOOLEAN DEFAULT 1,
                        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                db.run('INSERT INTO carriers (id, name, modalities, active, created_date, updated_date) SELECT id, name, modalities, active, created_date, updated_date FROM carriers_old');
                db.run('DROP TABLE carriers_old', (err) => {
                    if (err) console.error("❌ Erro ao limpar tabela antiga:", err.message);
                    else console.log("✅ Migração da tabela 'carriers' concluída!");
                    if (callback) callback();
                });
            });
        } else {
            console.log("✅ Tabela 'carriers' já está atualizada. Nenhuma migração necessária.");
            if (callback) callback();
        }
    });
};

const createTables = () => {
    // Tabela de usuários
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            userType TEXT DEFAULT 'user',
            carrierName TEXT,
            active BOOLEAN DEFAULT 1,
            requirePasswordChange BOOLEAN DEFAULT 0,
            created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ Erro ao criar tabela users:', err);
        else {
            console.log('✅ Tabela users criada/verificada');
            createDefaultAdmin();
        }
    });

    // Tabela de tipos de caminhão
    db.run(`
        CREATE TABLE IF NOT EXISTS truck_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            capacity REAL NOT NULL,
            baseRate REAL NOT NULL,
            modality TEXT NOT NULL,
            created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ Erro ao criar tabela truck_types:', err);
        else console.log('✅ Tabela truck_types criada/verificada');
    });

    
    // Tabela de transportadoras
    db.run(`
        CREATE TABLE IF NOT EXISTS carriers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            modalities TEXT NOT NULL,
            active BOOLEAN DEFAULT 1,
            created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ Erro ao criar tabela carriers:', err);
        else console.log('✅ Tabela carriers criada/verificada');
    });

    // ✅ CORREÇÃO: Definição da tabela freight_maps SEM a restrição UNIQUE no mapNumber
    db.run(`
        CREATE TABLE IF NOT EXISTS freight_maps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mapNumber TEXT NOT NULL,
            mapImage TEXT,
            origin TEXT NOT NULL,
            destination TEXT NOT NULL,
            totalKm INTEGER NOT NULL,
            weight REAL NOT NULL,
            mapValue REAL NOT NULL,
            truckType TEXT NOT NULL,
            selectedCarrier TEXT,
            loadingMode TEXT NOT NULL,
            loadingDate TEXT NOT NULL,
            routeInfo TEXT,
            carrierProposals TEXT DEFAULT '{}',
            finalValue REAL,
            status TEXT DEFAULT 'negotiating',
            contractedAt TEXT,
            invoiceUrls TEXT DEFAULT '[]',
            created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT,
            managers TEXT,
            userCounterProposal REAL,
            selectedCarrierForCounter TEXT,
            justification TEXT,
            rejectedReason TEXT,
            finalizationObservation TEXT,
            editObservations TEXT DEFAULT '[]'
        )
    `, (err) => {
        if (err) console.error('❌ Erro ao criar tabela freight_maps:', err);
        else {
            console.log('✅ Tabela freight_maps criada/verificada');
            // ✅ NOVO: Verificar e corrigir a tabela existente se ela tiver a constraint errada
            checkAndFixFreightMapsConstraint();
            runMigrations();
        }
    });
};

// ✅ NOVA FUNÇÃO: Verifica e corrige a constraint UNIQUE se ela existir na tabela antiga
const checkAndFixFreightMapsConstraint = () => {
    db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='freight_maps'", (err, row) => {
        if (err) {
            console.error('❌ Erro ao verificar estrutura da tabela freight_maps:', err);
            return;
        }
        
        // Verifica se a palavra UNIQUE está associada à coluna mapNumber
        if (row && row.sql.match(/mapNumber\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i)) {
            console.log('⚠️ Constraint UNIQUE problemática encontrada na coluna mapNumber. Recriando tabela...');
            
            db.serialize(() => {
                db.run('ALTER TABLE freight_maps RENAME TO freight_maps_old', (err) => {
                    if (err) return console.error("Erro ao renomear tabela para backup:", err);
                });
                
                // Recria a tabela com a estrutura correta (sem UNIQUE)
                db.run(`
                    CREATE TABLE freight_maps (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        mapNumber TEXT NOT NULL,
                        mapImage TEXT,
                        origin TEXT NOT NULL,
                        destination TEXT NOT NULL,
                        totalKm INTEGER NOT NULL,
                        weight REAL NOT NULL,
                        mapValue REAL NOT NULL,
                        truckType TEXT NOT NULL,
                        selectedCarrier TEXT,
                        loadingMode TEXT NOT NULL,
                        loadingDate TEXT NOT NULL,
                        routeInfo TEXT,
                        carrierProposals TEXT DEFAULT '{}',
                        finalValue REAL,
                        status TEXT DEFAULT 'negotiating',
                        contractedAt TEXT,
                        invoiceUrls TEXT DEFAULT '[]',
                        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                        created_by TEXT,
                        managers TEXT,
                        userCounterProposal REAL,
                        selectedCarrierForCounter TEXT,
                        justification TEXT,
                        rejectedReason TEXT,
                        finalizationObservation TEXT,
                        editObservations TEXT DEFAULT '[]'
                    )
                `, (err) => {
                    if (err) return console.error("Erro ao criar nova tabela freight_maps:", err);
                });
                
                db.run(`INSERT INTO freight_maps SELECT id, mapNumber, mapImage, origin, destination, totalKm, weight, mapValue, truckType, selectedCarrier, loadingMode, loadingDate, routeInfo, carrierProposals, finalValue, status, contractedAt, invoiceUrls, created_date, updated_date, created_by, managers, userCounterProposal, selectedCarrierForCounter, justification, rejectedReason, finalizationObservation, editObservations FROM freight_maps_old`, (err) => {
                    if (err) return console.error("Erro ao copiar dados da tabela antiga:", err);
                });
                
                db.run('DROP TABLE freight_maps_old', (err) => {
                    if (err) console.error('❌ Erro ao limpar tabela antiga:', err);
                    else console.log('✅ Constraint UNIQUE removida com sucesso da tabela freight_maps!');
                });
            });
        } else {
            console.log('✅ Tabela freight_maps não possui constraint UNIQUE problemática.');
        }
    });
};

const runMigrations = () => {
    db.all("PRAGMA table_info(freight_maps)", (err, columns) => {
        if (err) return console.error("❌ Erro ao ler estrutura da tabela freight_maps:", err.message);
        
        const runAlter = (colName, colType) => {
            if (!columns.some(col => col.name === colName)) {
                console.log(`⚠️ Coluna '${colName}' não encontrada. Adicionando...`);
                db.run(`ALTER TABLE freight_maps ADD COLUMN ${colName} ${colType}`, (err) => {
                    if (err) console.error(`❌ Erro ao adicionar a coluna ${colName}:`, err.message);
                    else console.log(`✅ Coluna '${colName}' adicionada com sucesso!`);
                });
            }
        };

        runAlter('managers', 'TEXT');
        runAlter('userCounterProposal', 'REAL');
        runAlter('selectedCarrierForCounter', 'TEXT');
        runAlter('justification', 'TEXT');
        runAlter('rejectedReason', 'TEXT');
        runAlter('finalizationObservation', 'TEXT');
        runAlter('editObservations', "TEXT DEFAULT '[]'");
    });
};

const createDefaultAdmin = async () => {
    try {
        db.get('SELECT * FROM users WHERE username = ?', ['admin'], async (err, row) => {
            if (err) return console.error('❌ Erro ao verificar admin:', err);
            if (!row) {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                db.run(`INSERT INTO users (fullName, username, email, password, userType, active) VALUES (?, ?, ?, ?, ?, ?)`, 
                    ['Administrador do Sistema', 'admin', 'admin@unionagro.com', hashedPassword, 'admin', 1], 
                    (err) => {
                        if (err) console.error('❌ Erro ao criar admin padrão:', err);
                        else console.log('✅ Usuário administrador padrão criado (admin/admin123)');
                    }
                );
            }
        });
    } catch (error) {
        console.error('❌ Erro ao criar admin padrão:', error);
    }
};

// --- ROTAS DA API ---

// Rota de autenticação
app.post('/api/login', async (req, res) => {
    console.log('📡 Tentativa de login:', req.body.username);
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username e password são obrigatórios' });
    try {
        db.get(`SELECT * FROM users WHERE (username = ? OR email = ?) AND active = 1`, [username, username], async (err, user) => {
            if (err) {
                console.error('❌ Erro ao buscar usuário:', err);
                return res.status(500).json({ error: 'Erro interno do servidor' });
            }
            if (!user) return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
            try {
                const isValidPassword = await bcrypt.compare(password, user.password);
                if (!isValidPassword) return res.status(401).json({ error: 'Senha incorreta' });
                const { password: _, ...userWithoutPassword } = user;
                console.log('✅ Login bem-sucedido para:', user.username);
                res.json(userWithoutPassword);
            } catch (bcryptError) {
                console.error('❌ Erro ao verificar senha:', bcryptError);
                res.status(500).json({ error: 'Erro na verificação de senha' });
            }
        });
    } catch (error) {
        console.error('❌ Erro geral no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rotas CRUD para Users
app.get('/api/users', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    db.all('SELECT id, fullName, username, email, userType, carrierName, active, created_date, requirePasswordChange FROM users ORDER BY created_date DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/users', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    const { fullName, username, email, password, userType, carrierName, active, requirePasswordChange } = req.body;

    if (!fullName || !username || !email || !password || !userType) {
        return res.status(400).json({ error: 'Por favor, preencha todos os campos obrigatórios.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO users (fullName, username, email, password, userType, carrierName, active, requirePasswordChange) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [fullName, username, email, hashedPassword, userType, carrierName || null, active !== false, requirePasswordChange === true], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    if (err.message.includes('users.email')) return res.status(400).json({ error: 'Este email já está cadastrado no sistema.' });
                    if (err.message.includes('users.username')) return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
                }
                console.error('Erro ao criar usuário:', err);
                return res.status(500).json({ error: 'Ocorreu um erro interno ao criar o usuário.' });
            }
            res.status(201).json({ id: this.lastID, message: 'Usuário criado com sucesso!' });
        });
    } catch (error) {
        console.error('Erro ao processar senha:', error);
        res.status(500).json({ error: 'Erro ao processar senha' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    const { id } = req.params;
    const updates = req.body;

    delete updates.id;
    delete updates.created_date;

    try {
        if (updates.password) {
            if (updates.password.length < 6) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
            updates.password = await bcrypt.hash(updates.password, 10);
        }

        const fields = Object.keys(updates);
        if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar foi fornecido.' });
        
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(field => updates[field]);

        const sql = `UPDATE users SET ${setClause}, updated_date = CURRENT_TIMESTAMP WHERE id = ?`;
        
        db.run(sql, [...values, id], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    if (err.message.includes('users.email')) return res.status(400).json({ error: 'Este email já está sendo usado por outro usuário.' });
                    if (err.message.includes('users.username')) return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
                }
                console.error('Erro ao atualizar usuário:', err);
                return res.status(500).json({ error: 'Ocorreu um erro interno ao atualizar o usuário.' });
            }
            if (this.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
            res.json({ message: 'Usuário atualizado com sucesso!' });
        });
    } catch (error) {
        console.error('Erro ao processar atualização do usuário:', error);
        res.status(500).json({ error: 'Ocorreu um erro de segurança interno.' });
    }
});

app.delete('/api/users/:id', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json({ message: 'Usuário deletado com sucesso' });
    });
});

// Rotas CRUD para Truck Types
app.get('/api/truck-types', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    db.all('SELECT * FROM truck_types ORDER BY created_date DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/truck-types', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    const { name, capacity, baseRate, modality } = req.body;
    db.run(`INSERT INTO truck_types (name, capacity, baseRate, modality) VALUES (?, ?, ?, ?)`, [name, capacity, baseRate, modality], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Tipo de caminhão criado com sucesso' });
    });
});

app.put('/api/truck-types/:id', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    const { id } = req.params;
    const updates = req.body;
    const fields = Object.keys(updates);
    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    db.run(`UPDATE truck_types SET ${setClause}, updated_date = CURRENT_TIMESTAMP WHERE id = ?`, [...Object.values(updates), id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Tipo de caminhão não encontrado' });
        res.json({ message: 'Tipo de caminhão atualizado com sucesso' });
    });
});

app.delete('/api/truck-types/:id', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    db.run('DELETE FROM truck_types WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Tipo de caminhão não encontrado' });
        res.json({ message: 'Tipo de caminhão deletado com sucesso' });
    });
});

// Rotas CRUD para Carriers
app.get('/api/carriers', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    db.all('SELECT * FROM carriers ORDER BY name ASC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const results = rows.map(row => ({ ...row, modalities: JSON.parse(row.modalities || '[]') }));
        res.json(results);
    });
});

app.post('/api/carriers', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    const { name, modalities, active } = req.body;
    if (!name || !modalities || modalities.length === 0) return res.status(400).json({ error: 'Nome e pelo menos uma modalidade são obrigatórios' });
    const modalitiesJSON = JSON.stringify(modalities);
    db.run(`INSERT INTO carriers (name, modalities, active) VALUES (?, ?, ?)`, [name, modalitiesJSON, active], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, name, modalities, active });
    });
});

app.put('/api/carriers/:id', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    const { id } = req.params;
    const { name, modalities, active } = req.body;
    if (!name || !modalities || modalities.length === 0) return res.status(400).json({ error: 'Nome e pelo menos uma modalidade são obrigatórios' });
    const modalitiesJSON = JSON.stringify(modalities);
    const sql = `UPDATE carriers SET name = ?, modalities = ?, active = ?, updated_date = CURRENT_TIMESTAMP WHERE id = ?`;
    db.run(sql, [name, modalitiesJSON, active, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Transportadora não encontrada' });
        res.json({ id: Number(id), name, modalities, active });
    });
});

app.delete('/api/carriers/:id', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    db.run('DELETE FROM carriers WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Transportadora não encontrada' });
        res.json({ message: 'Transportadora deletada com sucesso' });
    });
});

// Rotas CRUD para Freight Maps
app.get('/api/freight-maps', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    let query = 'SELECT * FROM freight_maps';
    const params = [];
    const whereClauses = [];
    if (req.query.status) {
        whereClauses.push('status = ?');
        params.push(req.query.status);
    }
    if (req.query.selectedCarrier) {
        whereClauses.push('selectedCarrier = ?');
        params.push(req.query.selectedCarrier);
    }
    if (req.query.loadingMode) {
        const modes = req.query.loadingMode.split(',');
        const placeholders = modes.map(() => '?').join(',');
        whereClauses.push(`loadingMode IN (${placeholders})`);
        params.push(...modes);
    }
    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }
    query += ' ORDER BY created_date DESC';
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        rows.forEach(row => {
            row.managers = JSON.parse(row.managers || '[]');
            row.carrierProposals = JSON.parse(row.carrierProposals || '{}');
            row.invoiceUrls = JSON.parse(row.invoiceUrls || '[]');
            row.editObservations = JSON.parse(row.editObservations || '[]');
        });
        res.json(rows);
    });
});

// ✅ CORREÇÃO: Removida a verificação de mapa existente para permitir múltiplas inserções
app.post('/api/freight-maps', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    const data = req.body;

    console.log(`📦 Criando freight map: ${data.mapNumber} para ${data.selectedCarrier}`);
    
    db.run(`
        INSERT INTO freight_maps (
            mapNumber, mapImage, origin, destination, totalKm, weight, mapValue, 
            truckType, selectedCarrier, loadingMode, loadingDate, routeInfo, 
            managers, carrierProposals, status, created_by, editObservations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        data.mapNumber, data.mapImage || '', data.origin, data.destination,
        data.totalKm, data.weight, data.mapValue, data.truckType,
        data.selectedCarrier, data.loadingMode, data.loadingDate,
        data.routeInfo || '', JSON.stringify(data.managers || []), 
        JSON.stringify(data.carrierProposals || {}), data.status || 'negotiating', 
        data.created_by || 'system', JSON.stringify(data.editObservations || [])
    ], function(err) {
        if (err) {
            console.error('❌ Erro ao criar freight map:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`✅ Freight map criado com sucesso: ${data.mapNumber} para ${data.selectedCarrier} (ID: ${this.lastID})`);
        res.json({ id: this.lastID, message: 'Freight map criado com sucesso' });
    });
});

app.put('/api/freight-maps/:id', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    const { id } = req.params;
    const updates = req.body;
    
    if (updates.managers) updates.managers = JSON.stringify(updates.managers);
    if (updates.carrierProposals) updates.carrierProposals = JSON.stringify(updates.carrierProposals);
    if (updates.invoiceUrls) updates.invoiceUrls = JSON.stringify(updates.invoiceUrls);
    if (updates.editObservations) {
        if (!Array.isArray(JSON.parse(JSON.stringify(updates.editObservations)))) {
            return res.status(400).json({ error: 'editObservations deve ser um array.' });
        }
        updates.editObservations = JSON.stringify(updates.editObservations);
    }

    const fields = Object.keys(updates);
    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    db.run(`UPDATE freight_maps SET ${setClause}, updated_date = CURRENT_TIMESTAMP WHERE id = ?`, [...Object.values(updates), id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Freight map não encontrado' });
        
        db.get('SELECT * FROM freight_maps WHERE id = ?', [id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (row) {
                row.managers = JSON.parse(row.managers || '[]');
                row.carrierProposals = JSON.parse(row.carrierProposals || '{}');
                row.invoiceUrls = JSON.parse(row.invoiceUrls || '[]');
                row.editObservations = JSON.parse(row.editObservations || '[]');
            }
            res.json(row);
        });
    });
});

app.delete('/api/freight-maps/:id', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
    db.run('DELETE FROM freight_maps WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Freight map não encontrado' });
        res.json({ message: 'Freight map deletado com sucesso' });
    });
});

// Rota de envio de email
 app.post('/api/send-email', async (req, res) => {
   try {
     const { to, subject, html } = req.body;
     console.log('=== INÍCIO DEBUG EMAIL ===');
     console.log('SENDGRID_API_KEY existe?', !!process.env.SENDGRID_API_KEY);
     console.log('SENDGRID_API_KEY começa com SG.?', process.env.SENDGRID_API_KEY?.startsWith('SG.'));
     console.log('FROM EMAIL:', process.env.SENDGRID_FROM_EMAIL);
     console.log('TO EMAIL:', to);
     console.log('SUBJECT:', subject);
     console.log('=== FIM DEBUG EMAIL ===');
     if (!to || !subject || !html) return res.status(400).json({ error: 'Campos obrigatórios: to, subject, html' });
     const msg = { to, from: process.env.SENDGRID_FROM_EMAIL, subject, html };
     console.log('Mensagem a ser enviada:', JSON.stringify(msg, null, 2));
     const response = await sgMail.send(msg);
     console.log('✅ SUCESSO! Resposta do SendGrid:', response[0].statusCode);
     res.json({ success: true, message: 'Email enviado com sucesso' });
   } catch (error) {
     console.error('❌ ERRO DETALHADO:');
     console.error('- Message:', error.message);
     console.error('- Code:', error.code);
     console.error('- Response Status:', error.response?.status);
     console.error('- Response Body:', JSON.stringify(error.response?.body, null, 2));
     const errorMessage = error.response?.body?.errors?.[0]?.message || error.message || 'Erro desconhecido';
     res.status(500).json({ error: 'Falha ao enviar o email', details: errorMessage, sendgridError: error.response?.body });
   }
 });

// Rota para upload de arquivos
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const SERVER_IP = process.env.SERVER_IP || 'localhost'; 
    
    const fileUrl = `http://${SERVER_IP}:${PORT}/uploads/${req.file.filename}`;
    
    console.log(`✅ Arquivo enviado. URL gerada: ${fileUrl}`);
    res.json({ file_url: fileUrl });
});

// Inicializar banco de dados e servidor
initDatabase();

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📁 Uploads disponíveis em http://localhost:${PORT}/uploads/`);
});

// Fechar conexão graciosamente
process.on('SIGINT', () => {
    console.log('\n🔄 Fechando conexão com o banco de dados...');
    if (db) {
        db.close((err) => {
            if (err) console.error('❌ Erro ao fechar banco:', err.message);
            else console.log('✅ Conexão com banco fechada.');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});