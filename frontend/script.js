// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB_UKBNYJxKpxpwgAF3i2YGo6GMzkBG9J8",
    authDomain: "eduface-7fdcb.firebaseapp.com",
    projectId: "eduface-7fdcb",
    storageBucket: "eduface-7fdcb.firebasestorage.app",
    messagingSenderId: "124866749284",
    appId: "1:124866749284:web:a45f27704ce86747251071"
  };
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firebase Auth reference
const auth = firebase.auth();

// Google Sign-In Function
// Google Sign-In Function
async function handleGoogleSignIn() {
    console.log("Google Sign-In button clicked!"); // Debug log
    const provider = new firebase.auth.GoogleAuthProvider();

    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        const email = user.email;
        console.log("User authenticated via Google:", email);

        const response = await fetch('http://localhost:8082/check-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const responseData = await response.json();
        if (responseData.exists) {
            alert(`Welcome back, ${user.displayName}!`);
            window.location.href = '/home'; // Redirect based on role
        } else {
            showRoleSelectionModal(user); // This will now correctly show the modal
        }
    } catch (error) {
        console.error("Error during Google Sign-In:", error);
        alert(`Authentication failed: ${error.message}`);
    }
}

function showRoleSelectionModal(user) {
    const modal = document.querySelector('.custom-modal-body');
    modal.style.display = 'block';

    // Populate user details in the modal if needed (like username)
    document.getElementById('googleRole').addEventListener('change', toggleGoogleField);

    // Handle form submission
    document.getElementById('roleSelectionForm').onsubmit = async function (e) {
        e.preventDefault();

        const role = document.getElementById('googleRole').value;
        if (!role) {
            alert("Please select a role.");
            return;
        }

        // Prepare JSON data to send
        const userData = {
            username: user.displayName,  // user display name
            email: user.email,           // user email
            role: role,                  // selected role from the form
            password: user.uid           // user UID (you may not want to use this directly)
        };

        // Check userData before sending it
        console.log("User data to send:", userData);

        try {
            const signupResponse = await fetch('http://localhost:8082/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'  // Send as JSON
                },
                body: JSON.stringify(userData)  // Send the data as JSON
            });

            if (signupResponse.ok) {
                alert('Account created successfully!');
                modal.style.display = 'none';
                window.location.href = '/index.html'; // Adjusted for redirection
            } else {
                const errorData = await signupResponse.json();
                alert(`Error: ${errorData.error}`);
            }
        } catch (error) {
            console.error("Error during Google Sign-Up:", error);
        }
    };
}


// Handle traditional login
// Traditional Login Handling
document.querySelector('#login-form .submit-btn').addEventListener('click', async function (event) {
    const email = document.querySelector('#login-form .input-field[type="email"]').value;
    const password = document.querySelector('#login-form .input-field[type="password"]').value;

    const response = await fetch('http://localhost:8082/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('jwtToken', data.token);
        // Redirect user based on role
        switch (data.role) {
            case 'Teacher':
                window.location.href = '/teacher-dashboard.html'; // Redirect to teacher dashboard
                break;
            case 'Student':
                window.location.href = '/Student.html'; // Redirect to Student dashboard
                break;
            default:
                window.location.href = '/index.html'; // Default redirection
        }
    } else {
        const errorData = await response.json();
        alert(errorData.error);
    }
});

// Sign-Up form handling
document.querySelector('#signup-form .submit-btn').addEventListener('click', async function (event) {
    event.preventDefault();

    // Get form values
    const fullname = document.querySelector('#signup-form .input-field[type="text"]').value;
    const email = document.querySelector('#signup-form .input-field[type="email"]').value;
    const password = document.querySelector('#signup-form .input-field[type="password"]').value;
    const role = document.querySelector('#signup-form select').value;

    // Ensure all required fields are filled
    if (!fullname || !email || !password || !role) {
        alert("Please fill in all fields.");
        return;
    }

    // Check if user already exists
    const checkUserResponse = await fetch('http://localhost:8082/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });

    const checkUserData = await checkUserResponse.json();
    if (checkUserData.exists) {
        alert('User already exists. Please login instead.');
        return;
    }

    // Prepare the signup data as JSON
    const signupData = {
        username: fullname,
        email: email,
        password: password,
        role: role
    };

    // Proceed with sign-up
    try {
        const signupResponse = await fetch('http://localhost:8082/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },  // Sending JSON data
            body: JSON.stringify(signupData)  // Convert the object to JSON string
        });

        const result = await signupResponse.json();

        if (signupResponse.ok) {
            alert(result.message);
            // document.getElementById('loginSignupModal').style.display = 'none'; // Close modal
            window.location.href = '/index.html'; // Redirect user to home page
        } else {
            alert(result.error);
        }
    } catch (error) {
        console.error("Error during signup:", error);
        alert('An error occurred during signup. Please try again later.');
    }
});

// function showRoleSelectionModal(user) {
//     const modal = document.getElementById('roleSelectionModal'); // Now using the correct modal ID
//     modal.style.display = 'block'; // Show the modal
    
//     document.getElementById('roleSelectionForm').addEventListener('submit', function (event) {
//         event.preventDefault();
//         const role = document.getElementById('googleRole').value;
//         if (role) {
//             // Proceed with saving the role for the user in your database
//             alert(`Role selected: ${role}`);
//             // Store role in your backend or Firebase and redirect
//             window.location.href = '/home'; // Adjust to your system
//         }
//     });
// }

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none'; // Hide modal
}


// Toggle between Login and Sign Up forms
function toggleForm() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    }
}
function toggleGoogleField() {
    const roleField = document.getElementById('googleRole');
    const selectedRole = roleField.value;

    // Example: Show additional fields based on role selection
    if (selectedRole === 'Student') {
        console.log('Student role selected.');
        // Add logic for Student-specific actions here
    } else if (selectedRole === 'Teacher') {
        console.log('Teacher role selected.');
        // Add logic for teacher-specific actions here
    } else {
        console.log('No valid role selected.');
    }
}

function toggleForm() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    }
}

function forgotPassword() {
    alert("Redirecting to the password recovery page.");
    window.location.href = 'reset-password.html'; // Redirect to password reset
}
