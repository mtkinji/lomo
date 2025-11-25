import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Canonical `cn` helper recommended by React Native Reusables / shadcn.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}



