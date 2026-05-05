// Firebase configuration
// To enable Google Sign-In, you need to:
// 1. Create a Firebase project at https://console.firebase.google.com
// 2. Enable Google Sign-In in Authentication > Sign-in method
// 3. Add your domain to Authorized domains
// 4. Replace the config below with your project's config

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// Firebase configuration - 3D Matematik Modellar
const firebaseConfig = {
    apiKey: "AIzaSyDnvUHmejOoCXV922iFE1Jwx3PZlCTQj5M",
    authDomain: "d-matematik-modellar.firebaseapp.com",
    projectId: "d-matematik-modellar",
    storageBucket: "d-matematik-modellar.firebasestorage.app",
    messagingSenderId: "269744831453",
    appId: "1:269744831453:web:e5895370e2d459d2129434",
    measurementId: "G-YGLC3KYEEM"
};

// Initialize Firebase
let app;
let auth;
let googleProvider;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();

    // Request additional scopes
    googleProvider.addScope('profile');
    googleProvider.addScope('email');

    // Set custom parameters
    googleProvider.setCustomParameters({
        prompt: 'select_account' // Always show account selection
    });
} catch (error) {
    console.warn('Firebase initialization error:', error);
}

// Sign in with Google
export const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
        console.error('Firebase not initialized');
        return { success: false, error: 'Firebase not initialized' };
    }

    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        return {
            success: true,
            user: {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL
            }
        };
    } catch (error) {
        console.error('Google sign-in error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Sign out
export const signOutUser = async () => {
    if (!auth) return;

    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
};

// Get current user
export const getCurrentUser = () => {
    return auth?.currentUser || null;
};

// Auth state observer
export const onAuthStateChange = (callback) => {
    if (!auth) return () => { };

    return auth.onAuthStateChanged(callback);
};

export { auth };
