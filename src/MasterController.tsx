import { useState, useEffect } from 'react';

// --- FIREBASE IMPORTS ---
import { 
  signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, sendPasswordResetEmail, deleteUser
} from "firebase/auth";
import type { User } from "firebase/auth"; 
import { 
  doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, 
  addDoc, updateDoc, arrayUnion, arrayRemove, orderBy
} from "firebase/firestore"; 
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// --- INTERNAL APP IMPORTS ---
import { auth, db, storage, googleProvider } from './firebaseSetup';
import type { Dance, UserProfile, Post, PostComment, AppView, ReturnPath } from './types';
import { COLORS, STORAGE_KEYS, DEFAULT_PLAYLISTS, normalizeDanceData } from './utils';
import { HomeView } from './HomeView'; 
import { AccountView } from './AccountView'; // <-- NEW IMPORT

// --- IMAGES ---
import bootstepperLogo from './bootstepper-logo.png';
import bootstepperMobileLogo from './bootstepper-logo-mobile.png';

const API_KEY = import.meta.env.VITE_BOOTSTEPPER_API_KEY as string;
const BASE_URL = '/api'; 

// --- COMPONENTS OUTSIDE CONTROLLER ---
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
  const [currentView, setCurrentView] = useState<AppView>({ type: 'HOME' }); 
  
  // Search State
  const [queryInput, setQueryInput] = useState('');
  const [results, setResults] = useState<Dance[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearchingDances, setIsSearchingDances] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filterDiff, setFilterDiff] = useState('all');
  const [sortOrder, setSortOrder] = useState('default');

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  // Profile & Playlists
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<{ [key: string]: Dance[] }>(DEFAULT_PLAYLISTS);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [profile, setProfile] = useState<UserProfile>({ username: '', firstName: '', lastName: '', bio: '', location: '', photoUrl: '', following: [], followers: [] });
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Community
  const [communityQuery, setCommunityQuery] = useState('');
  const [communityResults, setCommunityResults] = useState<UserProfile[]>([]);
  const [isSearchingCommunity, setIsSearchingCommunity] = useState(false);
  const [userListResults, setUserListResults] = useState<UserProfile[]>([]);
  const [isLoadingUserList, setIsLoadingUserList] = useState(false);

  // Feed State
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostVisibility, setNewPostVisibility] = useState<'public' | 'followers' | 'friends' | 'private'>('public');
  const [isPosting, setIsPosting] = useState(false);
  const [commentInputs, setCommentInputs] = useState<{[postId: string]: string}>({});

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
            setProfile({ ...data.profile, following: data.profile.following || [], followers: data.profile.followers || [] });
            if (data.profile.username) setIsEditingProfile(false);
        } else {
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
      await setDoc(doc(db, "users", currentUser.uid), { playlists: playlistsToSave, profile: profileToSave }, { merge: true });
      setSyncMessage("Successfully saved to cloud!");
    } catch (error: any) {
      console.error(error); setSyncMessage(`Upload Failed: ${error.message}`);
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const fetchFeed = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const postsRef = collection(db, "posts");
      const q = query(postsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const fetchedPosts: Post[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as Post;
        data.id = docSnap.id;
        
        let canView = false;
        const isAuthor = data.authorUid === user.uid;
        const isFollowingAuthor = profile.following.includes(data.authorUid);
        const isMutual = isFollowingAuthor && profile.followers.includes(data.authorUid);

        if (isAuthor) canView = true;
        else if (data.visibility === 'public') canView = true;
        else if (data.visibility === 'followers' && isFollowingAuthor) canView = true;
        else if (data.visibility === 'friends' && isMutual) canView = true;

        if (canView) fetchedPosts.push(data);
      });
      
      setFeedPosts(fetchedPosts);
    } catch (error) {
      console.error("Error fetching feed:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && currentView.type === 'HOME') {
      fetchFeed();
    }
  }, [user, currentView.type]);

  const handleCreatePost = async () => {
    if (!user || !newPostContent.trim()) return;
    setIsPosting(true);
    try {
      const newPost: Omit<Post, 'id'> = {
        authorUid: user.uid,
        authorUsername: profile.username || 'User',
        authorPhotoUrl: profile.photoUrl || '',
        content: newPostContent.trim(),
        visibility: newPostVisibility,
        likes: [],
        comments: [],
        createdAt: Date.now()
      };
      
      await addDoc(collection(db, "posts"), newPost);
      setNewPostContent('');
      fetchFeed(); 
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post.");
    }
    setIsPosting(false);
  };

  const handleLikePost = async (postId: string, currentLikes: string[]) => {
    if (!user) return;
    const postRef = doc(db, "posts", postId);
    const hasLiked = currentLikes.includes(user.uid);
    
    try {
      if (hasLiked) {
        await updateDoc(postRef, { likes: arrayRemove(user.uid) });
        setFeedPosts(feedPosts.map(p => p.id === postId ? { ...p, likes: p.likes.filter((id: string) => id !== user.uid) } : p));
      } else {
        await updateDoc(postRef, { likes: arrayUnion(user.uid) });
        setFeedPosts(feedPosts.map(p => p.id === postId ? { ...p, likes: [...p.likes, user.uid] } : p));
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!user || !commentInputs[postId]?.trim()) return;
    const commentText = commentInputs[postId].trim();
    
    const newComment: PostComment = {
      id: Math.random().toString(36).substr(2, 9),
      uid: user.uid,
      username: profile.username || 'User',
      photoUrl: profile.photoUrl || '',
      text: commentText,
      timestamp: Date.now()
    };

    try {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, { comments: arrayUnion(newComment) });
      
      setFeedPosts(feedPosts.map(p => p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p));
      setCommentInputs({ ...commentInputs, [postId]: '' }); 
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  // --- AUTH FEATURES ---
  const handleAuth = async (isLogin: boolean) => {
    setAuthMessage(null);
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) { 
        setAuthMessage(err.message.replace('Firebase:', '').trim()); 
    }
  };

  const handleGoogle = async () => { try { await signInWithPopup(auth, googleProvider); } catch (err: any) { setAuthMessage(err.message); } };

  const handlePasswordReset = async () => {
    if (!email) {
        setAuthMessage("Please enter your email address first.");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        setAuthMessage("Password reset email sent! Check your inbox.");
    } catch (error: any) {
        setAuthMessage("Error sending reset email: " + error.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmDelete = prompt("Type 'DELETE' to permanently delete your account. This cannot be undone.");
    if (confirmDelete !== 'DELETE') return;

    try {
        await deleteDoc(doc(db, "users", user.uid));
        if (profile.username) {
            await deleteDoc(doc(db, "usernames", profile.username));
        }
        await deleteUser(user);
        alert("Account deleted.");
    } catch (error: any) {
        if (error.code === 'auth/requires-recent-login') {
            alert("Security Check: You must log out and log back in to delete your account.");
        } else {
            alert("Error deleting account: " + error.message);
        }
    }
  };

  // --- PROFILE LOGIC ---
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
        setIsEditingProfile(false);
    } catch (e: any) {
        setProfileMessage(`Error saving profile: ${e.message}`);
    }
    setTimeout(() => setProfileMessage(null), 3000);
  };

  // --- COMMUNITY LOGIC ---
  const handleUserSearch = async (queryStr: string) => {
    setCommunityQuery(queryStr);
    if (!queryStr.trim()) {
        setCommunityResults([]);
        return;
    }
    setIsSearchingCommunity(true);
    try {
        const lowerQ = queryStr.toLowerCase().trim();
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("profile.username", ">=", lowerQ), where("profile.username", "<=", lowerQ + '\uf8ff'));
        
        const querySnapshot = await getDocs(q);
        const fetchedUsers: UserProfile[] = [];
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.profile && docSnap.id !== user?.uid) {
                fetchedUsers.push({ ...data.profile, uid: docSnap.id });
            }
        });
        setCommunityResults(fetchedUsers);
    } catch (error) { console.error("Error searching community:", error); }
    setIsSearchingCommunity(false);
  };

  const toggleFollow = async (targetUid: string) => {
    if (!user || !targetUid) return;
    const isCurrentlyFollowing = profile.following.includes(targetUid);
    
    let updatedFollowing = [...profile.following];
    if (isCurrentlyFollowing) {
        updatedFollowing = updatedFollowing.filter(id => id !== targetUid);
    } else {
        updatedFollowing.push(targetUid);
    }
    const updatedProfile = { ...profile, following: updatedFollowing };
    setProfile(updatedProfile); 
    await pushToCloud(playlists, updatedProfile, user); 
    
    try {
      const targetDocRef = doc(db, "users", targetUid);
      const targetSnap = await getDoc(targetDocRef);
      if (targetSnap.exists()) {
        const targetData = targetSnap.data();
        const targetProfile = targetData.profile || {};
        let targetFollowers = targetProfile.followers || [];
        
        if (isCurrentlyFollowing) {
           targetFollowers = targetFollowers.filter((id: string) => id !== user.uid);
        } else {
           if (!targetFollowers.includes(user.uid)) targetFollowers.push(user.uid);
        }
        await setDoc(targetDocRef, { profile: { ...targetProfile, followers: targetFollowers } }, { merge: true });
        
        if (currentView.type === 'OTHER_PROFILE' && currentView.targetProfile.uid === targetUid) {
          setCurrentView({ type: 'OTHER_PROFILE', targetProfile: { ...targetProfile, followers: targetFollowers, uid: targetUid }});
        }
      }
    } catch (error) { console.error("Error updating target user's followers list", error); }
  };

  const loadUserList = async (title: string, uids: string[], returnPath: AppView) => {
    setCurrentView({ type: 'USER_LIST', listTitle: title, uids, returnPath });
    setIsLoadingUserList(true);
    setUserListResults([]);
    
    if (!uids || uids.length === 0) {
      setIsLoadingUserList(false);
      return;
    }

    try {
      const fetchedUsers: UserProfile[] = [];
      const promises = uids.map(id => getDoc(doc(db, "users", id)));
      const snaps = await Promise.all(promises);
      
      snaps.forEach(snap => {
         if (snap.exists() && snap.data().profile) {
            fetchedUsers.push({ ...snap.data().profile, uid: snap.id });
         }
      });
      setUserListResults(fetchedUsers);
    } catch (e) { console.error("Error loading user list:", e); }
    setIsLoadingUserList(false);
  };

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

  const navigateTo = (view: AppView) => { 
      setCurrentView(view); 
      setFilterDiff('all'); 
      setSortOrder('default'); 
      setCurrentPage(1); 
      window.scrollTo(0,0); 
  };

  const handleBack = () => {
    if (currentView.type === 'DANCE_PROFILE') {
      const path = currentView.returnPath;
      if (path.type === 'SEARCH') setCurrentView({ type: 'SEARCH' });
      else if (path.type === 'HOME') setCurrentView({ type: 'HOME' });
      else if (path.type === 'COMMUNITY') setCurrentView({ type: 'COMMUNITY' });
      else if (path.type === 'PLAYLIST_DETAIL') {
        if (playlists[path.name]) setCurrentView({ type: 'PLAYLIST_DETAIL', name: path.name });
        else setCurrentView({ type: 'PLAYLISTS_LIST' });
      }
    } else if (currentView.type === 'PLAYLIST_DETAIL') navigateTo({ type: 'PLAYLISTS_LIST' });
    else if (currentView.type === 'OTHER_PROFILE') navigateTo({ type: 'COMMUNITY' });
    else if (currentView.type === 'USER_LIST') setCurrentView(currentView.returnPath);
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
    setIsSearchingDances(true); setCurrentPage(1); setFilterDiff('all');
    const updatedRecents = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updatedRecents); localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updatedRecents));
    try {
      const res = await fetch(`${BASE_URL}/dances/search?query=${encodeURIComponent(searchQuery)}&limit=50`, { headers: { 'X-BootStepper-API-Key': API_KEY, 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      const data = await res.json();
      if ((data.items || []).length === 0) alert("No results found.");
      setResults((data.items || []).map((item: any) => normalizeDanceData(item)));
    } catch (err) { console.error(err); alert("Search failed. Check connection."); } finally { setIsSearchingDances(false); }
  };

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
  if (currentView.type === 'HOME' || currentView.type === 'SEARCH') displayList = applyFiltersAndSort(results);
  if (currentView.type === 'PLAYLIST_DETAIL') displayList = applyFiltersAndSort(playlists[currentView.name] || []);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedList = displayList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(displayList.length / itemsPerPage);

  return (
    <div style={{ backgroundColor: COLORS.BACKGROUND, minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
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
          {currentView.type !== 'DANCE_PROFILE' && currentView.type !== 'USER_LIST' && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', gap: '5px' }}>
              <button onClick={() => navigateTo({ type: 'HOME' })} style={{ padding: '8px 12px', background: 'none', border: 'none', borderBottom: currentView.type === 'HOME' ? `3px solid ${COLORS.SECONDARY}` : 'none', color: COLORS.PRIMARY, fontWeight: 'bold', cursor: 'pointer', fontSize: isMobile ? '13px' : '16px' }}>Home</button>
              <button onClick={() => navigateTo({ type: 'PLAYLISTS_LIST' })} style={{ padding: '8px 12px', background: 'none', border: 'none', borderBottom: currentView.type === 'PLAYLISTS_LIST' || currentView.type === 'PLAYLIST_DETAIL' ? `3px solid ${COLORS.SECONDARY}` : 'none', color: COLORS.PRIMARY, fontWeight: 'bold', cursor: 'pointer', fontSize: isMobile ? '13px' : '16px' }}>Playlists</button>
              {user && <button onClick={() => navigateTo({ type: 'COMMUNITY' })} style={{ padding: '8px 12px', background: 'none', border: 'none', borderBottom: currentView.type === 'COMMUNITY' || currentView.type === 'OTHER_PROFILE' ? `3px solid ${COLORS.SECONDARY}` : 'none', color: COLORS.PRIMARY, fontWeight: 'bold', cursor: 'pointer', fontSize: isMobile ? '13px' : '16px' }}>Community</button>}
              <button onClick={() => navigateTo({ type: 'ACCOUNT' })} style={{ padding: '8px 12px', background: 'none', border: 'none', borderBottom: currentView.type === 'ACCOUNT' ? `3px solid ${COLORS.SECONDARY}` : 'none', color: COLORS.PRIMARY, fontWeight: 'bold', cursor: 'pointer', fontSize: isMobile ? '13px' : '16px' }}>Account</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '40px', fontSize: '1.2rem', color: COLORS.PRIMARY, fontWeight: 'bold' }}>Loading...</div>}

        {!loading && !showSplash && (
          <>
            {/* EXTRACTED VIEWS */}
            {currentView.type === 'HOME' && (
              <HomeView 
                user={user}
                profile={profile}
                queryInput={queryInput}
                setQueryInput={setQueryInput}
                handleSearch={handleSearch}
                isSearchingDances={isSearchingDances}
                results={results}
                paginatedList={paginatedList}
                setResults={setResults}
                loadDanceDetails={loadDanceDetails}
                newPostContent={newPostContent}
                setNewPostContent={setNewPostContent}
                newPostVisibility={newPostVisibility}
                setNewPostVisibility={setNewPostVisibility}
                isPosting={isPosting}
                handleCreatePost={handleCreatePost}
                feedPosts={feedPosts}
                handleLikePost={handleLikePost}
                commentInputs={commentInputs}
                setCommentInputs={setCommentInputs}
                handleAddComment={handleAddComment}
              />
            )}

            {currentView.type === 'ACCOUNT' && (
              <AccountView 
                user={user}
                profile={profile}
                setProfile={setProfile}
                isEditingProfile={isEditingProfile}
                setIsEditingProfile={setIsEditingProfile}
                usernameStatus={usernameStatus}
                checkUsername={checkUsername}
                saveProfile={saveProfile}
                profileMessage={profileMessage}
                isUploadingPhoto={isUploadingPhoto}
                handlePhotoUpload={handlePhotoUpload}
                handleDeleteAccount={handleDeleteAccount}
                pullFromCloud={pullFromCloud}
                pushToCloud={pushToCloud}
                playlists={playlists}
                syncMessage={syncMessage}
                signOut={signOut}
                auth={auth}
                handleGoogle={handleGoogle}
                handleAuth={handleAuth}
                isLoginView={isLoginView}
                setIsLoginView={setIsLoginView}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                handlePasswordReset={handlePasswordReset}
                authMessage={authMessage}
                loadUserList={loadUserList}
                currentView={currentView}
              />
            )}

            {/* VIEWS STILL INSIDE MASTER CONTROLLER */}
            {currentView.type === 'USER_LIST' && (
              <div style={{ backgroundColor: COLORS.WHITE, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <button onClick={handleBack} style={{ background: 'none', color: COLORS.PRIMARY, border: `1px solid ${COLORS.PRIMARY}`, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}>← Back</button>
                <h2 style={{ color: COLORS.PRIMARY, textAlign: 'center', marginBottom: '20px' }}>{currentView.listTitle}</h2>
                
                {isLoadingUserList ? (
                    <div style={{ textAlign: 'center', color: COLORS.NEUTRAL, marginTop: '20px' }}>Loading users...</div>
                ) : userListResults.length === 0 ? (
                    <div style={{ textAlign: 'center', color: COLORS.NEUTRAL, marginTop: '20px' }}>No users found.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {userListResults.map(targetUser => (
                            <div key={targetUser.uid} onClick={() => setCurrentView({ type: 'OTHER_PROFILE', targetProfile: targetUser })} style={{ backgroundColor: '#F9F9F9', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', border: '1px solid #EEE' }}>
                                {targetUser.photoUrl ? (
                                    <img src={targetUser.photoUrl} alt="Profile" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#999' }}>👤</div>
                                )}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', color: '#333' }}>{targetUser.firstName} {targetUser.lastName}</div>
                                    <div style={{ fontSize: '13px', color: COLORS.PRIMARY }}>@{targetUser.username}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
              </div>
            )}

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

            {currentView.type === 'PLAYLISTS_LIST' && (
              <div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}><input value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} placeholder="New playlist name..." style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.PRIMARY}`, fontSize: '16px' }} /><button onClick={createPlaylist} style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }}>+</button></div>
                {Object.keys(playlists).map(name => (
                  <div key={name} style={{ backgroundColor: COLORS.WHITE, padding: '20px', borderRadius: '12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div onClick={() => navigateTo({ type: 'PLAYLIST_DETAIL', name })} style={{ flex: 1, cursor: 'pointer' }}><h2 style={{ fontSize: '1.2rem', margin: 0, color: COLORS.PRIMARY }}>{name}</h2><span style={{ fontSize: '12px', color: COLORS.SECONDARY }}>{playlists[name].length} dances</span></div>
                    <button onClick={() => deletePlaylist(name)} style={{ background: 'none', border: 'none', color: COLORS.SECONDARY, fontSize: '24px', cursor: 'pointer' }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {currentView.type === 'PLAYLIST_DETAIL' && (
              <div>
                <button onClick={handleBack} style={{ background: 'none', color: COLORS.PRIMARY, border: 'none', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px', fontSize: '16px' }}>← Back to Playlists</button>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', color: COLORS.PRIMARY }}>{currentView.name}</h2>
                
                {playlists[currentView.name] && playlists[currentView.name].length > 0 && <FilterComponent />}
                
                {playlists[currentView.name] ? paginatedList.map((d: Dance) => (
                  <div key={`${currentView.name}-${d.id}`} style={{ backgroundColor: COLORS.WHITE, padding: '12px', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div onClick={() => loadDanceDetails(d, { type: 'PLAYLIST_DETAIL', name: currentView.name })} style={{ cursor: 'pointer', flex: 1 }}><div style={{ fontWeight: 'bold', color: COLORS.PRIMARY }}>{d.title}</div><div style={{ fontSize: '12px', color: COLORS.SECONDARY }}>{d.songTitle}</div></div>
                    <button onClick={() => removeFromPlaylist(d.id, currentView.name)} style={{ color: COLORS.SECONDARY, background: 'none', border: `1px solid ${COLORS.SECONDARY}`, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '10px', cursor: 'pointer' }}>Remove</button>
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

            {currentView.type === 'COMMUNITY' && (
              <div>
                <h2 style={{ color: COLORS.PRIMARY, textAlign: 'center', marginBottom: '20px' }}>Find Dancers</h2>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                  <input 
                    value={communityQuery} 
                    onChange={e => handleUserSearch(e.target.value)} 
                    placeholder="Search usernames..." 
                    style={{ padding: '12px', width: '100%', maxWidth: '400px', borderRadius: '8px', border: `1px solid ${COLORS.PRIMARY}`, outline: 'none', fontSize: '16px' }} 
                  />
                </div>
                
                {isSearchingCommunity && (
                    <div style={{ textAlign: 'center', color: COLORS.NEUTRAL, fontSize: '12px', marginBottom: '10px' }}>Searching...</div>
                )}
                
                {communityResults.length === 0 && communityQuery && !isSearchingCommunity && (
                    <div style={{ textAlign: 'center', color: COLORS.NEUTRAL, marginTop: '10px' }}>No users found matching "@{communityQuery}"</div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    {communityResults.map(targetUser => (
                        <div key={targetUser.uid} onClick={() => setCurrentView({ type: 'OTHER_PROFILE', targetProfile: targetUser })} style={{ backgroundColor: COLORS.WHITE, padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            {targetUser.photoUrl ? (
                                <img src={targetUser.photoUrl} alt="Profile" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#999' }}>👤</div>
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', color: '#333' }}>{targetUser.firstName} {targetUser.lastName}</div>
                                <div style={{ fontSize: '13px', color: COLORS.PRIMARY }}>@{targetUser.username}</div>
                            </div>
                        </div>
                    ))}
                </div>
              </div>
            )}

            {currentView.type === 'OTHER_PROFILE' && (
              <div style={{ backgroundColor: COLORS.WHITE, padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <button onClick={handleBack} style={{ background: 'none', color: COLORS.PRIMARY, border: `1px solid ${COLORS.PRIMARY}`, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}>← Back</button>
                <div style={{ textAlign: 'center' }}>
                    {currentView.targetProfile.photoUrl ? (
                        <img src={currentView.targetProfile.photoUrl} alt="Profile" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto', border: `3px solid ${COLORS.PRIMARY}`, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }} />
                    ) : (
                        <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: `3px solid ${COLORS.PRIMARY}`, fontSize: '40px', color: '#999' }}>👤</div>
                    )}
                    {(currentView.targetProfile.firstName || currentView.targetProfile.lastName) && (
                        <h2 style={{ color: '#333', marginTop: '15px', marginBottom: '5px' }}>{currentView.targetProfile.firstName} {currentView.targetProfile.lastName}</h2>
                    )}
                    <p style={{ fontWeight: 'bold', color: COLORS.PRIMARY, fontSize: '1.1rem', marginTop: (currentView.targetProfile.firstName || currentView.targetProfile.lastName) ? '0' : '15px', marginBottom: '15px' }}>@{currentView.targetProfile.username}</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '15px', color: COLORS.NEUTRAL, fontSize: '14px' }}>
                        <div onClick={() => loadUserList(`${currentView.targetProfile.firstName || 'User'}'s Followers`, currentView.targetProfile.followers || [], currentView)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                            <strong style={{ color: COLORS.PRIMARY }}>{currentView.targetProfile.followers?.length || 0}</strong> Followers
                        </div>
                        <div onClick={() => loadUserList(`Following`, currentView.targetProfile.following || [], currentView)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                            <strong style={{ color: COLORS.PRIMARY }}>{currentView.targetProfile.following?.length || 0}</strong> Following
                        </div>
                    </div>

                    {currentView.targetProfile.bio && (
                        <p style={{ color: '#555', fontSize: '14px', maxWidth: '400px', margin: '0 auto 15px auto', fontStyle: 'italic' }}>"{currentView.targetProfile.bio}"</p>
                    )}
                    {currentView.targetProfile.location && (
                        <p style={{ color: COLORS.NEUTRAL, fontSize: '13px', marginBottom: '20px' }}>📍 {currentView.targetProfile.location}</p>
                    )}
                    {currentView.targetProfile.uid && (
                        <button 
                            onClick={() => toggleFollow(currentView.targetProfile.uid!)} 
                            style={{ 
                                backgroundColor: profile.following.includes(currentView.targetProfile.uid) ? COLORS.WHITE : COLORS.PRIMARY, 
                                color: profile.following.includes(currentView.targetProfile.uid) ? COLORS.PRIMARY : COLORS.WHITE, 
                                border: `2px solid ${COLORS.PRIMARY}`, 
                                padding: '10px 30px', 
                                borderRadius: '20px', 
                                fontWeight: 'bold', 
                                cursor: 'pointer', 
                                fontSize: '14px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {profile.following.includes(currentView.targetProfile.uid) ? 'Following' : 'Follow'}
                        </button>
                    )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {(currentView.type === 'HOME' || currentView.type === 'SEARCH') && !loading && <div style={{ position: 'fixed', bottom: 0, width: '100%', zIndex: 100 }}><DifficultyLegend /></div>}
    </div>
  );
}