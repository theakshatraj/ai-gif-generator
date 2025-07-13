"use client"
import { useState, useEffect } from "react"
import FileUpload from "./components/FileUpload"
import VideoSegmentSelector from "./components/VideoSegmentSelector"
import PromptInput from "./components/PromptInput"
import GifPreview from "./components/GifPreview"
import LoadingSpinner from "./components/LoadingSpinner"
import apiService from "./services/api"
import { createSegmentMetadata } from "./utils/videoTrimmer" // Import the utility

const MAX_VIDEO_DURATION_FOR_DIRECT_PROCESSING = 9 // seconds

function App() {
  const [step, setStep] = useState(1)
  const [prompt, setPrompt] = useState("")
  const [file, setFile] = useState(null) // For uploaded file or segmented file metadata
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [gifs, setGifs] = useState([])
  const [error, setError] = useState("")
  const [serverStatus, setServerStatus] = useState(null)

  // New states for segment selection
  const [showSegmentSelector, setShowSegmentSelector] = useState(false)
  const [videoToSegment, setVideoToSegment] = useState(null) // Stores { file: File | null, youtubeUrl: string | null, duration: number }
  const [selectedSegment, setSelectedSegment] = useState(null) // Stores { startTime: number, endTime: number }
  const [processingSegment, setProcessingSegment] = useState(false) // For client-side segment processing (if any)

  // Test server connection on component mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        console.log("🔍 Checking server health...")
        const health = await apiService.checkHealth()
        setServerStatus(health)
        console.log("✅ Server health:", health)
        if (health.openrouterConfigured === false) {
          setError("⚠️ Server is running but OpenRouter API key is not configured")
        }
      } catch (error) {
        console.error("❌ Server health check failed:", error)
        setError("❌ Cannot connect to server. Please make sure the backend is running.")
        setServerStatus(null)
      }
    }
    checkServer()
  }, [])

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile)
    setYoutubeUrl("")
    setError("")
    setShowSegmentSelector(false)
    setSelectedSegment(null)
  }

  const handleYouTubeUrl = async (url) => {
    setYoutubeUrl(url)
    setFile(null) // Clear file if YouTube URL is selected
    setError("")
    setShowSegmentSelector(false)
    setSelectedSegment(null)

    if (url) {
      setLoading(true) // Show loading while checking YouTube duration
      try {
        console.log("🔍 Checking YouTube video duration...")
        const videoInfo = await apiService.getYouTubeVideoInfo(url)
        console.log("✅ YouTube video info:", videoInfo)

        if (videoInfo.duration > MAX_VIDEO_DURATION_FOR_DIRECT_PROCESSING) {
          handleLongVideoDetected(null, url, videoInfo.duration)
        } else {
          // If short, proceed directly
          setYoutubeUrl(url)
          setStep(2)
        }
      } catch (err) {
        console.error("❌ Failed to get YouTube video info:", err)
        setError(`Failed to get YouTube video info: ${err.message}. Please check the URL.`)
        setYoutubeUrl("") // Clear URL on error
      } finally {
        setLoading(false)
      }
    }
  }

  const handleLongVideoDetected = (uploadedFile, url, duration) => {
    console.log(`📹 Long video detected: ${duration} seconds`)
    setVideoToSegment({ file: uploadedFile, youtubeUrl: url, duration })
    setShowSegmentSelector(true)
    setFile(null) // Clear the file/url until segment is selected
    setYoutubeUrl("")
    setStep(1) // Ensure we are on step 1 to show segment selector
  }

  const handleSegmentSelect = (segment) => {
    setProcessingSegment(true)
    setError("")
    try {
      console.log("✂️ Segment selected:", segment)
      setSelectedSegment(segment)

      if (videoToSegment.file) {
        // For uploaded files, create a "segmented" file object
        const segmentedFile = createSegmentMetadata(videoToSegment.file, segment.startTime, segment.endTime)
        setFile(segmentedFile)
        setYoutubeUrl("") // Ensure YouTube URL is cleared
      } else if (videoToSegment.youtubeUrl) {
        // For YouTube, just keep the URL and the segment info
        setYoutubeUrl(videoToSegment.youtubeUrl)
        setFile(null) // Ensure file is cleared
      }

      setShowSegmentSelector(false)
      setVideoToSegment(null)
      console.log("✅ Segment processed successfully (client-side marking)")
      setStep(2) // Move to next step after segment selection
    } catch (error) {
      console.error("❌ Error processing segment:", error)
      setError("Failed to process video segment. Please try again.")
    } finally {
      setProcessingSegment(false)
    }
  }

  const handleSegmentCancel = () => {
    setShowSegmentSelector(false)
    setVideoToSegment(null)
    setSelectedSegment(null)
    setFile(null)
    setYoutubeUrl("")
    setError("")
  }

  const handleGenerate = async () => {
    if (!prompt || (!file && !youtubeUrl)) {
      setError("Please provide both a prompt and a video source")
      return
    }

    // Additional validation for segment if it's selected
    if (selectedSegment) {
      const segmentDuration = selectedSegment.endTime - selectedSegment.startTime
      if (segmentDuration <= 0 || segmentDuration > 15) {
        setError("Selected segment duration must be between 0 and 15 seconds.")
        return
      }
    }

    setLoading(true)
    setError("")

    try {
      // Create FormData
      const formData = new FormData()
      formData.append("prompt", prompt)

      if (file) {
        formData.append("video", file)
      }
      if (youtubeUrl) {
        formData.append("youtubeUrl", youtubeUrl)
      }

      // Add segment information if available
      if (selectedSegment) {
        formData.append("segmentStart", selectedSegment.startTime.toString())
        formData.append("segmentEnd", selectedSegment.endTime.toString())
      }

      console.log("🚀 Sending request to generate GIFs...")
      const response = await apiService.generateGifs(formData)

      if (response.success) {
        console.log("✅ GIFs generated successfully:", response.gifs)
        setGifs(response.gifs || [])
        setStep(3)
      } else {
        throw new Error(response.error || response.message || "Failed to generate GIFs")
      }
    } catch (error) {
      console.error("❌ Error generating GIFs:", error)
      setError(error.message || "Failed to generate GIFs. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setGifs([])
    setFile(null)
    setYoutubeUrl("")
    setPrompt("")
    setError("")
    setShowSegmentSelector(false)
    setVideoToSegment(null)
    setSelectedSegment(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <header className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold text-gradient mb-4">🎬 MemeGIF Studio</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-2">
            Turn any video into viral-worthy GIFs with AI-powered meme captions
          </p>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">✨ Upload • Select • Describe • Generate • Share ✨</p>
        </header>

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-8">
            {[
              { num: 1, label: "Upload" },
              { num: 2, label: "Configure" },
              { num: 3, label: "Generate" },
            ].map((stepInfo, index) => (
              <div key={stepInfo.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                      step >= stepInfo.num ? "bg-blue-600 text-white shadow-lg scale-110" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {stepInfo.num}
                  </div>
                  <span
                    className={`mt-2 text-sm font-medium ${step >= stepInfo.num ? "text-blue-600" : "text-gray-500"}`}
                  >
                    {stepInfo.label}
                  </span>
                </div>
                {index < 2 && (
                  <div
                    className={`w-24 h-1 mx-4 rounded-full transition-all duration-300 ${
                      step > stepInfo.num ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === 1 && !showSegmentSelector && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Upload Your Video</h2>
              <FileUpload
                onFileSelect={handleFileSelect}
                onYouTubeUrl={handleYouTubeUrl}
                onLongVideoDetected={handleLongVideoDetected}
                checkingDuration={loading} // Pass loading state to FileUpload
              />
              {(file || youtubeUrl) && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm">
                    ✅{" "}
                    {file ? (
                      <>
                        File selected: {file.name}
                        {selectedSegment && (
                          <span className="ml-2 text-blue-600">
                            (Segment: {selectedSegment.startTime.toFixed(1)}s - {selectedSegment.endTime.toFixed(1)}s)
                          </span>
                        )}
                      </>
                    ) : (
                      `YouTube URL: ${youtubeUrl}`
                    )}
                  </p>
                </div>
              )}
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={(!file && !youtubeUrl) || loading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  Next Step →
                </button>
              </div>
            </div>
          )}

          {showSegmentSelector && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Select Video Segment</h2>
              {processingSegment ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin mx-auto h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                    <p className="text-gray-600">Processing video segment...</p>
                  </div>
                </div>
              ) : (
                <VideoSegmentSelector
                  file={videoToSegment?.file}
                  youtubeUrl={videoToSegment?.youtubeUrl}
                  videoDuration={videoToSegment?.duration}
                  onSegmentSelect={handleSegmentSelect}
                  onCancel={handleSegmentCancel}
                />
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Configure Your GIFs</h2>
              <PromptInput prompt={prompt} onPromptChange={setPrompt} />
              <div className="mt-8 flex justify-between">
                <button
                  onClick={resetForm} // Go back to step 1 (upload)
                  className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  ← Back
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={
                    !prompt || loading || serverStatus?.openrouterConfigured === false || (!file && !youtubeUrl)
                  }
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  {loading ? "Generating..." : "Generate GIFs ✨"}
                </button>
              </div>
              {/* Warning if OpenRouter not configured */}
              {serverStatus?.openrouterConfigured === false && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-700 text-sm">
                    ⚠️ OpenRouter API key not configured. Please check your backend .env file.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Your Generated GIFs</h2>
              <GifPreview gifs={gifs} />
              <div className="mt-8 flex justify-center">
                <button
                  onClick={resetForm}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl"
                >
                  Create New GIFs
                </button>
              </div>
            </div>
          )}

          {loading && <LoadingSpinner />}
        </div>
      </div>
    </div>
  )
}

export default App
