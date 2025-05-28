function PieChart({ data, size = 80 }) {
    try {
        const total = data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = 0;

        const createPath = (value, startAngle, endAngle) => {
            const centerX = size / 2;
            const centerY = size / 2;
            const radius = size / 2 - 2;
            
            const startAngleRad = (startAngle * Math.PI) / 180;
            const endAngleRad = (endAngle * Math.PI) / 180;
            
            const x1 = centerX + radius * Math.cos(startAngleRad);
            const y1 = centerY + radius * Math.sin(startAngleRad);
            const x2 = centerX + radius * Math.cos(endAngleRad);
            const y2 = centerY + radius * Math.sin(endAngleRad);
            
            const largeArc = endAngle - startAngle > 180 ? 1 : 0;
            
            return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        };

        return (
            <svg width={size} height={size} data-name="pie-chart" data-file="components/PieChart.js">
                {data.map((item, index) => {
                    const percentage = (item.value / total) * 360;
                    const path = createPath(item.value, currentAngle, currentAngle + percentage);
                    currentAngle += percentage;
                    
                    return (
                        <path
                            key={index}
                            d={path}
                            fill={item.color}
                            stroke="white"
                            strokeWidth="1"
                        />
                    );
                })}
            </svg>
        );
    } catch (error) {
        console.error('PieChart component error:', error);
        reportError(error);
        return <div>Erro ao carregar gráfico</div>;
    }
}

export default PieChart;