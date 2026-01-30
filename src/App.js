import React, { useState, useEffect } from 'react';

// Helper function to determine if text should be white or black based on background color
const getContrastTextColor = (hexColor) => {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#1A1A1A' : '#FFFFFF';
};

// Theme colors inspired by Swiss design and the references
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

export default function App() {
  const [columns, setColumns] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check if there's shared data in URL
      const urlParams = new URLSearchParams(window.location.search);
      const sharedData = urlParams.get('data');
      if (sharedData) {
        try {
          const decoded = JSON.parse(atob(sharedData));
          // Ensure done column exists
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
        // Migration: Add done column if it doesn't exist
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
  const [productName, setProductName] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check URL params first
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
      // Check URL params first
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

  useEffect(() => {
    if (typeof window !== 'undefined' && !isViewOnly) {
      localStorage.setItem('bigRocksData', JSON.stringify(columns));
    }
  }, [columns, isViewOnly]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isViewOnly) {
      localStorage.setItem('bigRocksProductName', productName);
    }
  }, [productName, isViewOnly]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isViewOnly) {
      localStorage.setItem('bigRocksCustomTags', JSON.stringify(customTags));
    }
  }, [customTags, isViewOnly]);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showShareMenu && !e.target.closest('button')) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showShareMenu]);

  // Cleanup drag state on ESC key or lost drag
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        cleanupDragState();
      }
    };
    
    const handleDragEnd = () => {
      // Small delay to ensure drop handler runs first
      setTimeout(() => {
        cleanupDragState();
      }, 100);
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDragEnd);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDragEnd);
    };
  }, []);

  const addCustomTag = (tagName, color) => {
    setCustomTags(prev => [...prev, { name: tagName, color }]);
  };

  const generateShareLink = (editable) => {
    const data = {
      columns,
      productName,
      customTags,
      editable,
    };
    const encoded = btoa(JSON.stringify(data));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?data=${encoded}`;
  };

  const copyShareLink = (editable) => {
    const link = generateShareLink(editable);
    navigator.clipboard.writeText(link).then(() => {
      alert(editable ? 'Editable link copied to clipboard!' : 'View-only link copied to clipboard!');
      setShowShareMenu(false);
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy link. Please try again.');
    });
  };

  const addRock = (columnId) => {
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

    // Remove the newlyCreated flag after animation completes
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
    // First, mark the rock as deleting to trigger animation
    setColumns(prev => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        rocks: prev[columnId].rocks.map(rock =>
          rock.id === rockId ? { ...rock, deleting: true } : rock
        ),
      },
    }));

    // After animation completes, actually remove the rock
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
    
    // Add completed date if moving TO DONE, remove if moving FROM DONE
    let updatedRock = rock;
    let animationFlag = null;
    
    if (targetColumnId === 'done' && sourceColumnId !== 'done') {
      updatedRock = { ...rock, completedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), justCompleted: true };
      animationFlag = 'justCompleted';
      
      // Trigger DONE container celebration and auto-expand if collapsed
      setDoneContainerCelebrating(true);
      setShowDone(true);
      setTimeout(() => setDoneContainerCelebrating(false), 600);
    } else if (sourceColumnId === 'done' && targetColumnId !== 'done') {
      const { completedDate, ...rockWithoutCompletedDate } = rock;
      updatedRock = { ...rockWithoutCompletedDate, justUncompleted: true };
      animationFlag = 'justUncompleted';
    }
    
    // Same column reordering
    if (sourceColumnId === targetColumnId) {
      if (sourceIndex === targetIndex) {
        setDraggedRock(null);
        setDragOverInfo(null);
        return;
      }
      
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
      // Move between columns
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

    setDraggedRock(null);
    setDragOverInfo(null);
    
    // Clear animation flag after animation completes
    if (animationFlag) {
      setTimeout(() => {
        setColumns(prev => ({
          ...prev,
          [targetColumnId]: {
            ...prev[targetColumnId],
            rocks: prev[targetColumnId].rocks.map(r =>
              r.id === updatedRock.id ? { ...r, justCompleted: false, justUncompleted: false } : r
            ),
          },
        }));
      }, 600);
    }
  };

const exportToPNG = async () => {
  try {
    // Import html2canvas from installed package (not dynamic import)
    const html2canvas = require('html2canvas').default;
    
    // Create a wrapper div with padding that includes product name and roadmap
    const exportWrapper = document.createElement('div');
    exportWrapper.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      background-color: #F0F0F0;
      padding: 48px;
      font-family: "Work Sans", sans-serif;
    `;
    
    // Clone product name
    const productNameClone = document.createElement('h2');
    productNameClone.textContent = productName;
    productNameClone.style.cssText = `
      font-size: 72px;
      font-weight: 900;
      font-family: Inter, sans-serif;
      margin: 0 0 48px 0;
      color: #1A1A1A;
      letter-spacing: -3px;
      line-height: 1;
    `;
    
    // Clone the roadmap
    const roadmapClone = document.getElementById('roadmap-container').cloneNode(true);
    
    // Append to wrapper
    exportWrapper.appendChild(productNameClone);
    exportWrapper.appendChild(roadmapClone);
    document.body.appendChild(exportWrapper);
    
    // Capture with html2canvas
    const canvas = await html2canvas(exportWrapper, {
      backgroundColor: '#F0F0F0',
      scale: 2,
      logging: false,
      useCORS: true,
    });
    
    // Cleanup
    document.body.removeChild(exportWrapper);
    
    // Download
    const link = document.createElement('a');
    link.download = `${productName.replace(/\s+/g, '-').toLowerCase()}-roadmap.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed. Please try again or use your browser\'s screenshot feature.');
  }
};
  
  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;700&family=Inter:wght@900&display=swap');
          
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes slideUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          @keyframes rockAppear {
            0% {
              opacity: 0;
              transform: scale(0.9) translateY(10px);
            }
            60% {
              transform: scale(1.02) translateY(0);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          @keyframes rockDelete {
            0% {
              opacity: 1;
              transform: scale(1);
            }
            100% {
              opacity: 0;
              transform: scale(0.9) translateX(-20px);
            }
          }
          @keyframes rockComplete {
            0% {
              transform: scale(1);
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            30% {
              transform: scale(1.08);
              box-shadow: 0 8px 24px rgba(30, 132, 73, 0.3);
            }
            100% {
              transform: scale(1);
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
          }
          @keyframes rockUncomplete {
            0% {
              transform: scale(1);
              opacity: 0.7;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            50% {
              transform: scale(0.95);
              opacity: 0.9;
              box-shadow: 0 4px 16px rgba(231, 76, 60, 0.2);
            }
            100% {
              transform: scale(1);
              opacity: 1;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
          }
          @keyframes doneContainerPulse {
            0% {
              background-color: #F5F5F5;
            }
            50% {
              background-color: #D4F1D4;
            }
            100% {
              background-color: #F5F5F5;
            }
          }
        `}
      </style>
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F0F0F0',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.10'/%3E%3C/svg%3E")`,
        fontFamily: '"Work Sans", sans-serif',
        padding: '48px 24px',
      }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* View-Only Banner */}
        {isViewOnly && (
          <div style={{
            backgroundColor: '#F39C12',
            color: '#1A1A1A',
            padding: '12px 24px',
            marginBottom: '24px',
            borderRadius: '2px',
            fontSize: '14px',
            fontWeight: '700',
            textAlign: 'center',
          }}>
            👁️ View-Only Mode - You're viewing a shared roadmap
          </div>
        )}
        
        {/* Header */}
        <div style={{
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <h1 style={{
            fontSize: '12px',
            fontWeight: '700',
            margin: 0,
            color: '#1A1A1A',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            BIG ROCKS
          </h1>
          {!isViewOnly && (
            <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
              <div style={{ position: 'relative' }}>
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
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
                    backgroundColor: '#F0F0F0',
                    border: '2px solid #1A1A1A',
                    borderRadius: '2px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    minWidth: '200px',
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
                        borderBottom: '1px solid #F5F5F5',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#F5F5F5'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      📋 View Only
                    </button>
                    <button
                      onClick={() => copyShareLink(true)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontFamily: '"Work Sans", sans-serif',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#F5F5F5'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      ✏️ Editable Copy
                    </button>
                  </div>
                )}
              </div>
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
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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

        {/* Product Name - Massive */}
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
                borderRadius: '2px',
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
                borderRadius: '2px',
                transition: 'background-color 0.2s',
                lineHeight: '1',
                letterSpacing: '-3px',
              }}
              onMouseEnter={(e) => !isViewOnly && (e.target.style.opacity = '0.7')}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              {productName}
            </h2>
          )}
        </div>

        {/* Filter Tags - Collapsible */}
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
                borderRadius: '0',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: '"Work Sans", sans-serif',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#F0F0F0';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
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
                  <div
                    style={{
                      position: 'absolute',
                      left: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '8px',
                      height: '8px',
                      borderRadius: '0',
                      backgroundColor: [...THEME_TAGS, ...customTags].find(t => t.name === activeFilter)?.color || '#1A1A1A',
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  />
                )}
                <select
                  value={activeFilter || ''}
                  onChange={(e) => setActiveFilter(e.target.value || null)}
                  style={{
                    padding: '8px 12px',
                    paddingLeft: activeFilter ? '24px' : '12px',
                    backgroundColor: 'white',
                    border: '2px solid #1A1A1A',
                    borderRadius: '0',
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
                  {[...THEME_TAGS, ...customTags].map(tag => (
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
                  borderRadius: '0',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: '"Work Sans", sans-serif',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#F0F0F0';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                {activeFilter ? 'Clear' : '×'}
              </button>
            </div>
          )}
        </div>

        {/* Roadmap Container */}
        <div id="roadmap-container" style={{
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
                      borderRadius: '0',
                      color: '#1A1A1A',
                      letterSpacing: '-1px',
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
                    backgroundColor: isViewOnly ? '#999' : '#1A1A1A',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '20px',
                    cursor: isViewOnly ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isViewOnly ? 0.5 : 1,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isViewOnly) {
                      e.target.style.transform = 'scale(1.1)';
                      e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isViewOnly) {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                >
                  +
                </button>
              </div>

              <div style={{
                minHeight: '500px',
                backgroundColor: dragOverInfo && dragOverInfo.columnId === columnId ? '#F5F5F5' : 'transparent',
                padding: '0',
                borderRadius: '0',
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
                        borderRadius: '2px',
                      }} />
                    )}
                    <Rock
                      rock={rock}
                      index={index}
                      columnId={columnId}
                      customTags={customTags}
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
                {dragOverInfo && dragOverInfo.columnId === columnId && dragOverInfo.overIndex === column.rocks.length && (
                  <div style={{
                    height: '4px',
                    backgroundColor: '#1A1A1A',
                    marginTop: '8px',
                    borderRadius: '2px',
                  }} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* DONE Section - Collapsible */}
        {columns.done && (
          <div style={{ marginTop: '48px' }}>
            {/* Divider and Toggle */}
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
                  setShowDone(true); // Auto-expand when dropping
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
                  borderRadius: '2px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#F5F5F5';
                }}
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

            {/* DONE Rocks Grid */}
            <div
              style={{
                maxHeight: showDone ? '3000px' : '0',
                opacity: showDone ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-in-out',
              }}
            >
              <div
                onDragOver={(e) => handleDragOver(e, 'done', columns.done.rocks.length)}
                onDrop={() => handleDrop('done', columns.done.rocks.length)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px',
                  padding: '0',
                  backgroundColor: '#F5F5F5',
                  borderRadius: '0',
                  minHeight: columns.done.rocks.length === 0 ? '100px' : 'auto',
                  marginTop: '16px',
                  animation: doneContainerCelebrating ? 'doneContainerPulse 0.6s ease-in-out' : 'none',
                }}
              >
                {columns.done.rocks.length === 0 ? (
                  <div style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '14px',
                    padding: '32px',
                  }}>
                    No completed items yet. Drag rocks here when done!
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
                            borderRadius: '2px',
                          }} />
                        )}
                        <Rock
                          rock={rock}
                          index={index}
                          columnId="done"
                          customTags={customTags}
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
                    {dragOverInfo && dragOverInfo.columnId === 'done' && dragOverInfo.overIndex === columns.done.rocks.length && (
                      <div style={{
                        height: '4px',
                        backgroundColor: '#1A1A1A',
                        marginTop: '8px',
                        borderRadius: '2px',
                      }} />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingRock && (
          <EditModal
            rock={editingRock}
            customTags={customTags}
            onAddCustomTag={addCustomTag}
            onClose={() => setEditingRock(null)}
            onSave={(updates) => {
              updateRock(editingRock.columnId, editingRock.id, updates);
              setEditingRock(null);
            }}
          />
        )}
      </div>
    </div>
    </>
  );
}

