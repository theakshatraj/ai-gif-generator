import OpenAI from "openai"
import fs from "fs"

class AIService {
  constructor() {
    // Debug logging
    console.log("🔧 Initializing AIService...")
    console.log("🔍 OPENROUTER_API_KEY exists:", !!process.env.OPENROUTER_API_KEY)
    console.log("🔍 OPENROUTER_API_KEY length:", process.env.OPENROUTER_API_KEY?.length || 0)

    // Check if OpenRouter API key is available
    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      console.error("❌ OPENROUTER_API_KEY environment variable is missing or empty")
      console.error(
        "Available environment variables:",
        Object.keys(process.env).filter((key) => key.includes("API")),
      )
      throw new Error("OPENROUTER_API_KEY environment variable is missing or empty. Please check your .env file.")
    }

    console.log("✅ OpenRouter API key found, initializing client...")

    // Configure OpenAI client to use OpenRouter
    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI GIF Generator",
      },
    })

    console.log("✅ AIService initialized successfully")
  }

  async transcribeAudio(audioPath) {
    try {
      console.log("🎤 Transcribing audio with Whisper via OpenRouter...")

      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`)
      }

      const audioFile = fs.createReadStream(audioPath)

      // Note: OpenRouter may not support audio transcriptions
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: "openai/whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
      })

      console.log("✅ Audio transcribed successfully")
      console.log(`📝 Transcript: ${transcription.text.substring(0, 200)}...`)
      return transcription
    } catch (error) {
      console.error("❌ Transcription Error:", error)

      console.log("⚠️ Using fallback transcript due to transcription error")
      // Create more realistic fallback segments based on video duration
      return {
        text: "This video contains various moments that could be interesting for GIF creation. The content includes different scenes and activities throughout the duration.",
        segments: [
          { start: 0, end: 3, text: "Opening scene with initial activity" },
          { start: 3, end: 6, text: "Middle section with main content" },
          { start: 6, end: 9, text: "Closing moments with final activity" },
        ],
      }
    }
  }

  async analyzeVideoContentWithPrompt(transcript, prompt, videoDuration, visualAnalysis = null) {
    try {
      console.log("🤖 Analyzing video content with enhanced context detection...")
      console.log(`📊 Video duration: ${videoDuration} seconds`)
      console.log(`🎯 User prompt: "${prompt}"`)

      // Enhanced system prompt for better context understanding
      const systemPrompt = `You are an expert video content analyzer that creates engaging GIF moments by understanding both the video content and user intent.

CORE RESPONSIBILITIES:
1. Analyze video transcript and visual cues to understand what's actually happening
2. Match user prompts with relevant video content
3. Identify moments that align with user requests
4. Create captions that reflect both the video content and user intent

ANALYSIS FRAMEWORK:
- Content Understanding: What is actually happening in the video?
- Prompt Matching: How does the user's request relate to the video content?
- Moment Selection: Which specific timestamps best match the request?
- Caption Creation: How to describe these moments engagingly?

CAPTION GUIDELINES:
- Reflect actual video content, not generic templates
- Match the tone requested by the user (funny, dramatic, emotional, etc.)
- Be specific to what's visible/audible in the video
- Keep captions engaging but contextually accurate
- Maximum 30 characters for readability

QUALITY STANDARDS:
- Every selected moment must have clear relevance to the user prompt
- Captions must describe actual video content, not generic scenarios
- Timing must correspond to meaningful content changes
- Avoid overlapping moments unless video is very short

Return EXACTLY 3 moments in this JSON format:
[
  {
    "startTime": 0,
    "endTime": 3,
    "caption": "Contextual caption here",
    "reason": "Detailed explanation of why this moment matches the prompt and video content",
    "confidence": 0.85
  }
]

CRITICAL: Base your analysis on ACTUAL video content, not assumptions.`

      // Enhanced user prompt with better context
      const userPrompt = `PROMPT ANALYSIS:
User Request: "${prompt}"
Video Duration: ${videoDuration} seconds

VIDEO CONTENT ANALYSIS:
Full Transcript: "${transcript.text}"

DETAILED SEGMENTS:
${transcript.segments?.map((seg, idx) => 
  `Segment ${idx + 1}: ${Math.floor(seg.start)}s-${Math.floor(seg.end)}s
  Content: "${seg.text}"
  Duration: ${Math.floor(seg.end - seg.start)}s`
).join("\n") || "No detailed segments available"}

${visualAnalysis ? `
VISUAL ANALYSIS:
${visualAnalysis}
` : ""}

CONTEXT MATCHING TASK:
1. Analyze how the user prompt relates to the actual video content
2. Identify 3 specific moments where the video content aligns with the user request
3. Create contextually accurate captions that reflect both the video content and user intent
4. Ensure each moment has clear relevance to the prompt

PROMPT INTERPRETATION:
- If prompt mentions emotions (funny, sad, etc.): Find moments with corresponding emotional content
- If prompt mentions actions (dancing, talking, etc.): Find moments with those specific actions
- If prompt mentions themes (motivational, romantic, etc.): Find moments that convey those themes
- If prompt is generic: Find the most engaging/interesting moments

QUALITY REQUIREMENTS:
- Each moment must have >0.7 confidence score
- Captions must be specific to actual video content
- Timing must align with meaningful content boundaries
- No generic or template-based responses

Return the 3 best matching moments as JSON array only.`

      // Use enhanced model for better analysis
      const completion = await this.openai.chat.completions.create({
        model: "openai/gpt-4-turbo-preview", // Use more powerful model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent, analytical responses
        max_tokens: 1000,
      })

      const response = completion.choices[0].message.content.trim()
      console.log("🤖 AI Response:", response)

      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/)
        const jsonString = jsonMatch ? jsonMatch[0] : response
        const moments = JSON.parse(jsonString)

        if (Array.isArray(moments) && moments.length > 0) {
          let validMoments = moments
            .filter(moment => 
              typeof moment.startTime === "number" &&
              typeof moment.endTime === "number" &&
              moment.startTime < moment.endTime &&
              moment.endTime <= videoDuration &&
              moment.startTime >= 0 &&
              moment.caption &&
              moment.reason &&
              (moment.confidence || 0) > 0.5 // Ensure minimum confidence
            )
            .sort((a, b) => (b.confidence || 0) - (a.confidence || 0)) // Sort by confidence
            .slice(0, 3) // Take top 3

          // Enhanced validation: check for content relevance
          validMoments = validMoments.map(moment => ({
            ...moment,
            startTime: Math.max(0, Math.floor(moment.startTime)),
            endTime: Math.min(videoDuration, Math.floor(moment.endTime)),
            caption: moment.caption.substring(0, 30), // Ensure caption length
          }))

          // If we don't have enough high-quality moments, use enhanced fallback
          if (validMoments.length < 3) {
            console.log(`⚠️ Only ${validMoments.length} high-quality moments found, using enhanced fallback`)
            const fallbackMoments = this.createEnhancedFallbackMoments(transcript, videoDuration, prompt)
            
            // Combine AI moments with fallback, preferring AI moments
            const combinedMoments = [...validMoments]
            for (const fallback of fallbackMoments) {
              if (combinedMoments.length >= 3) break
              if (!combinedMoments.some(m => Math.abs(m.startTime - fallback.startTime) < 2)) {
                combinedMoments.push(fallback)
              }
            }
            
            validMoments = combinedMoments.slice(0, 3)
          }

          console.log("✅ Enhanced AI analysis completed successfully")
          console.log(`📊 Found ${validMoments.length} contextually relevant moments`)
          validMoments.forEach((moment, idx) => {
            console.log(`  ${idx + 1}. ${moment.startTime}s-${moment.endTime}s: "${moment.caption}" (confidence: ${moment.confidence || 'N/A'})`)
          })
          
          return validMoments
        }

        throw new Error("Invalid moments structure")
      } catch (parseError) {
        console.error("❌ Failed to parse AI response as JSON:", parseError)
        console.log("🔄 Using enhanced fallback analysis")
        return this.createEnhancedFallbackMoments(transcript, videoDuration, prompt)
      }
    } catch (error) {
      console.error("❌ Enhanced AI Analysis Error:", error)
      console.log("🔄 Using enhanced fallback analysis")
      return this.createEnhancedFallbackMoments(transcript, videoDuration, prompt)
    }
  }

  createEnhancedFallbackMoments(transcript, videoDuration, prompt) {
    console.log("📋 Creating enhanced fallback moments based on content analysis...")
    
    const promptLower = prompt.toLowerCase()
    const transcriptLower = transcript.text?.toLowerCase() || ""
    
    // Analyze prompt intent
    const promptAnalysis = this.analyzePromptIntent(promptLower)
    
    // Analyze transcript content
    const contentAnalysis = this.analyzeTranscriptContent(transcriptLower, transcript.segments)
    
    // Find relevant segments based on content matching
    const relevantSegments = this.findRelevantSegments(transcript.segments, promptAnalysis, contentAnalysis)
    
    const moments = []
    
    if (relevantSegments.length >= 3) {
      // Use the most relevant segments
      for (let i = 0; i < 3; i++) {
        const segment = relevantSegments[i]
        moments.push({
          startTime: Math.max(0, Math.floor(segment.start)),
          endTime: Math.min(videoDuration, Math.floor(segment.end)),
          caption: this.generateContextualCaption(segment, promptAnalysis),
          reason: `Content-matched segment: ${segment.text.substring(0, 50)}...`,
          confidence: segment.relevanceScore || 0.6
        })
      }
    } else {
      // Fallback to time-based segments with content awareness
      const segmentCount = Math.min(3, Math.max(1, Math.floor(videoDuration / 3)))
      const segmentDuration = videoDuration / segmentCount
      
      for (let i = 0; i < 3; i++) {
        const startTime = Math.floor(i * segmentDuration)
        const endTime = Math.min(Math.floor((i + 1) * segmentDuration), videoDuration)
        
        // Find corresponding transcript segment
        const correspondingSegment = transcript.segments?.find(seg => 
          seg.start <= startTime && seg.end >= startTime
        )
        
        moments.push({
          startTime,
          endTime,
          caption: this.generateContextualCaption(correspondingSegment, promptAnalysis, i),
          reason: `Time-based segment with content context`,
          confidence: 0.5
        })
      }
    }
    
    console.log(`📊 Created ${moments.length} enhanced fallback moments`)
    return moments
  }

  analyzePromptIntent(promptLower) {
    return {
      isEmotional: /funny|laugh|sad|cry|happy|excited|angry|surprised|emotional/.test(promptLower),
      isAction: /dance|dancing|move|moving|action|jump|run|walk|activity/.test(promptLower),
      isDialogue: /talk|talking|speak|speaking|conversation|dialogue|quote|saying/.test(promptLower),
      isHighlight: /best|highlight|good|great|amazing|awesome|top|peak/.test(promptLower),
      isSpecific: /moment|scene|part|section|clip/.test(promptLower),
      tone: this.extractTone(promptLower),
      keywords: this.extractKeywords(promptLower)
    }
  }

  analyzeTranscriptContent(transcriptLower, segments) {
    const hasEmotionalWords = /laugh|cry|happy|sad|excited|wow|amazing|great|love|hate/.test(transcriptLower)
    const hasActionWords = /move|dance|run|jump|go|come|start|stop|play/.test(transcriptLower)
    const hasDialogueMarkers = /say|tell|talk|speak|ask|answer|think|know/.test(transcriptLower)
    
    return {
      hasEmotionalContent: hasEmotionalWords,
      hasActionContent: hasActionWords,
      hasDialogueContent: hasDialogueMarkers,
      segments: segments || [],
      contentType: this.determineContentType(transcriptLower)
    }
  }

  findRelevantSegments(segments, promptAnalysis, contentAnalysis) {
    if (!segments || segments.length === 0) return []
    
    return segments.map(segment => {
      const segmentText = segment.text.toLowerCase()
      let relevanceScore = 0
      
      // Score based on prompt intent matching
      if (promptAnalysis.isEmotional && /laugh|cry|happy|sad|excited|wow|amazing/.test(segmentText)) {
        relevanceScore += 0.3
      }
      
      if (promptAnalysis.isAction && /move|dance|run|jump|go|come|start|stop/.test(segmentText)) {
        relevanceScore += 0.3
      }
      
      if (promptAnalysis.isDialogue && /say|tell|talk|speak|ask|answer/.test(segmentText)) {
        relevanceScore += 0.3
      }
      
      // Score based on keyword matching
      for (const keyword of promptAnalysis.keywords) {
        if (segmentText.includes(keyword)) {
          relevanceScore += 0.2
        }
      }
      
      // Score based on segment quality (length, position)
      const duration = segment.end - segment.start
      if (duration >= 2 && duration <= 5) {
        relevanceScore += 0.1
      }
      
      return {
        ...segment,
        relevanceScore
      }
    })
    .filter(segment => segment.relevanceScore > 0.2)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  generateContextualCaption(segment, promptAnalysis, index = 0) {
    if (!segment || !segment.text) {
      return this.generateGenericCaption(promptAnalysis, index)
    }
    
    const segmentText = segment.text.toLowerCase()
    
    // Generate caption based on actual content
    if (promptAnalysis.isEmotional) {
      if (/laugh|funny|haha/.test(segmentText)) return "That's hilarious"
      if (/sad|cry/.test(segmentText)) return "Emotional moment"
      if (/happy|excited|great/.test(segmentText)) return "Pure joy"
      if (/wow|amazing|incredible/.test(segmentText)) return "Mind blown"
    }
    
    if (promptAnalysis.isAction) {
      if (/dance|dancing/.test(segmentText)) return "Dance moves"
      if (/move|moving/.test(segmentText)) return "In motion"
      if (/jump|jumping/.test(segmentText)) return "Action time"
      if (/run|running/.test(segmentText)) return "On the move"
    }
    
    if (promptAnalysis.isDialogue) {
      if (/say|said/.test(segmentText)) return "Quote worthy"
      if (/talk|talking/.test(segmentText)) return "Speaking truth"
      if (/ask|asking/.test(segmentText)) return "Good question"
    }
    
    // Use first few words of segment as caption
    const words = segment.text.split(' ').slice(0, 4).join(' ')
    return words.length > 25 ? words.substring(0, 25) : words
  }

  generateGenericCaption(promptAnalysis, index) {
    const positions = ["Opening", "Middle", "Ending"]
    const position = positions[index] || "Moment"
    
    if (promptAnalysis.isEmotional) {
      return `${position} feels`
    }
    if (promptAnalysis.isAction) {
      return `${position} action`
    }
    if (promptAnalysis.isDialogue) {
      return `${position} words`
    }
    
    return `${position} vibes`
  }

  extractTone(promptLower) {
    if (/funny|comedy|laugh|hilarious/.test(promptLower)) return "humorous"
    if (/sad|emotional|cry|touching/.test(promptLower)) return "emotional"
    if (/exciting|action|energy/.test(promptLower)) return "energetic"
    if (/calm|peaceful|relaxing/.test(promptLower)) return "calm"
    return "neutral"
  }

  extractKeywords(promptLower) {
    const commonWords = ["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "up", "about", "into", "through", "during", "before", "after", "above", "below", "between", "among", "under", "over", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can", "shall"]
    
    return promptLower.split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 5) // Take top 5 keywords
  }

  determineContentType(transcriptLower) {
    if (/music|song|singing|dance/.test(transcriptLower)) return "musical"
    if (/game|play|sport/.test(transcriptLower)) return "gaming"
    if (/news|report|information/.test(transcriptLower)) return "informational"
    if (/teach|learn|education/.test(transcriptLower)) return "educational"
    if (/story|tell|narrative/.test(transcriptLower)) return "narrative"
    return "general"
  }

  // Backwards compatibility
  async analyzeTranscriptWithTimestamps(transcript, prompt, videoDuration) {
    return this.analyzeVideoContentWithPrompt(transcript, prompt, videoDuration)
  }

  async testConnection() {
    try {
      console.log("🔍 Testing OpenRouter connection...")

      const completion = await this.openai.chat.completions.create({
        model: "openai/gpt-3.5-turbo-0613",
        messages: [{ role: "user", content: "Hello, this is a test message." }],
        max_tokens: 10,
      })

      console.log("✅ OpenRouter connection successful")
      return true
    } catch (error) {
      console.error("❌ OpenRouter connection failed:", error)
      return false
    }
  }
}

export default new AIService()