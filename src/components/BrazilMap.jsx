import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3'; 

const formatPercentage = (value) => { 
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';
    return (value).toFixed(2) + '%';
};

export default function BrazilMap({ data, onStateClick, performanceTotal }) { 
    const mapRef = React.useRef(null);
    const tooltipRef = React.useRef(null);
    const legendRef = React.useRef(null);
    const [tooltip, setTooltip] = React.useState({ show: false, content: '', x: 0, y: 0, });
    const [geoJsonData, setGeoJsonData] = React.useState(null);
    const [loadingGeoJson, setLoadingGeoJson] = React.useState(true);
    const [errorGeoJson, setErrorGeoJson] = React.useState(null);

    React.useEffect(() => {
        const geoJsonUrl = 'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson';
        async function fetchGeoJson() {
            setLoadingGeoJson(true);
            setErrorGeoJson(null);
            setGeoJsonData(null);
            try {
                const response = await fetch(geoJsonUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const json = await response.json();
                if (!json || !json.features) {
                    throw new Error("GeoJSON inválido ou não contém 'features'.");
                }
                json.features.forEach((feature) => {
                    if (feature.properties && feature.properties.sigla) {
                        d3.geoCentroid(feature); // Usa d3 diretamente
                    }
                });
                
                setGeoJsonData(json);
                console.log('GeoJSON carregado com sucesso. Número de features:', json.features.length);
            } catch (err) {
                console.error('Falha ao buscar ou processar GeoJSON:', err);
                setErrorGeoJson(err.message || 'Erro desconhecido ao buscar GeoJSON.');
            } finally {
                setLoadingGeoJson(false);
            }
        }
        fetchGeoJson();
    }, []);

    React.useEffect(() => {
        if (!mapRef.current) return;
        
        const stateMetrics = data || {}; 
        const svg = d3.select(mapRef.current);
        const legendSvg = d3.select(legendRef.current);
        svg.selectAll('*').remove();
        legendSvg.selectAll('*').remove();

        if (loadingGeoJson || !geoJsonData || errorGeoJson) {
            // Não retorna, permitindo que a div com chartRef.current seja renderizada
            return;
        }
        
        try {
            const selectedMetric = 'performance'; 
            const metricAccessor = (d) => d?.[selectedMetric];

            const metricValues = Object.keys(stateMetrics)
                .map((stateKey) => metricAccessor(stateMetrics[stateKey]))
                .filter((value) => typeof value === 'number' && !isNaN(value));
            
            let minMetricValue = metricValues.length > 0 ? d3.min(metricValues) : 0;
            let maxMetricValue = metricValues.length > 0 ? d3.max(metricValues) : 1; 

            if (minMetricValue === maxMetricValue) { 
                if (maxMetricValue !== 0) {
                    minMetricValue = 0; 
                } else {
                    maxMetricValue = 1; 
                }
            }

            const colorInterpolator = d3.interpolateGreens; 
            const colorScale = d3.scaleSequential(colorInterpolator)
                .domain([minMetricValue, maxMetricValue]); 

            const width = 960;
            const height = 700; 
            const projection = d3.geoMercator()
                .center([-52, -14])
                .scale(680) 
                .translate([width / 2, height / 2]);

            const path = d3.geoPath().projection(projection);

            // AQUI O SVG ESTÁ SENDO APPENDED A mapRef.current
            // Certifique-se que mapRef.current é uma div no JSX
            svg.attr('viewBox', `0 0 ${width} ${height}`)
               .attr('preserveAspectRatio', 'xMidYMid meet');

            const mapGroup = svg.append('g');

            geoJsonData.features.forEach((feature) => {
                const stateAbbr = feature.properties.sigla;
                const stateName = feature.properties.name;
                const stateInfo = stateMetrics[stateAbbr];
                const metricValue = stateInfo ? metricAccessor(stateInfo) : 0; 

                let fillColor = '#E5E7EB';
                let strokeColor = '#FFFFFF';
                let strokeWidth = 0.5;

                if (stateInfo && metricValue !== undefined && metricValue !== null && typeof metricValue === 'number' && !isNaN(metricValue)) {
                    try {
                        fillColor = colorScale(metricValue);
                        if (!fillColor || String(fillColor).includes('NaN')) {
                            fillColor = '#E5E7EB';
                        }
                    } catch (scaleError) {
                        console.warn(`Erro na escala de cor para ${stateAbbr} (Métrica "${selectedMetric}" Valor: ${metricValue}):`, scaleError);
                        fillColor = '#E5E7EB';
                    }
                } else {
                    fillColor = '#CBD5E1'; 
                }

                const pathString = path(feature);
                if (!pathString) {
                    console.warn(`Caminho SVG vazio ou inválido para o estado ${stateAbbr}. Feature:`, feature);
                    return; 
                }

                mapGroup.append('path')
                    .datum(feature)
                    .attr('d', pathString)
                    .attr('fill', fillColor)
                    .attr('stroke', strokeColor)
                    .attr('stroke-width', strokeWidth)
                    .attr('stroke-linejoin', 'round')
                    .attr('fill-opacity', 1)
                    .style('pointer-events', 'all')
                    .style('cursor', 'pointer')
                    .style('transition', 'fill 0.2s, stroke 0.2s, stroke-width 0.2s, fill-opacity 0.2s')
                    .on('mouseover', (event) => {
                        d3.select(event.currentTarget)
                            .attr('stroke-width', 2.5)
                            .attr('stroke', '#000');
                        
                        const mapContainerRect = mapRef.current.getBoundingClientRect();
                        const mouseX = event.clientX - mapContainerRect.left;
                        const mouseY = event.clientY - mapContainerRect.top;

                        let tooltipContent = stateInfo
                            ? `${stateName} (${stateAbbr})<br/>Total de Itens: ${metricValue.toLocaleString('pt-BR')}`
                            : `${stateName} (${stateAbbr}): Sem dados`;
                        setTooltip({
                            show: true,
                            x: mouseX, 
                            y: mouseY,
                            content: tooltipContent,
                        });
                    })
                    .on("mouseout", () => {
                        setTooltip({ show: false, x: 0, y: 0, content: '' });
                        d3.select(event.currentTarget)
                            .attr('stroke-width', 0.5)
                            .attr('stroke', '#FFFFFF');
                    })
                    .on('click', () => {
                        if (onStateClick && stateInfo) {
                            onStateClick({ id: stateAbbr, nome: stateName, total: metricValue }); 
                        }
                    });
            });

            const legendHeight = 12;
            const legendWidth = 180;
            const legendGroup = legendSvg.append('g').attr('transform', `translate(10, 20)`); 

            const defs = legendSvg.append('defs');
            const linearGradientId = `map-gradient-${Date.now()}`;
            const linearGradient = defs.append('linearGradient').attr('id', linearGradientId).attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');

            const colorScaleForGradient = d3.scaleSequential(d3.interpolateGreens).domain([0, 1]); 
            const gradientStops = d3.range(0, 1.01, 0.05).map(t => ({ offset: `${t * 100}%`, color: colorScaleForGradient(t) }));
            linearGradient.selectAll('stop').data(gradientStops).enter().append('stop').attr('offset', (d) => d.offset).attr('stop-color', (d) => d.color);

            legendGroup.append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', legendWidth)
                .attr('height', legendHeight)
                .style('fill', `url(#${linearGradientId})`)
                .attr('rx', 2)
                .attr('ry', 2);

            const formatLegendValue = (value) => {
                if (typeof value !== 'number' || isNaN(value)) return '-';
                if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                return Math.round(value).toLocaleString('pt-BR');
            };

            legendGroup.append('text')
                .attr('x', 0)
                .attr('y', legendHeight + 13)
                .attr('font-size', '13px')
                .attr('fill', '#475569')
                .text(formatLegendValue(minMetricValue));

            legendGroup.append('text')
                .attr('x', legendWidth)
                .attr('y', legendHeight + 13)
                .attr('font-size', '15px')
                .attr('fill', '#475569')
                .attr('text-anchor', 'end')
                .text(formatLegendValue(maxMetricValue));

            const legendTitleText = 'Total de Itens'; 
            legendGroup.append('text')
                .attr('x', legendWidth / 2)
                .attr('y', -3) 
                .attr('font-size', '11px')
                .attr('font-weight', '500')
                .attr('fill', '#1e293b')
                .attr('text-anchor', 'middle')
                .text(legendTitleText);

        } catch (err) {
            console.error('Erro ao renderizar D3:', err);
            setErrorGeoJson('Erro ao desenhar o mapa.');
        }
    }, [data, geoJsonData, loadingGeoJson, errorGeoJson, onStateClick]);

    const handleMouseMove = React.useCallback((event) => {
        if (tooltip.show && mapRef.current) {
            const mapContainerRect = mapRef.current.getBoundingClientRect();
            setTooltip(prev => ({ 
                ...prev, 
                x: event.clientX - mapContainerRect.left, 
                y: event.clientY - mapContainerRect.top 
            }));
        }
    }, [tooltip.show]);

    return (
        <div className="map-container h-full flex flex-col" data-name="brazil-map" data-file="components/BrazilMap.js"
             onMouseMove={tooltip.show ? handleMouseMove : null} 
             onMouseOut={() => setTooltip({ show: false, content: '', x: 0, y: 0 })}
        >
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="font-semibold">Mapa de Itens</h3> 
            </div>

            <div className="brazil-map relative flex-grow overflow-hidden flex items-center justify-center">
                {/* O elemento SVG é renderizado aqui, e o D3 o manipula */}
                {!loadingGeoJson && !errorGeoJson && geoJsonData ? (
                    Object.keys(data || {}).length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                            Sem dados geográficos para o período/filtros selecionados.
                        </div>
                    ) : (
                        <svg ref={mapRef} className="w-full h-full"></svg> // AQUI DEVE ESTAR O SVG
                    )
                ) : (
                    // Mostrar mensagens de carregamento ou erro se o GeoJSON não estiver pronto
                    loadingGeoJson ? (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm p-4">
                            <i className="fas fa-spinner fa-spin mr-2"></i> Carregando mapa...
                        </div>
                    ) : (
                        errorGeoJson && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-red-600 bg-red-50 border border-red-200 rounded-md p-4 text-center text-sm w-full">
                                <i className="fas fa-exclamation-triangle mb-2 text-lg"></i>
                                <strong>Falha ao carregar o mapa:</strong>
                                <span className="block mt-1">{errorGeoJson}</span>
                            </div>
                        )
                    )
                )}
                 {tooltip.show && (
                    <div
                        className="tooltip" 
                        ref={tooltipRef}
                        style={{
                            left: `${tooltip.x}px`,
                            top: `${tooltip.y}px`,
                            transform: 'translate(10px, -100%)', 
                            visibility: tooltip.show ? 'visible' : 'hidden',
                        }}
                        dangerouslySetInnerHTML={{ __html: tooltip.content }}
                    />
                )}
            </div>
            {!loadingGeoJson && !errorGeoJson && geoJsonData && Object.keys(data || {}).length > 0 && (
                <div className="flex-shrink-0 self-center">
                    <svg ref={legendRef} width="250" height="45"></svg>
                </div>
            )}
        </div>
    );
}