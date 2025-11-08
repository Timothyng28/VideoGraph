/**
 * SegmentationOverlay Component
 * 
 * Displays segmentation masks as overlays on video
 * Shows polygon outlines and optional labels for detected objects
 */

import { useEffect, useRef } from 'react';
import { SegmentationMask } from '../services/segmentationService';

interface SegmentationOverlayProps {
  masks: SegmentationMask[];
  videoWidth: number;
  videoHeight: number;
  displayWidth: number;
  displayHeight: number;
}

export const SegmentationOverlay: React.FC<SegmentationOverlayProps> = ({
  masks,
  videoWidth,
  videoHeight,
  displayWidth,
  displayHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Draw masks on canvas when they change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('❌ Canvas ref not found');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('❌ Canvas context not found');
      return;
    }
    
    console.log('🎨 Drawing segmentation overlay:');
    console.log('  Canvas size:', canvas.width, 'x', canvas.height);
    console.log('  Display size:', displayWidth, 'x', displayHeight);
    console.log('  Video size:', videoWidth, 'x', videoHeight);
    console.log('  Number of masks:', masks.length);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate scale factors (video coordinates -> display coordinates)
    const scaleX = displayWidth / videoWidth;
    const scaleY = displayHeight / videoHeight;
    
    console.log('  Scale factors:', scaleX, 'x', scaleY);
    
    // Draw each mask
    masks.forEach((mask, index) => {
      console.log(`  Mask ${index + 1}:`, mask.polygon.length, 'points');
      
      if (mask.polygon.length === 0) {
        console.log(`  ⚠️ Mask ${index + 1} has no polygon points`);
        return;
      }
      
      // Draw polygon outline
      ctx.beginPath();
      
      // Move to first point
      const [firstX, firstY] = mask.polygon[0];
      ctx.moveTo(firstX * scaleX, firstY * scaleY);
      
      // Draw lines to other points
      for (let i = 1; i < mask.polygon.length; i++) {
        const [x, y] = mask.polygon[i];
        ctx.lineTo(x * scaleX, y * scaleY);
      }
      
      // Close path
      ctx.closePath();
      
      // Style based on confidence score
      const hue = 180 + (mask.score * 60); // 180 (cyan) to 240 (blue)
      const alpha = 0.4; // fixed transparency
      
      // Fill with semi-transparent color
      ctx.fillStyle = `hsla(${hue}, 80%, 50%, ${alpha})`;
      ctx.fill();
      
      // Stroke outline
      ctx.strokeStyle = `hsla(${hue}, 90%, 60%, 0.9)`;
      ctx.lineWidth = 3;
      ctx.stroke();
      
      console.log(`  ✓ Drew mask ${index + 1} with color hue=${hue}, alpha=${alpha}`);
    });
  }, [masks, videoWidth, videoHeight, displayWidth, displayHeight]);
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        width={displayWidth}
        height={displayHeight}
        className="absolute inset-0"
        style={{
          width: '100%',
          height: '100%',
        }}
      />
      
      {/* Minimal info display */}
      <div className="absolute bottom-2 left-2 bg-black/60 text-white px-3 py-2 rounded-lg text-xs backdrop-blur-sm">
        <div>Segmentation active</div>
        <div className="text-slate-400 mt-1 text-[10px]">Click background to clear</div>
      </div>
    </div>
  );
};

/**
 * Loading indicator for segmentation in progress
 */
export const SegmentationLoading: React.FC = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="bg-black/75 text-white px-4 py-3 rounded-lg backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-sm">Analyzing object...</span>
        </div>
      </div>
    </div>
  );
};

