import React, { useState, useEffect, useCallback } from 'react';

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
import { GoogleAuthProvider } from "firebase/auth";
import type { User } from "firebase/auth";

import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from "firebase/firestore";

// --- IMAGES ---
import bootstepperLogo from './bootstepper-logo.png';
import bootstepperMobileLogo from './bootstepper-logo-mobile.png';

// --- DATA DEFINITIONS ---
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

// --- FIREBASE CONFIGURATION ---
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
const BASE_URL = 'https://api.bootstepper.com';

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
  const [currentTab, setCurrentTab] = useState<'home' | 'playlists' | 'account'>('home');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Dance[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedDance, setSelectedDance] = useState<Dance | null>(null);
  const [viewingPlaylist, setViewingPlaylist] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
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

  // --- INITIAL LOAD ---
  useEffect(() => {
    try {
      const localPlaylists = localStorage.getItem(STORAGE_KEYS.PERMANENT);
      if (localPlaylists) setPlaylists(JSON.parse(localPlaylists));
      const localRecent = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
      if (localRecent) setRecentSearches(JSON.parse(localRecent));
    } catch (e) { console.error("Load Error", e); }
  }, []);

  // --- AUTH SYNC ---
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

  // --- SAVE LAYER ---
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

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery) return;
    const updatedRecents = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updatedRecents);
    localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updatedRecents));

    try {
      const res = await fetch(`${BASE_URL}/dances/search?query=${encodeURIComponent(searchQuery)}&limit=50`, {
        headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      const items = (data.items || []) as ApiRawItem[];
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
    } catch (err) { console.error("Search Error", err); }
  };

  const handleSelectDance = async (basicDance: Dance) => {
    setSelectedDance(basicDance);
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
        setSelectedDance(prev => {
          if (!prev) return null;
          return { 
            ...prev, 
            stepSheetContent: content,
            originalStepSheetUrl: details.originalStepSheetUrl || prev.originalStepSheetUrl,
            songTitle: details.danceSongs?.[0]?.song?.title || prev.songTitle,
            songArtist: details.danceSongs?.[0]?.song?.artist || prev.songArtist
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
    }
  };

  const handleGoogleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (err: any) { alert("Login failed: " + err.message); }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLoginView) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) { alert("Auth error: " + err.message); }
  };

  const getLogoSize = () => isScrolled ? '60px' : (isMobile ? '120px' : '360px');

  // --- HELPER COMPONENT FOR STEPS ---
  const renderStepSheet = () => {
    if (!selectedDance?.stepSheetContent || selectedDance.stepSheetContent.length === 0) {
      return <div style={{ opacity: 0.5 }}>loading full steps...</div>;
    }
    return selectedDance.stepSheetContent.map((row, idx) => (
      <div key={idx} style={{ marginBottom: '6px' }}>
        {(row?.heading || row?.title) && <div style={{ fontWeight: 'bold', color: COLORS.PRIMARY, marginTop: '10px' }}>{row.heading || row.title}</div>}
        {(row?.text || row?.description || row?.instruction) && (
          <div style={{ display: 'flex' }}>
            {row?.counts && <span style={{ fontWeight: 'bold', width: '35px', flexShrink: 0 }}>{row.counts}</span>}
            <span>{row.text || row.description || row.instruction}</span>
          </div>
        )}
        {row?.note && <div style={{ fontStyle: 'italic', fontSize: '0.9em', opacity: 0.8 }}>Note: {row.note}</div>}
      </div>
    ));
  };

  // --- RENDER ---
  return (
    <div style={{ backgroundColor: COLORS.BACKGROUND, minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
      
      {/* HEADER SECTION */}
      <div style={{ position: 'sticky', top: 0, backgroundColor: COLORS.BACKGROUND, zIndex: 10, paddingBottom: '10px', borderBottom: isScrolled ? `1px solid ${COLORS.PRIMARY}20` : 'none' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', padding: isScrolled ? '10px' : '20px' }}>
          <img src={isMobile ? bootstepperMobileLogo : bootstepperLogo} alt="logo" style={{ maxHeight: getLogoSize(), width: 'auto', margin: '0 auto', display: 'block', transition: '0.3s' }} />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
            {['home', 'playlists', 'account'].map(t => (
              <button key={t} onClick={() => { setCurrentTab(t as any); setViewingPlaylist(null); setSelectedDance(null); }} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: currentTab === t ? `3px solid ${COLORS.SECONDARY}` : 'none', color: COLORS.PRIMARY, fontWeight: 'bold', cursor: 'pointer' }}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
        {selectedDance ? (
          <div style={{ backgroundColor: COLORS.WHITE, padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <button onClick={() => setSelectedDance(null)} style={{ background: 'none', color: COLORS.PRIMARY, border: `1px solid ${COLORS.PRIMARY}`, padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', marginBottom: '20px' }}>← back</button>
            <h1 style={{ fontSize: '2rem', marginBottom: '10px', fontWeight: 700 }}>{selectedDance?.title?.toLowerCase() || 'loading...'}</h1>
            <div style={{ color: COLORS.SECONDARY, fontWeight: 'bold', marginBottom: '20px' }}>{selectedDance?.difficultyLevel?.toLowerCase()} • {selectedDance?.counts} counts • {selectedDance?.wallCount} walls</div>
            <p><strong>song:</strong> {selectedDance?.songTitle?.toLowerCase()}</p>
            <p><strong>artist:</strong> {selectedDance?.songArtist?.toLowerCase()}</p>
            
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>add to playlist:</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {Object.keys(playlists).map(name => (
                  <button key={name} onClick={() => addToPlaylist(selectedDance, name)} style={{ flex: '1 1 100px', backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{name}</button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '40px', borderTop: `1px solid ${COLORS.PRIMARY}20`, paddingTop: '20px' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>step sheet</h3>
              <div style={{ backgroundColor: '#F9F9F9', padding: '15px', borderRadius: '8px', fontSize: '14px', color: '#333' }}>
                {renderStepSheet()}
              </div>
              {selectedDance?.originalStepSheetUrl && (
                 <div style={{ marginTop: '20px', textAlign: 'center' }}>
                   <a href={selectedDance.originalStepSheetUrl} target="_blank" rel="noreferrer" style={{ color: COLORS.PRIMARY, fontWeight: 'bold' }}>original sheet ↗</a>
                 </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {currentTab === 'home' && (
              <div>
                <form onSubmit={(e) => { e.preventDefault(); handleSearch(query); }} style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search dances..." style={{ padding: '12px', width: '250px', borderRadius: '4px 0 0 4px', border: `1px solid ${COLORS.PRIMARY}`, outline: 'none' }} />
                  <button type="submit" style={{ padding: '12px 20px', backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', borderRadius: '0 4px 4px 0', fontWeight: 'bold' }}>go</button>
                </form>

                {recentSearches.length > 0 && results.length === 0 && (
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <span style={{ fontSize: '12px', color: COLORS.SECONDARY, marginRight: '10px' }}>recent:</span>
                    {recentSearches.map(s => (
                      <button key={s} onClick={() => { setQuery(s); handleSearch(s); }} style={{ background: 'none', border: 'none', color: COLORS.PRIMARY, textDecoration: 'underline', cursor: 'pointer', margin: '0 5px', fontSize: '13px' }}>{s}</button>
                    ))}
                  </div>
                )}

                {results.map(d => (
                  <div key={d.id} onClick={() => handleSelectDance(d)} style={{ backgroundColor: COLORS.WHITE, padding: '15px', borderRadius: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: COLORS.PRIMARY, fontSize: '1.1rem' }}>{d.title.toLowerCase()}</div>
                      <div style={{ fontSize: '13px', color: COLORS.SECONDARY, fontWeight: 'bold' }}>{d.songTitle.toLowerCase()} — {d.songArtist.toLowerCase()}</div>
                    </div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getDifficultyColor(d.difficultyLevel) }} />
                  </div>
                ))}
              </div>
            )}

            {currentTab === 'playlists' && (
              <div>
                {!viewingPlaylist ? (
                  <>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                      <input value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} placeholder="new playlist..." style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.PRIMARY}` }} />
                      <button onClick={createPlaylist} style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '10px 20px', borderRadius: '8px' }}>+</button>
                    </div>
                    {Object.keys(playlists).map(name => (
                      <div key={name} style={{ backgroundColor: COLORS.WHITE, padding: '20px', borderRadius: '12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div onClick={() => setViewingPlaylist(name)} style={{ flex: 1, cursor: 'pointer' }}><h2 style={{ fontSize: '1.2rem', margin: 0 }}>{name}</h2><span style={{ fontSize: '12px', color: COLORS.SECONDARY }}>{playlists[name].length} dances</span></div>
                        <button onClick={() => deletePlaylist(name)} style={{ background: 'none', border: 'none', color: COLORS.SECONDARY, fontSize: '20px' }}>×</button>
                      </div>
                    ))}
                  </>
                ) : (
                  <div>
                    <button onClick={() => setViewingPlaylist(null)} style={{ background: 'none', color: COLORS.PRIMARY, border: 'none', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}>← back</button>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>{viewingPlaylist}</h2>
                    {playlists[viewingPlaylist]?.map(d => (
                      <div key={d.id} style={{ backgroundColor: COLORS.WHITE, padding: '12px', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div onClick={() => handleSelectDance(d)} style={{ cursor: 'pointer' }}>
                          <div style={{ fontWeight: 'bold', color: COLORS.PRIMARY }}>{d.title.toLowerCase()}</div>
                          <div style={{ fontSize: '12px', color: COLORS.SECONDARY }}>{d.songTitle.toLowerCase()} — {d.songArtist.toLowerCase()}</div>
                        </div>
                        <button onClick={() => removeFromPlaylist(d.id, viewingPlaylist)} style={{ color: COLORS.SECONDARY, background: 'none', border: `1px solid ${COLORS.SECONDARY}`, padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentTab === 'account' && (
              <div style={{ backgroundColor: COLORS.WHITE, padding: '30px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                {user ? (
                  <div style={{ textAlign: 'center' }}><p>signed in: <b>{user.email}</b></p><button onClick={() => signOut(auth)} style={{ backgroundColor: 'transparent', color: COLORS.PRIMARY, border: `2px solid ${COLORS.PRIMARY}`, padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>sign out</button></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <button onClick={handleGoogleLogin} style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold' }}>sign in with google</button>
                    <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                      <input type="email" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.PRIMARY}` }} required />
                      <input type="password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.PRIMARY}` }} required />
                      <button type="submit" style={{ backgroundColor: 'transparent', color: COLORS.PRIMARY, border: `2px solid ${COLORS.PRIMARY}`, padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>{isLoginView ? 'login' : 'sign up'}</button>
                    </form>
                    <div onClick={() => setIsLoginView(!isLoginView)} style={{ textAlign: 'center', fontSize: '12px', cursor: 'pointer', color: COLORS.SECONDARY }}>{isLoginView ? 'need an account? sign up' : 'have an account? log in'}</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}