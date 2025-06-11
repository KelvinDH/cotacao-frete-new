import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

export const useTruckTypes = () => {
    const [truckTypes, setTruckTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadTruckTypes = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await apiService.getTruckTypes();
            setTruckTypes(data);
        } catch (err) {
            setError(err.message);
            console.error('Error loading truck types:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTruckTypes();
    }, []);

    const createTruckType = async (data) => {
        try {
            const newTruckType = await apiService.createTruckType(data);
            setTruckTypes(prev => [newTruckType, ...prev]);
            return newTruckType;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const updateTruckType = async (id, data) => {
        try {
            const updatedTruckType = await apiService.updateTruckType(id, data);
            setTruckTypes(prev => 
                prev.map(truck => truck.id === id ? updatedTruckType : truck)
            );
            return updatedTruckType;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const deleteTruckType = async (id) => {
        try {
            await apiService.deleteTruckType(id);
            setTruckTypes(prev => prev.filter(truck => truck.id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    return {
        truckTypes,
        loading,
        error,
        loadTruckTypes,
        createTruckType,
        updateTruckType,
        deleteTruckType
    };
};