

window.FirestoreRetry = {
  
  processPendingOperations: async function() {
    
    const pendingOps = JSON.parse(localStorage.getItem('pendingFirestoreOps') || '[]');
    if (pendingOps.length === 0) return;
    
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; 
    const successfulOps = [];
    const failedOps = [];
    
    for (const op of pendingOps) {
      
      if (now - op.timestamp > maxAge) {
        continue;
      }
      
      try {
        await this.processOperation(op);
        successfulOps.push(op);
      } catch (error) {
        failedOps.push(op);
      }
    }
    
    
    const remainingOps = [
      ...failedOps,
      ...pendingOps.filter(op => now - op.timestamp <= maxAge && !successfulOps.includes(op) && !failedOps.includes(op))
    ];
    
    localStorage.setItem('pendingFirestoreOps', JSON.stringify(remainingOps));
  },
  
  
  processOperation: async function(op) {
    switch (op.type) {
      case 'createUser':
        await this.createUserDocument(op.uid, op.data);
        break;
      case 'updateUser':
        await this.updateUserDocument(op.uid, op.data);
        break;
      default:
    }
  },
  
  
  createUserDocument: async function(uid, data) {
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      await db.collection('users').doc(uid).set({
        name: data.name || 'User',
        email: data.email,
        userType: 'tenant',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
        replyRate: 0,
        blockedUsers: [],
        authProvider: data.provider || 'email',
        avatar: data.photoURL || null,
        phone: '',
        bio: '',
        verified: null,
        ...data.additionalData
      });
    }
  },
  
  
  updateUserDocument: async function(uid, data) {
    await db.collection('users').doc(uid).update({
      lastActive: firebase.firestore.FieldValue.serverTimestamp(),
      ...data
    });
  },
  
  
  init: function() {
    
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => this.processPendingOperations(), 5000);
    });
    
    
    window.addEventListener('online', () => {
      setTimeout(() => this.processPendingOperations(), 2000);
    });
    
    
    setInterval(() => this.processPendingOperations(), 30 * 60 * 1000); 
  }
};

FirestoreRetry.init();