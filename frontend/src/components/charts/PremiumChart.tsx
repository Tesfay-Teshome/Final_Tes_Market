import React from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartOptions
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface PremiumChartProps {
    data: {
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            borderColor?: string | ((context: any) => any);
            backgroundColor?: string | ((context: any) => any);
            fill?: boolean;
            tension?: number;
            borderWidth?: number;
            borderDash?: number[];
            pointRadius?: number;
            pointHoverRadius?: number;
            pointHoverBackgroundColor?: string;
            pointHoverBorderColor?: string;
            pointHoverBorderWidth?: number;
            yAxisID?: string;
        }[];
    };
    height?: number;
    showLegend?: boolean;
    theme?: 'dark' | 'light';
}

const PremiumChart: React.FC<PremiumChartProps> = ({
    data,
    height = 300,
    showLegend = true,
    theme = 'dark'
}) => {
    const isDark = theme === 'dark';

    // Enhanced data with smooth curves and gradients
    const enhancedData = {
        ...data,
        datasets: data.datasets.map((dataset, index) => {
            const colors = [
                {
                    border: '#3CB371',
                    bg: (ctx: any) => {
                        const canvas = ctx.chart.ctx;
                        const gradient = canvas.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, 'rgba(60, 179, 113, 0.35)');
                        gradient.addColorStop(0.55, 'rgba(60, 179, 113, 0.10)');
                        gradient.addColorStop(1, 'rgba(60, 179, 113, 0)');
                        return gradient;
                    }
                },
                {
                    border: '#FFD700',
                    bg: (ctx: any) => {
                        const canvas = ctx.chart.ctx;
                        const gradient = canvas.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, 'rgba(170, 158, 80, 1)');
                        gradient.addColorStop(0.55, 'rgba(35, 201, 8, 1)');
                        gradient.addColorStop(1, 'rgba(3, 53, 87, 0.35)');
                        return gradient;
                    }
                },
                {
                    border: '#2E8B57',
                    bg: (ctx: any) => {
                        const canvas = ctx.chart.ctx;
                        const gradient = canvas.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, 'rgba(46, 139, 87, 0.30)');
                        gradient.addColorStop(0.55, 'rgba(46, 139, 87, 0.09)');
                        gradient.addColorStop(1, 'rgba(46, 139, 87, 0)');
                        return gradient;
                    }
                },
            ];

            const color = colors[index % colors.length];

            return {
                ...dataset,
                borderColor: dataset.borderColor || color.border,
                backgroundColor: dataset.backgroundColor || color.bg,
                fill: dataset.fill !== undefined ? dataset.fill : true,
                tension: dataset.tension || 0.45, // Smoother bezier curves
                borderWidth: dataset.borderWidth ?? 3,
                pointRadius: dataset.pointRadius ?? 0,
                pointHoverRadius: dataset.pointHoverRadius ?? 8,
                pointHoverBackgroundColor: dataset.pointHoverBackgroundColor || dataset.borderColor || color.border,
                pointHoverBorderColor: dataset.pointHoverBorderColor || '#fff',
                pointHoverBorderWidth: dataset.pointHoverBorderWidth ?? 3,
            };
        }),
    };

    const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'nearest' as const,
            axis: 'x' as const,
            intersect: false,
        },
        plugins: {
            legend: {
                display: showLegend,
                position: 'top' as const,
                labels: {
                    color: isDark ? '#E6EDF3' : '#374151',
                    font: {
                        size: 12,
                        family: 'Inter, system-ui, sans-serif',
                        weight: 500
                    },
                    padding: 15,
                    usePointStyle: true,
                    pointStyle: 'circle',
                },
            },
            tooltip: {
                enabled: true,
                mode: 'index' as const,
                intersect: false,
                backgroundColor: isDark ? 'rgba(20, 30, 40, 0.92)' : 'rgba(255, 255, 255, 0.95)',
                titleColor: isDark ? '#E6EDF3' : '#111827',
                bodyColor: isDark ? '#9AA4AF' : '#374151',
                borderColor: isDark ? 'rgba(0, 255, 180, 0.18)' : 'rgba(0, 229, 168, 0.2)',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                cornerRadius: 8,
                titleFont: {
                    size: 13,
                    family: 'Inter, system-ui, sans-serif',
                    weight: 600
                },
                bodyFont: {
                    size: 12,
                    family: 'Inter, system-ui, sans-serif',
                    weight: 500
                },
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            // Check dataset index to determine formatting
                            if (context.datasetIndex === 0) {
                                // Sales Revenue - format as currency
                                label += '$' + context.parsed.y.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                });
                            } else {
                                // Orders or Users - format as number
                                label += context.parsed.y.toLocaleString();
                            }
                        }
                        return label;
                    }
                }
            },
        },
        scales: {
            x: {
                grid: {
                    display: true,
                    color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    drawTicks: false,
                },
                ticks: {
                    color: isDark ? '#9AA4AF' : '#6b7280',
                    font: {
                        size: 11,
                        family: 'Inter, system-ui, sans-serif',
                    },
                    padding: 8,
                },
                border: {
                    display: false,
                },
            },
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                grid: {
                    display: true,
                    color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    drawTicks: false,
                },
                ticks: {
                    color: isDark ? '#9AA4AF' : '#6b7280',
                    font: {
                        size: 11,
                        family: 'Inter, system-ui, sans-serif',
                    },
                    padding: 8,
                    callback: function (value) {
                        // Format as currency for sales
                        if (typeof value === 'number') {
                            if (value >= 1000000) {
                                return '$' + (value / 1000000).toFixed(1) + 'M';
                            } else if (value >= 1000) {
                                return '$' + (value / 1000).toFixed(1) + 'K';
                            }
                            return '$' + value.toLocaleString();
                        }
                        return value;
                    }
                },
                border: {
                    display: false,
                },
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                grid: {
                    drawOnChartArea: false, // Only show grid for left axis
                },
                ticks: {
                    color: isDark ? '#9AA4AF' : '#6b7280',
                    font: {
                        size: 11,
                        family: 'Inter, system-ui, sans-serif',
                    },
                    padding: 8,
                    callback: function (value) {
                        // Format as count for orders and users
                        if (typeof value === 'number') {
                            return value.toLocaleString();
                        }
                        return value;
                    }
                },
                border: {
                    display: false,
                },
            },
        },
    };

    return (
        <div className="w-full" style={{ height: `${height}px` }}>
            <Line data={enhancedData} options={options} />
        </div>
    );
};

export default PremiumChart;
