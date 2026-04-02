/**
 * Upload Section Component
 * Handles video file upload with validation and preview
 */

import React, { useCallback, useState } from 'react';
import { Upload, FileVideo, AlertCircle, Check, X } from 'lucide-react';

interface AnalysisConfig {
  frameSampleRate: number;
  maxDuration: number;
  maxFileSize: number;
  confidenceThreshold: number;
  proximityThreshold: number;
  velocityThreshold: number;
  enableObjectTracking: boolean;
  enableRiskAnalysis: boolean;
}

interface UploadSectionProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  config: AnalysisConfig;
}

const CONFIG_INFO = [
  { key: 'Max Duration', getter: (c: AnalysisConfig) => `${c.maxDuration}s` },
  { key: 'Max File Size', getter: (c: AnalysisConfig) => `${(c.maxFileSize / (1024 * 1024)).toFixed(0)}MB` },
];

const DETECTED_ITEMS = [
  'Cars', 'Trucks', 'Buses', 'Motorcycles',
  'Bicycles', 'Pedestrians', 'Stop Signs', 'Traffic Lights',
];

const ValidationError = ({ message }: { message: string }) => (
  <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
    <div>
      <p className="text-red-400 font-medium">Validation Error</p>
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  </div>
);

const ConfigDisplay = ({ config }: { config: AnalysisConfig }) => (
  <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
    {CONFIG_INFO.map((item) => (
      <div key={item.key} className="bg-slate-800/30 rounded-lg p-3">
        <p className="text-slate-500 mb-1">{item.key}</p>
        <p className="text-white font-medium">{item.getter(config)}</p>
      </div>
    ))}
  </div>
);

const DetectionInfo = () => (
  <div className="mt-8 bg-slate-800/30 rounded-lg p-4">
    <h3 className="text-white font-medium mb-3">What We Detect</h3>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
      {DETECTED_ITEMS.map((item) => (
        <div key={item} className="text-slate-400 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
          {item}
        </div>
      ))}
    </div>
  </div>
);

export function UploadSection({ onFileSelect, isProcessing, config }: UploadSectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileValidating, setFileValidating] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        validateAndSelectFile(files[0]);
      }
    },
    []
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        validateAndSelectFile(files[0]);
      }
    },
    []
  );

  const validateAndSelectFile = async (file: File) => {
    setFileValidating(true);
    setError(null);

    const validFormats = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validFormats.includes(file.type)) {
      setError('Invalid format. Please upload MP4, WebM, OGG, or MOV files.');
      setFileValidating(false);
      return;
    }

    if (file.size > config.maxFileSize) {
      const maxSizeMB = (config.maxFileSize / (1024 * 1024)).toFixed(0);
      setError(`File too large. Maximum size is ${maxSizeMB}MB.`);
      setFileValidating(false);
      return;
    }

    try {
      const duration = await getVideoDuration(file);
      if (duration > config.maxDuration) {
        setError(`Video too long. Maximum duration is ${config.maxDuration} seconds.`);
        setFileValidating(false);
        return;
      }
    } catch (err) {
      setError('Could not read video file. Please try a different file.');
      setFileValidating(false);
      return;
    }

    setSelectedFile(file);
    setFileValidating(false);
  };

  const handleSubmit = useCallback(() => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  }, [selectedFile, onFileSelect]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadAreaContent = () => {
    if (fileValidating) {
      return (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-slate-400">Validating video file...</p>
        </div>
      );
    }

    if (selectedFile) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 text-green-400">
            <Check className="w-5 h-5" />
            <span className="font-medium">Video file selected</span>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-left">
            <div className="flex items-start gap-3">
              <div className="bg-slate-700 p-2 rounded-lg">
                <FileVideo className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)} • {selectedFile.type}</p>
              </div>
              <button onClick={handleClear} className="text-slate-400 hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="flex justify-center mb-4">
          <div className={`p-4 rounded-full ${dragActive ? 'bg-blue-500/20' : 'bg-slate-800'}`}>
            <Upload className="w-8 h-8 text-slate-400" />
          </div>
        </div>
        <p className="text-white font-medium mb-2">
          Drag and drop your video here, or click to browse
        </p>
        <p className="text-sm text-slate-500 mb-4">
          Supports MP4, WebM, OGG, MOV files
        </p>
        <input
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          disabled={isProcessing}
        />
        <label
          htmlFor="file-upload"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors ${
            isProcessing ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <FileVideo className="w-4 h-4" />
          Select Video
        </label>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          Analyze Your Dashcam Footage
        </h2>
        <p className="text-slate-400">
          Upload a video to detect objects, track movements, and assess road safety risks
        </p>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 hover:border-slate-600'
        } ${selectedFile ? 'border-green-500/50 bg-green-500/5' : ''}`}
      >
        {uploadAreaContent()}
      </div>

      {error && <ValidationError message={error} />}
      <ConfigDisplay config={config} />

      {selectedFile && !error && !isProcessing && (
        <button
          onClick={handleSubmit}
          className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-3 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20"
        >
          Start Analysis
        </button>
      )}

      {isProcessing && (
        <div className="w-full mt-6 bg-slate-700 text-slate-300 py-3 rounded-lg font-medium flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
          Processing video...
        </div>
      )}

      <DetectionInfo />
    </div>
  );
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      resolve(video.duration);
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
      URL.revokeObjectURL(video.src);
    };
  });
}