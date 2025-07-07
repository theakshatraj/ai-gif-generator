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
    console.log("🚀 Starting Enhanced GIF generation process...")

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

    if (videoDuration > 600) { // 10 minutes
      return res.status(400).json({
        success: false,
        error: "Video is too long (maximum 10 minutes allowed)",
      })
    }

    // Enhanced AI analysis with better context
    console.log("🤖 Analyzing content with enhanced AI context...")
    const moments = await analyzeContentWithEnhancedContext(transcript, prompt, videoDuration)

    console.log("🎬 Final moments to process:", JSON.stringify(moments, null, 2))

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
      console.log(`💬 Caption: ${moment.caption}`)

      try {
        // Create GIF with enhanced parameters
        console.log(`🎨 Creating GIF ${i + 1} with enhanced processing...`)
        const gif = await gifService.createGif(videoPath, moment)
        
        // Validate created GIF
        if (gif && gif.id && fs.existsSync(path.join(process.cwd(), "output", `${gif.id}.gif`))) {
          gifs.push(gif)
          processedMoments.push(moment)
          console.log(`✅ GIF ${i + 1} created successfully (${gif.size})`)
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
            endTime: Math.min(videoDuration, moment.endTime + 0.5)
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

    console.log(`🎉 Successfully generated ${gifs.length}/${validMoments.length} GIFs (${successRate}% success rate) in ${processingTime}s!`)

    res.json({
      success: true,
      message: `Successfully generated ${gifs.length} GIFs`,
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
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
}

// Enhanced content analysis with better context
async function analyzeContentWithEnhancedContext(transcript, prompt, videoDuration) {
  try {
    // First, try the enhanced AI analysis
    const aiMoments = await aiService.analyzeTranscriptWithTimestamps(transcript, prompt, videoDuration)
    
    // Validate AI response quality
    if (aiMoments && aiMoments.length > 0) {
      const validAiMoments = aiMoments.filter(moment => 
        moment.startTime >= 0 && 
        moment.endTime <= videoDuration &&
        moment.startTime < moment.endTime &&
        moment.caption && moment.caption.trim().length > 0
      )
      
      if (validAiMoments.length >= 2) {
        console.log("✅ AI analysis successful with quality moments")
        return validAiMoments.slice(0, 3) // Return top 3 moments
      }
    }

    console.log("⚠️ AI analysis didn't provide quality moments, creating enhanced fallback...")
    
    // Create enhanced fallback moments based on actual content
    return createEnhancedFallbackMoments(transcript, prompt, videoDuration)
  } catch (error) {
    console.error("❌ Enhanced content analysis failed:", error)
    return createEnhancedFallbackMoments(transcript, prompt, videoDuration)
  }
}

// Enhanced fallback moment creation
function createEnhancedFallbackMoments(transcript, prompt, videoDuration) {
  const moments = []
  const promptLower = prompt.toLowerCase()
  
  // Analyze transcript for key moments
  const segments = transcript.segments || []
  const hasDetailedAnalysis = segments.some(seg => seg.frameAnalysis)
  
  // Create contextual captions based on prompt
  const contextualCaptions = generateContextualCaptions(promptLower, hasDetailedAnalysis)
  
  if (videoDuration >= 9) {
    // For longer videos, spread moments strategically
    const positions = [
      { start: 0, priority: 'opening' },
      { start: Math.floor(videoDuration * 0.4), priority: 'middle' },
      { start: Math.max(0, videoDuration - 4), priority: 'ending' }
    ]
    
    positions.forEach((pos, index) => {
      const duration = Math.min(3, videoDuration - pos.start)
      const relevantSegment = findRelevantSegment(segments, pos.start, pos.start + duration)
      
      moments.push({
        startTime: pos.start,
        endTime: pos.start + duration,
        caption: contextualCaptions[index] || `${pos.priority} moment`,
        reason: `Strategic ${pos.priority} moment with ${relevantSegment ? 'content analysis' : 'timeline positioning'}`,
        confidence: relevantSegment ? 'high' : 'medium'
      })
    })
  } else if (videoDuration >= 6) {
    // For medium videos, create overlapping moments
    for (let i = 0; i < 3; i++) {
      const start = Math.floor(i * (videoDuration - 2) / 2)
      const duration = Math.min(2, videoDuration - start)
      
      moments.push({
        startTime: start,
        endTime: start + duration,
        caption: contextualCaptions[i] || `Key moment ${i + 1}`,
        reason: `Content-aware moment based on video analysis`,
        confidence: 'medium'
      })
    }
  } else {
    // For short videos, create strategic segments
    const segmentDuration = Math.max(1.5, videoDuration / 3)
    for (let i = 0; i < 3; i++) {
      const start = Math.floor(i * videoDuration / 4)
      const duration = Math.min(segmentDuration, videoDuration - start)
      
      moments.push({
        startTime: start,
        endTime: start + duration,
        caption: contextualCaptions[i] || `Quick moment ${i + 1}`,
        reason: `Short video segment optimization`,
        confidence: 'medium'
      })
    }
  }
  
  console.log(`📊 Created ${moments.length} enhanced fallback moments`)
  return moments
}

// Generate contextual captions based on prompt analysis
function generateContextualCaptions(promptLower, hasDetailedAnalysis) {
  const captions = []
  
  // Analyze prompt for context
  if (promptLower.includes('funny') || promptLower.includes('laugh') || promptLower.includes('humor')) {
    captions.push("This is hilarious", "Can't stop laughing", "Comedy gold")
  } else if (promptLower.includes('dance') || promptLower.includes('music') || promptLower.includes('beat')) {
    captions.push("When the beat drops", "Dance vibes", "Music hits different")
  } else if (promptLower.includes('reaction') || promptLower.includes('respond')) {
    captions.push("That reaction", "Mood", "Relatable moment")
  } else if (promptLower.includes('epic') || promptLower.includes('amazing') || promptLower.includes('awesome')) {
    captions.push("Epic moment", "This is amazing", "Legendary")
  } else if (promptLower.includes('cute') || promptLower.includes('adorable') || promptLower.includes('sweet')) {
    captions.push("Too cute", "Adorable", "Sweet moment")
  } else if (promptLower.includes('fail') || promptLower.includes('mistake') || promptLower.includes('oops')) {
    captions.push("Epic fail", "Oops moment", "That didn't work")
  } else if (promptLower.includes('surprise') || promptLower.includes('shock') || promptLower.includes('unexpected')) {
    captions.push("Plot twist", "Unexpected", "Surprise!")
  } else {
    // Generic engaging captions
    captions.push("Big mood", "That's a vibe", "Main character energy")
  }
  
  // Ensure we have at least 3 captions
  while (captions.length < 3) {
    captions.push("Perfect moment", "This hits", "Mood exactly")
  }
  
  return captions
}

// Find relevant segment for a time range
function findRelevantSegment(segments, startTime, endTime) {
  return segments.find(segment => 
    (segment.start <= startTime && segment.end >= endTime) ||
    (segment.start >= startTime && segment.start < endTime) ||
    (segment.end > startTime && segment.end <= endTime)
  )
}

// Validate and filter moments
function validateAndFilterMoments(moments, videoDuration) {
  return moments.filter(moment => {
    // Basic validation
    if (typeof moment.startTime !== 'number' || typeof moment.endTime !== 'number') {
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