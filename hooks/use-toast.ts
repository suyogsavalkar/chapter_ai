"use client";

import { toast as baseToast } from '@/components/toast';

type ShadToastArgs = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | string;
};

export function useToast() {
  function toast({ title, description, variant }: ShadToastArgs) {
    const isError = variant === 'destructive';
    const message = [title, description].filter(Boolean).join(': ');
    baseToast({ type: isError ? 'error' : 'success', description: message });
  }

  return { toast };
}

export default useToast;

