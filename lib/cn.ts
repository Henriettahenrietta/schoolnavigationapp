import clsx, { type ClassValue } from "clsx";

// Tiny class-name combiner. (No tailwind-merge to keep the dependency surface minimal;
// components are written so classes don't conflict.)
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
