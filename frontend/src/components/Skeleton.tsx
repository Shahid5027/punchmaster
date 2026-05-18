import React from 'react';
import { motion } from 'framer-motion';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 0.7 }}
      transition={{ 
        repeat: Infinity, 
        duration: 1.5, 
        repeatType: 'reverse', 
        ease: 'easeInOut' 
      }}
      className={`bg-zinc-800/60 rounded ${className}`}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full flex flex-col gap-3 py-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center px-4">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-4 w-1/3 rounded-md" />
            <Skeleton className="h-3 w-1/4 rounded-md" />
          </div>
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
};
