/**
 * VideoController.tsx
 * 
 * Manages the infinite learning flow:
 * - Tracks video segment history
 * - Generates new segments based on user progress
 * - Evaluates user answers
 * - Maintains learning context
 */

import { useState, useCallback, useEffect } from 'react';
import {
  VideoSession,
  VideoSegment,
  LearningContext,
  createVideoSession,
  updateContext,
} from '../types/VideoConfig';
import {
  generateVideoSegment,
  evaluateAnswer,
} from '../services/llmService';

/**
 * Props for VideoController render function
 */
export interface VideoControllerState {
  // Current session state
  session: VideoSession;
  
  // Currently playing segment
  currentSegment: VideoSegment | null;
  
  // Loading states
  isGenerating: boolean;
  isEvaluating: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  handleAnswer: (answer: string) => Promise<void>;
  requestNextSegment: () => Promise<void>;
  requestNewTopic: (topic: string) => Promise<void>;
  goToSegment: (index: number) => void;
}

interface VideoControllerProps {
  initialTopic: string;
  onError?: (error: string) => void;
  children: (state: VideoControllerState) => React.ReactNode;
}

/**
 * VideoController Component
 * 
 * Uses render props pattern to provide video state and controls to children
 */
export const VideoController: React.FC<VideoControllerProps> = ({
  initialTopic,
  onError,
  children,
}) => {
  // Session state
  const [session, setSession] = useState<VideoSession>(() =>
    createVideoSession(initialTopic)
  );
  
  // Loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Get current segment
  const currentSegment = session.segments[session.currentIndex] || null;
  
  /**
   * Generate the first segment when component mounts
   */
  useEffect(() => {
    if (session.segments.length === 0 && !isGenerating) {
      console.log('Generating initial segment for topic:', session.context.initialTopic);
      generateInitialSegment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  /**
   * Generate the initial video segment
   */
  const generateInitialSegment = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await generateVideoSegment(session.context);
      
      if (response.success && response.segment) {
        setSession((prev) => ({
          ...prev,
          segments: [response.segment!],
          currentIndex: 0,
          lastUpdatedAt: new Date().toISOString(),
        }));
      } else {
        const errorMsg = response.error || 'Failed to generate video segment';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };
  
  /**
   * Handle user's answer to a question
   */
  const handleAnswer = useCallback(
    async (answer: string) => {
      if (!currentSegment || !currentSegment.hasQuestion) {
        console.warn('No question to answer in current segment');
        return;
      }
      
      setIsEvaluating(true);
      setError(null);
      
      try {
        // Evaluate the answer
        const evalResponse = await evaluateAnswer(
          answer,
          currentSegment.questionText || '',
          currentSegment.topic
        );
        
        if (!evalResponse.success) {
          const errorMsg = evalResponse.error || 'Failed to evaluate answer';
          setError(errorMsg);
          onError?.(errorMsg);
          setIsEvaluating(false);
          return;
        }
        
        const { correct, suggestedNextTopic, suggestedDifficulty } = evalResponse;
        
        // Update correctness pattern
        const newPattern = [
          ...(session.context.correctnessPattern || []),
          correct || false,
        ].slice(-5); // Keep last 5 answers
        
        // Update context
        const updatedContext = updateContext(session.context, {
          previousTopic: currentSegment.topic,
          userAnswer: answer,
          wasCorrect: correct,
          historyTopics: [...session.context.historyTopics, currentSegment.topic],
          depth: session.context.depth + 1,
          correctnessPattern: newPattern,
        });
        
        setSession((prev) => ({
          ...prev,
          context: updatedContext,
          lastUpdatedAt: new Date().toISOString(),
        }));
        
        setIsEvaluating(false);
        
        // Generate next segment with the updated context
        setIsGenerating(true);
        
        const nextSegmentContext: LearningContext = {
          ...updatedContext,
          // Use suggested topic from evaluation if available
          previousTopic: suggestedNextTopic || currentSegment.topic,
        };
        
        const response = await generateVideoSegment(nextSegmentContext);
        
        if (response.success && response.segment) {
          // Adjust difficulty if suggested
          if (suggestedDifficulty) {
            response.segment.difficulty = suggestedDifficulty;
          }
          
          setSession((prev) => ({
            ...prev,
            segments: [...prev.segments, response.segment!],
            currentIndex: prev.segments.length, // Move to new segment
            lastUpdatedAt: new Date().toISOString(),
          }));
        } else {
          const errorMsg = response.error || 'Failed to generate next segment';
          setError(errorMsg);
          onError?.(errorMsg);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setIsGenerating(false);
      }
    },
    [currentSegment, session, onError]
  );
  
  /**
   * Request next segment without answering a question
   * (for segments that don't have questions)
   */
  const requestNextSegment = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Update context
      const updatedContext = updateContext(session.context, {
        previousTopic: currentSegment?.topic,
        historyTopics: currentSegment
          ? [...session.context.historyTopics, currentSegment.topic]
          : session.context.historyTopics,
        depth: session.context.depth + 1,
      });
      
      const response = await generateVideoSegment(updatedContext);
      
      if (response.success && response.segment) {
        setSession((prev) => ({
          ...prev,
          segments: [...prev.segments, response.segment!],
          currentIndex: prev.segments.length,
          context: updatedContext,
          lastUpdatedAt: new Date().toISOString(),
        }));
      } else {
        const errorMsg = response.error || 'Failed to generate next segment';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  }, [session, currentSegment, onError]);
  
  /**
   * Request a completely new topic (pivot)
   */
  const requestNewTopic = useCallback(
    async (newTopic: string) => {
      setIsGenerating(true);
      setError(null);
      
      try {
        // Create fresh context for new topic
        const newContext = updateContext(session.context, {
          previousTopic: newTopic,
          depth: 0, // Reset depth for new topic
          historyTopics: [...session.context.historyTopics, newTopic],
        });
        
        const response = await generateVideoSegment(newContext);
        
        if (response.success && response.segment) {
          setSession((prev) => ({
            ...prev,
            segments: [...prev.segments, response.segment!],
            currentIndex: prev.segments.length,
            context: newContext,
            lastUpdatedAt: new Date().toISOString(),
          }));
        } else {
          const errorMsg = response.error || 'Failed to generate segment for new topic';
          setError(errorMsg);
          onError?.(errorMsg);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setIsGenerating(false);
      }
    },
    [session, onError]
  );
  
  /**
   * Navigate to a specific segment in history
   */
  const goToSegment = useCallback((index: number) => {
    if (index >= 0 && index < session.segments.length) {
      setSession((prev) => ({
        ...prev,
        currentIndex: index,
        lastUpdatedAt: new Date().toISOString(),
      }));
    }
  }, [session.segments.length]);
  
  // Build state object for children
  const state: VideoControllerState = {
    session,
    currentSegment,
    isGenerating,
    isEvaluating,
    error,
    handleAnswer,
    requestNextSegment,
    requestNewTopic,
    goToSegment,
  };
  
  return <>{children(state)}</>;
};

