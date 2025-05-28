import React from 'react';
import FilterPanel from './components/FilterPanel.jsx';
import HeaderInfo from './components/HeaderInfo.jsx';
import StatusCards from './components/StatusCards.jsx';
// Importa o novo componente de gráfico de barras
import PerformanceBarChart from './components/PerformanceBarChart.jsx'; 
import BrazilMap from './components/BrazilMap.jsx';
import XlsxUploader from './components/XlsxUploader.jsx'; 
import { DataProcessor } from './utils/dataProcessor.jsx'; 
import { createClient } from '@supabase/supabase-js'; 
import { supabase } from './utils/supabaseClient.js'; 


// Substitua 'YOUR_SUPABASE_URL' e 'YOUR_SUPABASE_ANON_KEY' pelos seus valores reais do Supabase
// (Estas constantes não são mais usadas aqui, mas mantidas por segurança caso precise de debug)
// const SUPABASE_URL = 'YOUR_SUPABASE_URL'; 
// const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; 

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
            console.error('Erro: Cliente Supabase (importado de supabaseClient.js) é nulo ou não está inicializado.');
            setInitError(true);
        } else {
            console.log('Cliente Supabase disponível via importação.');
        }
    }, []); 

    const loadDashboardData = React.useCallback(async (filterParams) => {
        try {
            if (!supabase || initError) { 
                console.warn('Cliente Supabase não está pronto para carregar dados.');
                setLoading(false);
                return; 
            }

            setLoading(true);
            const data = await DataProcessor.fetchAndProcessDashboardData(supabase, filterParams);
            setDashboardData(data);
            setLoading(false);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            setLoading(false);
            setInitError(true); 
            reportError(error);
        }
    }, [supabase, initError]); 

    React.useEffect(() => {
        if (supabase && !initError) { 
            loadDashboardData(filters);
        } else if (initError) {
            console.error('Não é possível carregar dados devido a um erro de inicialização do Supabase.');
        }
    }, [filters, supabase, loadDashboardData, initError]); 

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
    };

    const handleCellClick = (estado, column, value) => {
        console.log(`Clicked: ${estado} - ${column} - ${value}`);
        // Essa função ainda pode ser usada se você quiser interatividade ao clicar nas barras
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
                        <XlsxUploader />
                    </div>

                    <div className="lg:col-span-3 space-y-6">
                        <HeaderInfo 
                            startDate={dashboardData.headerInfo.inicio}
                            endDate={dashboardData.headerInfo.final}
                        />

                        <StatusCards data={dashboardData.metricasRodape} />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="h-[50vh]">
                                <PerformanceBarChart // ATUALIZADO: Usando o novo componente
                                    data={dashboardData.tabelaPerformance}
                                    onCellClick={handleCellClick}
                                    onDownloadCSV={handleDownloadCSV}
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