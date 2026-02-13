import { useState, useEffect } from 'react';

// --- THE DATA PLAN ---
export interface Dance {
  id: string;
  title: string;           // Field 1: Name
  difficultyLevel: string; // Field 2: Difficulty
  counts: number;          // Field 3: Counts
  songTitle: string;       // Field 4: Song Name
  songArtist: string;      // Field 5: Artist
  stepSheetUrl: string;    // Field 6: Stepsheet Shortcut
  wallCount: number;       // Field 7: Number of Walls
}

// --- THE LOGIC ENGINE ---
const API_KEY = "AT6C4B34QN8J6H2RHN8SGKN"; 
const BASE_URL = 'https://cors-anywhere.herokuapp.com/https://api.bootstepper.com';

export default function MasterController() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Dance[]>([]);
  const [selectedDance, setSelectedDance] = useState<Dance | null>(null); // Controls the "Individual Page"
  const [playlists, setPlaylists] = useState<{ [key: string]: Dance[] }>(() => {
    const saved = localStorage.getItem('dance_mgr_v6');
    return saved ? JSON.parse(saved) : { "Dances I Know": [], "Dances I Kinda Know": [], "Dances I Want to Know": [] };
  });

  useEffect(() => {
    localStorage.setItem('dance_mgr_v6', JSON.stringify(playlists));
  }, [playlists]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    try {
      const response = await fetch(`${BASE_URL}/dances/search?query=${encodeURIComponent(query)}&limit=10`, {
        headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      const mapped = (data.items || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        difficultyLevel: item.difficultyLevel || "Unknown",
        counts: item.counts || 0,
        wallCount: item.wallCount || 0, //
        stepSheetUrl: item.stepSheetUrl || "", //
        songTitle: item.danceSongs?.[0]?.song?.title || "Unknown Song",
        songArtist: item.danceSongs?.[0]?.song?.artist || "Unknown Artist"
      }));
      setResults(mapped);
    } catch (err) {
      console.error("Search error", err);
    }
  };

  const addToPlaylist = (dance: Dance, listName: string) => {
    if (playlists[listName].some(d => d.id === dance.id)) return;
    setPlaylists(prev => ({ ...prev, [listName]: [...prev[listName], dance] }));
    setSelectedDance(null); // Return to main view after adding
  };

  // --- VIEW 1: INDIVIDUAL DANCE PAGE ---
  if (selectedDance) {
    return (
      <div style={{ backgroundColor: '#184C78', minHeight: '100vh', color: 'white', padding: '40px', fontFamily: 'Arial, sans-serif' }}>
        <button onClick={() => setSelectedDance(null)} style={{ background: 'none', color: 'white', border: '1px solid white', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', marginBottom: '30px' }}>
          ← Back to Search
        </button>

        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'rgba(255,255,255,0.1)', padding: '40px', borderRadius: '15px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{selectedDance.title}</h1>
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
            <button onClick={() => addToPlaylist(selectedDance, "Dances I Know")} style={{ flex: 1, backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>KNOW</button>
            <button onClick={() => addToPlaylist(selectedDance, "Dances I Kinda Know")} style={{ flex: 1, backgroundColor: '#ca8a04', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>KINDA</button>
            <button onClick={() => addToPlaylist(selectedDance, "Dances I Want to Know")} style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>WANT</button>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW 2: MAIN SEARCH & PLAYLIST VIEW ---
  return (
    <div style={{ backgroundColor: '#184C78', minHeight: '100vh', color: 'white', padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontStyle: 'italic', fontSize: '2.5rem', marginBottom: '30px' }}>BootStepper Manager</h1>
        
        <form onSubmit={handleSearch} style={{ marginBottom: '40px' }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search dances..." style={{ padding: '12px', width: '300px', borderRadius: '4px', border: 'none' }} />
          <button type="submit" style={{ padding: '12px 24px', marginLeft: '10px', backgroundColor: '#fbbf24', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>SEARCH</button>
        </form>

        {results.length > 0 && (
          <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', textAlign: 'left', marginBottom: '40px' }}>
            <p style={{ fontSize: '12px', opacity: 0.5, marginBottom: '10px' }}>CLICK A DANCE FOR FULL DETAILS</p>
            {results.map(d => (
              <div key={d.id} onClick={() => setSelectedDance(d)} style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'background 0.2s' }} className="hover-effect">
                <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{d.title}</div>
                <div style={{ fontSize: '13px', color: '#aaa' }}>{d.songTitle} - {d.songArtist}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {Object.entries(playlists).map(([name, list]) => (
            <div key={name} style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px', textAlign: 'left', minHeight: '300px' }}>
              <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '10px' }}>{name}</h3>
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