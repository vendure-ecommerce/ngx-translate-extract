import { styleText } from 'node:util';

export const cyan = (text: string) => styleText('cyan', text);
export const green = (text: string) => styleText('green', text);
export const bold = (text: string) => styleText('bold', text);
export const dim = (text: string) => styleText('dim', text);
export const red = (text: string) => styleText('red', text);
