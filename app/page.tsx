'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Video } from 'lucide-react';

type VideoStatus = 'idle' | 'validating' | 'live' | 'processing' | 'completed' | 'error';

interface VideoInfo {
  title?: string;
  author?: string;
  downloadUrl?: string;
  errorMessage?: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<VideoStatus>('idle');
  const [videoInfo, setVideoInfo] = useState<VideoInfo>({});
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);

  const extractVideoId = (youtubeUrl: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([^&\s]+)/,
      /youtube\.com\/embed\/([^&\s]+)/,
    ];

    for (const pattern of patterns) {
      const match = youtubeUrl.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const checkVideoStatus = async (videoId: string) => {
    try {
      const response = await fetch('/api/check-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });

      const data = await response.json();

      if (data.isValid) {
        setVideoInfo({
          title: data.title,
          author: data.author,
        });
        return { isValid: true, isLive: data.isLive };
      }
      return { isValid: false, isLive: false };
    } catch (error) {
      return { isValid: false, isLive: false };
    }
  };

  const checkIfStillLive = async (videoId: string) => {
    try {
      const response = await fetch('/api/check-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });

      const data = await response.json();
      return data.isValid ? data.isLive : false;
    } catch (error) {
      return false;
    }
  };

  const monitorLiveStream = async (videoId: string) => {
    setStatus('live');

    const interval = setInterval(async () => {
      const stillLive = await checkIfStillLive(videoId);

      if (!stillLive) {
        clearInterval(interval);
        setCheckInterval(null);
        await processDownload(videoId);
      }
    }, 5000);

    setCheckInterval(interval);
  };

  const processDownload = async (videoId: string) => {
    setStatus('processing');

    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const response = await fetch('/api/download-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('completed');
        setVideoInfo(prev => ({
          ...prev,
          downloadUrl: data.downloadUrl,
        }));
      } else {
        setStatus('error');
        setVideoInfo(prev => ({
          ...prev,
          errorMessage: data.error || 'Failed to process video',
        }));
      }
    } catch (error) {
      setStatus('error');
      setVideoInfo(prev => ({
        ...prev,
        errorMessage: 'Failed to process download request',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setStatus('error');
      setVideoInfo({ errorMessage: 'Please enter a YouTube URL' });
      return;
    }

    const videoId = extractVideoId(url);

    if (!videoId) {
      setStatus('error');
      setVideoInfo({ errorMessage: 'Invalid YouTube URL. Please check and try again.' });
      return;
    }

    setStatus('validating');
    setVideoInfo({});

    const result = await checkVideoStatus(videoId);

    if (!result.isValid) {
      setStatus('error');
      setVideoInfo({ errorMessage: 'Invalid YouTube video or video not found' });
      return;
    }

    if (result.isLive) {
      await monitorLiveStream(videoId);
    } else {
      await processDownload(videoId);
    }
  };

  const handleReset = () => {
    if (checkInterval) {
      clearInterval(checkInterval);
      setCheckInterval(null);
    }
    setUrl('');
    setStatus('idle');
    setVideoInfo({});
  };

  useEffect(() => {
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [checkInterval]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-red-100 p-4 rounded-full">
              <Video className="w-12 h-12 text-red-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            YouTube Live Downloader
          </h1>
          <p className="text-lg text-slate-600 max-w-lg mx-auto">
            Automatically download YouTube videos when the live stream ends
          </p>
        </div>

        <Card className="shadow-xl border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl">Enter YouTube Live URL</CardTitle>
            <CardDescription>
              Paste the URL of a YouTube live stream or video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={status === 'validating' || status === 'live' || status === 'processing'}
                  className="flex-1 h-12 text-base"
                />
                {status === 'idle' || status === 'error' || status === 'completed' ? (
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!url.trim()}
                    className="h-12 px-8"
                  >
                    {status === 'completed' ? 'Check Another' : 'Check Video'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={handleReset}
                    className="h-12 px-8"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>

            {status === 'validating' && (
              <Alert className="border-blue-200 bg-blue-50">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <AlertDescription className="text-blue-900">
                  Validating YouTube URL...
                </AlertDescription>
              </Alert>
            )}

            {status === 'live' && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                <AlertDescription className="text-yellow-900">
                  <div className="space-y-2">
                    <p className="font-semibold">{videoInfo.title}</p>
                    <p>Video is currently live. Checking every 5 seconds...</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {status === 'processing' && (
              <Alert className="border-purple-200 bg-purple-50">
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                <AlertDescription className="text-purple-900">
                  <div className="space-y-2">
                    <p className="font-semibold">{videoInfo.title}</p>
                    <p>Processing download...</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {status === 'completed' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-lg">{videoInfo.title}</p>
                      <p className="text-sm text-green-700">by {videoInfo.author}</p>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={() => window.open(videoInfo.downloadUrl, '_blank')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Open Video
                      </Button>
                      <Button
                        onClick={handleReset}
                        variant="outline"
                      >
                        Download Another
                      </Button>
                    </div>
                    <p className="text-xs text-green-700 pt-2">
                      Note: Use a third-party YouTube downloader service to download the video
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {status === 'error' && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  {videoInfo.errorMessage || 'An error occurred'}
                </AlertDescription>
              </Alert>
            )}

            {videoInfo.title && status !== 'error' && status !== 'completed' && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-900">{videoInfo.title}</p>
                <p className="text-sm text-slate-600">by {videoInfo.author}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <p className="text-sm text-slate-500">
            How it works: Enter a YouTube URL, and we'll check if it's a live stream. If it's live, we'll monitor it every 5 seconds until it ends, then provide you with a download link.
          </p>
        </div>
      </div>
    </div>
  );
}
