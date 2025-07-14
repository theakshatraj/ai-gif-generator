"use client"

import { useState } from "react";

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

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-yellow-600">⚠️</span>
          <p className="text-yellow-700 text-sm">
            <strong>Long YouTube video detected!</strong> Enter the segment you want to use (2-15 seconds).
          </p>
        </div>
      </div>

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