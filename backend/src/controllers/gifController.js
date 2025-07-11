import fs from "fs";
import path from "path";
import videoService from "../services/videoServiceUpdated.js";
import videoAnalysisService from "../services/videoAnalysisService.js";
import aiService from "../services/aiService.js";
import gifService from "../services/gifService.js";

export const generateGifs = async (req, res) => {
  const startTime = Date.now();
  const tempFiles = [];

  try {
    console.log("🚀 Starting GIF generation process...");
    const { prompt, youtubeUrl } = req.body;
    const uploadedFile = req.file;

    console.log("📝 Prompt:", prompt);
    console.log("🎥 YouTube URL:", youtubeUrl);
    console.log("📁 Uploaded file:", uploadedFile?.filename);

    // Test OpenRouter connection first
    const connectionTest = await aiService.testConnection();
    if (!connectionTest) {
      console.log("⚠️ OpenRouter connection failed, will use fallback methods");
    }

    let videoPath;
    let videoInfo;
    let transcript;

    if (youtubeUrl) {
      console.log("📥 Processing YouTube URL...");

      try {
        // Get YouTube data without downloading video
        const youtubeData = await videoService.getYouTubeData(youtubeUrl);
        transcript = youtubeData.transcript;
        videoInfo = youtubeData.videoInfo;

        console.log("✅ YouTube data extracted successfully");
        console.log(
          `📝 Transcript preview: ${transcript.text.substring(0, 200)}...`
        );

        // Create placeholder video for GIF generation
        console.log("🎬 Creating placeholder video for GIF generation...");
        const placeholderResult = await videoService.createPlaceholderVideo(
          videoInfo.duration,
          videoInfo.title
        );
        videoPath = placeholderResult.videoPath;
        tempFiles.push(videoPath);
      } catch (youtubeError) {
        console.error("❌ YouTube processing failed:", youtubeError);
        return res.status(400).json({
          success: false,
          error: `Failed to process YouTube video: ${youtubeError.message}. Please try with a different video or upload a file instead.`,
        });
      }
    } else if (uploadedFile) {
      console.log("📁 Using uploaded file...");
      videoPath = uploadedFile.path;
      videoInfo = await videoService.getVideoInfo(videoPath);

      // Step 2 (Optional): Enrich prompt with video metadata
      const enrichedPrompt = `${prompt} — based on the uploaded video titled "${uploadedFile.originalname}"`;

      // For uploaded files, analyze video content with enriched prompt
      console.log(
        "🔍 Analyzing uploaded video content with enriched prompt..."
      );
      transcript = await videoAnalysisService.analyzeVideoContent(
        videoPath,
        videoInfo.duration,
        enrichedPrompt
      );
    } else {
      return res.status(400).json({
        success: false,
        error: "Please provide either a YouTube URL or upload a video file",
      });
    }

    console.log("📊 Video info:", videoInfo);
    console.log(
      "📝 Transcript preview:",
      transcript.text.substring(0, 300) + "..."
    );

    // Analyze transcript with AI
    console.log("🤖 Analyzing transcript with AI...");
    const moments = await aiService.analyzeTranscriptWithTimestamps(
      transcript,
      prompt,
      Number.parseInt(videoInfo.duration)
    );

    console.log("🎬 Moments to process:", JSON.stringify(moments, null, 2));

    if (!moments || moments.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No suitable moments found for GIF creation",
      });
    }

    // Generate GIFs
    const gifs = [];
    const errors = [];

    for (let i = 0; i < moments.length; i++) {
      const moment = moments[i];
      console.log(`🎬 Processing GIF ${i + 1}/${moments.length}`);
      console.log(`⏱️ Time: ${moment.startTime}s - ${moment.endTime}s`);
      console.log(`💬 Caption: ${moment.caption}`);

      try {
        console.log(`🎨 Creating GIF ${i + 1}...`);
        const gif = await gifService.createGif(videoPath, moment);
        gifs.push(gif);
        console.log(`✅ GIF ${i + 1} created successfully (${gif.size})`);
      } catch (error) {
        console.error(`❌ Failed to create GIF ${i + 1}:`, error);
        errors.push(`GIF ${i + 1}: ${error.message}`);
      }
    }

    // Clean up temporary files
    console.log("🗑️ Cleaning up temporary files...");
    await videoService.cleanupTempFiles(tempFiles);
    await videoService.cleanup(); // Clean up browser instances

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    if (gifs.length === 0) {
      console.log(
        `❌ No GIFs were created successfully. Errors: ${errors.join(", ")}`
      );
      return res.status(500).json({
        success: false,
        error: `Failed to create any GIFs. Errors: ${errors.join(", ")}`,
      });
    }

    console.log(
      `🎉 Successfully generated ${gifs.length} GIFs in ${processingTime}s!`
    );

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
      captionSource: youtubeUrl
        ? "YouTube Transcript + AI Analysis"
        : "Video Content Analysis",
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("❌ GIF generation failed:", error);

    // Clean up temporary files on error
    await videoService.cleanupTempFiles(tempFiles);
    await videoService.cleanup();

    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate GIFs",
    });
  }
};

export const getGif = async (req, res) => {
  try {
    const { id } = req.params;
    const gifPath = path.join(process.cwd(), "output", `${id}.gif`);

    console.log(`📁 Looking for GIF: ${gifPath}`);

    if (!fs.existsSync(gifPath)) {
      console.log(`❌ GIF not found: ${gifPath}`);
      return res.status(404).json({
        success: false,
        error: "GIF not found",
      });
    }

    const stats = fs.statSync(gifPath);
    console.log(
      `✅ Serving GIF: ${gifPath} (${Math.round(stats.size / 1024)}KB)`
    );

    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.sendFile(path.resolve(gifPath));
  } catch (error) {
    console.error("❌ Error serving GIF:", error);
    res.status(500).json({
      success: false,
      error: "Failed to serve GIF",
    });
  }
};
