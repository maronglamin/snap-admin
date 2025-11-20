// Utility to test authentication flow
export const testAuthentication = async () => {
  console.log('🧪 Testing complete authentication flow...');
  
  // Test 1: Check if user is logged in
  const authStorage = localStorage.getItem('auth-storage');
  console.log('🧪 Current auth storage:', authStorage);
  
  if (!authStorage) {
    console.log('🧪 No auth storage found - user needs to login');
    return false;
  }
  
  try {
    const parsed = JSON.parse(authStorage);
    const token = parsed.state?.token || parsed.token;
    
    if (!token) {
      console.log('🧪 No token found in auth storage');
      return false;
    }
    
    console.log('🧪 Token found:', token.substring(0, 20) + '...');
    
    // Test 2: Test API call with token
    const response = await fetch('http://localhost:8080/api/roles', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🧪 API test response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('🧪 API test successful:', data.success);
      return true;
    } else {
      const errorData = await response.json();
      console.log('🧪 API test failed:', errorData);
      return false;
    }
  } catch (error) {
    console.error('🧪 Authentication test error:', error);
    return false;
  }
};

// Force login function
export const forceLogin = async () => {
  console.log('🧪 Force logging in...');
  
  try {
    const response = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    console.log('🧪 Force login response:', data);
    
    if (data.success) {
      // Store the token manually
      const authData = {
        state: {
          isAuthenticated: true,
          user: data.data.admin,
          token: data.data.token
        }
      };
      
      localStorage.setItem('auth-storage', JSON.stringify(authData));
      console.log('🧪 Force login successful - token stored');
      
      // Reload the page to update the auth state
      window.location.reload();
      return true;
    } else {
      console.log('🧪 Force login failed');
      return false;
    }
  } catch (error) {
    console.error('🧪 Force login error:', error);
    return false;
  }
}; 