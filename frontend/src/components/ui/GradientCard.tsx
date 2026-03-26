import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface GradientCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  change?: number;
  color: string;
  link?: string;
  onClick?: () => void;
  className?: string;
}

const GradientCard: React.FC<GradientCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  change,
  color,
  link,
  onClick,
  className = ''
}) => {
  const cardContent = (
    <motion.div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-gray-50 shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 border border-gray-100 ${className}`}
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <motion.div 
            className={`flex-shrink-0 rounded-xl p-3 bg-gradient-to-br ${color} shadow-lg`}
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Icon className="h-6 w-6 text-white" />
          </motion.div>
          {change !== undefined && change !== 0 && (
            <motion.div 
              className="flex items-center space-x-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className={`text-xs font-medium ${
                change > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {change > 0 ? '+' : ''}{change}%
              </span>
            </motion.div>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors">
            {title}
          </p>
          <motion.p 
            className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors"
            whileHover={{ scale: 1.05 }}
          >
            {value}
          </motion.p>
          {description && (
            <p className="text-xs text-gray-500 line-clamp-2">{description}</p>
          )}
        </div>
      </div>
      <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
    </motion.div>
  );

  if (link) {
    return (
      <a href={link} className="group block">
        {cardContent}
      </a>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="group block w-full text-left">
        {cardContent}
      </button>
    );
  }

  return cardContent;
};

export default GradientCard;
