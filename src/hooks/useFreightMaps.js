import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

export const useFreightMaps = (filters = {}) => {
    const [freightMaps, setFreightMaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadFreightMaps = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await apiService.getFreightMaps(filters);
            setFreightMaps(data);
        } catch (err) {
            setError(err.message);
            console.error('Error loading freight maps:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFreightMaps();
    }, [JSON.stringify(filters)]);

    const createFreightMap = async (data) => {
        try {
            const newMap = await apiService.createFreightMap(data);
            setFreightMaps(prev => [newMap, ...prev]);
            return newMap;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const updateFreightMap = async (id, data) => {
        try {
            const updatedMap = await apiService.updateFreightMap(id, data);
            setFreightMaps(prev => 
                prev.map(map => map.id === id ? updatedMap : map)
            );
            return updatedMap;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const deleteFreightMap = async (id) => {
        try {
            await apiService.deleteFreightMap(id);
            setFreightMaps(prev => prev.filter(map => map.id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    return {
        freightMaps,
        loading,
        error,
        loadFreightMaps,
        createFreightMap,
        updateFreightMap,
        deleteFreightMap
    };
};