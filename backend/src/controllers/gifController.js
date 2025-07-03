import fs from "fs"
import path from "path"
import videoService from "../services/videoService.js"
import videoAnalysisService from "../services/videoAnalysisService.js"
import visualContextService from "../services/visualContextService.js"
import aiService from "../services/aiService.js"
import gifService from "../services/gifService.js"
import validationService from "../services/validationService.js"

export const generateGifs = async (req, res) => {
  const startTime = Date.now()
  const tempFiles = []

  try {
    console.log("🚀 Starting enhanced GIF generation for both video types...")
    const { prompt, youtubeUrl } = req.body
    const uploadedFile = req.file

    console.log("📝 Prompt:", prompt)
    console.log("🎥 YouTube URL:", youtubeUrl)
    console.log("📁 Uploaded file:", uploadedFile?.filename)

    let videoPath, videoInfo, transcript, analysisData

    if (youtubeUrl) {
      console.log("📥 Downloading from YouTube...")
      const result = await videoService.downloadFromYoutube(youtubeUrl)
      videoPath = result.videoPath
      videoInfo = result.videoInfo
      tempFiles.push(videoPath)

      // Try YouTube captions first (for dialogue videos)
      console.log("📝 Attempting to download YouTube captions...")
      try {
        transcript = await videoService.downloadYoutubeCaptions(youtubeUrl)
        console.log("✅ YouTube captions found - treating as dialogue video")
      } catch (captionError) {
        console.log("⚠️ No YouTube captions - analyzing as visual video...")
        // Use visual context analysis for non-dialogue videos
        transcript = await visualContextService.analyzeVisualContent(videoPath, videoInfo.duration, prompt)
        console.log("✅ Visual content analysis completed")
      }

      // Always run technical analysis for additional context
      console.log("🔍 Running technical video analysis...")
      const videoAnalysis = await videoAnalysisService.analyzeVideoContent(videoPath, videoInfo.duration, prompt)
      analysisData = videoAnalysis.analysisMetadata
    } else if (uploadedFile) {
      console.log("📁 Processing uploaded file...")
      videoPath = uploadedFile.path
      videoInfo = await videoService.getVideoInfo(videoPath)

      // For uploaded files, try to detect if it has meaningful audio/dialogue
      console.log("🔍 Analyzing uploaded video content...")

      // First, try basic video analysis to understand content type
      const basicAnalysis = await videoAnalysisService.analyzeVideoContent(videoPath, videoInfo.duration, prompt)

      // Check if it might have dialogue (basic audio analysis)
      const hasSignificantAudio = basicAnalysis.analysisMetadata?.audioSegments > 0

      if (hasSignificantAudio) {
        console.log("🎵 Audio detected - attempting transcription analysis...")
        // Could potentially use Whisper or other transcription here
        transcript = basicAnalysis // Use basic analysis as transcript
      } else {
        console.log("👁️ Limited audio - using visual content analysis...")
        transcript = await visualContextService.analyzeVisualContent(videoPath, videoInfo.duration, prompt)
      }

      analysisData = basicAnalysis.analysisMetadata
    } else {
      return res.status(400).json({
        success: false,
        error: "Please provide either a YouTube URL or upload a video file",
      })
    }

    console.log("📊 Video info:", videoInfo)
    console.log("📝 Content analysis preview:", transcript.text.substring(0, 300) + "...")

    // ENHANCED: AI analysis now automatically detects and handles both video types
    console.log("🧠 Running enhanced AI analysis for video type detection...")
    const moments = await aiService.analyzeVideoContentWithPrompt(
      transcript,
      prompt,
      Number.parseInt(videoInfo.duration),
      analysisData,
    )

    console.log("🎬 AI selected moments:", JSON.stringify(moments, null, 2))

    if (!moments || moments.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No contextually relevant moments found. The video content may not match your prompt theme.",
      })
    }

    // Generate GIFs with type-aware processing
    const gifs = []
    const errors = []

    for (let i = 0; i < moments.length; i++) {
      const moment = moments[i]
      console.log(`🎬 Processing ${moment.videoType || "unknown"} GIF ${i + 1}/${moments.length}`)
      console.log(`⏱️ Time: ${moment.startTime}s - ${moment.endTime}s`)
      console.log(`💬 Caption: ${moment.caption}`)
      console.log(`🎯 Reason: ${moment.reason}`)
      console.log(`📊 Confidence: ${moment.confidence}`)

      try {
        const gif = await gifService.createGif(videoPath, moment)
        gifs.push(gif)
        console.log(`✅ ${moment.videoType || "Contextual"} GIF ${i + 1} created successfully (${gif.size})`)
      } catch (error) {
        console.error(`❌ Failed to create GIF ${i + 1}:`, error)
        errors.push(`GIF ${i + 1}: ${error.message}`)
      }
    }

    // Cleanup
    console.log("🗑️ Cleaning up temporary files...")
    visualContextService.cleanup()
    for (const tempFile of tempFiles) {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile)
          console.log(`🗑️ Cleaned up: ${path.basename(tempFile)}`)
        }
      } catch (error) {
        console.error(`❌ Failed to clean up ${tempFile}:`, error)
      }
    }

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2)

    if (gifs.length === 0) {
      return res.status(500).json({
        success: false,
        error: `Failed to create contextually relevant GIFs. Errors: ${errors.join(", ")}`,
      })
    }

    // Enhanced validation
    const validation = await validationService.validateGifGeneration(prompt, videoInfo, transcript, moments, gifs)

    // Determine video type for response
    const detectedVideoType = moments[0]?.videoType || "unknown"

    res.json({
      success: true,
      message: `Successfully generated ${gifs.length} contextually relevant GIFs`,
      videoType: detectedVideoType,
      gifs: gifs.map((gif) => ({
        id: gif.id,
        caption: gif.caption,
        startTime: gif.startTime,
        endTime: gif.endTime,
        size: gif.size,
        hasCaption: gif.hasCaption,
        url: `/gifs/${gif.id}`,
        confidence: gif.confidence,
        reason: gif.reason,
        videoType: gif.videoType || detectedVideoType,
      })),
      processingTime: `${processingTime}s`,
      videoInfo,
      analysisMethod: detectedVideoType === "dialogue" ? "Dialogue + Transcript Analysis" : "Visual Content Analysis",
      validation: {
        overallScore: validation.results.overallScore,
        videoTypeDetection: detectedVideoType,
      },
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("❌ Enhanced GIF generation failed:", error)

    // Cleanup on error
    visualContextService.cleanup()
    for (const tempFile of tempFiles) {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile)
        }
      } catch (cleanupError) {
        console.error(`❌ Failed to clean up ${tempFile}:`, cleanupError)
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate contextually relevant GIFs",
    })
  }
}

export const getGif = async (req, res) => {
  try {
    const { id } = req.params
    const gifPath = path.join(process.cwd(), "output", `${id}.gif`)

    if (!fs.existsSync(gifPath)) {
      return res.status(404).json({
        success: false,
        error: "GIF not found",
      })
    }

    const stats = fs.statSync(gifPath)
    console.log(`✅ Serving GIF: ${gifPath} (${Math.round(stats.size / 1024)}KB)`)

    res.setHeader("Content-Type", "image/gif")
    res.setHeader("Cache-Control", "public, max-age=31536000")
    res.sendFile(path.resolve(gifPath))
  } catch (error) {
    console.error("❌ Error serving GIF:", error)
    res.status(500).json({
      success: false,
      error: "Failed to serve GIF",
    })
  }
}
