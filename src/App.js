import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';  // ← static import (critical for build)

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const getContrastTextColor = (hexColor) => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1A1A1A' : '#FFFFFF';
};

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
  
  const [isViewOnly] = useState(() => {  // ← setter removed to avoid ESLint error
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

  const deleteCustomTag = (tagName) => {
    setCustomTags(prev => prev.filter(t => t.name !== tagName));
    
    setColumns(prev => {
      const updated = {};
      Object.keys(prev).forEach(columnId => {
        updated[columnId] = {
          ...prev[columnId],
          rocks: prev[columnId].rocks.map(rock => ({
            ...rock,
            tags: rock.tags ? rock.tags.filter(t => t !== tagName) : []
          }))
        };
      });
      return updated;
    });
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
          ),
        },
      }));
    }, 600);

    setEditingRock({ ...newRock, columnId });
  };

  const updateRock = (columnId, rockId, updates) => {
    setColumns(prev => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        rocks: prev[columnId].rocks.map(rock =>
          rock.id === rockId ? { ...rock, ...updates } : rock
        ),
      },
    }));
  };

  const updateColumnTitle = (columnId, newTitle) => {
    setColumns(prev => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        title: newTitle,
      },
    }));
  };

  const deleteRock = (columnId, rockId) => {
    setColumns(prev => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        rocks: prev[columnId].rocks.map(rock =>
          rock.id === rockId ? { ...rock, deleting: true } : rock
        ),
      },
    }));

    setTimeout(() => {
      setColumns(prev => ({
        ...prev,
        [columnId]: {
          ...prev[columnId],
          rocks: prev[columnId].rocks.filter(rock => rock.id !== rockId),
        },
      }));
    }, 300);
  };

  const duplicateRock = (columnId, rockId) => {
    const rockToDuplicate = columns[columnId].rocks.find(r => r.id === rockId);
    if (!rockToDuplicate) return;

    const duplicatedRock = {
      ...rockToDuplicate,
      id: `rock-${Date.now()}`,
      newlyCreated: true,
    };

    setColumns(prev => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        rocks: [...prev[columnId].rocks, duplicatedRock],
      },
    }));

    setTimeout(() => {
      setColumns(prev => ({
        ...prev,
        [columnId]: {
          ...prev[columnId],
          rocks: prev[columnId].rocks.map(r =>
            r.id === duplicatedRock.id ? { ...r, newlyCreated: false } : r
          ),
        },
      }));
    }, 600);
  };

  // --------------------------------------------------------------------------
  // HANDLERS - Drag & Drop
  // --------------------------------------------------------------------------
  
  const handleDragStart = (rock, columnId, index) => {
    setDraggedRock({ rock, columnId, index });
  };

  const handleDragOver = (e, columnId, overIndex) => {
    e.preventDefault();
    setDragOverInfo({ columnId, overIndex });
  };

  const cleanupDragState = () => {
    setDraggedRock(null);
    setDragOverInfo(null);
  };

  const handleDrop = (targetColumnId, targetIndex) => {
    if (!draggedRock) {
      cleanupDragState();
      return;
    }
    
    const { rock, columnId: sourceColumnId, index: sourceIndex } = draggedRock;
    
    if (sourceColumnId === targetColumnId && sourceIndex === targetIndex) {
      cleanupDragState();
      return;
    }

    let updatedRock = { ...rock };
    delete updatedRock.newlyCreated;
    delete updatedRock.deleting;

    const isCompletingRock = targetColumnId === 'done' && sourceColumnId !== 'done';
    const isUncompletingRock = sourceColumnId === 'done' && targetColumnId !== 'done';

    if (isCompletingRock) {
      updatedRock.completedDate = new Date().toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
      updatedRock.justCompleted = true;
      updatedRock.size = ROCK_SIZES.SMALL;
      
      setShowDone(true);
      setDoneContainerCelebrating(true);
      setTimeout(() => setDoneContainerCelebrating(false), 600);
      
      setTimeout(() => {
        setColumns(prev => ({
          ...prev,
          done: {
            ...prev.done,
            rocks: prev.done.rocks.map(r =>
              r.id === rock.id ? { ...r, justCompleted: false } : r
            ),
          },
        }));
      }, 600);
    }

    if (isUncompletingRock) {
      delete updatedRock.completedDate;
      updatedRock.justUncompleted = true;
      
      setTimeout(() => {
        setColumns(prev => ({
          ...prev,
          [targetColumnId]: {
            ...prev[targetColumnId],
            rocks: prev[targetColumnId].rocks.map(r =>
              r.id === rock.id ? { ...r, justUncompleted: false } : r
            ),
          },
        }));
      }, 600);
    }

    if (sourceColumnId === targetColumnId) {
      const newRocks = Array.from(columns[sourceColumnId].rocks);
      newRocks.splice(sourceIndex, 1);
      newRocks.splice(targetIndex, 0, updatedRock);
      
      setColumns(prev => ({
        ...prev,
        [sourceColumnId]: {
          ...prev[sourceColumnId],
          rocks: newRocks,
        },
      }));
    } else {
      const sourceRocks = columns[sourceColumnId].rocks.filter(r => r.id !== rock.id);
      const targetRocks = Array.from(columns[targetColumnId].rocks);
      targetRocks.splice(targetIndex, 0, updatedRock);

      setColumns(prev => ({
        ...prev,
        [sourceColumnId]: {
          ...prev[sourceColumnId],
          rocks: sourceRocks,
        },
        [targetColumnId]: {
          ...prev[targetColumnId],
          rocks: targetRocks,
        },
      }));
    }

    cleanupDragState();
  };

  // --------------------------------------------------------------------------
  // HANDLERS - Export (unchanged from working version)
  // --------------------------------------------------------------------------
  
  const exportToPNG = async () => {
    try {
      const element = document.getElementById('export-area');

      const canvas = await html2canvas(element, {
        backgroundColor: '#F0F0F0',
        scale: 2,
        logging: false,
        useCORS: true,
        width: element.scrollWidth + 200,
        height: element.scrollHeight + 200,
        windowWidth: element.scrollWidth + 200,
        windowHeight: element.scrollHeight + 200,
      });

      const link = document.createElement('a');
      link.download = `${productName.replace(/\s+/g, '-').toLowerCase()}-roadmap.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again or use your browser\'s screenshot feature.');
    }
  };

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  
  const allTags = [...THEME_TAGS, ...customTags];

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;700&family=Inter:wght@900&display=swap');
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes rockAppear {
            0% { opacity: 0; transform: scale(0.9) translateY(10px); }
            60% { transform: scale(1.02) translateY(0); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }

          @keyframes rockDelete {
            0% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(0.9) translateX(-20px); }
          }

          @keyframes rockComplete {
            0% { transform: scale(1); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            30% { transform: scale(1.08); box-shadow: 0 8px 24px rgba(30, 132, 73, 0.3); }
            100% { transform: scale(1); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          }

          @keyframes rockUncomplete {
            0% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(0.95); box-shadow: 0 4px 16px rgba(231, 76, 60, 0.2); }
            100% { transform: scale(1); opacity: 1; }
          }

          @keyframes doneContainerPulse {
            0%, 100% { background-color: #F5F5F5; }
            50% { background-color: #D4F1D4; }
          }
        `}
      </style>

      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F0F0F0',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`,
        fontFamily: '"Work Sans", sans-serif',
        padding: '48px 24px',
      }}>
        <div id="export-area" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* View-Only Banner */}
          {isViewOnly && (
            <div style={{
              backgroundColor: '#F39C12',
              color: '#1A1A1A',
              padding: '12px 24px',
              marginBottom: '24px',
              fontSize: '14px',
              fontWeight: '700',
              textAlign: 'center',
            }}>
              👁️ View-Only Mode - You're viewing a shared roadmap
            </div>
          )}

          {/* Header - Title & Actions */}
          <div style={{
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '24px',
          }}>
            <h1 style={{
              fontSize: '12px',
              fontWeight: '700',
              margin: 0,
              padding: '12px 0',
              color: '#1A1A1A',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}>
              BIG ROCKS
            </h1>
            
            {!isViewOnly && (
              <div style={{ display: 'flex', gap: '12px', position: 'relative' }} data-share-menu>
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#1A1A1A',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontFamily: '"Work Sans", sans-serif',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Share
                </button>

                {showShareMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    backgroundColor: 'white',
                    border: '2px solid #1A1A1A',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    animation: 'slideUp 0.2s ease-out',
                  }}>
                    <button
                      onClick={() => copyShareLink(false)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontFamily: '"Work Sans", sans-serif',
                        borderBottom: '1px solid #F0F0F0',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#F0F0F0'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      📋 View Only
                    </button>
                    <button
                      disabled
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'not-allowed',
                        fontSize: '14px',
                        fontFamily: '"Work Sans", sans-serif',
                        color: '#999',
                        opacity: 0.6,
                      }}
                    >
                      ✏️ Editable Copy <span style={{ fontSize: '11px', fontStyle: 'italic', marginLeft: '8px' }}>(Coming soon)</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={exportToPNG}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#1A1A1A',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontFamily: '"Work Sans", sans-serif',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Export PNG
                </button>
              </div>
            )}
          </div>

          {/* Black Separator Line */}
          <div style={{
            borderTop: '2px solid #1A1A1A',
            marginBottom: '48px',
          }} />

          {/* Export Container - Wraps everything for PNG export */}
          <div id="export-container" style={{ paddingBottom: '48px' }}>

            {/* Product Name */}
            <div style={{ marginBottom: '48px' }}>
              {editingProductName ? (
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  onBlur={() => setEditingProductName(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEditingProductName(false);
                  }}
                  autoFocus
                  style={{
                    fontSize: '72px',
                    fontWeight: '900',
                    fontFamily: 'Inter, sans-serif',
                    border: '2px solid #1A1A1A',
                    backgroundColor: 'white',
                    padding: '8px 12px',
                    width: '100%',
                    lineHeight: '1',
                    letterSpacing: '-3px',
                  }}
                />
              ) : (
                <h2
                  onClick={() => !isViewOnly && setEditingProductName(true)}
                  style={{
                    fontSize: '72px',
                    fontWeight: '900',
                    fontFamily: 'Inter, sans-serif',
                    margin: 0,
                    color: '#1A1A1A',
                    cursor: isViewOnly ? 'default' : 'pointer',
                    display: 'inline-block',
                    padding: '8px 0',
                    transition: 'opacity 0.2s',
                    lineHeight: '1',
                    letterSpacing: '-3px',
                  }}
                  onMouseEnter={(e) => !isViewOnly && (e.target.style.opacity = '0.7')}
                  onMouseLeave={(e) => (e.target.style.opacity = '1')}
                >
                  {productName}
                </h2>
              )}
            </div>

            {/* Filter UI */}
            <div style={{
              marginBottom: '32px',
              paddingBottom: activeFilter || showFilter ? '24px' : '0',
              borderBottom: activeFilter || showFilter ? '1px solid #D0D0D0' : 'none',
              transition: 'all 0.3s ease',
            }}>
              {!showFilter && !activeFilter ? (
                <button
                  onClick={() => setShowFilter(true)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: '2px solid #1A1A1A',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontFamily: '"Work Sans", sans-serif',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#F0F0F0'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  + Filter by Tag
                </button>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: '#666',
                  }}>
                    Filter by Tag
                  </div>
                  
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    {activeFilter && (
                      <div style={{
                        position: 'absolute',
                        left: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '8px',
                        height: '8px',
                        backgroundColor: allTags.find(t => t.name === activeFilter)?.color || '#1A1A1A',
                        pointerEvents: 'none',
                        zIndex: 1,
                      }} />
                    )}
                    <select
                      value={activeFilter || ''}
                      onChange={(e) => setActiveFilter(e.target.value || null)}
                      style={{
                        padding: '8px 12px',
                        paddingLeft: activeFilter ? '24px' : '12px',
                        backgroundColor: 'white',
                        border: '2px solid #1A1A1A',
                        fontSize: '12px',
                        fontWeight: '700',
                        fontFamily: '"Work Sans", sans-serif',
                        cursor: 'pointer',
                        minWidth: '200px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        transition: 'padding 0.2s ease',
                      }}
                    >
                      <option value="">All Tags</option>
                      {allTags.map(tag => (
                        <option key={tag.name} value={tag.name}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    onClick={() => {
                      setActiveFilter(null);
                      setShowFilter(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'transparent',
                      border: '2px solid #1A1A1A',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontFamily: '"Work Sans", sans-serif',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#F0F0F0'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {activeFilter ? 'Clear' : '×'}
                  </button>
                </div>
              )}
            </div>

            {/* Roadmap Columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '32px',
            }}>
              {Object.entries(columns).filter(([columnId]) => columnId !== 'done').map(([columnId, column]) => (
                <div 
                  key={columnId}
                  onDragOver={(e) => handleDragOver(e, columnId, column.rocks.length)}
                  onDrop={() => handleDrop(columnId, column.rocks.length)}
                >
                  <div style={{
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    {editingColumnTitle?.columnId === columnId ? (
                      <input
                        type="text"
                        value={column.title}
                        onChange={(e) => updateColumnTitle(columnId, e.target.value)}
                        onBlur={() => setEditingColumnTitle(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingColumnTitle(null);
                        }}
                        autoFocus
                        style={{
                          fontSize: '24px',
                          fontWeight: '900',
                          fontFamily: '"Work Sans", sans-serif',
                          border: '2px solid #1A1A1A',
                          backgroundColor: 'white',
                          padding: '4px 8px',
                          color: '#1A1A1A',
                          letterSpacing: '-1px',
                          flex: 1,
                          minWidth: 0,
                        }}
                      />
                    ) : (
                      <h2
                        onClick={() => !isViewOnly && setEditingColumnTitle({ columnId })}
                        style={{
                          fontSize: '24px',
                          fontWeight: '900',
                          margin: 0,
                          color: '#1A1A1A',
                          letterSpacing: '-1px',
                          cursor: isViewOnly ? 'default' : 'pointer',
                          padding: '4px 0',
                        }}
                        onMouseEnter={(e) => !isViewOnly && (e.target.style.opacity = '0.7')}
                        onMouseLeave={(e) => (e.target.style.opacity = '1')}
                      >
                        {column.title}
                      </h2>
                    )}
                    
                    <button
                      onClick={() => addRock(columnId)}
                      disabled={isViewOnly}
                      style={{
                        width: '32px',
                        height: '32px',
                        flexShrink: 0,
                        backgroundColor: isViewOnly ? '#999' : '#1A1A1A',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '20px',
                        cursor: isViewOnly ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isViewOnly ? 0.5 : 1,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isViewOnly) {
                          e.target.style.transform = 'scale(1.1)';
                          e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      +
                    </button>
                  </div>

                  <div style={{
                    minHeight: '500px',
                    backgroundColor: dragOverInfo && dragOverInfo.columnId === columnId ? '#F5F5F5' : 'transparent',
                    padding: '0',
                    transition: draggedRock ? 'none' : 'background-color 0.2s',
                    position: 'relative',
                  }}>
                    {column.rocks
                      .filter(rock => {
                        if (!activeFilter) return true;
                        return rock.tags && rock.tags.includes(activeFilter);
                      })
                      .map((rock, index) => (
                        <React.Fragment key={rock.id}>
                          {dragOverInfo && dragOverInfo.columnId === columnId && dragOverInfo.overIndex === index && (
                            <div style={{
                              height: '4px',
                              backgroundColor: '#1A1A1A',
                              marginBottom: '16px',
                            }} />
                          )}
                          <Rock
                            rock={rock}
                            index={index}
                            columnId={columnId}
                            allTags={allTags}
                            isViewOnly={isViewOnly}
                            isDraggingGlobal={!!draggedRock}
                            onEdit={() => setEditingRock({ ...rock, columnId })}
                            onDelete={() => deleteRock(columnId, rock.id)}
                            onUpdateSize={(newSize) => updateRock(columnId, rock.id, { size: newSize })}
                            onDragStart={() => handleDragStart(rock, columnId, index)}
                            onDragOver={(e) => {
                              e.stopPropagation();
                              handleDragOver(e, columnId, index);
                            }}
                            onDrop={(e) => {
                              e.stopPropagation();
                              handleDrop(columnId, index);
                            }}
                          />
                        </React.Fragment>
                      ))}

                    {dragOverInfo && dragOverInfo.columnId === columnId && 
                     dragOverInfo.overIndex === column.rocks.length && (
                      <div style={{
                        height: '4px',
                        backgroundColor: '#1A1A1A',
                        marginTop: column.rocks.length > 0 ? '0' : '16px',
                      }} />
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div> {/* End export-container */}

          {/* DONE Section */}
          {columns.done && (
            <div style={{ marginTop: '48px' }}>
              <div 
                style={{
                  borderTop: '2px solid #1A1A1A',
                  paddingTop: '24px',
                  marginBottom: '16px',
                }}
                onDragOver={(e) => {
                  if (!showDone) {
                    e.preventDefault();
                    handleDragOver(e, 'done', columns.done.rocks.length);
                  }
                }}
                onDrop={() => {
                  if (!showDone) {
                    handleDrop('done', columns.done.rocks.length);
                  }
                }}
              >
                <button
                  onClick={() => setShowDone(!showDone)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: dragOverInfo && dragOverInfo.columnId === 'done' && !showDone ? '#F5F5F5' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#666',
                    fontFamily: '"Work Sans", sans-serif',
                    padding: '8px 12px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#F5F5F5'}
                  onMouseLeave={(e) => {
                    if (!(dragOverInfo && dragOverInfo.columnId === 'done' && !showDone)) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span style={{
                    fontSize: '14px',
                    transition: 'transform 0.2s',
                    transform: showDone ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}>
                    ▶
                  </span>
                  DONE ({columns.done.rocks.length})
                  {!showDone && dragOverInfo && dragOverInfo.columnId === 'done' && (
                    <span style={{ fontSize: '12px', marginLeft: '8px', color: '#999' }}>
                      (drop to complete)
                    </span>
                  )}
                </button>
              </div>

              {showDone && (
                <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
                  <div
                    onDragOver={(e) => handleDragOver(e, 'done', columns.done.rocks.length)}
                    onDrop={() => handleDrop('done', columns.done.rocks.length)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                      columnGap: '16px',
                      rowGap: '0',
                      padding: '0',
                      backgroundColor: '#F5F5F5',
                      minHeight: columns.done.rocks.length === 0 ? '100px' : 'auto',
                      marginTop: '16px',
                      animation: doneContainerCelebrating ? 'doneContainerPulse 0.6s ease-in-out' : 'none',
                    }}
                  >
                    {columns.done.rocks.length === 0 ? (
                      <div style={{
                        gridColumn: '1 / -1',
                        padding: '48px',
                        textAlign: 'center',
                        color: '#999',
                        fontSize: '14px',
                      }}>
                        Drag completed items here
                      </div>
                    ) : (
                      <>
                        {columns.done.rocks
                          .filter(rock => {
                            if (!activeFilter) return true;
                            return rock.tags && rock.tags.includes(activeFilter);
                          })
                          .map((rock, index) => (
                            <React.Fragment key={rock.id}>
                              {dragOverInfo && dragOverInfo.columnId === 'done' && dragOverInfo.overIndex === index && (
                                <div style={{
                                  height: '4px',
                                  backgroundColor: '#1A1A1A',
                                  marginBottom: '16px',
                                }} />
                              )}
                              <Rock
                                rock={rock}
                                index={index}
                                columnId="done"
                                allTags={allTags}
                                isViewOnly={isViewOnly}
                                isDraggingGlobal={!!draggedRock}
                                onEdit={() => setEditingRock({ ...rock, columnId: 'done' })}
                                onDelete={() => deleteRock('done', rock.id)}
                                onUpdateSize={(newSize) => updateRock('done', rock.id, { size: newSize })}
                                onDragStart={() => handleDragStart(rock, 'done', index)}
                                onDragOver={(e) => {
                                  e.stopPropagation();
                                  handleDragOver(e, 'done', index);
                                }}
                                onDrop={(e) => {
                                  e.stopPropagation();
                                  handleDrop('done', index);
                                }}
                              />
                            </React.Fragment>
                          ))}

                        {dragOverInfo && dragOverInfo.columnId === 'done' && 
                         dragOverInfo.overIndex === columns.done.rocks.length && (
                          <div style={{
                            height: '4px',
                            backgroundColor: '#1A1A1A',
                            marginTop: columns.done.rocks.length > 0 ? '0' : '16px',
                          }} />
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingRock && (
        <RockEditModal
          rock={editingRock}
          allTags={allTags}
          onClose={() => setEditingRock(null)}
          onSave={(updates) => {
            updateRock(editingRock.columnId, editingRock.id, updates);
            setEditingRock(null);
          }}
          onAddCustomTag={addCustomTag}
          onDeleteCustomTag={deleteCustomTag}
          onDuplicate={(rock) => duplicateRock(editingRock.columnId, editingRock.id)}
        />
      )}
    </>
  );
}

// ... Rock and RockEditModal components remain the same as in Claude's version ...
