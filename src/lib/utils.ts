import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function stripJsonComments(json: string): string {
  json = json.replace(/\/\/.*$/gm, '');

  json = json.replace(/\/\*[\s\S]*?\*\//g, '');

  return json.trim();
}

export function parseJsonWithComments<T>(jsonString: string): T {
  try {
      const cleanJson = stripJsonComments(jsonString);
      return JSON.parse(cleanJson) as T;
  } catch (error) {
      console.error('Error parsing JSON with comments:', error);
      throw error;
  }
}