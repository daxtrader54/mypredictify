'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useHelpModeStore } from '@/stores/help-mode-store';
import { HELP_TOOLTIPS } from '@/config/help-tooltips';

interface OverlayPosition {
  top: number;
  left: number;
  width: number;
  height: number;
  key: string;
  title: string;
  description: string;
}

export function HelpModeOverlay() {
  const isActive = useHelpModeStore((s) => s.isActive);
  const [overlay, setOverlay] = useState<OverlayPosition | null>(null);
  const rafRef = useRef<number>(0);

  // Set body data attribute when help mode toggles
  useEffect(() => {
    if (isActive) {
      document.body.dataset.helpMode = 'true';
    } else {
      delete document.body.dataset.helpMode;
      setOverlay(null);
    }
    return () => {
      delete document.body.dataset.helpMode;
    };
  }, [isActive]);

  const showOverlay = useCallback((el: HTMLElement, key: string) => {
    const tooltip = HELP_TOOLTIPS[key];
    if (!tooltip) return;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      setOverlay({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        key,
        title: tooltip.title,
        description: tooltip.description,
      });
    });
  }, []);

  const hideOverlay = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setOverlay(null);
  }, []);

  // Event delegation for mouseover/mouseout on [data-tour] elements
  useEffect(() => {
    if (!isActive) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-tour]');
      if (target) {
        const key = target.getAttribute('data-tour');
        if (key) showOverlay(target, key);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-tour]');
      if (!target) return;
      const related = (e.relatedTarget as HTMLElement | null)?.closest<HTMLElement>('[data-tour]');
      // Only hide if we're leaving the data-tour element entirely
      if (related !== target) {
        hideOverlay();
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, showOverlay, hideOverlay]);

  if (!isActive || !overlay) return null;

  return createPortal(
    <div
      key={overlay.key}
      className="help-mode-overlay"
      style={{
        position: 'fixed',
        top: overlay.top,
        left: overlay.left,
        width: overlay.width,
        height: overlay.height,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {/* Dimmed backdrop with blur */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(2px)',
          borderRadius: 'inherit',
        }}
      />
      {/* Content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '16px 20px',
        }}
      >
        <p
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#22c55e',
            marginBottom: '6px',
          }}
        >
          {overlay.title}
        </p>
        <p
          style={{
            fontSize: '13px',
            lineHeight: 1.5,
            color: 'rgba(255, 255, 255, 0.85)',
            maxWidth: '360px',
          }}
        >
          {overlay.description}
        </p>
      </div>
    </div>,
    document.body
  );
}
