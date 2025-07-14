import './App.css'
import Pages from "@/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import Login from "@/pages/Login"

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <>
      <Pages />
      <Toaster />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App;