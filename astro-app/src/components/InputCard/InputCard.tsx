import { useState } from 'react';
import './input-card.css';

interface InputCardProps {
  onSubmit?: (value: string) => void;
  placeholder?: string;
}

export default function InputCard({ onSubmit, placeholder = "Add new item..." }: InputCardProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && onSubmit) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="input-card">
      <div className="input-card-header">
        <div className="input-card-icon">+</div>
        <form onSubmit={handleSubmit} className="input-card-form">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="input-card-input"
            autoComplete="off"
          />
        </form>
      </div>
    </div>
  );
}