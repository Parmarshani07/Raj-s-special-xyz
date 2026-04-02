/**
 * Main Application Component
 * Dashcam Video Analysis System
 */

import React, { useState, useCallback, useRef } from 'react';
import { FileVideo, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { VideoProcessor } from './services/videoProcessor';
import { ReportGenerator } from './services/reportGenerator';
import type { AnalysisResult, AnalysisProgress, ProcessingError } from './types/analysis';
import { UploadSection } from './components/UploadSection';
import { AnalysisProgress as AnalysisProgressComponent } from './components/AnalysisProgress';
import { ResultsDashboard } from './components/ResultsDashboard';

export default function App() {
  const [processor, setProcessor] = useState<VideoProcessor | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<ProcessingError | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const processorRef = useRef<VideoProcessor | null>(null);

  // Initialize the video processor on mount
  React.useEffect(() => {
    const initProcessor = async () => {
      setIsInitializing(true);
      try {
        const newProcessor = new VideoProcessor({
          frameSampleRate: 3, // Analyze every 3rd frame for better performance
          maxDuration: 120, // 2 minutes max
          maxFileSize: 200 * 1024 * 1024, // 200MB
          confidenceThreshold: 0.5,
          enableObjectTracking: true,
          enableRiskAnalysis: true,
        });

        await newProcessor.initialize();
        processorRef.current = newProcessor;
        setProcessor(newProcessor);
      } catch (err) {
        setError({
          code: 'model_load_failed',
          message: 'Failed to initialize analysis engine',
          details: err instanceof Error ? err.message : String(err),
          recoverable: false,
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initProcessor();
  }, []);

  // Handle file upload and analysis
  const handleFileSelect = useCallback(async (file: File) => {
    if (!processorRef.current) {
      setError({
        code: 'model_load_failed',
        message: 'Analysis engine not ready. Please wait for initialization.',
        recoverable: false,
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setProgress(null);

    // Subscribe to progress updates
    const unsubscribe = processorRef.current.onProgress(setProgress);

    try {
      const analysisResult = await processorRef.current.processVideo(file);
      setResult(analysisResult);
    } catch (err) {
      setError({
        code: 'inference_failed',
        message: 'Analysis failed',
        details: err instanceof Error ? err.message : String(err),
        recoverable: true,
      });
    } finally {
      setIsAnalyzing(false);
      unsubscribe();
    }
  }, []);

  // Handle cancel analysis
  const handleCancel = useCallback(() => {
    processorRef.current?.cancel();
    setIsAnalyzing(false);
  }, []);

  // Handle download report
  const handleDownloadReport = useCallback((format: 'txt' | 'json' | 'csv') => {
    if (result) {
      const reportGenerator = new ReportGenerator();
      reportGenerator.downloadReport(result, format);
    }
  }, [result]);

  // Handle reset
  const handleReset = useCallback(() => {
    setResult(null);
    setProgress(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500">
                <FileVideo className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Dashcam Vision
                </h1>
                <p className="text-xs text-slate-400">
                  AI-Powered Video Analysis System
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {processor && !isInitializing && (
                <div className="flex items-center gap-1.5 text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ready</span>
                </div>
              )}
              {isInitializing && (
                <div className="flex items-center gap-1.5 text-yellow-400 bg-yellow-500/10 px-3 py-1.5 rounded-full">
                  <AlertCircle className="w-4 h-4" />
                  <span>Initializing...</span>
                </div>
              )}
              {!processor && !isInitializing && (
                <div className="flex items-center gap-1.5 text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full">
                  <XCircle className="w-4 h-4" />
                  <span>Unavailable</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isInitializing && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-slate-400">Initializing AI models...</p>
            <p className="text-xs text-slate-500 mt-2">This may take a moment on first load</p>
          </div>
        )}

        {!isInitializing && !processor && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-red-500/10 p-4 rounded-full mb-4">
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Initialization Failed
            </h2>
            <p className="text-slate-400 text-center max-w-md">
              {error?.message || 'Failed to load the AI models. Please refresh the page to try again.'}
            </p>
            {error?.details && (
              <p className="text-slate-500 text-sm text-center max-w-md mt-3">
                {error.details}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Refresh Page
            </button>
          </div>
        )}

        {!isInitializing && processor && (
          <>
            {/* Upload Section */}
            {!isAnalyzing && !result && !error && (
              <UploadSection
                onFileSelect={handleFileSelect}
                isProcessing={false}
                config={processor.getConfig()}
              />
            )}

            {/* Analysis Progress */}
            {isAnalyzing && progress && (
              <AnalysisProgressComponent
                progress={progress}
                onCancel={handleCancel}
              />
            )}

            {/* Error Display */}
            {error && !isAnalyzing && (
              <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="bg-red-500/10 p-6 rounded-full mb-6">
                  <AlertCircle className="w-16 h-16 text-red-400" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">
                  Analysis Error
                </h2>
                <p className="text-slate-400 text-center max-w-lg mb-4">
                  {error.message}
                </p>
                {error.details && (
                  <p className="text-slate-500 text-sm text-center max-w-lg mb-8">
                    {error.details}
                  </p>
                )}
                <button
                  onClick={handleReset}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Results Dashboard */}
            {result && !isAnalyzing && (
              <ResultsDashboard
                result={result}
                onDownload={handleDownloadReport}
                onReset={handleReset}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              Powered by TensorFlow.js COCO-SSD • Browser-based analysis
            </p>
            <p className="text-xs text-slate-600">
              For safety critical applications, always verify results with manual review
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}