function Rock({ rock, index, columnId, customTags, isViewOnly, isDraggingGlobal, onEdit, onDelete, onUpdateSize, onDragStart, onDragOver, onDrop }) {
  const [isDragging, setIsDragging] = useState(false);

  const sizeStyles = {
    [ROCK_SIZES.SMALL]: { minHeight: '80px' },
    [ROCK_SIZES.MEDIUM]: { minHeight: '180px' },
    [ROCK_SIZES.LARGE]: { minHeight: '280px' },
  };

  const isDone = columnId === 'done';
  // Force small size for DONE rocks
  const displaySize = isDone ? ROCK_SIZES.SMALL : rock.size;
  const isSmall = displaySize === ROCK_SIZES.SMALL;
  const isEditable = !isViewOnly && !isDone;
  const isDraggable = !isViewOnly; // Can drag even if in DONE, to move back out

  // Use neutral background, let tags provide the color
  const backgroundColor = '#FFFFFF';

  // Combine built-in and custom tags
  const allTags = [...THEME_TAGS, ...customTags];

  return (
    <div
      draggable={isDraggable}
      onDragStart={(e) => {
        if (!isDraggable) return;
        setIsDragging(true);
        onDragStart();
      }}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        ...sizeStyles[displaySize],
        backgroundColor: backgroundColor,
        border: '2px solid #1A1A1A',
        borderRadius: '0',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: isDragging
          ? '0 8px 24px rgba(0,0,0,0.25)'
          : '0 2px 8px rgba(0,0,0,0.1)',
        cursor: 'grab',
        position: 'relative',
        transition: isDraggingGlobal ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isDragging ? 0.5 : (isDone ? 0.7 : 1),
        display: 'flex',
        flexDirection: 'column',
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        pointerEvents: isDraggingGlobal && !isDragging ? 'none' : 'auto',
        animation: rock.deleting 
          ? 'rockDelete 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'
          : rock.justCompleted
            ? 'rockComplete 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
            : rock.justUncompleted
              ? 'rockUncomplete 0.5s ease-out'
              : rock.newlyCreated 
                ? 'rockAppear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                : 'none',
      }}
      onMouseEnter={(e) => {
        if (!isDragging && !isDone && !isDraggingGlobal) {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging && !isDone && !isDraggingGlobal) {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        }
      }}
    >
      {isEditable && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '4px',
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const sizes = [ROCK_SIZES.SMALL, ROCK_SIZES.MEDIUM, ROCK_SIZES.LARGE];
              const currentIndex = sizes.indexOf(rock.size);
              const nextSize = sizes[(currentIndex + 1) % sizes.length];
              onUpdateSize(nextSize);
            }}
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: 'rgba(0,0,0,0.1)',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            title="Change size"
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(0,0,0,0.2)';
              e.target.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(0,0,0,0.1)';
              e.target.style.transform = 'scale(1)';
            }}
          >
            ⇅
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: 'rgba(0,0,0,0.1)',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(0,0,0,0.2)';
              e.target.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(0,0,0,0.1)';
              e.target.style.transform = 'scale(1)';
            }}
          >
          ✎
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete();
          }}
          style={{
            width: '24px',
            height: '24px',
            backgroundColor: 'rgba(0,0,0,0.1)',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(231,76,60,0.2)';
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'rgba(0,0,0,0.1)';
            e.target.style.transform = 'scale(1)';
          }}
        >
          ×
        </button>
      </div>
      )}

      <h3 style={{
        fontSize: '18px',
        fontWeight: '900',
        margin: '0 0 8px 0',
        color: '#1A1A1A',
        wordBreak: 'break-word',
        paddingRight: '80px',
      }}>
        {rock.title}
      </h3>

      {/* Only show description if not small */}
      {!isSmall && rock.description && (
        <p style={{
          fontSize: '13px',
          fontWeight: '500',
          lineHeight: '1.6',
          margin: '0 0 8px 0',
          color: 'rgba(26,26,26,0.85)',
          wordBreak: 'break-word',
          flex: '1',
        }}>
          {rock.description}
        </p>
      )}

      {rock.date && (
        <div style={{
          fontSize: '11px',
          fontWeight: '700',
          color: 'rgba(26,26,26,0.6)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginTop: isSmall ? 'auto' : '8px',
        }}>
          {rock.date}
        </div>
      )}

      {/* Completed Date - only for DONE rocks */}
      {isDone && rock.completedDate && (
        <div style={{
          fontSize: '11px',
          fontWeight: '700',
          color: '#1E8449',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginTop: '8px',
        }}>
          ✓ Completed: {rock.completedDate}
        </div>
      )}

      {/* Tags at the bottom */}
      {rock.tags && rock.tags.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginTop: '12px',
        }}>
          {rock.tags.map((tagName) => {
            const tag = allTags.find(t => t.name === tagName);
            return tag ? (
              <span
                key={tagName}
                style={{
                  backgroundColor: tag.color,
                  color: getContrastTextColor(tag.color),
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '4px 8px',
                  borderRadius: '2px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {tag.name}
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

function EditModal({ rock, customTags, onAddCustomTag, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: rock.title,
    description: rock.description,
    date: rock.date,
    tags: rock.tags || [],
  });
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#C97D60');

  const toggleTag = (tagName) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagName)
        ? prev.tags.filter(t => t !== tagName)
        : [...prev.tags, tagName]
    }));
  };

  const handleAddCustomTag = () => {
    if (newTagName.trim()) {
      onAddCustomTag(newTagName.trim(), newTagColor);
      toggleTag(newTagName.trim());
      setNewTagName('');
      setNewTagColor('#C97D60');
    }
  };

  const allTags = [...THEME_TAGS, ...customTags];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px',
      animation: 'fadeIn 0.2s ease-out',
    }}
    onClick={onClose}
    >
      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes slideUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>
      <div style={{
        backgroundColor: '#F0F0F0',
        padding: '32px',
        borderRadius: '0',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        maxHeight: '90vh',
        overflowY: 'auto',
        animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{
          fontSize: '28px',
          fontWeight: '900',
          margin: '0 0 24px 0',
          color: '#1A1A1A',
        }}>
          Edit Rock
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '700',
            marginBottom: '6px',
            color: '#1A1A1A',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #1A1A1A',
              borderRadius: '2px',
              fontFamily: '"Work Sans", sans-serif',
              backgroundColor: 'white',
              boxSizing: 'border-box',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onFocus={(e) => {
              e.target.style.boxShadow = '0 0 0 3px rgba(26,26,26,0.1)';
              e.target.style.borderColor = '#1A1A1A';
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '700',
            marginBottom: '6px',
            color: '#1A1A1A',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              border: '2px solid #1A1A1A',
              borderRadius: '2px',
              fontFamily: '"Work Sans", sans-serif',
              backgroundColor: 'white',
              resize: 'vertical',
              boxSizing: 'border-box',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onFocus={(e) => {
              e.target.style.boxShadow = '0 0 0 3px rgba(26,26,26,0.1)';
              e.target.style.borderColor = '#1A1A1A';
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '700',
            marginBottom: '6px',
            color: '#1A1A1A',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Date (Optional)
          </label>
          <input
            type="text"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            placeholder="Q2 2025"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              border: '2px solid #1A1A1A',
              borderRadius: '2px',
              fontFamily: '"Work Sans", sans-serif',
              backgroundColor: 'white',
              boxSizing: 'border-box',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onFocus={(e) => {
              e.target.style.boxShadow = '0 0 0 3px rgba(26,26,26,0.1)';
              e.target.style.borderColor = '#1A1A1A';
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '700',
            marginBottom: '12px',
            color: '#1A1A1A',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Tags (select multiple)
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            marginBottom: '12px',
          }}>
            {allTags.map(tag => {
              const isSelected = formData.tags.includes(tag.name);
              return (
                <button
                  key={tag.name}
                  onClick={() => toggleTag(tag.name)}
                  style={{
                    padding: '12px',
                    backgroundColor: tag.color,
                    border: isSelected ? '3px solid #1A1A1A' : '2px solid transparent',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: getContrastTextColor(tag.color),
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontFamily: '"Work Sans", sans-serif',
                  }}
                  title={tag.name}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>

          {/* Add custom tag */}
          <div style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: '#F5F5F5',
            borderRadius: '2px',
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              marginBottom: '8px',
              color: '#1A1A1A',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Create New Tag
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                style={{
                  flex: 1,
                  padding: '8px',
                  fontSize: '12px',
                  border: '2px solid #1A1A1A',
                  borderRadius: '2px',
                  fontFamily: '"Work Sans", sans-serif',
                  backgroundColor: 'white',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustomTag();
                }}
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                style={{
                  width: '48px',
                  height: '36px',
                  border: '2px solid #1A1A1A',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              />
              <button
                onClick={handleAddCustomTag}
                disabled={!newTagName.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: newTagName.trim() ? '#1A1A1A' : '#999',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: newTagName.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: '"Work Sans", sans-serif',
                  borderRadius: '2px',
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: '#1A1A1A',
              border: '2px solid #1A1A1A',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: '"Work Sans", sans-serif',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#1A1A1A';
              e.target.style.color = '#F0F0F0';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#1A1A1A';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            style={{
              padding: '12px 24px',
              backgroundColor: '#1A1A1A',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: '"Work Sans", sans-serif',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
