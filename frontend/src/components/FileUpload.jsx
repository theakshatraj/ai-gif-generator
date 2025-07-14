"use client"

import { useState } from "react"
import apiService from "../services/api";

// Helper: Extract single video URL from any YouTube link (removes playlist, etc.)
function extractSingleVideoUrl(url) {
  try {
    // Accepts: https://www.youtube.com/watch?v=VIDEOID&list=... or ...&index=...
    //           https://youtu.be/VIDEOID
    //           https://www.youtube.com/shorts/VIDEOID
    const ytRegex = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/;
    const match = url.match(ytRegex);
    if (match && match[1]) {
      return `https://www.youtube.com/watch?v=${match[1]}`;
    }
    return null;
  } catch {
    return null;
  }
}

// Helper: Validate if a string is a YouTube video/short URL
function isValidYouTubeUrl(url) {
  return !!extractSingleVideoUrl(url);
}

const FileUpload = ({ onFileSelect, onYouTubeUrl, onLongVideoDetected }) => {
  const [youtubeInput, setYoutubeInput] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [checkingDuration, setCheckingDuration] = useState(false);
  const [urlError, setUrlError] = useState("");

  const checkVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement("video")
      video.preload = "metadata"

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src)
        resolve(video.duration)
      }

      video.onerror = () => {
        resolve(0) // If we can't get duration, assume it's short
      }

      video.src = URL.createObjectURL(file)
    })
  }

  const handleFileSelection = async (file) => {
    if (!file) return

    setCheckingDuration(true)

    try {
      const duration = await checkVideoDuration(file)
      console.log(`📹 Video duration: ${duration} seconds`)

      // If video is longer than 8 seconds, show segment selector
      if (duration > 8) {
        onLongVideoDetected(file, duration)
      } else {
        onFileSelect(file)
      }
    } catch (error) {
      console.error("Error checking video duration:", error)
      // If we can't check duration, proceed normally
      onFileSelect(file)
    } finally {
      setCheckingDuration(false)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0])
    }
  }

  // New: Handle multiple YouTube URLs
  const handleYouTubeSubmit = async () => {
    setUrlError("");
    // Split by newline, comma, or space
    let urls = youtubeInput
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (urls.length === 0) {
      setUrlError("Please enter at least one YouTube URL.");
      return;
    }
    // Normalize and validate
    const normalized = urls.map(extractSingleVideoUrl);
    const invalids = urls.filter((u, i) => !normalized[i]);
    if (invalids.length > 0) {
      setUrlError(
        `Invalid YouTube URL(s):\n${invalids.join("\n")}\nPlease enter only valid YouTube video or shorts URLs.`
      );
      return;
    }
    // Remove duplicates
    const uniqueUrls = Array.from(new Set(normalized));
    // Optionally: Check durations for each (first one only for now)
    setCheckingDuration(true);
    try {
      // If any are long, trigger segment selector for that one only (for now)
      // (You can extend to support segment selection for each in the future)
      const meta = await apiService.getYoutubeMetadata(uniqueUrls[0]);
      if (meta.duration > 8) {
        onLongVideoDetected({ youtubeUrl: uniqueUrls[0], duration: meta.duration });
      } else {
        onYouTubeUrl(uniqueUrls);
      }
    } catch (e) {
      // fallback: just pass the URLs
      onYouTubeUrl(uniqueUrls);
    } finally {
      setCheckingDuration(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* YouTube URL Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">YouTube URLs (one per line or comma)</label>
        <div className="flex gap-2">
          <textarea
            value={youtubeInput}
            onChange={(e) => setYoutubeInput(e.target.value)}
            placeholder="Paste one or more YouTube video URLs here..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[48px] resize-y"
            rows={3}
            disabled={checkingDuration}
          />
          <button
            onClick={handleYouTubeSubmit}
            disabled={!youtubeInput.trim() || checkingDuration}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {checkingDuration ? "Checking..." : "Load"}
          </button>
        </div>
        {urlError && (
          <div className="mt-2 text-red-600 text-xs whitespace-pre-line">{urlError}</div>
        )}
        <p className="text-xs text-gray-500 mt-1">Note: Long YouTube videos will also require segment selection</p>
      </div>

      {/* OR Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">OR</span>
        </div>
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Upload MP4 File</label>
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
            dragActive ? "border-blue-400 bg-blue-50 scale-105" : "border-gray-300 hover:border-gray-400"
          } ${checkingDuration ? "opacity-50 pointer-events-none" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="video/mp4"
            onChange={(e) => handleFileSelection(e.target.files[0])}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={checkingDuration}
          />
          <div className="space-y-4">
            <div className="text-gray-400">
              {checkingDuration ? (
                <div className="animate-spin mx-auto h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              ) : (
                <svg className="mx-auto h-16 w-16" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {checkingDuration ? (
                <span className="font-medium text-blue-600">Checking video duration...</span>
              ) : (
                <span className="font-medium text-blue-600">Click to upload</span>
              )}
              {!checkingDuration && " or drag and drop"}
            </div>
            <p className="text-xs text-gray-500">
              MP4 files only (max 100MB)
              <br />
              Videos longer than 8 seconds will require segment selection
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileUpload