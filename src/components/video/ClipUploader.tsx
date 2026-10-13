// src/components/video/ClipUploader.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Upload, Play, Loader, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { Database } from '@/lib/supabase/types';

type VideoAsset = Database['public']['Tables']['video_assets']['Row'];

// Must match the storage bucket limit and the video_assets CHECK constraints
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MIME_BY_EXTENSION: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};
const CAPTURE_ANGLES = [
  { value: 'fixed_side_right', label: 'Side (right)' },
  { value: 'fixed_side_left', label: 'Side (left)' },
  { value: 'fixed_front', label: 'Front' },
  { value: 'fixed_45_angle', label: '45° angle' },
];
const DRILL_TYPES = [
  { value: 'catch_and_shoot', label: 'Catch and shoot' },
  { value: 'free_throw', label: 'Free throw' },
  { value: 'pull_up_jumper', label: 'Pull-up jumper' },
  { value: 'form_shooting', label: 'Form shooting' },
  { value: 'custom', label: 'Other' },
];

function resolveMimeType(file: File): string | null {
  if (Object.values(MIME_BY_EXTENSION).includes(file.type)) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return MIME_BY_EXTENSION[extension] || null;
}

export function ClipUploader() {
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [captureAngle, setCaptureAngle] = useState(CAPTURE_ANGLES[0].value);
  const [drillType, setDrillType] = useState(DRILL_TYPES[0].value);
  const [consentGiven, setConsentGiven] = useState(false);

  const loadVideos = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();

      if (!user?.user) return;

      const { data, error: fetchError } = await supabase
        .from('video_assets')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setVideos(data || []);
    } catch (err) {
      console.error('Failed to load videos:', err);
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetching on mount and syncing the result into state is one of the two valid
    // effect uses per https://react.dev/learn/you-might-not-need-an-effect - this
    // isn't deriving state from props/state, it's loading from an external system.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadVideos();
  }, [loadVideos]);

  const triggerAnalysisJob = useCallback(async (videoId: string, userId: string, correlationId: string) => {
    try {
      const supabase = createClient();

      // Create analysis job record; the idempotency key stops duplicate jobs per video
      const { error: jobError } = await supabase.from('video_analysis_jobs').insert([{
        video_id: videoId,
        user_id: userId,
        job_status: 'pending',
        idempotency_key: `analysis:${videoId}`,
        correlation_id: correlationId,
      }]);
      if (jobError) throw jobError;
    } catch (err) {
      console.error('Failed to trigger analysis:', err);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !videoTitle.trim()) {
      setError('Please select a file and enter a title');
      return;
    }
    if (!consentGiven) {
      setError('Please confirm you consent to this video being uploaded and analysed.');
      return;
    }

    const mimeType = resolveMimeType(selectedFile);
    if (!mimeType) {
      setError('Please choose an MP4, MOV, or WebM video');
      return;
    }
    if (selectedFile.size > MAX_FILE_BYTES) {
      setError('Video must be 50MB or smaller');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();

      if (!user?.user) {
        setError('Not authenticated');
        return;
      }

      // Storage keys reject some characters, so keep the name to a safe set
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${user.user.id}/${Date.now()}_${safeName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create video asset record. consent_given/consent_timestamp are recorded here,
      // not defaulted, since the player just confirmed consent above.
      const { data: videoRecord, error: recordError } = await supabase
        .from('video_assets')
        .insert([{
          user_id: user.user.id,
          title: videoTitle.trim(),
          storage_path: uploadData.path,
          file_name: selectedFile.name,
          file_size_bytes: selectedFile.size,
          mime_type: mimeType,
          capture_angle: captureAngle as Database['public']['Tables']['video_assets']['Row']['capture_angle'],
          drill_type: drillType as Database['public']['Tables']['video_assets']['Row']['drill_type'],
          consent_given: true,
          consent_timestamp: new Date().toISOString(),
        }])
        .select()
        .single();

      if (recordError) throw recordError;

      // Update local state
      setVideos([videoRecord, ...videos]);
      setSelectedFile(null);
      setVideoTitle('');
      setConsentGiven(false);

      // Trigger analysis job (would be async background task)
      triggerAnalysisJob(videoRecord.id, user.user.id, videoRecord.correlation_id);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [selectedFile, videoTitle, consentGiven, captureAngle, drillType, videos, triggerAnalysisJob]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      case 'processing':
        return <Loader className="h-5 w-5 text-blue-400 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Clock className="h-5 w-5 text-zinc-400" />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'default' | 'danger' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'default';
      case 'failed':
        return 'danger';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-400">Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        <p className="text-sm text-zinc-400 mb-4">Keep short clips (up to 50MB) in your Deadeye account to watch back later.</p>

        {error && (
          <Alert variant="error" title="Error" className="mb-8">
            {error}
          </Alert>
        )}

        {/* Upload Section */}
        <Card className="border-zinc-800 bg-zinc-900/70 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-red-400" />
              Upload Video
            </CardTitle>
            <CardDescription>MP4, MOV, or WebM up to 50MB</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="video-title" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                Video Title
              </label>
              <input
                id="video-title"
                type="text"
                maxLength={120}
                placeholder="e.g., Shooting Drill - 3PT Range"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-700/80 bg-zinc-900/90 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="capture-angle" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                  Camera Angle
                </label>
                <select
                  id="capture-angle"
                  value={captureAngle}
                  onChange={(e) => setCaptureAngle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-700/80 bg-zinc-900/90 text-sm text-zinc-100 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  {CAPTURE_ANGLES.map((angle) => (
                    <option key={angle.value} value={angle.value}>
                      {angle.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="drill-type" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                  Drill Type
                </label>
                <select
                  id="drill-type"
                  value={drillType}
                  onChange={(e) => setDrillType(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-700/80 bg-zinc-900/90 text-sm text-zinc-100 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  {DRILL_TYPES.map((drill) => (
                    <option key={drill.value} value={drill.value}>
                      {drill.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                Video File
              </label>
              <div className="border-2 border-dashed border-zinc-700/50 rounded-xl p-8 text-center hover:border-red-500/30 transition-colors">
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="video-input"
                />
                <label htmlFor="video-input" className="cursor-pointer">
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-zinc-600 mx-auto" />
                    <div className="text-sm">
                      <span className="font-semibold text-zinc-300">Click to upload</span>
                      <span className="text-zinc-500"> or drag and drop</span>
                    </div>
                    {selectedFile && (
                      <div className="text-xs text-emerald-400 mt-2">
                        {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I consent to this video being uploaded to my private Deadeye account and analysed to measure movement
                and shooting data. This is not medical advice or a guarantee of performance.
              </span>
            </label>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !videoTitle.trim() || !consentGiven}
              isLoading={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Video'}
            </Button>
          </CardContent>
        </Card>

        {/* Video List */}
        {videos.length > 0 ? (
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Play className="h-5 w-5 text-red-400" />
              Your Videos
            </h2>

            <div className="space-y-3">
              {videos.map((video) => (
                <Card key={video.id} className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900/90 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="pt-1">{getStatusIcon(video.analysis_status)}</div>
                        <div>
                          <h3 className="font-semibold text-white">{video.title || video.file_name}</h3>
                          <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
                            <span>{(video.file_size_bytes / 1024 / 1024).toFixed(1)} MB</span>
                            {video.duration_seconds && (
                              <>
                                <span>·</span>
                                <span>
                                  {Math.floor(video.duration_seconds / 60)}:
                                  {String(video.duration_seconds % 60).padStart(2, '0')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <Badge variant={getStatusColor(video.analysis_status)} className="text-xs block">
                          {video.analysis_status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-12 text-center">
              <Play className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-zinc-300 mb-1">No videos yet</h3>
              <p className="text-sm text-zinc-400">Upload your first basketball video to get started with AI-powered analysis</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
