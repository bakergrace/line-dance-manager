import React from 'react';
import type { Dance } from './types';
import { COLORS } from './utils';

interface DanceProfileViewProps {
  handleBack: () => void;
  dance: Dance;
  playlists: { [key: string]: Dance[] };
  addToPlaylist: (dance: Dance, listName: string) => void;
  activeBtn: string | null;
}

export const DanceProfileView: React.FC<DanceProfileViewProps> = ({
  handleBack,
  dance,
  playlists,
  addToPlaylist,
  activeBtn
}) => {
  return (
    <div style={{ backgroundColor: COLORS.WHITE, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <button onClick={handleBack} style={{ background: 'none', color: COLORS.PRIMARY, border: `1px solid ${COLORS.PRIMARY}`, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}>← Back</button>
      
      <h1 style={{ fontSize: '1.8rem', marginBottom: '8px', fontWeight: 800, color: '#333' }}>{dance.title.toLowerCase()}</h1>
      <div style={{ color: COLORS.SECONDARY, fontWeight: 'bold', marginBottom: '24px', fontSize: '0.95rem' }}>
        {dance.difficultyLevel.toLowerCase()} • {dance.counts} counts • {dance.wallCount} walls
      </div>
      
      <div style={{ backgroundColor: '#F5F5F7', padding: '15px', borderRadius: '8px', marginBottom: '30px' }}>
        <p style={{ margin: '0 0 5px 0' }}><strong>Song:</strong> {dance.songTitle.toLowerCase()}</p>
        <p style={{ margin: 0 }}><strong>Artist:</strong> {dance.songArtist.toLowerCase()}</p>
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#555' }}>Add to Playlist:</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {Object.keys(playlists).map(name => {
            const isAdded = (playlists[name] || []).some(d => d.id === dance.id);
            return (
              <button 
                key={name} 
                onClick={() => addToPlaylist(dance, name)} 
                disabled={isAdded} 
                style={{ flex: '1 1 auto', backgroundColor: isAdded ? '#81C784' : (activeBtn === name ? COLORS.SECONDARY : COLORS.PRIMARY), color: COLORS.WHITE, border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: '600', cursor: isAdded ? 'default' : 'pointer' }}
              >
                {isAdded ? '✓ Added' : name}
              </button>
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
          ) : <div style={{ opacity: 0.5 }}>Step sheet not found in database.</div>}
        </div>
        {dance.originalStepSheetUrl && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <a href={dance.originalStepSheetUrl} target="_blank" rel="noreferrer" style={{ color: COLORS.PRIMARY, fontWeight: 'bold' }}>View Original Sheet ↗</a>
          </div>
        )}
      </div>
    </div>
  );
};