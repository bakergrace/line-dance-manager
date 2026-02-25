import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore"; 
import { db } from './firebaseSetup';
import type { Post, PostComment, UserProfile, AppView } from './types';
import type { User } from "firebase/auth";

export function useFeed(user: User | null, profile: UserProfile, currentView: AppView) {
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostVisibility, setNewPostVisibility] = useState<'public' | 'followers' | 'friends' | 'private'>('public');
  const [isPosting, setIsPosting] = useState(false);
  const [commentInputs, setCommentInputs] = useState<{[postId: string]: string}>({});
  const [isFeedLoading, setIsFeedLoading] = useState(false);

  const fetchFeed = async () => {
    if (!user) return;
    setIsFeedLoading(true);
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
    setIsFeedLoading(false);
  };

  // Automatically fetch feed when user logs in or visits the HOME tab
  useEffect(() => {
    if (user && currentView.type === 'HOME') {
      fetchFeed();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentView.type, profile.following, profile.followers]);

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

  return {
    feedPosts, newPostContent, setNewPostContent, newPostVisibility, 
    setNewPostVisibility, isPosting, commentInputs, setCommentInputs, 
    isFeedLoading, handleCreatePost, handleLikePost, handleAddComment, fetchFeed
  };
}