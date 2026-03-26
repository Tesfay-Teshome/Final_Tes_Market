import React from 'react';
import { motion } from 'framer-motion';

interface BannerProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
  animate?: boolean;
}

const Banner: React.FC<BannerProps> = ({ 
  title, 
  subtitle, 
  children, 
  className = '', 
  animate = true 
}) => {
  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: 'easeOut'
      }
    }
  };

  const titleVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: 0.2,
        ease: 'easeOut'
      }
    }
  };

  const subtitleVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: 0.4,
        ease: 'easeOut'
      }
    }
  };

  const BannerContent = () => (
    <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
      <motion.h1 
        className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-900 via-emerald-700 to-green-600 bg-clip-text text-transparent mb-6 leading-normal pb-2"
        variants={animate ? titleVariants : undefined}
        initial={animate ? "hidden" : undefined}
        animate={animate ? "visible" : undefined}
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p 
          className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto"
          variants={animate ? subtitleVariants : undefined}
          initial={animate ? "hidden" : undefined}
          animate={animate ? "visible" : undefined}
        >
          {subtitle}
        </motion.p>
      )}
      {children}
    </div>
  );

  if (animate) {
    return (
      <motion.div 
        className={`bg-gradient-to-br from-emerald-50 via-green-100 to-emerald-100 ${className} relative min-h-[400px] flex items-center justify-center overflow-hidden`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Enhanced Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-green-600/15 to-emerald-600/10"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-emerald-400/5 via-transparent to-green-400/5"></div>
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-80 h-80 bg-gradient-to-r from-emerald-400/20 to-green-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-emerald-400/15 to-green-400/15 rounded-full blur-2xl"></div>
        </div>
        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-1/4 w-4 h-4 bg-emerald-400/30 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute bottom-32 left-1/4 w-3 h-3 bg-green-400/30 rounded-full animate-bounce" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-emerald-400/30 rounded-full animate-bounce" style={{animationDelay: '2s'}}></div>
        </div>
        <BannerContent />
      </motion.div>
    );
  }

  return (
    <section className="bg-gradient-to-br from-emerald-50 via-green-100 to-emerald-100 relative min-h-[400px] flex items-center justify-center overflow-hidden">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-green-600/15 to-emerald-600/10"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-emerald-400/5 via-transparent to-green-400/5"></div>
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-80 h-80 bg-gradient-to-r from-emerald-400/20 to-green-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-emerald-400/15 to-green-400/15 rounded-full blur-2xl"></div>
      </div>
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-1/4 w-4 h-4 bg-emerald-400/30 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-32 left-1/4 w-3 h-3 bg-green-400/30 rounded-full animate-bounce" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-emerald-400/30 rounded-full animate-bounce" style={{animationDelay: '2s'}}></div>
      </div>
      <BannerContent />
    </section>
  );
};

export default Banner;
