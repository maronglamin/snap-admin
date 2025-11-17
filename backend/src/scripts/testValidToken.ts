import speakeasy from 'speakeasy';

// The MFA secret from the database
const mfaSecret = 'MQUHEN2SLBAVMWBWNF5XGSR6PFHTI2ZVOYRTCQDFOIWGSQJPJVSA';

console.log('🔍 Testing Valid TOTP Token Generation');
console.log('=====================================');
console.log('');

console.log(`MFA Secret: ${mfaSecret}`);
console.log('');

// Generate current valid token
const currentToken = speakeasy.totp({
  secret: mfaSecret,
  encoding: 'base32',
  step: 30,
  algorithm: 'sha1'
});

console.log(`Current Valid Token: ${currentToken}`);
console.log(`Generated at: ${new Date().toISOString()}`);
console.log('');

// Generate tokens for different time windows
const now = Math.floor(Date.now() / 1000);
const step = 30;

console.log('Valid tokens for different time windows:');
for (let i = -2; i <= 2; i++) {
  const time = now + (i * step);
  const token = speakeasy.totp({
    secret: mfaSecret,
    encoding: 'base32',
    time,
    step,
    algorithm: 'sha1'
  });
  
  const timeLabel = i === 0 ? 'CURRENT' : i > 0 ? `+${i * step}s` : `${i * step}s`;
  console.log(`${timeLabel.padEnd(10)} | ${token} | ${new Date(time * 1000).toISOString()}`);
}

console.log('');
console.log('🧪 Test the enable-mfa endpoint with CURRENT token:');
console.log(`curl -X POST http://snap-admin.cloudnexus.biz:8080/api/auth/enable-mfa \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -d '{"adminId":"cmd9vzyqp0000x25hhvod5m0t","token":"${currentToken}"}'`);
console.log('');
console.log('📱 Use this token in your authenticator app or test API call');
