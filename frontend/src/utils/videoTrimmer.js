// Video trimming utility using Web APIs
class VideoTrimmer {
  constructor() {
    this.canvas = document.createElement("canvas")
    this.ctx = this.canvas.getContext("2d")
  }

  async trimVideo(file, startTime, endTime) {
    try {
      console.log(`✂️ Trimming video: ${startTime}s to ${endTime}s`)

      // For now, we'll create a trimmed blob using MediaRecorder
      // This is a simplified approach - in production you might want to use FFmpeg.wasm
      const video = document.createElement("video")
      video.src = URL.createObjectURL(file)

      return new Promise((resolve, reject) => {
        video.onloadedmetadata = async () => {
          try {
            // Set up canvas dimensions
            this.canvas.width = video.videoWidth
            this.canvas.height = video.videoHeight

            // Create MediaRecorder to capture the trimmed segment
            const stream = this.canvas.captureStream(30) // 30 FPS
            const mediaRecorder = new MediaRecorder(stream, {
              mimeType: "video/webm;codecs=vp9",
            })

            const chunks = []

            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                chunks.push(event.data)
              }
            }

            mediaRecorder.onstop = () => {
              const trimmedBlob = new Blob(chunks, { type: "video/webm" })

              // Convert to File object
              const trimmedFile = new File([trimmedBlob], `trimmed_${file.name.replace(".mp4", ".webm")}`, {
                type: "video/webm",
              })

              URL.revokeObjectURL(video.src)
              resolve(trimmedFile)
            }

            mediaRecorder.onerror = (error) => {
              console.error("MediaRecorder error:", error)
              reject(error)
            }

            // Start recording
            mediaRecorder.start()

            // Seek to start time and play
            video.currentTime = startTime
            video.play()

            // Draw frames to canvas
            const drawFrame = () => {
              if (video.currentTime >= endTime) {
                mediaRecorder.stop()
                video.pause()
                return
              }

              this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height)
              requestAnimationFrame(drawFrame)
            }

            video.onseeked = () => {
              drawFrame()
            }
          } catch (error) {
            reject(error)
          }
        }

        video.onerror = () => {
          reject(new Error("Failed to load video for trimming"))
        }
      })
    } catch (error) {
      console.error("Video trimming failed:", error)
      throw error
    }
  }

  // Alternative method: Create a simple segment metadata instead of actual trimming
  createSegmentMetadata(file, startTime, endTime) {
    // Create a new File object with segment metadata
    const segmentFile = new File([file], file.name, { type: file.type })

    // Add custom properties for segment info
    segmentFile.segmentStart = startTime
    segmentFile.segmentEnd = endTime
    segmentFile.isSegmented = true

    return segmentFile
  }
}

export default new VideoTrimmer()
