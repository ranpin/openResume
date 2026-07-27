import React from 'react';
import Icon from '../Icon';

const IconBtn: React.FC<{
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}> = ({ icon, onClick, disabled, danger, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`w-7 h-7 flex items-center justify-center rounded-md text-sm transition-colors ${
      disabled
        ? 'text-gray-300 cursor-not-allowed'
        : danger
          ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
          : 'text-gray-500 hover:text-sage-600 hover:bg-sage-50'
    }`}
  >
    <Icon name={icon} />
  </button>
);

export default IconBtn;
