import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { Feather, BookOpen, Sparkles, Mail, Lock, User as UserIcon, Calendar, Phone, MapPin, Loader2, AlertCircle } from 'lucide-react';

const Auth = () => {
  const { user, login, signup } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name || !email || !password) {
          setError('Please fill in all required fields (Name, Email, Password)');
          setLoading(false);
          return;
        }
        await signup({ name, email, password, dob, phone, address });
      } else {
        if (!email || !password) {
          setError('Please enter your email and password');
          setLoading(false);
          return;
        }
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Authentication failed. Please check your details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1c1917] text-[#f5f5dc] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#854d0e]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-[#231f1d] border border-[#3e3835] rounded-2xl shadow-2xl p-8 relative z-10 backdrop-blur-sm">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#292524] border border-[#d4af37]/40 shadow-inner mb-4 text-[#d4af37]">
            <Feather className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#d4af37] tracking-wide">
            The Visual Narrator
          </h1>
          <p className="text-sm text-[#a8a29e] mt-1.5 font-light">
            Where memories become legends
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-[#1a1715] p-1 rounded-xl mb-6 border border-[#38322e]">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
              !isSignUp
                ? 'bg-[#292524] text-[#d4af37] shadow-sm font-semibold'
                : 'text-[#a8a29e] hover:text-[#f5f5dc]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
              isSignUp
                ? 'bg-[#292524] text-[#d4af37] shadow-sm font-semibold'
                : 'text-[#a8a29e] hover:text-[#f5f5dc]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error message alert */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-950/60 border border-red-800/60 text-red-200 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#a8a29e] mb-1 font-semibold">
                  Full Name *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716c]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Eleni Vance"
                    className="w-full bg-[#1a1715] border border-[#3e3835] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#f5f5dc] focus:outline-none focus:border-[#d4af37] transition placeholder-[#57534e]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#a8a29e] mb-1 font-semibold">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716c]" />
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-[#1a1715] border border-[#3e3835] rounded-lg pl-10 pr-3 py-2.5 text-xs text-[#f5f5dc] focus:outline-none focus:border-[#d4af37] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#a8a29e] mb-1 font-semibold">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716c]" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+123..."
                      className="w-full bg-[#1a1715] border border-[#3e3835] rounded-lg pl-10 pr-3 py-2.5 text-xs text-[#f5f5dc] focus:outline-none focus:border-[#d4af37] transition placeholder-[#57534e]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#a8a29e] mb-1 font-semibold">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716c]" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="City, Realm or Country"
                    className="w-full bg-[#1a1715] border border-[#3e3835] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#f5f5dc] focus:outline-none focus:border-[#d4af37] transition placeholder-[#57534e]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#a8a29e] mb-1 font-semibold">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716c]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="author@library.com"
                className="w-full bg-[#1a1715] border border-[#3e3835] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#f5f5dc] focus:outline-none focus:border-[#d4af37] transition placeholder-[#57534e]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#a8a29e] mb-1 font-semibold">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716c]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1a1715] border border-[#3e3835] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#f5f5dc] focus:outline-none focus:border-[#d4af37] transition placeholder-[#57534e]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-[#d4af37] hover:bg-[#c29d29] text-[#1c1917] font-semibold rounded-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition duration-200 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Preparing the Quill...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{isSignUp ? 'Begin Storytelling Journey' : 'Enter the Library'}</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            className="text-xs text-[#a8a29e] hover:text-[#d4af37] underline transition cursor-pointer"
          >
            {isSignUp ? 'Already a member? Sign In here' : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
