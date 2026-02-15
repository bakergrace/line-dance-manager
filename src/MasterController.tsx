import { useState, useEffect, useCallback } from 'react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged
} from "firebase/auth";
import type { User } from "firebase/auth"; 
import { GoogleAuthProvider } from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from "firebase/firestore";

// --- IMAGES ---
import bootstepperLogo from './bootstepper-logo.png';
import bootstepperMobileLogo from './bootstepper-logo-mobile.png';

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDJKpgrqvKlzcaIf32meAvtMraF01As4o0",
  authDomain: "bootstepper-a5fb5.firebaseapp.com",
  projectId: "bootstepper-a5fb5",
  storageBucket: "bootstepper-a5fb5.firebasestorage.app",
  messagingSenderId: "602764031635",
  appId: "1:602764031635:web:169206d1a0b72bf209ff66",
  measurementId: "G-WV254NV2C7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

const API_KEY = import.meta.env.VITE_BOOTSTEPPER_API_KEY as string;
const BASE_URL = '/api'; 

const COLORS = {
  BACKGROUND: '#EEEBE8',
  PRIMARY: '#36649A',
  SECONDARY: '#D99AB1',
  WHITE: '#FFFFFF',
  NEUTRAL: '#9E9E9E'  
};

const STORAGE_KEYS = {
  PERMANENT: 'bootstepper_permanent_storage',
  RECENT_SEARCHES: 'bootstepper_recent_searches'
};

// --- INTERFACES ---
export interface Dance {
  id: string;
  title: string;
  difficultyLevel: string;
  counts: number;
  songTitle: string;
  songArtist: string;
  stepSheetContent?: any[]; 
  originalStepSheetUrl?: string;
  stepSheetId?: string;
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
  stepSheetId?: string;
  stepsheet?: string;
  originalStepSheetUrl?: string; 
  danceSongs?: Array<{
    song?: { title?: string; artist?: string; };
  }>;
}

// --- ROUTING TYPES ---
type ReturnPath = 
  | { type: 'SEARCH' }
  | { type: 'PLAYLIST_DETAIL'; name: string };

type AppView = 
  | { type: 'SEARCH' }
  | { type: 'PLAYLISTS_LIST' }
  | { type: 'PLAYLIST_DETAIL'; name: string }
  | { type: 'ACCOUNT' }
  | { type: 'DANCE_PROFILE'; dance: Dance; returnPath: ReturnPath };

// --- HELPERS ---

// FIX #2: Regex to remove things like (L), (W), (A) from titles
const cleanTitle = (title: string) => {
  if (!title) return "Untitled";
  return title.replace(/\s*\([a-zA-Z0-9\s]+\)$/, '').trim();
};

const getDifficultyColor = (level: string) => {
  const l = (level || '').toLowerCase();
  if (l.includes('absolute')) return '#00BCD4';     // Cyan
  if (l.includes('beginner')) return '#4CAF50';     // Green
  if (l.includes('improver')) return '#FF9800';     // Orange
  if (l.includes('intermediate')) return '#F44336'; // Red
  if (l.includes('advanced')) return '#9C27B0';     // Purple
  return COLORS.NEUTRAL; 
};

// FIX #3: The Color Legend Component
const DifficultyLegend = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    gap: '12px', 
    padding: '15px', 
    backgroundColor: COLORS.BACKGROUND, 
    borderTop: `1px solid ${COLORS.PRIMARY}20`,
    flexWrap: 'wrap',
    fontSize: '11px',
    color: '#666'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#00BCD4' }} /> Absolute</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4CAF50' }} /> Beginner</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#FF9800' }} /> Improver</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#F44336' }} /> Interm.</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#9C27B0' }} /> Advanced</div>
  </div>
);

