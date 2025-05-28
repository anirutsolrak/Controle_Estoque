import { useState } from 'react';

function FilterPanel({ onFilterChange, filters }) {
    const [startDate, setStartDate] = useState(filters.startDate);
    const [endDate, setEndDate] = useState(filters.endDate);

    const handleProcess = () => {
        onFilterChange({
            startDate,
            endDate
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                    <i className="fas fa-filter text-white"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Filtros</h3>
            </div>
            
            <div className="space-y-6">
                <div>
                    <h4 className="font-semibold text-gray-700 mb-4 flex items-center">
                        <i className="fas fa-calendar-alt text-blue-500 mr-2"></i>
                        Período
                    </h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Data Inicial</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Data Final</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleProcess}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                    <i className="fas fa-search mr-2"></i>
                    Processar
                </button>
            </div>
        </div>
    );
}

export default FilterPanel;