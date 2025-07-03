import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const execAsync = promisify(exec);

class VideoAnalysisService {
  constructor() {
    this.ffmpegPath = "ffmpeg";
    this.tempDir = path.join(process.cwd(), "temp");
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // Main method to analyze video content with comprehensive analysis
  async analyzeVideoContent(videoPath, videoDuration, prompt) {
    try {
      console.log("🔍 Starting comprehensive video analysis...");
      console.log(`📊 Video: ${path.basename(videoPath)}, Duration: ${videoDuration}s`);
      console.log(`🎯 Prompt: "${prompt}"`);

      // Run multiple analysis methods in parallel for better accuracy
      const [
        sceneChanges,
        motionAnalysis,
        audioAnalysis,
        visualFeatures
      ] = await Promise.all([
        this.detectSceneChanges(videoPath, videoDuration),
        this.analyzeMotionActivity(videoPath, videoDuration),
        this.analyzeAudioActivity(videoPath, videoDuration),
        this.extractVisualFeatures(videoPath, videoDuration)
      ]);

      console.log(`📈 Analysis results:`);
      console.log(`  - Scene changes: ${sceneChanges.length}`);
      console.log(`  - Motion peaks: ${motionAnalysis.peaks.length}`);
      console.log(`  - Audio activity: ${audioAnalysis.segments.length}`);
      console.log(`  - Visual features: ${visualFeatures.length}`);

      // Create intelligent segments based on multiple analysis factors
      const intelligentSegments = this.createIntelligentSegments(
        videoDuration,
        sceneChanges,
        motionAnalysis,
        audioAnalysis,
        visualFeatures,
        prompt
      );

      // Generate content-aware descriptions
      const enhancedSegments = await this.generateContentAwareDescriptions(
        intelligentSegments,
        prompt,
        videoDuration,
        { sceneChanges, motionAnalysis, audioAnalysis, visualFeatures }
      );

      const transcript = {
        text: enhancedSegments.map(seg => seg.text).join(" "),
        segments: enhancedSegments,
        analysisMetadata: {
          sceneChanges: sceneChanges.length,
          motionPeaks: motionAnalysis.peaks.length,
          audioSegments: audioAnalysis.segments.length,
          visualFeatures: visualFeatures.length,
          analysisMethod: "comprehensive-multi-modal"
        }
      };

      console.log("✅ Comprehensive video analysis completed");
      console.log(`📝 Generated ${enhancedSegments.length} intelligent segments`);
      
      return transcript;

    } catch (error) {
      console.error("❌ Video analysis failed:", error);
      // Enhanced fallback with basic analysis
      return this.createEnhancedFallbackAnalysis(videoDuration, prompt);
    }
  }

  // Detect scene changes using FFmpeg
  async detectSceneChanges(videoPath, videoDuration) {
    try {
      console.log("🎬 Detecting scene changes...");
      
      const outputFile = path.join(this.tempDir, `scenes_${Date.now()}.log`);
      
      // Use FFmpeg scene detection with optimized parameters
      const command = `"${this.ffmpegPath}" -i "${videoPath}" -vf "select='gt(scene,0.25)',showinfo" -f null - 2>"${outputFile}"`;
      
      await execAsync(command, { timeout: 60000 });
      
      const sceneChanges = [];
      
      if (fs.existsSync(outputFile)) {
        const content = fs.readFileSync(outputFile, "utf8");
        const lines = content.split("\n");
        
        for (const line of lines) {
          const match = line.match(/pts_time:(\d+\.?\d*)/);
          if (match) {
            const timestamp = parseFloat(match[1]);
            if (timestamp > 0 && timestamp < videoDuration) {
              sceneChanges.push({
                timestamp,
                type: "scene_change",
                confidence: 0.8
              });
            }
          }
        }
        
        // Clean up
        fs.unlinkSync(outputFile);
      }
      
      console.log(`✅ Detected ${sceneChanges.length} scene changes`);
      return sceneChanges;
      
    } catch (error) {
      console.error("❌ Scene detection failed:", error);
      return [];
    }
  }

  // Analyze motion activity in video
  async analyzeMotionActivity(videoPath, videoDuration) {
    try {
      console.log("🏃 Analyzing motion activity...");
      
      const outputFile = path.join(this.tempDir, `motion_${Date.now()}.log`);
      
      // Use FFmpeg motion detection
      const command = `"${this.ffmpegPath}" -i "${videoPath}" -vf "select='gt(scene,0.1)',showinfo" -f null - 2>"${outputFile}"`;
      
      await execAsync(command, { timeout: 60000 });
      
      const motionData = [];
      const peaks = [];
      
      if (fs.existsSync(outputFile)) {
        const content = fs.readFileSync(outputFile, "utf8");
        const lines = content.split("\n");
        
        for (const line of lines) {
          const timeMatch = line.match(/pts_time:(\d+\.?\d*)/);
          if (timeMatch) {
            const timestamp = parseFloat(timeMatch[1]);
            if (timestamp > 0 && timestamp < videoDuration) {
              motionData.push({
                timestamp,
                activity: "motion_detected"
              });
              
              // Consider it a peak if it's significant
              peaks.push({
                timestamp,
                type: "motion_peak",
                confidence: 0.7
              });
            }
          }
        }
        
        fs.unlinkSync(outputFile);
      }
      
      console.log(`✅ Detected ${peaks.length} motion peaks`);
      return { motionData, peaks };
      
    } catch (error) {
      console.error("❌ Motion analysis failed:", error);
      return { motionData: [], peaks: [] };
    }
  }

  // Analyze audio activity and volume levels
  async analyzeAudioActivity(videoPath, videoDuration) {
    try {
      console.log("🎵 Analyzing audio activity...");
      
      const outputFile = path.join(this.tempDir, `audio_${Date.now()}.log`);
      
      // Analyze audio volume levels
      const command = `"${this.ffmpegPath}" -i "${videoPath}" -af "volumedetect" -f null - 2>"${outputFile}"`;
      
      await execAsync(command, { timeout: 60000 });
      
      const segments = [];
      let meanVolume = -20; // Default
      
      if (fs.existsSync(outputFile)) {
        const content = fs.readFileSync(outputFile, "utf8");
        
        // Extract volume information
        const volumeMatch = content.match(/mean_volume:\s*(-?\d+\.?\d*)\s*dB/);
        if (volumeMatch) {
          meanVolume = parseFloat(volumeMatch[1]);
        }
        
        // Create audio segments based on volume analysis
        const segmentCount = Math.min(8, Math.max(3, Math.floor(videoDuration / 5)));
        const segmentDuration = videoDuration / segmentCount;
        
        for (let i = 0; i < segmentCount; i++) {
          const startTime = i * segmentDuration;
          const endTime = Math.min((i + 1) * segmentDuration, videoDuration);
          
          segments.push({
            startTime,
            endTime,
            type: "audio_segment",
            volume: meanVolume,
            hasAudio: meanVolume > -40
          });
        }
        
        fs.unlinkSync(outputFile);
      }
      
      console.log(`✅ Analyzed ${segments.length} audio segments`);
      return { segments, meanVolume };
      
    } catch (error) {
      console.error("❌ Audio analysis failed:", error);
      return { segments: [], meanVolume: -20 };
    }
  }

  // Extract visual features using frame sampling
  async extractVisualFeatures(videoPath, videoDuration) {
    try {
      console.log("🖼️ Extracting visual features...");
      
      const frameDir = path.join(this.tempDir, `frames_${Date.now()}`);
      if (!fs.existsSync(frameDir)) {
        fs.mkdirSync(frameDir, { recursive: true });
      }
      
      // Extract frames at key intervals
      const frameInterval = Math.max(2, Math.floor(videoDuration / 10));
      const command = `"${this.ffmpegPath}" -i "${videoPath}" -vf "fps=1/${frameInterval}" -q:v 2 "${frameDir}/frame_%03d.jpg"`;
      
      await execAsync(command, { timeout: 60000 });
      
      const features = [];
      const frameFiles = fs.readdirSync(frameDir).filter(f => f.endsWith('.jpg'));
      
      for (let i = 0; i < frameFiles.length; i++) {
        const timestamp = i * frameInterval;
        const framePath = path.join(frameDir, frameFiles[i]);
        
        // Basic visual feature extraction (file size as proxy for complexity)
        const stats = fs.statSync(framePath);
        
        features.push({
          timestamp,
          frameSize: stats.size,
          complexity: stats.size > 50000 ? 'high' : stats.size > 20000 ? 'medium' : 'low',
          type: 'visual_feature'
        });
      }
      
      // Clean up frames
      this.cleanupDirectory(frameDir);
      
      console.log(`✅ Extracted ${features.length} visual features`);
      return features;
      
    } catch (error) {
      console.error("❌ Visual feature extraction failed:", error);
      return [];
    }
  }

  // Create intelligent segments based on all analysis data
  createIntelligentSegments(videoDuration, sceneChanges, motionAnalysis, audioAnalysis, visualFeatures, prompt) {
    console.log("🧠 Creating intelligent segments...");
    
    const segments = [];
    const allEvents = [];
    
    // Collect all significant events
    sceneChanges.forEach(sc => allEvents.push({ ...sc, weight: 0.8 }));
    motionAnalysis.peaks.forEach(mp => allEvents.push({ ...mp, weight: 0.6 }));
    audioAnalysis.segments.forEach(as => allEvents.push({ 
      timestamp: as.startTime, 
      type: 'audio_activity', 
      weight: as.hasAudio ? 0.7 : 0.3 
    }));
    visualFeatures.forEach(vf => allEvents.push({ 
      timestamp: vf.timestamp, 
      type: 'visual_change', 
      weight: vf.complexity === 'high' ? 0.7 : 0.4 
    }));
    
    // Sort events by timestamp
    allEvents.sort((a, b) => a.timestamp - b.timestamp);
    
    // Group events into segments
    const targetSegments = 6; // Aim for 6 segments for better selection
    const minSegmentDuration = 2; // Minimum 2 seconds
    const maxSegmentDuration = 8; // Maximum 8 seconds
    
    if (allEvents.length > 0) {
      // Use event-based segmentation
      const segmentBoundaries = this.findOptimalSegmentBoundaries(
        allEvents, 
        videoDuration, 
        targetSegments, 
        minSegmentDuration, 
        maxSegmentDuration
      );
      
      for (let i = 0; i < segmentBoundaries.length - 1; i++) {
        const startTime = segmentBoundaries[i];
        const endTime = segmentBoundaries[i + 1];
        const duration = endTime - startTime;
        
        // Calculate segment quality score
        const eventsInSegment = allEvents.filter(e => 
          e.timestamp >= startTime && e.timestamp <= endTime
        );
        const qualityScore = eventsInSegment.reduce((sum, e) => sum + e.weight, 0) / duration;
        
        segments.push({
          startTime,
          endTime,
          duration,
          qualityScore,
          eventCount: eventsInSegment.length,
          events: eventsInSegment
        });
      }
    } else {
      // Fallback to time-based segmentation
      const segmentDuration = Math.min(maxSegmentDuration, videoDuration / targetSegments);
      
      for (let i = 0; i < targetSegments && i * segmentDuration < videoDuration; i++) {
        const startTime = i * segmentDuration;
        const endTime = Math.min((i + 1) * segmentDuration, videoDuration);
        
        segments.push({
          startTime,
          endTime,
          duration: endTime - startTime,
          qualityScore: 0.3, // Lower quality for time-based
          eventCount: 0,
          events: []
        });
      }
    }
    
    // Sort segments by quality score and take the best ones
    segments.sort((a, b) => b.qualityScore - a.qualityScore);
    
    console.log(`✅ Created ${segments.length} intelligent segments`);
    return segments.slice(0, 6); // Return top 6 segments
  }

  // Find optimal segment boundaries based on events
  findOptimalSegmentBoundaries(events, videoDuration, targetSegments, minDuration, maxDuration) {
    const boundaries = [0]; // Start with beginning
    
    let currentPos = 0;
    let segmentCount = 0;
    
    while (currentPos < videoDuration && segmentCount < targetSegments - 1) {
      // Find the next optimal boundary
      const minNextPos = currentPos + minDuration;
      const maxNextPos = Math.min(currentPos + maxDuration, videoDuration);
      
      // Look for high-weight events in the optimal range
      const candidateEvents = events.filter(e => 
        e.timestamp >= minNextPos && e.timestamp <= maxNextPos
      );
      
      let nextBoundary;
      if (candidateEvents.length > 0) {
        // Choose the event with highest weight
        const bestEvent = candidateEvents.reduce((best, current) => 
          current.weight > best.weight ? current : best
        );
        nextBoundary = bestEvent.timestamp;
      } else {
        // No good events, use time-based boundary
        nextBoundary = Math.min(currentPos + maxDuration, videoDuration);
      }
      
      boundaries.push(nextBoundary);
      currentPos = nextBoundary;
      segmentCount++;
    }
    
    // Ensure we end at video duration
    if (boundaries[boundaries.length - 1] < videoDuration) {
      boundaries.push(videoDuration);
    }
    
    return boundaries;
  }

  // Generate content-aware descriptions for segments
  async generateContentAwareDescriptions(segments, prompt, videoDuration, analysisData) {
    console.log("📝 Generating content-aware descriptions...");
    
    const promptAnalysis = this.analyzePromptContext(prompt);
    const enhancedSegments = [];
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const position = segment.startTime / videoDuration;
      
      // Generate contextual description
      const description = this.generateContextualDescription(
        segment, 
        position, 
        promptAnalysis, 
        analysisData, 
        i
      );
      
      enhancedSegments.push({
        start: Math.floor(segment.startTime),
        end: Math.floor(segment.endTime),
        text: description,
        qualityScore: segment.qualityScore,
        eventCount: segment.eventCount,
        analysisContext: {
          hasSceneChange: segment.events.some(e => e.type === 'scene_change'),
          hasMotion: segment.events.some(e => e.type === 'motion_peak'),
          hasAudio: segment.events.some(e => e.type === 'audio_activity'),
          visualComplexity: this.getVisualComplexity(segment, analysisData.visualFeatures)
        }
      });
    }
    
    // Sort by quality score for better selection
    enhancedSegments.sort((a, b) => b.qualityScore - a.qualityScore);
    
    console.log(`✅ Generated ${enhancedSegments.length} content-aware descriptions`);
    return enhancedSegments;
  }

