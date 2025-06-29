const PromptInput = ({ prompt, onPromptChange }) => {
  const suggestions = [
    "funny moments",
    "emotional quotes", 
    "action scenes",
    "motivational clips",
    "dramatic moments",
    "comedy highlights"
  ];

  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          GIF Theme Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Describe what kind of moments you want to capture (e.g., 'funny moments', 'emotional quotes', 'action scenes')"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
          rows={3}
        />
      </div>
      
      <div>
        <p className="text-sm text-gray-600 mb-2">Popular themes:</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onPromptChange(suggestion)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-primary-100 hover:text-primary-700 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromptInput;