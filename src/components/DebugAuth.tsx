import { useAuth } from "@/contexts/AuthContext";

const DebugAuth = () => {
  const { user, loading } = useAuth();

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded-lg z-50 max-w-sm">
      <h3 className="font-bold mb-2">Auth Debug Info:</h3>
      <p>Loading: {loading ? 'Yes' : 'No'}</p>
      <p>User: {user ? 'Logged In' : 'Not Logged In'}</p>
      {user && (
        <div className="text-xs mt-2">
          <p>Email: {user.email}</p>
          <p>Name: {user.displayName || 'No name'}</p>
          <p>UID: {user.uid.substring(0, 8)}...</p>
        </div>
      )}
    </div>
  );
};

export default DebugAuth;
