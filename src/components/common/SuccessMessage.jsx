import React from 'react';
import { CheckCircle } from 'lucide-react';

const SuccessMessage = ({ message, className = '' }) => {
    if (!message) return null;

    return (
        <div className={`bg-green-50 border border-green-200 rounded-lg p-4 flex items-center ${className}`}>
            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
            <span className="text-green-700 text-sm">{message}</span>
        </div>
    );
};

export default SuccessMessage;