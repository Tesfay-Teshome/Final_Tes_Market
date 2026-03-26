import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Line } from 'react-chartjs-2';

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    sparklineData?: number[];
    color?: string;
    description?: string;
    onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    icon: Icon,
    trend,
    sparklineData,
    color = 'from-emerald-500 to-emerald-600',
    description,
    onClick
}) => {
    // Sparkline chart configuration
    const sparklineChartData = sparklineData ? {
        labels: sparklineData.map((_, i) => i.toString()),
        datasets: [{
            data: sparklineData,
            borderColor: 'rgba(255, 255, 255, 0.8)',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 0,
        }]
    } : null;

    const sparklineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
        },
        scales: {
            x: { display: false },
            y: { display: false },
        },
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onClick}
            className={`relative overflow-hidden rounded-3xl transition-all duration-500 transform-gpu perspective-1000 bg-gradient-to-br ${color} shadow-2xl shadow-black/20 hover:shadow-3xl hover:shadow-black/30 cursor-pointer`}
            style={{
                boxShadow: `
          0 25px 50px -12px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.05),
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          inset 0 -1px 0 rgba(0, 0, 0, 0.2)
        `
            }}
        >
            {/* 3D Border Effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-black/10 via-transparent to-black/30 pointer-events-none" />

            {/* Inner Shadow for Depth */}
            <div
                className="absolute inset-0 rounded-3xl shadow-inner pointer-events-none"
                style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2), inset 0 -2px 4px rgba(0,0,0,0.1)' }}
            />

            <div className="relative p-6">
                {/* Subtle Pattern Overlay */}
                <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-transparent via-black/5 to-transparent pointer-events-none" />

                <div className="relative z-10">
                    {/* Header with Icon */}
                    <div className="flex items-center justify-between mb-4">
                        <motion.div
                            className="flex-shrink-0 rounded-xl p-3 bg-white/15 backdrop-blur-md border border-white/20 shadow-lg"
                            whileHover={{ y: -2, rotate: 5, scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            style={{
                                boxShadow: `
                  0 8px 32px rgba(0, 0, 0, 0.12),
                  0 0 0 1px rgba(255, 255, 255, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.3)
                `
                            }}
                        >
                            <Icon className="h-6 w-6 text-white drop-shadow-lg" />
                        </motion.div>

                        {trend && (
                            <div className={`flex items-center text-sm font-semibold ${trend.isPositive ? 'text-white/90' : 'text-white/70'}`}>
                                <span className={`${trend.isPositive ? 'text-green-200' : 'text-red-200'}`}>
                                    {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Title and Value */}
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-white/95 drop-shadow-sm">{title}</p>
                        <motion.p
                            className="text-3xl font-bold text-white drop-shadow-lg"
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            {value}
                        </motion.p>
                        {description && (
                            <p className="text-xs text-white/85 line-clamp-1 font-medium drop-shadow-sm">{description}</p>
                        )}
                    </div>

                    {/* Sparkline Chart */}
                    {sparklineChartData && (
                        <div className="mt-4 h-16 w-full">
                            <Line data={sparklineChartData} options={sparklineOptions} />
                        </div>
                    )}
                </div>

                {/* Subtle Glow Effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none" />
            </div>
        </motion.div>
    );
};

export default MetricCard;
