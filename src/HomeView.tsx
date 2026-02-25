import React from 'react';
import type { User } from "firebase/auth";
import { Search, PlusCircle, MessageSquare, Heart, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Dance, UserProfile, Post } from './types';
import { COLORS } from './utils';

interface HomeViewProps {
  user: User | null;
  profile: UserProfile;
  queryInput: string;
  setQueryInput: (val: string) => void;
  handleSearch: (val: string) => void;
  isSearchingDances: boolean;
  results: Dance[];
  paginatedList: Dance[];
  setResults: (dances: Dance[]) => void;
  loadDanceDetails: (dance: Dance, source: any) => void;
  // Feed Props
  newPostContent: string;
  setNewPostContent: (val: string) => void;
  newPostVisibility: 'public' | 'followers' | 'friends' | 'private';
  setNewPostVisibility: (val: 'public' | 'followers' | 'friends' | 'private') => void;
  isPosting: boolean;
  handleCreatePost: () => void;
  feedPosts: Post[];
  handleLikePost: (postId: string, currentLikes: string[]) => void;
  commentInputs: {[postId: string]: string};
  setCommentInputs: (val: {[postId: string]: string}) => void;
  handleAddComment: (postId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = (props) => {
  const {
    user, queryInput, setQueryInput, handleSearch, 
    results, paginatedList, loadDanceDetails, newPostContent, setNewPostContent,
    newPostVisibility, setNewPostVisibility, isPosting, handleCreatePost,
    feedPosts, handleLikePost, commentInputs, setCommentInputs, handleAddComment
  } = props;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* 1. DANCE SEARCH BAR */}
      <div style={{ marginBottom: '25px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search style={{ position: 'absolute', left: '15px', color: COLORS.PRIMARY }} size={20} />
          <input 
            value={queryInput} 
            onChange={e => setQueryInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSearch(queryInput)}
            placeholder="Search 50,000+ dances..." 
            style={{ width: '100%', padding: '15px 15px 15px 45px', borderRadius: '30px', border: `2px solid ${COLORS.PRIMARY}20`, fontSize: '16px', outline: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }} 
          />
        </div>
      </div>

      {results.length > 0 ? (
        /* 2. SEARCH RESULTS VIEW */
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '14px', color: COLORS.NEUTRAL, marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>Search Results</h3>
          {paginatedList.map((dance) => (
            <motion.div 
              whileHover={{ x: 5 }}
              key={dance.id} 
              onClick={() => loadDanceDetails(dance, { type: 'HOME' })} 
              style={{ backgroundColor: COLORS.WHITE, padding: '16px', borderRadius: '12px', marginBottom: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}
            >
              <div>
                <div style={{ fontWeight: 'bold', color: COLORS.PRIMARY, fontSize: '16px' }}>{dance.title.toLowerCase()}</div>
                <div style={{ fontSize: '13px', color: COLORS.SECONDARY }}>{dance.songTitle.toLowerCase()}</div>
              </div>
              <PlusCircle size={20} color={COLORS.SECONDARY} />
            </motion.div>
          ))}
          <button onClick={() => props.setResults([])} style={{ width: '100%', padding: '10px', background: 'none', border: `1px solid ${COLORS.PRIMARY}20`, borderRadius: '8px', color: COLORS.PRIMARY, fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Clear Results</button>
        </div>
      ) : (
        <>
          {/* 3. TEXT-BASED POST CREATOR (Restored) */}
          {user && (
            <div style={{ backgroundColor: COLORS.WHITE, padding: '20px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', border: '1px solid #F0F0F0' }}>
              <textarea 
                placeholder="What's on your mind, dancer?"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #EEE', backgroundColor: '#F9F9FB', minHeight: '80px', outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <select 
                  value={newPostVisibility} 
                  onChange={(e) => setNewPostVisibility(e.target.value as any)}
                  style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #EEE', fontSize: '12px', color: COLORS.NEUTRAL, outline: 'none' }}
                >
                  <option value="public">🌎 Public</option>
                  <option value="followers">👥 Followers</option>
                  <option value="private">🔒 Private</option>
                </select>
                <button 
                  onClick={handleCreatePost}
                  disabled={isPosting || !newPostContent.trim()}
                  style={{ backgroundColor: COLORS.PRIMARY, color: '#FFF', border: 'none', padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {isPosting ? 'Posting...' : <><Send size={16} /> Post</>}
                </button>
              </div>
            </div>
          )}

          {/* 4. FEED SECTION */}
          <div>
            <h3 style={{ fontSize: '14px', color: COLORS.NEUTRAL, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Dancer Feed</h3>
            {feedPosts.map((post) => {
              // FIX: Ensure post.id exists before using it to avoid TS(2345) and TS(2538)
              const postId = post.id || 'temp-id';

              return (
                <div key={postId} style={{ backgroundColor: COLORS.WHITE, borderRadius: '16px', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #F0F0F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                    {post.authorPhotoUrl ? (
                      <img src={post.authorPhotoUrl} alt="User" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#EEE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px' }}>@{post.authorUsername}</div>
                      <div style={{ fontSize: '11px', color: COLORS.NEUTRAL }}>{new Date(post.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.5', marginBottom: '15px' }}>{post.content}</p>

                  <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid #F5F5F5', paddingTop: '15px' }}>
                    <button 
                      onClick={() => handleLikePost(postId, post.likes)}
                      style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: post.likes.includes(user?.uid || '') ? COLORS.ERROR : COLORS.NEUTRAL }}
                    >
                      <Heart size={18} fill={post.likes.includes(user?.uid || '') ? COLORS.ERROR : 'none'} />
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{post.likes.length}</span>
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.NEUTRAL }}>
                      <MessageSquare size={18} />
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{post.comments.length}</span>
                    </div>
                  </div>

                  {post.comments.length > 0 && (
                    <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#F9F9FB', borderRadius: '8px' }}>
                      {post.comments.map((comment, i) => (
                        <div key={i} style={{ fontSize: '12px', marginBottom: '5px' }}>
                          <span style={{ fontWeight: 'bold' }}>@{comment.username}</span> {comment.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {user && (
                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                      <input 
                        placeholder="Add a comment..."
                        value={commentInputs[postId] || ''}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [postId]: e.target.value })}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid #EEE', fontSize: '13px', outline: 'none' }}
                      />
                      <button 
                        onClick={() => handleAddComment(postId)}
                        style={{ color: COLORS.PRIMARY, background: 'none', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                      >
                        Post
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
};