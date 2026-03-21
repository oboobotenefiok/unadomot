// pages/AdminPage.js - ENHANCED with full content moderation
// Features:
// - Delete any listing from the platform (permanent)
// - Hide any listing (soft delete, can be restored)
// - View all listings with filters
// - Search across all content
// - Bulk actions
// - SEPARATE Landlord & Agent verifications

function AdminPage({ user, navigate }) {
  const [isAdmin, setIsAdmin] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('listings'); // listings, pending, reports, landlord_verifications, agent_verifications
  const [isCreatingAdmin, setIsCreatingAdmin] = React.useState(false);
  
  // ===== ALL LISTINGS STATE (for content moderation) =====
  const [allListings, setAllListings] = React.useState([]);
  const [allListingsLoading, setAllListingsLoading] = React.useState(false);
  const [allListingsFilter, setAllListingsFilter] = React.useState('all');
  const [allListingsSearch, setAllListingsSearch] = React.useState('');
  const [allListingsUsingIndex, setAllListingsUsingIndex] = React.useState(true);
  const [selectedListings, setSelectedListings] = React.useState([]);
  const [bulkActionLoading, setBulkActionLoading] = React.useState(false);
  
  // Reports state
  const [reports, setReports] = React.useState([]);
  const [reportsLoading, setReportsLoading] = React.useState(false);
  const [reportsFilter, setReportsFilter] = React.useState('pending');
  const [reportsUsingIndex, setReportsUsingIndex] = React.useState(true);
  
  // ===== LANDLORD VERIFICATIONS STATE =====
  const [landlordVerifications, setLandlordVerifications] = React.useState([]);
  const [landlordVerificationsLoading, setLandlordVerificationsLoading] = React.useState(false);
  const [landlordVerificationsUsingIndex, setLandlordVerificationsUsingIndex] = React.useState(true);
  const [landlordRejectReason, setLandlordRejectReason] = React.useState({});
  const [landlordRejectOpen, setLandlordRejectOpen] = React.useState(null);
  
  // ===== AGENT VERIFICATIONS STATE =====
  const [agentVerifications, setAgentVerifications] = React.useState([]);
  const [agentVerificationsLoading, setAgentVerificationsLoading] = React.useState(false);
  const [agentVerificationsUsingIndex, setAgentVerificationsUsingIndex] = React.useState(true);
  const [agentRejectReason, setAgentRejectReason] = React.useState({});
  const [agentRejectOpen, setAgentRejectOpen] = React.useState(null);

  // Pending listings state
  const [pendingListings, setPendingListings] = React.useState([]);
  const [pendingListingsLoading, setPendingListingsLoading] = React.useState(false);
  const [pendingListingsUsingIndex, setPendingListingsUsingIndex] = React.useState(true);
  const [rejectionReason, setRejectionReason] = React.useState({});
  const [rejectListingOpen, setRejectListingOpen] = React.useState(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = React.useState({
    show: false,
    title: '',
    message: '',
    action: null,
    data: null
  });

  const [actionLoading, setActionLoading] = React.useState({});

  const { openModal } = window.useAuthModal();
  
  // ===== HARDCODED ADMIN EMAIL =====
  const ADMIN_EMAIL = 'oboobotenefiok@gmail.com';
  
  React.useEffect(function() {
    if (!user) {
      navigate('/');
      openModal('login', '/admin');
      return;
    }

    if (user.email === ADMIN_EMAIL) {
      const ensureAdminDocument = async () => {
        setIsCreatingAdmin(true);
        try {
          const adminDoc = await db.collection('admins').doc(user.uid).get();
          
          if (!adminDoc.exists) {
            await db.collection('admins').doc(user.uid).set({
              email: user.email,
              uid: user.uid,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              createdBy: 'system',
              role: 'super-admin',
              permissions: ['all']
            });
          }
          setIsAdmin(true);
        } catch (err) {
          setIsAdmin(true);
        } finally {
          setIsCreatingAdmin(false);
        }
      };
      
      ensureAdminDocument();
      return;
    }

    db.collection('admins').doc(user.uid).get()
      .then(function(doc) {
        setIsAdmin(doc.exists);
      })
      .catch(function(err) {
        setIsAdmin(false);
      });
  }, [user, navigate, openModal]);
  
  // ===== FETCH ALL LISTINGS =====
  React.useEffect(function() {
    if (!isAdmin || activeTab !== 'listings') return;
    fetchAllListings();
  }, [isAdmin, activeTab, allListingsFilter, allListingsSearch]);

  async function fetchAllListings(reset = true) {
    setAllListingsLoading(true);
    
    try {
      let queryOptions = {
        collection: 'listings',
        orderBy: 'createdAt',
        orderDirection: 'desc',
        limit: 50
      };
      
      if (allListingsFilter !== 'all') {
        if (allListingsFilter === 'active') {
          queryOptions.where = [['status', '==', 'available']];
        } else if (allListingsFilter === 'hidden') {
          queryOptions.where = [['status', '==', 'hidden_by_admin']];
        } else if (allListingsFilter === 'deleted') {
          queryOptions.where = [['status', '==', 'deleted']];
        } else if (allListingsFilter === 'pending') {
          queryOptions.where = [['status', '==', 'pending_review']];
        }
      }
      
      const result = await FirestoreQueries.query(queryOptions);
      
      setAllListingsUsingIndex(result.usingIndex);
      
      let filteredData = result.data;
      if (allListingsSearch.trim()) {
        const searchTerm = allListingsSearch.toLowerCase().trim();
        filteredData = result.data.filter(listing => 
          (listing.title && listing.title.toLowerCase().includes(searchTerm)) ||
          (listing.description && listing.description.toLowerCase().includes(searchTerm)) ||
          (listing.address && listing.address.toLowerCase().includes(searchTerm)) ||
          (listing.lga && listing.lga.toLowerCase().includes(searchTerm)) ||
          (listing.state && listing.state.toLowerCase().includes(searchTerm)) ||
          (listing.userName && listing.userName.toLowerCase().includes(searchTerm)) ||
          (listing.id && listing.id.toLowerCase().includes(searchTerm))
        );
      }
      
      setAllListings(filteredData);
      
    } catch (err) {
      
    } finally {
      setAllListingsLoading(false);
    }
  }
  
  // Fetch reports
  React.useEffect(function() {
    if (!isAdmin || activeTab !== 'reports') return;
    fetchReports();
  }, [isAdmin, activeTab, reportsFilter]);

  async function fetchReports() {
    setReportsLoading(true);
    
    try {
      const result = await FirestoreQueries.query({
        collection: 'reports',
        where: [['status', '==', reportsFilter]],
        orderBy: 'createdAt',
        orderDirection: 'desc',
        limit: 50
      });
      
      setReportsUsingIndex(result.usingIndex);
      setReports(result.data);
      
    } catch (err) {
      
    } finally {
      setReportsLoading(false);
    }
  }
  
  // ===== FETCH LANDLORD VERIFICATIONS =====
  React.useEffect(function() {
    if (!isAdmin || activeTab !== 'landlord_verifications') return;
    fetchLandlordVerifications();
  }, [isAdmin, activeTab]);

  async function fetchLandlordVerifications() {
    setLandlordVerificationsLoading(true);
    
    try {
      // Get all users with pending landlord verification
      const result = await FirestoreQueries.query({
        collection: 'users',
        where: [['verified.landlord.status', '==', 'pending']],
        orderBy: 'createdAt',
        orderDirection: 'desc',
        limit: 50
      });
      
      setLandlordVerificationsUsingIndex(result.usingIndex);
      setLandlordVerifications(result.data);
      
    } catch (err) {
      
    } finally {
      setLandlordVerificationsLoading(false);
    }
  }
  
  // ===== FETCH AGENT VERIFICATIONS =====
  React.useEffect(function() {
    if (!isAdmin || activeTab !== 'agent_verifications') return;
    fetchAgentVerifications();
  }, [isAdmin, activeTab]);

  async function fetchAgentVerifications() {
    setAgentVerificationsLoading(true);
    
    try {
      // Get all users with pending agent verification
      const result = await FirestoreQueries.query({
        collection: 'users',
        where: [['verified.agent.status', '==', 'pending']],
        orderBy: 'createdAt',
        orderDirection: 'desc',
        limit: 50
      });
      
      setAgentVerificationsUsingIndex(result.usingIndex);
      setAgentVerifications(result.data);
      
    } catch (err) {
      
    } finally {
      setAgentVerificationsLoading(false);
    }
  }

  // Fetch pending listings
  React.useEffect(function() {
    if (!isAdmin || activeTab !== 'pending') return;
    fetchPendingListings();
  }, [isAdmin, activeTab]);

  async function fetchPendingListings() {
    setPendingListingsLoading(true);
    
    try {
      const result = await FirestoreQueries.query({
        collection: 'listings',
        where: [['status', '==', 'pending_review']],
        orderBy: 'createdAt',
        orderDirection: 'desc',
        limit: 50
      });
      
      setPendingListingsUsingIndex(result.usingIndex);
      setPendingListings(result.data);
      
    } catch (err) {
        } finally {
      setPendingListingsLoading(false);
    }
  }

  // ===== CONTENT MODERATION ACTIONS ===== (same as before, keeping existing)
  async function permanentlyDeleteListing(listing) {
    setConfirmModal({
      show: true,
      title: '⚠️ Permanently Delete Listing',
      message: `Are you sure you want to PERMANENTLY delete "${listing.title}"? This action CANNOT be undone.`,
      action: async () => {
        setLoading(listing.id, true);
        try {
          await db.collection('listings').doc(listing.id).delete();
          
          try {
            const commentsRef = db.collection('listings').doc(listing.id).collection('comments');
            const comments = await commentsRef.get();
            const batch = db.batch();
            comments.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
          } catch (e) {}
          
          setAllListings(prev => prev.filter(l => l.id !== listing.id));
          if (selectedListings.includes(listing.id)) {
            setSelectedListings(prev => prev.filter(id => id !== listing.id));
          }
          
          await db.collection('adminLogs').add({
            action: 'permanent_delete',
            targetId: listing.id,
            targetTitle: listing.title,
            performedBy: user.uid,
            performedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          alert(`✅ Listing "${listing.title}" permanently deleted`);
        } catch (err) {
          alert('❌ Failed to delete listing.');
        } finally {
          setLoading(listing.id, false);
          setConfirmModal({ ...confirmModal, show: false });
        }
      }
    });
  }

  async function hideListing(listing) {
    setLoading(listing.id, true);
    try {
      await db.collection('listings').doc(listing.id).update({
        status: 'hidden_by_admin',
        hiddenAt: firebase.firestore.FieldValue.serverTimestamp(),
        hiddenBy: user.uid
      });
      
      setAllListings(prev => prev.map(l => 
        l.id === listing.id ? { ...l, status: 'hidden_by_admin' } : l
      ));
      
      try {
        await db.collection('users').doc(listing.userId)
          .collection('notifications').add({
            type: 'listing_hidden',
            title: '📢 Your listing has been hidden',
            body: `Your listing "${listing.title}" has been hidden by an admin.`,
            listingId: listing.id,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
      } catch (e) {}
      
      alert(`✅ Listing "${listing.title}" hidden`);
    } catch (err) {
      alert('❌ Failed to hide listing');
    } finally {
      setLoading(listing.id, false);
    }
  }

  async function restoreListing(listing) {
    setLoading(listing.id, true);
    try {
      await db.collection('listings').doc(listing.id).update({
        status: 'available',
        restoredAt: firebase.firestore.FieldValue.serverTimestamp(),
        restoredBy: user.uid
      });
      
      setAllListings(prev => prev.map(l => 
        l.id === listing.id ? { ...l, status: 'available' } : l
      ));
      
      try {
        await db.collection('users').doc(listing.userId)
          .collection('notifications').add({
            type: 'listing_restored',
            title: '✅ Your listing has been restored',
            body: `Your listing "${listing.title}" has been restored.`,
            listingId: listing.id,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
      } catch (e) {}
      
      alert(`✅ Listing "${listing.title}" restored`);
    } catch (err) {
      alert('❌ Failed to restore listing');
    } finally {
      setLoading(listing.id, false);
    }
  }

  async function bulkHide() {
    if (selectedListings.length === 0) return;
    
    setConfirmModal({
      show: true,
      title: `Hide ${selectedListings.length} Listings`,
      message: `Hide ${selectedListings.length} selected listings?`,
      action: async () => {
        setBulkActionLoading(true);
        try {
          const batch = db.batch();
          selectedListings.forEach(id => {
            const ref = db.collection('listings').doc(id);
            batch.update(ref, {
              status: 'hidden_by_admin',
              hiddenAt: firebase.firestore.FieldValue.serverTimestamp(),
              hiddenBy: user.uid
            });
          });
          await batch.commit();
          
          setAllListings(prev => prev.map(l => 
            selectedListings.includes(l.id) ? { ...l, status: 'hidden_by_admin' } : l
          ));
          setSelectedListings([]);
          
          alert(`✅ ${selectedListings.length} listings hidden`);
        } catch (err) {
          alert('❌ Failed to hide some listings');
        } finally {
          setBulkActionLoading(false);
          setConfirmModal({ ...confirmModal, show: false });
        }
      }
    });
  }

  async function bulkDelete() {
    if (selectedListings.length === 0) return;
    
    setConfirmModal({
      show: true,
      title: '⚠️ PERMANENTLY DELETE Multiple Listings',
      message: `Delete ${selectedListings.length} listings permanently?`,
      action: async () => {
        setBulkActionLoading(true);
        try {
          for (let i = 0; i < selectedListings.length; i += 10) {
            const batch = db.batch();
            const batchIds = selectedListings.slice(i, i + 10);
            
            batchIds.forEach(id => {
              const ref = db.collection('listings').doc(id);
              batch.delete(ref);
            });
            
            await batch.commit();
          }
          
          setAllListings(prev => prev.filter(l => !selectedListings.includes(l.id)));
          setSelectedListings([]);
          
          alert(`✅ ${selectedListings.length} listings deleted`);
        } catch (err) {
          alert('❌ Failed to delete some listings');
        } finally {
          setBulkActionLoading(false);
          setConfirmModal({ ...confirmModal, show: false });
        }
      }
    });
  }

  function toggleSelectListing(id) {
    setSelectedListings(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  function selectAll() {
    if (selectedListings.length === allListings.length) {
      setSelectedListings([]);
    } else {
      setSelectedListings(allListings.map(l => l.id));
    }
  }

  function setLoading(id, val) {
    setActionLoading(function(prev) {
      const next = { ...prev };
      if (val) next[id] = true;
      else delete next[id];
      return next;
    });
  }

  function removeReport(reportId) {
    setReports(function(prev) { return prev.filter(function(r) { return r.id !== reportId; }); });
  }

  function removeLandlordVerification(userId) {
    setLandlordVerifications(function(prev) { return prev.filter(function(v) { return v.id !== userId; }); });
  }

  function removeAgentVerification(userId) {
    setAgentVerifications(function(prev) { return prev.filter(function(v) { return v.id !== userId; }); });
  }

  function removePendingListing(listingId) {
    setPendingListings(function(prev) { return prev.filter(function(l) { return l.id !== listingId; }); });
  }

  async function dismissReport(report) {
    setLoading(report.id, true);
    try {
      await db.collection('reports').doc(report.id).update({
        status: 'dismissed',
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
        reviewedBy: user.uid
      });
      removeReport(report.id);
    } catch (err) {
      alert('Failed to dismiss report.');
    } finally {
      setLoading(report.id, false);
    }
  }

  async function removeContent(report) {
    if (!window.confirm('Remove this ' + report.targetType + '?')) return;

    setLoading(report.id, true);
    try {
      const batch = db.batch();

      if (report.targetType === 'listing') {
        batch.update(db.collection('listings').doc(report.targetId), {
          status: 'removed_by_admin',
          removedAt: firebase.firestore.FieldValue.serverTimestamp(),
          removedBy: user.uid,
          removedReason: report.reason
        });
      }

      batch.update(db.collection('reports').doc(report.id), {
        status: 'resolved',
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
        reviewedBy: user.uid,
        adminNote: 'Content removed'
      });

      await batch.commit();
      removeReport(report.id);
    } catch (err) {
      alert('Failed to remove content.');
    } finally {
      setLoading(report.id, false);
    }
  }

  async function banUser(report) {
    const userId = report.targetType === 'user' ? report.targetId : null;
    if (!userId) {
      alert('Cannot ban: no user target.');
      return;
    }

    if (!window.confirm('Ban user ' + userId + '?')) return;

    setLoading(report.id, true);
    try {
      const batch = db.batch();

      batch.update(db.collection('users').doc(userId), {
        status: 'banned',
        bannedAt: firebase.firestore.FieldValue.serverTimestamp(),
        bannedBy: user.uid,
        banReason: report.reason
      });

      batch.update(db.collection('reports').doc(report.id), {
        status: 'resolved',
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
        reviewedBy: user.uid,
        adminNote: 'User banned'
      });

      await batch.commit();
      removeReport(report.id);
    } catch (err) {
      alert('Failed to ban user.');
    } finally {
      setLoading(report.id, false);
    }
  }

  // ===== LANDLORD VERIFICATION ACTIONS =====
  async function approveLandlordVerification(targetUser) {
    setLoading(targetUser.id, true);
    try {
      await db.collection('users').doc(targetUser.id).update({
        'verified.landlord.status': 'approved',
        'verified.landlord.approvedAt': firebase.firestore.FieldValue.serverTimestamp(),
        'verified.landlord.approvedBy': user.uid
      });
      removeLandlordVerification(targetUser.id);
      
      // Send notification
      await db.collection('users').doc(targetUser.id)
        .collection('notifications').add({
          type: 'verification_approved',
          title: '✅ Landlord Verification Approved',
          body: 'Your landlord verification has been approved! You now have a Landlord badge.',
          read: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
      alert('✅ Landlord verification approved');
    } catch (err) {
      alert('Failed to approve.');
    } finally {
      setLoading(targetUser.id, false);
    }
  }

  async function rejectLandlordVerification(targetUser) {
    const reason = landlordRejectReason[targetUser.id] || '';
    if (!reason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }

    setLoading(targetUser.id, true);
    try {
      await db.collection('users').doc(targetUser.id).update({
        'verified.landlord.status': 'rejected',
        'verified.landlord.rejectionReason': reason.trim(),
        'verified.landlord.reviewedAt': firebase.firestore.FieldValue.serverTimestamp(),
        'verified.landlord.reviewedBy': user.uid
      });
      removeLandlordVerification(targetUser.id);
      setLandlordRejectOpen(null);
      
      // Send notification
      await db.collection('users').doc(targetUser.id)
        .collection('notifications').add({
          type: 'verification_rejected',
          title: '✕ Landlord Verification Rejected',
          body: `Your landlord verification was rejected. Reason: ${reason}`,
          read: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
      alert('✕ Landlord verification rejected');
    } catch (err) {
      alert('Failed to reject.');
    } finally {
      setLoading(targetUser.id, false);
    }
  }

  // ===== AGENT VERIFICATION ACTIONS =====
  async function approveAgentVerification(targetUser) {
    setLoading(targetUser.id, true);
    try {
      await db.collection('users').doc(targetUser.id).update({
        'verified.agent.status': 'approved',
        'verified.agent.approvedAt': firebase.firestore.FieldValue.serverTimestamp(),
        'verified.agent.approvedBy': user.uid
      });
      removeAgentVerification(targetUser.id);
      
      // Send notification
      await db.collection('users').doc(targetUser.id)
        .collection('notifications').add({
          type: 'verification_approved',
          title: '✅ Agent Verification Approved',
          body: 'Your agent verification has been approved! You now have an Agent badge.',
          read: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
      alert('✅ Agent verification approved');
    } catch (err) {
      alert('Failed to approve.');
    } finally {
      setLoading(targetUser.id, false);
    }
  }

  async function rejectAgentVerification(targetUser) {
    const reason = agentRejectReason[targetUser.id] || '';
    if (!reason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }

    setLoading(targetUser.id, true);
    try {
      await db.collection('users').doc(targetUser.id).update({
        'verified.agent.status': 'rejected',
        'verified.agent.rejectionReason': reason.trim(),
        'verified.agent.reviewedAt': firebase.firestore.FieldValue.serverTimestamp(),
        'verified.agent.reviewedBy': user.uid
      });
      removeAgentVerification(targetUser.id);
      setAgentRejectOpen(null);
      
      // Send notification
      await db.collection('users').doc(targetUser.id)
        .collection('notifications').add({
          type: 'verification_rejected',
          title: '✕ Agent Verification Rejected',
          body: `Your agent verification was rejected. Reason: ${reason}`,
          read: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
      alert('✕ Agent verification rejected');
    } catch (err) {
      alert('Failed to reject.');
    } finally {
      setLoading(targetUser.id, false);
    }
  }

  async function approveListing(listing) {
    setLoading(listing.id, true);
    try {
      await db.collection('listings').doc(listing.id).update({
        status: 'available',
        approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        approvedBy: user.uid
      });
      removePendingListing(listing.id);
      
      const notificationRef = db.collection('users').doc(listing.userId)
        .collection('notifications').doc();
      await notificationRef.set({
        type: 'listing_approved',
        title: 'Listing Approved! ✅',
        body: `Your listing "${listing.title}" has been approved and is now live.`,
        listingId: listing.id,
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
    } catch (err) {
      alert('Failed to approve listing.');
    } finally {
      setLoading(listing.id, false);
    }
  }

  async function rejectListing(listing) {
    const reason = rejectionReason[listing.id] || '';
    if (!reason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }

    setLoading(listing.id, true);
    try {
      await db.collection('listings').doc(listing.id).update({
        status: 'rejected',
        rejectionReason: reason.trim(),
        rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
        rejectedBy: user.uid
      });
      removePendingListing(listing.id);
      setRejectListingOpen(null);
      
      const notificationRef = db.collection('users').doc(listing.userId)
        .collection('notifications').doc();
      await notificationRef.set({
        type: 'listing_rejected',
        title: 'Listing Needs Changes ✏️',
        body: `Your listing "${listing.title}" was not approved. Reason: ${reason}`,
        listingId: listing.id,
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
    } catch (err) {
      alert('Failed to reject listing.');
    } finally {
      setLoading(listing.id, false);
    }
  }

  function maskId(str) {
    if (!str || str.length < 4) return '****';
    return str.slice(0, 3) + '****' + str.slice(-3);
  }

  function formatTimestamp(ts) {
    if (!ts) return '—';
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function ConfirmationModal() {
    if (!confirmModal.show) return null;
    
    return React.createElement('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm',
      onClick: (e) => { if (e.target === e.currentTarget) setConfirmModal({ ...confirmModal, show: false }); }
    },
      React.createElement('div', {
        className: 'bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden'
      },
        React.createElement('div', { className: 'p-6' },
          React.createElement('h3', { className: 'text-xl font-bold text-gray-900 mb-2' }, confirmModal.title),
          React.createElement('p', { className: 'text-gray-600 mb-6' }, confirmModal.message),
          
          React.createElement('div', { className: 'flex gap-3' },
            React.createElement('button', {
              onClick: () => setConfirmModal({ ...confirmModal, show: false }),
              className: 'flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium'
            }, 'Cancel'),
            
            React.createElement('button', {
              onClick: confirmModal.action,
              className: 'flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium'
            }, 'Confirm')
          )
        )
      )
    );
  }

  if (!user) {
    return React.createElement('div', { className: 'min-h-screen bg-green-50 flex items-center justify-center' },
      React.createElement('div', { className: 'w-6 h-6 rounded-full bg-gray-200 animate-pulse mx-auto' })
    );
  }

  if (isAdmin === null || isCreatingAdmin) {
    return React.createElement('div', { className: 'min-h-screen bg-green-50 flex items-center justify-center' },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'w-10 h-10 rounded-full bg-gray-200 animate-pulse mx-auto mb-4' }),
        React.createElement('p', { className: 'text-gray-600' }, 
          isCreatingAdmin ? 'Setting up admin access...' : 'Verifying admin access...'
        )
      )
    );
  }

  if (!isAdmin) {
    return React.createElement('div', { className: 'min-h-screen bg-green-50 flex items-center justify-center' },
      React.createElement('div', { className: 'text-center max-w-sm mx-auto px-4' },
        React.createElement('div', { className: 'text-6xl mb-4' }, '🔒'),
        React.createElement('h2', { className: 'text-2xl font-bold text-gray-900 mb-2' }, 'Access Denied'),
        React.createElement('p', { className: 'text-gray-600 mb-6' }, 'You do not have admin privileges.'),
        React.createElement('button', {
          onClick: function() { navigate('/'); },
          className: 'bg-green-950 text-white px-6 py-3 rounded-lg hover:bg-green-800 transition cursor-pointer'
        }, 'Go Home')
      )
    );
  }

  function TabBtn(label, key) {
    const active = activeTab === key;
    return React.createElement('button', {
      key: key,
      onClick: function() { setActiveTab(key); },
      className: 'px-4 py-2 text-sm font-medium rounded-t-lg transition border-b-2 ' +
        (active ? 'border-green-950 text-green-950 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
    }, label);
  }

  function StatusBadge(status) {
    const colours = {
      pending: 'bg-yellow-100 text-yellow-800',
      pending_review: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-700',
      dismissed: 'bg-gray-100 text-gray-600',
      rejected: 'bg-red-100 text-red-700',
      available: 'bg-green-100 text-green-700',
      hidden_by_admin: 'bg-orange-100 text-orange-800',
      deleted: 'bg-gray-100 text-gray-600 line-through',
      scam: 'bg-red-100 text-red-700',
      approved: 'bg-green-100 text-green-700'
    };
    return React.createElement('span', {
      className: 'inline-block px-2 py-0.5 rounded-full text-xs font-medium ' + (colours[status] || 'bg-gray-100 text-gray-700')
    }, status);
  }

  // ===== ALL LISTINGS TAB (same as before) =====
  function AllListingsTab() {
    if (allListingsLoading) {
      return React.createElement('div', { className: 'flex justify-center py-16' },
        React.createElement('div', { className: 'w-6 h-6 rounded-full bg-gray-200 animate-pulse mx-auto' })
      );
    }

    return React.createElement('div', null,
      React.createElement('div', { className: 'mb-4 space-y-3' },
        React.createElement('div', { className: 'flex items-center gap-2 flex-wrap' },
          React.createElement('span', { className: 'text-sm text-gray-500' }, 'Filter:'),
          ['all', 'active', 'hidden', 'deleted', 'pending'].map(function(f) {
            return React.createElement('button', {
              key: f,
              onClick: function() { setAllListingsFilter(f); },
              className: `px-3 py-1.5 text-xs font-medium rounded-lg border transition capitalize ${
                allListingsFilter === f
                  ? 'bg-green-950 text-white border-green-950'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`
            }, f);
          })
        ),
        
        React.createElement('div', { className: 'flex gap-2' },
          React.createElement('input', {
            type: 'text',
            placeholder: 'Search listings...',
            value: allListingsSearch,
            onChange: (e) => setAllListingsSearch(e.target.value),
            className: 'flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-950'
          }),
          React.createElement('button', {
            onClick: () => fetchAllListings(),
            className: 'px-4 py-2 bg-green-950 text-white rounded-lg text-sm hover:bg-green-800 transition'
          }, 'Search')
        ),
        
        selectedListings.length > 0 && React.createElement('div', { 
          className: 'flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200'
        },
          React.createElement('span', { className: 'text-sm font-medium text-blue-800' },
            `${selectedListings.length} listing${selectedListings.length === 1 ? '' : 's'} selected`
          ),
          React.createElement('div', { className: 'flex gap-2' },
            React.createElement('button', {
              onClick: bulkHide,
              disabled: bulkActionLoading,
              className: 'px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded hover:bg-orange-600 transition disabled:opacity-50'
            }, bulkActionLoading ? '...' : 'Hide Selected'),
            React.createElement('button', {
              onClick: bulkDelete,
              disabled: bulkActionLoading,
              className: 'px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50'
            }, bulkActionLoading ? '...' : 'Delete Permanently')
          )
        )
      ),

      React.createElement('div', { className: 'mb-2 text-xs text-right ' + 
        (allListingsUsingIndex ? 'text-green-600' : 'text-yellow-600')
      },
        allListingsUsingIndex ? '⚡ Using Index' : '🔄 JS Fallback'
      ),

      allListings.length > 0 && React.createElement('div', { className: 'mb-2 flex items-center gap-2' },
        React.createElement('input', {
          type: 'checkbox',
          id: 'select-all',
          checked: selectedListings.length === allListings.length,
          onChange: selectAll,
          className: 'w-4 h-4 accent-green-900'
        }),
        React.createElement('label', { htmlFor: 'select-all', className: 'text-sm text-gray-600' }, 'Select All')
      ),

      allListings.length === 0
        ? React.createElement('div', { className: 'text-center py-16 bg-white rounded-xl border border-gray-200' },
            React.createElement('div', { className: 'text-5xl mb-3' }, '📭'),
            React.createElement('p', { className: 'text-gray-600 font-medium' }, 'No listings found.')
          )
        : React.createElement('div', { className: 'space-y-4' },
            allListings.map(function(listing) {
              const busy = actionLoading[listing.id];
              const isSelected = selectedListings.includes(listing.id);

              return React.createElement('div', {
                  key: listing.id,
                  className: `bg-white rounded-xl border p-5 shadow-sm transition ${
                    isSelected ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200'
                  }`
                },
                React.createElement('div', { className: 'flex items-start gap-3' },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: isSelected,
                    onChange: () => toggleSelectListing(listing.id),
                    className: 'mt-1 w-4 h-4 accent-green-900 flex-shrink-0'
                  }),
                  
                  React.createElement('div', { className: 'w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0' },
                    listing.images && listing.images[0] ?
                      React.createElement('img', {
                        src: CloudinaryHelpers?.getThumbnailUrl(listing.images[0]),
                        className: 'w-full h-full object-cover'
                      }) :
                      React.createElement('div', { className: 'w-full h-full flex items-center justify-center text-gray-400' }, '📷')
                  ),
                  
                  React.createElement('div', { className: 'flex-1' },
                    React.createElement('div', { className: 'flex flex-wrap items-start justify-between gap-2 mb-1' },
                      React.createElement('div', null,
                        React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                          StatusBadge(listing.status || 'unknown'),
                          React.createElement('span', { className: 'text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full' },
                            listing.propertyType || 'Property'
                          )
                        ),
                        React.createElement('p', { className: 'font-semibold text-gray-900' }, listing.title),
                        React.createElement('p', { className: 'text-xs text-gray-500' },
                          `By: ${listing.userName || 'Unknown'} • ID: ${listing.id.slice(0, 8)}...`
                        )
                      ),
                      React.createElement('p', { className: 'text-lg font-bold text-green-950' },
                        '₦' + (listing.price ? listing.price.toLocaleString() : '0')
                      )
                    ),
                    
                    React.createElement('p', { className: 'text-xs text-gray-600 mb-2' },
                      '📍 ' + [listing.address, listing.lga, listing.state].filter(Boolean).join(', ')
                    ),
                    
                    React.createElement('div', { className: 'flex flex-wrap gap-2 mt-3' },
                      React.createElement('button', {
                        onClick: () => navigate('/listing/' + listing.id),
                        className: 'px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition'
                      }, '👁️ Preview'),
                      
                      listing.status === 'hidden_by_admin' ?
                        React.createElement('button', {
                          onClick: () => restoreListing(listing),
                          disabled: busy,
                          className: 'px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 transition'
                        }, busy ? '...' : '🔄 Restore') :
                        React.createElement('button', {
                          onClick: () => hideListing(listing),
                          disabled: busy,
                          className: 'px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded hover:bg-orange-600 transition'
                        }, busy ? '...' : '👁️ Hide'),
                      
                      React.createElement('button', {
                        onClick: () => permanentlyDeleteListing(listing),
                        disabled: busy,
                        className: 'px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition'
                      }, busy ? '...' : '🗑️ Delete'),
                      
                      React.createElement('button', {
                        onClick: () => navigate('/profile/' + listing.userId),
                        className: 'px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition'
                      }, '👤 User')
                    )
                  )
                )
              );
            })
          )
    );
  }

  // ===== REPORTS TAB (same as before) =====
  function ReportsTab() {
    const filterBtns = ['pending', 'resolved', 'dismissed'].map(function(f) {
      return React.createElement('button', {
        key: f,
        onClick: function() { setReportsFilter(f); },
        className: 'px-3 py-1.5 text-xs font-medium rounded-lg border transition capitalize ' +
          (reportsFilter === f
            ? 'bg-green-950 text-white border-green-950'
            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50')
      }, f);
    });

    if (reportsLoading) {
      return React.createElement('div', { className: 'flex justify-center py-16' },
        React.createElement('div', { className: 'w-6 h-6 rounded-full bg-gray-200 animate-pulse mx-auto' })
      );
    }

    return React.createElement('div', null,
      React.createElement('div', { className: 'mb-2 text-xs text-right ' + 
        (reportsUsingIndex ? 'text-green-600' : 'text-yellow-600')
      },
        reportsUsingIndex ? '⚡ Using Index' : '🔄 JS Fallback'
      ),

      React.createElement('div', { className: 'flex items-center gap-2 mb-6' },
        React.createElement('span', { className: 'text-sm text-gray-500 mr-1' }, 'Status:'),
        ...filterBtns
      ),

      reports.length === 0
        ? React.createElement('div', { className: 'text-center py-16 bg-white rounded-xl border border-gray-200' },
            React.createElement('div', { className: 'text-5xl mb-3' }, '✅'),
            React.createElement('p', { className: 'text-gray-600 font-medium' }, 'No ' + reportsFilter + ' reports.')
          )
        : React.createElement('div', { className: 'space-y-4' },
            reports.map(function(report) {
              const busy = actionLoading[report.id];
              return React.createElement('div', {
                  key: report.id,
                  className: 'bg-white rounded-xl border border-gray-200 p-5 shadow-sm'
                },
                React.createElement('div', { className: 'flex flex-wrap items-start justify-between gap-3 mb-3' },
                  React.createElement('div', null,
                    React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                      StatusBadge(report.status),
                      React.createElement('span', { className: 'text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize' },
                        report.targetType
                      ),
                      React.createElement('span', { className: 'text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium' },
                        (report.reason || '').replace(/_/g, ' ')
                      )
                    ),
                    React.createElement('p', { className: 'text-xs text-gray-400' },
                      'Filed ' + formatTimestamp(report.createdAt) + ' by ' + (report.reportedBy || 'anonymous')
                    )
                  )
                ),

                React.createElement('div', { className: 'bg-gray-50 rounded-lg p-3 mb-4 font-mono text-xs text-gray-600 break-all' },
                  React.createElement('span', { className: 'font-semibold text-gray-800' }, 'Target ID: '),
                  report.targetId,
                  report.targetType === 'listing' && React.createElement('button', {
                    onClick: function() { navigate('/listing/' + report.targetId); },
                    className: 'ml-2 text-blue-600 hover:underline'
                  }, '↗ View Listing')
                ),

                report.description && React.createElement('div', { className: 'mb-4' },
                  React.createElement('p', { className: 'text-xs font-medium text-gray-500 mb-1' }, 'Reporter\'s note:'),
                  React.createElement('p', { className: 'text-sm text-gray-700 italic bg-yellow-50 p-2 rounded-lg border border-yellow-100' },
                    '"' + report.description + '"'
                  )
                ),

                report.status === 'pending' && React.createElement('div', { className: 'flex flex-wrap gap-2 pt-3 border-t border-gray-100' },
                  React.createElement('button', {
                    onClick: function() { dismissReport(report); },
                    disabled: busy,
                    className: 'px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition'
                  }, busy ? '...' : 'Dismiss'),

                  report.targetType === 'listing' && React.createElement('button', {
                    onClick: function() { removeContent(report); },
                    disabled: busy,
                    className: 'px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition'
                  }, busy ? '...' : '🗑 Remove Listing'),

                  report.targetType === 'user' && React.createElement('button', {
                    onClick: function() { banUser(report); },
                    disabled: busy,
                    className: 'px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition'
                  }, busy ? '...' : '🚫 Ban User')
                )
              );
            })
          )
    );
  }

  // ===== LANDLORD VERIFICATIONS TAB =====
  function LandlordVerificationsTab() {
    if (landlordVerificationsLoading) {
      return React.createElement('div', { className: 'flex justify-center py-16' },
        React.createElement('div', { className: 'w-6 h-6 rounded-full bg-gray-200 animate-pulse mx-auto' })
      );
    }

    if (landlordVerifications.length === 0) {
      return React.createElement('div', { className: 'text-center py-16 bg-white rounded-xl border border-gray-200' },
        React.createElement('div', { className: 'text-5xl mb-3' }, '🏠'),
        React.createElement('p', { className: 'text-gray-600 font-medium' }, 'No pending landlord verification requests.')
      );
    }

    return React.createElement('div', { className: 'space-y-4' },
      React.createElement('div', { className: 'mb-2 text-xs text-right ' + 
        (landlordVerificationsUsingIndex ? 'text-green-600' : 'text-yellow-600')
      },
        landlordVerificationsUsingIndex ? '⚡ Using Index' : '🔄 JS Fallback'
      ),

      landlordVerifications.map(function(v) {
        const busy = actionLoading[v.id];
        const isRejecting = landlordRejectOpen === v.id;
        const landlordData = v.verified?.landlord || {};

        return React.createElement('div', {
            key: v.id,
            className: 'bg-white rounded-xl border border-gray-200 p-5 shadow-sm'
          },
          React.createElement('div', { className: 'flex flex-wrap items-center gap-3 mb-4' },
            React.createElement('div', { className: 'w-10 h-10 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0' },
              React.createElement('span', { className: 'text-green-800 font-bold text-sm' },
                (v.name || v.email || 'U').charAt(0).toUpperCase()
              )
            ),
            React.createElement('div', null,
              React.createElement('p', { className: 'font-semibold text-gray-900' }, v.name || '(No name)'),
              React.createElement('p', { className: 'text-xs text-gray-500' }, v.email),
              React.createElement('p', { className: 'text-xs text-gray-400' }, 'User ID: ' + v.id)
            )
          ),

          React.createElement('div', { className: 'grid grid-cols-2 gap-3 mb-4' },
            React.createElement('div', { className: 'bg-gray-50 p-3 rounded-lg' },
              React.createElement('p', { className: 'text-xs text-gray-500 mb-0.5' }, 'ID Type'),
              React.createElement('p', { className: 'text-sm font-semibold text-gray-800 uppercase' }, landlordData.idType || '—')
            ),
            React.createElement('div', { className: 'bg-gray-50 p-3 rounded-lg' },
              React.createElement('p', { className: 'text-xs text-gray-500 mb-0.5' }, 'ID Number'),
              React.createElement('p', { className: 'text-sm font-semibold text-gray-800 font-mono' }, maskId(landlordData.idNumber))
            ),
            React.createElement('div', { className: 'bg-gray-50 p-3 rounded-lg' },
              React.createElement('p', { className: 'text-xs text-gray-500 mb-0.5' }, 'Phone'),
              React.createElement('p', { className: 'text-sm font-semibold text-gray-800' }, landlordData.phoneNumber || '—')
            ),
            landlordData.propertyProofUrl && React.createElement('div', { className: 'bg-gray-50 p-3 rounded-lg' },
              React.createElement('p', { className: 'text-xs text-gray-500 mb-0.5' }, 'Property Proof'),
              React.createElement('a', {
                href: CloudinaryHelpers?.getUrl(landlordData.propertyProofUrl, { type: 'detail' }),
                target: '_blank',
                className: 'text-blue-600 text-sm hover:underline break-all'
              }, 'View Document')
            )
          ),
          React.createElement('p', { className: 'text-xs text-gray-400 mb-4' },
            'Submitted: ' + formatTimestamp(landlordData.submittedAt)
          ),

          isRejecting && React.createElement('div', { className: 'mb-4' },
            React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1.5' }, 'Rejection reason (required):'),
            React.createElement('textarea', {
              value: landlordRejectReason[v.id] || '',
              onChange: function(e) {
                setLandlordRejectReason(function(prev) { return { ...prev, [v.id]: e.target.value }; });
              },
              placeholder: 'e.g., ID number does not match property document...',
              rows: 2,
              className: 'w-full p-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-950'
            })
          ),

          React.createElement('div', { className: 'flex flex-wrap gap-2' },
            !isRejecting && React.createElement('button', {
              onClick: function() { approveLandlordVerification(v); },
              disabled: busy,
              className: 'px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition'
            }, busy ? '...' : '✅ Approve'),

            !isRejecting && React.createElement('button', {
              onClick: function() { setLandlordRejectOpen(v.id); },
              disabled: busy,
              className: 'px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition'
            }, '✕ Reject'),

            isRejecting && React.createElement('button', {
              onClick: function() { rejectLandlordVerification(v); },
              disabled: busy || !(landlordRejectReason[v.id] || '').trim(),
              className: 'px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition'
            }, busy ? '...' : 'Confirm Reject'),

            isRejecting && React.createElement('button', {
              onClick: function() { setLandlordRejectOpen(null); },
              className: 'px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition'
            }, 'Cancel')
          )
        );
      })
    );
  }

  // ===== AGENT VERIFICATIONS TAB =====
  function AgentVerificationsTab() {
    if (agentVerificationsLoading) {
      return React.createElement('div', { className: 'flex justify-center py-16' },
        React.createElement('div', { className: 'w-6 h-6 rounded-full bg-gray-200 animate-pulse mx-auto' })
      );
    }

    if (agentVerifications.length === 0) {
      return React.createElement('div', { className: 'text-center py-16 bg-white rounded-xl border border-gray-200' },
        React.createElement('div', { className: 'text-5xl mb-3' }, '🤝'),
        React.createElement('p', { className: 'text-gray-600 font-medium' }, 'No pending agent verification requests.')
      );
    }

    return React.createElement('div', { className: 'space-y-4' },
      React.createElement('div', { className: 'mb-2 text-xs text-right ' + 
        (agentVerificationsUsingIndex ? 'text-green-600' : 'text-yellow-600')
      },
        agentVerificationsUsingIndex ? '⚡ Using Index' : '🔄 JS Fallback'
      ),

      agentVerifications.map(function(v) {
        const busy = actionLoading[v.id];
        const isRejecting = agentRejectOpen === v.id;
        const agentData = v.verified?.agent || {};

        return React.createElement('div', {
            key: v.id,
            className: 'bg-white rounded-xl border border-gray-200 p-5 shadow-sm'
          },
          React.createElement('div', { className: 'flex flex-wrap items-center gap-3 mb-4' },
            React.createElement('div', { className: 'w-10 h-10 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0' },
              React.createElement('span', { className: 'text-green-800 font-bold text-sm' },
                (v.name || v.email || 'U').charAt(0).toUpperCase()
              )
            ),
            React.createElement('div', null,
              React.createElement('p', { className: 'font-semibold text-gray-900' }, v.name || '(No name)'),
              React.createElement('p', { className: 'text-xs text-gray-500' }, v.email),
              React.createElement('p', { className: 'text-xs text-gray-400' }, 'User ID: ' + v.id)
            )
          ),

          React.createElement('div', { className: 'grid grid-cols-2 gap-3 mb-4' },
            React.createElement('div', { className: 'bg-gray-50 p-3 rounded-lg' },
              React.createElement('p', { className: 'text-xs text-gray-500 mb-0.5' }, 'ID Type'),
              React.createElement('p', { className: 'text-sm font-semibold text-gray-800 uppercase' }, agentData.idType || '—')
            ),
            React.createElement('div', { className: 'bg-gray-50 p-3 rounded-lg' },
              React.createElement('p', { className: 'text-xs text-gray-500 mb-0.5' }, 'ID Number'),
              React.createElement('p', { className: 'text-sm font-semibold text-gray-800 font-mono' }, maskId(agentData.idNumber))
            ),
            React.createElement('div', { className: 'bg-gray-50 p-3 rounded-lg' },
              React.createElement('p', { className: 'text-xs text-gray-500 mb-0.5' }, 'Phone'),
              React.createElement('p', { className: 'text-sm font-semibold text-gray-800' }, agentData.phoneNumber || '—')
            ),
            agentData.businessRegUrl && React.createElement('div', { className: 'bg-gray-50 p-3 rounded-lg' },
              React.createElement('p', { className: 'text-xs text-gray-500 mb-0.5' }, 'Business Registration'),
              React.createElement('a', {
                href: CloudinaryHelpers?.getUrl(agentData.businessRegUrl, { type: 'detail' }),
                target: '_blank',
                className: 'text-blue-600 text-sm hover:underline break-all'
              }, 'View Document')
            ),
            agentData.agencyLicenseUrl && React.createElement('div', { className: 'bg-gray-50 p-3 rounded-lg' },
              React.createElement('p', { className: 'text-xs text-gray-500 mb-0.5' }, 'Agency License (Optional)'),
              React.createElement('a', {
                href: CloudinaryHelpers?.getUrl(agentData.agencyLicenseUrl, { type: 'detail' }),
                target: '_blank',
                className: 'text-blue-600 text-sm hover:underline break-all'
              }, 'View Document')
            )
          ),
          React.createElement('p', { className: 'text-xs text-gray-400 mb-4' },
            'Submitted: ' + formatTimestamp(agentData.submittedAt)
          ),

          isRejecting && React.createElement('div', { className: 'mb-4' },
            React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1.5' }, 'Rejection reason (required):'),
            React.createElement('textarea', {
              value: agentRejectReason[v.id] || '',
              onChange: function(e) {
                setAgentRejectReason(function(prev) { return { ...prev, [v.id]: e.target.value }; });
              },
              placeholder: 'e.g., Business registration is invalid...',
              rows: 2,
              className: 'w-full p-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-950'
            })
          ),

          React.createElement('div', { className: 'flex flex-wrap gap-2' },
            !isRejecting && React.createElement('button', {
              onClick: function() { approveAgentVerification(v); },
              disabled: busy,
              className: 'px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition'
            }, busy ? '...' : '✅ Approve'),

            !isRejecting && React.createElement('button', {
              onClick: function() { setAgentRejectOpen(v.id); },
              disabled: busy,
              className: 'px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition'
            }, '✕ Reject'),

            isRejecting && React.createElement('button', {
              onClick: function() { rejectAgentVerification(v); },
              disabled: busy || !(agentRejectReason[v.id] || '').trim(),
              className: 'px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition'
            }, busy ? '...' : 'Confirm Reject'),

            isRejecting && React.createElement('button', {
              onClick: function() { setAgentRejectOpen(null); },
              className: 'px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition'
            }, 'Cancel')
          )
        );
      })
    );
  }

  // ===== PENDING LISTINGS TAB (same as before) =====
  function PendingListingsTab() {
    if (pendingListingsLoading) {
      return React.createElement('div', { className: 'flex justify-center py-16' },
        React.createElement('div', { className: 'w-6 h-6 rounded-full bg-gray-200 animate-pulse mx-auto' })
      );
    }

    if (pendingListings.length === 0) {
      return React.createElement('div', { className: 'text-center py-16 bg-white rounded-xl border border-gray-200' },
        React.createElement('div', { className: 'text-5xl mb-3' }, '✅'),
        React.createElement('p', { className: 'text-gray-600 font-medium' }, 'No pending listings to review.')
      );
    }

    return React.createElement('div', { className: 'space-y-4' },
      React.createElement('div', { className: 'mb-2 text-xs text-right ' + 
        (pendingListingsUsingIndex ? 'text-green-600' : 'text-yellow-600')
      },
        pendingListingsUsingIndex ? '⚡ Using Index' : '🔄 JS Fallback'
      ),

      pendingListings.map(function(listing) {
        const busy = actionLoading[listing.id];
        const isRejecting = rejectListingOpen === listing.id;

        return React.createElement('div', {
            key: listing.id,
            className: 'bg-white rounded-xl border border-gray-200 p-5 shadow-sm'
          },
          React.createElement('div', { className: 'flex flex-wrap items-start justify-between gap-3 mb-3' },
            React.createElement('div', null,
              React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                StatusBadge('pending_review'),
                React.createElement('span', { className: 'text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium' },
                  listing.propertyType || 'Property'
                )
              ),
              React.createElement('p', { className: 'text-sm font-semibold text-gray-900' }, listing.title),
              React.createElement('p', { className: 'text-xs text-gray-500' }, 
                'By: ' + (listing.userName || 'Unknown') + ' • ' + formatTimestamp(listing.createdAt)
              )
            ),
            React.createElement('div', { className: 'text-right' },
              React.createElement('p', { className: 'text-lg font-bold text-green-950' },
                '₦' + (listing.price ? listing.price.toLocaleString() : '0')
              )
            )
          ),

          listing.images && listing.images.length > 0 &&
          React.createElement('div', { className: 'flex gap-2 mb-4 overflow-x-auto pb-2' },
            listing.images.slice(0, 3).map(function(img, i) {
              return React.createElement('img', {
                key: i,
                src: CloudinaryHelpers?.getThumbnailUrl(img) || '/vault/img/no-image.jpg',
                className: 'w-16 h-16 rounded-lg object-cover',
                onError: (e) => e.target.src = '/vault/img/no-image.jpg'
              });
            }),
            listing.images.length > 3 &&
            React.createElement('div', { className: 'w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500' },
              '+' + (listing.images.length - 3)
            )
          ),

          React.createElement('div', { className: 'bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-600' },
            React.createElement('span', { className: 'font-semibold text-gray-800' }, '📍 '),
            [listing.address, listing.lga, listing.state].filter(Boolean).join(', ')
          ),

          React.createElement('p', { className: 'text-sm text-gray-700 mb-4 line-clamp-2' },
            listing.description || 'No description provided.'
          ),

          isRejecting && React.createElement('div', { className: 'mb-4' },
            React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1.5' }, 'Rejection reason (required):'),
            React.createElement('textarea', {
              value: rejectionReason[listing.id] || '',
              onChange: function(e) {
                setRejectionReason(function(prev) { return { ...prev, [listing.id]: e.target.value }; });
              },
              placeholder: 'e.g., Incomplete information, inappropriate content...',
              rows: 2,
              className: 'w-full p-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-950'
            })
          ),

          React.createElement('div', { className: 'flex flex-wrap gap-2 pt-3 border-t border-gray-100' },
            !isRejecting && React.createElement('button', {
              onClick: function() { approveListing(listing); },
              disabled: busy,
              className: 'px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition'
            }, busy ? '...' : '✅ Approve'),

            !isRejecting && React.createElement('button', {
              onClick: function() { setRejectListingOpen(listing.id); },
              disabled: busy,
              className: 'px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition'
            }, '✕ Reject'),

            isRejecting && React.createElement('button', {
              onClick: function() { rejectListing(listing); },
              disabled: busy || !(rejectionReason[listing.id] || '').trim(),
              className: 'px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition'
            }, busy ? '...' : 'Confirm Reject'),

            isRejecting && React.createElement('button', {
              onClick: function() { setRejectListingOpen(null); },
              className: 'px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition'
            }, 'Cancel'),

            React.createElement('button', {
              onClick: function() { navigate('/listing/' + listing.id); },
              className: 'px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition'
            }, '👁️ Preview')
          )
        );
      })
    );
  }

  return React.createElement('div', { className: 'min-h-screen bg-green-50 py-8' },
    React.createElement(ConfirmationModal, null),
    
    React.createElement('div', { className: 'max-w-6xl mx-auto px-4' },

      React.createElement('div', { className: 'mb-6' },
        React.createElement('h1', { className: 'text-3xl font-bold text-gray-900' }, '🛡 Admin Dashboard'),
        React.createElement('p', { className: 'text-gray-500 mt-1' }, 'Logged in as ' + (user.email || user.uid))
      ),

      React.createElement('div', { className: 'bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg mb-6 text-sm' },
        '⚠️ Actions taken here are permanent. Always review content before approving or rejecting.'
      ),

      React.createElement('div', { className: 'flex gap-1 border-b border-gray-200 mb-6 flex-wrap' },
        TabBtn('📋 All Listings', 'listings'),
        TabBtn('📝 Pending Review', 'pending'),
        TabBtn('📊 Reports', 'reports'),
        TabBtn('🏠 Landlord Verifications', 'landlord_verifications'),
        TabBtn('🤝 Agent Verifications', 'agent_verifications')
      ),

      activeTab === 'listings' && React.createElement(AllListingsTab, null),
      activeTab === 'pending' && React.createElement(PendingListingsTab, null),
      activeTab === 'reports' && React.createElement(ReportsTab, null),
      activeTab === 'landlord_verifications' && React.createElement(LandlordVerificationsTab, null),
      activeTab === 'agent_verifications' && React.createElement(AgentVerificationsTab, null)
    )
  );
}

window.AdminPage = AdminPage;