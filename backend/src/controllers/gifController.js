import fs from "fs"
import path from "path"
import videoService from "../services/videoService.js"
import videoAnalysisService from "../services/videoAnalysisService.js"
import aiService from "../services/aiService.js"
import gifService from "../services/gifService.js"

// Helper function for cleanup
async function cleanupTempFiles(files) {
  if (!files || files.length === 0) return
  console.log(`🗑️ Cleaning up ${files.length} temporary files...`)
  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        await fs.promises.unlink(file)
        console.log(`✅ Deleted temp file: ${file}`)
      }
    } catch (error) {
      console.error(`❌ Failed to delete temp file ${file}:`, error)
    }
  }
}

export const generateGifs = async (req, res) => {
  const startTime = Date.now()
  const tempFiles = []
  try {
    console.log("🚀 Starting GIF generation process...")
    const { prompt, youtubeUrl, segmentStart, segmentEnd } = req.body
    const uploadedFile = req.file

    console.log("📝 Prompt:", prompt)
    console.log("🎥 YouTube URL:", youtubeUrl)
    console.log("📁 Uploaded file:", uploadedFile?.filename)
    console.log(`⏱️ Segment: ${segmentStart}s - ${segmentEnd}s`)

    // Validate input
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Prompt is required and cannot be empty",
      })
    }

    // Validate segment parameters if provided
    let clipStartTime = null
    let clipDuration = null
    if (segmentStart !== undefined && segmentEnd !== undefined) {
      clipStartTime = Number.parseFloat(segmentStart)
      const end = Number.parseFloat(segmentEnd)
      clipDuration = end - clipStartTime

      if (isNaN(clipStartTime) || isNaN(clipDuration) || clipStartTime < 0 || clipDuration <= 0 || clipDuration > 15) {
        return res.status(400).json({
          success: false,
          error: "Invalid segment times. Segment duration must be between 0 and 15 seconds.",
        })
      }
      console.log(`✂️ Requested clip: start=${clipStartTime}s, duration=${clipDuration}s`)
    }

    // Test OpenRouter connection first
    let connectionTest = false
    try {
      connectionTest = await aiService.testConnection()
      if (!connectionTest) {
        console.log("⚠️ OpenRouter connection failed, will use fallback methods")
      }
    } catch (aiError) {
      console.error("❌ AI service connection test failed:", aiError)
      return res.status(500).json({
        success: false,
        error: "AI service is not available. Please check your OpenRouter API key.",
      })
    }

    let videoPath
    let videoInfo
    let transcript
    let isVideoDownloadSuccessful = false // New flag to track video download success

    if (youtubeUrl) {
      console.log("📥 Processing YouTube URL...")
      try {
        const youtubeData = await videoService.getYouTubeData(youtubeUrl)
        videoPath = youtubeData.videoPath
        videoInfo = youtubeData.videoInfo
        transcript = youtubeData.transcript
        isVideoDownloadSuccessful = youtubeData.isDownloadSuccessful

        if (videoPath) {
          tempFiles.push(videoPath) // Add the downloaded video path to tempFiles for cleanup
        }
        console.log("✅ YouTube data processed successfully")
        console.log(`📹 Video duration: ${videoInfo.duration}s`)
        console.log(`🎬 Video title: ${videoInfo.title}`)
        console.log(`📝 Transcript preview: ${transcript.text.substring(0, 200)}...`)

        if (!isVideoDownloadSuccessful) {
          console.warn("⚠️ YouTube video could not be downloaded. Will attempt to generate text-only GIFs.")
        }
      } catch (youtubeError) {
        console.error("❌ YouTube processing failed:", youtubeError)
        await cleanupTempFiles(tempFiles)
        return res.status(500).json({
          success: false,
          error: `Failed to process YouTube data (metadata/transcript): ${youtubeError.message}.`,
        })
      }
    } else if (uploadedFile) {
      console.log("📁 Processing uploaded file...")
      try {
        videoPath = uploadedFile.path
        videoInfo = await videoService.getVideoInfo(videoPath)
        // Extract transcript from uploaded video using video analysis
        console.log("🔍 Analyzing uploaded video content...")
        transcript = await videoAnalysisService.analyzeVideoContent(videoPath, videoInfo.duration, prompt)
        isVideoDownloadSuccessful = true // Always true for uploaded files
      } catch (uploadError) {
        console.error("❌ Uploaded file processing failed:", uploadError)
        return res.status(400).json({
          success: false,
          error: `Failed to process uploaded video: ${uploadError.message}`,
        })
      }
    } else {
      return res.status(400).json({
        success: false,
        error: "Please provide either a YouTube URL or upload a video file",
      })
    }

    // If a segment was specified, create a clip from the downloaded/uploaded video
    let finalVideoPath = videoPath
    if (clipStartTime !== null && clipDuration !== null && isVideoDownloadSuccessful) {
      try {
        console.log(`✂️ Creating video clip from ${videoPath} at ${clipStartTime}s for ${clipDuration}s...`)
        const clippedVideoPath = await videoService.createClip(videoPath, clipStartTime, clipDuration)
        tempFiles.push(clippedVideoPath) // Add clipped video to temp files for cleanup
        finalVideoPath = clippedVideoPath
        // Update videoInfo duration to reflect the clipped duration for AI analysis
        videoInfo.duration = clipDuration
        console.log(`✅ Video clipped successfully to: ${finalVideoPath}`)
      } catch (clipError) {
        console.error("❌ Failed to create video clip:", clipError)
        // If clipping fails, we can still try to proceed with text-only GIFs if transcript is available
        isVideoDownloadSuccessful = false
        finalVideoPath = null
        console.warn("⚠️ Video clipping failed. Will attempt to generate text-only GIFs.")
      }
    }

    console.log("📊 Video info:", videoInfo)
    console.log("📝 Transcript preview:", transcript.text.substring(0, 300) + "...")
    console.log(`DEBUG: finalVideoPath = ${finalVideoPath}`)
    console.log(`DEBUG: isVideoDownloadSuccessful = ${isVideoDownloadSuccessful}`)

    // Analyze transcript with AI
    console.log("🤖 Analyzing transcript with AI...")
    let moments
    try {
      // Pass the potentially updated videoInfo.duration (clipped duration) to AI service
      moments = await aiService.analyzeTranscriptWithTimestamps(transcript, prompt, Number.parseInt(videoInfo.duration))
    } catch (aiAnalysisError) {
      console.error("❌ AI transcript analysis failed:", aiAnalysisError)
      await cleanupTempFiles(tempFiles)
      return res.status(500).json({
        success: false,
        error: `AI analysis failed: ${aiAnalysisError.message}. Please try again or use a different prompt.`,
      })
    }

    console.log("🎬 Moments to process:", JSON.stringify(moments, null, 2))
    if (!moments || moments.length === 0) {
      await cleanupTempFiles(tempFiles)
      return res.status(400).json({
        success: false,
        error: "No suitable moments found for GIF creation. Try a different prompt or video.",
      })
    }

    // Generate GIFs with better error handling
    const gifs = []
    const errors = []
    let generatedTextGifs = false // Flag to track if text GIFs were generated

    for (let i = 0; i < moments.length; i++) {
      const moment = moments[i]
      console.log(`🎬 Processing GIF ${i + 1}/${moments.length}`)
      console.log(`⏱️ Time: ${moment.startTime}s - ${moment.endTime}s`)
      console.log(`💬 Caption: ${moment.caption}`)
      try {
        if (isVideoDownloadSuccessful && finalVideoPath) {
          console.log(`🎨 Creating GIF ${i + 1} from video...`)
          const gif = await gifService.createGif(finalVideoPath, moment, videoInfo)
          gifs.push(gif)
          console.log(`✅ GIF ${i + 1} created successfully (${gif.size})`)
        } else {
          console.log(`🎨 Creating text GIF ${i + 1} (video not available)...`)
          const gif = await gifService.createTextGif(moment, videoInfo) // Use createTextGif
          gifs.push(gif)
          generatedTextGifs = true
          console.log(`✅ Text GIF ${i + 1} created successfully (${gif.size})`)
        }
      } catch (gifError) {
        console.error(`❌ Failed to create GIF ${i + 1}:`, gifError)
        errors.push(`GIF ${i + 1}: ${gifError.message}`)
        // Don't fail the entire process if one GIF fails
        // Continue with the next one
      }
    }

    // Clean up temporary files
    console.log("🗑️ Cleaning up temporary files...")
    await cleanupTempFiles(tempFiles)

    // Clean up browser instances
    try {
      await videoService.cleanup()
    } catch (cleanupError) {
      console.error("❌ Error during service cleanup:", cleanupError)
      // Don't fail the response for cleanup errors
    }

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2)

    if (gifs.length === 0) {
      console.log(`❌ No GIFs were created successfully. Errors: ${errors.join(", ")}`)
      return res.status(500).json({
        success: false,
        error: `Failed to create any GIFs. Errors: ${errors.join(", ")}`,
      })
    }

    let successMessage = `Successfully generated ${gifs.length} GIFs`
    if (generatedTextGifs) {
      successMessage += " (some or all were text-based due to video download issues)"
    }

    console.log(`🎉 ${successMessage} in ${processingTime}s!`)

    res.json({
      success: true,
      message: successMessage,
      gifs: gifs.map((gif) => ({
        id: gif.id,
        caption: gif.caption,
        startTime: gif.startTime,
        endTime: gif.endTime,
        size: gif.size,
        hasCaption: gif.hasCaption,
        url: `/gifs/${gif.id}`,
      })),
      processingTime: `${processingTime}s`,
      videoInfo,
      captionSource: youtubeUrl ? "YouTube Captions + AI Analysis" : "Video Content Analysis",
      errors: errors.length > 0 ? errors : undefined,
      videoContentUsed: isVideoDownloadSuccessful, // Indicate if actual video content was used
    })
  } catch (error) {
    console.error("❌ GIF generation failed:", error)
    console.error("❌ Stack trace:", error.stack)

    // Clean up temporary files on error
    await cleanupTempFiles(tempFiles)

    // Clean up services
    try {
      await videoService.cleanup()
    } catch (cleanupError) {
      console.error("❌ Error during emergency cleanup:", cleanupError)
    }

    // Send error response
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate GIFs",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
}

export const getGif = async (req, res) => {
  try {
    const { id } = req.params
    // Validate ID
    if (!id || id.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "GIF ID is required",
      })
    }

    const gifPath = path.join(process.cwd(), "output", `${id}.gif`)
    console.log(`📁 Looking for GIF: ${gifPath}`)

    if (!fs.existsSync(gifPath)) {
      console.log(`❌ GIF not found: ${gifPath}`)
      return res.status(404).json({
        success: false,
        error: "GIF not found",
      })
    }

    const stats = fs.statSync(gifPath)
    console.log(`✅ Serving GIF: ${gifPath} (${Math.round(stats.size / 1024)}KB)`)

    res.setHeader("Content-Type", "image/gif")
    res.setHeader("Cache-Control", "public, max-age=31536000")
    res.setHeader("Content-Length", stats.size)

    // Use stream for better memory management
    const stream = fs.createReadStream(gifPath)
    stream.pipe(res)

    stream.on("error", (error) => {
      console.error("❌ Error streaming GIF:", error)
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: "Failed to stream GIF",
        })
      }
    })
  } catch (error) {
    console.error("❌ Error serving GIF:", error)
    console.error("❌ Stack trace:", error.stack)
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Failed to serve GIF",
      })
    }
  }
}
