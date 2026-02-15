import { useState, useEffect, useCallback } from 'react';

// FIXED: Split imports to satisfy 'verbatimModuleSyntax'
import DanceProfile from './DanceProfile';
import type { Dance } from './DanceProfile';

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

// --- API & CONFIG ---
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
const BASE_URL = '/api'; // Using Vercel rewrite

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

// --- TYPES ---
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

// --- APP STATE TYPES ---
type AppView = 
  | { type: 'SEARCH' }
  | { type: 'PLAYLISTS_LIST' }
  | { type: 'PLAYLIST_DETAIL'; name: string }
  | { type: 'ACCOUNT' }
  | { type: 'DANCE_PROFILE'; dance: Dance; previousView: AppView };

const getDifficultyColor = (level: string) => {
  const l = (level || '').toLowerCase();
  if (l.includes('absolute')) return '#00BCD4';     
  if (l.includes('beginner')) return '#4CAF50';     
  if (l.includes('improver')) return '#FF9800';     
  if (l.includes('intermediate')) return '#F44336'; 
  if (l.includes('advanced')) return '#9C27B0';     
  return COLORS.NEUTRAL; 
};

export default function MasterController() {
  // --- STATE ---
  const [currentView, setCurrentView] = useState<AppView>({ type: 'SEARCH' });
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Dance[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);
  
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

  // --- LIFECYCLE ---
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
        } catch (error) { console.error("Cloud Sync Error", error); }
      } 
      setIsDataLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem(STORAGE_KEYS.PERMANENT, JSON.stringify(playlists));
      if (user) {
        setDoc(doc(db, "users", user.uid), playlists).catch(err => console.error("Save Error", err));
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

  // --- ACTIONS ---

  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    window.scrollTo(0,0);
  };

  const handleBack = () => {
    if (currentView.type === 'DANCE_PROFILE') {
      setCurrentView(currentView.previousView);
    } else if (currentView.type === 'PLAYLIST_DETAIL') {
      navigateTo({ type: 'PLAYLISTS_LIST' });
    }
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery) return;
    setLoading(true);
    
    const updatedRecents = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updatedRecents);
    localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updatedRecents));

    try {
      const res = await fetch(`${BASE_URL}/dances/search?query=${encodeURIComponent(searchQuery)}&limit=50`, {
        headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) throw new Error(`API Status: ${res.status}`);
      const data = await res.json();
      const items = (data.items || []) as ApiRawItem[];
      
      if (items.length === 0) alert("No dances found.");

      setResults(items.map(item => ({
        id: item.id,
        title: item.title,
        difficultyLevel: item.difficultyLevel || "unknown",
        counts: item.counts ?? item.count ?? 0,
        wallCount: Number(item.walls ?? item.wallCount ?? 0),
        originalStepSheetUrl: item.originalStepSheetUrl,
        stepSheetId: item.stepSheetId,
        songTitle: item.danceSongs?.[0]?.song?.title || "unknown song",
        songArtist: item.danceSongs?.[0]?.song?.artist || "unknown artist"
      })));
    } catch (err: any) { 
      console.error("Search Failed", err);
      alert("Search failed. Check your network or API key.");
    } finally {
      setLoading(false);
    }
  };

  const loadDanceDetails = async (basicDance: Dance) => {
    const newView: AppView = { 
      type: 'DANCE_PROFILE', 
      dance: { ...basicDance }, 
      previousView: currentView 
    };
    setCurrentView(newView);

    try {
      const detailsRes = await fetch(`${BASE_URL}/dances/getById?id=${basicDance.id}`, {
         headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' }
      });
      const details = await detailsRes.json();
      const sheetId = details.stepSheetId || basicDance.stepSheetId || basicDance.id;

      const sheetRes = await fetch(`${BASE_URL}/dances/getStepSheet?id=${sheetId}`, {
        headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' }
      });

      if (sheetRes.ok) {
        const sheetData = await sheetRes.json();
        const content = Array.isArray(sheetData.content) ? sheetData.content : [];
        
        setCurrentView(prev => {
            if (prev.type !== 'DANCE_PROFILE' || prev.dance.id !== basicDance.id) return prev;
            return {
                ...prev,
                dance: {
                    ...prev.dance,
                    stepSheetContent: content,
                    originalStepSheetUrl: details.originalStepSheetUrl || prev.dance.originalStepSheetUrl,
                    songTitle: details.danceSongs?.[0]?.song?.title || prev.dance.songTitle,
                    songArtist: details.danceSongs?.[0]?.song?.artist || prev.dance.songArtist
                }
            };
        });
      }
    } catch (err) { console.error("Fetch Error", err); }
  };

  const addToPlaylist = useCallback((dance: Dance, listName: string) => {
    if (!dance || !listName) return;
    setPlaylists(prev => {
      const currentList = prev[listName] || [];
      if (currentList.some(item => item.id === dance.id)) return prev;
      return { ...prev, [listName]: [...currentList, { ...dance }] };
    });
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
    if (playlists[name]) return alert("Playlist exists");
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

  // Auth Handlers
  const handleAuth = async (isLogin: boolean) => {
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) { alert("Auth error: " + err.message); }
  };
  const handleGoogle = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (err: any) { alert("Login failed: " + err.message); }
  };

  const getLogoSize = () => isScrolled ? '60px' : (isMobile ? '120px' : '360px');

  return (
    <div style={{ backgroundColor: COLORS.BACKGROUND, minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
      
      {/* GLOBAL HEADER */}
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
        
        {/* VIEW: DANCE PROFILE */}
        {currentView.type === 'DANCE_PROFILE' && (
          <DanceProfile 
            dance={currentView.dance} 
            playlists={playlists} 
            onBack={handleBack} 
            onAddToPlaylist={addToPlaylist}
            colors={COLORS}
          />
        )}

        {/* VIEW: SEARCH */}
        {currentView.type === 'SEARCH' && (
          <div>
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(query); }} style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search dances..." style={{ padding: '12px', width: '250px', borderRadius: '4px 0 0 4px', border: `1px solid ${COLORS.PRIMARY}`, outline: 'none', fontSize: '16px' }} />
              <button type="submit" disabled={loading} style={{ padding: '12px 20px', backgroundColor: loading ? COLORS.NEUTRAL : COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', borderRadius: '0 4px 4px 0', fontWeight: 'bold' }}>{loading ? '...' : 'Go'}</button>
            </form>

            {recentSearches.length > 0 && results.length === 0 && (
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '12px', color: COLORS.SECONDARY, marginRight: '10px' }}>Recent:</span>
                {recentSearches.map(s => (
                  <button key={s} onClick={() => { setQuery(s); handleSearch(s); }} style={{ background: 'none', border: 'none', color: COLORS.PRIMARY, textDecoration: 'underline', cursor: 'pointer', margin: '0 5px', fontSize: '13px' }}>{s}</button>
                ))}
              </div>
            )}

            {results.map(d => (
              <div key={d.id} onClick={() => loadDanceDetails(d)} style={{ backgroundColor: COLORS.WHITE, padding: '15px', borderRadius: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: COLORS.PRIMARY, fontSize: '1.1rem' }}>{d.title.toLowerCase()}</div>
                  <div style={{ fontSize: '13px', color: COLORS.SECONDARY }}>{d.songTitle.toLowerCase()} — {d.songArtist.toLowerCase()}</div>
                </div>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getDifficultyColor(d.difficultyLevel) }} />
              </div>
            ))}
          </div>
        )}

        {/* VIEW: PLAYLISTS LIST */}
        {currentView.type === 'PLAYLISTS_LIST' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} placeholder="New playlist name..." style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.PRIMARY}`, fontSize: '16px' }} />
              <button onClick={createPlaylist} style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '20px', fontWeight: 'bold' }}>+</button>
            </div>
            {Object.keys(playlists).map(name => (
              <div key={name} style={{ backgroundColor: COLORS.WHITE, padding: '20px', borderRadius: '12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div onClick={() => navigateTo({ type: 'PLAYLIST_DETAIL', name })} style={{ flex: 1, cursor: 'pointer' }}>
                  <h2 style={{ fontSize: '1.2rem', margin: 0, color: COLORS.PRIMARY }}>{name}</h2>
                  <span style={{ fontSize: '12px', color: COLORS.SECONDARY }}>{playlists[name].length} dances</span>
                </div>
                <button onClick={() => deletePlaylist(name)} style={{ background: 'none', border: 'none', color: COLORS.SECONDARY, fontSize: '24px' }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* VIEW: PLAYLIST DETAIL */}
        {currentView.type === 'PLAYLIST_DETAIL' && (
          <div>
            <button onClick={handleBack} style={{ background: 'none', color: COLORS.PRIMARY, border: 'none', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px', fontSize: '16px' }}>← Back to Playlists</button>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', color: COLORS.PRIMARY }}>{currentView.name}</h2>
            
            {playlists[currentView.name] ? (
              playlists[currentView.name].length === 0 ? <div style={{ opacity: 0.5, fontStyle: 'italic' }}>This playlist is empty.</div> :
              playlists[currentView.name].map(d => (
                <div key={`${currentView.name}-${d.id}`} style={{ backgroundColor: COLORS.WHITE, padding: '12px', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div onClick={() => loadDanceDetails(d)} style={{ cursor: 'pointer', flex: 1 }}>
                    <div style={{ fontWeight: 'bold', color: COLORS.PRIMARY }}>{d.title.toLowerCase()}</div>
                    <div style={{ fontSize: '12px', color: COLORS.SECONDARY }}>{d.songTitle.toLowerCase()}</div>
                  </div>
                  <button onClick={() => removeFromPlaylist(d.id, currentView.name)} style={{ color: COLORS.SECONDARY, background: 'none', border: `1px solid ${COLORS.SECONDARY}`, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '10px' }}>Remove</button>
                </div>
              ))
            ) : (
              <div style={{ color: 'red' }}>Error: Playlist not found.</div>
            )}
          </div>
        )}

        {/* VIEW: ACCOUNT */}
        {currentView.type === 'ACCOUNT' && (
          <div style={{ backgroundColor: COLORS.WHITE, padding: '30px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            {user ? (
              <div style={{ textAlign: 'center' }}>
                <p>Signed in as: <b>{user.email}</b></p>
                <button onClick={() => signOut(auth)} style={{ backgroundColor: 'transparent', color: COLORS.PRIMARY, border: `2px solid ${COLORS.PRIMARY}`, padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Sign Out</button>
              </div>
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
      </div>
    </div>
  );
}