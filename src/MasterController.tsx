import { useState, useEffect } from 'react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, onAuthStateChanged
} from "firebase/auth";
import type { User } from "firebase/auth"; 
import { GoogleAuthProvider } from "firebase/auth";
import { 
  getFirestore, doc, setDoc, getDoc 
} from "firebase/firestore"; 
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from "firebase/storage";

// --- IMAGES ---
import bootstepperLogo from './bootstepper-logo.png';
import bootstepperMobileLogo from './bootstepper-logo-mobile.png';

// --- SECURE CONFIGURATION ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

const API_KEY = import.meta.env.VITE_BOOTSTEPPER_API_KEY as string;
const BASE_URL = '/api'; 

const COLORS = {
  BACKGROUND: '#EEEBE8', PRIMARY: '#36649A', SECONDARY: '#D99AB1',
  WHITE: '#FFFFFF', NEUTRAL: '#9E9E9E', SUCCESS: '#4CAF50', ERROR: '#F44336'
};

const STORAGE_KEYS = {
  PERMANENT: 'bootstepper_permanent_storage',
  RECENT_SEARCHES: 'bootstepper_recent_searches'
};

const DEFAULT_PLAYLISTS = {
  "dances i know": [], "dances i kinda know": [], "dances i want to know": []
};

// --- INTERFACES ---
export interface Dance {
  id: string; title: string; difficultyLevel: string; counts: number;
  songTitle: string; songArtist: string; stepSheetContent?: any[]; 
  originalStepSheetUrl?: string; stepSheetId?: string; wallCount: number;
}

export interface UserProfile {
  username: string; firstName: string; lastName: string;
  bio: string; location: string; photoUrl: string;
}

type ReturnPath = { type: 'SEARCH' } | { type: 'PLAYLIST_DETAIL'; name: string };
type AppView = { type: 'SEARCH' } | { type: 'PLAYLISTS_LIST' } | { type: 'PLAYLIST_DETAIL'; name: string } | { type: 'ACCOUNT' } | { type: 'DANCE_PROFILE'; dance: Dance; returnPath: ReturnPath };

// --- DATA SANITIZERS ---
const cleanTitle = (title: string | undefined) => title ? String(title).replace(/\s*\([^)]*\)$/, '').trim() : "Untitled";

