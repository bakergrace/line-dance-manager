import React, { useState, useEffect } from 'react';

// --- THE DATA PLAN (STRICT TYPES) ---
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

// --- THE LOGIC ENGINE ---
const API_KEY = import.meta.env.VITE_BOOTSTEPPER_API_KEY as string; 
const BASE_URL = 'https://cors-anywhere.herokuapp.com/https://api.bootstepper.com';

// Define the raw API shape to satisfy strict TypeScript rules
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

export default function MasterController() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Dance[]>([]);
  const [selectedDance, setSelectedDance] = useState<Dance | null>(null);
  const [playlists, setPlaylists] = useState<{ [key: string]: Dance[] }>(() => {
    const saved = localStorage.getItem('dance_mgr_v7');
    return saved ? JSON.parse(saved) : { "Dances I Know": [], "Dances I Kinda Know": [], "Dances I Want to Know": [] };
  });

  useEffect(() => {
    localStorage.setItem('dance_mgr_v7', JSON.stringify(playlists));
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
        // Methodological check for walls to ensure no '0' errors
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

  // --- VIEW 1: INDIVIDUAL DANCE PAGE ---
  if (selectedDance) {
    return (
      <div style={{ backgroundColor: '#184C78', minHeight: '100vh', color: 'white', padding: '40px', fontFamily: "'Roboto', sans-serif" }}>
        <button onClick={() => setSelectedDance(null)} style={{ background: 'none', color: 'white', border: '1px solid white', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', marginBottom: '30px', fontFamily: "'Roboto', sans-serif" }}>
          ← Back to Search
        </button>

        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'rgba(255,255,255,0.1)', padding: '40px', borderRadius: '15px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', fontStyle: 'normal' }}>{selectedDance.title}</h1>
          <div style={{ color: '#fbbf24', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>
            {selectedDance.difficultyLevel} • {selectedDance.counts} Counts • {selectedDance.wallCount} Walls
          </div>
          
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '20px', marginBottom: '30px' }}>
            <p style={{ margin: '5px 0' }}><strong>Song:</strong> {selectedDance.songTitle}</p>
            <p style={{ margin: '5px 0' }}><strong>Artist:</strong> {selectedDance.songArtist}</p>
            {selectedDance.stepSheetUrl && (
              <a href={selectedDance.stepSheetUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '10px', color: '#60a5fa', textDecoration: 'underline' }}>
                View Stepsheet Shortcut
              </a>
            )}
          </div>

          <h3 style={{ marginBottom: '15px' }}>Add to Playlist:</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => addToPlaylist(selectedDance, "Dances I Know")} style={{ flex: 1, backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontFamily: "'Roboto', sans-serif" }}>KNOW</button>
            <button onClick={() => addToPlaylist(selectedDance, "Dances I Kinda Know")} style={{ flex: 1, backgroundColor: '#ca8a04', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontFamily: "'Roboto', sans-serif" }}>KINDA</button>
            <button onClick={() => addToPlaylist(selectedDance, "Dances I Want to Know")} style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontFamily: "'Roboto', sans-serif" }}>WANT</button>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW 2: MAIN SEARCH & PLAYLIST VIEW ---
  return (
    <div style={{ backgroundColor: '#184C78', minHeight: '100vh', color: 'white', padding: '40px', fontFamily: "'Roboto', sans-serif" }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        
        {/* UPDATED HEADER: Roboto, White, Non-Italic */}
        <h1 style={{ 
          fontFamily: "'Roboto', sans-serif", 
          color: 'white', 
          fontSize: '3rem', 
          marginBottom: '30px',
          fontStyle: 'normal', 
          fontWeight: 700 
        }}>
          BootStepper
        </h1>
        
        <form onSubmit={handleSearch} style={{ marginBottom: '40px' }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search dances..." style={{ padding: '12px', width: '300px', borderRadius: '4px', border: 'none', fontFamily: "'Roboto', sans-serif" }} />
          <button type="submit" style={{ padding: '12px 24px', marginLeft: '10px', backgroundColor: '#fbbf24', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontFamily: "'Roboto', sans-serif" }}>SEARCH</button>
        </form>

        {results.length > 0 && (
          <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', textAlign: 'left', marginBottom: '40px' }}>
            {results.map(d => (
              <div key={d.id} onClick={() => setSelectedDance(d)} style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{d.title}</div>
                <div style={{ fontSize: '13px', color: '#fbbf24' }}>{d.songTitle} - {d.songArtist}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {Object.entries(playlists).map(([name, list]) => (
            <div key={name} style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px', textAlign: 'left', minHeight: '300px' }}>
              <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '10px', fontSize: '16px' }}>{name}</h3>
              {list.map(d => (
                <div key={d.id} onClick={() => setSelectedDance(d)} style={{ padding: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', margin: '5px 0', cursor: 'pointer' }}>
                  <span style={{ fontSize: '13px' }}>{d.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}