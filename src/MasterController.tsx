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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Dance[]>([]);
  const [selectedDance, setSelectedDance] = useState<Dance | null>(null);
  const [playlists, setPlaylists] = useState<{ [key: string]: Dance[] }>(() => {
    const saved = localStorage.getItem('dance_mgr_v8');
    return saved ? JSON.parse(saved) : { "Dances I Know": [], "Dances I Kinda Know": [], "Dances I Want to Know": [] };
  });

  useEffect(() => {
    localStorage.setItem('dance_mgr_v8', JSON.stringify(playlists));
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

  if (selectedDance) {
    return (
      <div style={{ backgroundColor: '#184C78', minHeight: '100vh', color: 'white', padding: '40px', fontFamily: "'Roboto', sans-serif" }}>
        <button onClick={() => setSelectedDance(null)} style={{ background: 'none', color: 'white', border: '1px solid white', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', marginBottom: '30px', fontFamily: "'Roboto', sans-serif" }}>
          ← Back
        </button>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'rgba(255,255,255,0.1)', padding: '40px', borderRadius: '15px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', fontStyle: 'normal', fontWeight: 700 }}>{selectedDance.title}</h1>
          <div style={{ color: '#fbbf24', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '20px' }}>
            {selectedDance.difficultyLevel} • {selectedDance.counts} Counts • {selectedDance.wallCount} Walls
          </div>
          <p><strong>Song:</strong> {selectedDance.songTitle}</p>
          <p><strong>Artist:</strong> {selectedDance.songArtist}</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
            <button onClick={() => addToPlaylist(selectedDance, "Dances I Know")} style={{ flex: 1, backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontFamily: "'Roboto', sans-serif" }}>KNOW</button>
            <button onClick={() => addToPlaylist(selectedDance, "Dances I Kinda Know")} style={{ flex: 1, backgroundColor: '#ca8a04', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontFamily: "'Roboto', sans-serif" }}>KINDA</button>
            <button onClick={() => addToPlaylist(selectedDance, "Dances I Want to Know")} style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontFamily: "'Roboto', sans-serif" }}>WANT</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#184C78', minHeight: '100vh', color: 'white', padding: '40px', fontFamily: "'Roboto', sans-serif" }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Roboto', sans-serif", color: 'white', fontSize: '3.5rem', marginBottom: '30px', fontStyle: 'normal', fontWeight: 700 }}>
          BootStepper
        </h1>
        <form onSubmit={handleSearch} style={{ marginBottom: '40px' }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search dances..." style={{ padding: '12px', width: '300px', borderRadius: '4px', border: 'none', fontFamily: "'Roboto', sans-serif" }} />
          <button type="submit" style={{ padding: '12px 24px', marginLeft: '10px', backgroundColor: '#fbbf24', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontFamily: "'Roboto', sans-serif" }}>SEARCH</button>
        </form>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {Object.entries(playlists).map(([name, list]) => (
            <div key={name} style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px', textAlign: 'left', minHeight: '400px' }}>
              <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '10px', fontFamily: "'Roboto', sans-serif" }}>{name}</h3>
              {list.map(d => (
                <div key={d.id} onClick={() => setSelectedDance(d)} style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', margin: '8px 0', cursor: 'pointer' }}>
                  {d.title}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}