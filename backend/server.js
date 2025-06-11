const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Iniciando servidor UnionAgro...');

// Criar pasta uploads se não existir
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Pasta uploads criada');
}

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://10.0.2.4:5173'],
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Inicializar banco de dados
let db;
try {
    db = require('./database/database');
    console.log('✅ Banco de dados conectado');
} catch (error) {
    console.error('❌ Erro ao conectar banco:', error.message);
}

// ========== ROTAS PRINCIPAIS ==========

// Rota principal
app.get('/', (req, res) => {
    console.log('📡 Requisição recebida na rota /');
    res.json({ 
        message: '🚛 UnionAgro API está funcionando!',
        timestamp: new Date().toISOString(),
        port: PORT,
        database: db ? 'conectado' : 'desconectado'
    });
});

// Rota de status
app.get('/api/status', (req, res) => {
    console.log('📡 Verificando status da API');
    res.json({ 
        status: 'online',
        database: db ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Rota de teste
app.get('/api/test', (req, res) => {
    console.log('🧪 Rota de teste acessada');
    res.json({ 
        test: 'OK',
        message: 'API funcionando perfeitamente!',
        timestamp: new Date().toISOString()
    });
});

// ========== ROTAS FREIGHT MAPS ==========

// Substitua sua rota GET /api/freight-maps existente por esta:
app.get('/api/freight-maps', (req, res) => {
    console.log('📡 Buscando freight maps com filtros:', req.query);
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }

    let query = 'SELECT * FROM freight_maps';
    const params = [];
    const whereClauses = [];

    // Filtro por status
    if (req.query.status) {
        whereClauses.push('status = ?');
        params.push(req.query.status);
    }

    // Adicione mais filtros aqui se precisar no futuro, por exemplo:
    // if (req.query.selectedCarrier) {
    //     whereClauses.push('selectedCarrier = ?');
    //     params.push(req.query.selectedCarrier);
    // }

    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }
    
    // Adicionar ordenação padrão
    query += ' ORDER BY created_date DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar freight maps:', err);
            return res.status(500).json({ error: err.message });
        }
        
        // Deserializar campos JSON antes de enviar
        rows.forEach(row => {
            row.carrierProposals = JSON.parse(row.carrierProposals || '{}');
            row.invoiceUrls = JSON.parse(row.invoiceUrls || '[]');
        });
        
        res.json(rows);
    });
});

