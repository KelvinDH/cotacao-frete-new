const express = require('express');
const router = express.Router();
const db = require('../database/database');

// GET /api/freight-maps
router.get('/', (req, res) => {
    const { status } = req.query;
    let query = 'SELECT * FROM freight_maps';
    const params = [];
    
    if (status) {
        query += ' WHERE status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY created_date DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Parse JSON fields
        const processedRows = rows.map(row => ({
            ...row,
            carrierProposals: row.carrierProposals ? JSON.parse(row.carrierProposals) : {},
            invoiceUrls: row.invoiceUrls ? JSON.parse(row.invoiceUrls) : []
        }));
        
        res.json(processedRows);
    });
});

// POST /api/freight-maps
router.post('/', (req, res) => {
    const {
        mapNumber, origin, destination, totalKm, weight, mapValue,
        truckType, loadingMode, loadingDate, routeInfo, mapImage
    } = req.body;
    
    const id = require('crypto').randomUUID();
    const now = new Date().toISOString();
    
    db.run(`
        INSERT INTO freight_maps (
            id, mapNumber, origin, destination, totalKm, weight, mapValue,
            truckType, loadingMode, loadingDate, routeInfo, mapImage,
            carrierProposals, invoiceUrls, created_date, updated_date, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        id, mapNumber, origin, destination, totalKm, weight, mapValue,
        truckType, loadingMode, loadingDate, routeInfo, mapImage,
        '{}', '[]', now, now, 'user'
    ], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.status(201).json({ id, message: 'Mapa de frete criado com sucesso' });
    });
});

// PUT /api/freight-maps/:id
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    
    // Processar campos JSON
    if (updateData.carrierProposals) {
        updateData.carrierProposals = JSON.stringify(updateData.carrierProposals);
    }
    if (updateData.invoiceUrls) {
        updateData.invoiceUrls = JSON.stringify(updateData.invoiceUrls);
    }
    
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(new Date().toISOString()); // updated_date
    values.push(id);
    
    db.run(`
        UPDATE freight_maps 
        SET ${fields}, updated_date = ?
        WHERE id = ?
    `, values, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Mapa de frete não encontrado' });
        }
        
        res.json({ message: 'Mapa de frete atualizado com sucesso' });
    });
});

module.exports = router;