import React from 'react';
import { Badge } from '@/components/ui/badge';
import { FREIGHT_STATUS, LOADING_MODES, USER_TYPES } from '@/utils/constants';

const StatusBadge = ({ type, value, className = '' }) => {
    let config = {};

    switch (type) {
        case 'freight_status':
            config = FREIGHT_STATUS[value] || { label: value, color: 'bg-gray-100 text-gray-800' };
            break;
        case 'loading_mode':
            config = LOADING_MODES[value] || { label: value, color: 'bg-gray-100 text-gray-800' };
            break;
        case 'user_type':
            config = USER_TYPES[value] || { label: value, color: 'bg-gray-100 text-gray-800' };
            break;
        default:
            config = { label: value, color: 'bg-gray-100 text-gray-800' };
    }

    return (
        <Badge className={`${config.color} ${className}`}>
            {config.label}
        </Badge>
    );
};

export default StatusBadge;