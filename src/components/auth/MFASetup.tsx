import React, { useState } from 'react';
import { Check, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface MFASetupProps {
  onComplete: () => void;
}

const MFASetup: React.FC<MFASetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'intro' | 'qrcode' | 'verify'>('intro');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { enableMFA, pendingAdminId, mfaData } = useAuthStore();

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter the 6-digit code from your authenticator app');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!pendingAdminId) {
        setError('Admin ID not found. Please try logging in again.');
        return;
      }
      const success = await enableMFA(pendingAdminId, token);
      
      if (success) {
        // Show success briefly before redirecting
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (error) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderIntroStep = () => (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Enhance your account security
        </h2>
        <p className="text-gray-600">
          Two-factor authentication adds an extra layer of security to your
          account by requiring access to your phone in addition to your
          password.
        </p>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
        <h3 className="font-medium text-gray-800 mb-2">How it works:</h3>
        <ol className="list-decimal pl-5 space-y-2 text-gray-600">
          <li>Set up an authenticator app on your mobile device</li>
          <li>Scan the QR code or enter the provided key</li>
          <li>Enter the verification code from the app</li>
          <li>You're all set! You'll use this app for future logins</li>
        </ol>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Important</p>
            <p className="text-sm text-blue-700 mt-1">
              Keep your authenticator app secure. If you lose access, you'll need to contact an administrator to reset your MFA.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => setStep('qrcode')}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
      >
        <span>Begin setup</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </>
  );

  const renderQrCodeStep = () => (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Scan this QR code
        </h2>
        <p className="text-gray-600 mb-4">
          Use an authenticator app like Google Authenticator, Authy, or
          Microsoft Authenticator to scan this QR code.
        </p>
        
        <div className="flex justify-center my-6">
          <div className="bg-white p-3 border border-gray-300 rounded-lg">
            <img 
              src={mfaData?.qrCode} 
              alt="MFA QR Code" 
              className="w-48 h-48"
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
          <p className="text-sm text-gray-600 font-medium mb-2">
            Manual entry code:
          </p>
          <p className="font-mono text-gray-800 text-lg tracking-wider break-all">
            {mfaData?.secret}
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Security Note</p>
              <p className="text-sm text-yellow-700 mt-1">
                Each backup code can only be used once. Generate new codes if you've used most of them.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => setStep('intro')}
          className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium flex items-center justify-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          onClick={() => setStep('verify')}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </>
  );

  const renderVerifyStep = () => (
    <form onSubmit={handleVerifyCode}>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Verify your setup
        </h2>
        <p className="text-gray-600 mb-4">
          Enter the 6-digit verification code from your authenticator app to
          complete the setup.
        </p>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Verification code
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
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={() => setStep('qrcode')}
          className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium flex items-center justify-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          type="submit"
          disabled={token.length !== 6 || loading}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
        >
          {loading ? 'Verifying...' : 'Complete setup'}
        </button>
      </div>
    </form>
  );

  const renderContent = () => {
    switch (step) {
      case 'intro':
        return renderIntroStep();
      case 'qrcode':
        return renderQrCodeStep();
      case 'verify':
        return renderVerifyStep();
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Two-Factor Authentication</h1>
          <p className="text-blue-100 mt-1">
            {step === 'intro' ? 'Set up additional security' : 
             step === 'qrcode' ? 'Scan QR code' : 'Verify setup'}
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="px-8 pt-6">
        <div className="flex items-center justify-center space-x-2 mb-6">
          <div className={`w-3 h-3 rounded-full ${step === 'intro' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`w-3 h-3 rounded-full ${step === 'qrcode' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`w-3 h-3 rounded-full ${step === 'verify' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default MFASetup;
