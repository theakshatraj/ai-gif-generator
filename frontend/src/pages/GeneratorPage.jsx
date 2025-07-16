import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const GeneratorPage = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-grow container mx-auto py-10 px-4">
      {/* TODO: Insert GIF Generator UI here */}
      <div className="text-center text-2xl text-gray-700 font-semibold">GIF Generator UI goes here</div>
    </main>
    <Footer />
  </div>
);

export default GeneratorPage; 