import { useState, useEffect } from 'react';
import type { Dance } from './types';
import { normalizeDanceData, STORAGE_KEYS } from './utils';

const API_KEY = import.meta.env.VITE_BOOTSTEPPER_API_KEY as string;
const BASE_URL = '/api';

export function useSearch() {
  const [queryInput, setQueryInput] = useState('');
  const [results, setResults] = useState<Dance[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearchingDances, setIsSearchingDances] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filterDiff, setFilterDiff] = useState('all');
  const [sortOrder, setSortOrder] = useState('default');

  // Load recent searches on app start
  useEffect(() => {
    try {
      const localRecent = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
      if (localRecent) setRecentSearches(JSON.parse(localRecent));
    } catch (e) { console.error("Load Error", e); }
  }, []);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery) return;
    setIsSearchingDances(true); setCurrentPage(1); setFilterDiff('all');
    const updatedRecents = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updatedRecents); 
    localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updatedRecents));
    
    try {
      const res = await fetch(`${BASE_URL}/dances/search?query=${encodeURIComponent(searchQuery)}&limit=50`, { headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      const data = await res.json();
      if ((data.items || []).length === 0) alert("No results found.");
      setResults((data.items || []).map((item: any) => normalizeDanceData(item)));
    } catch (err) { 
      console.error(err); alert("Search failed. Check connection."); 
    } finally { 
      setIsSearchingDances(false); 
    }
  };

  const applyFiltersAndSort = (list: Dance[]) => {
    let processed = [...list];
    if (filterDiff !== 'all') processed = processed.filter(d => d.difficultyLevel?.toLowerCase().includes(filterDiff));
    if (sortOrder === 'az') processed.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortOrder === 'za') processed.sort((a, b) => b.title.localeCompare(a.title));
    return processed;
  };

  return {
    queryInput, setQueryInput, results, setResults, recentSearches, setRecentSearches,
    isSearchingDances, currentPage, setCurrentPage, itemsPerPage, filterDiff, setFilterDiff,
    sortOrder, setSortOrder, handleSearch, applyFiltersAndSort
  };
}