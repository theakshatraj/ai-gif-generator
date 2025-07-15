"use client"

import { useState, useRef } from "react";

const parseTime = (input) => {
  if (typeof input === "number") return input;
  if (input.includes(":")) {
    const [min, sec] = input.split(":").map(Number);
    return min * 60 + sec;
  }
  return Number(input);
};

const VideoSegmentSelector = ({ file, youtubeUrl, onSegmentSelect, onCancel, longVideo }) => {
  // If you have the video duration, pass it as a prop (e.g., longVideo?.duration)
  const duration = longVideo?.duration || 300;

  // Use string state for inputs to allow mm:ss or seconds
  const [startTimeInput, setStartTimeInput] = useState("0");
  const [endTimeInput, setEndTimeInput] = useState("15");

  // Parse and validate
  const startTime = parseTime(startTimeInput);
  const endTime = parseTime(endTimeInput);
  const segmentDuration = endTime - startTime;

  const segmentInvalid =
    isNaN(startTime) ||
    isNaN(endTime) ||
    startTime < 0 ||
    endTime > duration ||
    segmentDuration < 2 ||
    segmentDuration > 15 ||
    endTime <= startTime;

  const handleConfirmSegment = () => {
    if (!segmentInvalid) {
      onSegmentSelect({
        startTime,
        endTime,
        duration: segmentDuration,
      });
    }
  };

  // Helper: create a preview URL for the uploaded file
  const videoUrl = file ? URL.createObjectURL(file) : null;

  // Determine context-aware warning message
  const warningMsg = file
    ? "Long video detected! Enter the segment you want to use (2-15 seconds)."
    : "Long YouTube video detected! Enter the segment you want to use (2-15 seconds).";

  // Video ref for segment preview
  const videoRef = useRef(null);

  // Handle segment preview
  const handlePreviewSegment = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play();
      // Remove any previous listeners
      videoRef.current.onended = null;
      videoRef.current.ontimeupdate = null;
      // Pause at endTime
      videoRef.current.ontimeupdate = () => {
        if (videoRef.current.currentTime >= endTime) {
          videoRef.current.pause();
          videoRef.current.ontimeupdate = null;
        }
      };
    }
  };

  // Keep sliders and text inputs in sync
  const handleStartSlider = (val) => {
    setStartTimeInput(val);
    // If endTime is less than start+2, bump endTime
    if (parseFloat(endTimeInput) < parseFloat(val) + 2) {
      setEndTimeInput((parseFloat(val) + 2).toString());
    }
  };
  const handleEndSlider = (val) => {
    setEndTimeInput(val);
    // If startTime is more than end-2, lower startTime
    if (parseFloat(startTimeInput) > parseFloat(val) - 2) {
      setStartTimeInput((parseFloat(val) - 2).toString());
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-yellow-600">⚠️</span>
          <p className="text-yellow-700 text-sm">
            <strong>{warningMsg}</strong>
          </p>
        </div>
      </div>

      {/* Video preview for MP4 uploads */}
      {file && (
        <div className="flex flex-col items-center space-y-4">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 12, boxShadow: "0 2px 8px #0001" }}
          />
          {/* Range sliders for segment selection */}
          <div className="flex flex-col items-center space-y-2 w-full">
            <label className="w-full">
              <span className="block text-xs text-gray-600">Start Time: {startTime}s</span>
              <input
                type="range"
                min={0}
                max={Math.max(endTime - 2, 2)}
                value={startTime}
                onChange={e => handleStartSlider(e.target.value)}
                step={0.1}
                className="w-full"
              />
            </label>
            <label className="w-full">
              <span className="block text-xs text-gray-600">End Time: {endTime}s</span>
              <input
                type="range"
                min={Math.min(parseFloat(startTime) + 2, duration - 2)}
                max={duration}
                value={endTime}
                onChange={e => handleEndSlider(e.target.value)}
                step={0.1}
                className="w-full"
              />
            </label>
            <button
              type="button"
              className="mt-2 px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={handlePreviewSegment}
              disabled={segmentInvalid}
            >
              Preview Segment
            </button>
          </div>
        </div>
      )}

      <div className="flex space-x-4">
        <div>
          <label>Start Time (seconds or mm:ss):</label>
          <input
            type="text"
            value={startTimeInput}
            onChange={e => setStartTimeInput(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div>
          <label>End Time (seconds or mm:ss):</label>
          <input
            type="text"
            value={endTimeInput}
            onChange={e => setEndTimeInput(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-700">Duration:</span>
            <div className="text-blue-600">{segmentDuration > 0 ? segmentDuration.toFixed(2) : "--"}s</div>
          </div>
          <div>
            <span className="font-medium text-blue-700">Start:</span>
            <div className="text-blue-600">{!isNaN(startTime) ? startTime : "--"}s</div>
          </div>
          <div>
            <span className="font-medium text-blue-700">End:</span>
            <div className="text-blue-600">{!isNaN(endTime) ? endTime : "--"}s</div>
          </div>
        </div>
        {segmentDuration > 15 && (
          <div className="mt-2 text-red-600 text-sm">⚠️ Segment too long! Maximum 15 seconds allowed.</div>
        )}
        {segmentDuration < 2 && (
          <div className="mt-2 text-red-600 text-sm">⚠️ Segment too short! Minimum 2 seconds required.</div>
        )}
        {endTime > duration && (
          <div className="mt-2 text-red-600 text-sm">⚠️ End time exceeds video duration ({duration}s).</div>
        )}
        {endTime <= startTime && (
          <div className="mt-2 text-red-600 text-sm">⚠️ End time must be after start time.</div>
        )}
      </div>

      <div className="flex justify-between space-x-4">
        <button
          onClick={onCancel}
          className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirmSegment}
          disabled={segmentInvalid}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Use This Segment
        </button>
      </div>
    </div>
  );
};

export default VideoSegmentSelector;