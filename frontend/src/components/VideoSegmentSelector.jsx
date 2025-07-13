"use client"

import { useState, useEffect, useRef } from "react"
import { formatTime } from "../utils/videoTrimmer"

const MAX_SEGMENT_DURATION = 15 // seconds

const VideoSegmentSelector = ({ file, youtubeUrl, videoDuration, onSegmentSelect, onCancel }) => {
  const videoRef = useRef(null)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(videoDuration > 0 ? Math.min(MAX_SEGMENT_DURATION, videoDuration) : 0)
  const [currentVideoTime, setCurrentVideoTime] = useState(0)
  const [error, setError] = useState("")

  useEffect(() => {
    if (videoRef.current && file) {
      const videoElement = videoRef.current
      videoElement.src = URL.createObjectURL(file)
      videoElement.load() // Load the video to get metadata
      videoElement.onloadedmetadata = () => {
        // Set initial end time based on actual video duration or max segment duration
        setEndTime(Math.min(MAX_SEGMENT_DURATION, videoElement.duration))
        setError("")
      }
      videoElement.ontimeupdate = () => {
        setCurrentVideoTime(videoElement.currentTime)
      }
      videoElement.onended = () => {
        videoElement.currentTime = startTime // Loop playback within selected segment
        videoElement.play()
      }
    } else if (youtubeUrl) {
      // For YouTube, we don't have direct client-side playback of the full video.
      // We'll just use the duration for segment selection.
      setEndTime(Math.min(MAX_SEGMENT_DURATION, videoDuration))
      setError("")
    }
  }, [file, youtubeUrl, videoDuration])

  useEffect(() => {
    // Validate segment duration whenever start or end time changes
    if (endTime - startTime > MAX_SEGMENT_DURATION) {
      setError(`Segment cannot be longer than ${MAX_SEGMENT_DURATION} seconds.`)
    } else if (startTime >= endTime) {
      setError("Start time must be less than end time.")
    } else {
      setError("")
    }
  }, [startTime, endTime])

  const handleStartTimeChange = (e) => {
    const newTime = Number.parseFloat(e.target.value)
    setStartTime(newTime)
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
    }
  }

  const handleEndTimeChange = (e) => {
    const newTime = Number.parseFloat(e.target.value)
    setEndTime(newTime)
    if (videoRef.current) {
      // If end time is set, jump to start time to preview the segment
      videoRef.current.currentTime = startTime
    }
  }

  const handleSelect = () => {
    if (error) return
    onSegmentSelect({ startTime, endTime })
  }

  return (
    <div className="space-y-6">
      {file && (
        <div className="relative w-full bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            controls
            className="w-full h-auto max-h-[400px] object-contain"
            onPlay={() => {
              // Ensure playback stays within the selected segment
              if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= endTime) {
                videoRef.current.currentTime = startTime
              }
            }}
            onTimeUpdate={() => {
              if (videoRef.current.currentTime >= endTime) {
                videoRef.current.currentTime = startTime // Loop the segment
              }
            }}
          >
            Your browser does not support the video tag.
          </video>
          <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white text-xs p-1 rounded">
            Current: {formatTime(currentVideoTime)} / Total: {formatTime(videoDuration)}
          </div>
        </div>
      )}

      {youtubeUrl && (
        <div className="w-full bg-gray-200 rounded-lg p-8 text-center text-gray-600">
          <p className="mb-2">YouTube Video Preview Not Available Here</p>
          <p className="text-sm">
            Select your segment for: <span className="font-semibold">{youtubeUrl}</span>
          </p>
          <p className="text-sm">Total Duration: {formatTime(videoDuration)}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
            Start Time ({formatTime(startTime)})
          </label>
          <input
            type="range"
            id="startTime"
            min="0"
            max={videoDuration}
            step="0.1"
            value={startTime}
            onChange={handleStartTimeChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <input
            type="number"
            min="0"
            max={videoDuration}
            step="0.1"
            value={startTime.toFixed(1)}
            onChange={handleStartTimeChange}
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
            End Time ({formatTime(endTime)})
          </label>
          <input
            type="range"
            id="endTime"
            min="0"
            max={videoDuration}
            step="0.1"
            value={endTime}
            onChange={handleEndTimeChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <input
            type="number"
            min="0"
            max={videoDuration}
            step="0.1"
            value={endTime.toFixed(1)}
            onChange={handleEndTimeChange}
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="flex justify-end gap-4 mt-6">
        <button
          onClick={onCancel}
          className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSelect}
          disabled={!!error || startTime >= endTime || endTime - startTime === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg"
        >
          Select Segment
        </button>
      </div>
    </div>
  )
}

export default VideoSegmentSelector
