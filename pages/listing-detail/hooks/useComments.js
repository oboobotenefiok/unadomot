// pages/listing-detail/hooks/useComments.js - WITH PHOTO IN COMMENT
function useComments(listingId, user) {
  const [comments, setComments] = React.useState([]);
  const [commentsLoading, setCommentsLoading] = React.useState(true);
  const [commentsExpanded, setCommentsExpanded] = React.useState(false);
  
  const [newComment, setNewComment] = React.useState('');
  const [submittingComment, setSubmittingComment] = React.useState(false);
  
  // Track comment IDs and pending temps
  const commentIds = React.useRef(new Set());
  const pendingTempMessages = React.useRef(new Map()); // clientTimestamp -> {tempId, text}
  
  const unsubscribeRef = React.useRef(null);
  
  // ===== REAL-TIME LISTENER FOR COMMENTS =====
  React.useEffect(() => {
    if (!listingId) {
      setCommentsLoading(false);
      return;
    }
    
    // Clean up previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    setCommentsLoading(true);
    
    const listingRef = db.collection('listings').doc(listingId);
    
    // Listen to comments only
    unsubscribeRef.current = listingRef.collection('comments')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(
        async (snapshot) => {
            try {
              const commentsToAdd = [];
              const commentsToUpdate = [];
              const commentsToRemove = [];
              
              // Process each change
              for (const change of snapshot.docChanges()) {
                const commentId = change.doc.id;
                const data = change.doc.data();
                const clientTimestamp = data.clientTimestamp;
                
                if (change.type === 'added') {
                  // Check if this matches a pending temp message
                  if (clientTimestamp && pendingTempMessages.current.has(clientTimestamp)) {
                    const tempData = pendingTempMessages.current.get(clientTimestamp);
                    
                    // Replace temp comment with real one
                    setComments(prev => prev.map(c =>
                      c.id === tempData.tempId ?
                      {
                        id: commentId,
                        ...data,
                        // Use the data directly from the comment document
                        user: {
                          name: data.userName || 'User',
                          photoURL: data.userPhotoURL || null,
                          userType: data.userType || 'user'
                        },
                        reactionCounts: data.reactionCounts || {},
                        isTemp: false
                      } :
                      c
                    ));
                    
                    // Clean up tracking
                    commentIds.current.delete(tempData.tempId);
                    pendingTempMessages.current.delete(clientTimestamp);
                    commentIds.current.add(commentId);
                    
                    continue;
                  }
                  
                  // Skip if we already have this ID
                  if (commentIds.current.has(commentId)) {
                    continue;
                  }
                  
                  commentIds.current.add(commentId);
                  
                  // Use data directly from comment document
                  commentsToAdd.push({
                    id: commentId,
                    ...data,
                    user: {
                      name: data.userName || 'User',
                      photoURL: data.userPhotoURL || null,
                      userType: data.userType || 'user'
                    },
                    reactionCounts: data.reactionCounts || {},
                    isTemp: false
                  });
                  
                } else if (change.type === 'modified') {
                  // Update existing comment
                  commentsToUpdate.push({
                    id: commentId,
                    ...data,
                    user: {
                      name: data.userName || 'User',
                      photoURL: data.userPhotoURL || null,
                      userType: data.userType || 'user'
                    },
                    reactionCounts: data.reactionCounts || {},
                    isTemp: false
                  });
                  
                } else if (change.type === 'removed') {
                  commentIds.current.delete(commentId);
                  commentsToRemove.push(commentId);
                }
              }
              
              // Apply all changes in batch
              if (commentsToAdd.length > 0) {
                setComments(prev => {
                  const combined = [...prev, ...commentsToAdd].sort((a, b) => {
                    const aTime = a.createdAt?.seconds || 0;
                    const bTime = b.createdAt?.seconds || 0;
                    return bTime - aTime;
                  });
                  return combined;
                });
              }
              
              if (commentsToUpdate.length > 0) {
                setComments(prev => {
                  const updated = [...prev];
                  commentsToUpdate.forEach(updatedComment => {
                    const index = updated.findIndex(c => c.id === updatedComment.id);
                    if (index !== -1) {
                      updated[index] = updatedComment;
                    }
                  });
                  return updated;
                });
              }
              
              if (commentsToRemove.length > 0) {
                setComments(prev => prev.filter(c => !commentsToRemove.includes(c.id)));
              }
              
              setCommentsLoading(false);
            } catch (error) {
              
              setCommentsLoading(false);
            }
          },
          (error) => {
                     setCommentsLoading(false);
          }
      );
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [listingId]);
  
  // ===== SUBMIT COMMENT =====
  const handleSubmitComment = React.useCallback(async (e) => {
    e.preventDefault();
    
    if (!user) {
      window.__openAuthModal?.('login', window.location.pathname);
      return;
    }
    
    const trimmed = newComment.trim();
    if (!trimmed) return;
    
    setSubmittingComment(true);
    
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const timestamp = Date.now();
    const clientTimestamp = timestamp / 1000; // Use seconds for Firestore
    
    // Create optimistic comment with user data embedded
    const optimisticComment = {
      id: tempId,
      userId: user.uid,
      userName: user.displayName || 'User',
      userPhotoURL: user.photoURL || null,
      userType: user.userType || 'user',
      text: CommentHelpers.sanitizeComment(trimmed),
      createdAt: { seconds: clientTimestamp },
      user: {
        name: user.displayName || 'User',
        photoURL: user.photoURL || null,
        userType: user.userType || 'user'
      },
      reactionCounts: {},
      isTemp: true
    };
    
    // Store mapping for later replacement
    pendingTempMessages.current.set(clientTimestamp, {
      tempId: tempId,
      user: optimisticComment.user,
      text: trimmed
    });
    
    commentIds.current.add(tempId);
    
    // Add optimistic comment to state
    setComments(prev => [optimisticComment, ...prev]);
    
    // Clear input immediately
    setNewComment('');
    
    try {
      // Add to Firestore with user data embedded
      const docRef = await db.collection('listings').doc(listingId)
        .collection('comments')
        .add({
          userId: user.uid,
          userName: user.displayName || 'User',
          userPhotoURL: user.photoURL || null,
          userType: user.userType || 'user',
          text: CommentHelpers.sanitizeComment(trimmed),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          clientTimestamp: clientTimestamp,
          reactionCounts: {}
        });
      
      
      
    } catch (error) {
      
      
      // Remove optimistic comment on error
      setComments(prev => prev.filter(c => c.id !== tempId));
      
      // Remove from tracking on error
      commentIds.current.delete(tempId);
      pendingTempMessages.current.delete(clientTimestamp);
      
      // Show error to user
      alert('Failed to post comment. Please check your connection and try again.');
      
    } finally {
      setSubmittingComment(false);
    }
  }, [user, listingId, newComment]);
  
  // Clean up old temp mappings periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now() / 1000;
      const expired = [];
      
      pendingTempMessages.current.forEach((value, timestamp) => {
        if (now - timestamp > 30) { // 30 seconds timeout
          expired.push(timestamp);
        }
      });
      
      expired.forEach(timestamp => {
        const tempData = pendingTempMessages.current.get(timestamp);
        if (tempData) {
          // Remove stuck temp comments
          setComments(prev => prev.filter(c => c.id !== tempData.tempId));
          commentIds.current.delete(tempData.tempId);
          pendingTempMessages.current.delete(timestamp);
        }
      });
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // ===== TOGGLE COMMENTS EXPANDED =====
  const toggleCommentsExpanded = React.useCallback(() => {
    setCommentsExpanded(prev => !prev);
  }, []);
  
  return {
    comments,
    commentsLoading,
    commentsExpanded,
    newComment,
    setNewComment,
    submittingComment,
    handleSubmitComment,
    toggleCommentsExpanded
  };
}

window.useComments = useComments;