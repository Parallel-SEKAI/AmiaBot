import * as OpenCC from 'opencc-js';

// Initialize converter from Traditional to Simplified Chinese (China)
const converter = OpenCC.Converter({ from: 't', to: 'cn' });

/**
 * Convert text to Simplified Chinese
 */
export function convertToSimplified(text: string): string {
  return converter(text);
}
