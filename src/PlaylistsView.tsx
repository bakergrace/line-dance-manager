import React from 'react';
import type { Dance, AppView, ReturnPath } from './types';
import { COLORS } from './utils';

interface PlaylistsViewProps {
  currentView: AppView;
  newPlaylistName: string;
  setNewPlaylistName: (name: string) => void;
  createPlaylist: () => void;
  playlists: { [key: string]: Dance[] };
  navigateTo: (view: AppView) => void;
  deletePlaylist: (name: string) => void;
  handleBack: () => void;
  FilterComponent: React.FC;
  paginatedList: Dance[];
  loadDanceDetails: (dance: Dance, path: ReturnPath) => void;
  removeFromPlaylist: (id: string, listName: string) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({
  currentView, newPlaylistName, setNewPlaylistName, createPlaylist, playlists,
  navigateTo, deletePlaylist, handleBack, FilterComponent, paginatedList,
  loadDanceDetails, removeFromPlaylist, currentPage, setCurrentPage, totalPages
}) => {

  // --- VIEW 1: LIST OF PLAYLISTS ---
  if (currentView.type === 'PLAYLISTS_LIST') {
    return (
      <div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} placeholder="New playlist name..." style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.PRIMARY}`, fontSize: '16px' }} />
          <button onClick={createPlaylist} style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
        </div>
        {Object.keys(playlists).map(name => (
          <div key={name} style={{ backgroundColor: COLORS.WHITE, padding: '20px', borderRadius: '12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div onClick={() => navigateTo({ type: 'PLAYLIST_DETAIL', name })} style={{ flex: 1, cursor: 'pointer' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: COLORS.PRIMARY }}>{name}</h2>
              <span style={{ fontSize: '12px', color: COLORS.SECONDARY }}>{playlists[name].length} dances</span>
            </div>
            <button onClick={() => deletePlaylist(name)} style={{ background: 'none', border: 'none', color: COLORS.SECONDARY, fontSize: '24px', cursor: 'pointer' }}>×</button>
          </div>
        ))}
      </div>
    );
  }

  // --- VIEW 2: SINGLE PLAYLIST DETAILS ---
  if (currentView.type === 'PLAYLIST_DETAIL') {
    return (
      <div>
        <button onClick={handleBack} style={{ background: 'none', color: COLORS.PRIMARY, border: 'none', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px', fontSize: '16px' }}>← Back to Playlists</button>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', color: COLORS.PRIMARY }}>{currentView.name}</h2>
        
        {playlists[currentView.name] && playlists[currentView.name].length > 0 && <FilterComponent />}
        
        {playlists[currentView.name] ? paginatedList.map((d: Dance) => (
          <div key={`${currentView.name}-${d.id}`} style={{ backgroundColor: COLORS.WHITE, padding: '12px', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div onClick={() => loadDanceDetails(d, { type: 'PLAYLIST_DETAIL', name: currentView.name })} style={{ cursor: 'pointer', flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: COLORS.PRIMARY }}>{d.title}</div>
              <div style={{ fontSize: '12px', color: COLORS.SECONDARY }}>{d.songTitle}</div>
            </div>
            <button onClick={() => removeFromPlaylist(d.id, currentView.name)} style={{ color: COLORS.SECONDARY, background: 'none', border: `1px solid ${COLORS.SECONDARY}`, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', marginLeft: '10px', cursor: 'pointer' }}>Remove</button>
          </div>
        )) : <div style={{ color: 'red' }}>Error: Playlist not found.</div>}
        
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px', alignItems: 'center' }}>
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} style={{ padding: '8px', cursor: currentPage === 1 ? 'default' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}>← Prev</button>
            <span>Page {currentPage} of {totalPages || 1}</span>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} style={{ padding: '8px', cursor: currentPage === totalPages ? 'default' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}>Next →</button>
          </div>
        )}
      </div>
    );
  }

  return null;
};