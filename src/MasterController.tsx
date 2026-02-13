import React, { useState, useEffect } from 'react';

// --- DATA DEFINITIONS ---
export interface Dance {
  id: string;
  title: string;
  difficultyLevel: string;
  counts: number;
  songTitle: string;
  songArtist: string;
  stepSheetUrl: string;
  wallCount: number;
}

interface ApiRawItem {
  id: string;
  title: string;
  difficultyLevel?: string;
  counts?: number;
  count?: number;
  walls?: number;
  wallCount?: number;
  stepSheetUrl?: string;
  stepsheet?: string;
  danceSongs?: Array<{
    song?: {
      title?: string;
      artist?: string;
    };
  }>;
}

const API_KEY = import.meta.env.VITE_BOOTSTEPPER_API_KEY as string; 
const BASE_URL = 'https://cors-anywhere.herokuapp.com/https://api.bootstepper.com';

export default function MasterController() {
  const [currentTab, setCurrentTab] = useState<'search' | 'playlists'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Dance[]>([]);
  const [selectedDance, setSelectedDance] = useState<Dance | null>(null);
  
  // Updated playlist names to exact lowercase strings
  const [playlists, setPlaylists] = useState<{ [key: string]: Dance[] }>(() => {
    const saved = localStorage.getItem('dance_mgr_v11');
    return saved ? JSON.parse(saved) : { 
      "dances i know": [], 
      "dances i kinda know": [], 
      "dances i want to know": [] 
    };
  });

  useEffect(() => {
    localStorage.setItem('dance_mgr_v11', JSON.stringify(playlists));
  }, [playlists]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    try {
      const response = await fetch(`${BASE_URL}/dances/search?query=${encodeURIComponent(query)}&limit=10`, {
        headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      const items = (data.items || []) as ApiRawItem[];

      const mapped = items.map((item) => {
        const rawWalls = item.walls ?? item.wallCount ?? 0;
        return {
          id: item.id,
          title: item.title,
          difficultyLevel: item.difficultyLevel || "Unknown",
          counts: item.counts ?? item.count ?? 0,
          wallCount: Number(rawWalls),
          stepSheetUrl: item.stepSheetUrl ?? item.stepsheet ?? "",
          songTitle: item.danceSongs?.[0]?.song?.title || "Unknown Song",
          songArtist: item.danceSongs?.[0]?.song?.artist || "Unknown Artist"
        };
      });
      setResults(mapped);
    } catch (err) {
      console.error("Search error", err);
    }
  };

  const addToPlaylist = (dance: Dance, listName: string) => {
    if (playlists[listName].some(d => d.id === dance.id)) return;
    setPlaylists(prev => ({ ...prev, [listName]: [...prev[listName], dance] }));
    setSelectedDance(null);
  };

  const removeFromPlaylist = (danceId: string, listName: string) => {
    setPlaylists(prev => ({
      ...prev,
      [listName]: prev[listName].filter(d => d.id !== danceId)
    }));
  };

  if (selectedDance) {
    return (
      <div style={{ backgroundColor: '#184C78', minHeight: '100vh', color: 'white', padding: '20px', fontFamily: "'Roboto', sans-serif" }}>
        <button onClick={() => setSelectedDance(null)} style={{ background: 'none', color: 'white', border: '1px solid white', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', marginBottom: '30px' }}>
          ← Back
        </button>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'rgba(255,255,255,0.1)', padding: '30px', borderRadius: '15px' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '10px', fontWeight: 700, fontStyle: 'normal' }}>{selectedDance.title}</h1>
          <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: '20px' }}>
            {selectedDance.difficultyLevel} • {selectedDance.counts} Counts • {selectedDance.wallCount} Walls
          </div>
          <p><strong>Song:</strong> {selectedDance.songTitle}</p>
          <p><strong>Artist:</strong> {selectedDance.songArtist}</p>
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>add to:</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button onClick={() => addToPlaylist(selectedDance, "dances i know")} style={{ flex: '1 1 100px', backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>KNOW</button>
              <button onClick={() => addToPlaylist(selectedDance, "dances i kinda know")} style={{ flex: '1 1 100px', backgroundColor: '#ca8a04', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>KINDA</button>
              <button onClick={() => addToPlaylist(selectedDance, "dances i want to know")} style={{ flex: '1 1 100px', backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>WANT</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#184C78', minHeight: '100vh', color: 'white', padding: '20px', fontFamily: "'Roboto', sans-serif" }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        
        <h1 style={{ fontSize: '3.5rem', marginBottom: '20px', fontWeight: 700, fontStyle: 'normal' }}>BootStepper</h1>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
          <button onClick={() => setCurrentTab('search')} style={{ padding: '10px 30px', background: 'none', color: currentTab === 'search' ? '#fbbf24' : 'white', border: 'none', borderBottom: currentTab === 'search' ? '3px solid #fbbf24' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>SEARCH</button>
          <button onClick={() => setCurrentTab('playlists')} style={{ padding: '10px 30px', background: 'none', color: currentTab === 'playlists' ? '#fbbf24' : 'white', border: 'none', borderBottom: currentTab === 'playlists' ? '3px solid #fbbf24' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>MY PLAYLISTS</button>
        </div>

        {currentTab === 'search' && (
          <div>
            <form onSubmit={handleSearch} style={{ marginBottom: '30px' }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search dances..." style={{ padding: '12px', width: '250px', borderRadius: '4px 0 0 4px', border: 'none', fontFamily: "'Roboto', sans-serif" }} />
              <button type="submit" style={{ padding: '12px 20px', backgroundColor: '#fbbf24', border: 'none', borderRadius: '0 4px 4px 0', fontWeight: 'bold', fontFamily: "'Roboto', sans-serif" }}>GO</button>
            </form>

            {results.length > 0 && (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '12px', textAlign: 'left' }}>
                {results.map(d => (
                  <div key={d.id} onClick={() => setSelectedDance(d)} style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{d.title}</div>
                    <div style={{ fontSize: '13px', color: '#fbbf24' }}>{d.songTitle} - {d.songArtist}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentTab === 'playlists' && (
          <div style={{ textAlign: 'left' }}>
            {Object.entries(playlists).map(([name, list]) => (
              <div key={name} style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.4rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '10px', fontWeight: 700 }}>{name} ({list.length})</h2>
                {list.length === 0 ? (
                  <p style={{ opacity: 0.5, fontStyle: 'italic' }}>No dances added yet.</p>
                ) : (
                  list.map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '12px', margin: '8px 0', borderRadius: '8px' }}>
                      <div onClick={() => setSelectedDance(d)} style={{ flex: 1, cursor: 'pointer' }}>
                        <div style={{ fontWeight: 'bold' }}>{d.title}</div>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>{d.difficultyLevel} • {d.counts}c</div>
                      </div>
                      <button onClick={() => removeFromPlaylist(d.id, name)} style={{ background: 'none', color: '#ef4444', border: '1px solid #ef4444', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>REMOVE</button>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}