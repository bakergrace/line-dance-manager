import { useState, useEffect } from 'react';

// --- FIREBASE IMPORTS ---
import { signOut, deleteUser } from "firebase/auth";
import type { User } from "firebase/auth"; 
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, addDoc, updateDoc, arrayUnion, arrayRemove, orderBy } from "firebase/firestore"; 
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// --- INTERNAL APP IMPORTS ---
import { auth, db, storage } from './firebaseSetup';
import type { Dance, UserProfile, Post, PostComment, AppView, ReturnPath } from './types';
import { COLORS, STORAGE_KEYS, DEFAULT_PLAYLISTS, normalizeDanceData } from './utils';

// --- CUSTOM HOOKS ---
import { useAuth } from './useAuth';
import { useSearch } from './useSearch';

// --- VIEWS ---
import { HomeView } from './HomeView'; 
import { AccountView } from './AccountView'; 
import { CommunityView } from './CommunityView';
import { OtherProfileView } from './OtherProfileView'; 
import { UserListView } from './UserListView'; 
import { DanceProfileView } from './DanceProfileView'; 
import { PlaylistsView } from './PlaylistsView';       

// --- IMAGES ---
import bootstepperLogo from './bootstepper-logo.png';
import bootstepperMobileLogo from './bootstepper-logo-mobile.png';

const API_KEY = import.meta.env.VITE_BOOTSTEPPER_API_KEY as string;
const BASE_URL = '/api'; 

const DifficultyLegend = () => (
  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '15px', backgroundColor: COLORS.BACKGROUND, borderTop: `1px solid ${COLORS.PRIMARY}20`, flexWrap: 'wrap', fontSize: '11px', color: '#666' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#00BCD4' }} /> Absolute</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4CAF50' }} /> Beginner</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#FF9800' }} /> Improver</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#F44336' }} /> Interm.</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#9C27B0' }} /> Advanced</div>
  </div>
);

export default function MasterController() {
  // --- 1. USE CUSTOM HOOKS ---
  const { user, email, setEmail, password, setPassword, isLoginView, setIsLoginView, showPassword, setShowPassword, authMessage, handleAuth, handleGoogle, handlePasswordReset } = useAuth();
  const { queryInput, setQueryInput, results, setResults, isSearchingDances, currentPage, setCurrentPage, itemsPerPage, filterDiff, setFilterDiff, sortOrder, setSortOrder, handleSearch, applyFiltersAndSort } = useSearch();

  // --- 2. LOCAL VIEW STATE ---
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>({ type: 'HOME' }); 
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  // --- 3. PROFILE & PLAYLIST STATE ---
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<{ [key: string]: Dance[] }>(DEFAULT_PLAYLISTS);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [profile, setProfile] = useState<UserProfile>({ username: '', firstName: '', lastName: '', bio: '', location: '', photoUrl: '', following: [], followers: [] });
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // --- 4. COMMUNITY STATE ---
  const [communityQuery, setCommunityQuery] = useState('');
  const [communityResults, setCommunityResults] = useState<UserProfile[]>([]);
  const [isSearchingCommunity, setIsSearchingCommunity] = useState(false);
  const [userListResults, setUserListResults] = useState<UserProfile[]>([]);
  const [isLoadingUserList, setIsLoadingUserList] = useState(false);

  // --- 5. FEED STATE ---
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostVisibility, setNewPostVisibility] = useState<'public' | 'followers' | 'friends' | 'private'>('public');
  const [isPosting, setIsPosting] = useState(false);
  const [commentInputs, setCommentInputs] = useState<{[postId: string]: string}>({});

  // --- USE EFFECTS ---
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
    } catch (e) { console.error("Load Error", e); }
  }, []);

  // --- PROFILE LOGIC ---
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

  // Sync profile when user successfully logs in from useAuth hook
  useEffect(() => {
    if (user) pullFromCloud(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
            {currentView.type === 'HOME' && (
              <HomeView 
                user={user} profile={profile} queryInput={queryInput} setQueryInput={setQueryInput} handleSearch={handleSearch} isSearchingDances={isSearchingDances} results={results} paginatedList={paginatedList} setResults={setResults} loadDanceDetails={loadDanceDetails} newPostContent={newPostContent} setNewPostContent={setNewPostContent} newPostVisibility={newPostVisibility} setNewPostVisibility={setNewPostVisibility} isPosting={isPosting} handleCreatePost={handleCreatePost} feedPosts={feedPosts} handleLikePost={handleLikePost} commentInputs={commentInputs} setCommentInputs={setCommentInputs} handleAddComment={handleAddComment}
              />
            )}

            {currentView.type === 'ACCOUNT' && (
              <AccountView 
                user={user} profile={profile} setProfile={setProfile} isEditingProfile={isEditingProfile} setIsEditingProfile={setIsEditingProfile} usernameStatus={usernameStatus} checkUsername={checkUsername} saveProfile={saveProfile} profileMessage={profileMessage} isUploadingPhoto={isUploadingPhoto} handlePhotoUpload={handlePhotoUpload} handleDeleteAccount={handleDeleteAccount} pullFromCloud={pullFromCloud} pushToCloud={pushToCloud} playlists={playlists} syncMessage={syncMessage} signOut={signOut} auth={auth} handleGoogle={handleGoogle} handleAuth={handleAuth} isLoginView={isLoginView} setIsLoginView={setIsLoginView} email={email} setEmail={setEmail} password={password} setPassword={setPassword} showPassword={showPassword} setShowPassword={setShowPassword} handlePasswordReset={handlePasswordReset} authMessage={authMessage} loadUserList={loadUserList} currentView={currentView}
              />
            )}

            {currentView.type === 'COMMUNITY' && (
              <CommunityView 
                communityQuery={communityQuery} handleUserSearch={handleUserSearch} isSearchingCommunity={isSearchingCommunity} communityResults={communityResults} setCurrentView={setCurrentView}
              />
            )}

            {currentView.type === 'OTHER_PROFILE' && (
              <OtherProfileView 
                handleBack={handleBack} targetProfile={currentView.targetProfile} loadUserList={loadUserList} currentView={currentView} currentUserProfile={profile} toggleFollow={toggleFollow}
              />
            )}

            {currentView.type === 'USER_LIST' && (
              <UserListView
                handleBack={handleBack} listTitle={currentView.listTitle} isLoadingUserList={isLoadingUserList} userListResults={userListResults} setCurrentView={setCurrentView}
              />
            )}

            {currentView.type === 'DANCE_PROFILE' && (
              <DanceProfileView
                handleBack={handleBack} dance={currentView.dance} playlists={playlists} addToPlaylist={addToPlaylist} activeBtn={activeBtn}
              />
            )}

            {(currentView.type === 'PLAYLISTS_LIST' || currentView.type === 'PLAYLIST_DETAIL') && (
              <PlaylistsView
                currentView={currentView} newPlaylistName={newPlaylistName} setNewPlaylistName={setNewPlaylistName} createPlaylist={createPlaylist} playlists={playlists} navigateTo={navigateTo} deletePlaylist={deletePlaylist} handleBack={handleBack} FilterComponent={FilterComponent} paginatedList={paginatedList} loadDanceDetails={loadDanceDetails} removeFromPlaylist={removeFromPlaylist} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages}
              />
            )}
          </>
        )}
      </div>
      {(currentView.type === 'HOME' || currentView.type === 'SEARCH') && !loading && <div style={{ position: 'fixed', bottom: 0, width: '100%', zIndex: 100 }}><DifficultyLegend /></div>}
    </div>
  );
}