import fs from "fs/promises"
import path from "path"
import videoService from "../services/videoService.js"
import videoAnalysisService from "../services/videoAnalysisService.js"
import aiService from "../services/aiService.js"
import gifService from "../services/gifService.js"

export const generateGifs = async (req, res) => {
  const startTime = Date.now()
  const tempFiles = []

  try {
    console.log("🚀 Starting GIF generation process...")
    const { prompt, youtubeUrl } = req.body
    const uploadedFile = req.file

    console.log("📝 Prompt:", prompt)
    console.log("🎥 YouTube URL:", youtubeUrl)
    console.log("📁 Uploaded file:", uploadedFile?.filename)

    // Test AI service connection (supports both OpenRouter and OpenAI)
    const connectionTest = await aiService.testConnection()
    if (!connectionTest) {
      console.log("⚠️ AI service connection failed, will use fallback methods")
    }

    let videoPath
    let videoInfo
    let transcript

    if (youtubeUrl) {
      console.log("📥 Downloading from YouTube...")

      try {
        const result = await videoService.downloadFromYoutube(youtubeUrl)
        videoPath = result.videoPath
        videoInfo = result.videoInfo
        tempFiles.push(videoPath)

        // Try YouTube captions first
        console.log("📝 Downloading YouTube captions...")
        try {
          transcript = await videoService.downloadYoutubeCaptions(youtubeUrl)
          console.log("✅ YouTube captions downloaded successfully")
          console.log(`📝 Caption preview: ${transcript.text.substring(0, 200)}...`)
        } catch (captionError) {
          console.log("⚠️ YouTube captions not available, analyzing video content...")
          transcript = await videoAnalysisService.analyzeVideoContent(videoPath, videoInfo.duration, prompt)
        }
      } catch (downloadError) {
        console.error("❌ YouTube download failed:", downloadError)

        // Provide helpful error message based on Railway environment
        let errorMessage = "Failed to download video from YouTube"
        let suggestions = []

        if (downloadError.message.includes("Sign in to confirm")) {
          errorMessage = "YouTube is blocking the download due to bot detection"
          suggestions = [
            "Make sure YTDLP_COOKIES environment variable is set in Railway",
            "Try again in a few minutes",
            "The video might be age-restricted or require authentication",
            "Try uploading the video file directly instead",
          ]
        } else if (downloadError.message.includes("Video unavailable")) {
          errorMessage = "Video is unavailable, private, or has been removed"
          suggestions = ["Check if the video URL is correct and publicly accessible"]
        } else if (downloadError.message.includes("timeout")) {
          errorMessage = "Download timeout - the video might be too long or connection is slow"
          suggestions = ["Try again with a shorter video", "Check your internet connection"]
        }

        return res.status(400).json({
          success: false,
          error: errorMessage,
          details: downloadError.message,
          suggestions,
          railway: {
            cookiesConfigured: !!process.env.YTDLP_COOKIES,
            environment: process.env.RAILWAY_ENVIRONMENT_NAME,
          },
        })
      }
    } else if (uploadedFile) {
      console.log("📁 Using uploaded file...")
      videoPath = uploadedFile.path
      videoInfo = await videoService.getVideoInfo(videoPath)

      // For uploaded files, analyze video content
      console.log("🔍 Analyzing uploaded video content...")
      transcript = await videoAnalysisService.analyzeVideoContent(videoPath, videoInfo.duration, prompt)
    } else {
      return res.status(400).json({
        success: false,
        error: "Please provide either a YouTube URL or upload a video file",
      })
    }

    console.log("📊 Video info:", videoInfo)
    console.log("📝 Enhanced transcript preview:", transcript.text.substring(0, 300) + "...")

    // Analyze transcript with AI using enhanced content
    console.log("🤖 Analyzing enhanced transcript with AI...")
    const moments = await aiService.analyzeTranscriptWithTimestamps(
      transcript,
      prompt,
      Number.parseInt(videoInfo.duration),
    )

    console.log("🎬 Final moments to process:", JSON.stringify(moments, null, 2))

    if (!moments || moments.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No suitable moments found for GIF creation",
      })
    }

    // Generate GIFs directly from original video
    const gifs = []
    const errors = []

    for (let i = 0; i < moments.length; i++) {
      const moment = moments[i]
      console.log(`🎬 Processing GIF ${i + 1}/${moments.length}`)
      console.log(`⏱️ Time: ${moment.startTime}s - ${moment.endTime}s`)
      console.log(`💬 Caption: ${moment.caption}`)

      try {
        // Create GIF directly from original video
        console.log(`🎨 Creating GIF ${i + 1} directly from video...`)
        const gif = await gifService.createGif(videoPath, moment)
        gifs.push(gif)
        console.log(`✅ GIF ${i + 1} created successfully (${gif.size})`)
      } catch (error) {
        console.error(`❌ Failed to create GIF ${i + 1}:`, error)
        errors.push(`GIF ${i + 1}: ${error.message}`)
        // Continue with other GIFs instead of failing completely
      }
    }

    // Clean up temporary files
    console.log("🗑️ Cleaning up temporary files...")
    await videoService.cleanupTempFiles(tempFiles)

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2)

    if (gifs.length === 0) {
      console.log(`❌ No GIFs were created successfully. Errors: ${errors.join(", ")}`)
      return res.status(500).json({
        success: false,
        error: `Failed to create any GIFs. Errors: ${errors.join(", ")}`,
      })
    }

    console.log(`🎉 Successfully generated ${gifs.length} GIFs in ${processingTime}s!`)

    res.json({
      success: true,
      message: `Successfully generated ${gifs.length} GIFs`,
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
      captionSource: youtubeUrl ? "YouTube Captions + Video Analysis" : "Video Content Analysis",
      errors: errors.length > 0 ? errors : undefined,
      railway: {
        environment: process.env.RAILWAY_ENVIRONMENT_NAME,
        deploymentId: process.env.RAILWAY_DEPLOYMENT_ID,
      },
    })
  } catch (error) {
    console.error("❌ GIF generation failed:", error)

    // Clean up temporary files on error
    await videoService.cleanupTempFiles(tempFiles)

    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate GIFs",
      railway: {
        environment: process.env.RAILWAY_ENVIRONMENT_NAME,
      },
    })
  }
}

export const getGif = async (req, res) => {
  try {
    const { id } = req.params
    // Use environment variable for output directory
    const outputDir = process.env.OUTPUT_DIR || path.join(process.cwd(), "output")
    const gifPath = path.join(outputDir, `${id}.gif`)

    console.log(`📁 Looking for GIF: ${gifPath}`)

    // Use async fs to check if file exists
    try {
      await fs.access(gifPath)
    } catch {
      console.log(`❌ GIF not found: ${gifPath}`)
      return res.status(404).json({
        success: false,
        error: "GIF not found",
      })
    }

    const stats = await fs.stat(gifPath)
    console.log(`✅ Serving GIF: ${gifPath} (${Math.round(stats.size / 1024)}KB)`)

    res.setHeader("Content-Type", "image/gif")
    res.setHeader("Cache-Control", "public, max-age=31536000") // Cache for 1 year
    res.sendFile(path.resolve(gifPath))
  } catch (error) {
    console.error("❌ Error serving GIF:", error)
    res.status(500).json({
      success: false,
      error: "Failed to serve GIF",
    })
  }
}
