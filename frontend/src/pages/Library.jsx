import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { 
  Library as LibraryIcon, 
  BookOpen, 
  Trash2, 
  PlusCircle, 
  Feather, 
  Clock, 
  Loader2, 
  Sparkles,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

const Library = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchStories = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/stories/my-stories');
      setStories(res.data);
    } catch (err) {
      console.error('Error fetching stories:', err);
      setError(err.response?.data?.message || 'Could not load your stories from the bookshelf.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to remove "${title}" from your bookshelf?`)) {
      return;
    }

    try {
      setDeletingId(id);
      await api.delete(`/stories/${id}`);
      setStories(prev => prev.filter(s => s._id !== id));
    } catch (err) {
      console.error('Error deleting story:', err);
      alert(err.response?.data?.message || 'Failed to delete story.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#1c1917] text-[#f5f5dc] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#38322e] pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-[#d4af37] text-xs uppercase tracking-widest font-semibold mb-1">
              <LibraryIcon className="w-4 h-4" />
              <span>Personal Collection</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#f5f5dc]">
              The Bookshelf
            </h1>
            <p className="text-sm text-[#a8a29e] mt-1">
              Browse, revisit, and listen to all your woven narratives.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="self-start sm:self-auto px-5 py-2.5 bg-[#d4af37] hover:bg-[#c29d29] text-[#1c1917] font-bold rounded-xl flex items-center gap-2 shadow-lg transition text-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Weave New Narrative</span>
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-[#d4af37]" />
            <p className="text-sm text-[#a8a29e] font-serif">Dusting the bookshelf...</p>
          </div>
        ) : stories.length === 0 ? (
          /* Empty State */
          <div className="border border-dashed border-[#3a332f] bg-[#221e1c]/40 rounded-2xl p-16 text-center max-w-lg mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-[#2a2421] border border-[#3e3835] flex items-center justify-center text-[#d4af37] mx-auto mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-serif font-bold text-[#f5f5dc] mb-2">
              Your Bookshelf is Empty
            </h2>
            <p className="text-sm text-[#a8a29e] mb-6">
              You haven't woven any visual tales yet. Step over to the Drafting Table and transform your photos into your first legend!
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#d4af37] hover:bg-[#c29d29] text-[#1c1917] font-bold rounded-xl shadow-lg transition text-sm"
            >
              <Feather className="w-4 h-4" />
              <span>Draft Your First Tale</span>
            </Link>
          </div>
        ) : (
          /* Stories Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stories.map(story => {
              const coverImg = story.images && story.images.length > 0 ? story.images[0] : null;
              const formattedDate = new Date(story.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });

              return (
                <div
                  key={story._id}
                  className="bg-[#241f1c] border border-[#3e3630] rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:border-[#d4af37]/50 transition-all flex flex-col group"
                >
                  {/* Book Cover Image */}
                  <Link
                    to={`/story/${story._id}`}
                    className="relative aspect-[16/10] bg-[#161413] overflow-hidden block"
                  >
                    {coverImg ? (
                      <img
                        src={coverImg}
                        alt={story.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#615953]">
                        <BookOpen className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    <div className="absolute bottom-2.5 left-3 right-3">
                      <span className="text-[11px] font-semibold text-[#d4af37] bg-black/60 px-2 py-0.5 rounded border border-[#d4af37]/30">
                        {story.pages ? story.pages.length : 0} Chapters / Pages
                      </span>
                    </div>
                  </Link>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <Link to={`/story/${story._id}`}>
                        <h3 className="font-serif font-bold text-lg text-[#f5f5dc] group-hover:text-[#d4af37] transition line-clamp-1 mb-1">
                          {story.title}
                        </h3>
                      </Link>

                      <div className="flex items-center gap-1.5 text-xs text-[#a8a29e] mb-4">
                        <Clock className="w-3.5 h-3.5 text-[#78716c]" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-[#38312b] flex items-center justify-between">
                      <Link
                        to={`/story/${story._id}`}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#d4af37] hover:text-[#f3d26b] transition"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Read Book</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </Link>

                      <button
                        onClick={() => handleDelete(story._id, story.title)}
                        disabled={deletingId === story._id}
                        className="text-[#a8a29e] hover:text-red-400 p-1.5 rounded-lg hover:bg-[#332b27] transition cursor-pointer disabled:opacity-40"
                        title="Delete from bookshelf"
                      >
                        {deletingId === story._id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Library;
