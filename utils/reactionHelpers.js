// utils/reactionHelpers.js
const ReactionHelpers = {
  // Collection names
  REACTIONS_COLLECTION: 'reactions',
  
  // Reaction types
  TYPES: {
    LIKE: 'like',
    LOVE: 'love',
    LAUGH: 'laugh',
    HELPFUL: 'helpful',
    SUPPORT: 'support'
  },
  
  /**
   * Get the reactions subcollection reference for any content
   * @param {string} contentType - 'comment', 'listing', 'reply', etc.
   * @param {string} contentId - ID of the content
   * @returns {CollectionReference} Firestore collection reference
   */
  getReactionsRef: function(contentType, contentId) {
    return db.collection(contentType).doc(contentId).collection(this.REACTIONS_COLLECTION);
  },
  
  /**
   * Toggle a reaction for a user on any content
   * @param {Object} params
   * @param {string} params.contentType - 'comment', 'listing', etc.
   * @param {string} params.contentId - ID of content
   * @param {string} params.userId - User performing reaction
   * @param {string} params.reactionType - 'like', 'love', etc.
   * @returns {Promise<Object>} Result with new state and counts
   */
  toggleReaction: async function({ contentType, contentId, userId, reactionType }) {
    if (!contentType || !contentId || !userId || !reactionType) {
      throw new Error('Missing required parameters');
    }
    
    const reactionRef = this.getReactionsRef(contentType, contentId).doc(userId);
    const contentRef = db.collection(contentType).doc(contentId);
    
    try {
      const reactionDoc = await reactionRef.get();
      
      if (reactionDoc.exists) {
        const existing = reactionDoc.data();
        
        if (existing.type === reactionType) {
          // Remove reaction (toggle off)
          await db.runTransaction(async (transaction) => {
            transaction.delete(reactionRef);
            
            // Decrement count for this reaction type
            transaction.update(contentRef, {
              [`reactionCounts.${reactionType}`]: firebase.firestore.FieldValue.increment(-1),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          });
          
          return {
            active: false,
            type: null,
            counts: await this.getReactionCounts(contentType, contentId)
          };
        } else {
          // Change reaction type
          await db.runTransaction(async (transaction) => {
            transaction.update(reactionRef, {
              type: reactionType,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Decrement old type, increment new type
            transaction.update(contentRef, {
              [`reactionCounts.${existing.type}`]: firebase.firestore.FieldValue.increment(-1),
              [`reactionCounts.${reactionType}`]: firebase.firestore.FieldValue.increment(1),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          });
          
          return {
            active: true,
            type: reactionType,
            counts: await this.getReactionCounts(contentType, contentId)
          };
        }
      } else {
        // Add new reaction
        await db.runTransaction(async (transaction) => {
          transaction.set(reactionRef, {
            type: reactionType,
            userId: userId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          // Increment count for this reaction type
          transaction.update(contentRef, {
            [`reactionCounts.${reactionType}`]: firebase.firestore.FieldValue.increment(1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        
        return {
          active: true,
          type: reactionType,
          counts: await this.getReactionCounts(contentType, contentId)
        };
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      throw error;
    }
  },
  
  /**
   * Get reaction counts for any content
   * @param {string} contentType
   * @param {string} contentId
   * @returns {Promise<Object>} Counts by reaction type
   */
  getReactionCounts: async function(contentType, contentId) {
    try {
      const contentDoc = await db.collection(contentType).doc(contentId).get();
      if (!contentDoc.exists) return {};
      
      const data = contentDoc.data();
      return data.reactionCounts || {};
    } catch (error) {
      console.error('Error getting reaction counts:', error);
      return {};
    }
  },
  
  /**
   * Get user's reaction to specific content
   * @param {string} contentType
   * @param {string} contentId
   * @param {string} userId
   * @returns {Promise<string|null>} Reaction type or null
   */
  getUserReaction: async function(contentType, contentId, userId) {
    if (!userId) return null;
    
    try {
      const reactionRef = this.getReactionsRef(contentType, contentId).doc(userId);
      const reactionDoc = await reactionRef.get();
      return reactionDoc.exists ? reactionDoc.data().type : null;
    } catch (error) {
      console.error('Error getting user reaction:', error);
      return null;
    }
  },
  
  /**
   * Listen to reactions in real-time
   * @param {string} contentType
   * @param {string} contentId
   * @param {string} userId - Current user (for personal reaction)
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  listenToReactions: function(contentType, contentId, userId, callback) {
    const contentRef = db.collection(contentType).doc(contentId);
    
    // Listen to content doc for counts
    const unsubscribeContent = contentRef.onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        callback({
          counts: data.reactionCounts || {},
          loading: false
        });
      }
    });
    
    // Also listen to user's personal reaction if logged in
    let unsubscribeUser = null;
    if (userId) {
      const userReactionRef = this.getReactionsRef(contentType, contentId).doc(userId);
      unsubscribeUser = userReactionRef.onSnapshot((doc) => {
        callback({
          userReaction: doc.exists ? doc.data().type : null,
          counts: null, // Will be updated by content listener
          loading: false
        });
      });
    }
    
    return () => {
      unsubscribeContent();
      if (unsubscribeUser) unsubscribeUser();
    };
  },
  
  /**
   * Batch get reactions for multiple items (for list views)
   * @param {string} contentType
   * @param {Array} contentIds
   * @param {string} userId
   * @returns {Promise<Object>} Map of contentId -> { counts, userReaction }
   */
  batchGetReactions: async function(contentType, contentIds, userId) {
    if (!contentIds.length) return {};
    
    const results = {};
    const batchSize = 10;
    
    for (let i = 0; i < contentIds.length; i += batchSize) {
      const batch = contentIds.slice(i, i + batchSize);
      
      // Get content docs for counts
      const contentSnapshot = await db.collection(contentType)
        .where('__name__', 'in', batch)
        .get();
      
      contentSnapshot.forEach(doc => {
        results[doc.id] = {
          counts: doc.data().reactionCounts || {}
        };
      });
      
      // If user logged in, get their reactions
      if (userId) {
        for (const contentId of batch) {
          const reactionRef = this.getReactionsRef(contentType, contentId).doc(userId);
          const reactionDoc = await reactionRef.get();
          if (results[contentId]) {
            results[contentId].userReaction = reactionDoc.exists ? reactionDoc.data().type : null;
          }
        }
      }
    }
    
    return results;
  }
};

window.ReactionHelpers = ReactionHelpers;