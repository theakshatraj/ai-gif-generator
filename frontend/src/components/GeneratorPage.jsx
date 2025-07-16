import { useState, useEffect } from "react";
import FileUpload from "./FileUpload";
import VideoSegmentSelector from "./VideoSegmentSelector";
import PromptInput from "./PromptInput";
import GifPreview from "./GifPreview";
import LoadingSpinner from "./LoadingSpinner";
import apiService from "../services/api";
import videoTrimmer from "../utils/videoTrimmer";

const steps = [
  { label: "Upload", icon: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
  ) },
  { label: "Configure", icon: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>
  ) },
  { label: "Generate", icon: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h7v8l8-12h-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ) },
];

const GeneratorPage = () => {
  const [step, setStep] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [gifs, setGifs] = useState([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [serverStatus, setServerStatus] = useState(null);
  const [showSegmentSelector, setShowSegmentSelector] = useState(false);
  const [longVideo, setLongVideo] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [processingSegment, setProcessingSegment] = useState(false);
  const [youtubeSegment, setYoutubeSegment] = useState(null);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const health = await apiService.checkHealth();
        setServerStatus(health);
        if (health.openrouterConfigured === false) {
          setError("⚠️ Server is running but OpenRouter API key is not configured");
        }
      } catch (error) {
        setError("❌ Cannot connect to server. Please make sure the backend is running.");
        setServerStatus(null);
      }
    };
    checkServer();
  }, []);

  useEffect(() => {
    if (error) {
      setToast(error);
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setYoutubeUrl("");
    setError("");
    setShowSegmentSelector(false);
    setSelectedSegment(null);
    setYoutubeSegment(null);
  };

  const handleYouTubeUrl = async (url) => {
    setYoutubeUrl("");
    setFile(null);
    setError("");
    setShowSegmentSelector(false);
    setSelectedSegment(null);
    setYoutubeSegment(null);
    try {
      const meta = await apiService.getYoutubeMetadata(url);
      if (meta && meta.duration > 9) {
        setLongVideo({ youtubeUrl: url, duration: meta.duration });
        setShowSegmentSelector(true);
      } else {
        setYoutubeUrl(url);
      }
    } catch (err) {
      setError("Failed to fetch YouTube video metadata. Please check the URL and try again.");
    }
  };

  const handleLongVideoDetected = (data, duration) => {
    if (data.youtubeUrl) {
      setLongVideo({ youtubeUrl: data.youtubeUrl, duration: data.duration });
      setShowSegmentSelector(true);
      setYoutubeUrl("");
    } else {
      setLongVideo({ file: data, duration });
      setShowSegmentSelector(true);
      setFile(null);
    }
  };

  const handleSegmentSelect = async (segment) => {
    setProcessingSegment(true);
    setError("");
    try {
      if (longVideo.youtubeUrl) {
        setYoutubeSegment(segment);
        setYoutubeUrl(longVideo.youtubeUrl);
        setShowSegmentSelector(false);
        setLongVideo(null);
      } else {
        const trimmedFile = await videoTrimmer.createTrimmedSegment(
          longVideo.file,
          segment.startTime,
          segment.endTime
        );
        setFile(trimmedFile);
        setSelectedSegment(segment);
        setShowSegmentSelector(false);
        setLongVideo(null);
      }
    } catch (error) {
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
      const formData = new FormData();
      formData.append("prompt", prompt);
      if (file) {
        formData.append("video", file);
        if (file.isSegmented) {
          formData.append("segmentStart", file.segmentStart.toString());
          formData.append("segmentEnd", file.segmentEnd.toString());
          formData.append("isSegmented", "true");
        }
      }
      if (youtubeUrl) {
        formData.append("youtubeUrl", youtubeUrl);
        if (youtubeSegment) {
          formData.append("segmentStart", youtubeSegment.startTime.toString());
          formData.append("segmentEnd", youtubeSegment.endTime.toString());
          formData.append("isSegmented", "true");
        }
      }
      const response = await apiService.generateGifs(formData);
      if (response.success) {
        setGifs(response.gifs || []);
        setStep(3);
        setToast("GIFs generated successfully!");
        setTimeout(() => setToast(""), 4000);
      } else {
        throw new Error(
          response.error || response.message || "Failed to generate GIFs"
        );
      }
    } catch (error) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex flex-col items-center justify-center py-8 px-2">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-blue-200 shadow-lg rounded-xl px-6 py-3 text-blue-700 font-semibold animate-bounce-in">
          {toast}
        </div>
      )}
      <div className="w-full max-w-5xl mx-auto">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-6 mb-10">
          {steps.map((s, idx) => (
            <div key={s.label} className="flex flex-col items-center">
              <div className={`w-12 h-12 flex items-center justify-center rounded-full border-2 transition-all duration-300 ${step === idx + 1 ? "bg-gradient-to-tr from-indigo-500 to-blue-500 text-white border-indigo-400 scale-110 shadow-lg" : "bg-white text-indigo-400 border-indigo-100"}`}>
                {s.icon}
              </div>
              <span className={`mt-2 text-sm font-bold ${step === idx + 1 ? "text-indigo-600" : "text-gray-400"}`}>{s.label}</span>
            </div>
          ))}
        </div>
        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-lg border border-blue-100 rounded-3xl shadow-2xl p-8 md:p-12 animate-fade-in glass-effect">
          {step === 1 && !showSegmentSelector && (
            <div className="space-y-8">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-center bg-gradient-to-tr from-indigo-500 to-blue-500 bg-clip-text text-transparent">Upload Video or Paste YouTube Link</h2>
              <FileUpload
                onFileSelect={handleFileSelect}
                onYouTubeUrl={handleYouTubeUrl}
                onLongVideoDetected={handleLongVideoDetected}
              />
              {(file || youtubeUrl) && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center animate-bounce-in">
                  <p className="text-green-700 text-sm">
                    ✅ {file ? (
                      <>
                        File selected: <span className="font-semibold">{file.name}</span>
                        {selectedSegment && (
                          <span className="ml-2 text-blue-600">(Segment: {selectedSegment.startTime.toFixed(1)}s - {selectedSegment.endTime.toFixed(1)}s)</span>
                        )}
                      </>
                    ) : (
                      <>
                        YouTube URL: <span className="font-semibold">{youtubeUrl}</span>
                        {youtubeSegment && (
                          <span className="ml-2 text-blue-600">(Segment: {youtubeSegment.startTime.toFixed(1)}s - {youtubeSegment.endTime.toFixed(1)}s)</span>
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
                  className="px-10 py-3 rounded-full font-semibold text-white bg-gradient-to-tr from-indigo-500 to-blue-500 shadow-md hover:from-indigo-600 hover:to-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  Next Step →
                </button>
              </div>
            </div>
          )}
          {showSegmentSelector && (
            <div className="animate-fade-in">
              <VideoSegmentSelector
                file={longVideo?.file}
                youtubeUrl={longVideo?.youtubeUrl}
                onSegmentSelect={handleSegmentSelect}
                onCancel={handleSegmentCancel}
                duration={longVideo?.duration}
              />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-8 animate-fade-in">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center text-indigo-700">Describe Your GIF Theme</h2>
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
                  disabled={!prompt || loading || serverStatus?.openrouterConfigured === false}
                  className="px-10 py-3 rounded-full font-semibold text-white bg-gradient-to-tr from-green-500 to-blue-500 shadow-md hover:from-green-600 hover:to-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {loading ? "Generating..." : "Generate GIFs ✨"}
                </button>
              </div>
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
            <div className="space-y-8 animate-fade-in">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center text-indigo-700">Your Generated GIFs</h2>
              <GifPreview gifs={gifs} />
              <div className="mt-8 flex justify-center">
                <button
                  onClick={resetForm}
                  className="px-10 py-3 rounded-full font-semibold text-white bg-gradient-to-tr from-indigo-500 to-blue-500 shadow-md hover:from-indigo-600 hover:to-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-lg"
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
  );
};

export default GeneratorPage; 