// Criar novo freight map
app.post('/api/freight-maps', (req, res) => {
    console.log('📡 Criando novo freight map');
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    const data = req.body;
    const id = crypto.randomUUID();
    
    db.run(`
        INSERT INTO freight_maps (
            id, mapNumber, mapImage, origin, destination, totalKm, weight, mapValue, 
            truckType, loadingMode, loadingDate, routeInfo, carrierProposals, 
            status, invoiceUrls, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        id, data.mapNumber, data.mapImage || '', data.origin, data.destination, 
        data.totalKm, data.weight, data.mapValue, data.truckType, data.loadingMode, 
        data.loadingDate, data.routeInfo || '', 
        JSON.stringify(data.carrierProposals || {}), 
        data.status || 'negotiating', 
        JSON.stringify(data.invoiceUrls || []), 
        data.created_by || 'api'
    ], function(err) {
        if (err) {
            console.error('❌ Erro ao criar freight map:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('✅ Freight map criado com ID:', id);
        
        // Retornar o objeto criado
        const createdMap = {
            id,
            ...data,
            carrierProposals: data.carrierProposals || {},
            invoiceUrls: data.invoiceUrls || [],
            created_date: new Date().toISOString(),
            updated_date: new Date().toISOString()
        };
        
        res.status(201).json(createdMap);
    });
});

app.put('/api/freight-maps/:id', (req, res) => {
    console.log('📡 Atualizando freight map:', req.params.id);
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    // Serializar campos JSON antes de processar
    if (updates.carrierProposals) {
        updates.carrierProposals = JSON.stringify(updates.carrierProposals);
    }
    if (updates.invoiceUrls) {
        updates.invoiceUrls = JSON.stringify(updates.invoiceUrls);
    }
    
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    if (fields.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    // Query de atualização dinâmica
    const query = `UPDATE freight_maps SET ${setClause}, updated_date = CURRENT_TIMESTAMP WHERE id = ?`;
    
    db.run(query, [...values, id], function(err) {
        if (err) {
            console.error('❌ Erro ao atualizar freight map:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Freight map não encontrado' });
        }
        
        console.log(`✅ Freight map ${id} atualizado. Linhas afetadas: ${this.changes}`);
        
        // Retornar o registro atualizado do banco
        db.get('SELECT * FROM freight_maps WHERE id = ?', [id], (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            // Deserializar campos JSON antes de enviar de volta
            if (row) {
                row.carrierProposals = JSON.parse(row.carrierProposals || '{}');
                row.invoiceUrls = JSON.parse(row.invoiceUrls || '[]');
            }
            res.json(row);
        });
    });
});

// Deletar freight map
app.delete('/api/freight-maps/:id', (req, res) => {
    console.log('📡 Deletando freight map:', req.params.id);
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    const { id } = req.params;
    
    db.run('DELETE FROM freight_maps WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('❌ Erro ao deletar freight map:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Freight map não encontrado' });
        }
        
        console.log('✅ Freight map deletado');
        res.json({ message: 'Freight map deletado com sucesso' });
    });
});

// ========== ROTAS USERS ==========

// Listar usuários
app.get('/api/users', (req, res) => {
    console.log('📡 Buscando usuários');
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    db.all('SELECT id, fullName, username, email, userType, carrierName, active, created_date FROM users', (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar usuários:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`✅ Retornando ${rows.length} usuários`);
        res.json(rows);
    });
});

// Criar usuário
app.post('/api/users', (req, res) => {
    console.log('📡 Criando novo usuário');
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    const data = req.body;
    const id = crypto.randomUUID();
    const bcrypt = require('bcryptjs');
    
    if (!data.password) {
        return res.status(400).json({ error: 'Senha é obrigatória' });
    }
    
    const hashedPassword = bcrypt.hashSync(data.password, 10);
    
    db.run(`
        INSERT INTO users (id, fullName, username, email, password, userType, carrierName, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        id, data.fullName, data.username, data.email, hashedPassword, 
        data.userType || 'user', data.carrierName || null, 
        data.active !== undefined ? data.active : true
    ], function(err) {
        if (err) {
            console.error('❌ Erro ao criar usuário:', err);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Nome de usuário ou email já está em uso' });
            }
            return res.status(500).json({ error: err.message });
        }
        console.log('✅ Usuário criado com ID:', id);
        
        // Retornar sem a senha
        const createdUser = {
            id,
            fullName: data.fullName,
            username: data.username,
            email: data.email,
            userType: data.userType || 'user',
            carrierName: data.carrierName || null,
            active: data.active !== undefined ? data.active : true,
            created_date: new Date().toISOString()
        };
        
        res.status(201).json(createdUser);
    });
});

// Atualizar usuário
app.put('/api/users/:id', (req, res) => {
    console.log('📡 Atualizando usuário:', req.params.id);
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    const { id } = req.params;
    const data = req.body;
    const bcrypt = require('bcryptjs');
    
    let updateQuery = `
        UPDATE users SET 
            fullName = ?, username = ?, email = ?, userType = ?, 
            carrierName = ?, active = ?, updated_date = CURRENT_TIMESTAMP
    `;
    let params = [
        data.fullName, data.username, data.email, data.userType,
        data.carrierName, data.active
    ];
    
    // Se senha foi fornecida, incluir na atualização
    if (data.password) {
        updateQuery += ', password = ?';
        params.push(bcrypt.hashSync(data.password, 10));
    }
    
    updateQuery += ' WHERE id = ?';
    params.push(id);
    
    db.run(updateQuery, params, function(err) {
        if (err) {
            console.error('❌ Erro ao atualizar usuário:', err);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Nome de usuário ou email já está em uso' });
            }
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        console.log('✅ Usuário atualizado');
        
        // Retornar dados atualizados sem senha
        const updatedUser = {
            id,
            fullName: data.fullName,
            username: data.username,
            email: data.email,
            userType: data.userType,
            carrierName: data.carrierName,
            active: data.active
        };
        
        res.json(updatedUser);
    });
});

