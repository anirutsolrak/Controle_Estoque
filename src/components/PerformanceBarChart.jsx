import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3'; 

export default function PerformanceBarChart({ data, onCellClick }) { 
    const [viewMode, setViewMode] = useState('estado'); // 'estado' or 'regiao'
    const chartRef = useRef(null);
    const tooltipRef = useRef(null); 
    const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: '' }); 

    const ALL_BRAZILIAN_STATES = [
        { id: 'AC', nome: 'Acre' }, { id: 'AL', nome: 'Alagoas' }, { id: 'AP', nome: 'Amapá' }, { id: 'AM', nome: 'Amazonas' },
        { id: 'BA', nome: 'Bahia' }, { id: 'CE', nome: 'Ceará' }, { id: 'DF', nome: 'Distrito Federal' }, { id: 'ES', nome: 'Espírito Santo' },
        { id: 'GO', nome: 'Goiás' }, { id: 'MA', nome: 'Maranhão' }, { id: 'MT', nome: 'Mato Grosso' }, { id: 'MS', nome: 'Mato Grosso do Sul' },
        { id: 'MG', nome: 'Minas Gerais' }, { id: 'PA', nome: 'Pará' }, { id: 'PB', nome: 'Paraíba' }, { id: 'PR', nome: 'Paraná' },
        { id: 'PE', nome: 'Pernambuco' }, { id: 'PI', nome: 'Piauí' }, { id: 'RJ', nome: 'Rio de Janeiro' }, { id: 'RN', nome: 'Rio Grande do Norte' },
        { id: 'RS', nome: 'Rio Grande do Sul' }, { id: 'RO', nome: 'Rondônia' }, { id: 'RR', nome: 'Roraima' }, { id: 'SC', nome: 'Santa Catarina' },
        { id: 'SP', nome: 'São Paulo' }, { id: 'SE', nome: 'Sergipe' }, { id: 'TO', nome: 'Tocantins' }
    ];

    const regionMapping = {
        'Norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
        'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
        'Centro-Oeste': ['DF', 'GO', 'MS', 'MT'],
        'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
        'Sul': ['PR', 'RS', 'SC']
    };

    const aggregateByRegion = (data) => {
        const aggregated = {};
        Object.keys(regionMapping).forEach(regionName => {
            aggregated[regionName] = { estado: regionName, total: 0, D0: 0, D1: 0, D2: 0, D3: 0, D4: 0, D5: 0, D6: 0, D7: 0 };
        });

        data.forEach(item => {
            const stateInfo = ALL_BRAZILIAN_STATES.find(s => s.nome === item.estado);
            const stateId = stateInfo ? stateInfo.id : null;

            let foundRegion = null;
            if (stateId) { 
                for (const regionName in regionMapping) {
                    if (regionMapping[regionName].includes(stateId)) { 
                        foundRegion = regionName;
                        break;
                    }
                }
            }

            if (foundRegion) {
                const currentRegion = aggregated[foundRegion];
                let itemTotal = 0;
                for (let i = 0; i <= 7; i++) {
                    const dKey = `D${i}`;
                    currentRegion[dKey] += item[dKey];
                    itemTotal += item[dKey];
                }
                currentRegion.total += itemTotal;
            } else {
                 console.warn(`Estado "${item.estado}" não mapeado para uma região. Dados podem ser perdidos na agregação por região.`);
                 let itemTotal = 0;
                 for (let i = 0; i <= 7; i++) {
                     const dKey = `D${i}`;
                     itemTotal += item[dKey];
                 }
                 if (!aggregated[item.estado]) { 
                    aggregated[item.estado] = { ...item, estado: item.estado, total: itemTotal };
                 } else {
                     aggregated[item.estado].total += itemTotal; 
                 }
            }
        });

        return Object.values(aggregated).filter(d => d.total > 0 || Object.keys(regionMapping).includes(d.estado));
    };

    useEffect(() => {
        if (!data || !chartRef.current) return;

        const currentData = viewMode === 'estado'
            ? data.map(d => ({ ...d, total: d.D0 + d.D1 + d.D2 + d.D3 + d.D4 + d.D5 + d.D6 + d.D7 }))
            : aggregateByRegion(data);

        const filteredData = currentData.filter(d => d.total > 0);

        if (filteredData.length === 0) {
            d3.select(chartRef.current).html("<div class='flex items-center justify-center h-full text-gray-500'>Sem dados para exibir no gráfico.</div>");
            return;
        }

        const margin = { top: 20, right: 20, bottom: 90, left: 60 }; 
        const width = chartRef.current.clientWidth - margin.left - margin.right;
        const height = chartRef.current.clientHeight - margin.top - margin.bottom;

        const svg = d3.select(chartRef.current)
            .html("") 
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .range([0, width])
            .padding(0.2); 

        const y = d3.scaleLinear()
            .range([height, 0]);

        x.domain(filteredData.map(d => d.estado));
        y.domain([0, d3.max(filteredData, d => d.total) * 1.1]);

        svg.selectAll(".bar")
            .data(filteredData)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.estado))
            .attr("width", x.bandwidth())
            .attr("y", height) 
            .attr("height", 0) 
            .attr("fill", "#6366F1") 
            .attr("rx", 3) 
            .attr("ry", 3)
            .transition() 
            .duration(800) 
            .ease(d3.easeBounceOut) 
            .attr("y", d => y(d.total))
            .attr("height", d => height - y(d.total));

        // Adiciona interatividade (mouseover, mouseout, click) às barras após a transição
        svg.selectAll(".bar")
            .on("mouseover", (event, d) => {
                d3.select(event.currentTarget).attr("fill", "#4F46E5"); // Escurece no hover
                
                // Pega a posição do contêiner do gráfico na viewport
                const chartContainerRect = chartRef.current.getBoundingClientRect();
                
                // Calcula a posição do mouse relativa ao contêiner do gráfico
                const mouseX = event.clientX - chartContainerRect.left;
                const mouseY = event.clientY - chartContainerRect.top;

                setTooltip({
                    show: true,
                    // Posição do tooltip dentro do contêiner relativo
                    x: mouseX, 
                    y: mouseY,
                    content: `${d.estado}: ${d.total.toLocaleString('pt-BR')} itens`
                });
            })
            .on("mouseout", (event) => { 
                d3.select(event.currentTarget).attr("fill", "#6366F1"); 
                setTooltip({ show: false, x: 0, y: 0, content: '' });
            })
            .on("click", (event, d) => {
                if (onCellClick) {
                    onCellClick(d.estado, 'Total', d.total);
                }
            });

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .style("font-size", "11px") 
            .style("fill", "#4A5568"); 

        svg.append("g")
            .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0s"))) 
            .style("font-size", "10px")
            .style("fill", "#4A5568");

    }, [data, viewMode, onCellClick]);

    // O handleMouseMove não é mais necessário para posicionar o tooltip se ele segue o mouse no mouseover da barra.
    // Manter o onMouseMove e onMouseOut no div principal se o tooltip deve seguir o mouse *sempre* no contêiner.
    // Para um tooltip que "aparece e fica", remova o onMouseMove do div principal.
    const handleMouseMove = React.useCallback((event) => {
        if (tooltip.show && tooltipRef.current) {
            const chartContainerRect = chartRef.current.getBoundingClientRect();
            setTooltip(prev => ({ 
                ...prev, 
                x: event.clientX - chartContainerRect.left, 
                y: event.clientY - chartContainerRect.top 
            }));
        }
    }, [tooltip.show]);


    return (
        <div 
            className="performance-table h-full flex flex-col" 
            data-name="performance-bar-chart" 
            data-file="components/PerformanceBarChart.jsx"
            onMouseMove={tooltip.show ? handleMouseMove : null} // Ativa o mouseMove apenas se o tooltip já estiver visível
            onMouseOut={() => setTooltip({ show: false, x: 0, y: 0, content: '' })}
        >
            <div className="table-header flex-shrink-0">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Performance por {viewMode}</h3>
                    <div className="flex items-center space-x-3">
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('estado')}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                                    viewMode === 'estado' 
                                        ? 'bg-blue-500 text-white shadow-sm' 
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Estado
                            </button>
                            <button
                                onClick={() => setViewMode('regiao')}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                                    viewMode === 'regiao' 
                                        ? 'bg-blue-500 text-white shadow-sm' 
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Região
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex-grow relative" style={{ minHeight: '200px' }}>
                <div ref={chartRef} className="w-full h-full"></div>
                {tooltip.show && (
                    <div
                        className="tooltip" 
                        ref={tooltipRef}
                        style={{
                            left: `${tooltip.x}px`,
                            top: `${tooltip.y}px`,
                            transform: 'translate(-50%, -100%)', // Centraliza horizontalmente e move para cima
                            visibility: tooltip.show ? 'visible' : 'hidden',
                        }}
                        dangerouslySetInnerHTML={{ __html: tooltip.content }}
                    />
                )}
            </div>
        </div>
    );
}