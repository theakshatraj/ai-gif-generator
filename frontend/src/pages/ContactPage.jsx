import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ContactPage = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-grow container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-4 text-gray-900">Contact Us</h1>
      <p className="text-lg text-gray-700 max-w-2xl mb-6">
        Have questions, feedback, or need support? Reach out to us below.
      </p>
      <form className="max-w-lg mx-auto bg-white rounded-lg shadow p-6 flex flex-col gap-4">
        <input type="text" placeholder="Your Name" className="border rounded px-4 py-2" />
        <input type="email" placeholder="Your Email" className="border rounded px-4 py-2" />
        <textarea placeholder="Your Message" className="border rounded px-4 py-2 min-h-[100px]" />
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">Send Message</button>
      </form>
    </main>
    <Footer />
  </div>
);

export default ContactPage; 