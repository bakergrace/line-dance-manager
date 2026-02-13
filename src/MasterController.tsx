import React, { useState, useEffect } from 'react';
import bootstepperLogo from './bootstepper-logo.png';

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

const COLORS = {
  BACKGROUND: '#EEEBE8',
  PRIMARY: '#36649A',
  SECONDARY: '#D99AB1',
  WHITE: '#FFFFFF',
};

export default function MasterController() {
  const [currentTab, setCurrentTab] = useState<'home' | 'playlists'>('home');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Dance[]>([]);
  const [selectedDance, setSelectedDance] = useState<Dance | null>(null);
  const [viewingPlaylist, setViewingPlaylist] = useState<string | null>(null);

  const [playlists, setPlaylists] = useState<{ [key: string]: Dance[] }>(() => {
    const saved = localStorage.getItem('dance_mgr_v14');
    return saved ? JSON.parse(saved) : {
      "dances i know": [],
      "dances i kinda know": [],
      "dances i want to know": []
    };
  });

  useEffect(() => {
    localStorage.setItem('dance_mgr_v14', JSON.stringify(playlists));
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
          difficultyLevel: item.difficultyLevel || "unknown",
          counts: item.counts ?? item.count ?? 0,
          wallCount: Number(rawWalls),
          stepSheetUrl: item.stepSheetUrl ?? item.stepsheet ?? "",
          songTitle: item.danceSongs?.[0]?.song?.title || "unknown song",
          songArtist: item.danceSongs?.[0]?.song?.artist || "unknown artist"
        };
      });
      setResults(mapped);
    } catch (err) {
      console.error("search error", err);
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
      <div style={{ backgroundColor: COLORS.BACKGROUND, minHeight: '100vh', color: COLORS.PRIMARY, padding: '20px', fontFamily: "'Roboto', sans-serif" }}>
        <button onClick={() => setSelectedDance(null)} style={{ background: 'none', color: COLORS.PRIMARY, border: `1px solid ${COLORS.PRIMARY}`, padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', marginBottom: '30px', fontFamily: "'Roboto', sans-serif" }}>
          ← back
        </button>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: COLORS.WHITE, padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '10px', fontWeight: 700, fontStyle: 'normal', color: COLORS.PRIMARY }}>{selectedDance.title.toLowerCase()}</h1>
          <div style={{ color: COLORS.SECONDARY, fontWeight: 'bold', marginBottom: '20px' }}>
            {selectedDance.difficultyLevel.toLowerCase()} • {selectedDance.counts} counts • {selectedDance.wallCount} walls
          </div>
          <p><strong>song:</strong> {selectedDance.songTitle.toLowerCase()}</p>
          <p><strong>artist:</strong> {selectedDance.songArtist.toLowerCase()}</p>
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
      {/* HEADER: Sticky positioning as requested */}
      <div style={{ position: 'sticky', top: 0, backgroundColor: COLORS.BACKGROUND, zIndex: 10, paddingBottom: '10px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', padding: '20px' }}>
          
          {/* LOGO: Doubled size to 360px */}
          <img 
            src={bootstepperLogo} 
            alt="bootstepper logo" 
            style={{ maxHeight: '360px', width: 'auto', marginBottom: '20px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} 
          />

          <div style={{ display: 'flex', justifyContent: 'center', borderBottom: `1px solid ${COLORS.PRIMARY}40` }}>
            <button
              onClick={() => { setCurrentTab('home'); setViewingPlaylist(null); }}
              style={{
                padding: '10px 30px',
                background: 'none',
                color: COLORS.PRIMARY,
                border: 'none',
                borderBottom: currentTab === 'home' ? `3px solid ${COLORS.SECONDARY}` : 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: "'Roboto', sans-serif",
                opacity: currentTab === 'home' ? 1 : 0.7
              }}
            >
              home
            </button>
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
        {currentTab === 'home' && (
          <div>
            <form onSubmit={handleSearch} style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center' }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search dances..." style={{ padding: '12px', width: '250px', borderRadius: '4px 0 0 4px', border: `1px solid ${COLORS.PRIMARY}`, fontFamily: "'Roboto', sans-serif", outline: 'none', color: COLORS.PRIMARY }} />
              <button type="submit" style={{ padding: '12px 20px', backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', borderRadius: '0 4px 4px 0', fontWeight: 'bold', fontFamily: "'Roboto', sans-serif", cursor: 'pointer' }}>go</button>
            </form>

            {results.length > 0 && (
              <div style={{ backgroundColor: COLORS.WHITE, padding: '10px', borderRadius: '12px', textAlign: 'left', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                {results.map(d => (
                  <div key={d.id} onClick={() => setSelectedDance(d)} style={{ padding: '15px', borderBottom: `1px solid ${COLORS.PRIMARY}20`, cursor: 'pointer' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', color: COLORS.PRIMARY }}>{d.title.toLowerCase()}</div>
                    <div style={{ fontSize: '13px', color: COLORS.SECONDARY }}>{d.songTitle.toLowerCase()} - {d.songArtist.toLowerCase()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentTab === 'playlists' && (
          <div style={{ textAlign: 'left' }}>
            {!viewingPlaylist ? (
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
              <div>
                <button onClick={() => setViewingPlaylist(null)} style={{ background: 'none', color: COLORS.PRIMARY, border: 'none', padding: '10px 0', cursor: 'pointer', marginBottom: '20px', fontFamily: "'Roboto', sans-serif", fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  ← back to playlists
                </button>
                <h2 style={{ fontSize: '1.5rem', borderBottom: `1px solid ${COLORS.PRIMARY}40`, paddingBottom: '10px', fontWeight: 700, color: COLORS.PRIMARY }}>{viewingPlaylist}</h2>
                {playlists[viewingPlaylist].length === 0 ? (
                  <p style={{ opacity: 0.5, fontStyle: 'italic', color: COLORS.PRIMARY }}>no dances added yet.</p>
                ) : (
                  playlists[viewingPlaylist].map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: COLORS.WHITE, padding: '12px', margin: '8px 0', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <div onClick={() => setSelectedDance(d)} style={{ flex: 1, cursor: 'pointer' }}>
                        <div style={{ fontWeight: 'bold', color: COLORS.PRIMARY }}>{d.title.toLowerCase()}</div>
                        <div style={{ fontSize: '12px', color: COLORS.SECONDARY }}>{d.difficultyLevel.toLowerCase()} • {d.counts}c</div>
                      </div>
                      <button onClick={() => removeFromPlaylist(d.id, viewingPlaylist)} style={{ background: 'none', color: COLORS.SECONDARY, border: `1px solid ${COLORS.SECONDARY}`, padding: '5px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>remove</button>
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