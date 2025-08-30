//// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
// Check if Firebase is already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Firebase helper functions
const firebaseDB = {
    // Save a new result
    saveResult: async function(result) {
        try {
            const docRef = await db.collection('examResults').add({
                ...result,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error saving result: ", error);
            throw error;
        }
    },
    
    // Get all results
    getResults: async function() {
        try {
            // Get results ordered by timestamp in descending order (newest first)
            const snapshot = await db.collection('examResults')
                .orderBy('timestamp', 'desc')
                .get();
                
            const results = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log("Fetched results:", results); // Debug log
            return results;
        } catch (error) {
            console.error("Error getting results: ", error);
            throw error;
        }
    },
    
    
    // Get questions for a specific class
    getQuestions: async function(classId) {
        try {
            // Parse the classId which is in format 'primary1-orange'
            // Need to convert to 'Primary 1' and 'Orange' format used in Firebase
            const parts = classId.split('-');
            if (parts.length !== 2) {
                console.error("Invalid class ID format:", classId);
                return [];
            }
            
            // Extract class number and section
            const classMatch = parts[0].match(/primary(\d+)/i);
            if (!classMatch) {
                console.error("Invalid class format:", parts[0]);
                return [];
            }
            
            const classNumber = classMatch[1];
            const className = `Primary ${classNumber}`;
            const section = parts[1].charAt(0).toUpperCase() + parts[1].slice(1); // Capitalize first letter
            
            console.log(`Fetching questions for class: ${className}, section: ${section}`);
            
            // Query Firestore for questions matching this class and section
            const snapshot = await db.collection('questions')
                .where('class', '==', className)
                .where('section', '==', section)
                .orderBy('order', 'asc')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error getting questions: ", error);
            throw error;
        }
    },
    
    // Delete a result by ID
    deleteResult: async function(resultId) {
        try {
            console.log("Deleting result with ID:", resultId);
            if (!resultId) {
                throw new Error("No result ID provided");
            }
            await db.collection('examResults').doc(resultId).delete();
            console.log("Result deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting result: ", error);
            throw error;
        }
    },

    // ========== NEW MULTI-SUBJECT SYSTEM FUNCTIONS ==========
    
    // Classes Management
    getClasses: async function() {
        try {
            const snapshot = await db.collection('classes').orderBy('name').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error getting classes: ", error);
            throw error;
        }
    },

    addClass: async function(classData) {
        try {
            const docRef = await db.collection('classes').add({
                ...classData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error adding class: ", error);
            throw error;
        }
    },

    updateClass: async function(classId, classData) {
        try {
            await db.collection('classes').doc(classId).update({
                ...classData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Error updating class: ", error);
            throw error;
        }
    },

    deleteClass: async function(classId) {
        try {
            await db.collection('classes').doc(classId).delete();
            return true;
        } catch (error) {
            console.error("Error deleting class: ", error);
            throw error;
        }
    },

    // Subjects Management
    getSubjects: async function() {
        try {
            const snapshot = await db.collection('subjects').orderBy('name').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error getting subjects: ", error);
            throw error;
        }
    },

    addSubject: async function(subjectData) {
        try {
            const docRef = await db.collection('subjects').add({
                ...subjectData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error adding subject: ", error);
            throw error;
        }
    },

    updateSubject: async function(subjectId, subjectData) {
        try {
            await db.collection('subjects').doc(subjectId).update({
                ...subjectData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Error updating subject: ", error);
            throw error;
        }
    },

    deleteSubject: async function(subjectId) {
        try {
            await db.collection('subjects').doc(subjectId).delete();
            return true;
        } catch (error) {
            console.error("Error deleting subject: ", error);
            throw error;
        }
    },

    // Exams Management
    getExams: async function() {
        try {
            const snapshot = await db.collection('exams').orderBy('createdAt', 'desc').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error getting exams: ", error);
            throw error;
        }
    },

    getExamsByClassAndSubject: async function(classId, subjectId) {
        try {
            const snapshot = await db.collection('exams')
                .where('classId', '==', classId)
                .where('subjectId', '==', subjectId)
                .where('isActive', '==', true)
                .orderBy('createdAt', 'desc')
                .get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error getting exams by class and subject: ", error);
            throw error;
        }
    },

    addExam: async function(examData) {
        try {
            const docRef = await db.collection('exams').add({
                ...examData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isActive: true
            });
            return docRef.id;
        } catch (error) {
            console.error("Error adding exam: ", error);
            throw error;
        }
    },

    updateExam: async function(examId, examData) {
        try {
            await db.collection('exams').doc(examId).update({
                ...examData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Error updating exam: ", error);
            throw error;
        }
    },

    deleteExam: async function(examId) {
        try {
            await db.collection('exams').doc(examId).update({
                isActive: false,
                deletedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Error deleting exam: ", error);
            throw error;
        }
    },

    // Enhanced Questions Management
    getQuestionsByExam: async function(examId) {
        try {
            const snapshot = await db.collection('questions')
                .where('examId', '==', examId)
                .orderBy('order', 'asc')
                .get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error getting questions by exam: ", error);
            throw error;
        }
    },

    addQuestion: async function(questionData) {
        try {
            const docRef = await db.collection('questions').add({
                ...questionData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error adding question: ", error);
            throw error;
        }
    },

    updateQuestion: async function(questionId, questionData) {
        try {
            await db.collection('questions').doc(questionId).update({
                ...questionData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Error updating question: ", error);
            throw error;
        }
    },

    deleteQuestion: async function(questionId) {
        try {
            await db.collection('questions').doc(questionId).delete();
            return true;
        } catch (error) {
            console.error("Error deleting question: ", error);
            throw error;
        }
    },

    // Enhanced Results with Subject Support
    saveResultWithSubject: async function(result) {
        try {
            const docRef = await db.collection('examResults').add({
                ...result,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error saving result with subject: ", error);
            throw error;
        }
    },

    getResultsByClassAndSubject: async function(classId, subjectId) {
        try {
            let query = db.collection('examResults');
            
            if (classId && classId !== 'all') {
                query = query.where('classId', '==', classId);
            }
            if (subjectId && subjectId !== 'all') {
                query = query.where('subjectId', '==', subjectId);
            }
            
            const snapshot = await query.orderBy('timestamp', 'desc').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error getting results by class and subject: ", error);
            throw error;
        }
    },

    // Update result
    updateResult: async function(resultId, updateData) {
        try {
            await db.collection('examResults').doc(resultId).update({
                ...updateData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Error updating result: ", error);
            throw error;
        }
    }
};

// Make firebaseDB available globally
window.firebaseDB = firebaseDB;

// Generate unique class code
async function generateUniqueClassCode() {
    let code;
    let isUnique = false;
    while (!isUnique) {
        code = 'CLS' + generateCode(4);
        const snapshot = await db.collection('classes').where('code', '==', code).get();
        isUnique = snapshot.empty;
    }
    return code;
}

// Generate unique exam code
async function generateUniqueExamCode() {
    let code;
    let isUnique = false;
    while (!isUnique) {
        code = 'EXM' + generateCode(4);
        const snapshot = await db.collection('exams').where('code', '==', code).get();
        isUnique = snapshot.empty;
    }
    return code;
}

// Generate random alphanumeric code
function generateCode(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Make code generation functions available globally
window.generateUniqueClassCode = generateUniqueClassCode;
window.generateUniqueExamCode = generateUniqueExamCode;
window.generateCode = generateCode;
