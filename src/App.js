import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';

// ============================================================================
// CONSTANTS
// ============================================================================

const THEME_TAGS = [
  { name: 'Tech Debt', color: '#C97D60' },
  { name: 'Research', color: '#2C3E50' },
  { name: 'Customer', color: '#27AE60' },
  { name: 'Infrastructure', color: '#F39C12' },
  { name: 'Design', color: '#8E44AD' },
  { name: 'Platform', color: '#5D6D7E' },
  { name: 'Marketing', color: '#E74C3C' },
  { name: 'Data', color: '#16A085' },
];

const ROCK_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
};

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  // --------------------------------------------------------------------------
  // STATE - Data
  // --------------------------------------------------------------------------
  
  const [columns, setColumns] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedData = urlParams.get('data');
      
      if (sharedData) {
        try {
          const decoded = JSON.parse(atob(sharedData));
          if (!decoded.columns.done) {
            decoded.columns.done = { title: 'DONE', rocks: [] };
          }
          return decoded.columns;
        } catch (e) {
          console.error('Failed to load shared data');
        }
      }
      
      const saved = localStorage.getItem('bigRocksData');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.done) {
          parsed.done = { title: 'DONE', rocks: [] };
        }
        return parsed;
      }
    }
    
    return {
      now: { title: 'NOW', rocks: [] },
      next: { title: 'NEXT', rocks: [] },
      later: { title: 'LATER', rocks: [] },
      done: { title: 'DONE', rocks: [] },
    };
  });

  const [productName, setProductName] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedData = urlParams.get('data');
      
      if (sharedData) {
        try {
          const decoded = JSON.parse(atob(sharedData));
          return decoded.productName || 'Product Roadmap';
        } catch (e) {}
      }
      
      const saved = localStorage.getItem('bigRocksProductName');
      return saved || 'Product Roadmap';
    }
    return 'Product Roadmap';
  });

  const [customTags, setCustomTags] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedData = urlParams.get('data');
      
      if (sharedData) {
        try {
          const decoded = JSON.parse(atob(sharedData));
          return decoded.customTags || [];
        } catch (e) {}
      }
      
      const saved = localStorage.getItem('bigRocksCustomTags');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // --------------------------------------------------------------------------
  // STATE - UI
  // --------------------------------------------------------------------------
  
  const [editingRock, setEditingRock] = useState(null);
  const [editingProductName, setEditingProductName] = useState(false);
  const [editingColumnTitle, setEditingColumnTitle] = useState(null);
  const [draggedRock, setDraggedRock] = useState(null);
  const [dragOverInfo, setDragOverInfo] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [doneContainerCelebrating, setDoneContainerCelebrating] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  
  const [isViewOnly] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedData = urlParams.get('data');
      if (sharedData) {
        try {
          const decoded = JSON.parse(atob(sharedData));
          return decoded.editable === false;
        } catch (e) {}
      }
    }
    return false;
  });

  // --------------------------------------------------------------------------
  // EFFECTS - Persistence
  // --------------------------------------------------------------------------
  
  useEffect(() => {
    if (!isViewOnly && typeof window !== 'undefined') {
      localStorage.setItem('bigRocksData', JSON.stringify(columns));
    }
  }, [columns, isViewOnly]);

  useEffect(() => {
    if (!isViewOnly && typeof window !== 'undefined') {
      localStorage.setItem('bigRocksProductName', productName);
    }
  }, [productName, isViewOnly]);

  useEffect(() => {
    if (!isViewOnly && typeof window !== 'undefined') {
      localStorage.setItem('bigRocksCustomTags', JSON.stringify(customTags));
    }
  }, [customTags, isViewOnly]);

  // --------------------------------------------------------------------------
  // EFFECTS - UI Interactions
  // --------------------------------------------------------------------------

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showShareMenu && !e.target.closest('[data-share-menu]')) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showShareMenu]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && draggedRock) {
        cleanupDragState();
      }
    };
    
    const handleDragEnd = () => {
      setTimeout(cleanupDragState, 100);
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDragEnd);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDragEnd);
    };
  }, [draggedRock]);

  // --------------------------------------------------------------------------
  // HANDLERS - Tags
  // --------------------------------------------------------------------------
  
  const addCustomTag = (tagName, color) => {
    setCustomTags(prev => [...prev, { name: tagName, color }]);
  };

  // --------------------------------------------------------------------------
  // HANDLERS - Sharing
  // --------------------------------------------------------------------------
  
  const generateShareLink = (editable) => {
    const data = { columns, productName, customTags, editable };
    const encoded = btoa(JSON.stringify(data));
    return `${window.location.origin}${window.location.pathname}?data=${encoded}`;
  };

  const copyShareLink = (editable) => {
    const link = generateShareLink(editable);
    navigator.clipboard.writeText(link);
    alert(editable ? 'Editable link copied!' : 'View-only link copied!');
  };

  // --------------------------------------------------------------------------
  // HANDLERS - Rocks
  // --------------------------------------------------------------------------
  
  const addRock = (columnId) => {
    if (isViewOnly) return;
    
    const newRock = {
      id: `rock-${Date.now()}`,
      title: 'New Initiative',
      description: '',
      size: ROCK_SIZES.MEDIUM,
      tags: [],
      date: '',
      newlyCreated: true,
    };

    setColumns(prev => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        rocks: [...prev[columnId].rocks, newRock],
      },
    }));

    setTimeout(() => {
      setColumns(prev => ({
        ...prev,
        [columnId]: {
          ...prev[columnId],
          rocks: prev[columnId].rocks.map(r =>
            r.id === newRock.id ? { ...r, newlyCreated: false } : r
