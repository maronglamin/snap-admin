# 🔍 MFA Troubleshooting Guide

## 🚨 "Invalid verification code. Please try again." Error

If you're getting this error after scanning the QR code with Authy or another authenticator app, follow these troubleshooting steps:

## 🔧 Immediate Solutions

### 1. **Check Token Format**
- Ensure you're entering exactly **6 digits**
- Remove any spaces or special characters
- The code should look like: `123456` (not `123 456` or `123-456`)

### 2. **Time Synchronization**
- **Most Common Issue**: Your device time might be out of sync
- TOTP codes are time-based and expire every 30 seconds
- Check your device's date and time settings
- Ensure automatic time synchronization is enabled

### 3. **Code Freshness**
- TOTP codes are only valid for 30 seconds
- Generate a **fresh code** from your authenticator app
- Enter the code **immediately** after it appears
- Don't wait more than 30 seconds to enter the code

### 4. **Authenticator App Settings**
- **For Authy**: Ensure it's set to TOTP mode (not HOTP)
- **For Google Authenticator**: Verify it's the latest version
- **For Microsoft Authenticator**: Check TOTP settings

## 🧪 Debug Steps

### Step 1: Check Backend Logs
Look for these debug messages in your backend console:
```
MFA Debug: Verifying token: 123456 with secret: ABCDEFGH...
MFA Debug: TOTP verification result: false
MFA Debug: Current valid tokens - Previous: 123456, Current: 789012, Next: 345678
```

### Step 2: Use Debug Endpoint
Call the debug endpoint to check MFA setup:
```bash
GET /api/auth/debug-mfa/{adminId}
```

### Step 3: Test with Known Token
Use the debug script to generate valid tokens:
```bash
cd backend
npx ts-node src/scripts/debugMFA.ts
```

## 📱 Authenticator App Setup

### Authy Setup (Recommended)
1. **Install Authy** from your app store
2. **Scan QR Code** during MFA setup
3. **Verify Settings**:
   - Algorithm: SHA1
   - Digits: 6
   - Period: 30 seconds
4. **Generate Code** and enter immediately

### Google Authenticator Setup
1. **Install Google Authenticator**
2. **Scan QR Code** during MFA setup
3. **Verify Code** appears as 6 digits
4. **Enter Code** within 30 seconds

### Manual Entry (If QR Code Fails)
If scanning fails, manually enter:
- **Secret**: The secret key shown during setup
- **Account**: Your email address
- **Issuer**: SNAP Marketplace

## ⏰ Time-Related Issues

### Server Time Check
The backend debug script shows server time. Compare with your device:
```bash
# Backend time (from debug script)
Current Server Time: 2025-09-03T00:19:15.361Z

# Your device time should be within ±2 minutes
```

### Clock Skew Tolerance
- Backend allows ±3 time steps (90 seconds)
- If your device is more than 90 seconds off, codes will fail
- Sync your device time with an NTP server

## 🔍 Advanced Debugging

### Check MFA Service
The enhanced MFA service now includes:
- **Token cleaning**: Removes non-numeric characters
- **Multiple verification methods**: Primary + alternative
- **Detailed logging**: Shows verification steps
- **Clock skew tolerance**: Increased from 2 to 3 steps

### Database Verification
Check if MFA fields exist:
```sql
SELECT id, email, mfa_enabled, mfa_secret, mfa_verified 
FROM admins 
WHERE id = 'your-admin-id';
```

## 🚀 Quick Fixes

### Fix 1: Restart Authenticator App
1. Close your authenticator app completely
2. Reopen and scan the QR code again
3. Generate a fresh code

### Fix 2: Check Device Time
1. Go to device settings
2. Date & Time → Set automatically
3. Wait for sync to complete
4. Try MFA again

### Fix 3: Use Backup Codes
If TOTP continues to fail:
1. Click "Use backup code" during verification
2. Enter one of your 8 backup codes
3. Access your account
4. Re-setup MFA later

### Fix 4: Clear Browser Cache
1. Clear browser cache and cookies
2. Restart browser
3. Try login again

## 📞 Getting Help

### Check These First
1. **Backend Console**: Look for MFA debug messages
2. **Browser Console**: Check for JavaScript errors
3. **Network Tab**: Verify API calls are successful
4. **Device Time**: Ensure it's synchronized

### Common Error Messages
- `"Invalid MFA token"` → Time sync or code format issue
- `"MFA not set up"` → Database schema issue
- `"Server error"` → Backend configuration problem

### Debug Information to Collect
- Backend console logs
- Browser console errors
- Device time vs server time
- Authenticator app settings
- MFA debug endpoint response

## 🎯 Success Checklist

MFA should work when:
- ✅ Device time is synchronized
- ✅ 6-digit code is entered within 30 seconds
- ✅ Authenticator app is properly configured
- ✅ Backend is running and accessible
- ✅ Database has MFA fields
- ✅ MFA service is working

## 🔄 If All Else Fails

### Emergency Access
1. Use backup codes to access account
2. Disable MFA temporarily
3. Re-setup MFA with fresh credentials
4. Test with different authenticator app

### Reset MFA
1. Access database directly
2. Clear MFA fields for your admin account
3. Go through setup process again
4. Test thoroughly before enabling

---

**Remember**: MFA verification is time-sensitive. The most common issue is time synchronization between your device and the server.
