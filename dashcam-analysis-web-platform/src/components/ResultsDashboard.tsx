/**
 * Results Dashboard Component
 * Displays comprehensive analysis results with visualizations
 */

import { useState } from 'react';
import {
  Download,
  FileText,
  Share2,
  AlertTriangle,
  Shield,
  Activity,
  Users,
  Car,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import type { AnalysisResult } from '../types/analysis';
import { getClassInfo, getRiskColor, getRiskLabel } from '../utils/classInfo';

interface ResultsDashboardProps {
  result: AnalysisResult;
  onDownload: (format: 'txt' | 'json' | 'csv') => void;
  onReset: () => void;
}

export function ResultsDashboard({ result, onDownload, onReset }: ResultsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'objects' | 'risks' | 'timeline'>('summary');
  const [expandedMoments, setExpandedMoments] = useState<Set<number>>(new Set());

  const toggleMoment = (index: number) => {
    const newExpanded = new Set(expandedMoments);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedMoments(newExpanded);
  };

  const tabs = [
    { id: 'summary', label: 'Summary', icon: Shield },
    { id: 'objects', label: 'Objects', icon: Users },
    { id: 'risks', label: 'Risks', icon: AlertTriangle },
    { id: 'timeline', label: 'Timeline', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Analysis Results</h2>
          <p className="text-slate-400 text-sm">
            {result.videoMetadata.filename} • {result.frames.length} frames analyzed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDownload('txt')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-colors"
          >
            <FileText className="w-4 h-4" />
            Text
          </button>
          <button
            onClick={() => onDownload('json')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
          <button
            onClick={() => onDownload('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-colors"
          >
            <Share2 className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors"
          >
            <X className="w-4 h-4" />
            New Analysis
          </button>
        </div>
      </div>

      {/* Risk Score Banner */}
      <div
        className={`
          border rounded-xl p-6
          ${result.summary.maxRiskScore >= 75 ? 'border-red-500/30 bg-red-500/10' : ''}
          ${result.summary.maxRiskScore >= 50 && result.summary.maxRiskScore < 75 ? 'border-orange-500/30 bg-orange-500/10' : ''}
          ${result.summary.maxRiskScore < 50 ? 'border-green-500/30 bg-green-500/10' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`
                w-16 h-16 rounded-full flex items-center justify-center
                ${result.summary.maxRiskScore >= 75 ? 'bg-red-500/20' : ''}
                ${result.summary.maxRiskScore >= 50 && result.summary.maxRiskScore < 75 ? 'bg-orange-500/20' : ''}
                ${result.summary.maxRiskScore < 50 ? 'bg-green-500/20' : ''}
              `}
            >
              <span className={`text-2xl font-bold ${getRiskColor(result.summary.maxRiskScore)}`}>
                {result.summary.maxRiskScore.toFixed(0)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold text-lg">Maximum Risk Score</p>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    result.summary.maxRiskScore >= 75
                      ? 'bg-red-500/20 text-red-400'
                      : result.summary.maxRiskScore >= 50
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {getRiskLabel(result.summary.maxRiskScore)} Risk
                </span>
              </div>
              <p className="text-slate-400 text-sm">
                Average: {result.summary.averageRiskScore.toFixed(1)} • High-Risk Frames:{' '}
                {result.summary.totalHighRiskFrames}
              </p>
            </div>
          </div>
          <Car className={`w-12 h-12 ${getRiskColor(result.summary.maxRiskScore)} opacity-20`} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap
                ${activeTab === tab.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-300'}
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        {activeTab === 'summary' && <SummaryTab result={result} />}
        {activeTab === 'objects' && <ObjectsTab result={result} />}
        {activeTab === 'risks' && <RisksTab result={result} expandedMoments={expandedMoments} onToggleMoment={toggleMoment} />}
        {activeTab === 'timeline' && <TimelineTab result={result} />}
      </div>
    </div>
  );
}

// Summary Tab
function SummaryTab({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Objects Detected"
          value={result.summary.totalObjectsDetected}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Objects Tracked"
          value={result.summary.uniqueObjectsTracked}
          icon={Activity}
          color="green"
        />
        <StatCard
          label="Avg Risk Score"
          value={`${result.summary.averageRiskScore.toFixed(1)}`}
          icon={AlertTriangle}
          color="orange"
        />
        <StatCard
          label="High-Risk Frames"
          value={result.summary.totalHighRiskFrames}
          icon={Shield}
          color="red"
        />
      </div>

      {/* Video Metadata */}
      <div className="bg-slate-900/50 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3">Video Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <InfoRow label="Filename" value={result.videoMetadata.filename} />
          <InfoRow label="Duration" value={`${result.videoMetadata.duration.toFixed(2)}s`} />
          <InfoRow label="Resolution" value={`${result.videoMetadata.width}x${result.videoMetadata.height}`} />
          <InfoRow label="Frame Rate" value={`${result.videoMetadata.fps} FPS`} />
          <InfoRow label="File Size" value={`${(result.videoMetadata.fileSize / (1024 * 1024)).toFixed(2)} MB`} />
          <InfoRow label="Format" value={result.videoMetadata.format} />
        </div>
      </div>

      {/* Risk Distribution */}
      <RiskDistribution distribution={result.summary.riskDistribution} />
    </div>
  );
}

// Objects Tab
function ObjectsTab({ result }: { result: AnalysisResult }) {
  const sortedClasses = Object.entries(result.objectStatistics.byClass).sort(
    (a, b) => b[1].count - a[1].count
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Detected Objects by Class</h3>
        <span className="text-slate-400 text-sm">{result.objectStatistics.total} total</span>
      </div>

      <div className="space-y-3">
        {sortedClasses.map(([className, stats]) => {
          const info = getClassInfo(className);
          return (
            <div key={className} className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">{info.icon}</span>
                <span className="text-white font-medium">{info.name}</span>
                <span className="ml-auto text-slate-400 text-sm">{stats.count} detected</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 mb-3">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${(stats.count / result.objectStatistics.total) * 100}%`,
                    backgroundColor: info.color,
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500">Avg Confidence</span>
                  <p className="text-white font-medium mt-1">
                    {(stats.averageConfidence * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Avg Size</span>
                  <p className="text-white font-medium mt-1">
                    {(stats.averageSize.width * 100).toFixed(1)}% x {(stats.averageSize.height * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Max Risk</span>
                  <p className="text-white font-medium mt-1">{stats.maxRiskEncountered.toFixed(1)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tracked Objects */}
      {result.trackedObjects.length > 0 && (
        <div className="mt-6">
          <h3 className="text-white font-semibold mb-3">Tracked Objects</h3>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <InfoRow label="Total Tracked" value={result.trackedObjects.length} />
              <InfoRow
                label="Multi-Frame"
                value={result.trackedObjects.filter(t => t.positions.length > 1).length}
              />
              <InfoRow
                label="Long Tracks (5+)"
                value={result.trackedObjects.filter(t => t.positions.length >= 5).length}
              />
              <InfoRow
                label="Avg Track Length"
                value={
                  result.trackedObjects.length > 0
                    ? (result.trackedObjects.reduce((s, t) => s + t.positions.length, 0) / result.trackedObjects.length).toFixed(1)
                    : '0'
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Risks Tab
function RisksTab({
  result,
  expandedMoments,
  onToggleMoment,
}: {
  result: AnalysisResult;
  expandedMoments: Set<number>;
  onToggleMoment: (index: number) => void;
}) {
  if (result.highRiskMoments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Shield className="w-12 h-12 text-green-500 mb-4" />
        <h3 className="text-white font-medium mb-2">No Significant Risks Detected</h3>
        <p className="text-slate-400 text-sm max-w-md">
          The analysis did not identify any high-risk moments in this footage. However, always review
          footage manually for complete safety assessment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">High-Risk Moments ({result.highRiskMoments.length})</h3>
      </div>

      <div className="space-y-3">
        {result.highRiskMoments.map((moment, index) => {
          const isExpanded = expandedMoments.has(index);
          return (
            <div key={index} className="bg-slate-900/50 rounded-lg border border-slate-700">
              <button
                onClick={() => onToggleMoment(index)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-slate-800/50 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${getRiskColor(moment.riskScore)}20` }}
                >
                  <AlertTriangle className={`w-5 h-5`} style={{ color: getRiskColor(moment.riskScore) }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">
                      {moment.timestamp.toFixed(2)}s
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        moment.riskScore >= 75
                          ? 'bg-red-500/20 text-red-400'
                          : moment.riskScore >= 50
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {moment.riskScore.toFixed(0)}% Risk
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm truncate">{moment.description}</p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-700 pt-4">
                  <div className="mb-3">
                    <span className="text-xs text-slate-500 uppercase tracking-wide">Involved Objects</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {moment.involvedObjects.map((obj) => {
                        const info = getClassInfo(obj.class);
                        return (
                          <span
                            key={obj.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-700"
                          >
                            {info.icon} {info.name} ({(obj.confidence * 100).toFixed(0)}%)
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    Frame: {moment.frameIndex} • Risk Score: {moment.riskScore.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Timeline Tab
function TimelineTab({ result }: { result: AnalysisResult }) {
  const frames = result.frames;
  const bucketSize = Math.max(1, Math.floor(frames.length / 20));

  const buckets = Array.from({ length: Math.ceil(frames.length / bucketSize) }, (_, i) => {
    const start = i * bucketSize;
    const end = Math.min((i + 1) * bucketSize, frames.length);
    const bucketFrames = frames.slice(start, end);
    const avgRisk = bucketFrames.reduce((s, f) => s + f.riskScore, 0) / bucketFrames.length;
    const maxRisk = Math.max(...bucketFrames.map(f => f.riskScore));
    return {
      index: i,
      startFrame: start,
      endFrame: end,
      avgRisk,
      maxRisk,
      objectCount: bucketFrames.reduce((s, f) => s + f.objects.length, 0),
    };
  });

  return (
    <div className="space-y-6">
      <h3 className="text-white font-semibold">Risk Timeline</h3>

      {/* Timeline Visualization */}
      <div className="space-y-4">
        {buckets.map((bucket) => (
          <div key={bucket.index} className="space-y-2">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-400 w-20">{bucket.startFrame}-{bucket.endFrame}</span>
              <div className="flex-1 h-6 bg-slate-900 rounded overflow-hidden flex">
                <div
                  className="h-full transition-all relative"
                  style={{
                    width: `${bucket.avgRisk}%`,
                    backgroundColor: getRiskColor(bucket.avgRisk),
                  }}
                />
              </div>
              <span className="text-slate-400 w-20 text-right">{bucket.avgRisk.toFixed(1)}% avg</span>
              <span className="text-slate-400 w-20 text-right">{bucket.objectCount} objs</span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs pt-4 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-slate-400">Low Risk (&lt;25%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-slate-400">Medium Risk (25-50%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-slate-400">High Risk (50-75%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-400">Critical Risk (75%+)</span>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: 'blue' | 'green' | 'orange' | 'red';
}) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="text-slate-500 text-xs">{label}</span>
      <p className="text-white font-medium mt-0.5">{value}</p>
    </div>
  );
}

function RiskDistribution({ distribution }: { distribution: any }) {
  const total = distribution.low + distribution.medium + distribution.high + distribution.critical;

  return (
    <div className="bg-slate-900/50 rounded-lg p-4">
      <h3 className="text-white font-semibold mb-3">Risk Distribution</h3>
      <div className="space-y-3">
        <RiskBar label="Low Risk" count={distribution.low} total={total} color="green" />
        <RiskBar label="Medium Risk" count={distribution.medium} total={total} color="yellow" />
        <RiskBar label="High Risk" count={distribution.high} total={total} color="orange" />
        <RiskBar label="Critical Risk" count={distribution.critical} total={total} color="red" />
      </div>
    </div>
  );
}

function RiskBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: 'green' | 'yellow' | 'orange' | 'red';
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white">{count} frames ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${colors[color]}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}