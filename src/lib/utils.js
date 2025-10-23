import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from 'date-fns';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDateSafe(dateString) {
  if (!dateString) {
    return "—";
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "—";
  }
  return format(date, 'dd/MM/yyyy');
}