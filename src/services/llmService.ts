/**
 * llmService.ts
 * 
 * Service for integrating with Claude API to generate dynamic video segments
 * and evaluate user understanding.
 */

/// <reference types="vite/client" />

import {
  VideoSegment,
  LearningContext,
  GenerateSegmentResponse,
  EvaluateAnswerResponse,
  ColorConfig,
} from '../types/VideoConfig';

/**
 * Generate a dynamic video segment based on learning context
 */
export async function generateVideoSegment(
  context: LearningContext
): Promise<GenerateSegmentResponse> {
  console.log('generateVideoSegment called with context:', context);
  
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('API key not configured');
    return {
      success: false,
      error: 'API key not configured. Please add VITE_ANTHROPIC_API_KEY to your .env file.',
    };
  }
  
  try {
    const prompt = buildSegmentPrompt(context);
    console.log('Generated prompt length:', prompt.length);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API request failed:', response.status, errorData);
      return {
        success: false,
        error: `API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`,
      };
    }
    
    const data = await response.json();
    console.log('API response received, content length:', data.content?.[0]?.text?.length);
    
    const textContent = data.content?.[0]?.text;
    
    if (!textContent) {
      console.error('No text content in response:', data);
      return {
        success: false,
        error: 'No content received from API',
      };
    }
    
    // Parse the JSON response
    const cleanedJSON = cleanJSONResponse(textContent);
    let segmentData: any;
    
    try {
      segmentData = JSON.parse(cleanedJSON);
      console.log('Parsed segment data:', {
        hasComponentCode: !!segmentData.componentCode,
        duration: segmentData.duration,
        hasQuestion: segmentData.hasQuestion,
        topic: segmentData.topic,
      });
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Received text:', textContent);
      return {
        success: false,
        error: 'Failed to parse video segment JSON from API response',
      };
    }
    
    // Validate and construct VideoSegment
    if (!validateSegmentData(segmentData)) {
      console.error('Validation failed for segment data:', segmentData);
      return {
        success: false,
        error: 'Invalid video segment structure from API. Check console for details.',
      };
    }
    
    const segment: VideoSegment = {
      id: generateSegmentId(),
      componentCode: segmentData.componentCode,
      duration: segmentData.duration || 300, // Default 10 seconds at 30fps
      hasQuestion: segmentData.hasQuestion || false,
      questionText: segmentData.questionText,
      topic: segmentData.topic || context.previousTopic || context.initialTopic || 'Unknown',
      difficulty: segmentData.difficulty || 'medium',
      colors: segmentData.colors || getDefaultColors(),
      generatedAt: new Date().toISOString(),
      parentSegmentId: context.depth > 0 ? `segment_${context.depth - 1}` : undefined,
    };
    
    return {
      success: true,
      segment,
    };
  } catch (error) {
    console.error('LLM Service Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Evaluate a user's answer to determine correctness and next steps
 */
export async function evaluateAnswer(
  answer: string,
  question: string,
  topic: string
): Promise<EvaluateAnswerResponse> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      error: 'API key not configured',
    };
  }
  
  try {
    const prompt = buildEvaluationPrompt(answer, question, topic);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `API request failed: ${response.status}`,
      };
    }
    
    const data = await response.json();
    const textContent = data.content?.[0]?.text;
    
    if (!textContent) {
      return {
        success: false,
        error: 'No content received from API',
      };
    }
    
    const cleanedJSON = cleanJSONResponse(textContent);
    let evalData: any;
    
    try {
      evalData = JSON.parse(cleanedJSON);
    } catch (parseError) {
      console.error('Evaluation Parse Error:', parseError);
      return {
        success: false,
        error: 'Failed to parse evaluation response',
      };
    }
    
    return {
      success: true,
      correct: evalData.correct || false,
      reasoning: evalData.reasoning || '',
      suggestedNextTopic: evalData.suggestedNextTopic,
      suggestedDifficulty: evalData.suggestedDifficulty,
    };
  } catch (error) {
    console.error('Evaluation Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Build the prompt for generating a video segment
 */
function buildSegmentPrompt(context: LearningContext): string {
  const {
    initialTopic,
    previousTopic,
    wasCorrect,
    historyTopics,
    depth,
    correctnessPattern,
  } = context;
  
  const topicToTeach = previousTopic || initialTopic || 'a programming concept';
  const isFirst = depth === 0;
  
  // Determine difficulty adjustment based on correctness pattern
  let difficultyGuidance = '';
  if (correctnessPattern && correctnessPattern.length > 0) {
    const recentCorrect = correctnessPattern.slice(-3).filter(Boolean).length;
    if (recentCorrect >= 2) {
      difficultyGuidance = 'The user is doing well. Go deeper or more advanced.';
    } else if (recentCorrect === 0) {
      difficultyGuidance = 'The user is struggling. Simplify and use more examples.';
    }
  }
  
  return `You are generating an educational video segment for an infinite learning experience.

CONTEXT:
- Topic: ${topicToTeach}
- Is first segment: ${isFirst}
- Previous topics covered: ${historyTopics.join(', ') || 'none'}
- Last answer was correct: ${wasCorrect ?? 'N/A'}
- Depth in topic: ${depth}
${difficultyGuidance ? `- Guidance: ${difficultyGuidance}` : ''}

YOUR TASK:
Generate ONE video segment (10-20 seconds) that teaches about this topic in a flowing, video-essay style.

REQUIREMENTS:
1. Create dynamic, kinetic animations - NOT static text on cards
2. Use the available kinetic components for professional video-essay feel
3. Make it feel like a real educational video (think YouTube explainers)
4. **IMPORTANT: End with a question to test understanding** (only skip for the very first intro segment)
5. Flow naturally - be creative with visual presentation
6. Questions should be clear, specific, and test the concept just taught

AVAILABLE COMPONENTS (already imported in context):

Text & Animation:
- KineticText: React.createElement(KineticText, {text: 'string', flyFrom: 'left', easing: 'anticipation', byWord: true})
- AnimatedText: React.createElement(AnimatedText, {text: 'string', animationType: 'fade'})

Layout & Containers:
- AbsoluteFill: React.createElement(AbsoluteFill, {style: {...}}, children)
- Card: React.createElement(Card, {title: 'string', subtitle: 'string'}, children)
- TwoColumnLayout: React.createElement(TwoColumnLayout, {left: leftContent, right: rightContent})
- SplitScreen: React.createElement(SplitScreen, {left: leftContent, right: rightContent})

Reveals & Transitions:
- RevealBlock: React.createElement(RevealBlock, {type: 'wipe-right', delay: 60}, children)
- Transition: React.createElement(Transition, {from: content1, to: content2, startFrame: 100})

Orchestration (REQUIRES ARRAYS):
- Timeline: React.createElement(Timeline, {items: [{id: 'item1', startFrame: 0, duration: 30, animation: 'slide-up', content: element}]})
- FloatingElements: React.createElement(FloatingElements, {elements: [{id: '1', content: '⭐', x: 10, y: 20}]})

Code & Data:
- CodeBlock: React.createElement(CodeBlock, {code: 'const x = 5;', language: 'javascript'})
- Chart: React.createElement(Chart, {type: 'bar', data: [{label: 'A', value: 10}]})
- Diagram: React.createElement(Diagram, {nodes: [...], edges: [...]})
- ProgressBar: React.createElement(ProgressBar, {progress: 0.5})

REMOTION HOOKS AVAILABLE:
- useCurrentFrame(): Get current animation frame
- useVideoConfig(): Get fps, width, height
- interpolate(): Animate between values
- spring(): Physics-based animations
- AbsoluteFill: Full-screen container

CRITICAL SYNTAX RULES:
1. Use React.createElement() ONLY - NO JSX angle brackets < >
2. Syntax: React.createElement(Component, {props}, ...children)
3. For HTML elements use strings: React.createElement('div', {props}, children)
4. Multiple children must be separate arguments, NOT in an array
5. Always check your parentheses balance!

KEEP IT SIMPLE - START WITH THIS PATTERN:
\`\`\`javascript
const Scene = () => {
  const frame = useCurrentFrame();
  
  return React.createElement(
    AbsoluteFill,
    {
      style: {
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60
      }
    },
    React.createElement(
      'div',
      { style: { maxWidth: 1000, textAlign: 'center' } },
      React.createElement(KineticText, {
        text: 'Understanding React',
        flyFrom: 'left',
        easing: 'anticipation',
        byWord: true,
        style: { fontSize: 64, color: '#3b82f6', fontWeight: 'bold' }
      }),
      React.createElement(
        'p',
        { style: { fontSize: 28, color: '#cbd5e1', marginTop: 30 } },
        'This is how React components work!'
      )
    )
  );
};
\`\`\`

KEEP CODE SIMPLE:
- Use 2-3 components maximum per scene
- Prefer simple elements like 'div', 'p', KineticText
- Only use Timeline/FloatingElements if really needed
- Always provide required props (especially arrays for Timeline/FloatingElements)

FORMATTING TIPS:
- Format each createElement call on its own line for clarity
- Use proper indentation
- Always match opening ( with closing )
- Test mentally: count opening and closing parens

WRONG (causes syntax errors):
- React.createElement('div', {}, <p>text</p>)  ❌ NO JSX!
- React.createElement('div', {}, [child1, child2])  ❌ NO arrays for children!
- React.createElement('div' {})  ❌ Missing comma!

CORRECT:
- React.createElement('div', {}, React.createElement('p', {}, 'text'))  ✅
- React.createElement('div', {}, child1, child2)  ✅
- React.createElement('div', {style: {}})  ✅

RESPONSE FORMAT (JSON only, no markdown):
{
  "componentCode": "const Scene = () => { /* your kinetic React component */ };",
  "duration": 300,
  "hasQuestion": true,
  "questionText": "What is the main concept we just learned?",
  "topic": "${topicToTeach}",
  "difficulty": "medium",
  "colors": {
    "background": "#0f172a",
    "primary": "#3b82f6",
    "text": "#e2e8f0",
    "accent": "#fbbf24"
  }
}

NOTE: Set hasQuestion to true and provide a questionText for most segments. Only set hasQuestion to false for introductory segments where asking a question doesn't make sense yet.

Generate the video segment now:`;
}

/**
 * Build the prompt for evaluating an answer
 */
function buildEvaluationPrompt(
  answer: string,
  question: string,
  topic: string
): string {
  return `Evaluate this student answer:

QUESTION: ${question}
TOPIC: ${topic}
STUDENT ANSWER: ${answer}

Determine:
1. Is the answer correct/demonstrates understanding?
2. Brief reasoning for your evaluation
3. What topic should come next (deeper, easier, or related)?
4. Suggested difficulty for next segment

Response format (JSON only):
{
  "correct": true/false,
  "reasoning": "Brief explanation",
  "suggestedNextTopic": "topic name",
  "suggestedDifficulty": "easy/medium/hard"
}`;
}

/**
 * Validate segment data structure
 */
function validateSegmentData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (!data.componentCode || typeof data.componentCode !== 'string') return false;
  if (data.hasQuestion && !data.questionText) return false;
  
  // Check for common syntax issues in component code
  const code = data.componentCode;
  
  // Check for JSX syntax (angle brackets)
  if (/<[A-Z]/.test(code) || /<\/[A-Z]/.test(code)) {
    console.error('Component code contains JSX syntax - should use React.createElement');
    return false;
  }
  
  // Basic parentheses balance check
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    console.error(`Unbalanced parentheses: ${openParens} opening, ${closeParens} closing`);
    return false;
  }
  
  // Check for basic syntax validity
  try {
    // Try to parse it as JavaScript (won't execute, just parse)
    // Don't add 'return' - the code defines a const, not an expression
    new Function(code);
  } catch (e) {
    console.error('Component code has syntax error:', e);
    return false;
  }
  
  return true;
}

