import OpenAI from "openai";
import fs from "fs";

class AIService {
  constructor() {
    console.log("🔧 Initializing Enhanced AIService...");
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is missing");
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI GIF Generator",
      },
    });

    console.log("✅ AIService initialized successfully");
  }

  async transcribeAudio(audioPath) {
    try {
      console.log("🎤 Transcribing audio...");
      
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      const audioFile = fs.createReadStream(audioPath);
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: "openai/whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
      });

      console.log("✅ Audio transcribed successfully");
      return transcription;
    } catch (error) {
      console.error("❌ Transcription Error:", error);
      return this.createFallbackTranscript();
    }
  }

  async analyzeTranscriptWithTimestamps(transcript, prompt, videoDuration) {
    try {
      console.log("🤖 Analyzing transcript with enhanced context analysis...");
      
      const systemPrompt = `You are an expert meme GIF creator who understands both visual content and internet culture. Your job is to identify the BEST moments from video content that will create engaging, shareable GIFs.

ANALYSIS APPROACH:
1. Carefully read the actual video content analysis
2. Match the user's prompt with the REAL video content
3. Look for moments with high visual appeal, action, or emotional impact
4. Prioritize moments that align with the user's specific request

CAPTION GUIDELINES:
- Keep captions SHORT (10-20 characters max)
- Use modern meme language and formats
- Make them RELATABLE and SHAREABLE
- Common formats: "When you...", "Me trying to...", "POV:", "That feeling when..."
- Match the caption to the ACTUAL video content, not generic assumptions

VISUAL MOMENT SELECTION:
- Look for action peaks, emotional expressions, or interesting visuals
- Avoid static or boring moments
- Choose moments that tell a story or convey emotion
- Consider transitions, reactions, or dynamic movement

Return EXACTLY 3 moments in this JSON format:
[
  {
    "startTime": 0,
    "endTime": 3,
    "caption": "Short meme caption",
    "reason": "Why this specific moment from the video matches the prompt"
  }
]

IMPORTANT RULES:
- Base selections on ACTUAL video content, not prompt keywords
- Each moment should be 2-4 seconds long
- Moments should not overlap significantly
- startTime and endTime must be integers (seconds)
- endTime cannot exceed ${videoDuration} seconds
- Return ONLY the JSON array, no other text`;

      const contentAnalysis = this.buildContentAnalysisPrompt(transcript);
      
      const userPrompt = `Video Duration: ${videoDuration} seconds
User Request: "${prompt}"

ACTUAL VIDEO CONTENT ANALYSIS:
${contentAnalysis}

Based on the REAL video content above, find 3 moments that best match the user's request: "${prompt}"

Focus on:
1. Actual visual events happening in the video
2. Moments that would make good GIFs (action, emotion, interesting visuals)
3. Alignment between user request and actual content
4. Creating meme-worthy captions that match the real content

Return only the JSON array with 3 carefully selected moments.`;

      const completion = await this.openai.chat.completions.create({
        model: "openai/gpt-4-turbo-preview", // Use GPT-4 for better analysis
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7, // Balanced creativity
        max_tokens: 1000,
      });

      const response = completion.choices[0].message.content.trim();
      console.log("🤖 AI Response:", response);

      return this.parseAndValidateMoments(response, videoDuration, transcript, prompt);
    } catch (error) {
      console.error("❌ AI Analysis Error:", error);
      return this.createIntelligentFallbackMoments(transcript, videoDuration, prompt);
    }
  }

  buildContentAnalysisPrompt(transcript) {
    let analysis = `Video Overview: ${transcript.text}\n\n`;
    
    if (transcript.segments && transcript.segments.length > 0) {
      analysis += "Detailed Timeline:\n";
      transcript.segments.forEach((segment, index) => {
        analysis += `${Math.floor(segment.start)}s-${Math.floor(segment.end)}s: ${segment.text}\n`;
        if (segment.frameAnalysis) {
          analysis += `  Visual: ${segment.frameAnalysis}\n`;
        }
      });
    }

    if (transcript.contentAnalysis && transcript.contentAnalysis.length > 0) {
      analysis += "\nFrame-by-Frame Analysis:\n";
      transcript.contentAnalysis.forEach((frame, index) => {
        analysis += `${Math.floor(frame.timestamp)}s: ${frame.analysis}\n`;
      });
    }

    return analysis;
  }

  parseAndValidateMoments(response, videoDuration, transcript, prompt) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : response;
      const moments = JSON.parse(jsonString);

      if (!Array.isArray(moments) || moments.length === 0) {
        throw new Error("Invalid moments structure");
      }

      // Validate and filter moments
      const validMoments = moments
        .filter(moment => 
          typeof moment.startTime === 'number' &&
          typeof moment.endTime === 'number' &&
          moment.startTime >= 0 &&
          moment.endTime <= videoDuration &&
          moment.startTime < moment.endTime &&
          moment.caption && moment.caption.trim().length > 0
        )
        .slice(0, 3);

      if (validMoments.length < 3) {
        console.log(`⚠️ Only ${validMoments.length} valid moments found, creating intelligent fallback`);
        return this.createIntelligentFallbackMoments(transcript, videoDuration, prompt);
      }

      console.log("✅ AI analysis completed successfully");
      console.log(`📊 Found ${validMoments.length} content-aware moments`);
      
      return validMoments;
    } catch (parseError) {
      console.error("❌ Failed to parse AI response:", parseError);
      return this.createIntelligentFallbackMoments(transcript, videoDuration, prompt);
    }
  }

  createIntelligentFallbackMoments(transcript, videoDuration, prompt) {
    console.log("📋 Creating intelligent fallback moments based on content...");

    const moments = [];
    const promptLower = prompt.toLowerCase();

    // Analyze available content for better moment selection
    const segments = transcript.segments || [];
    const hasFrameAnalysis = transcript.contentAnalysis && transcript.contentAnalysis.length > 0;

    // Generate contextual meme templates
    const memeTemplates = this.generateContextualMemeTemplates(promptLower, segments, hasFrameAnalysis);

    if (videoDuration >= 9) {
      // For longer videos, spread moments across the timeline
      const positions = [0, Math.floor(videoDuration / 2) - 1, videoDuration - 3];
      
      positions.forEach((start, index) => {
        const end = Math.min(start + 3, videoDuration);
        const relevantSegment = this.findRelevantSegment(segments, start, end);
        
        moments.push({
          startTime: start,
          endTime: end,
          caption: memeTemplates[index] || `Moment ${index + 1}`,
          reason: `Strategic moment based on ${relevantSegment ? 'content analysis' : 'timeline position'}`
        });
      });
    } else if (videoDuration >= 6) {
      // For medium videos, create overlapping moments
      const segmentLength = 2;
      for (let i = 0; i < 3; i++) {
        const start = Math.floor(i * (videoDuration - segmentLength) / 2);
        const end = Math.min(start + segmentLength, videoDuration);
        
        moments.push({
          startTime: start,
          endTime: end,
          caption: memeTemplates[i] || `Vibe ${i + 1}`,
          reason: `Content-aware moment ${i + 1}`
        });
      }
    } else {
      // For short videos, create strategic overlapping segments
      const segmentLength = Math.max(2, Math.floor(videoDuration / 2));
      for (let i = 0; i < 3; i++) {
        const start = Math.floor(i * videoDuration / 4);
        const end = Math.min(start + segmentLength, videoDuration);
        
        moments.push({
          startTime: start,
          endTime: end,
          caption: memeTemplates[i] || `Beat ${i + 1}`,
          reason: `Short video moment ${i + 1}`
        });
      }
    }

    console.log(`📊 Created ${moments.length} intelligent fallback moments`);
    return moments;
  }

  generateContextualMemeTemplates(promptLower, segments, hasFrameAnalysis) {
    // Base templates on prompt analysis
    let templates = [];

    if (promptLower.includes('dance') || promptLower.includes('dancing')) {
      templates = ["When the beat drops", "Dance like nobody's watching", "Rhythm vibes"];
    } else if (promptLower.includes('laugh') || promptLower.includes('funny')) {
      templates = ["When it's actually funny", "Can't stop laughing", "That's hilarious"];
    } else if (promptLower.includes('action') || promptLower.includes('fight')) {
      templates = ["Action mode activated", "Here we go", "Main character energy"];
    } else if (promptLower.includes('sad') || promptLower.includes('cry')) {
      templates = ["Big sad vibes", "Emotional damage", "That hits deep"];
    } else if (promptLower.includes('surprise') || promptLower.includes('shock')) {
      templates = ["Plot twist", "Didn't see that coming", "Shock factor"];
    } else if (promptLower.includes('cute') || promptLower.includes('adorable')) {
      templates = ["Too cute", "Adorable overload", "Wholesome content"];
    } else {
      // Generic engaging templates
      templates = ["Big mood", "That's a vibe", "Main character moment"];
    }

    // If we have frame analysis, try to incorporate actual content
    if (hasFrameAnalysis && segments.length > 0) {
      const contentKeywords = segments.map(s => s.text.toLowerCase()).join(' ');
      
      if (contentKeywords.includes('person') || contentKeywords.includes('people')) {
        templates = templates.map(t => t); // Keep as is for people content
      } else if (contentKeywords.includes('animal')) {
        templates = ["Cute animal vibes", "Animals being animals", "Nature moment"];
      } else if (contentKeywords.includes('music') || contentKeywords.includes('sound')) {
        templates = ["When the music hits", "Audio vibes", "Sound moment"];
      }
    }

    return templates;
  }

  findRelevantSegment(segments, startTime, endTime) {
    return segments.find(segment => 
      segment.start <= startTime && segment.end >= endTime
    ) || segments.find(segment => 
      Math.abs(segment.start - startTime) < 2
    );
  }

  createFallbackTranscript() {
    return {
      text: "Video content with various scenes and moments suitable for GIF creation",
      segments: [
        { start: 0, end: 3, text: "Opening content with potential for engagement" },
        { start: 3, end: 6, text: "Mid-video content with visual interest" },
        { start: 6, end: 9, text: "Closing content with memorable moments" },
      ],
    };
  }

  async testConnection() {
    try {
      console.log("🔍 Testing OpenRouter connection...");
      
      const completion = await this.openai.chat.completions.create({
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: "Hello, test message." }],
        max_tokens: 10,
      });

      console.log("✅ OpenRouter connection successful");
      return true;
    } catch (error) {
      console.error("❌ OpenRouter connection failed:", error);
      return false;
    }
  }
}

export default new AIService();