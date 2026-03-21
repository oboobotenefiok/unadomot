// pages/home/utils/scoring.js
function scoreListing(listing, affinity) {
  let score = 0;
  
  // Time decay (newer = higher score)
  const ageHours = listing.createdAt
    ? (Date.now() / 1000 - listing.createdAt.seconds) / 3600
    : 720;
  score += Math.max(0, 40 - ageHours * 0.05);

  // Affinity boost
  if (listing.propertyType) {
    score += Math.min(20, (affinity['type_' + listing.propertyType] || 0) * 4);
  }
  if (listing.state) {
    score += Math.min(10, (affinity['state_' + listing.state] || 0) * 2);
  }
  if (listing.bedrooms) {
    score += Math.min(10, (affinity['bed_' + listing.bedrooms] || 0) * 2);
  }

  // Random noise for variety
  score += Math.random() * 20;

  return score;
}

function sortListings(listings, sortBy, affinity) {
  const sorted = [...listings];
  
  if (sortBy === 'smart') {
    sorted.sort(function(a, b) { 
      return scoreListing(b, affinity) - scoreListing(a, affinity); 
    });
  } else if (sortBy === 'price_low') {
    sorted.sort(function(a, b) { 
      return (a.price || 0) - (b.price || 0); 
    });
  } else if (sortBy === 'price_high') {
    sorted.sort(function(a, b) { 
      return (b.price || 0) - (a.price || 0); 
    });
  }
  
  return sorted;
}

function filterListings(listings, searchTerm, filters) {
  let filtered = [...listings];

  // Apply search term
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter(function(l) {
      return [l.title, l.description, l.address, l.state, l.lga].some(function(f) {
        return f && f.toLowerCase().includes(q);
      });
    });
  }

  // Apply filters
  if (filters.minPrice) {
    filtered = filtered.filter(function(l) { 
      return l.price >= Number(filters.minPrice); 
    });
  }
  if (filters.maxPrice) {
    filtered = filtered.filter(function(l) { 
      return l.price <= Number(filters.maxPrice); 
    });
  }
  if (filters.state) {
    filtered = filtered.filter(function(l) { 
      return l.state === filters.state; 
    });
  }
  if (filters.lga) {
    filtered = filtered.filter(function(l) { 
      return l.lga === filters.lga; 
    });
  }
  if (filters.bedrooms) {
    filtered = filtered.filter(function(l) {
      return filters.bedrooms === '5+' 
        ? Number(l.bedrooms) >= 5 
        : l.bedrooms === filters.bedrooms;
    });
  }
  if (filters.propertyType) {
    filtered = filtered.filter(function(l) { 
      return l.propertyType === filters.propertyType; 
    });
  }
  if (filters.furnishing) {
    filtered = filtered.filter(function(l) { 
      return l.furnishing === filters.furnishing; 
    });
  }
  if (filters.agentOnly) {
    filtered = filtered.filter(function(l) { 
      return l.agentToggle === true; 
    });
  }
  if (filters.noAgentFees) {
    filtered = filtered.filter(function(l) { 
      return l.agentToggle === false; 
    });
  }

  return filtered;
}

window.ScoringHelpers = {
  scoreListing,
  sortListings,
  filterListings
};