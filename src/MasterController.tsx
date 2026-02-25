import { useState, useEffect } from 'react';

// --- FIREBASE & UTILS ---
import { signOut } from "firebase/auth";
import { auth } from './firebaseSetup';
import { COLORS, STORAGE_KEYS, normalizeDanceData } from './utils';
import type { AppView } from './types';

// --- CUSTOM HOOKS ---
import { useAuth } from './useAuth';
import { useSearch } from './useSearch';
import { useFeed } from './useFeed';
import { useCommunity } from './useCommunity';
import { usePlaylists } from './usePlaylists';
import { useProfile } from './useProfile';

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
  // 1. BASE UI STATE
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>({ type: 'HOME' }); 
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);

  // 2. INITIALIZE HOOKS
  const authState = useAuth();
  const searchState = useSearch();
  const profileState = useProfile(authState.user);
  
  const navigateTo = (view: AppView) => { 
    setCurrentView(view); 
    searchState.setFilterDiff('all'); 
    searchState.setSortOrder('default'); 
    searchState.setCurrentPage(1); 
    window.scrollTo(0,0); 
  };

  const playlistsState = usePlaylists(
    authState.user, 
    profileState.profile, 
    profileState.pushToCloud, 
    setCurrentView, 
    setLoading, 
    navigateTo
  );

  const communityState = useCommunity(
    authState.user, 
    profileState.profile, 
    profileState.setProfile, 
    playlistsState.playlists, 
    profileState.pushToCloud, 
    currentView, 
    setCurrentView
  );

  const feedState = useFeed(authState.user, profileState.profile, currentView);

  // 3. LIFECYCLE EFFECTS
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
        playlistsState.setPlaylists(cleaned);
      }
    } catch (e) { console.error("Load Error", e); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authState.user) {
      profileState.pullFromCloud().then(fetchedPlaylists => {
        if (fetchedPlaylists) {
          playlistsState.setPlaylists(fetchedPlaylists);
        } else {
          profileState.pushToCloud(playlistsState.playlists, profileState.profile);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.user]);

  // 4. NAVIGATION HANDLER
  const handleBack = () => {
    if (currentView.type === 'DANCE_PROFILE') {
      const path = currentView.returnPath;
      if (path.type === 'SEARCH') setCurrentView({ type: 'SEARCH' });
      else if (path.type === 'HOME') setCurrentView({ type: 'HOME' });
      else if (path.type === 'COMMUNITY') setCurrentView({ type: 'COMMUNITY' });
      else if (path.type === 'PLAYLIST_DETAIL') {
        if (playlistsState.playlists[path.name]) setCurrentView({ type: 'PLAYLIST_DETAIL', name: path.name });
        else setCurrentView({ type: 'PLAYLISTS_LIST' });
      }
    } else if (currentView.type === 'PLAYLIST_DETAIL') navigateTo({ type: 'PLAYLISTS_LIST' });
    else if (currentView.type === 'OTHER_PROFILE') navigateTo({ type: 'COMMUNITY' });
    else if (currentView.type === 'USER_LIST') setCurrentView(currentView.returnPath);
  };

  // 5. WRAPPER FUNCTIONS (To prevent modifying View Props)
  const executeProfileSave = () => profileState.saveProfile(playlistsState.playlists);
  const executeCloudPull = () => {
    profileState.pullFromCloud().then(p => { if (p) playlistsState.setPlaylists(p); });
  };

  // 6. RENDER
  return (
    <div style={{ backgroundColor: COLORS.BACKGROUND, minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
      <style>{`@keyframes swoopIn { 0% { transform: scale(0.1) translateY(100px); opacity: 0; } 60% { transform: scale(1.05) translateY(0); opacity: 1; } 100% { transform: scale(1) translateY(0); opacity: 1; } }`}</style>
      
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
              {authState.user && <button onClick={() => navigateTo({ type: 'COMMUNITY' })} style={{ padding: '8px 12px', background: 'none', border: 'none', borderBottom: currentView.type === 'COMMUNITY' || currentView.type === 'OTHER_PROFILE' ? `3px solid ${COLORS.SECONDARY}` : 'none', color: COLORS.PRIMARY, fontWeight: 'bold', cursor: 'pointer', fontSize: isMobile ? '13px' : '16px' }}>Community</button>}
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
                user={authState.user} profile={profileState.profile} queryInput={searchState.queryInput} setQueryInput={searchState.setQueryInput} handleSearch={searchState.handleSearch} isSearchingDances={searchState.isSearchingDances} results={searchState.results} paginatedList={searchState.applyFiltersAndSort(searchState.results).slice((searchState.currentPage - 1) * searchState.itemsPerPage, searchState.currentPage * searchState.itemsPerPage)} setResults={searchState.setResults} loadDanceDetails={playlistsState.loadDanceDetails} newPostContent={feedState.newPostContent} setNewPostContent={feedState.setNewPostContent} newPostVisibility={feedState.newPostVisibility} setNewPostVisibility={feedState.setNewPostVisibility} isPosting={feedState.isPosting} handleCreatePost={feedState.handleCreatePost} feedPosts={feedState.feedPosts} handleLikePost={feedState.handleLikePost} commentInputs={feedState.commentInputs} setCommentInputs={feedState.setCommentInputs} handleAddComment={feedState.handleAddComment}
              />
            )}

            {currentView.type === 'ACCOUNT' && (
              <AccountView 
                user={authState.user} profile={profileState.profile} setProfile={profileState.setProfile} isEditingProfile={profileState.isEditingProfile} setIsEditingProfile={profileState.setIsEditingProfile} usernameStatus={profileState.usernameStatus} checkUsername={profileState.checkUsername} saveProfile={executeProfileSave} profileMessage={profileState.profileMessage} isUploadingPhoto={profileState.isUploadingPhoto} handlePhotoUpload={profileState.handlePhotoUpload} handleDeleteAccount={profileState.handleDeleteAccount} pullFromCloud={executeCloudPull} pushToCloud={profileState.pushToCloud} playlists={playlistsState.playlists} syncMessage={profileState.syncMessage} signOut={signOut} auth={auth} handleGoogle={authState.handleGoogle} handleAuth={authState.handleAuth} isLoginView={authState.isLoginView} setIsLoginView={authState.setIsLoginView} email={authState.email} setEmail={authState.setEmail} password={authState.password} setPassword={authState.setPassword} showPassword={authState.showPassword} setShowPassword={authState.setShowPassword} handlePasswordReset={authState.handlePasswordReset} authMessage={authState.authMessage} loadUserList={communityState.loadUserList} currentView={currentView}
              />
            )}

            {currentView.type === 'COMMUNITY' && (
              <CommunityView 
                communityQuery={communityState.communityQuery} handleUserSearch={communityState.handleUserSearch} isSearchingCommunity={communityState.isSearchingCommunity} communityResults={communityState.communityResults} setCurrentView={setCurrentView}
              />
            )}

            {currentView.type === 'OTHER_PROFILE' && (
              <OtherProfileView 
                handleBack={handleBack} targetProfile={currentView.targetProfile} loadUserList={communityState.loadUserList} currentView={currentView} currentUserProfile={profileState.profile} toggleFollow={communityState.toggleFollow}
              />
            )}

            {currentView.type === 'USER_LIST' && (
              <UserListView
                handleBack={handleBack} listTitle={currentView.listTitle} isLoadingUserList={communityState.isLoadingUserList} userListResults={communityState.userListResults} setCurrentView={setCurrentView}
              />
            )}

            {currentView.type === 'DANCE_PROFILE' && (
              <DanceProfileView
                handleBack={handleBack} dance={currentView.dance} playlists={playlistsState.playlists} addToPlaylist={playlistsState.addToPlaylist} activeBtn={playlistsState.activeBtn}
              />
            )}

            {(currentView.type === 'PLAYLISTS_LIST' || currentView.type === 'PLAYLIST_DETAIL') && (
              <PlaylistsView
                currentView={currentView} newPlaylistName={playlistsState.newPlaylistName} setNewPlaylistName={playlistsState.setNewPlaylistName} createPlaylist={playlistsState.createPlaylist} playlists={playlistsState.playlists} navigateTo={navigateTo} deletePlaylist={(name) => playlistsState.deletePlaylist(name, currentView)} handleBack={handleBack} FilterComponent={() => <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', backgroundColor: COLORS.WHITE, padding: '10px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><select value={searchState.filterDiff} onChange={(e) => { searchState.setFilterDiff(e.target.value); searchState.setCurrentPage(1); }} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: `1px solid ${COLORS.PRIMARY}`, outline: 'none', fontSize: '14px' }}><option value="all">All Levels</option><option value="absolute">Absolute</option><option value="beginner">Beginner</option><option value="improver">Improver</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select><select value={searchState.sortOrder} onChange={(e) => { searchState.setSortOrder(e.target.value); searchState.setCurrentPage(1); }} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: `1px solid ${COLORS.PRIMARY}`, outline: 'none', fontSize: '14px' }}><option value="default">Sort: Default</option><option value="az">Sort: A-Z</option><option value="za">Sort: Z-A</option></select></div>} paginatedList={searchState.applyFiltersAndSort(playlistsState.playlists[currentView.type === 'PLAYLIST_DETAIL' ? currentView.name : ''] || []).slice((searchState.currentPage - 1) * searchState.itemsPerPage, searchState.currentPage * searchState.itemsPerPage)} loadDanceDetails={playlistsState.loadDanceDetails} removeFromPlaylist={playlistsState.removeFromPlaylist} currentPage={searchState.currentPage} setCurrentPage={searchState.setCurrentPage} totalPages={Math.ceil((searchState.applyFiltersAndSort(playlistsState.playlists[currentView.type === 'PLAYLIST_DETAIL' ? currentView.name : ''] || [])).length / searchState.itemsPerPage)}
              />
            )}
          </>
        )}
      </div>
      {(currentView.type === 'HOME' || currentView.type === 'SEARCH') && !loading && <div style={{ position: 'fixed', bottom: 0, width: '100%', zIndex: 100 }}><DifficultyLegend /></div>}
    </div>
  );
}