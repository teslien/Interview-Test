import React from 'react';

const BrandIcon = ({ className = "h-8 w-8", showText = false, textClassName = "text-xl font-bold" }) => {
  return (
    <div className="flex items-center space-x-3">
      <img 
        src="/assets/company-icon.png" 
        alt="12th Wonder Logo" 
        className={className}
        style={{ objectFit: 'contain' }}
      />
      
      {showText && (
        <span className={`bg-gradient-to-r from-orange-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent ${textClassName}`}>
          12th Wonder
        </span>
      )}
    </div>
  );
};

export default BrandIcon;
