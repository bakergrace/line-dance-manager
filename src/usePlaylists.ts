import { useState } from 'react';
import type { Dance, AppView, ReturnPath, UserProfile } from './types';
import { STORAGE_KEYS, normalizeDanceData, DEFAULT_PLAYLISTS } from './utils';

const API_KEY = import.meta.env.VITE_BOOTSTEPPER_API_KEY as string;
const BASE_URL = '/api';

export function usePlaylists(
  user: any, 
  profile: UserProfile, 
  pushToCloud: any, 
  setCurrentView: (v: AppView) => void, 
  setLoading: (v: boolean) => void,
  navigateTo: (v: AppView) => void
) {
  const [playlists, setPlaylists] = useState<{ [key: string]: Dance[] }>(DEFAULT_PLAYLISTS);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  // We leave the initial load from LocalStorage inside MasterController 
  // so it doesn't conflict with Cloud sync, but all updates happen here.

  const updateAndSavePlaylists = (newState: { [key: string]: Dance[] }) => {
    setPlaylists(newState); 
    localStorage.setItem(STORAGE_KEYS.PERMANENT, JSON.stringify(newState));
    if (user) pushToCloud(newState, profile, user);
  };

  const addToPlaylist = (dance: Dance, listName: string) => {
    if (!dance || !listName) return;
    setActiveBtn(listName);
    const currentList = playlists[listName] || [];
    if (!currentList.some(item => item.id === dance.id)) {
      updateAndSavePlaylists({ ...playlists, [listName]: [...currentList, normalizeDanceData(dance)] });
    }
    setTimeout(() => setActiveBtn(null), 1000);
  };

  const removeFromPlaylist = (danceId: string, listName: string) => {
    updateAndSavePlaylists({ ...playlists, [listName]: (playlists[listName] || []).filter(d => d.id !== danceId) });
  };

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const name = newPlaylistName.trim().toLowerCase();
    if (playlists[name]) return alert("Playlist already exists!");
    updateAndSavePlaylists({ ...playlists, [name]: [] });
    setNewPlaylistName('');
  };

  const deletePlaylist = (listName: string, currentView: AppView) => {
    if (confirm(`Are you sure you want to delete "${listName}"?`)) {
      const newState = { ...playlists }; delete newState[listName];
      updateAndSavePlaylists(newState);
      if (currentView.type === 'PLAYLIST_DETAIL' && currentView.name === listName) navigateTo({ type: 'PLAYLISTS_LIST' });
    }
  };

  const loadDanceDetails = async (rawDance: any, source: ReturnPath) => {
    if (!rawDance || !rawDance.id) return;
    setLoading(true); let cleanDance = normalizeDanceData(rawDance);
    try {
      const detailsRes = await fetch(`${BASE_URL}/dances/getById?id=${cleanDance.id}`, { headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' } });
      if (detailsRes.ok) {
        const details = await detailsRes.json();
        cleanDance = normalizeDanceData({ ...cleanDance, ...details });
        const sheetRes = await fetch(`${BASE_URL}/dances/getStepSheet?id=${cleanDance.stepSheetId || cleanDance.id}`, { headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' } });
        if (sheetRes.ok) {
          const sheetData = await sheetRes.json();
          if (Array.isArray(sheetData.content)) cleanDance.stepSheetContent = sheetData.content;
        }
      }
    } catch (err) { console.warn("Fetch issue:", err); }
    setCurrentView({ type: 'DANCE_PROFILE', dance: cleanDance, returnPath: source });
    setLoading(false);
  };

  return {
    playlists, setPlaylists, newPlaylistName, setNewPlaylistName, activeBtn,
    addToPlaylist, removeFromPlaylist, createPlaylist, deletePlaylist, loadDanceDetails
  };
}