// --- MAIN CONTROLLER ---
export default function MasterController() {
  const [currentView, setCurrentView] = useState<AppView>({ type: 'SEARCH' });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Dance[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // FIX #4: Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [playlists, setPlaylists] = useState<{ [key: string]: Dance[] }>({
      "dances i know": [],
      "dances i kinda know": [],
      "dances i want to know": []
  });

  // --- LIFECYCLE & SYNC ---
  useEffect(() => {
    try {
      const localPlaylists = localStorage.getItem(STORAGE_KEYS.PERMANENT);
      if (localPlaylists) setPlaylists(JSON.parse(localPlaylists));
      const localRecent = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
      if (localRecent) setRecentSearches(JSON.parse(localRecent));
    } catch (e) { console.error("Load Error", e); }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setPlaylists(docSnap.data() as { [key: string]: Dance[] });
          } else {
            await setDoc(docRef, playlists);
          }
        } catch (error) { console.error("Sync Error", error); }
      } 
      setIsDataLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem(STORAGE_KEYS.PERMANENT, JSON.stringify(playlists));
      if (user) {
        setDoc(doc(db, "users", user.uid), playlists).catch(console.error);
      }
    }
  }, [playlists, user, isDataLoaded]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // --- NAVIGATION ---
  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    window.scrollTo(0,0);
  };

  const handleBack = () => {
    if (currentView.type === 'DANCE_PROFILE') {
      const path = currentView.returnPath;
      if (path.type === 'SEARCH') {
        setCurrentView({ type: 'SEARCH' });
      } else if (path.type === 'PLAYLIST_DETAIL') {
        if (playlists[path.name]) {
          setCurrentView({ type: 'PLAYLIST_DETAIL', name: path.name });
        } else {
          setCurrentView({ type: 'PLAYLISTS_LIST' });
        }
      }
    } else if (currentView.type === 'PLAYLIST_DETAIL') {
      navigateTo({ type: 'PLAYLISTS_LIST' });
    }
  };

  // --- FETCHING LOGIC (FIX #1: Soft Fail) ---
  const loadDanceDetails = async (basicDance: Dance, source: ReturnPath) => {
    if (!basicDance || !basicDance.id) return;

    setLoading(true);

    // Prepare default "safe" object in case fetch fails
    let fullDanceData = { ...basicDance };

    try {
      const detailsRes = await fetch(`${BASE_URL}/dances/getById?id=${basicDance.id}`, {
         headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' }
      });
      
      if (detailsRes.ok) {
        const details = await detailsRes.json();
        fullDanceData = { ...fullDanceData, ...details }; // Merge details
        
        const sheetId = details.stepSheetId || basicDance.stepSheetId || basicDance.id;
        const sheetRes = await fetch(`${BASE_URL}/dances/getStepSheet?id=${sheetId}`, {
          headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' }
        });
        
        if (sheetRes.ok) {
          const sheetData = await sheetRes.json();
          if (Array.isArray(sheetData.content)) {
            fullDanceData.stepSheetContent = sheetData.content;
          }
        }
      }
    } catch (err) {
      console.warn("Details fetch failed, showing basic info", err);
      // We do NOT alert/return here anymore. We proceed with basic data.
    }

    // Always navigate, even if fetch failed partially
    setCurrentView({ 
      type: 'DANCE_PROFILE', 
      dance: fullDanceData, 
      returnPath: source 
    });
    setLoading(false);
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery) return;
    setLoading(true);
    setCurrentPage(1); // Reset pagination on new search
    
    const updatedRecents = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updatedRecents);
    localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updatedRecents));

    try {
      const res = await fetch(`${BASE_URL}/dances/search?query=${encodeURIComponent(searchQuery)}&limit=50`, {
        headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      const data = await res.json();
      const items = (data.items || []) as ApiRawItem[];
      
      if (items.length === 0) alert("No results found.");

      setResults(items.map(item => ({
        id: item.id,
        title: cleanTitle(item.title), // Applied Cleaner
        difficultyLevel: item.difficultyLevel || "unknown",
        counts: item.counts ?? item.count ?? 0,
        wallCount: Number(item.walls ?? item.wallCount ?? 0),
        originalStepSheetUrl: item.originalStepSheetUrl,
        stepSheetId: item.stepSheetId,
        songTitle: item.danceSongs?.[0]?.song?.title || "unknown song",
        songArtist: item.danceSongs?.[0]?.song?.artist || "unknown artist"
      })));
    } catch (err) { 
      console.error(err);
      alert("Search failed. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  const addToPlaylist = useCallback((dance: Dance, listName: string) => {
    if (!dance || !listName) return;
    setActiveBtn(listName);
    setPlaylists(prev => {
      const currentList = prev[listName] || [];
      if (currentList.some(item => item.id === dance.id)) return prev;
      return { ...prev, [listName]: [...currentList, { ...dance }] };
    });
    setTimeout(() => setActiveBtn(null), 1000);
  }, []);

  const removeFromPlaylist = (danceId: string, listName: string) => {
    setPlaylists(prev => ({
      ...prev,
      [listName]: (prev[listName] || []).filter(d => d.id !== danceId)
    }));
  };

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const name = newPlaylistName.trim().toLowerCase();
    if (playlists[name]) return alert("Exists!");
    setPlaylists(prev => ({ ...prev, [name]: [] }));
    setNewPlaylistName('');
  };

  const deletePlaylist = (listName: string) => {
    if (confirm(`Delete "${listName}"?`)) {
      setPlaylists(prev => {
        const newState = { ...prev };
        delete newState[listName];
        return newState;
      });
      if (currentView.type === 'PLAYLIST_DETAIL' && currentView.name === listName) {
        navigateTo({ type: 'PLAYLISTS_LIST' });
      }
    }
  };

  const handleAuth = async (isLogin: boolean) => {
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) { alert(err.message); }
  };
  const handleGoogle = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (err: any) { alert(err.message); }
  };

  const getLogoSize = () => isScrolled ? '60px' : (isMobile ? '120px' : '360px');

  // --- RENDER HELPERS ---
  const renderDanceProfile = (dance: Dance) => {
    if (!dance) return <div>Data Missing</div>;
    
    const title = cleanTitle(dance.title || 'Untitled').toLowerCase();
    const level = (dance.difficultyLevel || 'unknown').toLowerCase();
    const song = (dance.songTitle || 'Unknown').toLowerCase();
    const artist = (dance.songArtist || 'Unknown').toLowerCase();

    return (
      <div style={{ backgroundColor: COLORS.WHITE, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <button onClick={handleBack} style={{ background: 'none', color: COLORS.PRIMARY, border: `1px solid ${COLORS.PRIMARY}`, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}>← Back</button>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '8px', fontWeight: 800, color: '#333' }}>{title}</h1>
        <div style={{ color: COLORS.SECONDARY, fontWeight: 'bold', marginBottom: '24px', fontSize: '0.95rem' }}>{level} • {dance.counts || 0} counts • {dance.wallCount || 0} walls</div>
        <div style={{ backgroundColor: '#F5F5F7', padding: '15px', borderRadius: '8px', marginBottom: '30px' }}><p style={{ margin: '0 0 5px 0' }}><strong>Song:</strong> {song}</p><p style={{ margin: 0 }}><strong>Artist:</strong> {artist}</p></div>
        
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#555' }}>Add to Playlist:</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.keys(playlists).map(name => {
              const isAdded = playlists[name].some(d => d.id === dance.id);
              return (
                <button key={name} onClick={() => addToPlaylist(dance, name)} disabled={isAdded} style={{ flex: '1 1 auto', backgroundColor: isAdded ? '#81C784' : (activeBtn === name ? COLORS.SECONDARY : COLORS.PRIMARY), color: COLORS.WHITE, border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: '600', cursor: isAdded ? 'default' : 'pointer' }}>{isAdded ? '✓ Added' : name}</button>
              );
            })}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${COLORS.PRIMARY}30`, paddingTop: '20px' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '15px', color: COLORS.PRIMARY }}>Step Sheet</h3>
          <div style={{ backgroundColor: '#FAFAFA', padding: '20px', borderRadius: '8px', fontSize: '14px', color: '#333', border: '1px solid #EEE' }}>
            {dance.stepSheetContent && dance.stepSheetContent.length > 0 ? (
              dance.stepSheetContent.map((row: any, idx: number) => (
                <div key={idx} style={{ marginBottom: '8px' }}>
                  {(row?.heading || row?.title) && <div style={{ fontWeight: 'bold', color: COLORS.PRIMARY, marginTop: '12px', textTransform: 'uppercase' }}>{row.heading || row.title}</div>}
                  {(row?.text || row?.description || row?.instruction) && <div style={{ display: 'flex' }}>{row?.counts && <span style={{ fontWeight: 'bold', width: '40px', flexShrink: 0 }}>{row.counts}</span>}<span>{row.text || row.description || row.instruction}</span></div>}
                  {row?.note && <div style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#777', marginLeft: '40px' }}>Note: {row.note}</div>}
                </div>
              ))
            ) : <div style={{ opacity: 0.5 }}>Step details unavailable via API.</div>}
          </div>
          {dance.originalStepSheetUrl && <div style={{ marginTop: '20px', textAlign: 'center' }}><a href={dance.originalStepSheetUrl} target="_blank" rel="noreferrer" style={{ color: COLORS.PRIMARY, fontWeight: 'bold' }}>View Original Sheet ↗</a></div>}
        </div>
      </div>
    );
  };

  // --- RENDER ---
  // Pagination Math
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentResults = results.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(results.length / itemsPerPage);

  return (
    <div style={{ backgroundColor: COLORS.BACKGROUND, minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ position: 'sticky', top: 0, backgroundColor: COLORS.BACKGROUND, zIndex: 10, paddingBottom: '10px', borderBottom: isScrolled ? `1px solid ${COLORS.PRIMARY}20` : 'none' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', padding: isScrolled ? '10px' : '20px' }}>
          <img src={isMobile ? bootstepperMobileLogo : bootstepperLogo} alt="logo" style={{ maxHeight: getLogoSize(), width: 'auto', margin: '0 auto', display: 'block', transition: '0.3s' }} />
          {currentView.type !== 'DANCE_PROFILE' && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
              <button onClick={() => navigateTo({ type: 'SEARCH' })} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: currentView.type === 'SEARCH' ? `3px solid ${COLORS.SECONDARY}` : 'none', color: COLORS.PRIMARY, fontWeight: 'bold', cursor: 'pointer' }}>Search</button>
              <button onClick={() => navigateTo({ type: 'PLAYLISTS_LIST' })} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: currentView.type === 'PLAYLISTS_LIST' || currentView.type === 'PLAYLIST_DETAIL' ? `3px solid ${COLORS.SECONDARY}` : 'none', color: COLORS.PRIMARY, fontWeight: 'bold', cursor: 'pointer' }}>Playlists</button>
              <button onClick={() => navigateTo({ type: 'ACCOUNT' })} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: currentView.type === 'ACCOUNT' ? `3px solid ${COLORS.SECONDARY}` : 'none', color: COLORS.PRIMARY, fontWeight: 'bold', cursor: 'pointer' }}>Account</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
        
        {/* GLOBAL LOADER */}
        {loading && <div style={{ textAlign: 'center', padding: '40px', fontSize: '1.2rem', color: COLORS.PRIMARY, fontWeight: 'bold' }}>Finding dances...</div>}

        {!loading && (
          <>
            {currentView.type === 'DANCE_PROFILE' && renderDanceProfile(currentView.dance)}

            {currentView.type === 'SEARCH' && (
              <div style={{ paddingBottom: '60px' }}> {/* Space for Legend */}
                <form onSubmit={(e) => { e.preventDefault(); handleSearch(query); }} style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search dances..." style={{ padding: '12px', width: '250px', borderRadius: '4px 0 0 4px', border: `1px solid ${COLORS.PRIMARY}`, outline: 'none', fontSize: '16px' }} />
                  <button type="submit" disabled={loading} style={{ padding: '12px 20px', backgroundColor: loading ? COLORS.NEUTRAL : COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', borderRadius: '0 4px 4px 0', fontWeight: 'bold' }}>Go</button>
                </form>
                {recentSearches.length > 0 && results.length === 0 && (
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <span style={{ fontSize: '12px', color: COLORS.SECONDARY, marginRight: '10px' }}>Recent:</span>
                    {recentSearches.map(s => <button key={s} onClick={() => { setQuery(s); handleSearch(s); }} style={{ background: 'none', border: 'none', color: COLORS.PRIMARY, textDecoration: 'underline', cursor: 'pointer', margin: '0 5px', fontSize: '13px' }}>{s}</button>)}
                  </div>
                )}
                
                {/* RESULTS LIST (PAGINATED) */}
                {currentResults.map(d => (
                  <div key={d.id} onClick={() => loadDanceDetails(d, { type: 'SEARCH' })} style={{ backgroundColor: COLORS.WHITE, padding: '15px', borderRadius: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div><div style={{ fontWeight: 'bold', color: COLORS.PRIMARY, fontSize: '1.1rem' }}>{d.title}</div><div style={{ fontSize: '13px', color: COLORS.SECONDARY }}>{d.songTitle} — {d.songArtist}</div></div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getDifficultyColor(d.difficultyLevel) }} />
                  </div>
                ))}

                {/* PAGINATION CONTROLS */}
                {results.length > itemsPerPage && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px', alignItems: 'center' }}>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                      disabled={currentPage === 1}
                      style={{ padding: '8px 16px', background: COLORS.WHITE, border: `1px solid ${COLORS.PRIMARY}`, borderRadius: '6px', cursor: currentPage === 1 ? 'default' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, color: COLORS.PRIMARY, fontWeight: 'bold' }}
                    >
                      ← Prev
                    </button>
                    <span style={{ fontWeight: 'bold', color: '#666' }}>Page {currentPage} of {totalPages}</span>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                      disabled={currentPage === totalPages}
                      style={{ padding: '8px 16px', background: COLORS.WHITE, border: `1px solid ${COLORS.PRIMARY}`, borderRadius: '6px', cursor: currentPage === totalPages ? 'default' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, color: COLORS.PRIMARY, fontWeight: 'bold' }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentView.type === 'PLAYLISTS_LIST' && (
              <div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}><input value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} placeholder="New playlist name..." style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.PRIMARY}`, fontSize: '16px' }} /><button onClick={createPlaylist} style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '20px', fontWeight: 'bold' }}>+</button></div>
                {Object.keys(playlists).map(name => (
                  <div key={name} style={{ backgroundColor: COLORS.WHITE, padding: '20px', borderRadius: '12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div onClick={() => navigateTo({ type: 'PLAYLIST_DETAIL', name })} style={{ flex: 1, cursor: 'pointer' }}><h2 style={{ fontSize: '1.2rem', margin: 0, color: COLORS.PRIMARY }}>{name}</h2><span style={{ fontSize: '12px', color: COLORS.SECONDARY }}>{playlists[name].length} dances</span></div>
                    <button onClick={() => deletePlaylist(name)} style={{ background: 'none', border: 'none', color: COLORS.SECONDARY, fontSize: '24px' }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {currentView.type === 'PLAYLIST_DETAIL' && (
              <div>
                <button onClick={handleBack} style={{ background: 'none', color: COLORS.PRIMARY, border: 'none', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px', fontSize: '16px' }}>← Back to Playlists</button>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', color: COLORS.PRIMARY }}>{currentView.name}</h2>
                {playlists[currentView.name] ? playlists[currentView.name].map(d => (
                  <div key={`${currentView.name}-${d.id}`} style={{ backgroundColor: COLORS.WHITE, padding: '12px', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div onClick={() => loadDanceDetails(d, { type: 'PLAYLIST_DETAIL', name: currentView.name })} style={{ cursor: 'pointer', flex: 1 }}><div style={{ fontWeight: 'bold', color: COLORS.PRIMARY }}>{cleanTitle(d.title).toLowerCase()}</div><div style={{ fontSize: '12px', color: COLORS.SECONDARY }}>{d.songTitle.toLowerCase()}</div></div>
                    <button onClick={() => removeFromPlaylist(d.id, currentView.name)} style={{ color: COLORS.SECONDARY, background: 'none', border: `1px solid ${COLORS.SECONDARY}`, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '10px' }}>Remove</button>
                  </div>
                )) : <div style={{ color: 'red' }}>Error: Playlist not found.</div>}
              </div>
            )}

            {currentView.type === 'ACCOUNT' && (
              <div style={{ backgroundColor: COLORS.WHITE, padding: '30px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                {user ? (
                  <div style={{ textAlign: 'center' }}><p>Signed in as: <b>{user.email}</b></p><button onClick={() => signOut(auth)} style={{ backgroundColor: 'transparent', color: COLORS.PRIMARY, border: `2px solid ${COLORS.PRIMARY}`, padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Sign Out</button></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <button onClick={handleGoogle} style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold' }}>Sign in with Google</button>
                    <div style={{ borderTop: `1px solid ${COLORS.PRIMARY}40`, margin: '10px 0' }}></div>
                    <form onSubmit={() => handleAuth(!isLoginView ? false : true)} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.PRIMARY}` }} required />
                      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.PRIMARY}` }} required />
                      <button type="submit" onClick={(e) => { e.preventDefault(); handleAuth(isLoginView); }} style={{ backgroundColor: 'transparent', color: COLORS.PRIMARY, border: `2px solid ${COLORS.PRIMARY}`, padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>{isLoginView ? 'Login' : 'Sign Up'}</button>
                    </form>
                    <div onClick={() => setIsLoginView(!isLoginView)} style={{ textAlign: 'center', fontSize: '12px', cursor: 'pointer', color: COLORS.SECONDARY }}>{isLoginView ? 'Need an account? Sign up' : 'Have an account? Log in'}</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* PERMANENT FOOTER LEGEND (FIX #3) */}
      {currentView.type === 'SEARCH' && !loading && <div style={{ position: 'fixed', bottom: 0, width: '100%', zIndex: 100 }}><DifficultyLegend /></div>}
    </div>
  );
}