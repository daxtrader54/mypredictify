import { promises as fs } from 'fs';
import path from 'path';
import { CURRENT_SEASON } from '@/config/site';

export const GW_BASE_DIR = path.join(process.cwd(), 'data', 'gameweeks', CURRENT_SEASON);

export async function getAvailableGameweeks(): Promise<number[]> {
  try {
    const entries = await fs.readdir(GW_BASE_DIR);
    return entries
      .filter((e) => e.startsWith('GW'))
      .map((e) => parseInt(e.replace('GW', '')))
      .sort((a, b) => b - a); // newest first
  } catch {
    return [];
  }
}
