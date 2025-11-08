/**
 * App.tsx
 * 
 * Main application component for the infinite learning video experience.
 * Simplified architecture:
 * 1. Landing - User enters topic
 * 2. Video Flow - Continuous video segments with VideoController
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { VideoController } from "./controllers/VideoController";
import { LandingPage } from "./components/LandingPage";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ErrorDisplay } from "./components/ErrorDisplay";
import { ClosingQuestionOverlay } from "./components/ClosingQuestionOverlay";
import { generateClosingQuestion } from "./services/llmService";
import { ClosingQuestionPayload, VideoSession } from "./types/VideoConfig";

/**
 * App state types
 */
type AppState = 'landing' | 'learning' | 'error' | 'closing';

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
  const closingPayloadRef = useRef<ClosingQuestionPayload | null>(null);
  
  // Track when segment changes to restart playback
  const [segmentKey, setSegmentKey] = useState(0);
  
  // Closing question state
  const [closingQuestion, setClosingQuestion] = useState<string | null>(null);
  const [closingQuestionStatus, setClosingQuestionStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [closingQuestionError, setClosingQuestionError] = useState<string>('');
  const [closingQuestionAnswer, setClosingQuestionAnswer] = useState<string>('');

  const resetClosingQuestionState = useCallback(() => {
    setClosingQuestion(null);
    setClosingQuestionStatus('idle');
    setClosingQuestionError('');
    setClosingQuestionAnswer('');
    closingPayloadRef.current = null;
  }, []);
  
  // ===== TEST MODE - EASILY REMOVABLE =====
  const [isTestMode, setIsTestMode] = useState(false);
  // ===== END TEST MODE =====

  /**
   * Handle topic submission from landing page
   */
  const handleTopicSubmit = async (topic: string) => {
    resetClosingQuestionState();
    setCurrentTopic(topic);
    setIsTestMode(false); // Normal mode
    setAppState('learning');
    setError('');
  };
  
  // ===== TEST MODE - EASILY REMOVABLE =====
  /**
   * Handle test mode activation with hardcoded data
   */
  const handleTestMode = () => {
    resetClosingQuestionState();
    setCurrentTopic('Test Topic: Understanding Machine Learning');
    setIsTestMode(true);
    setAppState('learning');
    setError('');
  };
  // ===== END TEST MODE =====
  
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
    resetClosingQuestionState();
    if (currentTopic) {
      setAppState('learning');
      setError('');
    } else {
      setAppState('landing');
    }
  };
  
  /**
   * Return to landing page
   */
  const handleReset = () => {
    resetClosingQuestionState();
    setAppState('landing');
    setCurrentTopic('');
    setError('');
    setIsTestMode(false); // Reset test mode
  };

  const executeClosingQuestionRequest = useCallback(async (payload: ClosingQuestionPayload) => {
    setClosingQuestionStatus('loading');
    setClosingQuestion(null);
    setClosingQuestionError('');

    try {
      console.log('Requesting closing question with payload:', payload);
      const response = await generateClosingQuestion(payload);
      console.log('Closing question response:', response);
      if (response.success && response.question) {
        setClosingQuestion(response.question);
        setClosingQuestionStatus('ready');
      } else {
        setClosingQuestionStatus('error');
        setClosingQuestionError(response.error || 'Unable to generate closing question');
      }
    } catch (err) {
      console.error('Closing question error:', err);
      setClosingQuestionStatus('error');
      setClosingQuestionError(
        err instanceof Error ? err.message : 'Unknown error occurred while generating the closing question'
      );
    }
  }, []);

  const requestClosingQuestion = useCallback((sessionSnapshot: VideoSession) => {
    const topic =
      sessionSnapshot.context.initialTopic ||
      currentTopic ||
      'your lesson';

    const voiceoverSections = sessionSnapshot.segments
      .map((segment, index) => {
        const script = segment.voiceoverScript?.trim();
        if (!script) {
          return null;
        }
        return {
          section: index + 1,
          script,
        };
      })
      .filter((item): item is ClosingQuestionPayload['voiceoverSections'][number] => item !== null);

    const userResponses = sessionSnapshot.segments
      .map((segment, index) => {
        if (!segment.userAnswer) {
          return null;
        }

        const prompt =
          (segment.questionText && segment.questionText.trim()) ||
          `What resonated with you in segment ${index + 1}?`;

        return {
          prompt,
          answer: segment.userAnswer,
        };
      })
      .filter((item): item is ClosingQuestionPayload['userResponses'][number] => item !== null);

    const summary =
      sessionSnapshot.context.historyTopics && sessionSnapshot.context.historyTopics.length > 0
        ? sessionSnapshot.context.historyTopics.join(' → ')
        : undefined;

    const payload: ClosingQuestionPayload = {
      topic,
      voiceoverSections,
      userResponses,
      summary,
    };

    closingPayloadRef.current = payload;
    setAppState('closing');
    void executeClosingQuestionRequest(payload);
  }, [currentTopic, executeClosingQuestionRequest]);

  const handleRetryClosingQuestion = useCallback(() => {
    if (closingPayloadRef.current) {
      void executeClosingQuestionRequest(closingPayloadRef.current);
    }
  }, [executeClosingQuestionRequest]);

  // Render based on app state
  if (appState === 'landing') {
    return (
      <LandingPage 
        onSubmit={handleTopicSubmit}
        onTestMode={handleTestMode} // Pass test mode handler
      />
    );
  }
  
  if (appState === 'error') {
    return <ErrorDisplay error={error} onRetry={handleRetry} />;
  }

  // Closing question state - show lightweight overlay
  if (appState === 'closing') {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center bg-slate-950">
        <ClosingQuestionOverlay
          isOpen
          topic={currentTopic || closingPayloadRef.current?.topic || 'Your lesson'}
          question={closingQuestion || undefined}
          answer={closingQuestionAnswer}
          onAnswerChange={(newAnswer) => {
            setClosingQuestionAnswer(newAnswer);
            console.log('Closing question answer:', newAnswer);
          }}
          isLoading={closingQuestionStatus === 'loading'}
          error={closingQuestionStatus === 'error' ? closingQuestionError : undefined}
          onRestart={handleReset}
          onRetry={closingQuestionStatus === 'error' ? handleRetryClosingQuestion : undefined}
        />
      </div>
    );
  }
  
  // Learning state - show video flow
  if (appState === 'learning' && currentTopic) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
        <VideoController
          initialTopic={currentTopic}
          onError={handleVideoError}
          isTestMode={isTestMode} // Pass test mode flag
        >
          {({
            session,
            currentSegment,
            isGenerating,
            error: videoError,
            requestNextSegment,
            goToSegment,
          }) => {
            const isLastSegment =
              session.currentIndex === session.segments.length - 1;

            // Debug info in console
            console.log('VideoController State:', {
              hasSegments: session.segments.length,
              currentSegment: currentSegment?.id,
              isGenerating,
              videoError,
              context: session.context,
              isLastSegment,
            });

            const handleVideoEnd = useCallback(() => {
              if (!currentSegment || isGenerating) {
                return;
              }

              if (isLastSegment) {
                requestClosingQuestion(session);
              } else {
                requestNextSegment();
              }
            }, [currentSegment, isGenerating, isLastSegment, requestClosingQuestion, requestNextSegment, session]);
            
            // IMPORTANT: Call all hooks BEFORE any conditional returns
            // Effect to restart video when segment changes
            useEffect(() => {
              if (currentSegment && currentSegment.videoUrl && videoRef.current) {
                setSegmentKey((prev) => prev + 1);
                videoRef.current.load();
                videoRef.current.play().catch(console.error);
              }
            }, [currentSegment?.id, currentSegment?.videoUrl]);
            
            // Check if video has ended and should auto-advance or trigger reflection
            useEffect(() => {
              if (!videoRef.current) return;
              
              videoRef.current.addEventListener('ended', handleVideoEnd);
              return () => {
                videoRef.current?.removeEventListener('ended', handleVideoEnd);
              };
            }, [currentSegment, handleVideoEnd]);
            
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
