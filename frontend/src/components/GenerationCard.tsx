/**
 * GenerationCard.tsx
 * 
 * Displays individual generation progress for parallel requests.
 * Shows status, prompt, and allows navigation to completed branches.
 */

import { GenerationRequest } from '../controllers/VideoController';

interface GenerationCardProps {
  request: GenerationRequest;
  onNavigate?: (nodeId: string) => void;
  onDismiss?: (requestId: string) => void;
}

/**
 * Individual generation card component
 */
export const GenerationCard: React.FC<GenerationCardProps> = ({
  request,
  onNavigate,
  onDismiss,
}) => {
  const getTypeIcon = () => {
    if (request.type === 'question') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    );
  };

  const getStatusColor = () => {
    switch (request.status) {
      case 'pending':
        return 'bg-slate-600 border-slate-500';
      case 'generating':
        return 'bg-blue-600/20 border-blue-500';
      case 'complete':
        return 'bg-green-600/20 border-green-500';
      case 'error':
        return 'bg-red-600/20 border-red-500';
      default:
        return 'bg-slate-600 border-slate-500';
    }
  };

  const getStatusIcon = () => {
    switch (request.status) {
      case 'pending':
        return (
          <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
        );
      case 'generating':
        return (
          <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
        );
      case 'complete':
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (request.status) {
      case 'pending':
        return 'Queued';
      case 'generating':
        return 'Generating...';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  };

  const handleClick = () => {
    if (request.status === 'complete' && request.resultNodeId && onNavigate) {
      onNavigate(request.resultNodeId);
    }
  };

  const truncatePrompt = (prompt: string, maxLength: number = 50) => {
    if (prompt.length <= maxLength) return prompt;
    return prompt.substring(0, maxLength) + '...';
  };

  const isClickable = request.status === 'complete' && request.resultNodeId;

  return (
    <div
      className={`relative border rounded-lg p-3 transition-all ${getStatusColor()} ${
        isClickable ? 'cursor-pointer hover:bg-opacity-30' : ''
      }`}
      onClick={handleClick}
      title={isClickable ? 'Click to navigate to this branch' : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div className="flex-shrink-0 text-slate-300 mt-0.5">
          {getTypeIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-300">
              {request.type === 'question' ? 'Question' : 'New Topic'}
            </span>
            <div className="flex items-center gap-1.5">
              {getStatusIcon()}
              <span className="text-xs text-slate-400">{getStatusText()}</span>
            </div>
          </div>
          
          <p className="text-sm text-white break-words">
            {truncatePrompt(request.prompt)}
          </p>
          
          {request.error && (
            <p className="text-xs text-red-400 mt-1">
              {request.error}
            </p>
          )}
        </div>

        {/* Dismiss button for completed/error requests */}
        {(request.status === 'complete' || request.status === 'error') && onDismiss && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(request.id);
            }}
            className="flex-shrink-0 text-slate-400 hover:text-slate-200 transition-colors"
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

