const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-xl p-8 max-w-sm w-full mx-4 text-center animate-bounce-in">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Generating Your GIFs
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          AI is analyzing your video and creating amazing GIFs...
        </p>
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
            <span>Transcribing audio</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse animation-delay-200"></div>
            <span>Analyzing content</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse animation-delay-400"></div>
            <span>Creating GIFs</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;