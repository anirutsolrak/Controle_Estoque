import React from 'react';
import FilterPanel from './components/FilterPanel.jsx';
import HeaderInfo from './components/HeaderInfo.jsx';
import StatusCards from './components/StatusCards.jsx';
import PerformanceBarChart from './components/PerformanceBarChart.jsx'; 
import BrazilMap from './components/BrazilMap.jsx';
import XlsxUploader from './components/XlsxUploader.jsx'; 
import { DataProcessor } from './utils/dataProcessor.jsx'; 
import { supabase } from './utils/supabaseClient.js'; 


function reportError(error) {
    console.error('Um erro foi reportado:', error);
}

function App() {
    const [dashboardData, setDashboardData] = React.useState(null);
    const [filters, setFilters] = React.useState({
        startDate: '2023-01-01', 
        endDate: '2025-12-31',   
    });
    const [loading, setLoading] = React.useState(true);
    const [initError, setInitError] = React.useState(false); 

    React.useEffect(() => {
        if (!supabase) {
            console.error('App.jsx: Erro: Cliente Supabase (importado de supabaseClient.js) é nulo ou não está inicializado.');
            setInitError(true);
        } else {
            console.log('App.jsx: Cliente Supabase disponível via importação e parece válido.');
        }
    }, []); 

    const loadDashboardData = React.useCallback(async (filterParams) => {
        console.log('App.jsx: loadDashboardData acionada com filterParams:', JSON.stringify(filterParams));
        try {
            if (!supabase || initError) { 
                console.warn('App.jsx: Cliente Supabase não está pronto ou erro de inicialização. Não é possível carregar dados.');
                setLoading(false);
                return; 
            }

            setLoading(true);
            // Passa o cliente Supabase (o 'supabase' importado) para o DataProcessor
            const data = await DataProcessor.fetchAndProcessDashboardData(supabase, filterParams);
            // Adicionado rawData para debug
            console.log('App.jsx: loadDashboardData recebeu dados processados. Tamanho total de rawData:', data.rawData ? data.rawData.length : 'N/A');
            setDashboardData(data);
            setLoading(false);
        } catch (error) {
            console.error('App.jsx: Erro ao carregar dados do dashboard:', error);
            setLoading(false);
            setInitError(true); 
            reportError(error);
        }
    }, [supabase, initError]); 

    // Adiciona uma função para recarregar o dashboard após um upload bem-sucedido
    const handleUploadSuccess = React.useCallback(() => {
        console.log('App.jsx: Upload bem-sucedido. Recarregando dashboard...');
        loadDashboardData(filters); // Recarrega com os filtros atuais
    }, [loadDashboardData, filters]); // Depende de loadDashboardData e filters

    React.useEffect(() => {
        console.log('App.jsx: useEffect principal. Filters:', JSON.stringify(filters), 'Supabase existe:', !!supabase, 'InitError:', initError);
        // Este useEffect agora depende do `supabase` importado estar pronto.
        if (supabase && !initError) { 
            loadDashboardData(filters);
        } else if (initError) {
            console.error('App.jsx: Não é possível carregar dados devido a um erro de inicialização do Supabase.');
        }
    }, [filters, supabase, initError, loadDashboardData]); 

    const handleFilterChange = (newFilters) => {
        console.log('App.jsx: Filtros alterados para:', JSON.stringify(newFilters));
        setFilters(newFilters); // Atualiza os filtros para que o useEffect reaja e recarregue
    };

    const handleCellClick = (estado, column, value) => {
        console.log(`Clicked: ${estado} - ${column} - ${value}`);
    };

    const handleStateClick = (state) => {
        console.log(`Clicked state: ${state.nome}`);
    };

    const handleDownloadCSV = () => {
        if (dashboardData?.tabelaPerformance) {
            DataProcessor.generateCSV(dashboardData.tabelaPerformance);
        }
    };

    const formattedMapData = React.useMemo(() => {
        if (!dashboardData?.mapaPerformance?.desempenhoEstados) return {};
        return dashboardData.mapaPerformance.desempenhoEstados.reduce((acc, state) => {
            acc[state.id] = {
                performance: state.performance,
                nome: state.nome
            };
            return acc;
        }, [dashboardData]);
    });

    if (!supabase || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Carregando dashboard...</div>
            </div>
        );
    }

    if (initError) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-red-600">Erro crítico ao inicializar a aplicação. Por favor, verifique as chaves do Supabase e o console.</div>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-red-600">Erro ao carregar dados do dashboard.</div>
            </div>
        );
    }

    return (
        <div className="dashboard-container" data-name="dashboard" data-file="app.js">
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1 space-y-6"> 
                        <FilterPanel 
                            filters={filters} 
                            onFilterChange={handleFilterChange} 
                        />
                        <XlsxUploader onUploadSuccess={handleUploadSuccess} /> {/* Passa a função de callback */}
                    </div>

                    <div className="lg:col-span-3 space-y-6">
                        <HeaderInfo 
                            startDate={dashboardData.headerInfo.inicio}
                            endDate={dashboardData.headerInfo.final}
                        />

                        <StatusCards data={dashboardData.metricasRodape} />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="h-[50vh]">
                                <PerformanceBarChart 
                                    data={dashboardData.tabelaPerformance}
                                    onCellClick={handleCellClick}
                                />
                            </div>
                            <div className="h-[50vh]">
                                <BrazilMap
                                    data={formattedMapData}
                                    onStateClick={handleStateClick}
                                    performanceTotal={dashboardData.mapaPerformance.performanceTotal}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;