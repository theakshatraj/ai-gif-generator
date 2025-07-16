import React from 'react';

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Content Creator',
    quote: 'GifCraft AI has revolutionized my content workflow. I can create viral GIFs from my YouTube videos in minutes instead of hours!',
  },
  {
    name: 'Mike Rodriguez',
    role: 'Social Media Manager',
    quote: 'The AI perfectly captures the best moments and adds captions that actually make sense. Our engagement has increased by 300%!',
  },
  {
    name: 'Emma Thompson',
    role: 'Marketing Director',
    quote: 'This tool is a game-changer for our marketing campaigns. The quality and speed of GIF generation is incredible.',
  },
];

const Star = () => (
  <svg className="h-5 w-5 text-yellow-400 inline" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" /></svg>
);

const QuoteIcon = () => (
  <svg className="h-8 w-8 text-purple-200 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 17h.01M15 17h.01M7 7h10v6a4 4 0 01-4 4H7a4 4 0 01-4-4V7z" /></svg>
);

const Avatar = () => (
  <span className="inline-block h-10 w-10 rounded-full bg-gray-200" />
);

const TestimonialsSection = () => (
  <section className="w-full bg-white py-20 border-b border-gray-100">
    <div className="max-w-6xl mx-auto px-4">
      <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-4 bg-gradient-to-tr from-indigo-500 to-blue-500 bg-clip-text text-transparent">Loved by Creators</h2>
      <p className="text-lg text-gray-600 text-center mb-12">Join thousands of content creators who trust GifCraft AI</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {testimonials.map((t, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-xl p-8 flex flex-col border border-gray-100 hover:shadow-2xl transition-all duration-200">
            <div className="mb-2">
              {[...Array(5)].map((_, idx) => <Star key={idx} />)}
            </div>
            <QuoteIcon />
            <blockquote className="text-gray-700 italic mb-6">"{t.quote}"</blockquote>
            <div className="flex items-center gap-3 mt-auto">
              <Avatar />
              <div>
                <div className="font-bold text-gray-900">{t.name}</div>
                <div className="text-gray-500 text-sm">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection; 