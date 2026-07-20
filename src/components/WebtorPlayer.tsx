import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Play } from 'lucide-react';

interface WebtorPlayerProps {
  magnetUrl: string;
  className?: string;
}

export const WebtorPlayer: React.FC<WebtorPlayerProps> = ({ magnetUrl, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Load Webtor SDK Script
    const scriptId = 'webtor-sdk-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const handleLoad = () => {
      setSdkLoaded(true);
    };

    const handleError = () => {
      setInitError('Failed to load WebTor embedded player SDK.');
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdn.jsdelivr.net/npm/@webtor/embed-sdk-js/dist/index.min.js';
      script.charset = 'utf-8';
      script.async = true;
      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
      document.body.appendChild(script);
    } else {
      if ((window as any).webtor) {
        setSdkLoaded(true);
      } else {
        script.addEventListener('load', handleLoad);
        script.addEventListener('error', handleError);
      }
    }

    return () => {
      if (script) {
        script.removeEventListener('load', handleLoad);
        script.removeEventListener('error', handleError);
      }
    };
  }, []);

  useEffect(() => {
    if (!sdkLoaded) return;

    // Generate a unique ID to avoid collision if there are multiple instances
    const playerId = 'webtor-player-' + Math.random().toString(36).substring(2, 9);
    
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const targetDiv = document.createElement('div');
      targetDiv.id = playerId;
      targetDiv.className = 'w-full h-full rounded-lg overflow-hidden bg-black';
      containerRef.current.appendChild(targetDiv);

      try {
        const webtor = (window as any).webtor || [];
        webtor.push({
          id: playerId,
          magnet: magnetUrl,
          width: '100%',
          height: '100%',
          theme: 'dark',
          lang: 'en',
          on: function (e: any) {
            if (e.name === 'torrent-error') {
              console.warn('Webtor player error:', e);
            }
          },
        });
        (window as any).webtor = webtor;
      } catch (err) {
        console.error('Error initializing Webtor:', err);
        setInitError('Error building embedded torrent player.');
      }
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [sdkLoaded, magnetUrl]);

  return (
    <div className={`relative bg-black w-full h-full flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] ${className}`}>
      {/* Loading State Overlay */}
      {!sdkLoaded && !initError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 z-10 gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider animate-pulse">
            Loading Webtor Core Engine...
          </p>
        </div>
      )}

      {/* Error state */}
      {initError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 z-10 gap-2 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-2">
            <Play className="w-5 h-5 rotate-90" />
          </div>
          <p className="text-sm font-bold text-white">{initError}</p>
          <p className="text-xs text-zinc-500 max-w-sm">
            Please retry, or use the "WebPlayer" link to open Webtor in a separate browser tab instead.
          </p>
        </div>
      )}

      {/* Target Container for Webtor SDK */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