  // Analyze prompt context for better understanding
  analyzePromptContext(prompt) {
    const promptLower = prompt.toLowerCase();
    
    return {
      isEmotional: /funny|laugh|sad|cry|happy|excited|emotional|surprised|angry|joy|amazing|wow/.test(promptLower),
      isAction: /dance|dancing|move|moving|action|jump|run|walk|activity|sport|exercise|active/.test(promptLower),
      isDialogue: /talk|talking|speak|speaking|conversation|dialogue|quote|saying|words|speech/.test(promptLower),
      isHighlight: /best|highlight|good|great|amazing|awesome|top|peak|moment|key|important/.test(promptLower),
      isComedy: /funny|comedy|comedic|humor|joke|hilarious|laugh|lol|amusing/.test(promptLower),
      isDramatic: /dramatic|intense|serious|emotional|powerful|moment|climax/.test(promptLower),
      isMusic: /music|song|singing|dance|beat|rhythm|musical/.test(promptLower),
      tone: this.extractTone(promptLower),
      keywords: this.extractKeywords(promptLower),
      sentiment: this.analyzeSentiment(promptLower)
    };
  }

  // Generate contextual description based on analysis
  generateContextualDescription(segment, position, promptAnalysis, analysisData, index) {
    let description = "";
    
    // Base description on position
    if (position < 0.2) {
      description = "Opening sequence";
    } else if (position < 0.4) {
      description = "Early content";
    } else if (position < 0.6) {
      description = "Main content";
    } else if (position < 0.8) {
      description = "Later content";
    } else {
      description = "Closing sequence";
    }
    
    // Add context based on detected events
    const contextElements = [];
    
    if (segment.events.some(e => e.type === 'scene_change')) {
      contextElements.push("with scene transition");
    }
    
    if (segment.events.some(e => e.type === 'motion_peak')) {
      if (promptAnalysis.isAction) {
        contextElements.push("featuring dynamic action");
      } else {
        contextElements.push("with movement");
      }
    }
    
    if (segment.qualityScore > 0.8) {
      contextElements.push("high-interest moment");
    }
    
    // Add prompt-specific context
    if (promptAnalysis.isEmotional) {
      if (position < 0.3) {
        contextElements.push("emotional setup");
      } else if (position < 0.7) {
        contextElements.push("emotional peak");
      } else {
        contextElements.push("emotional resolution");
      }
    }
    
    if (promptAnalysis.isComedy) {
      contextElements.push("comedic timing");
    }
    
    if (promptAnalysis.isHighlight) {
      contextElements.push("key highlight");
    }
    
    // Combine elements
    if (contextElements.length > 0) {
      description += " " + contextElements.join(" and ");
    }
    
    // Add timing information
    description += ` (${Math.floor(segment.startTime)}s-${Math.floor(segment.endTime)}s)`;
    
    return description;
  }

