import type { Dance } from './types';

export const COLORS = {
  BACKGROUND: '#EEEBE8', PRIMARY: '#36649A', SECONDARY: '#D99AB1',
  WHITE: '#FFFFFF', NEUTRAL: '#9E9E9E', SUCCESS: '#4CAF50', ERROR: '#F44336'
};

export const STORAGE_KEYS = {
  PERMANENT: 'bootstepper_permanent_storage',
  RECENT_SEARCHES: 'bootstepper_recent_searches'
};

export const DEFAULT_PLAYLISTS = {
  "dances i know": [], "dances i kinda know": [], "dances i want to know": []
};

export const cleanTitle = (title: string | undefined) => 
  title ? String(title).replace(/\s*\([^)]*\)$/, '').trim() : "Untitled";

export const normalizeDanceData = (raw: any): Dance => {
  if (!raw) return { id: 'error', title: 'Error', difficultyLevel: '', counts: 0, songTitle: '', songArtist: '', wallCount: 0 };
  return {
    id: String(raw.id || 'unknown-id'), title: cleanTitle(raw.title),
    difficultyLevel: String(raw.difficultyLevel || 'Level Unknown'),
    counts: typeof raw.counts === 'number' ? raw.counts : (Number(raw.count) || 0),
    wallCount: typeof raw.walls === 'number' ? raw.walls : (Number(raw.wallCount) || 0),
    songTitle: String(raw.songTitle || raw.danceSongs?.[0]?.song?.title || 'Unknown Song'),
    songArtist: String(raw.songArtist || raw.danceSongs?.[0]?.song?.artist || 'Unknown Artist'),
    stepSheetContent: Array.isArray(raw.stepSheetContent) ? raw.stepSheetContent : [],
    originalStepSheetUrl: String(raw.originalStepSheetUrl || ''),
    stepSheetId: String(raw.stepSheetId || raw.id)
  };
};

export const getDifficultyColor = (level: string) => {
  const l = (level || '').toLowerCase();
  if (l.includes('absolute')) return '#00BCD4';    
  if (l.includes('beginner')) return '#4CAF50';    
  if (l.includes('improver')) return '#FF9800';    
  if (l.includes('intermediate')) return '#F44336'; 
  if (l.includes('advanced')) return '#9C27B0';    
  return COLORS.NEUTRAL; 
};