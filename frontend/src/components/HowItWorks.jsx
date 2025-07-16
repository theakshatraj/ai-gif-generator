import React from 'react';

const steps = [
  {
    icon: '💡',
    title: 'Enter a Prompt',
    desc: 'Describe your GIF theme, e.g., “funny moments” or “motivational clips”.',
  },
  {
    icon: '🎬',
    title: 'Add Video',
    desc: 'Paste a YouTube link or upload an MP4 file.',
  },
  {
    icon: '✨',
    title: 'Get Captioned GIFs',
    desc: 'AI finds the best moments, adds captions, and generates GIFs for you to download.',
  },
];

const HowItWorks = () => (
  <section className="py-12 bg-white">
    <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">How It Works</h2>
    <div className="flex flex-col md:flex-row justify-center items-stretch gap-8 max-w-4xl mx-auto">
      {steps.map((step, idx) => (
        <div key={idx} className="flex-1 bg-blue-50 rounded-lg p-6 text-center shadow-sm">
          <div className="text-4xl mb-4">{step.icon}</div>
          <h3 className="text-xl font-semibold mb-2 text-gray-800">{step.title}</h3>
          <p className="text-gray-600">{step.desc}</p>
        </div>
      ))}
    </div>
  </section>
);

export default HowItWorks; 