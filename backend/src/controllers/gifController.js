import fs from "fs"
import path from "path"
import videoService from "../services/videoService.js"
import videoAnalysisService from "../services/videoAnalysisService.js"
import aiService from "../services/aiService.js"
import gifService from "../services/gifService.js"

export const generateGifs = async (req, res) => {
  const startTime = Date.now()
  const tempFiles = []

  try {
    console.log("🚀 Starting CONTEXT-AWARE GIF generation process...")
    const { prompt, youtubeUrl } = req.body
    const uploadedFile = req.file

    console.log("📝 User Prompt:", prompt)
    console.log("🎥 YouTube URL:", youtubeUrl)
    console.log("📁 Uploaded file:", uploadedFile?.filename)

    // Validate input
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Please provide a prompt describing what kind of GIF you want",
      })
    }

    // Test OpenRouter connection first
    const connectionTest = await aiService.testConnection()
    if (!connectionTest) {
      console.log("⚠️ OpenRouter connection failed, will use enhanced fallback methods")
    }

    let videoPath
    let videoInfo
    let transcript
    let contentSource = "Unknown"

    if (youtubeUrl) {
      console.log("📥 Downloading from YouTube...")
      const result = await videoService.downloadFromYoutube(youtubeUrl)
      videoPath = result.videoPath
      videoInfo = result.videoInfo
      tempFiles.push(videoPath)

      // Try YouTube captions first, then enhanced video analysis
      console.log("📝 Attempting to get YouTube captions...")
      try {
        transcript = await videoService.downloadYoutubeCaptions(youtubeUrl)
        console.log("✅ YouTube captions downloaded successfully")
        console.log(`📝 Caption preview: ${transcript.text.substring(0, 200)}...`)
        contentSource = "YouTube Captions"
      } catch (captionError) {
        console.log("⚠️ YouTube captions not available, using enhanced video analysis...")
        transcript = await videoAnalysisService.analyzeVideoContent(videoPath, videoInfo.duration, prompt)
        contentSource = "Enhanced Video Analysis"
      }
    } else if (uploadedFile) {
      console.log("📁 Using uploaded file...")
      videoPath = uploadedFile.path
      videoInfo = await videoService.getVideoInfo(videoPath)

      // For uploaded files, use enhanced video analysis
      console.log("🔍 Analyzing uploaded video content with AI vision...")
      transcript = await videoAnalysisService.analyzeVideoContent(videoPath, videoInfo.duration, prompt)
      contentSource = "Enhanced Video Analysis"
    } else {
      return res.status(400).json({
        success: false,
        error: "Please provide either a YouTube URL or upload a video file",
      })
    }

    console.log("📊 Video info:", videoInfo)
    console.log("📝 Enhanced transcript preview:", transcript.text.substring(0, 300) + "...")

    // Validate video duration
    const videoDuration = Number.parseInt(videoInfo.duration)
    if (videoDuration < 2) {
      return res.status(400).json({
        success: false,
        error: "Video is too short (minimum 2 seconds required)",
      })
    }

    if (videoDuration > 600) {
      // 10 minutes
      return res.status(400).json({
        success: false,
        error: "Video is too long (maximum 10 minutes allowed)",
      })
    }

    // CONTEXT-AWARE AI analysis
    console.log("🤖 Analyzing content with CONTEXT-AWARE AI...")
    const moments = await analyzeContentWithContextAwareness(transcript, prompt, videoDuration)

    console.log("🎬 Final contextual moments to process:", JSON.stringify(moments, null, 2))

    if (!moments || moments.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No suitable moments found for GIF creation. Try a different prompt or video.",
      })
    }

    // Validate moments before processing
    const validMoments = validateAndFilterMoments(moments, videoDuration)
    if (validMoments.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Generated moments are invalid. Please try a different prompt.",
      })
    }

    // Generate GIFs with enhanced error handling
    const gifs = []
    const errors = []
    const processedMoments = []

    for (let i = 0; i < validMoments.length; i++) {
      const moment = validMoments[i]
      console.log(`🎬 Processing GIF ${i + 1}/${validMoments.length}`)
      console.log(`⏱️ Time: ${moment.startTime}s - ${moment.endTime}s`)
      console.log(`💬 Contextual Caption: ${moment.caption}`)

      try {
        console.log(`🎨 Creating GIF ${i + 1} with contextual processing...`)
        const gif = await gifService.createGif(videoPath, moment)

        // Validate created GIF
        if (gif && gif.id && fs.existsSync(path.join(process.cwd(), "output", `${gif.id}.gif`))) {
          gifs.push(gif)
          processedMoments.push(moment)
          console.log(`✅ Contextual GIF ${i + 1} created successfully (${gif.size})`)
        } else {
          throw new Error("GIF file was not created properly")
        }
      } catch (error) {
        console.error(`❌ Failed to create GIF ${i + 1}:`, error)
        errors.push(`GIF ${i + 1} (${moment.startTime}s-${moment.endTime}s): ${error.message}`)

        // Try to create a fallback GIF with adjusted parameters
        try {
          console.log(`🔄 Attempting fallback GIF creation for moment ${i + 1}...`)
          const fallbackMoment = {
            ...moment,
            startTime: Math.max(0, moment.startTime - 0.5),
            endTime: Math.min(videoDuration, moment.endTime + 0.5),
          }

          const fallbackGif = await gifService.createGif(videoPath, fallbackMoment)
          if (fallbackGif && fallbackGif.id) {
            gifs.push(fallbackGif)
            processedMoments.push(fallbackMoment)
            console.log(`✅ Fallback GIF ${i + 1} created successfully`)
          }
        } catch (fallbackError) {
          console.error(`❌ Fallback GIF creation also failed:`, fallbackError)
        }
      }
    }

    // Clean up temporary files
    console.log("🗑️ Cleaning up temporary files...")
    await cleanupTempFiles(tempFiles)

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2)

    if (gifs.length === 0) {
      console.log(`❌ No GIFs were created successfully. Errors: ${errors.join(", ")}`)
      return res.status(500).json({
        success: false,
        error: `Failed to create any GIFs. This might be due to video format issues or timing problems. Errors: ${errors.join(", ")}`,
      })
    }

    // Calculate success rate
    const successRate = ((gifs.length / validMoments.length) * 100).toFixed(1)
    console.log(
      `🎉 Successfully generated ${gifs.length}/${validMoments.length} CONTEXTUAL GIFs (${successRate}% success rate) in ${processingTime}s!`,
    )

    res.json({
      success: true,
      message: `Successfully generated ${gifs.length} contextual GIFs`,
      gifs: gifs.map((gif, index) => ({
        id: gif.id,
        caption: gif.caption,
        startTime: gif.startTime,
        endTime: gif.endTime,
        duration: gif.endTime - gif.startTime,
        size: gif.size,
        hasCaption: gif.hasCaption,
        url: `/gifs/${gif.id}`,
        moment: processedMoments[index] || {},
      })),
      processingTime: `${processingTime}s`,
      successRate: `${successRate}%`,
      videoInfo: {
        ...videoInfo,
        contentSource,
        analyzedSegments: transcript.segments ? transcript.segments.length : 0,
      },
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("❌ GIF generation failed:", error)
    // Clean up temporary files on error
    await cleanupTempFiles(tempFiles)

    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate GIFs",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
}

// CONTEXT-AWARE content analysis
async function analyzeContentWithContextAwareness(transcript, prompt, videoDuration) {
  try {
    console.log("🎯 Starting CONTEXT-AWARE analysis...")
    console.log(`🎯 Looking for "${prompt}" in video content...`)

    // First, try the enhanced AI analysis with context awareness
    const aiMoments = await aiService.analyzeTranscriptWithTimestamps(transcript, prompt, videoDuration)

    // Validate AI response quality with context awareness
    if (aiMoments && aiMoments.length > 0) {
      const validAiMoments = aiMoments.filter(
        (moment) =>
          moment.startTime >= 0 &&
          moment.endTime <= videoDuration &&
          moment.startTime < moment.endTime &&
          moment.caption &&
          moment.caption.trim().length > 0 &&
          // Additional context validation
          isContextuallyRelevant(moment.caption, prompt, transcript),
      )

      if (validAiMoments.length >= 2) {
        console.log("✅ Context-aware AI analysis successful")
        console.log(`🎯 Generated contextual captions: ${validAiMoments.map((m) => m.caption).join(", ")}`)
        return validAiMoments.slice(0, 3)
      }
    }

    console.log("⚠️ AI analysis didn't provide contextual moments, creating enhanced contextual fallback...")

    // Create enhanced fallback moments based on actual content
    return createContextualFallbackMoments(transcript, prompt, videoDuration)
  } catch (error) {
    console.error("❌ Context-aware analysis failed:", error)
    return createContextualFallbackMoments(transcript, prompt, videoDuration)
  }
}

// Check if caption is contextually relevant
function isContextuallyRelevant(caption, prompt, transcript) {
  const captionLower = caption.toLowerCase()
  const promptLower = prompt.toLowerCase()
  const transcriptLower = transcript.text.toLowerCase()

  // Check if caption relates to prompt
  const promptWords = promptLower.split(" ")
  const hasPromptRelation = promptWords.some((word) => word.length > 2 && captionLower.includes(word))

  // Check if caption relates to actual content
  const captionWords = captionLower.split(" ")
  const hasContentRelation = captionWords.some((word) => word.length > 3 && transcriptLower.includes(word))

  return hasPromptRelation || hasContentRelation
}

// Enhanced contextual fallback moment creation
function createContextualFallbackMoments(transcript, prompt, videoDuration) {
  const moments = []
  const promptLower = prompt.toLowerCase()

  console.log(`🎯 Creating contextual fallback for prompt: "${prompt}"`)

  // Analyze transcript for key moments that match the prompt
  const segments = transcript.segments || []
  const contextualCaptions = extractPromptRelevantCaptions(transcript, prompt)

  console.log(`🎯 Extracted contextual captions: ${contextualCaptions.join(", ")}`)

  if (videoDuration >= 9) {
    // For longer videos, spread moments strategically
    const positions = [
      { start: 0, priority: "opening" },
      { start: Math.floor(videoDuration * 0.4), priority: "middle" },
      { start: Math.max(0, videoDuration - 4), priority: "ending" },
    ]

    positions.forEach((pos, index) => {
      const duration = Math.min(3, videoDuration - pos.start)
      const relevantSegment = findRelevantSegment(segments, pos.start, pos.start + duration)

      moments.push({
        startTime: pos.start,
        endTime: pos.start + duration,
        caption: contextualCaptions[index] || generateContextualCaption(relevantSegment, prompt, pos.priority),
        reason: `Contextual ${pos.priority} moment matching "${prompt}"`,
        confidence: relevantSegment ? "high" : "medium",
      })
    })
  } else if (videoDuration >= 6) {
    // For medium videos, create overlapping moments
    for (let i = 0; i < 3; i++) {
      const start = Math.floor((i * (videoDuration - 2)) / 2)
      const duration = Math.min(2, videoDuration - start)
      const relevantSegment = findRelevantSegment(segments, start, start + duration)

      moments.push({
        startTime: start,
        endTime: start + duration,
        caption: contextualCaptions[i] || generateContextualCaption(relevantSegment, prompt, `moment ${i + 1}`),
        reason: `Contextual moment based on "${prompt}" theme`,
        confidence: "medium",
      })
    }
  } else {
    // For short videos, create strategic segments
    const segmentDuration = Math.max(1.5, videoDuration / 3)
    for (let i = 0; i < 3; i++) {
      const start = Math.floor((i * videoDuration) / 4)
      const duration = Math.min(segmentDuration, videoDuration - start)
      const relevantSegment = findRelevantSegment(segments, start, start + duration)

      moments.push({
        startTime: start,
        endTime: start + duration,
        caption: contextualCaptions[i] || generateContextualCaption(relevantSegment, prompt, `quick ${i + 1}`),
        reason: `Short video contextual segment for "${prompt}"`,
        confidence: "medium",
      })
    }
  }

  console.log(`📊 Created ${moments.length} contextual fallback moments`)
  return moments
}

// Extract captions that are relevant to the prompt from actual content
function extractPromptRelevantCaptions(transcript, prompt) {
  const captions = []
  const promptLower = prompt.toLowerCase()
  const promptWords = promptLower.split(" ").filter((word) => word.length > 2)

  // Strategy 1: Look for exact matches in transcript
  const segments = transcript.segments || []
  segments.forEach((segment) => {
    const segmentLower = segment.text.toLowerCase()

    // Check if segment contains prompt words
    const hasPromptWord = promptWords.some((word) => segmentLower.includes(word))
    if (hasPromptWord) {
      // Extract relevant phrase
      const words = segment.text.split(" ")
      if (words.length <= 4) {
        captions.push(segment.text)
      } else {
        // Find the prompt word and extract context around it
        const promptWordIndex = words.findIndex((word) =>
          promptWords.some((pWord) => word.toLowerCase().includes(pWord)),
        )
        if (promptWordIndex !== -1) {
          const start = Math.max(0, promptWordIndex - 1)
          const end = Math.min(words.length, promptWordIndex + 3)
          captions.push(words.slice(start, end).join(" "))
        }
      }
    }
  })

  // Strategy 2: Create thematic variations based on prompt
  if (captions.length < 3) {
    if (promptLower.includes("perfect")) {
      captions.push("Perfect", "It was perfect", "Perfect moment")
    } else if (promptLower.includes("amazing")) {
      captions.push("Amazing", "So amazing", "Amazing moment")
    } else if (promptLower.includes("funny")) {
      captions.push("So funny", "Hilarious", "That's funny")
    } else if (promptLower.includes("great")) {
      captions.push("Great", "So great", "Great moment")
    } else {
      // Use the prompt itself as base
      captions.push(prompt, `${prompt} vibes`, `${prompt} moment`)
    }
  }

  // Ensure we have exactly 3 unique captions
  const uniqueCaptions = [...new Set(captions)]
  while (uniqueCaptions.length < 3) {
    uniqueCaptions.push(`${prompt} ${uniqueCaptions.length + 1}`)
  }

  return uniqueCaptions.slice(0, 3)
}

// Generate contextual caption based on segment and prompt
function generateContextualCaption(segment, prompt, context) {
  if (segment && segment.text) {
    const segmentWords = segment.text.split(" ")
    const promptLower = prompt.toLowerCase()

    // If segment is short, use it directly
    if (segmentWords.length <= 3) {
      return segment.text
    }

    // Try to combine segment content with prompt theme
    if (promptLower.includes("perfect") && segment.text.toLowerCase().includes("perfect")) {
      return segment.text.split(" ").find((word) => word.toLowerCase().includes("perfect")) || "Perfect"
    }

    // Extract meaningful phrase from segment
    return segmentWords.slice(0, 3).join(" ")
  }

  return `${prompt} ${context}`
}

// Find relevant segment for a time range
function findRelevantSegment(segments, startTime, endTime) {
  return segments.find(
    (segment) =>
      (segment.start <= startTime && segment.end >= endTime) ||
      (segment.start >= startTime && segment.start < endTime) ||
      (segment.end > startTime && segment.end <= endTime),
  )
}

// Validate and filter moments
function validateAndFilterMoments(moments, videoDuration) {
  return moments.filter((moment) => {
    // Basic validation
    if (typeof moment.startTime !== "number" || typeof moment.endTime !== "number") {
      console.log(`⚠️ Invalid moment timing: ${JSON.stringify(moment)}`)
      return false
    }

    // Time range validation
    if (moment.startTime < 0 || moment.endTime > videoDuration) {
      console.log(`⚠️ Moment out of video range: ${moment.startTime}s-${moment.endTime}s`)
      return false
    }

    // Duration validation
    const duration = moment.endTime - moment.startTime
    if (duration < 1 || duration > 5) {
      console.log(`⚠️ Invalid moment duration: ${duration}s`)
      return false
    }

    // Caption validation
    if (!moment.caption || moment.caption.trim().length === 0) {
      console.log(`⚠️ Missing caption for moment: ${moment.startTime}s-${moment.endTime}s`)
      return false
    }

    return true
  })
}

// Enhanced cleanup function
async function cleanupTempFiles(tempFiles) {
  const cleanupPromises = tempFiles.map(async (filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath)
        console.log(`🗑️ Cleaned up: ${path.basename(filePath)}`)
      }
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup ${filePath}:`, error.message)
    }
  })

  await Promise.allSettled(cleanupPromises)
}

export const getGif = async (req, res) => {
  try {
    const { id } = req.params
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
    res.setHeader("Cache-Control", "public, max-age=31536000") // Cache for 1 year
    res.setHeader("Content-Length", stats.size)
    res.sendFile(path.resolve(gifPath))
  } catch (error) {
    console.error("❌ Error serving GIF:", error)
    res.status(500).json({
      success: false,
      error: "Failed to serve GIF",
    })
  }
}
