import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { 
  Upload, 
  Sparkles, 
  Trash2, 
  Image as ImageIcon, 
  Globe, 
  Feather, 
  Loader2, 
  AlertCircle,
  PlusCircle,
  ArrowRight
} from 'lucide-react';

const SUPPORTED_LANGUAGES = [
  "English", "Spanish", "French", "German", "Hindi", "Telugu", "Tamil", "Italian", 
  "Japanese", "Chinese (Simplified)", "Portuguese", "Russian", "Arabic", "Korean", 
  "Dutch", "Turkish", "Bengali", "Marathi", "Gujarati", "Kannada", "Malayalam"
];

const Dashboard = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [images, setImages] = useState([]); // Array of { id, base64, mimeType, description, name }
  const [context, setContext] = useState('');
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = (files) => {
    setError('');
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    
    if (newFiles.length === 0) {
      setError('Please select valid image files.');
      return;
    }

    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            base64: e.target.result,
            mimeType: file.type,
            description: '',
            name: file.name
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const updateDescription = (id, desc) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, description: desc } : img));
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleGenerate = async () => {
    if (images.length === 0) {
      setError('Please upload at least one image to weave a story.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const payload = {
        images: images.map(img => ({
          base64: img.base64,
          mimeType: img.mimeType,
          description: img.description
        })),
        context: context.trim(),
        language: language
      };

      const response = await api.post('/stories/generate', payload);
      const story = response.data;
      navigate(`/story/${story._id}`);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to weave story. Please try again.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1c1917] text-[#f5f5dc] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        {/* Hero Banner */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#38322e] pb-6">
          <div>
            <div className="flex items-center gap-2 text-[#d4af37] text-xs uppercase tracking-widest font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Creative Workshop</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#f5f5dc]">
              The Drafting Table
            </h1>
            <p className="text-sm text-[#a8a29e] mt-1 max-w-2xl">
              Arrange your visual memories on the table, impart guidance to the narrator, and watch an enchanting tale unfold.
            </p>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-3 bg-[#262220] border border-[#3e3835] rounded-xl px-4 py-2.5">
            <Globe className="w-4 h-4 text-[#d4af37]" />
            <div className="flex flex-col">
              <span className="text-[10px] text-[#a8a29e] uppercase font-semibold tracking-wider">Story Language</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-sm font-medium text-[#f5f5dc] focus:outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang} value={lang} className="bg-[#262220] text-[#f5f5dc]">
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Story Master Prompt / Context */}
        <div className="mb-8 bg-[#231f1d] border border-[#3e3835] rounded-2xl p-5 shadow-lg">
          <label className="flex items-center gap-2 text-sm font-semibold text-[#d4af37] mb-2 font-serif">
            <Feather className="w-4 h-4" />
            Overall Story Premise or Prompt (Optional)
          </label>
          <input
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g., A magical voyage through the misty mountains to find the lost clockwork star..."
            className="w-full bg-[#191615] border border-[#38322e] rounded-xl px-4 py-3 text-sm text-[#f5f5dc] placeholder-[#6e6863] focus:outline-none focus:border-[#d4af37] transition"
          />
        </div>

        {/* Upload Zone / Gallery Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-serif font-bold text-[#f5f5dc] flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#d4af37]" />
              Visual Scenes ({images.length})
            </h2>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-xs font-semibold bg-[#2a2522] hover:bg-[#362f2b] text-[#d4af37] border border-[#d4af37]/40 px-3.5 py-2 rounded-lg transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Images</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {images.length === 0 ? (
            /* Empty State / Drag & Drop Target */
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#443c37] hover:border-[#d4af37] bg-[#211d1b]/60 rounded-2xl p-12 text-center cursor-pointer transition group"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#2a2522] border border-[#3e3835] group-hover:border-[#d4af37]/60 flex items-center justify-center mx-auto mb-4 text-[#a8a29e] group-hover:text-[#d4af37] transition">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-serif font-semibold text-[#f5f5dc] mb-1">
                Drop your memories here
              </h3>
              <p className="text-xs text-[#a8a29e] max-w-sm mx-auto">
                Upload image sequences (JPG, PNG, WebP) to begin weaving an enchanted storybook.
              </p>
            </div>
          ) : (
            /* Uploaded Images Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="bg-[#24201e] border border-[#3e3835] rounded-xl overflow-hidden shadow-lg flex flex-col transition hover:border-[#524943]"
                >
                  {/* Image container */}
                  <div className="relative aspect-[4/3] bg-black/40 overflow-hidden group">
                    <img
                      src={img.base64}
                      alt={`Scene ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-sm text-[#d4af37] text-xs font-bold px-2.5 py-1 rounded-md border border-[#d4af37]/30">
                      Scene {idx + 1}
                    </div>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute top-2.5 right-2.5 bg-black/70 hover:bg-red-900/80 text-white/80 hover:text-white p-1.5 rounded-md border border-white/10 hover:border-red-500/50 transition cursor-pointer"
                      title="Remove scene"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Scene Note / Context */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-[#a8a29e] font-semibold mb-1.5">
                        Scene Note (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={img.description}
                        onChange={(e) => updateDescription(img.id, e.target.value)}
                        placeholder="What is happening in this moment?"
                        className="w-full bg-[#1a1715] border border-[#3a3430] rounded-lg p-2.5 text-xs text-[#f5f5dc] placeholder-[#665f5a] focus:outline-none focus:border-[#d4af37] transition resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add more button tile */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#3d3632] hover:border-[#d4af37] rounded-xl flex flex-col items-center justify-center p-8 cursor-pointer transition group min-h-[220px]"
              >
                <PlusCircle className="w-10 h-10 text-[#78716c] group-hover:text-[#d4af37] transition mb-2" />
                <span className="text-sm font-medium text-[#a8a29e] group-hover:text-[#f5f5dc] transition">
                  Add Another Scene
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Generate / Weave Button */}
        {images.length > 0 && (
          <div className="flex justify-end pt-4 border-t border-[#38322e]">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-8 py-3.5 bg-gradient-to-r from-[#d4af37] to-[#b38f26] hover:from-[#e0bd49] hover:to-[#c49e2f] text-[#1c1917] font-bold rounded-xl flex items-center gap-3 shadow-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>The Narrator is Weaving Your Tale...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Weave Storybook ({images.length} Scenes)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
