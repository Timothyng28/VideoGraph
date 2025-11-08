/**
 * App.tsx
 * 
 * Main application component for the infinite learning video experience.
 * Simplified architecture:
 * 1. Landing - User enters topic
 * 2. Video Flow - Continuous video segments with VideoController
 */

import { useEffect, useRef, useState } from "react";
import { VideoController } from "./controllers/VideoController";
import { InputOverlay } from "./components/InputOverlay";
import { LandingPage } from "./components/LandingPage";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ErrorDisplay } from "./components/ErrorDisplay";

/**
 * App state types
 */
type AppState = 'landing' | 'learning' | 'error';

/**
 * Main App Component
 */
export const App: React.FC = () => {
  // App state machine
  const [appState, setAppState] = useState<AppState>('landing');
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Reference to the video element for programmatic control
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Track when segment changes to restart playback
  const [segmentKey, setSegmentKey] = useState(0);
  
  // Track when video has ended
  const [videoEnded, setVideoEnded] = useState(false);

  /**
   * Handle topic submission from landing page
   */
  const handleTopicSubmit = async (topic: string) => {
    setCurrentTopic(topic);
    setAppState('learning');
    setError('');
  };
  
  /**
   * Handle errors from VideoController
   */
  const handleVideoError = (errorMsg: string) => {
    setError(errorMsg);
    setAppState('error');
  };
  
  /**
   * Handle retry after error
   */
  const handleRetry = () => {
    if (currentTopic) {
      setAppState('learning');
      setError('');
    } else {
      setAppState('landing');
    }
  };
  
  /**
   * Return to landing page
   * Note: Currently unused - "Start Over" now restarts from first segment
   */
  // const handleReset = () => {
  //   setAppState('landing');
  //   setCurrentTopic('');
  //   setError('');
  // };

  // Render based on app state
  if (appState === 'landing') {
    return <LandingPage onSubmit={handleTopicSubmit} />;
  }
  
  if (appState === 'error') {
    return <ErrorDisplay error={error} onRetry={handleRetry} />;
  }
  
  // Learning state - show video flow
  if (appState === 'learning' && currentTopic) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
        <VideoController
          initialTopic={currentTopic}
          onError={handleVideoError}
        >
          {({
            session,
            currentSegment,
            isGenerating,
            isEvaluating,
            error: videoError,
            handleAnswer,
            requestNextSegment,
            requestNewTopic,
            goToSegment,
            restartFromBeginning,
          }) => {
            // Debug info in console
            console.log('VideoController State:', {
              hasSegments: session.segments.length,
              currentSegment: currentSegment?.id,
              isGenerating,
              videoError,
              context: session.context,
            });
            
            // IMPORTANT: Call all hooks BEFORE any conditional returns
            // Effect to restart video when segment changes OR when session is restarted
            useEffect(() => {
              if (currentSegment && currentSegment.videoUrl && videoRef.current) {
                setSegmentKey((prev) => prev + 1);
                setVideoEnded(false); // Reset video ended state
                videoRef.current.load();
                videoRef.current.play().catch(console.error);
              }
            }, [currentSegment?.id, currentSegment?.videoUrl, session.sessionId]);
            
            // Handler for when video ends
            const handleVideoEnd = () => {
              console.log('🎬 VIDEO ENDED! Has question:', currentSegment?.hasQuestion);
              setVideoEnded(true);
              console.log('Set videoEnded to true');
              if (currentSegment && !currentSegment.hasQuestion && !isGenerating) {
                console.log('No question, auto-advancing to next segment');
                requestNextSegment();
              }
            };
            
            // NOW we can do conditional returns
            
            // Show loading spinner while generating first segment
            if (!currentSegment && isGenerating) {
              return (
                <div className="flex items-center justify-center w-full h-screen">
                  <LoadingSpinner />
                </div>
              );
            }
            
            // Show error if something went wrong
            if (videoError) {
              return (
                <div className="flex items-center justify-center w-full h-screen">
                  <ErrorDisplay error={videoError} onRetry={handleRetry} />
                </div>
              );
            }
            
            // No segment yet and not generating - show waiting state
            if (!currentSegment) {
              return (
                <div className="flex items-center justify-center w-full h-screen">
                  <div className="text-white text-center">
                    <div className="text-2xl mb-4">Preparing your learning experience...</div>
                    <LoadingSpinner />
                  </div>
                </div>
              );
            }

            return (
              <>
                {/* Topic and progress display */}
                <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm z-50 border border-slate-700">
                  <div>
                    <span className="text-slate-400">Learning: </span>
                    <span className="font-semibold text-blue-400">{currentSegment.topic}</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-slate-400">Segment: </span>
                    <span className="text-slate-300">{session.currentIndex + 1} of {session.segments.length}</span>
                    <span className="ml-2 text-slate-400">Depth: </span>
                    <span className="text-slate-300">{session.context.depth}</span>
                  </div>
                </div>
                
                {/* Start Over button - top center */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
                  <button
                    onClick={restartFromBeginning}
                    className="bg-slate-800/80 backdrop-blur-sm hover:bg-slate-700/80 text-white px-4 py-2 rounded-lg text-sm transition-colors border border-slate-700 hover:border-blue-500/50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Start Over
                  </button>
                </div>
                
                {/* Navigation through history */}
                {session.segments.length > 1 && (
                  <div className="absolute top-4 right-4 bg-slate-800/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm z-50 border border-slate-700 flex gap-2">
                    <button
                      onClick={() => goToSegment(Math.max(0, session.currentIndex - 1))}
                      disabled={session.currentIndex === 0}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => goToSegment(Math.min(session.segments.length - 1, session.currentIndex + 1))}
                      disabled={session.currentIndex === session.segments.length - 1}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                    >
                      →
                    </button>
                  </div>
                )}

                {/* Video Player Container */}
                <div className="relative shadow-2xl rounded-lg overflow-hidden bg-black" style={{ width: "90vw", maxWidth: "1280px" }}>
                  {currentSegment.videoUrl ? (
                    <video
                      key={segmentKey}
                      ref={videoRef}
                      src={currentSegment.videoUrl}
                      controls
                      autoPlay
                      onEnded={handleVideoEnd}
                      className="w-full h-auto"
                      style={{
                        maxHeight: "80vh",
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : currentSegment.renderingStatus === 'rendering' || currentSegment.renderingStatus === 'pending' ? (
                    <div className="flex items-center justify-center" style={{ width: "100%", height: "450px" }}>
                      <div className="text-center text-white">
                        <LoadingSpinner />
                        <div className="mt-4 text-lg">Rendering video...</div>
                        <div className="mt-2 text-sm text-slate-400">This may take a minute</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center" style={{ width: "100%", height: "450px" }}>
                      <div className="text-center text-white">
                        <div className="text-lg mb-2">Video not available</div>
                        <div className="text-sm text-slate-400">Rendering status: {currentSegment.renderingStatus || 'unknown'}</div>
                      </div>
                    </div>
                  )}

                  {/* Question Overlay - shown over video when it ends and has a question */}
                  {(() => {
                    console.log('InputOverlay props:', {
                      hasQuestion: currentSegment.hasQuestion,
                      videoEnded,
                      questionText: currentSegment.questionText,
                      questionOptions: currentSegment.questionOptions,
                    });
                    return null;
                  })()}
                  <InputOverlay
                    hasQuestion={currentSegment.hasQuestion}
                    videoEnded={videoEnded}
                    questionText={currentSegment.questionText}
                    questionOptions={currentSegment.questionOptions}
                    correctAnswer={currentSegment.correctAnswer}
                    isGenerating={isGenerating}
                    isEvaluating={isEvaluating}
                    isLastSegment={session.currentIndex === session.segments.length - 1}
                    onAnswer={async (answer) => {
                      console.log('Answer submitted:', answer);
                      const result = await handleAnswer(answer);
                      setVideoEnded(false); // Reset when answering to allow replay
                      return result;
                    }}
                    onRequestNext={requestNextSegment}
                    onNewTopic={requestNewTopic}
                    onRepeat={() => {
                      setVideoEnded(false);
                      goToSegment(0); // Go back to first segment
                    }}
                  />
                </div>
              </>
            );
          }}
        </VideoController>
      </div>
    );
  }
  
  // Fallback
  return <div>Loading...</div>;
};
