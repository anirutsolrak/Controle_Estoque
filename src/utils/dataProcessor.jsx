// Removida a importação de MockDataGenerator, pois não será mais usada.
// import { MockDataGenerator } from './mockData.js'; 
import * as d3 from 'd3'; // Importa d3

// Lista estática dos estados do Brasil, agora gerenciada diretamente aqui.
const ALL_BRAZILIAN_STATES = [
    { id: 'AC', nome: 'Acre' },
    { id: 'AL', nome: 'Alagoas' },
    { id: 'AP', nome: 'Amapá' },
    { id: 'AM', nome: 'Amazonas' },
    { id: 'BA', nome: 'Bahia' },
    { id: 'CE', nome: 'Ceará' },
    { id: 'DF', nome: 'Distrito Federal' },
    { id: 'ES', nome: 'Espírito Santo' },
    { id: 'GO', nome: 'Goiás' },
    { id: 'MA', nome: 'Maranhão' },
    { id: 'MT', nome: 'Mato Grosso' },
    { id: 'MS', nome: 'Mato Grosso do Sul' },
    { id: 'MG', nome: 'Minas Gerais' },
    { id: 'PA', nome: 'Pará' },
    { id: 'PB', nome: 'Paraíba' },
    { id: 'PR', nome: 'Paraná' },
    { id: 'PE', nome: 'Pernambuco' },
    { id: 'PI', nome: 'Piauí' },
    { id: 'RJ', nome: 'Rio de Janeiro' },
    { id: 'RN', nome: 'Rio Grande do Norte' },
    { id: 'RS', nome: 'Rio Grande do Sul' },
    { id: 'RO', nome: 'Rondônia' },
    { id: 'RR', nome: 'Roraima' },
    { id: 'SC', nome: 'Santa Catarina' },
    { id: 'SP', nome: 'São Paulo' },
    { id: 'SE', nome: 'Sergipe' },
    { id: 'TO', nome: 'Tocantins' }
];

const PAGE_SIZE = 1000; // Tamanho da página para cada requisição (máximo padrão do Supabase)

