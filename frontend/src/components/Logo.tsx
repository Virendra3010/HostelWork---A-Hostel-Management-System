import React from 'react';
import { Building2 } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  textClassName?: string;
  iconClassName?: string;
}

const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  textClassName = '',
  iconClassName = ''
}) => {
  const sizeConfig = {
    sm: {
      container: 'h-6 w-6',
      icon: 'h-4 w-4',
      text: 'text-sm font-bold',
      spacing: 'space-x-1'
    },
    md: {
      container: 'h-8 w-8',
      icon: 'h-6 w-6',
      text: 'text-lg font-bold',
      spacing: 'space-x-2'
    },
    lg: {
      container: 'h-10 w-10',
      icon: 'h-8 w-8',
      text: 'text-xl font-bold',
      spacing: 'space-x-2'
    },
    xl: {
      container: 'h-12 w-12',
      icon: 'h-10 w-10',
      text: 'text-2xl font-bold',
      spacing: 'space-x-2'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex items-center ${config.spacing} ${className}`}>
      <div className={`${config.container} flex items-center justify-center ${iconClassName}`}>
        <Building2 className={`${config.icon} text-primary-600 dark:text-primary-400`} />
      </div>
      {showText && (
        <span className={`${config.text} text-gray-900 dark:text-white ${textClassName}`}>
          HostelWork
        </span>
      )}
    </div>
  );
};

export default Logo;