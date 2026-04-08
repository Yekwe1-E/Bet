// auth.js - Handles Login and Registration logic

document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in
    requireGuest();

    const urlParams = new URLSearchParams(window.location.search);
    let isRegisterMode = urlParams.get('mode') === 'register';

    const form = document.getElementById('auth-form');
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const submitBtn = document.getElementById('submit-btn');
    const registerFields = document.getElementById('register-fields');
    const toggleAuth = document.getElementById('toggle-auth');
    const toggleText = document.getElementById('toggle-text');
    const alertBox = document.getElementById('alert-box');

    function updateUI() {
        if (isRegisterMode) {
            title.textContent = 'Create an Account';
            subtitle.textContent = 'Join the winning team today.';
            submitBtn.textContent = 'Sign Up';
            registerFields.style.display = 'block';
            toggleText.textContent = 'Already have an account?';
            toggleAuth.textContent = 'Sign In';
            
            document.getElementById('name').required = true;
            document.getElementById('phone').required = true;
        } else {
            title.textContent = 'Welcome Back';
            subtitle.textContent = 'Sign in to continue winning.';
            submitBtn.textContent = 'Sign In';
            registerFields.style.display = 'none';
            toggleText.getContext = "Don't have an account?";
            toggleAuth.textContent = 'Sign Up';
            
            document.getElementById('name').required = false;
            document.getElementById('phone').required = false;
        }
        alertBox.style.display = 'none';
    }

    function showAlert(message, isError = true) {
        alertBox.textContent = message;
        alertBox.className = `alert ${isError ? 'alert-error' : 'alert-success'}`;
        alertBox.style.display = 'block';
    }

    toggleAuth.addEventListener('click', (e) => {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        // Update URL without reloading
        const newUrl = isRegisterMode ? '?mode=register' : window.location.pathname;
        window.history.pushState({}, '', newUrl);
        updateUI();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Please wait...';

        try {
            if (isRegisterMode) {
                const name = document.getElementById('name').value;
                const phone = document.getElementById('phone').value;
                
                await fetchAPI('/auth/register', 'POST', { name, email, phone, password });
                
                showAlert('Registration successful! Please log in.', false);
                setTimeout(() => {
                    isRegisterMode = false;
                    updateUI();
                }, 2000);
                
            } else {
                const response = await fetchAPI('/auth/login', 'POST', { email, password });
                
                // Save auth info
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('role', response.data.role);
                localStorage.setItem('user', JSON.stringify(response.data));
                
                // Redirect
                if (response.data.role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/dashboard.html';
                }
            }
        } catch (error) {
            showAlert(error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isRegisterMode ? 'Sign Up' : 'Sign In';
        }
    });

    // Initialize UI
    updateUI();
});