/**
 * Clean JSON from LLM response
 */
function cleanJSONResponse(response: string): string {
  let cleaned = response.trim();
  
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  
  return cleaned.trim();
}

/**
 * Generate unique segment ID
 */
function generateSegmentId(): string {
  return `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get default color configuration
 */
function getDefaultColors(): ColorConfig {
  return {
    background: '#0f172a',
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    text: '#e2e8f0',
    accent: '#fbbf24',
  };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use generateVideoSegment instead
 */
export async function generateVideoConfig(topic: string): Promise<any> {
  console.warn('generateVideoConfig is deprecated. Use generateVideoSegment instead.');
  
  const context: LearningContext = {
    initialTopic: topic,
    historyTopics: [],
    depth: 0,
  };
  
  const response = await generateVideoSegment(context);
  
  if (response.success && response.segment) {
    // Convert to old format for compatibility
    return {
      success: true,
      data: {
        topic,
        scenes: [
          {
            type: 'dynamic',
            duration: response.segment.duration,
            componentCode: response.segment.componentCode,
            colors: response.segment.colors,
          },
        ],
        fps: 30,
        width: 1280,
        height: 720,
      },
    };
  }
  
  return {
    success: false,
    error: response.error,
  };
}

/**
 * Save configuration to localStorage
 */
export function saveConfigToLocalStorage(config: any): void {
  try {
    localStorage.setItem('lastGeneratedConfig', JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save config to localStorage:', error);
  }
}

/**
 * Load configuration from localStorage
 */
export function loadConfigFromLocalStorage(): any | null {
  try {
    const configStr = localStorage.getItem('lastGeneratedConfig');
    if (configStr) {
      return JSON.parse(configStr);
    }
  } catch (error) {
    console.error('Failed to load config from localStorage:', error);
  }
  return null;
}