// Deletar usuário
app.delete('/api/users/:id', (req, res) => {
    console.log('📡 Deletando usuário:', req.params.id);
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    const { id } = req.params;
    
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('❌ Erro ao deletar usuário:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        console.log('✅ Usuário deletado');
        res.json({ message: 'Usuário deletado com sucesso' });
    });
});

// ========== ROTAS TRUCK TYPES ==========

app.get('/api/truck-types', (req, res) => {
    console.log('📡 Buscando tipos de caminhão');
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    db.all('SELECT * FROM truck_types ORDER BY name', (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar truck types:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`✅ Retornando ${rows.length} tipos de caminhão`);
        res.json(rows);
    });
});

app.post('/api/truck-types', (req, res) => {
    console.log('📡 Criando tipo de caminhão');
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    const data = req.body;
    const id = crypto.randomUUID();
    
    db.run(`
        INSERT INTO truck_types (id, name, capacity, baseRate, modality)
        VALUES (?, ?, ?, ?, ?)
    `, [id, data.name, data.capacity, data.baseRate, data.modality], function(err) {
        if (err) {
            console.error('❌ Erro ao criar truck type:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('✅ Truck type criado com ID:', id);
        res.status(201).json({ id, ...data });
    });
});

// ========== ROTAS CARRIERS ==========

app.get('/api/carriers', (req, res) => {
    console.log('📡 Buscando transportadoras');
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    db.all('SELECT * FROM carriers ORDER BY name', (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar carriers:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`✅ Retornando ${rows.length} transportadoras`);
        res.json(rows);
    });
});

app.post('/api/carriers', (req, res) => {
    console.log('📡 Criando transportadora');
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    const data = req.body;
    const id = crypto.randomUUID();
    
    db.run(`
        INSERT INTO carriers (id, name, type, active)
        VALUES (?, ?, ?, ?)
    `, [id, data.name, data.type, data.active !== undefined ? data.active : true], function(err) {
        if (err) {
            console.error('❌ Erro ao criar carrier:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('✅ Carrier criado com ID:', id);
        res.status(201).json({ id, ...data });
    });
});

// ========== ROTAS TRUCK TYPES ==========

// Listar tipos de caminhão
app.get('/api/truck-types', (req, res) => {
    console.log('📡 Buscando tipos de caminhão');
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    db.all('SELECT * FROM truck_types ORDER BY name', (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar tipos de caminhão:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`✅ Retornando ${rows.length} tipos de caminhão`);
        res.json(rows);
    });
});

// Criar tipo de caminhão
app.post('/api/truck-types', (req, res) => {
    console.log('📡 Criando tipo de caminhão');
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    const data = req.body;
    const id = crypto.randomUUID();
    
    db.run(`
        INSERT INTO truck_types (id, name, capacity, baseRate, modality)
        VALUES (?, ?, ?, ?, ?)
    `, [id, data.name, data.capacity, data.baseRate, data.modality], function(err) {
        if (err) {
            console.error('❌ Erro ao criar tipo de caminhão:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('✅ Tipo de caminhão criado com ID:', id);
        res.status(201).json({ id, ...data });
    });
});

// Atualizar tipo de caminhão
app.put('/api/truck-types/:id', (req, res) => {
    console.log('📡 Atualizando tipo de caminhão:', req.params.id);
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    const { id } = req.params;
    const data = req.body;
    
    db.run(`
        UPDATE truck_types SET 
            name = ?, capacity = ?, baseRate = ?, modality = ?, updated_date = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [data.name, data.capacity, data.baseRate, data.modality, id], function(err) {
        if (err) {
            console.error('❌ Erro ao atualizar tipo de caminhão:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('✅ Tipo de caminhão atualizado');
        res.json({ id, ...data });
    });
});

// Deletar tipo de caminhão
app.delete('/api/truck-types/:id', (req, res) => {
    console.log('📡 Deletando tipo de caminhão:', req.params.id);
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    const { id } = req.params;
    
    db.run('DELETE FROM truck_types WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('❌ Erro ao deletar tipo de caminhão:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('✅ Tipo de caminhão deletado');
        res.json({ success: true });
    });
});

// ========== ROTAS CARRIERS ==========

// Listar transportadoras
app.get('/api/carriers', (req, res) => {
    console.log('📡 Buscando transportadoras');
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    db.all('SELECT * FROM carriers ORDER BY name', (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar transportadoras:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`✅ Retornando ${rows.length} transportadoras`);
        res.json(rows);
    });
});

// Criar transportadora
app.post('/api/carriers', (req, res) => {
    console.log('📡 Criando transportadora');
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    const data = req.body;
    const id = crypto.randomUUID();
    
    db.run(`
        INSERT INTO carriers (id, name, type, active)
        VALUES (?, ?, ?, ?)
    `, [id, data.name, data.type, data.active], function(err) {
        if (err) {
            console.error('❌ Erro ao criar transportadora:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('✅ Transportadora criada com ID:', id);
        res.status(201).json({ id, ...data });
    });
});

// Atualizar transportadora
app.put('/api/carriers/:id', (req, res) => {
    console.log('📡 Atualizando transportadora:', req.params.id);
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    const { id } = req.params;
    const data = req.body;
    
    db.run(`
        UPDATE carriers SET 
            name = ?, type = ?, active = ?, updated_date = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [data.name, data.type, data.active, id], function(err) {
        if (err) {
            console.error('❌ Erro ao atualizar transportadora:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('✅ Transportadora atualizada');
        res.json({ id, ...data });
    });
});

// Deletar transportadora
app.delete('/api/carriers/:id', (req, res) => {
    console.log('📡 Deletando transportadora:', req.params.id);
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    
    const { id } = req.params;
    
    db.run('DELETE FROM carriers WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('❌ Erro ao deletar transportadora:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('✅ Transportadora deletada');
        res.json({ success: true });
    });
});

// ========== UPLOAD DE ARQUIVOS ==========

const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        // Aceitar imagens e PDFs
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens e PDFs são permitidos'));
        }
    }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    console.log('📡 Upload de arquivo');
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    console.log('✅ Arquivo uploaded:', fileUrl);
    res.json({ 
        file_url: fileUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size
    });
});

// ========== MIDDLEWARE DE ERRO ==========

// Middleware de erro para upload
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. Máximo 10MB.' });
        }
    }
    
    if (err.message === 'Apenas imagens e PDFs são permitidos') {
        return res.status(400).json({ error: err.message });
    }
    
    console.error('❌ Erro no servidor:', err.stack);
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: err.message 
    });
});

// ========== INICIALIZAÇÃO DO SERVIDOR ==========

// Iniciar servidor
app.listen(PORT, (err) => {
    if (err) {
        console.error('❌ Erro ao iniciar servidor:', err);
        return;
    }
    
    console.log('🚀 ========================================');
    console.log(`🚛 UnionAgro API rodando na porta ${PORT}`);
    console.log(`📡 URL Principal: http://localhost:${PORT}`);
    console.log(`🧪 Status: http://localhost:${PORT}/api/status`);
    console.log(`🧪 Teste: http://localhost:${PORT}/api/test`);
    console.log(`📊 Freight Maps: http://localhost:${PORT}/api/freight-maps`);
    console.log(`👥 Usuários: http://localhost:${PORT}/api/users`);
    console.log('========================================');
});

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
    console.error('❌ Erro não capturado:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada não tratada:', reason);
});

module.exports = app;