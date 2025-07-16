import React from 'react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/forever',
    icon: (
      <svg className="h-10 w-10 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h7v8l8-12h-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ),
    features: [
      '5 GIFs per month',
      'Basic AI analysis',
      'Standard quality exports',
      'Community support',
      'Watermarked GIFs',
    ],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$5',
    period: '/per month',
    icon: (
      <svg className="h-10 w-10 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
    ),
    features: [
      '100 GIFs per month',
      'Advanced AI analysis',
      'HD quality exports',
      'Priority support',
      'No watermarks',
      'Batch processing',
      'Custom captions',
    ],
    cta: 'Start Pro Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '$50',
    period: '/per month',
    icon: (
      <svg className="h-10 w-10 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
    ),
    features: [
      'Unlimited GIFs',
      'Premium AI models',
      '4K quality exports',
      'Dedicated support',
      'Team collaboration',
      'API access',
      'Custom branding',
      'Analytics dashboard',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
];

const PricingSection = () => (
  <section className="w-full bg-gradient-to-b from-[#faf7ff] to-white py-20 border-b border-gray-100">
    <div className="max-w-6xl mx-auto px-4">
      <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-4 bg-gradient-to-tr from-indigo-500 to-blue-500 bg-clip-text text-transparent">Simple Pricing</h2>
      <p className="text-lg text-gray-600 text-center mb-12">Choose the perfect plan for your GIF creation needs</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, i) => (
          <div
            key={i}
            className={`relative bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center border border-gray-100 hover:shadow-2xl transition-all duration-200 ${plan.highlight ? 'ring-2 ring-indigo-300 scale-105 z-10' : ''}`}
          >
            {plan.highlight && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-xs shadow">Most Popular</span>
            )}
            <div className="mb-4">{plan.icon}</div>
            <div className="font-bold text-2xl text-gray-900 mb-2 text-center">{plan.name}</div>
            <div className="text-4xl font-extrabold text-indigo-500 mb-1">{plan.price}</div>
            <div className="text-gray-500 text-sm mb-6">{plan.period}</div>
            <ul className="mb-8 space-y-2 w-full">
              {plan.features.map((f, idx) => (
                <li key={idx} className="flex items-center gap-2 text-gray-700 text-base">
                  <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={`w-full py-3 rounded-xl font-semibold text-lg shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${plan.highlight ? 'bg-gradient-to-tr from-indigo-500 to-blue-500 text-white hover:from-indigo-600 hover:to-blue-600' : 'bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-50'}`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default PricingSection; 