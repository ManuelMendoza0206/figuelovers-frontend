import { ArrowLeft } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  label?: string;
  to?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ label = 'Volver', to }) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => to ? navigate(to) : navigate(-1)}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-ink-muted transition hover:border-brand/30 hover:bg-brand/10 hover:text-ink"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </button>
  );
};
