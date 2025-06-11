import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

export const useCarriers = () => {
    const [carriers, setCarriers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadCarriers = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await apiService.getCarriers();
            setCarriers(data);
        } catch (err) {
            setError(err.message);
            console.error('Error loading carriers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCarriers();
    }, []);

    const createCarrier = async (data) => {
        try {
            const newCarrier = await apiService.createCarrier(data);
            setCarriers(prev => [newCarrier, ...prev]);
            return newCarrier;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const updateCarrier = async (id, data) => {
        try {
            const updatedCarrier = await apiService.updateCarrier(id, data);
            setCarriers(prev => 
                prev.map(carrier => carrier.id === id ? updatedCarrier : carrier)
            );
            return updatedCarrier;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const deleteCarrier = async (id) => {
        try {
            await apiService.deleteCarrier(id);
            setCarriers(prev => prev.filter(carrier => carrier.id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    return {
        carriers,
        loading,
        error,
        loadCarriers,
        createCarrier,
        updateCarrier,
        deleteCarrier
    };
};