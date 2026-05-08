import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to seamlessly merge Tailwind CSS classes
 * Used by all Aceternity UI components.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
