import React, { useState, useEffect } from 'react';
import bootstepperLogo from './bootstepper-logo.png'; // Import the logo

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

// --- COLOR CONSTANTS ---
const COLORS = {
  BACKGROUND: '#EEEBE8',
  PRIMARY: '#36649A',
  SECONDARY: '#D99AB1',
  WHITE: '#FFFFFF',
};

export default function MasterController() {
  // Open the app to a home tab instead of search
  const [currentTab, setCurrentTab] = useState<'home' | 'playlists'>('home');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Dance[]>([]);
  const [selectedDance, setSelectedDance] = useState<Dance | null>(null);
  // New state to track which playlist is currently being viewed
  const [viewingPlaylist, setViewingPlaylist] = useState<string | null>(null);

  // Playlist names are all lowercase
  const [playlists, setPlaylists] = useState<{ [key: string]: Dance[] }>(() => {
    const saved = localStorage.getItem('dance_mgr_v12');
    return saved ? JSON.parse(saved) : {
      "dances i know": [],
      "dances i kinda know": [],
      "dances i want to know": []
    };
  });

  useEffect(() => {
    localStorage.setItem('dance_mgr_v12', JSON.stringify(playlists));
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

  // --- SUB-VIEW: INDIVIDUAL DANCE PAGE ---
  if (selectedDance) {
    return (
      <div style={{ backgroundColor: COLORS.BACKGROUND, minHeight: '100vh', color: COLORS.PRIMARY, padding: '20px', fontFamily: "'Roboto', sans-serif" }}>
        <button onClick={() => setSelectedDance(null)} style={{ background: 'none', color: COLORS.PRIMARY, border: `1px solid ${COLORS.PRIMARY}`, padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', marginBottom: '30px', fontFamily: "'Roboto', sans-serif" }}>
          ← Back
        </button>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: COLORS.WHITE, padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '10px', fontWeight: 700, fontStyle: 'normal', color: COLORS.PRIMARY }}>{selectedDance.title}</h1>
          {/* Use secondary color for minor accents */}
          <div style={{ color: COLORS.SECONDARY, fontWeight: 'bold', marginBottom: '20px' }}>
            {selectedDance.difficultyLevel} • {selectedDance.counts} Counts • {selectedDance.wallCount} Walls
          </div>
          <p><strong>Song:</strong> {selectedDance.songTitle}</p>
          <p><strong>Artist:</strong> {selectedDance.songArtist}</p>
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>add to:</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {Object.keys(playlists).map(listName => (
                <button key={listName} onClick={() => addToPlaylist(selectedDance, listName)} style={{ flex: '1 1 100px', backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontFamily: "'Roboto', sans-serif", cursor: 'pointer' }}>
                  {listName}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: COLORS.BACKGROUND, minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
      {/* Header and tabs stay in place when scrolling */}
      <div style={{ position: 'sticky', top: 0, backgroundColor: COLORS.BACKGROUND, zIndex: 10, paddingBottom: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', padding: '20px' }}>
          {/* Exchange the words at the top of the site for the attached .png file */}
          <img src={bootstepperLogo} alt="BootStepper Logo" style={{ maxHeight: '60px', marginBottom: '20px' }} />

          {/* --- NAVIGATION TABS --- */}
          <div style={{ display: 'flex', justifyContent: 'center', borderBottom: `1px solid ${COLORS.PRIMARY}40` }}>
            {/* Use all lowercase for tab titles */}
            <button
              onClick={() => { setCurrentTab('home'); setViewingPlaylist(null); }}
              style={{
                padding: '10px 30px',
                background: 'none',
                // Use primary color for text and outline/tabs
                color: COLORS.PRIMARY,
                border: 'none',
                // Use secondary color for minor accents (active tab border)
                borderBottom: currentTab === 'home' ? `3px solid ${COLORS.SECONDARY}` : 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: "'Roboto', sans-serif",
                opacity: currentTab === 'home' ? 1 : 0.7
              }}
            >
              home
            </button>
            {/* Change the playlist tab title from ‘my playlists’ to ‘playlists’ */}
            <button
              onClick={() => { setCurrentTab('playlists'); setViewingPlaylist(null); }}
              style={{
                padding: '10px 30px',
                background: 'none',
                color: COLORS.PRIMARY,
                border: 'none',
                borderBottom: currentTab === 'playlists' ? `3px solid ${COLORS.SECONDARY}` : 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: "'Roboto', sans-serif",
                opacity: currentTab === 'playlists' ? 1 : 0.7
              }}
            >
              playlists
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', padding: '20px' }}>
        {/* --- TAB CONTENT: HOME (with Search) --- */}
        {currentTab === 'home' && (
          <div>
            <form onSubmit={handleSearch} style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center' }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search dances..." style={{ padding: '12px', width: '250px', borderRadius: '4px 0 0 4px', border: `1px solid ${COLORS.PRIMARY}`, fontFamily: "'Roboto', sans-serif", outline: 'none', color: COLORS.PRIMARY }} />
              <button type="submit" style={{ padding: '12px 20px', backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', borderRadius: '0 4px 4px 0', fontWeight: 'bold', fontFamily: "'Roboto', sans-serif", cursor: 'pointer' }}>GO</button>
            </form>

            {results.length > 0 && (
              <div style={{ backgroundColor: COLORS.WHITE, padding: '10px', borderRadius: '12px', textAlign: 'left', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                {results.map(d => (
                  <div key={d.id} onClick={() => setSelectedDance(d)} style={{ padding: '15px', borderBottom: `1px solid ${COLORS.PRIMARY}20`, cursor: 'pointer' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', color: COLORS.PRIMARY }}>{d.title}</div>
                    <div style={{ fontSize: '13px', color: COLORS.SECONDARY }}>{d.songTitle} - {d.songArtist}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB CONTENT: PLAYLISTS --- */}
        {currentTab === 'playlists' && (
          <div style={{ textAlign: 'left' }}>
            {/* Allow the user to click on each playlist, similar to how a music app works */}
            {!viewingPlaylist ? (
              // Main Playlist View: List of Playlists
              <div>
                {Object.keys(playlists).map(listName => (
                  <div
                    key={listName}
                    onClick={() => setViewingPlaylist(listName)}
                    style={{
                      backgroundColor: COLORS.WHITE,
                      padding: '20px',
                      margin: '10px 0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: COLORS.PRIMARY, margin: 0 }}>{listName}</h2>
                    <span style={{ color: COLORS.SECONDARY, fontWeight: 'bold' }}>{playlists[listName].length} dances</span>
                  </div>
                ))}
              </div>
            ) : (
              // Detail View: Dances inside a specific playlist
              <div>
                <button onClick={() => setViewingPlaylist(null)} style={{ background: 'none', color: COLORS.PRIMARY, border: 'none', padding: '10px 0', cursor: 'pointer', marginBottom: '20px', fontFamily: "'Roboto', sans-serif", fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  ← Back to Playlists
                </button>
                <h2 style={{ fontSize: '1.5rem', borderBottom: `1px solid ${COLORS.PRIMARY}40`, paddingBottom: '10px', fontWeight: 700, color: COLORS.PRIMARY }}>{viewingPlaylist}</h2>
                {playlists[viewingPlaylist].length === 0 ? (
                  <p style={{ opacity: 0.5, fontStyle: 'italic', color: COLORS.PRIMARY }}>No dances added yet.</p>
                ) : (
                  playlists[viewingPlaylist].map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: COLORS.WHITE, padding: '12px', margin: '8px 0', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <div onClick={() => setSelectedDance(d)} style={{ flex: 1, cursor: 'pointer' }}>
                        <div style={{ fontWeight: 'bold', color: COLORS.PRIMARY }}>{d.title}</div>
                        <div style={{ fontSize: '12px', color: COLORS.SECONDARY }}>{d.difficultyLevel} • {d.counts}c</div>
                      </div>
                      <button onClick={() => removeFromPlaylist(d.id, viewingPlaylist)} style={{ background: 'none', color: COLORS.SECONDARY, border: `1px solid ${COLORS.SECONDARY}`, padding: '5px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>REMOVE</button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}