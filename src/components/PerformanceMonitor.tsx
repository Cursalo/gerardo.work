import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';

interface PerformanceStats {
  fps: number;
  frameTime: number;
  renderCalls: number;
  triangles: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  showStats?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  enabled = process.env.NODE_ENV === 'development', 
  showStats = false 
}) => {
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    frameTime: 0,
    renderCalls: 0,
    triangles: 0
  });
  
  const lastTime = useRef(performance.now());
  const frameCount = useRef(0);
  const updateInterval = useRef(0);

  useFrame((state) => {
    if (!enabled) return;

    const now = performance.now();
    const delta = now - lastTime.current;
    
    frameCount.current++;
    updateInterval.current += delta;
    
    // Update stats every second
    if (updateInterval.current >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / updateInterval.current);
      const frameTime = Math.round(updateInterval.current / frameCount.current * 100) / 100;
      
      setStats({
        fps,
        frameTime,
        renderCalls: state.gl.info.render.calls,
        triangles: state.gl.info.render.triangles
      });
      
      // Performance warnings in development
      if (process.env.NODE_ENV === 'development') {
        if (fps < 30) {
          console.warn(`🐌 Low FPS detected: ${fps}fps`);
        }
        if (state.gl.info.render.calls > 100) {
          console.warn(`📊 High render calls: ${state.gl.info.render.calls}`);
        }
        if (state.gl.info.render.triangles > 100000) {
          console.warn(`📐 High triangle count: ${state.gl.info.render.triangles}`);
        }
      }
      
      frameCount.current = 0;
      updateInterval.current = 0;
    }
    
    lastTime.current = now;
  });

  if (!enabled || !showStats) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      left: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 1000,
      minWidth: '150px'
    }}>
      <div>FPS: {stats.fps}</div>
      <div>Frame Time: {stats.frameTime}ms</div>
      <div>Render Calls: {stats.renderCalls}</div>
      <div>Triangles: {stats.triangles.toLocaleString()}</div>
      <div style={{ 
        color: stats.fps < 30 ? 'red' : stats.fps < 45 ? 'yellow' : 'green',
        fontWeight: 'bold',
        marginTop: '5px'
      }}>
        {stats.fps < 30 ? '🐌 Poor' : stats.fps < 45 ? '⚠️ Fair' : '✅ Good'}
      </div>
    </div>
  );
};

export default PerformanceMonitor; 