// auth.js
let isLogin = true;

document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  window.Auth.getSession().then(session => {
    if (session) window.location.href = 'index.html';
  });

  const form = document.getElementById('authForm');
  const toggleBtn = document.getElementById('toggleAuthBtn');
  
  toggleBtn.addEventListener('click', () => {
    isLogin = !isLogin;
    document.getElementById('authTitle').textContent = isLogin ? 'Welcome Back' : 'Create Account';
    document.getElementById('authSub').textContent = isLogin ? 'Sign in to access your dashboard' : 'Start your productivity journey';
    document.getElementById('toggleText').textContent = isLogin ? "Don't have an account?" : 'Already have an account?';
    toggleBtn.textContent = isLogin ? 'Sign up' : 'Sign in';
    document.getElementById('authSubmitBtn').textContent = isLogin ? 'Sign In' : 'Sign Up';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('authError');
    const submitBtn = document.getElementById('authSubmitBtn');

    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Loading...';

    try {
      const { data, error } = isLogin 
        ? await window.Auth.signIn(email, password)
        : await window.Auth.signUp(email, password);

      if (error) throw error;

      if (data.user && !data.session) {
        // Signup successful but needs email confirmation
        errorEl.style.display = 'block';
        errorEl.style.background = 'rgba(74, 181, 139, 0.1)';
        errorEl.style.color = 'var(--accent-3)';
        errorEl.textContent = 'Account created! Please check your email to verify your account.';
      } else if (data.session) {
        window.location.href = 'index.html';
      }
    } catch (error) {
      errorEl.style.display = 'block';
      errorEl.style.background = 'rgba(233, 69, 96, 0.1)';
      errorEl.style.color = 'var(--danger)';
      errorEl.textContent = error.message || 'An error occurred during authentication';
      submitBtn.disabled = false;
      submitBtn.textContent = isLogin ? 'Sign In' : 'Sign Up';
    }
  });
});