  // Helper methods
  getVisualComplexity(segment, visualFeatures) {
    const relevantFeatures = visualFeatures.filter(vf => 
      vf.timestamp >= segment.startTime && vf.timestamp <= segment.endTime
    );
    
    if (relevantFeatures.length === 0) return 'medium';
    
    const complexityScores = relevantFeatures.map(vf => {
      switch (vf.complexity) {
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 2;
      }
    });
    
    const avgComplexity = complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length;
    
    if (avgComplexity > 2.5) return 'high';
    if (avgComplexity > 1.5) return 'medium';
    return 'low';
  }

  extractTone(promptLower) {
    if (/funny|comedy|laugh|hilarious|amusing/.test(promptLower)) return "humorous";
    if (/sad|emotional|cry|touching|dramatic/.test(promptLower)) return "emotional";
    if (/exciting|action|energy|intense/.test(promptLower)) return "energetic";
    if (/calm|peaceful|relaxing|smooth/.test(promptLower)) return "calm";
    if (/amazing|awesome|great|best/.test(promptLower)) return "positive";
    return "neutral";
  }

  extractKeywords(promptLower) {
    const commonWords = ["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "up", "about", "into", "through", "during", "before", "after", "above", "below", "between", "among", "under", "over", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can", "shall", "this", "that", "these", "those"];
    
    return promptLower.split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 5);
  }

  analyzeSentiment(promptLower) {
    const positiveWords = /amazing|awesome|great|good|best|happy|funny|love|excellent|wonderful|fantastic|brilliant/;
    const negativeWords = /sad|bad|awful|terrible|hate|angry|disappointed|boring|worst/;
    
    if (positiveWords.test(promptLower)) return "positive";
    if (negativeWords.test(promptLower)) return "negative";
    return "neutral";
  }

  // Enhanced fallback analysis
  createEnhancedFallbackAnalysis(videoDuration, prompt) {
    console.log("📋 Creating enhanced fallback analysis...");
    
    const promptAnalysis = this.analyzePromptContext(prompt);
    const segments = [];
    
    // Create more intelligent fallback segments
    const segmentCount = Math.min(6, Math.max(3, Math.floor(videoDuration / 4)));
    
    for (let i = 0; i < segmentCount; i++) {
      const startTime = (i / segmentCount) * videoDuration;
      const endTime = Math.min(((i + 1) / segmentCount) * videoDuration, videoDuration);
      const position = startTime / videoDuration;
      
      let description = "";
      
      // Position-based naming
      if (position < 0.2) {
        description = "Opening content";
      } else if (position < 0.4) {
        description = "Early segment";
      } else if (position < 0.6) {
        description = "Main content";
      } else if (position < 0.8) {
        description = "Later segment";
      } else {
        description = "Closing content";
      }
      
      // Add prompt-based context
      if (promptAnalysis.isEmotional) {
        description += " with emotional elements";
      }
      if (promptAnalysis.isAction) {
        description += " with activity";
      }
      if (promptAnalysis.isHighlight) {
        description += " - potential highlight";
      }
      
      segments.push({
        start: Math.floor(startTime),
        end: Math.floor(endTime),
        text: description,
        qualityScore: 0.4 + (i === Math.floor(segmentCount / 2) ? 0.2 : 0), // Favor middle segments
        eventCount: 0,
        analysisContext: {
          hasSceneChange: false,
          hasMotion: false,
          hasAudio: true,
          visualComplexity: 'medium'
        }
      });
    }
    
    return {
      text: segments.map(seg => seg.text).join(" "),
      segments: segments,
      analysisMetadata: {
        analysisMethod: "enhanced-fallback",
        promptAnalysis: promptAnalysis
      }
    };
  }

  // Utility method to clean up directories
  cleanupDirectory(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          if (fs.statSync(filePath).isDirectory()) {
            this.cleanupDirectory(filePath);
          } else {
            fs.unlinkSync(filePath);
          }
        }
        fs.rmdirSync(dirPath);
      }
    } catch (error) {
      console.error(`❌ Failed to cleanup directory ${dirPath}:`, error);
    }
  }

  // Backward compatibility method
  async extractFramesForAnalysis(videoPath, videoDuration) {
    const frameDir = path.join(this.tempDir, `frames_${Date.now()}`);
    if (!fs.existsSync(frameDir)) {
      fs.mkdirSync(frameDir, { recursive: true });
    }

    const frameInterval = Math.max(1, Math.floor(videoDuration / 20)); // Extract more frames
    const command = `"${this.ffmpegPath}" -i "${videoPath}" -vf "fps=1/${frameInterval}" -q:v 2 "${frameDir}/frame_%03d.jpg"`;
    
    await execAsync(command, { timeout: 60000 });

    const frames = fs.readdirSync(frameDir)
      .filter(f => f.endsWith(".jpg"))
      .map((file, idx) => ({
        timestamp: idx * frameInterval,
        path: path.join(frameDir, file),
        filename: file,
      }));

    return { frames, frameDir };
  }
}

export default new VideoAnalysisService();