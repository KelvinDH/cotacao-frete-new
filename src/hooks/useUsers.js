import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

export const useUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await apiService.getUsers();
            setUsers(data);
        } catch (err) {
            setError(err.message);
            console.error('Error loading users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const createUser = async (data) => {
        try {
            const newUser = await apiService.createUser(data);
            setUsers(prev => [newUser, ...prev]);
            return newUser;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const updateUser = async (id, data) => {
        try {
            const updatedUser = await apiService.updateUser(id, data);
            setUsers(prev => 
                prev.map(user => user.id === id ? updatedUser : user)
            );
            return updatedUser;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const deleteUser = async (id) => {
        try {
            await apiService.deleteUser(id);
            setUsers(prev => prev.filter(user => user.id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    return {
        users,
        loading,
        error,
        loadUsers,
        createUser,
        updateUser,
        deleteUser
    };
};