import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663548851963/Q7eUYZ7wbDUp67BwzgNDrw/quotepush-logo-transparent-glow-752pgnLwWZEecZAfuVioaw.webp"
            alt="QuotePush.io"
            className="h-10 w-10"
          />
          <nav className="flex items-center gap-6">
            {isAuthenticated ? (
              <Button onClick={() => window.location.href = '/my-dashboard'} variant="default">
                Dashboard
              </Button>
            ) : (
              <Button onClick={() => window.location.href = getLoginUrl()} variant="default">
                Sign In
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="text-center max-w-2xl">
          {/* Wordmark Logo */}
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663548851963/Q7eUYZ7wbDUp67BwzgNDrw/quotepush-wordmark-gradient-Wo5ei9vpwULx4VshDaMXMg.webp"
            alt="QuotePush.io"
            className="h-24 mx-auto mb-8"
          />

          <p className="text-lg text-slate-600 mb-8">
            Sign in to manage your leads and automate SMS outreach.
          </p>

          <div className="flex flex-col gap-4 mb-12">
            <Button
              onClick={() => window.location.href = getLoginUrl()}
              size="lg"
              className="w-full md:w-auto"
            >
              Sign in with Phone or Email
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full md:w-auto"
              onClick={() => window.open('https://quotepush.io', '_blank')}
            >
              Request a Demo
            </Button>
          </div>

          {/* Stats Section */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <p className="text-slate-600 mb-6">
              They won't answer. But they will text back.
            </p>
            <p className="text-slate-700 mb-6">
              The average American ignores <strong>76% of unknown calls</strong> but reads{" "}
              <strong>98% of text messages</strong> within 3 minutes. Your leads aren't ghosting you,
              they just can't talk right now.
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600">98%</div>
                <div className="text-sm text-slate-600">SMS open rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">3 min</div>
                <div className="text-sm text-slate-600">avg read time</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">45%</div>
                <div className="text-sm text-slate-600">reply rate</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="container mx-auto px-4 text-center text-sm text-slate-600">
          <p className="flex items-center justify-center gap-2 flex-wrap">
            <span>© 2026 QuotePush.io</span>
            <span>•</span>
            <a href="#" className="hover:text-slate-900">Terms of Service</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-900">Privacy Policy</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
