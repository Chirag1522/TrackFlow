import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';
import { Package, Eye, EyeOff, Mail, Lock } from 'lucide-react';

const ROLE_REDIRECTS = { super_admin: '/super-admin', admin: '/admin', agent: '/agent', customer: '/track' };

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const res = await api.post('/auth/login', data);
      login(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate(ROLE_REDIRECTS[res.data.user.role] || '/');
    } catch (err) {
      setServerError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-md px-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition group">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition transform" style={{ backgroundColor: '#F74B25' }}>
            <Package size={22} className="text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">TrackFlow</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Welcome Back</h1>
        <p className="text-lg" style={{ color: '#F74B25' }}>Sign in to manage your courier operations</p>
      </div>

      {/* Form Card */}
      <div className="backdrop-blur-sm rounded-2xl shadow-lg p-8 mb-6" style={{ backgroundColor: '#F6F6F6', borderColor: '#F74B25', borderWidth: '2px' }}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2.5">Email address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-3.5" style={{ color: '#F74B25' }} />
              <input
                type="email"
                className="w-full pl-10 pr-4 py-3 border text-gray-900 placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 transition"
                style={{ backgroundColor: '#F6F6F6', borderColor: '#F74B25', borderWidth: '1px' }}
                placeholder="admin@democourier.com"
                onFocus={(e) => e.target.style.ringColor = '#F74B25'}
                {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
              />
            </div>
            {errors.email && <p className="text-xs text-red-400 mt-2 font-medium">{errors.email.message}</p>}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2.5">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-3.5" style={{ color: '#F74B25' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-10 pr-11 py-3 border text-gray-900 placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 transition"
                style={{ backgroundColor: '#F6F6F6', borderColor: '#F74B25', borderWidth: '1px' }}
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 transition"
                style={{ color: '#F74B25' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400 mt-2 font-medium">{errors.password.message}</p>}
          </div>

          {/* Error Message */}
          {serverError && (
            <div className="bg-red-500/15 border border-red-500/40 rounded-xl px-4 py-3 text-sm text-red-300 font-medium">
              ⚠️ {serverError}
            </div>
          )}

          {/* Sign In Button */}
          <button type="submit" disabled={isSubmitting}
            className="w-full py-3 text-white font-semibold rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg mt-7"
            style={{ backgroundColor: '#F74B25' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#E63A1A'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#F74B25'}>
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in…
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
      </div>

      {/* Footer */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Need help? 
          <a href="mailto:support@courier.com" className="font-medium ml-1 transition" style={{ color: '#F74B25' }}>
            Contact support
          </a>
        </p>
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-400 font-medium mt-3 inline-flex items-center gap-1 transition">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
