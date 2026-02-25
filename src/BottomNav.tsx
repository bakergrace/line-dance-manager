import React from 'react';
import { Home, ListMusic, Users, UserCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AppView } from './types';
import { COLORS } from './utils';

interface BottomNavProps {
  currentView: AppView;
  navigateTo: (view: AppView) => void;
  user: any;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, navigateTo, user }) => {
  const navItems = [
    { id: 'HOME', icon: Home, label: 'Home' },
    { id: 'PLAYLISTS_LIST', icon: ListMusic, label: 'Playlists' },
    ...(user ? [{ id: 'COMMUNITY', icon: Users, label: 'Community' }] : []),
    { id: 'ACCOUNT', icon: UserCircle, label: 'Account' }
  ];

  const isActive = (id: string) => {
    if (id === 'PLAYLISTS_LIST' && currentView.type === 'PLAYLIST_DETAIL') return true;
    if (id === 'COMMUNITY' && currentView.type === 'OTHER_PROFILE') return true;
    return currentView.type === id;
  };

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      backgroundColor: COLORS.WHITE,
      borderTop: '1px solid #EAEAEA',
      paddingBottom: 'env(safe-area-inset-bottom)', // Supports iPhone "home bar" spacing
      zIndex: 1000,
      boxShadow: '0 -4px 12px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '65px', maxWidth: '600px', margin: '0 auto' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.id);
          
          return (
            <button
              key={item.id}
              onClick={() => navigateTo({ type: item.id as any })}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                color: active ? COLORS.PRIMARY : '#999',
                position: 'relative'
              }}
            >
              {/* MICRO-INTERACTION: Animated background pill when active */}
              {active && (
                <motion.div
                  layoutId="activeNavIndicator"
                  style={{ position: 'absolute', top: '-8px', width: '40px', height: '4px', backgroundColor: COLORS.SECONDARY, borderRadius: '0 0 4px 4px' }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              
              {/* MICRO-INTERACTION: Icon slightly scales up when clicked */}
              <motion.div whileTap={{ scale: 0.8 }}>
                <Icon size={24} strokeWidth={active ? 2.5 : 2} />
              </motion.div>
              
              <span style={{ fontSize: '10px', fontWeight: active ? 'bold' : 'normal' }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};