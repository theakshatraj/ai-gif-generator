import express from "express"
import multer from "multer"
import { generateGifs, getGif } from "../controllers/generateGifs.js"
import youtubeService from "../services/youtubeService.js" // Import youtubeService

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/", // Temporary directory for uploaded files
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit
})

// Route to generate GIFs
router.post("/generate", upload.single("video"), generateGifs)

// Route to get a specific GIF by ID
router.get("/gifs/:id", getGif)

// Route to test API connection
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "API is working!",
    openrouterConfigured: !!process.env.OPENROUTER_API_KEY,
  })
})

// NEW: Route to get YouTube video info (duration, title)
router.get("/video-info", async (req, res) => {
  const { youtubeUrl } = req.query
  if (!youtubeUrl) {
    return res.status(400).json({ success: false, error: "YouTube URL is required" })
  }

  try {
    const videoInfo = await youtubeService.getVideoMetadata(youtubeUrl)
    res.json({
      success: true,
      title: videoInfo.title,
      duration: videoInfo.duration,
    })
  } catch (error) {
    console.error("❌ Error fetching YouTube video info:", error)
    res.status(500).json({ success: false, error: error.message || "Failed to fetch YouTube video info" })
  }
})

export default router
