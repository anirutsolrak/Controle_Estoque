import React from 'react';
import PieChart from './PieChart.jsx'; // Certifique-se que PieChart está importado se for usado

export default function MetricCard({ title, value, color, size = 'small', pieData = null }) {
    try {
        const cardClass = size === 'large' 
            ? 'metric-card metric-card-large' 
            : 'metric-card';

        const cardStyle = {
            backgroundColor: color || 'white', 
        };

        const textColorClass = color ? 'text-white' : 'text-gray-800'; 
        const labelColorClass = color ? 'text-gray-200' : 'text-gray-600'; 

        return (
            <div 
                className={cardClass} 
                style={cardStyle}
                data-name="metric-card" 
                data-file="components/MetricCard.js"
            >
                {pieData && (
                    <div className="mb-4">
                        <PieChart data={pieData} size={60} />
                    </div>
                )}
                <div className={`metric-number ${textColorClass}`}>{value}</div> 
                <div className={`metric-label ${labelColorClass}`}>{title}</div> 
            </div>
        );
    } catch (error) {
        console.error('MetricCard component error:', error);
        // reportError(error);
        return <div>Erro ao carregar métrica</div>;
    }
}