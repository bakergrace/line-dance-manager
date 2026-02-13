import { useState, useEffect } from 'react';

// --- THE DATA PLAN ---
export interface Dance {
  id: string;
  title: string;
  difficultyLevel: string;
  counts: number;
  songTitle: string;
  songArtist: string;
}

// --- THE LOGIC ENGINE ---
const API_KEY = "AT6C4B34QN8J6H2RHN8SGKN"; 

// We add a proxy service to help the browser talk to the database
const BASE_URL = 'https://cors-anywhere.herokuapp.com/https://api.bootstepper.com';

export default function MasterController() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Dance[]>([]);
  const [playlists, setPlaylists] = useState<{ [key: string]: Dance[] }>(() => {
    const saved = localStorage.getItem('dance_mgr_v5');
    return saved ? JSON.parse(saved) : { "Dances I Know": [], "Dances I Kinda Know": [], "Dances I Want to Know": [] };
  });

  useEffect(() => {
    localStorage.setItem('dance_mgr_v5', JSON.stringify(playlists));
  }, [playlists]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    
    console.log("Searching for:", query); // Debug log
    
    try {
      const response = await fetch(`${BASE_URL}/dances/search?query=${encodeURIComponent(query)}&limit=10`, {
        method: 'GET',
        headers: { 
          'X-BootStepper-API-Key': API_KEY, //
          'Content-Type': 'application/json' 
        }
      });

      if (!response.ok) {
        // This will pop up if the API key is wrong or the server is down
        alert(`Database Error: ${response.status} ${response.statusText}`);
        return;
      }

      const data = await response.json();
      console.log("Database Response:", data); // Debug log

      const mapped = (data.items || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        difficultyLevel: item.difficultyLevel || "Unknown",
        counts: item.counts || 0,
        songTitle: item.danceSongs?.[0]?.song?.title || "Unknown Song", //
        songArtist: item.danceSongs?.[0]?.song?.artist || "Unknown Artist"
      }));
      
      if (mapped.length === 0) {
        alert("No dances found matching that name.");
      }
      
      setResults(mapped);
    } catch (err) {
      // This will pop up if your computer can't reach the server at all
      alert("Connection Failed: Your browser blocked the request or you are offline.");
      console.error("Search error", err);
    }
  };

  const moveDance = (id: string, listName: string, direction: 'up' | 'down') => {
    const list = [...playlists[listName]];
    const idx = list.findIndex(d => d.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    [list[idx], list[swapIdx]] = [list[swapIdx], list[idx]];
    setPlaylists(prev => ({ ...prev, [listName]: list }));
  };

  // --- THE UI (Deep Blue Theme) ---
  return (
    <div style={{ backgroundColor: '#184C78', minHeight: '100vh', color: 'white', padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontStyle: 'italic', fontSize: '2.5rem', marginBottom: '30px' }}>BootStepper Manager</h1>
        
        <form onSubmit={handleSearch} style={{ marginBottom: '40px' }}>
          <input 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            placeholder="Search dances (e.g. Cupid)..." 
            style={{ padding: '12px', width: '300px', borderRadius: '4px', border: 'none' }} 
          />
          <button type="submit" style={{ padding: '12px 24px', marginLeft: '10px', backgroundColor: '#fbbf24', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
            SEARCH
          </button>
        </form>

        {results.length > 0 && (
          <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', textAlign: 'left', marginBottom: '40px' }}>
            {results.map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{d.title}</div>
                  <div style={{ fontSize: '11px', color: '#fbbf24' }}>{d.difficultyLevel} • {d.counts} Counts</div>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => setPlaylists(p => ({ ...p, "Dances I Know": [...p["Dances I Know"], d] }))} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px' }}>KNOW</button>
                  <button onClick={() => setPlaylists(p => ({ ...p, "Dances I Kinda Know": [...p["Dances I Kinda Know"], d] }))} style={{ backgroundColor: '#ca8a04', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px' }}>KINDA</button>
                  <button onClick={() => setPlaylists(p => ({ ...p, "Dances I Want to Know": [...p["Dances I Want to Know"], d] }))} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px' }}>WANT</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {Object.entries(playlists).map(([name, list]) => (
            <div key={name} style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px', textAlign: 'left', minHeight: '300px' }}>
              <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '10px' }}>{name}</h3>
              {list.map(d => (
                <div key={d.id} style={{ padding: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', margin: '5px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px' }}>{d.title}</span>
                  <div>
                    <button onClick={() => moveDance(d.id, name, 'up')} style={{ background: 'none', color: 'white', border: 'none' }}>↑</button>
                    <button onClick={() => setPlaylists(p => ({ ...p, [name]: p[name].filter(x => x.id !== d.id) }))} style={{ background: 'none', color: 'red', border: 'none' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}