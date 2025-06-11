import React from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorMessage = ({ message, className = '' }) => {
    if (!message) return null;

    return (
        <div className={`bg-red-50 border border-red-200 rounded-lg p-4 flex items-center ${className}`}>
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-red-700 text-sm">{message}</span>
        </div>
    );
};

export default ErrorMessage;