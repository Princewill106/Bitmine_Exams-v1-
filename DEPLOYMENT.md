# Deployment Guide for Online Examination System

This guide will help you deploy your Online Examination System to Firebase Hosting.

## Prerequisites

1. **Firebase Account**
   - Create a free account at [firebase.google.com](https://firebase.google.com)
   - Create a new project in the Firebase console

2. **Firebase CLI**
   - Install the Firebase CLI by running:
     ```
     npm install -g firebase-tools
     ```

## Configuration Steps

1. **Update Firebase Configuration**
   - In the Firebase console, go to Project Settings
   - Under "Your apps", add a web app if you haven't already
   - Copy the Firebase configuration object
   - Update the `firebaseConfig` in `config.js` with your configuration

2. **Initialize Firebase Authentication**
   - In the Firebase console, go to Authentication
   - Enable Email/Password authentication
   - You can manually create an admin user or use the `setup-firebase.js` script

3. **Set Up Firestore Database**
   - In the Firebase console, go to Firestore Database
   - Create a database in production mode
   - Choose a location closest to your users

## Deployment Steps

1. **Login to Firebase**
   ```
   firebase login
   ```

2. **Initialize Firebase in your project directory**
   ```
   firebase init
   ```
   - Select Firestore and Hosting
   - Use existing project (select your Firebase project)
   - For Firestore Rules, use `firestore.rules`
   - For Firestore indexes, use `firestore.indexes.json`
   - For public directory, use `.` (current directory)
   - Configure as a single-page app: No
   - Set up automatic builds and deploys: No

3. **Deploy to Firebase**
   ```
   firebase deploy
   ```

4. **Access Your Deployed Application**
   - After successful deployment, you'll get a URL like `https://your-project-id.web.app`
   - Share this URL with your students and administrators

## Post-Deployment Steps

1. **Create Admin User**
   - Navigate to your deployed app's URL
   - Open the `setup-firebase.js` file in your browser (e.g., `https://your-project-id.web.app/setup-firebase.js`)
   - Click "Run Setup" to create the admin user and sample questions
   - You can now log in with username `admin` and password `admin123`

2. **Test the Application**
   - Test the student login and examination process
   - Test the admin dashboard and result filtering

## Troubleshooting

- **Authentication Issues**: Ensure Firebase Authentication is properly set up in the Firebase console
- **Database Access Issues**: Check your Firestore rules in the Firebase console
- **Deployment Errors**: Run `firebase deploy --debug` for more detailed error information

## Security Considerations

- Change the default admin password after deployment
- Review and update the Firestore security rules as needed
- Consider implementing additional authentication methods for production use
