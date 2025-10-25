import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface MFAVerificationProps {
  onComplete: () => void;
}

const MFAVerification: React.FC<MFAVerificationProps> = ({ onComplete }) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { pendingAdminId, verifyMFA } = useAuthStore();

  const handleVerify = async () => {
    if (!pendingAdminId) {
      setError('Admin ID not found. Please try logging in again.');
      return;
    }

    if (!token.trim() || token.length !== 6) {
      setError('Please enter the complete 6-digit code from your authenticator app');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await verifyMFA(pendingAdminId, token);
      if (success) {
        onComplete();
      } else {
        setError('Invalid verification code');
      }
    } catch (error) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Two-Factor Authentication</h1>
          <p className="text-blue-100 mt-1">Enter your authentication code</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Authenticator App Code
          </h2>
          <p className="text-gray-600">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Authentication Code
            </label>
            <div className="flex justify-center space-x-2">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className="w-12 h-14 text-center text-xl font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={token[index] || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 1);
                    const newToken = token.split('');
                    newToken[index] = value;
                    setToken(newToken.join(''));
                    
                    // Auto-focus next input
                    if (value && index < 5) {
                      const nextInput = document.getElementById(`otp-input-${index + 1}`);
                      nextInput?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    // Handle backspace to go to previous input
                    if (e.key === 'Backspace' && !token[index] && index > 0) {
                      const prevInput = document.getElementById(`otp-input-${index - 1}`);
                      prevInput?.focus();
                    }
                  }}
                  id={`otp-input-${index}`}
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <button
            onClick={handleVerify}
            disabled={loading || token.length !== 6}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Verifying...' : 'Verify & Login'}
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-800 mb-3">
            Need Help?
          </h3>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Having trouble with your authenticator app? Here are some common solutions:
            </p>
            
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-semibold">1</span>
                </div>
                <p className="text-sm text-gray-700">Make sure your device time is accurate</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-semibold">2</span>
                </div>
                <p className="text-sm text-gray-700">Wait for a fresh 6-digit code</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-semibold">3</span>
                </div>
                <p className="text-sm text-gray-700">Ensure you're using the correct authenticator app</p>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-700">
                <strong>Still having issues?</strong> Contact your system administrator for assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MFAVerification;
