'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface PortalButtonProps {
  children: React.ReactNode;
  variant?: "destructive" | "default" | "outline" | "secondary" | "ghost" | "link";
}

export function PortalButton({ children, variant = "destructive" }: PortalButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} variant={variant} disabled={loading}>
      {loading ? 'Loading...' : children}
    </Button>
  );
} 