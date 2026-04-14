import { useNavigate } from 'react-router-dom';
import { ArrowRight, Box, LogIn, MapPinned, PackageSearch, Truck } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
              <Truck size={18} />
            </div>
            <span className="text-lg font-semibold text-gray-900">TrackFlow</span>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <button onClick={() => navigate('/track')} className="btn-secondary inline-flex items-center gap-2">
              <PackageSearch size={16} />
              Track Shipment
            </button>
            <button onClick={() => navigate('/login')} className="btn-primary inline-flex items-center gap-2">
              <LogIn size={16} />
              Login
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Reliable courier delivery at your fingertips.
            </h1>

            <p className="mt-4 max-w-xl text-base leading-7 text-gray-600 sm:text-lg">
              Track your shipments in real-time, manage deliveries efficiently, and keep your business running smoothly.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => navigate('/track')} className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 text-base">
                Track Shipment
                <ArrowRight size={18} />
              </button>
              <button onClick={() => navigate('/login')} className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 text-base">
                Login
                <LogIn size={16} />
              </button>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-900">Real-time Updates</p>
                <p className="mt-1 text-sm text-gray-500">Get instant notifications for every delivery milestone.</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-900">Multi-stop Tracking</p>
                <p className="mt-1 text-sm text-gray-500">Monitor multiple shipments and routes effortlessly.</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-900">Simple Analytics</p>
                <p className="mt-1 text-sm text-gray-500">Insights into your delivery performance and metrics.</p>
              </div>
            </div>
          </section>

          <aside className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-gray-50 to-orange-50 p-6 shadow-sm sm:p-8">
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-orange-200/50 blur-3xl" />
            <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-amber-200/50 blur-3xl" />

            <div className="relative rounded-2xl border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur-sm sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">Smart Delivery</p>
                  <h2 className="mt-2 text-2xl font-semibold text-gray-900">Fast, reliable shipments</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-gray-600">
                    Streamlined delivery management with powerful tracking and operational control.
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-sm">
                  <Truck size={22} />
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
                      <MapPinned size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Route progress</p>
                      <p className="text-xs text-gray-500">Pickup to delivery</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">In transit</span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
                        <Box size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Tracking</p>
                        <p className="text-xs text-gray-500">Public page</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
                        <Truck size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Login</p>
                        <p className="text-xs text-gray-500">Operations panel</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