export const DataProcessor = {
    fetchAndProcessDashboardData: async (supabaseClient, filters) => {
        try {
            console.log('Buscando dados do Supabase com filtros:', filters);
            const { startDate, endDate } = filters;

            let allData = [];
            let currentPage = 0;
            let hasMoreData = true;

            while (hasMoreData) {
                let query = supabaseClient
                    .from('deliveries')
                    .select('arflash, abertura_da_conta, recepcionado_em, uf, situacao')
                    .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1); // Define o range da paginação

                if (startDate) {
                    query = query.gte('abertura_da_conta', startDate);
                }
                if (endDate) {
                    query = query.lte('abertura_da_conta', endDate);
                }

                const { data, error } = await query;

                if (error) {
                    console.error('Erro ao buscar página de dados do Supabase:', error);
                    throw error;
                }

                if (data.length === 0) {
                    hasMoreData = false; // Não há mais dados a serem buscados
                } else {
                    allData = allData.concat(data); // Adiciona os dados da página atual
                    currentPage++;
                    console.log(`Página ${currentPage} carregada. Total de registros até agora: ${allData.length}`);
                    // Se a página não retornou o tamanho máximo, provavelmente é a última página.
                    if (data.length < PAGE_SIZE) {
                        hasMoreData = false;
                    }
                }
            }

            console.log('Total de registros recebidos do Supabase (todas as páginas):', allData.length);
            // console.log('Dados brutos recebidos do Supabase:', allData); // Descomente para ver todos os dados se precisar

            const processedData = DataProcessor.processRawData(allData, filters);
            return processedData;

        } catch (error) {
            console.error('Erro em fetchAndProcessDashboardData:', error);
            throw error;
        }
    },

    processRawData: (rawData, filters) => {
        const headerInfo = {
            inicio: filters.startDate,
            final: filters.endDate
        };

        const tabelaPerformance = DataProcessor.calculatePerformanceTable(rawData);
        const mapaPerformance = DataProcessor.calculateMapPerformance(rawData);
        const metricasRodape = DataProcessor.calculateFooterMetrics(rawData);

        return {
            headerInfo,
            tabelaPerformance,
            mapaPerformance,
            metricasRodape
        };
    },

    calculatePerformanceTable: (data) => {
        const performanceByState = {};
        ALL_BRAZILIAN_STATES.forEach(state => {
            performanceByState[state.id] = { estado: state.nome, D0: 0, D1: 0, D2: 0, D3: 0, D4: 0, D5: 0, D6: 0, D7: 0 };
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        data.forEach(item => {
            const recepcionadoDate = new Date(item.recepcionado_em);

            if (isNaN(recepcionadoDate.getTime())) { 
                console.warn(`Data de recebimento inválida para ARFLASH: ${item.arflash}, Data: ${item.recepcionado_em}`);
                return; 
            }
            recepcionadoDate.setHours(0, 0, 0, 0);


            const diffTime = Math.abs(today - recepcionadoDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const ufEntry = ALL_BRAZILIAN_STATES.find(s => s.id === item.uf); 
            if (ufEntry) {
                const stateKey = ufEntry.id;
                if (performanceByState[stateKey]) {
                    if (diffDays === 0) performanceByState[stateKey].D0++;
                    else if (diffDays === 1) performanceByState[stateKey].D1++;
                    else if (diffDays === 2) performanceByState[stateKey].D2++;
                    else if (diffDays === 3) performanceByState[stateKey].D3++;
                    else if (diffDays === 4) performanceByState[stateKey].D4++;
                    else if (diffDays === 5) performanceByState[stateKey].D5++;
                    else if (diffDays === 6) performanceByState[stateKey].D6++;
                    else performanceByState[stateKey].D7++; 
                }
            }
        });

        return Object.values(performanceByState).sort((a, b) => a.estado.localeCompare(b.estado));
    },

    calculateMapPerformance: (data) => {
        const stateCounts = {};
        const stateNames = ALL_BRAZILIAN_STATES;

        stateNames.forEach(state => {
            stateCounts[state.id] = { total: 0 }; // Agora só precisamos do total
        });

        data.forEach(item => {
            const ufEntry = stateNames.find(s => s.id === item.uf);
            if (ufEntry) {
                const stateKey = ufEntry.id;
                stateCounts[stateKey].total++; // Conta o total de itens por estado
            }
        });

        const desempenhoEstados = stateNames.map(state => {
            const total = stateCounts[state.id].total;
            // A métrica 'performance' agora será o 'total' de itens, para colorir o mapa
            return {
                id: state.id,
                nome: state.nome,
                performance: total // O valor para colorir o mapa é o total de itens
            };
        });

        // 'performanceTotal' será removido da UI, então podemos retornar 0 ou null aqui
        const performanceTotal = 0; 

        return {
            performanceTotal: performanceTotal, // Retorna 0 (ou null) para ser ignorado
            desempenhoEstados: desempenhoEstados
        };
    },

    calculateFooterMetrics: (data) => {
        const metrics = {
            estoque: 0,
            separado: 0,
            enviado: 0,
            naoLocalizado: 0,
            recusa: 0,
            fragmentado: 0,
            devolucao: 0 
        };

        const uniqueSituations = new Map();

        data.forEach(item => {
            const situacaoExcel = String(item.situacao).trim().toUpperCase(); 
            
            uniqueSituations.set(situacaoExcel, (uniqueSituations.get(situacaoExcel) || 0) + 1);

            switch (situacaoExcel) {
                case 'ESTOQUE':
                case 'EM ESTOQUE - FLASH':
                    metrics.estoque++;
                    break;
                case 'PREPARADO PARA ENVIO': 
                case 'PREPRARADO PARA ENVIO': 
                case 'SEPARADO': // Adicionado para cobrir a string exata 'SEPARADO'
                    metrics.separado++; 
                    break;
                case 'SAIDA':
                case 'ENVIADO': // Adicionado para cobrir a string exata 'ENVIADO'
                    metrics.enviado++; 
                    break;
                case 'FRAGMENTADO': 
                    metrics.fragmentado++;
                    break;
                case 'NÃO LOCALIZADO': 
                    metrics.naoLocalizado++;
                    break;
                case 'RECUSA': 
                    metrics.recusa++;
                    break;
                case 'DEVOLUÇÃO': 
                    metrics.devolucao++;
                    break;
                default:
                    console.warn(`Situação não mapeada: "${item.situacao}" (Normalizada: "${situacaoExcel}").`);
                    break;
            }
        });

        console.log('Contagem de TODAS as situações únicas encontradas no banco de dados:');
        uniqueSituations.forEach((count, situation) => {
            console.log(`- "${situation}": ${count} ocorrências`);
        });
        console.log('Métricas finais calculadas (KPIs):', metrics); 
        return metrics;
    },

    processFilters: (filters) => {
        return {
            startDate: filters.startDate || '2025-04-28',
            endDate: '2025-05-23'
        };
    },

    generateCSV: (tableData) => {
        try {
            const headers = ['Estado', 'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];
            const csvContent = [
                headers.join(','),
                ...tableData.map(row => 
                    headers.map(header => 
                        header === 'Estado' ? row.estado : row[header]
                    ).join(',')
                )
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'performance_por_estado.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error generating CSV:', error);
            throw error;
        }
    }
};