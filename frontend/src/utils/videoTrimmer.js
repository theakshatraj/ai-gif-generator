// This utility is for client-side marking of a file with segment info.
// The actual video clipping will happen on the backend.
export const createSegmentMetadata = (originalFile, startTime, endTime) => {
  // Create a new File object or extend the existing one with segment properties
  const segmentedFile = new File([originalFile], originalFile.name, {
    type: originalFile.type,
    lastModified: originalFile.lastModified,
  })

  // Attach custom properties to indicate it's a segmented file
  segmentedFile.isSegmented = true
  segmentedFile.segmentStart = startTime
  segmentedFile.segmentEnd = endTime

  return segmentedFile
}

export const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
}
