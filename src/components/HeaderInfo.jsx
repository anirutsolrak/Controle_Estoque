import React from 'react';

export default function HeaderInfo({ startDate, endDate }) {
    try {
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('pt-BR');
        };

        return (
            // Aplicado gradiente, text-white e shadow-lg
            <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-xl shadow-lg p-6 mb-6" data-name="header-info" data-file="components/HeaderInfo.js">
                <h1 className="text-xl font-bold mb-2"> {/* Removido text-gray-800, agora text-white do pai */}
                    DASHBOARD - INÍCIO: {formatDate(startDate)} - FINAL: {formatDate(endDate)}
                </h1>
            </div>
        );
    } catch (error) {
        console.error('HeaderInfo component error:', error);
        // reportError(error); // reportError não é global aqui
        return <div>Erro ao carregar cabeçalho</div>;
    }
}