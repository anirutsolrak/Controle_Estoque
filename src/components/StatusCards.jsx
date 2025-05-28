import React from 'react';
import MetricCard from './MetricCard.jsx'; // Importa MetricCard

export default function StatusCards({ data }) { 
    try {
        const cards = [
            { key: 'estoque', label: 'ESTOQUE', value: data.estoque, color: '#1e3a8a' },
            { key: 'separado', label: 'SEPARADO', value: data.separado, color: '#16a34a' },
            { key: 'enviado', label: 'ENVIADO', value: data.enviado, color: '#8b5cf6' },
            // Removido o card de 'devolucao'
            { key: 'naoLocalizado', label: 'NÃO LOCALIZADO', value: data.naoLocalizado, color: '#06b6d4' },
            { key: 'recusa', label: 'RECUSA', value: data.recusa, color: '#d4af37' },
            { key: 'fragmentado', label: 'FRAGMENTADO', value: data.fragmentado, color: '#dc2626' }
        ];

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-name="status-cards" data-file="components/StatusCards.js">
                {cards.map(card => (
                    <MetricCard
                        key={card.key}
                        title={card.label}
                        value={card.value}
                        color={card.color}
                        size="large"
                    />
                ))}
            </div>
        );
    } catch (error) {
        console.error('StatusCards component error:', error);
        return <div>Erro ao carregar cards de status</div>;
    }
}