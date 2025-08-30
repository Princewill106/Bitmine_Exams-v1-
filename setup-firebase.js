// Firebase setup script
// Run this once to initialize your Firebase project with an admin user

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAUIdE_Vb_sdWoSU7_eSjgx0pjz6_Tks7s",
  authDomain: "tes-quiz-app-3f0a1.firebaseapp.com",
  projectId: "tes-quiz-app-3f0a1",
  storageBucket: "tes-quiz-app-3f0a1.appspot.com",
  messagingSenderId: "701178639009",
  appId: "1:701178639009:web:628bae20116f173edff6e0",
  measurementId: "G-EGCK4HSTB8"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Create admin user
async function createAdminUser() {
  try {
    // Create admin user with email/password
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(
      "admin@example.com", 
      "admin123"
    );
    
    console.log("Admin user created successfully:", userCredential.user.uid);
    
    // Add admin role to user in Firestore
    const db = firebase.firestore();
    await db.collection('users').doc(userCredential.user.uid).set({
      email: "admin@example.com",
      role: "admin",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log("Admin role assigned successfully");
    
    // Initialize sample questions
    await initializeSampleQuestions(db);
    
    alert("Setup completed successfully! You can now log in with username 'admin' and password 'admin123'");
  } catch (error) {
    console.error("Error during setup:", error);
    alert("Error during setup: " + error.message);
  }
}

// Initialize sample questions for each class
async function initializeSampleQuestions(db) {
  // Sample questions for each class
  const classQuestions = {
    "Primary 1 - Orange": [
      {
        id: "p1o1",
        question: "What is 1 + 1?",
        options: ["1", "2", "3", "4"],
        correctAnswer: "2"
      },
      {
        id: "p1o2",
        question: "Which animal says 'meow'?",
        options: ["Dog", "Cat", "Cow", "Lion"],
        correctAnswer: "Cat"
      }
    ],
    "Primary 1 - Lemon": [
      {
        id: "p1l1",
        question: "What color is the sky?",
        options: ["Red", "Green", "Blue", "Yellow"],
        correctAnswer: "Blue"
      },
      {
        id: "p1l2",
        question: "How many days are in a week?",
        options: ["5", "6", "7", "8"],
        correctAnswer: "7"
      }
    ],
    // Add more questions for other classes and sections
  };
  
  // Add questions to Firestore
  const batch = db.batch();
  
  for (const [classSection, questions] of Object.entries(classQuestions)) {
    const [className, section] = classSection.split(" - ");
    
    questions.forEach((question, index) => {
      const docRef = db.collection('questions').doc(`${className.replace(/\s+/g, '')}_${section}_${index}`);
      batch.set(docRef, {
        ...question,
        class: className,
        section: section,
        order: index
      });
    });
  }
  
  await batch.commit();
  console.log("Sample questions initialized successfully");
}

// Add a button to run the setup
document.write(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Firebase Setup</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  </head>
  <body class="bg-gray-100 min-h-screen flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <h1 class="text-2xl font-bold text-center text-indigo-600 mb-6">Firebase Setup</h1>
      <p class="mb-4">This will initialize your Firebase project with an admin user and sample questions.</p>
      <p class="mb-4 text-red-600">Important: Make sure to update the Firebase configuration in config.js before running this setup.</p>
      <button id="setupButton" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        Run Setup
      </button>
      <div id="status" class="mt-4 text-center"></div>
    </div>
    <script>
      document.getElementById('setupButton').addEventListener('click', function() {
        this.disabled = true;
        this.textContent = 'Setting up...';
        document.getElementById('status').textContent = 'Creating admin user and initializing data...';
        createAdminUser().then(() => {
          this.textContent = 'Setup Complete!';
          document.getElementById('status').innerHTML = 'Setup completed successfully!<br><a href="admin-login.html" class="text-indigo-600">Go to Admin Login</a>';
        }).catch(error => {
          this.disabled = false;
          this.textContent = 'Try Again';
          document.getElementById('status').textContent = 'Error: ' + error.message;
        });
      });
    </script>
  </body>
  </html>
`);
