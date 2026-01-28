import React from 'react';

type ContainerVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'error'
  | 'outline';

interface ContainerProps {
  children: React.ReactNode;
  variant?: ContainerVariant;
  label?: string;
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  variant = 'outline',
  label,
  className = '',
}) => {
  const variantClasses = {
    primary: 'bg-primary-container text-on-primary-container',
    secondary: 'bg-secondary-container text-on-secondary-container',
    tertiary: 'bg-tertiary-container text-on-tertiary-container',
    error: 'bg-error-container text-on-error-container',
    outline: 'border border-outline-variant',
  };

  return (
    <div
      className={`p-4 rounded-sm mb-4 ${variantClasses[variant]} ${className}`}
    >
      {label && (
        <div className="font-bold text-[12px] uppercase tracking-wider opacity-70 mb-1">
          {label}
        </div>
      )}
      <div className="text-[18px] font-medium">{children}</div>
    </div>
  );
};
