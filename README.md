# Online Examination System

A web-based examination system for primary school students with class-specific questions and admin dashboard.

## Features

- **Student Portal**
  - Student login with name and class selection
  - Class-specific examination questions
  - Timer for examination completion
  - Instant results after submission

- **Admin Dashboard**
  - Secure admin login
  - View all examination results
  - Filter results by class, section, and score
  - Summary statistics (total exams, average score, pass rate)
  - Results stored in Firebase (cloud database)
  - Authentication for admin users

## Tech Stack

- **Frontend**: HTML, JavaScript, Tailwind CSS
- **Data Storage**: Firebase (Firestore)
- **Authentication**: Firebase Authentication
- **Styling**: Tailwind CSS for responsive design

## Setup Instructions

1. **Clone or Download the Project**
   - Download all the HTML, CSS, and JavaScript files to your local machine

2. **Firebase Configuration**
   - Create a Firebase project at https://console.firebase.google.com/
   - Enable Firestore Database and Authentication services
   - Get your Firebase configuration (apiKey, authDomain, etc.)
   - Update the `firebaseConfig` object in `config.js` with your Firebase credentials

3. **Initialize Firebase**
   - Open `setup-firebase.js` in a browser to set up the admin user and sample questions
   - This will create an admin user with the credentials below and initialize sample questions

4. **Launch the Application**
   - Open `index.html` in a web browser
   - For local development, you can use a simple HTTP server like:
     ```
     npx http-server
     ```
   - Or simply double-click the index.html file to open it directly

## Usage

### Student Access
1. Click on "Student Login" from the homepage
2. Enter your name and select your class
3. Complete the examination
4. Receive confirmation that your exam has been submitted

### Admin Access
1. Click on "Admin Login" from the homepage
2. Login with the following credentials:
   - Username: `admin`
   - Password: `admin123`
3. View and filter examination results

## Project Structure

- `index.html` - Main landing page
- `student-login.html` - Student login page
- `examination.html` - Examination interface
- `thank-you.html` - Confirmation page after exam submission
- `admin-login.html` - Admin login page
- `admin-dashboard.html` - Admin dashboard
- `styles.css` - Custom styles
- `config.js` - Firebase configuration and helper functions
- `setup-firebase.js` - Script to initialize Firebase with admin user and sample questions

## Future Enhancements

- Add more question types (multiple choice, true/false, fill-in-the-blank)
- Implement image upload for questions
- Add student registration with email verification
- Implement exam scheduling functionality
- Add export options for results (CSV, PDF)

## License

© 2025 Online Examination System. All rights reserved.
