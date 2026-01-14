import React, { useState, useRef, useEffect } from 'react';
import {
  StreamVideo,
  StreamCall,
  StreamTheme,
  PaginatedGridLayout,
  SpeakerLayout,
  CallControls,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css'; 
import { X, GripHorizontal, Maximize2, Minimize2 } from 'lucide-react';
import styles from './DraggableVideoOverlay.module.css';

const DraggableContainer = ({ children, onClose }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Ref for the header (drag handle)
  const headerRef = useRef(null);
  // New: Ref for the entire container to get dimensions for boundary checks
  const containerRef = useRef(null);

  // Toggle Full Screen
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    setIsDragging(false);
    // Optional: Reset position if exiting fullscreen, or keep last known
    if (isFullScreen) {
        setPosition({ x: 20, y: 80 }); 
    }
  };

  // Drag Handlers
  const handleMouseDown = (e) => {
    if (isFullScreen) return;
    // Ensure we are clicking the header
    if (headerRef.current && headerRef.current.contains(e.target) && !e.target.closest('button')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && !isFullScreen && containerRef.current) {
        // 1. Calculate intended position
        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;

        // 2. Get dimensions
        const { offsetWidth, offsetHeight } = containerRef.current;
        const { innerWidth, innerHeight } = window;

        // 3. Clamp X (Horizontal)
        // Prevent going off left edge (0)
        // Prevent going off right edge (Window Width - Element Width)
        const maxX = innerWidth - offsetWidth;
        newX = Math.max(0, Math.min(newX, maxX));

        // 4. Clamp Y (Vertical)
        // Prevent going off top edge (0)
        // Prevent going off bottom edge (Window Height - Element Height)
        const maxY = innerHeight - offsetHeight;
        newY = Math.max(0, Math.min(newY, maxY));

        setPosition({
          x: newX,
          y: newY,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, isFullScreen]);

  // Optional: Handle Window Resize to push element back on screen if it gets cut off
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || isFullScreen) return;
      
      const { offsetWidth, offsetHeight } = containerRef.current;
      const { innerWidth, innerHeight } = window;

      setPosition((prev) => {
        const maxX = innerWidth - offsetWidth;
        const maxY = innerHeight - offsetHeight;
        return {
          x: Math.max(0, Math.min(prev.x, maxX)),
          y: Math.max(0, Math.min(prev.y, maxY)),
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullScreen]);

  return (
    <div 
      ref={containerRef} // Attach the container ref here
      className={`${styles.container} ${isFullScreen ? styles.fullScreen : styles.mini}`}
      style={!isFullScreen ? { left: position.x, top: position.y } : {}}
    >
      {/* Header */}
      <div
        ref={headerRef} // Changed from nodeRef to headerRef for clarity
        className={styles.header}
        onMouseDown={handleMouseDown}
        style={{ cursor: isFullScreen ? 'default' : 'grab' }}
      >
        <div className={styles.headerTitleGroup}>
          {!isFullScreen && <GripHorizontal size={16} className={styles.dragHandle} />}
          <span className={styles.title}>
            {isFullScreen ? 'Video Call (Full Screen)' : 'Video Call'}
          </span>
        </div>
        
        <div className={styles.headerControls}>
          <button
            onClick={toggleFullScreen}
            title={isFullScreen ? "Thu nhỏ" : "Phóng to"}
            className={styles.iconButton}
          >
            {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          <button
            onClick={onClose}
            title="Rời cuộc gọi"
            className={styles.closeButton}
          >
            <X size={18} />
          </button>
        </div>
      </div>
      
      {/* Video Content */}
      <div className={styles.videoContent}>
        {children}
      </div>
    </div>
  );
};

export const DraggableVideoOverlay = ({ client, call, onLeave }) => {
  if (!client || !call) return null;

  return (
    <StreamVideo client={client}>
      <StreamTheme>
        <DraggableContainer onClose={onLeave}>
          <StreamCall call={call}>
            <div className={styles.streamCallWrapper}>
              
              {/* Video Grid Area */}
              <div className={styles.gridContainer}>
                <SpeakerLayout 
                  groupSize={12} 
                  videoPlaceholder={false}
                /> 
              </div>
              
              {/* Controls Area */}
              <div className={styles.controlsContainer}>
                 <CallControls onLeave={onLeave} />
              </div>

            </div>
          </StreamCall>
        </DraggableContainer>
      </StreamTheme>
    </StreamVideo>
  );
};