import { useState } from 'react';

// --- TYPE DEFINITION ---
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

interface DanceProfileProps {
  dance: Dance;
  playlists: { [key: string]: Dance[] };
  onBack: () => void;
  onAddToPlaylist: (dance: Dance, playlistName: string) => void;
  colors: any;
}

export default function DanceProfile({ dance, playlists, onBack, onAddToPlaylist, colors }: DanceProfileProps) {
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  // Safety check: If dance is null/undefined, show error instead of crashing
  if (!dance) return <div style={{ padding: 20 }}>Error: Dance data missing. <button onClick={onBack}>Go Back</button></div>;

  const handleAdd = (name: string) => {
    setActiveBtn(name);
    onAddToPlaylist(dance, name);
    setTimeout(() => setActiveBtn(null), 1000);
  };

  const renderStepSheet = () => {
    if (!dance.stepSheetContent || dance.stepSheetContent.length === 0) {
      return <div style={{ opacity: 0.5, fontStyle: 'italic' }}>Loading steps...</div>;
    }
    return dance.stepSheetContent.map((row: any, idx: number) => (
      <div key={idx} style={{ marginBottom: '8px' }}>
        {(row?.heading || row?.title) && (
          <div style={{ fontWeight: 'bold', color: colors.PRIMARY, marginTop: '12px', textTransform: 'uppercase', fontSize: '0.9rem' }}>
            {row.heading || row.title}
          </div>
        )}
        {(row?.text || row?.description || row?.instruction) && (
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            {row?.counts && (
              <span style={{ fontWeight: 'bold', width: '40px', flexShrink: 0, fontSize: '0.9rem', color: '#555' }}>
                {row.counts}
              </span>
            )}
            <span style={{ lineHeight: '1.4' }}>{row.text || row.description || row.instruction}</span>
          </div>
        )}
        {row?.note && (
          <div style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#777', marginLeft: '40px', marginTop: '2px' }}>
            Note: {row.note}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div style={{ backgroundColor: colors.WHITE, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <button 
        onClick={onBack} 
        style={{ 
          background: 'none', 
          color: colors.PRIMARY, 
          border: `1px solid ${colors.PRIMARY}`, 
          padding: '8px 16px', 
          borderRadius: '6px', 
          cursor: 'pointer', 
          marginBottom: '20px',
          fontWeight: 'bold',
          fontSize: '0.9rem'
        }}
      >
        ← Back
      </button>

      {/* CRASH FIX: Added safe accessors (|| '') to prevent lowercase() on null */}
      <h1 style={{ fontSize: '1.8rem', marginBottom: '8px', fontWeight: 800, color: '#333' }}>
        {(dance.title || 'Untitled Dance').toLowerCase()}
      </h1>
      <div style={{ color: colors.SECONDARY, fontWeight: 'bold', marginBottom: '24px', fontSize: '0.95rem' }}>
        {(dance.difficultyLevel || 'Unknown').toLowerCase()} • {dance.counts || 0} counts • {dance.wallCount || 0} walls
      </div>
      
      <div style={{ backgroundColor: '#F5F5F7', padding: '15px', borderRadius: '8px', marginBottom: '30px' }}>
        <p style={{ margin: '0 0 5px 0' }}><strong>Song:</strong> {dance.songTitle || 'Unknown'}</p>
        <p style={{ margin: 0 }}><strong>Artist:</strong> {dance.songArtist || 'Unknown'}</p>
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#555' }}>Add to Playlist:</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {Object.keys(playlists).map(name => {
            const isAdded = playlists[name].some(d => d.id === dance.id);
            return (
              <button 
                key={name} 
                onClick={() => handleAdd(name)}
                disabled={isAdded}
                style={{ 
                  flex: '1 1 auto', 
                  backgroundColor: isAdded ? '#81C784' : (activeBtn === name ? colors.SECONDARY : colors.PRIMARY), 
                  color: colors.WHITE, 
                  border: 'none', 
                  padding: '10px 16px', 
                  borderRadius: '6px', 
                  fontWeight: '600', 
                  cursor: isAdded ? 'default' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {isAdded ? '✓ Added' : name}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${colors.PRIMARY}30`, paddingTop: '20px' }}>
        <h3 style={{ fontSize: '1.4rem', marginBottom: '15px', color: colors.PRIMARY }}>Step Sheet</h3>
        <div style={{ backgroundColor: '#FAFAFA', padding: '20px', borderRadius: '8px', fontSize: '14px', color: '#333', border: '1px solid #EEE' }}>
          {renderStepSheet()}
        </div>
        {dance.originalStepSheetUrl && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <a 
                href={dance.originalStepSheetUrl} 
                target="_blank" 
                rel="noreferrer" 
                style={{ color: colors.PRIMARY, fontWeight: 'bold', textDecoration: 'none', borderBottom: `2px solid ${colors.SECONDARY}` }}
              >
                View Original Sheet ↗
              </a>
            </div>
        )}
      </div>
    </div>
  );
}