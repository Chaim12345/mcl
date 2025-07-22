import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Process text to highlight mentions
 * @param text Text to process
 * @returns Processed text with HTML for mentions
 */
export function processMentions(text: string): string {
  return text.replace(/@\[([^\]]+)\]|@(\w+)/g, (match) => {
    return `<span class="text-primary font-medium">${match}</span>`;
  });
}

/**
 * Extract mentions from text
 * @param text Text to extract mentions from
 * @returns Array of mention strings
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]|@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const mention = match[1] || match[2];
    if (mention && !mentions.includes(mention)) {
      mentions.push(mention);
    }
  }
  
  return mentions;
}