// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCxzQ-Zb7nj0Xwjyt3s80jTkaRnunO_aBg",
    authDomain: "lifedrop-f86f5.firebaseapp.com",
    projectId: "lifedrop-f86f5",
    storageBucket: "lifedrop-f86f5.appspot.com",
    messagingSenderId: "750516036097",
    appId: "1:750516036097:web:76ec513fd814a180f4d600",
    measurementId: "G-KTR54D6VWG"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Export for use in other files
window.auth = auth;
window.db = db;