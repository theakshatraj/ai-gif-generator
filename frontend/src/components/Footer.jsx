import React from 'react';

const links = {
  Product: [
    { name: 'Features', href: '#' },
    { name: 'Pricing', href: '#' },
    { name: 'API', href: '#' },
    { name: 'Integrations', href: '#' },
  ],
  Resources: [
    { name: 'Documentation', href: '#' },
    { name: 'Tutorials', href: '#' },
    { name: 'Blog', href: '#' },
    { name: 'Community', href: '#' },
  ],
  Company: [
    { name: 'About', href: '#' },
    { name: 'Contact', href: '#' },
    { name: 'Privacy', href: '#' },
    { name: 'Terms', href: '#' },
  ],
};

const socials = [
  {
    name: 'Twitter',
    href: '#',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 19c11 0 14-9 14-14v-1A10 10 0 0024 4.6a9.72 9.72 0 01-2.828.775A4.93 4.93 0 0023.337 3.1a9.864 9.864 0 01-3.127 1.195A4.92 4.92 0 0016.616 2c-2.73 0-4.942 2.21-4.942 4.932 0 .386.045.762.127 1.122C7.728 7.89 4.1 6.13 1.67 3.149c-.423.722-.666 1.561-.666 2.475 0 1.708.87 3.216 2.188 4.099A4.904 4.904 0 012 8.1v.062c0 2.385 1.697 4.374 3.946 4.827-.413.112-.849.172-1.298.172-.318 0-.626-.03-.927-.086.627 1.956 2.444 3.377 4.6 3.417A9.868 9.868 0 012 19.54 13.94 13.94 0 008 21c9.142 0 14.307-7.721 14.307-14.417 0-.22-.005-.438-.015-.654A10.243 10.243 0 0024 4.59z" /></svg>
    ),
  },
  {
    name: 'GitHub',
    href: '#',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.847-2.338 4.695-4.566 4.944.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .267.18.579.688.481C19.138 20.2 22 16.448 22 12.021 22 6.484 17.523 2 12 2z" /></svg>
    ),
  },
  {
    name: 'LinkedIn',
    href: '#',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.28c-.966 0-1.75-.79-1.75-1.76s.784-1.76 1.75-1.76 1.75.79 1.75 1.76-.784 1.76-1.75 1.76zm13.5 11.28h-3v-5.6c0-1.34-.03-3.07-1.87-3.07-1.87 0-2.16 1.46-2.16 2.97v5.7h-3v-10h2.89v1.36h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.59v5.61zm0 0" /></svg>
    ),
  },
  {
    name: 'Email',
    href: '#',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 4.93A2.003 2.003 0 014 4h16c.89 0 1.68.58 1.94 1.41L12 13.13 2.01 4.93zM2 6.98V18c0 1.1.9 2 2 2h16a2 2 0 002-2V6.98l-9.99 8.2a1 1 0 01-1.02 0L2 6.98z" /></svg>
    ),
  },
];

const Footer = () => (
  <footer className="bg-gray-900 text-gray-200 pt-16 pb-8">
    <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-5 gap-12">
      {/* Logo and description */}
      <div className="md:col-span-2 flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2 select-none">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2" className="h-6 w-6">
              <path d="M13 2L3 14h7v8l8-12h-7z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-2xl font-extrabold bg-gradient-to-tr from-indigo-500 to-blue-500 bg-clip-text text-transparent tracking-tight">
            GifCraft AI
          </span>
        </div>
        <p className="text-gray-400 text-base max-w-xs">
          Transform any video into viral GIFs with the power of AI. Create, customize, and share in seconds.
        </p>
        <div className="flex gap-4 mt-2">
          {socials.map((s, i) => (
            <a key={i} href={s.href} className="hover:text-white transition-colors" aria-label={s.name}>
              {s.icon}
            </a>
          ))}
        </div>
      </div>
      {/* Link columns */}
      {Object.entries(links).map(([section, items], i) => (
        <div key={i}>
          <div className="font-bold text-lg mb-4 text-white">{section}</div>
          <ul className="space-y-2">
            {items.map((item, idx) => (
              <li key={idx}>
                <a href={item.href} className="text-gray-400 hover:text-white transition-colors text-base">
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="mt-12 border-t border-gray-800 pt-6 text-center text-gray-500 text-sm">
      © {new Date().getFullYear()} GifCraft AI. All rights reserved.
    </div>
  </footer>
);

export default Footer; 