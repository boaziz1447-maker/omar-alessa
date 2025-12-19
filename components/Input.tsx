import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm font-semibold text-gray-300">{label}</label>
      <input 
        className={`bg-[#1e293b] border border-gray-600 text-white rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-[#007f5f] focus:border-[#007f5f] focus:outline-none transition-all placeholder-gray-500 shadow-sm ${className}`}
        {...props}
      />
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm font-semibold text-gray-300">{label}</label>
      <textarea 
        className={`bg-[#1e293b] border border-gray-600 text-white rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-[#007f5f] focus:border-[#007f5f] focus:outline-none transition-all placeholder-gray-500 shadow-sm min-h-[120px] ${className}`}
        {...props}
      />
    </div>
  );
};