const normalizeDanceData = (raw: any): Dance => {
  if (!raw) return { id: 'error', title: 'Error', difficultyLevel: '', counts: 0, songTitle: '', songArtist: '', wallCount: 0 };
  return {
    id: String(raw.id || 'unknown-id'), title: cleanTitle(raw.title),
    difficultyLevel: String(raw.difficultyLevel || 'Level Unknown'),
    counts: typeof raw.counts === 'number' ? raw.counts : (Number(raw.count) || 0),
    wallCount: typeof raw.walls === 'number' ? raw.walls : (Number(raw.wallCount) || 0),
    songTitle: String(raw.songTitle || raw.danceSongs?.[0]?.song?.title || 'Unknown Song'),
    songArtist: String(raw.songArtist || raw.danceSongs?.[0]?.song?.artist || 'Unknown Artist'),
    stepSheetContent: Array.isArray(raw.stepSheetContent) ? raw.stepSheetContent : [],
    originalStepSheetUrl: String(raw.originalStepSheetUrl || ''),
    stepSheetId: String(raw.stepSheetId || raw.id)
  };
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

const DifficultyLegend = () => (
  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '15px', backgroundColor: COLORS.BACKGROUND, borderTop: `1px solid ${COLORS.PRIMARY}20`, flexWrap: 'wrap', fontSize: '11px', color: '#666' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#00BCD4' }} /> Absolute</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4CAF50' }} /> Beginner</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#FF9800' }} /> Improver</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#F44336' }} /> Interm.</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#9C27B0' }} /> Advanced</div>
  </div>
);

// --- MAIN CONTROLLER ---
export default function MasterController() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>({ type: 'SEARCH' });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Dance[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filterDiff, setFilterDiff] = useState('all');
  const [sortOrder, setSortOrder] = useState('default');

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [playlists, setPlaylists] = useState<{ [key: string]: Dance[] }>(DEFAULT_PLAYLISTS);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const [profile, setProfile] = useState<UserProfile>({ username: '', firstName: '', lastName: '', bio: '', location: '', photoUrl: '' });
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // NEW: Toggle for Edit Mode vs Read Mode
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => setShowSplash(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  useEffect(() => {
    try {
      const localPlaylists = localStorage.getItem(STORAGE_KEYS.PERMANENT);
      if (localPlaylists) {
        const parsed = JSON.parse(localPlaylists);
        const cleaned: any = {};
        Object.keys(parsed).forEach(key => { cleaned[key] = parsed[key].map((d: any) => normalizeDanceData(d)); });
        setPlaylists(cleaned);
      }
      const localRecent = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
      if (localRecent) setRecentSearches(JSON.parse(localRecent));
    } catch (e) { console.error("Load Error", e); }
  }, []);

  const pullFromCloud = async (currentUser: User | null = user) => {
    if (!currentUser) return;
    setSyncMessage("Loading from cloud...");
    try {
      const docRef = doc(db, "users", currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.playlists) {
            const cleaned: any = {};
            Object.keys(data.playlists).forEach(key => { cleaned[key] = (data.playlists[key] || []).map((d: any) => normalizeDanceData(d)); });
            setPlaylists(cleaned);
            localStorage.setItem(STORAGE_KEYS.PERMANENT, JSON.stringify(cleaned));
        }
        if (data.profile) {
            setProfile(data.profile);
            // If they have a username, default to read-only mode
            if (data.profile.username) setIsEditingProfile(false);
        } else {
            // Force them into edit mode if no profile exists
            setIsEditingProfile(true); 
        }
        setSyncMessage("Successfully downloaded data!");
      } else {
        setSyncMessage("No cloud data found. Saving local data to cloud.");
        setIsEditingProfile(true);
        await pushToCloud(playlists, profile, currentUser);
      }
    } catch (error: any) {
      console.error(error); setSyncMessage(`Download Failed: ${error.message}`);
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const pushToCloud = async (playlistsToSave: any, profileToSave: UserProfile, currentUser: User | null = user) => {
    if (!currentUser) return;
    setSyncMessage("Saving to cloud...");
    try {
      await setDoc(doc(db, "users", currentUser.uid), { playlists: playlistsToSave, profile: profileToSave });
      setSyncMessage("Successfully saved to cloud!");
    } catch (error: any) {
      console.error(error); setSyncMessage(`Upload Failed: ${error.message}`);
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingPhoto(true);
    setProfileMessage("Uploading photo...");

    try {
      const fileRef = ref(storage, `profile_pictures/${user.uid}`);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);

      setProfile({ ...profile, photoUrl: downloadUrl });
      setProfileMessage("Photo uploaded! Click 'Save Profile' to keep changes.");
    } catch (error: any) {
      console.error("Upload error:", error);
      setProfileMessage(`Upload failed: ${error.message}`);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const checkUsername = async (requestedUsername: string) => {
    if (!requestedUsername.trim()) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    try {
        const usernameLower = requestedUsername.toLowerCase().trim();
        const docRef = doc(db, "usernames", usernameLower);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().uid !== user?.uid) {
            setUsernameStatus('taken');
        } else {
            setUsernameStatus('available');
        }
    } catch (e) { console.error("Error checking username", e); setUsernameStatus('idle'); }
  };

  const saveProfile = async () => {
    if (!user) return;
    if (usernameStatus === 'taken') {
        setProfileMessage("Cannot save: Username is already taken.");
        return;
    }
    setProfileMessage("Saving profile...");
    try {
        const usernameLower = profile.username.toLowerCase().trim();
        if (usernameLower) {
            await setDoc(doc(db, "usernames", usernameLower), { uid: user.uid });
        }
        await pushToCloud(playlists, { ...profile, username: usernameLower }, user);
        setProfileMessage("Profile updated successfully!");
        setIsEditingProfile(false); // Return to view mode after save
    } catch (e: any) {
        setProfileMessage(`Error saving profile: ${e.message}`);
    }
    setTimeout(() => setProfileMessage(null), 3000);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) pullFromCloud(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('scroll', handleScroll); window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('scroll', handleScroll); window.removeEventListener('resize', handleResize); };
  }, []);

  const updateAndSavePlaylists = (newState: { [key: string]: Dance[] }) => {
    setPlaylists(newState); 
    localStorage.setItem(STORAGE_KEYS.PERMANENT, JSON.stringify(newState));
    if (user) pushToCloud(newState, profile, user);
  };

  const addToPlaylist = (dance: Dance, listName: string) => {
    if (!dance || !listName) return;
    setActiveBtn(listName);
    const currentList = playlists[listName] || [];
    if (!currentList.some(item => item.id === dance.id)) {
      updateAndSavePlaylists({ ...playlists, [listName]: [...currentList, normalizeDanceData(dance)] });
    }
    setTimeout(() => setActiveBtn(null), 1000);
  };

  const removeFromPlaylist = (danceId: string, listName: string) => updateAndSavePlaylists({ ...playlists, [listName]: (playlists[listName] || []).filter(d => d.id !== danceId) });

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const name = newPlaylistName.trim().toLowerCase();
    if (playlists[name]) return alert("Playlist already exists!");
    updateAndSavePlaylists({ ...playlists, [name]: [] });
    setNewPlaylistName('');
  };

  const deletePlaylist = (listName: string) => {
    if (confirm(`Are you sure you want to delete "${listName}"?`)) {
      const newState = { ...playlists }; delete newState[listName];
      updateAndSavePlaylists(newState);
      if (currentView.type === 'PLAYLIST_DETAIL' && currentView.name === listName) navigateTo({ type: 'PLAYLISTS_LIST' });
    }
  };

  const navigateTo = (view: AppView) => { setCurrentView(view); setFilterDiff('all'); setSortOrder('default'); setCurrentPage(1); window.scrollTo(0,0); };

  const handleBack = () => {
    if (currentView.type === 'DANCE_PROFILE') {
      const path = currentView.returnPath;
      if (path.type === 'SEARCH') setCurrentView({ type: 'SEARCH' });
      else if (path.type === 'PLAYLIST_DETAIL') {
        if (playlists[path.name]) setCurrentView({ type: 'PLAYLIST_DETAIL', name: path.name });
        else setCurrentView({ type: 'PLAYLISTS_LIST' });
      }
    } else if (currentView.type === 'PLAYLIST_DETAIL') navigateTo({ type: 'PLAYLISTS_LIST' });
  };

  const loadDanceDetails = async (rawDance: any, source: ReturnPath) => {
    if (!rawDance || !rawDance.id) return;
    setLoading(true); let cleanDance = normalizeDanceData(rawDance);
    try {
      const detailsRes = await fetch(`${BASE_URL}/dances/getById?id=${cleanDance.id}`, { headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' } });
      if (detailsRes.ok) {
        const details = await detailsRes.json();
        cleanDance = normalizeDanceData({ ...cleanDance, ...details });
        const sheetRes = await fetch(`${BASE_URL}/dances/getStepSheet?id=${cleanDance.stepSheetId || cleanDance.id}`, { headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' } });
        if (sheetRes.ok) {
          const sheetData = await sheetRes.json();
          if (Array.isArray(sheetData.content)) cleanDance.stepSheetContent = sheetData.content;
        }
      }
    } catch (err) { console.warn("Fetch issue:", err); }
    setCurrentView({ type: 'DANCE_PROFILE', dance: cleanDance, returnPath: source });
    setLoading(false);
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery) return;
    setLoading(true); setCurrentPage(1); setFilterDiff('all');
    const updatedRecents = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updatedRecents); localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updatedRecents));
    try {
      const res = await fetch(`${BASE_URL}/dances/search?query=${encodeURIComponent(searchQuery)}&limit=50`, { headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      const data = await res.json();
      if ((data.items || []).length === 0) alert("No results found.");
      setResults((data.items || []).map((item: any) => normalizeDanceData(item)));
    } catch (err) { console.error(err); alert("Search failed. Check connection."); } finally { setLoading(false); }
  };

  const handleAuth = async (isLogin: boolean) => {
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) { alert(err.message); }
  };
  const handleGoogle = async () => { try { await signInWithPopup(auth, googleProvider); } catch (err: any) { alert(err.message); } };

  const applyFiltersAndSort = (list: Dance[]) => {
    let processed = [...list];
    if (filterDiff !== 'all') processed = processed.filter(d => d.difficultyLevel?.toLowerCase().includes(filterDiff));
    if (sortOrder === 'az') processed.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortOrder === 'za') processed.sort((a, b) => b.title.localeCompare(a.title));
    return processed;
  };

  const FilterComponent = () => (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', backgroundColor: COLORS.WHITE, padding: '10px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <select value={filterDiff} onChange={(e) => { setFilterDiff(e.target.value); setCurrentPage(1); }} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: `1px solid ${COLORS.PRIMARY}`, outline: 'none', fontSize: '14px' }}>
        <option value="all">All Levels</option><option value="absolute">Absolute</option><option value="beginner">Beginner</option><option value="improver">Improver</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
      </select>
      <select value={sortOrder} onChange={(e) => { setSortOrder(e.target.value); setCurrentPage(1); }} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: `1px solid ${COLORS.PRIMARY}`, outline: 'none', fontSize: '14px' }}>
        <option value="default">Sort: Default</option><option value="az">Sort: A-Z</option><option value="za">Sort: Z-A</option>
      </select>
    </div>
  );

  let displayList: Dance[] = [];
  if (currentView.type === 'SEARCH') displayList = applyFiltersAndSort(results);
  if (currentView.type === 'PLAYLIST_DETAIL') displayList = applyFiltersAndSort(playlists[currentView.name] || []);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedList = displayList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(displayList.length / itemsPerPage);

  return (
    <div style={{ backgroundColor: COLORS.BACKGROUND, minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
      {/* RESTORED SPLASH CSS GLOBALLY */}
      <style>{`
        @keyframes swoopIn { 0% { transform: scale(0.1) translateY(100px); opacity: 0; } 60% { transform: scale(1.05) translateY(0); opacity: 1; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
      `}</style>
      
      {showSplash && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.BACKGROUND, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <img src={isMobile ? bootstepperMobileLogo : bootstepperLogo} alt="Bootstepper Splash" style={{ width: '100%', maxWidth: isMobile ? '300px' : '500px', height: 'auto', margin: '0 auto', animation: 'swoopIn 2.5s ease-out forwards' }} />
        </div>
      )}

      <div style={{ position: 'sticky', top: 0, backgroundColor: COLORS.BACKGROUND, zIndex: 10, paddingBottom: '10px', borderBottom: isScrolled ? `1px solid ${COLORS.PRIMARY}20` : 'none' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', padding: '20px' }}>
          <img src={isMobile ? bootstepperMobileLogo : bootstepperLogo} alt="logo" style={{ maxHeight: isMobile ? '120px' : '180px', width: 'auto', margin: '0 auto', display: 'block' }} />
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
        {loading && <div style={{ textAlign: 'center', padding: '40px', fontSize: '1.2rem', color: COLORS.PRIMARY, fontWeight: 'bold' }}>Loading...</div>}

        {!loading && !showSplash && (
          <>
            {currentView.type === 'DANCE_PROFILE' && (
              <div style={{ backgroundColor: COLORS.WHITE, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <button onClick={handleBack} style={{ background: 'none', color: COLORS.PRIMARY, border: `1px solid ${COLORS.PRIMARY}`, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}>← Back</button>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '8px', fontWeight: 800, color: '#333' }}>{currentView.dance.title.toLowerCase()}</h1>
                <div style={{ color: COLORS.SECONDARY, fontWeight: 'bold', marginBottom: '24px', fontSize: '0.95rem' }}>{currentView.dance.difficultyLevel.toLowerCase()} • {currentView.dance.counts} counts • {currentView.dance.wallCount} walls</div>
                <div style={{ backgroundColor: '#F5F5F7', padding: '15px', borderRadius: '8px', marginBottom: '30px' }}><p style={{ margin: '0 0 5px 0' }}><strong>Song:</strong> {currentView.dance.songTitle.toLowerCase()}</p><p style={{ margin: 0 }}><strong>Artist:</strong> {currentView.dance.songArtist.toLowerCase()}</p></div>
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#555' }}>Add to Playlist:</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {Object.keys(playlists).map(name => {
                      const isAdded = (playlists[name] || []).some(d => d.id === currentView.dance.id);
                      return (
                        <button key={name} onClick={() => addToPlaylist(currentView.dance, name)} disabled={isAdded} style={{ flex: '1 1 auto', backgroundColor: isAdded ? '#81C784' : (activeBtn === name ? COLORS.SECONDARY : COLORS.PRIMARY), color: COLORS.WHITE, border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: '600', cursor: isAdded ? 'default' : 'pointer' }}>{isAdded ? '✓ Added' : name}</button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ borderTop: `1px solid ${COLORS.PRIMARY}30`, paddingTop: '20px' }}>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: '15px', color: COLORS.PRIMARY }}>Step Sheet</h3>
                  <div style={{ backgroundColor: '#FAFAFA', padding: '20px', borderRadius: '8px', fontSize: '14px', color: '#333', border: '1px solid #EEE' }}>
                    {currentView.dance.stepSheetContent && currentView.dance.stepSheetContent.length > 0 ? (
                      currentView.dance.stepSheetContent.map((row: any, idx: number) => (
                        <div key={idx} style={{ marginBottom: '8px' }}>
                          {(row?.heading || row?.title) && <div style={{ fontWeight: 'bold', color: COLORS.PRIMARY, marginTop: '12px', textTransform: 'uppercase' }}>{row.heading || row.title}</div>}
                          {(row?.text || row?.description || row?.instruction) && <div style={{ display: 'flex' }}>{row?.counts && <span style={{ fontWeight: 'bold', width: '40px', flexShrink: 0 }}>{row.counts}</span>}<span>{row.text || row.description || row.instruction}</span></div>}
                          {row?.note && <div style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#777', marginLeft: '40px' }}>Note: {row.note}</div>}
                        </div>
                      ))
                    ) : <div style={{ opacity: 0.5 }}>Step sheet not found in database.</div>}
                  </div>
                  {currentView.dance.originalStepSheetUrl && <div style={{ marginTop: '20px', textAlign: 'center' }}><a href={currentView.dance.originalStepSheetUrl} target="_blank" rel="noreferrer" style={{ color: COLORS.PRIMARY, fontWeight: 'bold' }}>View Original Sheet ↗</a></div>}
                </div>
              </div>
            )}

            {currentView.type === 'SEARCH' && (
              <div style={{ paddingBottom: '60px' }}>
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
                
                {results.length > 0 && <FilterComponent />}
                
                {paginatedList.map(d => (
                  <div key={d.id} onClick={() => loadDanceDetails(d, { type: 'SEARCH' })} style={{ backgroundColor: COLORS.WHITE, padding: '15px', borderRadius: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div><div style={{ fontWeight: 'bold', color: COLORS.PRIMARY, fontSize: '1.1rem' }}>{d.title}</div><div style={{ fontSize: '13px', color: COLORS.SECONDARY }}>{d.songTitle} — {d.songArtist}</div></div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getDifficultyColor(d.difficultyLevel) }} />
                  </div>
                ))}
                {displayList.length > itemsPerPage && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px', alignItems: 'center' }}>
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} style={{ padding: '8px', cursor: currentPage === 1 ? 'default' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}>← Prev</button>
                    <span>Page {currentPage} of {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} style={{ padding: '8px', cursor: currentPage === totalPages ? 'default' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}>Next →</button>
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
                
                {playlists[currentView.name] && playlists[currentView.name].length > 0 && <FilterComponent />}
                
                {playlists[currentView.name] ? paginatedList.map(d => (
                  <div key={`${currentView.name}-${d.id}`} style={{ backgroundColor: COLORS.WHITE, padding: '12px', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div onClick={() => loadDanceDetails(d, { type: 'PLAYLIST_DETAIL', name: currentView.name })} style={{ cursor: 'pointer', flex: 1 }}><div style={{ fontWeight: 'bold', color: COLORS.PRIMARY }}>{d.title}</div><div style={{ fontSize: '12px', color: COLORS.SECONDARY }}>{d.songTitle}</div></div>
                    <button onClick={() => removeFromPlaylist(d.id, currentView.name)} style={{ color: COLORS.SECONDARY, background: 'none', border: `1px solid ${COLORS.SECONDARY}`, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '10px' }}>Remove</button>
                  </div>
                )) : <div style={{ color: 'red' }}>Error: Playlist not found.</div>}
                
                {displayList.length > itemsPerPage && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px', alignItems: 'center' }}>
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} style={{ padding: '8px', cursor: currentPage === 1 ? 'default' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}>← Prev</button>
                    <span>Page {currentPage} of {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} style={{ padding: '8px', cursor: currentPage === totalPages ? 'default' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}>Next →</button>
                  </div>
                )}
              </div>
            )}

            {currentView.type === 'ACCOUNT' && (
              <div style={{ backgroundColor: COLORS.WHITE, padding: '30px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                {user ? (
                  <div>
                    {/* SOCIAL PROFILE SECTION */}
                    <div style={{ borderBottom: `2px solid ${COLORS.PRIMARY}20`, paddingBottom: '20px', marginBottom: '20px' }}>
                        
                        {/* --- READ ONLY VIEW --- */}
                        {!isEditingProfile ? (
                            <div style={{ textAlign: 'center' }}>
                                {profile.photoUrl ? (
                                    <img src={profile.photoUrl} alt="Profile" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto', border: `3px solid ${COLORS.PRIMARY}`, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }} />
                                ) : (
                                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: `3px solid ${COLORS.PRIMARY}`, fontSize: '40px', color: '#999' }}>👤</div>
                                )}
                                
                                {(profile.firstName || profile.lastName) && (
                                    <h2 style={{ color: '#333', marginTop: '15px', marginBottom: '5px' }}>{profile.firstName} {profile.lastName}</h2>
                                )}
                                
                                <p style={{ fontWeight: 'bold', color: COLORS.PRIMARY, fontSize: '1.1rem', marginTop: (profile.firstName || profile.lastName) ? '0' : '15px', marginBottom: '15px' }}>@{profile.username}</p>
                                
                                {profile.bio && (
                                    <p style={{ color: '#555', fontSize: '14px', maxWidth: '400px', margin: '0 auto 15px auto', fontStyle: 'italic' }}>"{profile.bio}"</p>
                                )}
                                
                                {profile.location && (
                                    <p style={{ color: COLORS.NEUTRAL, fontSize: '13px', marginBottom: '20px' }}>📍 {profile.location}</p>
                                )}

                                <button onClick={() => setIsEditingProfile(true)} style={{ backgroundColor: COLORS.WHITE, color: COLORS.PRIMARY, border: `2px solid ${COLORS.PRIMARY}`, padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                                    Edit Account
                                </button>
                            </div>
                        ) : (
                        
                        /* --- EDIT FORM VIEW --- */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h3 style={{ margin: 0, color: COLORS.PRIMARY }}>Edit Profile</h3>
                                {profile.username && (
                                    <button onClick={() => { setIsEditingProfile(false); setUsernameStatus('idle'); }} style={{ background: 'none', border: 'none', color: COLORS.NEUTRAL, textDecoration: 'underline', cursor: 'pointer' }}>Cancel</button>
                                )}
                            </div>

                            {profile.photoUrl && (
                                <img src={profile.photoUrl} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto', border: `2px solid ${COLORS.SECONDARY}` }} />
                            )}
                            
                            <div style={{ textAlign: 'center' }}>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    id="photo-upload"
                                    style={{ display: 'none' }}
                                    onChange={handlePhotoUpload}
                                    disabled={isUploadingPhoto}
                                />
                                <label 
                                    htmlFor="photo-upload" 
                                    style={{ 
                                        display: 'inline-block',
                                        backgroundColor: COLORS.SECONDARY, 
                                        color: COLORS.WHITE, 
                                        padding: '10px 16px', 
                                        borderRadius: '8px', 
                                        cursor: isUploadingPhoto ? 'default' : 'pointer', 
                                        fontSize: '14px', 
                                        fontWeight: 'bold', 
                                        opacity: isUploadingPhoto ? 0.7 : 1 
                                    }}
                                >
                                    {isUploadingPhoto ? 'Uploading...' : '📷 Choose or Take Photo'}
                                </label>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.NEUTRAL }}>Username (Required & Unique)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ color: COLORS.PRIMARY, fontWeight: 'bold' }}>@</span>
                                    <input 
                                        type="text" 
                                        value={profile.username} 
                                        onChange={e => {
                                            // ALLOWS letters, numbers, dot, dash, and underscore
                                            const val = e.target.value.replace(/[^a-zA-Z0-9.\-_]/g, ''); 
                                            setProfile({...profile, username: val});
                                            checkUsername(val);
                                        }} 
                                        placeholder="Username" 
                                        style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${usernameStatus === 'taken' ? COLORS.ERROR : COLORS.PRIMARY}`, outline: 'none' }} 
                                    />
                                </div>
                                {usernameStatus === 'checking' && <span style={{ fontSize: '11px', color: COLORS.NEUTRAL }}>Checking availability...</span>}
                                {usernameStatus === 'available' && profile.username && <span style={{ fontSize: '11px', color: COLORS.SUCCESS }}>Username available!</span>}
                                {usernameStatus === 'taken' && <span style={{ fontSize: '11px', color: COLORS.ERROR }}>Username taken. Please choose another.</span>}
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.NEUTRAL }}>First Name</label>
                                    <input type="text" value={profile.firstName} onChange={e => setProfile({...profile, firstName: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.PRIMARY}`, boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.NEUTRAL }}>Last Name</label>
                                    <input type="text" value={profile.lastName} onChange={e => setProfile({...profile, lastName: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.PRIMARY}`, boxSizing: 'border-box' }} />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.NEUTRAL }}>Bio</label>
                                <textarea value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} placeholder="Tell people about your dancing..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.PRIMARY}`, boxSizing: 'border-box', minHeight: '60px', fontFamily: 'inherit' }} />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.NEUTRAL }}>Location</label>
                                <input type="text" value={profile.location} onChange={e => setProfile({...profile, location: e.target.value})} placeholder="e.g. Austin, TX" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.PRIMARY}`, boxSizing: 'border-box' }} />
                            </div>

                            <button onClick={saveProfile} disabled={!profile.username || usernameStatus === 'taken' || isUploadingPhoto} style={{ backgroundColor: (!profile.username || usernameStatus === 'taken' || isUploadingPhoto) ? COLORS.NEUTRAL : COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                                Save Profile
                            </button>
                            {profileMessage && <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: profileMessage.includes('Error') || profileMessage.includes('failed') ? COLORS.ERROR : COLORS.SUCCESS }}>{profileMessage}</div>}
                        </div>
                        )}
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '12px', color: COLORS.NEUTRAL }}>Signed in as: {user.email}</p>
                      
                      <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#F5F5F7', borderRadius: '8px' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '15px' }}>Data Synchronization</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <button onClick={() => pullFromCloud()} style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>⬇️ Force Download</button>
                          <button onClick={() => pushToCloud(playlists, profile)} style={{ backgroundColor: COLORS.WHITE, color: COLORS.PRIMARY, border: `2px solid ${COLORS.PRIMARY}`, padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>⬆️ Force Upload</button>
                        </div>
                        {syncMessage && <p style={{ color: syncMessage.includes('Fail') ? COLORS.ERROR : COLORS.SUCCESS, fontWeight: 'bold', marginTop: '10px', fontSize: '13px' }}>{syncMessage}</p>}
                      </div>

                      <button onClick={() => signOut(auth)} style={{ backgroundColor: 'transparent', color: COLORS.PRIMARY, border: `2px solid ${COLORS.PRIMARY}`, padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Sign Out</button>
                    </div>
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
          </>
        )}
      </div>
      {currentView.type === 'SEARCH' && !loading && <div style={{ position: 'fixed', bottom: 0, width: '100%', zIndex: 100 }}><DifficultyLegend /></div>}
    </div>
  );
}