"use client"

import { useState, useRef, useEffect } from "react"
import ReactPlayer from "react-player";

const VideoSegmentSelector = ({ file, youtubeUrl, onSegmentSelect, onCancel }) => {
  const videoRef = useRef(null)
  const playerRef = useRef(null)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(15) // Changed from 30 to 15 seconds max
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoUrl, setVideoUrl] = useState(null)

  const setPlayerRef = (player) => {
    playerRef.current = player;
  };

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  // For regular video files
  const handleLoadedMetadata = () => {
    const videoDuration = videoRef.current.duration
    setDuration(videoDuration)
    setEndTime(Math.min(15, videoDuration)) // Max 15 seconds or video duration
  }

  const handleTimeUpdate = () => {
    setCurrentTime(videoRef.current.currentTime)
  }

  // For ReactPlayer (YouTube)
  const handlePlayerDuration = (duration) => {
    setDuration(duration)
    setEndTime(Math.min(15, duration)) // Max 15 seconds or video duration
  }

  const handlePlayerProgress = (state) => {
    setCurrentTime(state.playedSeconds)
    if (state.playedSeconds >= endTime && isPlaying) {
      setIsPlaying(false)
    }
  }

  const handlePlayerSeek = (time) => {
    setCurrentTime(time)
  }

  const handlePlayPause = () => {
    if (youtubeUrl) {
      setIsPlaying(!isPlaying)
    } else {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSeek = (time) => {
    if (youtubeUrl) {
      if (playerRef.current) {
        playerRef.current.seekTo(time)
      }
    } else {
      videoRef.current.currentTime = time
    }
    setCurrentTime(time)
  }

  const handleStartTimeChange = (value) => {
    const newStartTime = Number.parseFloat(value)
    setStartTime(newStartTime)

    // Ensure end time is at least 2 seconds after start time
    if (endTime - newStartTime < 2) {
      setEndTime(Math.min(newStartTime + 2, duration))
    }

    // Ensure segment doesn't exceed 15 seconds
    if (endTime - newStartTime > 15) {
      setEndTime(newStartTime + 15)
    }
  }

  const handleEndTimeChange = (value) => {
    const newEndTime = Number.parseFloat(value)
    setEndTime(newEndTime)

    // Ensure start time is at least 2 seconds before end time
    if (newEndTime - startTime < 2) {
      setStartTime(Math.max(newEndTime - 2, 0))
    }

    // Ensure segment doesn't exceed 15 seconds
    if (newEndTime - startTime > 15) {
      setStartTime(newEndTime - 15)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getSegmentDuration = () => {
    return endTime - startTime
  }

  const handleConfirmSegment = () => {
    onSegmentSelect({
      startTime,
      endTime,
      duration: getSegmentDuration(),
    })
  }

  const previewSegment = () => {
    if (youtubeUrl) {
      if (playerRef.current) {
        playerRef.current.seekTo(startTime)
        setIsPlaying(true)
      }
    } else {
      videoRef.current.currentTime = startTime
      videoRef.current.play()
      setIsPlaying(true)
    }

    // Stop at end time
    const checkTime = () => {
      const current = youtubeUrl ? currentTime : videoRef.current?.currentTime || 0
      if (current >= endTime) {
        if (youtubeUrl) {
          setIsPlaying(false)
        } else {
          videoRef.current.pause()
          setIsPlaying(false)
        }
      } else {
        requestAnimationFrame(checkTime)
      }
    }
    checkTime()
  }

  if (!videoUrl && !youtubeUrl) return null

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-yellow-600">⚠️</span>
          <p className="text-yellow-700 text-sm">
            <strong>Long video detected!</strong> Please select a segment (2-15 seconds) to create your GIF.
          </p>
        </div>
      </div>

      {/* Video Player */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        {youtubeUrl ? (
          <ReactPlayer
            ref={setPlayerRef}
            url={youtubeUrl}
            controls={false}
            playing={isPlaying}
            onDuration={handlePlayerDuration}
            onProgress={handlePlayerProgress}
            onSeek={handlePlayerSeek}
            width="100%"
            height="256px"
            progressInterval={100}
          />
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-64 object-contain"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}

        {/* Play/Pause Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={handlePlayPause}
            className="bg-black bg-opacity-50 text-white rounded-full p-4 hover:bg-opacity-70 transition-all"
          >
            {isPlaying ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <div className="relative">
          <input
            type="range"
            min="0"
            max={duration}
            step="0.1"
            value={currentTime}
            onChange={(e) => handleSeek(Number.parseFloat(e.target.value))}
            className="video-timeline"
          />

          {/* Segment Indicators */}
          <div
            className="segment-indicator"
            style={{
              left: `${(startTime / duration) * 100}%`,
              width: `${((endTime - startTime) / duration) * 100}%`,
            }}
          />
        </div>

        <div className="text-center text-sm text-gray-600">
          Current: {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Segment Controls */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Start Time: {formatTime(startTime)}</label>
          <input
            type="range"
            min="0"
            max={Math.max(0, duration - 2)}
            step="0.1"
            value={startTime}
            onChange={(e) => handleStartTimeChange(e.target.value)}
            className="video-timeline"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">End Time: {formatTime(endTime)}</label>
          <input
            type="range"
            min={Math.min(startTime + 2, duration)}
            max={duration}
            step="0.1"
            value={endTime}
            onChange={(e) => handleEndTimeChange(e.target.value)}
            className="video-timeline"
          />
        </div>
      </div>

      {/* Segment Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-700">Duration:</span>
            <div className="text-blue-600">{formatTime(getSegmentDuration())}</div>
          </div>
          <div>
            <span className="font-medium text-blue-700">Start:</span>
            <div className="text-blue-600">{formatTime(startTime)}</div>
          </div>
          <div>
            <span className="font-medium text-blue-700">End:</span>
            <div className="text-blue-600">{formatTime(endTime)}</div>
          </div>
        </div>

        {getSegmentDuration() > 15 && (
          <div className="mt-2 text-red-600 text-sm">⚠️ Segment too long! Maximum 15 seconds allowed.</div>
        )}

        {getSegmentDuration() < 2 && (
          <div className="mt-2 text-red-600 text-sm">⚠️ Segment too short! Minimum 2 seconds required.</div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between space-x-4">
        <button
          onClick={onCancel}
          className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Cancel
        </button>

        <button
          onClick={previewSegment}
          className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
        >
          Preview Segment
        </button>

        <button
          onClick={handleConfirmSegment}
          disabled={getSegmentDuration() < 2 || getSegmentDuration() > 15}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Use This Segment
        </button>
      </div>
    </div>
  )
}

export default VideoSegmentSelector