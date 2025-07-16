import { useState, useEffect } from "react";
import FileUpload from "./components/FileUpload";
import VideoSegmentSelector from "./components/VideoSegmentSelector";
import PromptInput from "./components/PromptInput";
import GifPreview from "./components/GifPreview";
import LoadingSpinner from "./components/LoadingSpinner";
import apiService from "./services/api";
import videoTrimmer from "./utils/videoTrimmer";

function App() {
  const [step, setStep] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [gifs, setGifs] = useState([]);
  const [error, setError] = useState("");
  const [serverStatus, setServerStatus] = useState(null);
  const [showLanding, setShowLanding] = useState(true);

  // New states for segment selection
  const [showSegmentSelector, setShowSegmentSelector] = useState(false);
  const [longVideo, setLongVideo] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [processingSegment, setProcessingSegment] = useState(false);
  const [youtubeSegment, setYoutubeSegment] = useState(null);

  // Test server connection on component mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        console.log("🔍 Checking server health...");
        const health = await apiService.checkHealth();
        setServerStatus(health);
        console.log("✅ Server health:", health);
        if (health.openrouterConfigured === false) {
          setError(
            "⚠️ Server is running but OpenRouter API key is not configured"
          );
        }
      } catch (error) {
        console.error("❌ Server health check failed:", error);
        setError(
          "❌ Cannot connect to server. Please make sure the backend is running."
        );
        setServerStatus(null);
      }
    };
    checkServer();
  }, []);

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setYoutubeUrl("");
    setError("");
    setShowSegmentSelector(false);
    setSelectedSegment(null);
    setYoutubeSegment(null);
  };

  const handleYouTubeUrl = async (url) => {
    setYoutubeUrl(""); // Clear until checks are done
    setFile(null);
    setError("");
    setShowSegmentSelector(false);
    setSelectedSegment(null);
    setYoutubeSegment(null);

    try {
      // Fetch YouTube metadata to get duration
      const meta = await apiService.getYoutubeMetadata(url);
      if (meta && meta.duration > 9) {
        // If video is too long, trigger segment selector
        setLongVideo({ youtubeUrl: url, duration: meta.duration });
        setShowSegmentSelector(true);
      } else {
        // If short enough, just set the URL
        setYoutubeUrl(url);
      }
    } catch (err) {
      setError("Failed to fetch YouTube video metadata. Please check the URL and try again.");
    }
  };

  const handleLongVideoDetected = (data, duration) => {
    if (data.youtubeUrl) {
      console.log(`📹 Long YouTube video detected: ${data.duration} seconds`);
      setLongVideo({ youtubeUrl: data.youtubeUrl, duration: data.duration });
      setShowSegmentSelector(true);
      setYoutubeUrl(""); // Clear until segment is selected
    } else {
      console.log(`📹 Long video detected: ${duration} seconds`);
      setLongVideo({ file: data, duration });
      setShowSegmentSelector(true);
      setFile(null); // Clear the file until segment is selected
    }
  };

  const handleSegmentSelect = async (segment) => {
    setProcessingSegment(true);
    setError("");

    try {
      console.log("✂️ Processing video segment:", segment);

      if (longVideo.youtubeUrl) {
        // Handle YouTube video segment
        setYoutubeSegment(segment);
        setYoutubeUrl(longVideo.youtubeUrl);
        setShowSegmentSelector(false);
        setLongVideo(null);
        console.log("✅ YouTube segment selected successfully");
      } else {
        // Handle file video segment - existing logic
        const trimmedFile = await videoTrimmer.createTrimmedSegment(
          longVideo.file,
          segment.startTime,
          segment.endTime
        );

        setFile(trimmedFile);
        setSelectedSegment(segment);
        setShowSegmentSelector(false);
        setLongVideo(null);
        console.log("✅ File segment processed successfully");
      }
    } catch (error) {
      console.error("❌ Error processing segment:", error);
      setError("Failed to process video segment. Please try again.");
    } finally {
      setProcessingSegment(false);
    }
  };

  const handleSegmentCancel = () => {
    setShowSegmentSelector(false);
    setLongVideo(null);
    setSelectedSegment(null);
    setYoutubeSegment(null);
  };

  const handleGenerate = async () => {
    if (!prompt || (!file && !youtubeUrl)) {
      setError("Please provide both a prompt and a video source");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create FormData
      const formData = new FormData();
      formData.append("prompt", prompt);

      if (file) {
        formData.append("video", file);

        // Add segment information if available
        if (file.isSegmented) {
          formData.append("segmentStart", file.segmentStart.toString());
          formData.append("segmentEnd", file.segmentEnd.toString());
          formData.append("isSegmented", "true");
        }
      }

      if (youtubeUrl) {
        formData.append("youtubeUrl", youtubeUrl);
        
        // Add YouTube segment information if available
        if (youtubeSegment) {
          formData.append("segmentStart", youtubeSegment.startTime.toString());
          formData.append("segmentEnd", youtubeSegment.endTime.toString());
          formData.append("isSegmented", "true");
        }
      }

      console.log("🚀 Sending request to generate GIFs...");
      const response = await apiService.generateGifs(formData);

      if (response.success) {
        console.log("✅ GIFs generated successfully:", response.gifs);
        setGifs(response.gifs || []);
        setStep(3);
      } else {
        throw new Error(
          response.error || response.message || "Failed to generate GIFs"
        );
      }
    } catch (error) {
      console.error("❌ Error generating GIFs:", error);
      setError(error.message || "Failed to generate GIFs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setGifs([]);
    setFile(null);
    setYoutubeUrl("");
    setPrompt("");
    setError("");
    setShowSegmentSelector(false);
    setLongVideo(null);
    setSelectedSegment(null);
    setYoutubeSegment(null);
  };

  const startCreating = () => {
    setShowLanding(false);
    setStep(1);
  };

  const backToLanding = () => {
    setShowLanding(true);
    resetForm();
  };

  if (showLanding) {
    return (
      <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
        {/* Hero Section */}
        <div 
          className="relative min-h-screen flex items-center justify-center"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(30,41,59,0.8) 100%), url('https://images.unsplash.com/photo-1677442136019-21780ecad995?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwyfHxhaSUyMHRlY2hub2xvZ3l8ZW58MHx8fHwxNzUyNjU0MzY1fDA&ixlib=rb-4.1.0&q=85')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-cyan-900/20"></div>
          
          <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8">
              <span className="text-sm font-medium text-cyan-300">🚀 AI-Powered</span>
              <span className="ml-2 text-sm text-gray-300">Video to GIF Creator</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              MemeGIF Studio
            </h1>
            
            {/* Subheading */}
            <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed">
              Transform any video into viral-worthy GIFs with 
              <span className="text-cyan-400 font-semibold"> AI-powered captions</span>
            </p>
            
            {/* Description */}
            <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
              Upload videos, select moments, describe your vision, and let our AI create perfect GIFs with contextual captions that make your content go viral.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button
                onClick={startCreating}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-lg shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg"
              >
                Start Creating Free ✨
              </button>
              <button className="px-8 py-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition-all duration-300">
                Watch Demo 🎬
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <div className="text-3xl font-bold text-cyan-400 mb-2">1000+</div>
                <div className="text-gray-300">GIFs Created</div>
              </div>
              <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <div className="text-3xl font-bold text-blue-400 mb-2">AI-Powered</div>
                <div className="text-gray-300">Smart Captions</div>
              </div>
              <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <div className="text-3xl font-bold text-purple-400 mb-2">Instant</div>
                <div className="text-gray-300">Processing</div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-20 bg-gray-800">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Why Choose MemeGIF Studio?</h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Our AI-powered platform makes it incredibly easy to create engaging GIFs
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-8 bg-gray-900 rounded-xl border border-gray-700">
                <div className="text-5xl mb-4">🎬</div>
                <h3 className="text-xl font-semibold text-white mb-3">Smart Video Analysis</h3>
                <p className="text-gray-400">
                  Our AI analyzes your video content to identify the most engaging moments and suggests perfect caption-worthy segments.
                </p>
              </div>

              <div className="text-center p-8 bg-gray-900 rounded-xl border border-gray-700">
                <div className="text-5xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-white mb-3">AI-Generated Captions</h3>
                <p className="text-gray-400">
                  Automatic transcription and intelligent caption generation that perfectly matches your content theme and viral potential.
                </p>
              </div>

              <div className="text-center p-8 bg-gray-900 rounded-xl border border-gray-700">
                <div className="text-5xl mb-4">⚡</div>
                <h3 className="text-xl font-semibold text-white mb-3">Lightning Fast</h3>
                <p className="text-gray-400">
                  Process videos from YouTube URLs or uploads, select segments, and generate high-quality GIFs in seconds.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="py-20 bg-gray-900">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
              <p className="text-xl text-gray-400">Simple 3-step process to create viral GIFs</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Upload & Select",
                  description: "Upload your video or paste a YouTube URL. For longer videos, easily select your favorite segment.",
                  icon: "📹"
                },
                {
                  step: "02", 
                  title: "Describe & Configure",
                  description: "Tell our AI what kind of GIFs you want. Funny moments? Inspirational quotes? We'll handle the rest.",
                  icon: "✍️"
                },
                {
                  step: "03",
                  title: "Generate & Share",
                  description: "Watch our AI create multiple captioned GIFs from your video. Download and share across social media.",
                  icon: "🚀"
                }
              ].map((item, index) => (
                <div key={index} className="relative">
                  <div className="text-center p-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 h-full">
                    <div className="text-6xl mb-4">{item.icon}</div>
                    <div className="text-cyan-400 font-bold text-sm mb-2">STEP {item.step}</div>
                    <h3 className="text-xl font-semibold text-white mb-4">{item.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{item.description}</p>
                  </div>
                  {index < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                      <div className="w-8 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20 bg-gradient-to-r from-cyan-900 via-blue-900 to-purple-900">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h2 className="text-4xl font-bold text-white mb-4">Ready to Create Viral GIFs?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of creators who are already making engaging content with MemeGIF Studio
            </p>
            <button
              onClick={startCreating}
              className="px-12 py-4 bg-white text-gray-900 font-bold rounded-lg shadow-2xl hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 text-xl"
            >
              Start Creating Now 🎬
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={backToLanding}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <span className="mr-2">←</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                MemeGIF Studio
              </span>
            </button>
            <div className="text-sm text-gray-500">
              Step {step} of 3
            </div>
          </div>
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
                      step >= stepInfo.num
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg scale-110"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {stepInfo.num}
                  </div>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      step >= stepInfo.num ? "text-blue-600" : "text-gray-500"
                    }`}
                  >
                    {stepInfo.label}
                  </span>
                </div>
                {index < 2 && (
                  <div
                    className={`w-24 h-1 mx-4 rounded-full transition-all duration-300 ${
                      step > stepInfo.num ? "bg-gradient-to-r from-cyan-500 to-blue-600" : "bg-gray-200"
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
              <h2 className="text-2xl font-bold mb-6 text-gray-900">
                Upload Your Video
              </h2>
              <FileUpload
                onFileSelect={handleFileSelect}
                onYouTubeUrl={handleYouTubeUrl}
                onLongVideoDetected={handleLongVideoDetected}
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
                            (Segment: {selectedSegment.startTime.toFixed(1)}s -{" "}
                            {selectedSegment.endTime.toFixed(1)}s)
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        YouTube URL: {youtubeUrl}
                        {youtubeSegment && (
                          <span className="ml-2 text-blue-600">
                            (Segment: {youtubeSegment.startTime.toFixed(1)}s -{" "}
                            {youtubeSegment.endTime.toFixed(1)}s)
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </div>
              )}

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!file && !youtubeUrl}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  Next Step →
                </button>
              </div>
            </div>
          )}

          {showSegmentSelector && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">
                Select Video Segment
              </h2>
              {processingSegment ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="segment-processing mx-auto h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                    <p className="text-gray-600">Processing video segment...</p>
                  </div>
                </div>
              ) : (
                <VideoSegmentSelector
                  file={longVideo?.file}
                  youtubeUrl={longVideo?.youtubeUrl}
                  onSegmentSelect={handleSegmentSelect}
                  onCancel={handleSegmentCancel}
                  duration={longVideo?.duration}
                />
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">
                Configure Your GIFs
              </h2>
              <PromptInput prompt={prompt} onPromptChange={setPrompt} />

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  ← Back
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={
                    !prompt ||
                    loading ||
                    serverStatus?.openrouterConfigured === false
                  }
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  {loading ? "Generating..." : "Generate GIFs ✨"}
                </button>
              </div>

              {/* Warning if OpenRouter not configured */}
              {serverStatus?.openrouterConfigured === false && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-700 text-sm">
                    ⚠️ OpenRouter API key not configured. Please check your
                    backend .env file.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">
                Your Generated GIFs
              </h2>
              <GifPreview gifs={gifs} />
              <div className="mt-8 flex justify-center space-x-4">
                <button
                  onClick={resetForm}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl"
                >
                  Create New GIFs
                </button>
                <button
                  onClick={backToLanding}
                  className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Back to Home
                </button>
              </div>
            </div>
          )}

          {loading && <LoadingSpinner />}
        </div>
      </div>
    </div>
  );
}

export default App;