import React, { useState, useEffect } from 'react';

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
  stepSheetContent?: string[]; 
  originalStepSheetUrl?: string;
  stepSheetId?: string; // FIX: Added this missing property
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
const BASE_URL = 'https://cors-anywhere.herokuapp.com/https://api.bootstepper.com';

const COLORS = {
  BACKGROUND: '#EEEBE8',
  PRIMARY: '#36649A',
  SECONDARY: '#D99AB1',
  WHITE: '#FFFFFF',
  SUCCESS: '#4CAF50', 
  WARNING: '#FFC107', 
  DANGER: '#F44336',  
  NEUTRAL: '#9E9E9E'  
};

const STORAGE_KEYS = {
  PERMANENT: 'bootstepper_permanent_storage'
};

const getDifficultyColor = (level: string) => {
  const l = (level || '').toLowerCase();
  if (l.includes('beginner') || l.includes('absolute')) return COLORS.SUCCESS;
  if (l.includes('improver')) return COLORS.WARNING;
  if (l.includes('intermediate') || l.includes('advanced')) return COLORS.DANGER;
  return COLORS.NEUTRAL;
};

export default function MasterController() {
  const [currentTab, setCurrentTab] = useState<'home' | 'playlists' | 'account'>('home');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Dance[]>([]);
  const [selectedDance, setSelectedDance] = useState<Dance | null>(null);
  const [viewingPlaylist, setViewingPlaylist] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  
  // SAFETY LOCK
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [newPlaylistName, setNewPlaylistName] = useState('');

  // LAZY INITIALIZATION
  const [playlists, setPlaylists] = useState<{ [key: string]: Dance[] }>(() => {
    try {
      const local = localStorage.getItem(STORAGE_KEYS.PERMANENT);
      return local ? JSON.parse(local) : {
        "dances i know": [],
        "dances i kinda know": [],
        "dances i want to know": []
      };
    } catch (e) {
      return { "dances i know": [], "dances i kinda know": [], "dances i want to know": [] };
    }
  });

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
        } catch (error) { console.error("Sync Error:", error); }
      } 
      setIsDataLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PERMANENT, JSON.stringify(playlists));
    if (user && isDataLoaded) {
      setDoc(doc(db, "users", user.uid), playlists).catch(console.error);
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

  // --- 1. SEARCH: RELEVANCE SORTING ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    try {
      const res = await fetch(`${BASE_URL}/dances/search?query=${encodeURIComponent(query)}&limit=50`, {
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
        stepSheetId: item.stepSheetId, // Now mapped correctly without error
        songTitle: item.danceSongs?.[0]?.song?.title || "unknown song",
        songArtist: item.danceSongs?.[0]?.song?.artist || "unknown artist"
      })));
    } catch (err) { console.error(err); }
  };

  // --- 2. STEP SHEET: FULL CONTENT & FALLBACK ---
  const handleSelectDance = async (basicDance: Dance) => {
    setSelectedDance(basicDance);

    try {
      // Fetch full details
      const detailsRes = await fetch(`${BASE_URL}/dances/getById?id=${basicDance.id}`, {
         headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' }
      });
      const details = await detailsRes.json();
      
      const officialUrl = details.originalStepSheetUrl || basicDance.originalStepSheetUrl;
      const sheetId = details.stepSheetId || basicDance.stepSheetId;

      let parsedLines: string[] = [];

      // Try fetching via sheet ID first
      if (sheetId) {
        const sheetRes = await fetch(`${BASE_URL}/dances/getStepSheet?id=${sheetId}`, {
          headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' }
        });

        if (sheetRes.ok) {
          const sheetData = await sheetRes.json();
          if (Array.isArray(sheetData.content)) {
            parsedLines = sheetData.content.map((row: any) => row.text || row.heading || "");
          } else if (typeof sheetData.content === 'string') {
            parsedLines = [sheetData.content];
          }
        }
      } 
      // Fallback: If no sheetId, try fetching using the Dance ID directly (sometimes APIs use the same ID)
      else if (basicDance.id) {
         const sheetRes = await fetch(`${BASE_URL}/dances/getStepSheet?id=${basicDance.id}`, {
          headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' }
        });
        if (sheetRes.ok) {
          const sheetData = await sheetRes.json();
          if (Array.isArray(sheetData.content)) {
            parsedLines = sheetData.content.map((row: any) => row.text || row.heading || "");
          }
        }
      }

      // If still no content, set placeholder
      if (parsedLines.length === 0) {
        parsedLines = ["Preview not available via API."];
      }

      setSelectedDance(prev => prev ? ({ 
        ...prev, 
        stepSheetContent: parsedLines,
        originalStepSheetUrl: officialUrl 
      }) : null);

    } catch (err) {
      console.error("error fetching details:", err);
      setSelectedDance(prev => prev ? ({ ...prev, stepSheetContent: ["Error loading step sheet."] }) : null);
    }
  };

  const addToPlaylist = (dance: Dance, listName: string) => {
    if (playlists[listName].some(d => d.id === dance.id)) return;
    setPlaylists(prev => ({ ...prev, [listName]: [...prev[listName], dance] }));
  };

  const removeFromPlaylist = (danceId: string, listName: string) => {
    setPlaylists(prev => ({ ...prev, [listName]: prev[listName].filter(d => d.id !== danceId) }));
  };

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const name = newPlaylistName.trim().toLowerCase();
    if (playlists[name]) {
      alert("playlist already exists");
      return;
    }
    setPlaylists(prev => ({ ...prev, [name]: [] }));
    setNewPlaylistName('');
  };

  const deletePlaylist = (listName: string) => {
    if (confirm(`delete "${listName}"?`)) {
      const newPlaylists = { ...playlists };
      delete newPlaylists[listName];
      setPlaylists(newPlaylists);
    }
  };

  const handleGoogleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (err: any) { alert("login failed: " + err.message); }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLoginView) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) { alert("auth error: " + err.message); }
  };

  if (selectedDance) {
    return (
      <div style={{ backgroundColor: COLORS.BACKGROUND, minHeight: '100vh', color: COLORS.PRIMARY, padding: '20px', fontFamily: "'Roboto', sans-serif", overflowX: 'hidden' }}>
        <button onClick={() => setSelectedDance(null)} style={{ background: 'none', color: COLORS.PRIMARY, border: `1px solid ${COLORS.PRIMARY}`, padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', marginBottom: '30px' }}>← back</button>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: COLORS.WHITE, padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '10px', fontWeight: 700, color: COLORS.PRIMARY }}>{selectedDance.title.toLowerCase()}</h1>
          <div style={{ color: COLORS.SECONDARY, fontWeight: 'bold', marginBottom: '20px' }}>{selectedDance.difficultyLevel.toLowerCase()} • {selectedDance.counts} counts • {selectedDance.wallCount} walls</div>
          <p><strong>song:</strong> {selectedDance.songTitle.toLowerCase()}</p>
          <p><strong>artist:</strong> {selectedDance.songArtist.toLowerCase()}</p>
          
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>add to playlist:</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {Object.keys(playlists).map(name => (
                <button key={name} onClick={() => addToPlaylist(selectedDance, name)} style={{ flex: '1 1 100px', backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{name}</button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '40px', borderTop: `1px solid ${COLORS.PRIMARY}20`, paddingTop: '20px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '15px', color: COLORS.PRIMARY }}>step sheet</h3>
            <div style={{ backgroundColor: '#F9F9F9', padding: '20px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
              {selectedDance.stepSheetContent && selectedDance.stepSheetContent.length > 0 ? (
                selectedDance.stepSheetContent.map((line, index) => (
                  <div key={index} style={{ marginBottom: '4px', minHeight: '1em' }}>{line}</div>
                ))
              ) : (
                <div style={{ fontStyle: 'italic', opacity: 0.6 }}>loading step sheet...</div>
              )}
            </div>

            {selectedDance.originalStepSheetUrl && (
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <a 
                  href={selectedDance.originalStepSheetUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: COLORS.PRIMARY, fontWeight: 'bold', textDecoration: 'none', borderBottom: `2px solid ${COLORS.SECONDARY}` }}
                >
                  view original step sheet ↗
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const getLogoSize = () => { if (isScrolled) return '60px'; return isMobile ? '120px' : '360px'; };

  return (
    <div style={{ backgroundColor: COLORS.BACKGROUND, minHeight: '100vh', fontFamily: "'Roboto', sans-serif", width: '100%', overflowX: 'hidden' }}>
      <div style={{ position: 'sticky', top: 0, backgroundColor: COLORS.BACKGROUND, zIndex: 10, paddingBottom: '10px', borderBottom: isScrolled ? `1px solid ${COLORS.PRIMARY}20` : 'none', boxShadow: isScrolled ? '0 4px 6px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.3s ease', width: '100%' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', padding: isScrolled ? '10px' : '20px' }}>
          <img src={isMobile ? bootstepperMobileLogo : bootstepperLogo} alt="logo" style={{ height: 'auto', maxHeight: getLogoSize(), maxWidth: '90%', marginBottom: isScrolled ? '5px' : '20px', display: 'block', marginLeft: 'auto', marginRight: 'auto', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
          <div style={{ display: 'flex', justifyContent: 'center', borderBottom: `1px solid ${COLORS.PRIMARY}40` }}>
            <button onClick={() => { setCurrentTab('home'); setViewingPlaylist(null); }} style={{ padding: isScrolled ? '5px 20px' : '10px 30px', background: 'none', color: COLORS.PRIMARY, border: 'none', borderBottom: currentTab === 'home' ? `3px solid ${COLORS.SECONDARY}` : 'none', fontWeight: 'bold', cursor: 'pointer', opacity: currentTab === 'home' ? 1 : 0.7, transition: 'all 0.3s ease' }}>home</button>
            <button onClick={() => { setCurrentTab('playlists'); setViewingPlaylist(null); }} style={{ padding: isScrolled ? '5px 20px' : '10px 30px', background: 'none', color: COLORS.PRIMARY, border: 'none', borderBottom: currentTab === 'playlists' ? `3px solid ${COLORS.SECONDARY}` : 'none', fontWeight: 'bold', cursor: 'pointer', opacity: currentTab === 'playlists' ? 1 : 0.7, transition: 'all 0.3s ease' }}>playlists</button>
            <button onClick={() => { setCurrentTab('account'); setViewingPlaylist(null); }} style={{ padding: isScrolled ? '5px 20px' : '10px 30px', background: 'none', color: COLORS.PRIMARY, border: 'none', borderBottom: currentTab === 'account' ? `3px solid ${COLORS.SECONDARY}` : 'none', fontWeight: 'bold', cursor: 'pointer', opacity: currentTab === 'account' ? 1 : 0.7, transition: 'all 0.3s ease' }}>account</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', padding: '20px' }}>
        {currentTab === 'home' && (
          <div>
            <form onSubmit={handleSearch} style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center' }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search..." style={{ padding: '12px', width: '250px', borderRadius: '4px 0 0 4px', border: `1px solid ${COLORS.PRIMARY}`, outline: 'none', color: COLORS.PRIMARY }} />
              <button type="submit" style={{ padding: '12px 20px', backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', borderRadius: '0 4px 4px 0', fontWeight: 'bold', cursor: 'pointer' }}>go</button>
            </form>
            {results.length > 0 && (
              <div style={{ backgroundColor: COLORS.WHITE, padding: '10px', borderRadius: '12px', textAlign: 'left', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                {results.map(d => (
                  <div key={d.id} onClick={() => handleSelectDance(d)} style={{ padding: '15px', borderBottom: `1px solid ${COLORS.PRIMARY}20`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '18px', color: COLORS.PRIMARY }}>{d.title.toLowerCase()}</div>
                      <div style={{ fontSize: '13px', color: COLORS.SECONDARY }}>{d.songTitle.toLowerCase()} - {d.songArtist.toLowerCase()}</div>
                    </div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getDifficultyColor(d.difficultyLevel), flexShrink: 0, marginLeft: '10px' }} />
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
                <div style={{ display: 'flex', marginBottom: '20px', gap: '10px' }}>
                   <input value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} placeholder="new playlist name" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.PRIMARY}`, outline: 'none' }} />
                   <button onClick={createPlaylist} style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                </div>
                {Object.keys(playlists).map(name => (
                  <div key={name} style={{ backgroundColor: COLORS.WHITE, padding: '20px', margin: '10px 0', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div onClick={() => setViewingPlaylist(name)} style={{ flex: 1, cursor: 'pointer' }}>
                      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: COLORS.PRIMARY, margin: 0 }}>{name}</h2>
                      <span style={{ color: COLORS.SECONDARY, fontWeight: 'bold' }}>{playlists[name].length} dances</span>
                    </div>
                    <button onClick={() => deletePlaylist(name)} style={{ background: 'none', border: 'none', color: COLORS.SECONDARY, fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', padding: '0 10px' }}>×</button>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <button onClick={() => setViewingPlaylist(null)} style={{ background: 'none', color: COLORS.PRIMARY, border: 'none', padding: '10px 0', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}>← back</button>
                <h2 style={{ fontSize: '1.5rem', borderBottom: `1px solid ${COLORS.PRIMARY}40`, paddingBottom: '10px', fontWeight: 700, color: COLORS.PRIMARY }}>{viewingPlaylist}</h2>
                {playlists[viewingPlaylist].length === 0 ? <p style={{ opacity: 0.5, fontStyle: 'italic', color: COLORS.PRIMARY }}>no dances yet.</p> :
                  playlists[viewingPlaylist].map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: COLORS.WHITE, padding: '12px', margin: '8px 0', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <div onClick={() => handleSelectDance(d)} style={{ flex: 1, cursor: 'pointer' }}>
                        <div style={{ fontWeight: 'bold', color: COLORS.PRIMARY }}>{d.title.toLowerCase()}</div>
                        <div style={{ fontSize: '12px', color: COLORS.SECONDARY }}>{d.difficultyLevel.toLowerCase()} • {d.counts}c</div>
                      </div>
                      <button onClick={() => removeFromPlaylist(d.id, viewingPlaylist)} style={{ background: 'none', color: COLORS.SECONDARY, border: `1px solid ${COLORS.SECONDARY}`, padding: '5px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>remove</button>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}

        {currentTab === 'account' && (
          <div style={{ backgroundColor: COLORS.WHITE, padding: '30px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', textAlign: 'left' }}>
            <h2 style={{ color: COLORS.PRIMARY, fontSize: '1.5rem', marginBottom: '10px' }}>account & sync</h2>
            {user ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 'bold', color: COLORS.PRIMARY }}>signed in as {user.email}</p>
                <button onClick={() => signOut(auth)} style={{ width: '100%', backgroundColor: 'transparent', color: COLORS.PRIMARY, border: `2px solid ${COLORS.PRIMARY}`, padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>sign out</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <button onClick={handleGoogleLogin} style={{ width: '100%', backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>sign in with google</button>
                <div style={{ borderTop: `1px solid ${COLORS.PRIMARY}40`, margin: '10px 0' }}></div>
                <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="email" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.PRIMARY}`, outline: 'none' }} required />
                  <input type="password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.PRIMARY}`, outline: 'none' }} required />
                  <button type="submit" style={{ width: '100%', backgroundColor: 'transparent', color: COLORS.PRIMARY, border: `2px solid ${COLORS.PRIMARY}`, padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{isLoginView ? 'login' : 'sign up'}</button>
                </form>
                <div style={{ textAlign: 'center', fontSize: '12px', cursor: 'pointer', color: COLORS.SECONDARY, fontWeight: 'bold' }} onClick={() => setIsLoginView(!isLoginView)}>{isLoginView ? 'need an account? sign up' : 'have an account? log in'}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}