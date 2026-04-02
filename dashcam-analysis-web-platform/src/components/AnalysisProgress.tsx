/**
 * Analysis Progress Component
 * Displays real-time progress during video analysis
 */

import { X, AlertCircle, CheckCircle2, Play } from 'lucide-react';

interface AnalysisProgressProps {
  progress: {
    stage: string;
    progress: number;
    message: string;
    processedFrames: number;
    totalFrames: number;
  };
  onCancel: () => void;
}

const STAGE_ICONS: Record<string, React.ReactNode> = {
  initializing: <CheckCircle2 className="w-5 h-5" />,
  loading_model: <Play className="w-5 h-5" />,
  extracting_frames: <Play className="w-5 h-5" />,
  detecting_objects: <Play className="w-5 h-5" />,
  tracking_objects: <Play className="w-5 h-5" />,
  analyzing_risk: <Play className="w-5 h-5" />,
  generating_report: <CheckCircle2 className="w-5 h-5" />,
  complete: <CheckCircle2 className="w-5 h-5" />,
  error: <AlertCircle className="w-5 h-5" />,
};

const STAGE_LABELS: Record<string, string> = {
  initializing: 'Initializing',
  loading_model: 'Loading AI Model',
  extracting_frames: 'Extracting Frames',
  detecting_objects: 'Detecting Objects',
  tracking_objects: 'Tracking Objects',
  analyzing_risk: 'Analyzing Risk',
  generating_report: 'Generating Report',
  complete: 'Complete',
  error: 'Error',
};

const getStageColor = (stage: string): string => {
  if (stage === 'error') return 'text-red-400';
  if (stage === 'complete') return 'text-green-400';
  return 'text-blue-400';
};

export function AnalysisProgress({ progress, onCancel }: AnalysisProgressProps) {
  const { stage, progress: percent, message } = progress;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-slate-700 ${getStageColor(stage)}`}>
              {STAGE_ICONS[stage] || STAGE_ICONS.initializing}
            </div>
            <div>
              <h3 className="text-white font-semibold">
                {STAGE_LABELS[stage] || stage}
              </h3>
              <p className="text-sm text-slate-400">{message}</p>
            </div>
          </div>
          {stage !== 'complete' && stage !== 'error' && (
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-300 hover:bg-slate-700 p-2 rounded-lg transition-colors"
              title="Cancel analysis"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-out ${
                stage === 'error' ? 'bg-red-500' : stage === 'complete' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">{percent.toFixed(0)}% complete</span>
            {progress.processedFrames > 0 && progress.totalFrames > 0 && (
              <span className="text-slate-500">
                {progress.processedFrames} / {progress.totalFrames} frames
              </span>
            )}
          </div>
        </div>

        {/* Stage Timeline */}
        <div className="mt-8 pt-6 border-t border-slate-700">
          <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide font-medium">Progress</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {Object.keys(STAGE_LABELS).map((s, idx) => (
              <StageDot
                key={s}
                stage={s}
                currentStage={stage}
                index={idx}
              />
            ))}
          </div>
        </div>

        {/* Information Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoCard
            title="Processing"
            value={stage === 'complete' ? 'Finished' : 'In Progress'}
            color={stage === 'complete' ? 'green' : 'blue'}
          />
          <InfoCard
            title="Status"
            value={STAGE_LABELS[stage] || stage}
            color={stage === 'error' ? 'red' : stage === 'complete' ? 'green' : 'blue'}
          />
        </div>

        {/* Tips */}
        {stage !== 'complete' && stage !== 'error' && (
          <div className="mt-6 bg-blue-500/5 border border-blue-500/10 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-slate-400">Please keep this tab open while processing</p>
                <p className="text-slate-500 mt-1">Large videos may take several minutes to analyze</p>
              </div>
            </div>
          </div>
        )}

        {/* Complete State */}
        {stage === 'complete' && (
          <div className="mt-6 bg-green-500/5 border border-green-500/10 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-white font-medium">Analysis Complete!</p>
              <p className="text-sm text-slate-400">Your results are being prepared</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {stage === 'error' && (
          <div className="mt-6 bg-red-500/5 border border-red-500/10 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-white font-medium">Analysis Failed</p>
              <p className="text-sm text-slate-400">{message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StageDotProps {
  stage: string;
  currentStage: string;
  index: number;
}

const STAGE_ORDER = [
  'initializing',
  'loading_model',
  'extracting_frames',
  'detecting_objects',
  'tracking_objects',
  'analyzing_risk',
  'generating_report',
  'complete',
];

function StageDot({ stage, currentStage, index }: StageDotProps) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const stageIndex = STAGE_ORDER.indexOf(stage);
  const isComplete = stageIndex < currentIndex;
  const isCurrent = stage === currentStage;

  const getDotColor = (): string => {
    if (isComplete || currentStage === 'complete') return 'bg-green-500';
    if (isCurrent) return 'bg-blue-500';
    return 'bg-slate-600';
  };

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <div
        className={`w-2 h-2 rounded-full ${getDotColor()} ${
          isCurrent ? 'ring-4 ring-blue-500/20' : ''
        }`}
      />
      {index < STAGE_ORDER.length - 1 && (
        <div className={`w-4 h-0.5 ${isComplete ? 'bg-green-500' : 'bg-slate-600'}`} />
      )}
    </div>
  );
}

interface InfoCardProps {
  title: string;
  value: string;
  color: 'blue' | 'green' | 'red';
}

function InfoCard({ title, value, color }: InfoCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
  };

  return (
    <div className={`border rounded-lg p-3 ${colorClasses[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{title}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}