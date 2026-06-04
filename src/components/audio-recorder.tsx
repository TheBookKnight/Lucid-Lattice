"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AudioRecordingService, MAX_RECORDING_DURATION_MS, type RecordingResult } from "@/lib/audio-recording";
import { deleteAudioBlob, getAudioBlob, saveAudioBlob } from "@/lib/db";
import { selectSpeechProvider } from "@/lib/transcription";

interface AudioRecorderProps {
  audioBlobId?: string;
  onAudioSaved: (blobId: string) => void;
  onAudioDeleted: () => void;
  onTranscriptReady?: (text: string) => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function AudioRecorder({ audioBlobId, onAudioSaved, onAudioDeleted, onTranscriptReady }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const serviceRef = useRef<AudioRecordingService | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobRef = useRef<Blob | null>(null);

  // Load existing audio blob
  useEffect(() => {
    if (!audioBlobId) {
      setAudioUrl(null);
      blobRef.current = null;
      return;
    }

    let revoked = false;
    getAudioBlob(audioBlobId).then((record) => {
      if (record && !revoked) {
        const url = URL.createObjectURL(record.blob);
        setAudioUrl(url);
        blobRef.current = record.blob;
      }
    });

    return () => {
      revoked = true;
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlobId]);

  const handleRecordingComplete = useCallback(
    async (result: RecordingResult) => {
      const id = crypto.randomUUID();
      await saveAudioBlob(id, result.blob, result.mimeType);
      const url = URL.createObjectURL(result.blob);
      setAudioUrl(url);
      blobRef.current = result.blob;
      setIsRecording(false);
      setElapsedMs(0);
      setTranscriptionError(null);
      onAudioSaved(id);
    },
    [onAudioSaved],
  );

  async function handleStartRecording() {
    setError(null);
    setTranscriptionError(null);
    const service = new AudioRecordingService();
    serviceRef.current = service;

    service.setOnStateChange((state) => {
      setIsRecording(state === "recording");
    });
    service.setOnTimeUpdate((ms) => setElapsedMs(ms));
    service.setOnComplete(handleRecordingComplete);
    service.setOnError((err) => {
      setError(err.message);
      setIsRecording(false);
    });

    await service.start();
  }

  function handleStopRecording() {
    serviceRef.current?.stop();
  }

  async function handleReRecord() {
    if (!window.confirm("Delete existing recording and start over?")) return;

    if (audioBlobId) {
      await deleteAudioBlob(audioBlobId);
      onAudioDeleted();
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    blobRef.current = null;
    setTranscriptionError(null);

    await handleStartRecording();
  }

  async function handleDelete() {
    if (audioBlobId) {
      await deleteAudioBlob(audioBlobId);
      onAudioDeleted();
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    blobRef.current = null;
    setTranscriptionError(null);
  }

  async function handleTranscribe() {
    if (!blobRef.current || isTranscribing) return;

    setIsTranscribing(true);
    setTranscriptionProgress(0);
    setTranscriptionError(null);

    try {
      const provider = await selectSpeechProvider();
      if (!provider) {
        throw new Error("Transcription is not available on this device.");
      }

      const text = await provider.transcribe(blobRef.current, (progress) => {
        setTranscriptionProgress(progress);
      });

      if (text && onTranscriptReady) {
        onTranscriptReady(text);
      }
    } catch (err) {
      setTranscriptionError(
        err instanceof Error ? err.message : "Transcription failed.",
      );
    } finally {
      setIsTranscribing(false);
    }
  }

  function handlePlay() {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }

  function handlePause() {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }

  function handleRestart() {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    }
  }

  const remainingMs = MAX_RECORDING_DURATION_MS - elapsedMs;
  const canTranscribe = !!audioUrl && !isRecording && !isTranscribing;

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Audio Recording</h3>
        {isRecording && (
          <span className="text-xs text-rose-300">
            ⏱ {formatTime(remainingMs)} remaining
          </span>
        )}
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {!isRecording && !audioUrl && (
          <button type="button" onClick={handleStartRecording} className="primary-button text-sm">
            Start Recording
          </button>
        )}

        {isRecording && (
          <button type="button" onClick={handleStopRecording} className="secondary-button text-sm">
            Stop Recording
          </button>
        )}

        {audioUrl && !isRecording && (
          <>
            <button type="button" onClick={handlePlay} disabled={isPlaying} className="secondary-button text-sm">
              Play
            </button>
            <button type="button" onClick={handlePause} disabled={!isPlaying} className="secondary-button text-sm">
              Pause
            </button>
            <button type="button" onClick={handleRestart} className="secondary-button text-sm">
              Restart
            </button>
            <button type="button" onClick={handleTranscribe} disabled={!canTranscribe} className="primary-button text-sm">
              Transcribe
            </button>
            <button type="button" onClick={handleReRecord} className="secondary-button text-sm text-rose-200">
              Re-record
            </button>
            <button type="button" onClick={handleDelete} className="secondary-button text-sm text-rose-200">
              Delete
            </button>
          </>
        )}
      </div>

      {isTranscribing && (
        <div className="space-y-1">
          <p className="text-xs text-sky-300">
            Transcribing locally on your device: {transcriptionProgress}%
          </p>
          <p className="text-xs text-zinc-500">
            Want instant, hardware-accelerated transcription? Download our native App Store version for a premium experience!
          </p>
        </div>
      )}

      {transcriptionError && (
        <p className="text-sm text-rose-300">{transcriptionError}</p>
      )}

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
    </div>
  );
}
