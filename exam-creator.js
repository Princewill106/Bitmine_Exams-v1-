// Exam Creator JavaScript
let classes = [];
let subjects = [];
let questions = [];
let editingQuestionIndex = null; // Tracks which question is being edited
let currentExamId = null;

// DOM Elements
let examLayerRadios = [];
let examTotalMarksInput = null;

// Generate a random exam code in the format EXM + 4 alphanumeric characters (7 characters total)
function generateExamCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'EXM';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Save exam to database
async function saveExam() {
    const loadingModal = document.getElementById('loadingModal');
    
    try {
        // Show loading state
        if (loadingModal) {
            loadingModal.style.display = 'flex';
            loadingModal.innerHTML = `
                <div class="text-center p-6">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p class="mt-4 text-gray-600">Saving your exam...</p>
                </div>
            `;
        }

        // Get form values
        const title = document.getElementById('examTitle')?.value?.trim() || '';
        const duration = parseInt(document.getElementById('examDuration')?.value) || 30; // Default 30 minutes
        const totalMarks = parseInt(document.getElementById('examTotalMarks')?.value) || 0;
        const classId = document.getElementById('examClass')?.value || '';
        const subjectId = document.getElementById('examSubject')?.value || '';
        const description = document.getElementById('examDescription')?.value?.trim() || '';
        const selectedLayer = document.querySelector('input[name="examLayer"]:checked');
        
        // Validate required fields with specific error messages
        if (!title) {
            showError('Please enter an exam title', 'examTitle');
            document.getElementById('examTitle')?.focus();
            if (loadingModal) loadingModal.style.display = 'none';
            return;
        }
        
        if (!selectedLayer) {
            showError('Please select an exam layer (First Test, Second Test, or Exam)', 'examLayer1');
            if (loadingModal) loadingModal.style.display = 'none';
            return;
        }
        
        if (!classId) {
            showError('Please select a class', 'examClass');
            if (loadingModal) loadingModal.style.display = 'none';
            return;
        }
        
        if (!subjectId) {
            showError('Please select a subject', 'examSubject');
            if (loadingModal) loadingModal.style.display = 'none';
            return;
        }
        
        if (questions.length === 0) {
            showError('Please add at least one question to the exam', 'questionsList');
            if (loadingModal) loadingModal.style.display = 'none';
            return;
        }
        
        // Validate total marks against selected layer
        const maxMarks = parseInt(selectedLayer.value);
        if (isNaN(totalMarks) || totalMarks <= 0) {
            showError('Please enter a valid total marks', 'examTotalMarks');
            if (loadingModal) loadingModal.style.display = 'none';
            return;
        }
        
        if (totalMarks > maxMarks) {
            showError(`Total marks cannot exceed ${maxMarks} for the selected exam layer`, 'examTotalMarks');
            if (loadingModal) loadingModal.style.display = 'none';
            return;
        }
        
        // Get class and subject names for display
        const className = document.getElementById('examClass')?.options[document.getElementById('examClass').selectedIndex]?.text || '';
        const subjectName = document.getElementById('examSubject')?.options[document.getElementById('examSubject').selectedIndex]?.text || '';
        
        // Calculate total points from questions and validate
        const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
        if (totalPoints === 0) {
            showError('Total points from all questions cannot be zero', 'questionsList');
            if (loadingModal) loadingModal.style.display = 'none';
            return;
        }
        
        // Ensure Firebase is initialized
        if (!window.firebase || !firebase.apps.length) {
            throw new Error('Firebase is not properly initialized');
        }
        
        // Get Firestore instance
        const db = firebase.firestore();
        
        // Create exam data object
        const examData = {
            title,
            layer: selectedLayer.value,
            layerName: selectedLayer.nextElementSibling?.textContent?.trim() || selectedLayer.value,
            duration,
            totalMarks,
            classId,
            className,
            subjectId,
            subjectName,
            description,
            questions: questions.map((q, index) => ({
                ...q,
                id: q.id || `q-${Date.now()}-${index}`,
                text: q.text || 'Untitled Question',
                type: q.type || 'multiple-choice',
                options: Array.isArray(q.options) ? q.options : [],
                points: q.points > 0 ? q.points : 1,
                correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : null,
                order: index + 1
            })),
            totalPoints,
            status: 'active',
            examCode: generateExamCode(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('Saving exam data:', examData);
        
        // Save to Firestore
        const examRef = await db.collection('exams').add(examData);
        
        // Update exam with ID
        await examRef.update({ id: examRef.id });
        
        console.log('Exam saved successfully with ID:', examRef.id);
        
        // Store exam code in session storage for the success page
        sessionStorage.setItem('lastCreatedExam', JSON.stringify({
            id: examRef.id,
            code: examData.examCode,
            title: examData.title,
            className: examData.className,
            subjectName: examData.subjectName
        }));
        
        // Redirect to success page
        window.location.href = 'exam-created.html';
        
    } catch (error) {
        console.error('Error saving exam:', error);
        
        // Show user-friendly error message
        let errorMessage = 'Failed to save exam. ';
        if (error.code) {
            switch (error.code) {
                case 'permission-denied':
                    errorMessage += 'You do not have permission to perform this action.';
                    break;
                case 'unavailable':
                    errorMessage += 'Network error. Please check your internet connection and try again.';
                    break;
                default:
                    errorMessage += error.message || 'Please try again.';
            }
        } else {
            errorMessage += error.message || 'An unexpected error occurred.';
        }
        
        showError(errorMessage, 'examForm');
        
    } finally {
        // Hide loading state
        if (loadingModal) loadingModal.style.display = 'none';
    }
}

// Initialize the exam creator
async function initializeExamCreator() {
    console.log('Initializing exam creator...');
    
    try {
        // Initialize DOM elements
        examLayerRadios = Array.from(document.querySelectorAll('input[name="examLayer"]'));
        examTotalMarksInput = document.getElementById('examTotalMarks');
        
        if (!examLayerRadios.length || !examTotalMarksInput) {
            throw new Error('Required DOM elements not found');
        }
        
        // Set up event listeners
        setupExamLayerListeners();
        setupQuestionFormListeners();
        
        // Set up save exam button
        const saveExamBtn = document.getElementById('saveExamBtn');
        if (saveExamBtn) {
            saveExamBtn.addEventListener('click', saveExam);
        }
        
        // Set up back button
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to leave? Any unsaved changes will be lost.')) {
                    window.history.back();
                }
            });
        }
        
        // Set default exam layer (First Test)
        const defaultLayer = examLayerRadios[0];
        if (defaultLayer) {
            defaultLayer.checked = true;
            examTotalMarksInput.value = defaultLayer.value;
        }
        
        // Load classes and subjects
        await loadClassesAndSubjects();
        
        // Add initial option for multiple choice
        addOptionField();
        
        console.log('Exam creator initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing exam creator:', error);
        showError('Failed to initialize exam creator: ' + error.message);
        return false;
    }
}

// Set up event listeners for exam layer selection
function setupExamLayerListeners() {
    // Set initial max value based on default selection
    updateMaxMarks();
    
    examLayerRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                const maxMarks = parseInt(e.target.value);
                const currentMarks = parseInt(examTotalMarksInput.value) || 0;
                
                // Update the total marks to the new maximum if current is higher
                // or if it's the first selection
                if (currentMarks > maxMarks || examTotalMarksInput.value === '') {
                    examTotalMarksInput.value = maxMarks;
                }
                
                // Update the max attribute to enforce the limit
                updateMaxMarks();
                
                console.log('Exam layer changed to:', e.target.nextElementSibling?.textContent?.trim());
            }
        });
    });
    
    // Validate input when user types in the total marks field
    examTotalMarksInput.addEventListener('input', () => {
        const selectedRadio = document.querySelector('input[name="examLayer"]:checked');
        
        if (selectedRadio) {
            const maxMarks = parseInt(selectedRadio.value);
            const enteredMarks = parseInt(examTotalMarksInput.value) || 0;
            
            // If entered marks exceed the selected layer's maximum
            if (enteredMarks > maxMarks) {
                // Show a warning but don't prevent typing
                console.warn(`Marks cannot exceed ${maxMarks} for the selected exam layer`);
            }
        }
    });
    
    // Final validation when the input loses focus
    examTotalMarksInput.addEventListener('blur', () => {
        const selectedRadio = document.querySelector('input[name="examLayer"]:checked');
        
        if (selectedRadio) {
            const maxMarks = parseInt(selectedRadio.value);
            const enteredMarks = parseInt(examTotalMarksInput.value) || 0;
            
            // If entered marks exceed the selected layer's maximum, cap it
            if (enteredMarks > maxMarks) {
                examTotalMarksInput.value = maxMarks;
                showError(`Marks cannot exceed ${maxMarks} for the selected exam layer`);
            }
        }
    });
}

// Update the max attribute of the total marks input based on selected layer
function updateMaxMarks() {
    const selectedRadio = document.querySelector('input[name="examLayer"]:checked');
    if (selectedRadio) {
        const maxMarks = parseInt(selectedRadio.value);
        examTotalMarksInput.max = maxMarks;
        examTotalMarksInput.title = `Maximum marks: ${maxMarks}`;
    }
}

// Show a user-friendly error message
function showError(message, targetElementId = 'examTotalMarks') {
    console.error('Error:', message);
    
    // Remove any existing error message for this target
    const existingError = document.getElementById(`${targetElementId}Error`);
    if (existingError) {
        existingError.remove();
    }
    
    // Create error message element
    const errorElement = document.createElement('div');
    errorElement.id = `${targetElementId}Error`;
    errorElement.className = 'mt-1 text-sm text-red-600 flex items-start';
    errorElement.innerHTML = `
        <svg class="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>${message}</span>
    `;
    
    // Find the target element to show error below
    const targetElement = document.getElementById(targetElementId);
    if (!targetElement) {
        console.error('Target element not found for error message:', targetElementId);
        return;
    }
    
    // Add shake animation to the target element
    targetElement.classList.add('animate-shake', 'border-red-500');
    
    // Insert error message after the target element or its parent
    const parent = targetElement.parentNode;
    if (parent) {
        parent.insertBefore(errorElement, targetElement.nextSibling);
    } else {
        targetElement.after(errorElement);
    }
    
    // Remove shake class and red border after animation completes
    setTimeout(() => {
        targetElement.classList.remove('animate-shake');
        setTimeout(() => {
            targetElement.classList.remove('border-red-500');
        }, 1000);
    }, 500);
    
    // Auto-remove error after 8 seconds
    setTimeout(() => {
        if (errorElement.parentNode) {
            errorElement.classList.add('opacity-0', 'transition-opacity', 'duration-300');
            setTimeout(() => {
                if (errorElement.parentNode) {
                    errorElement.remove();
                }
            }, 300);
        }
    }, 8000);
    
    // Scroll to the error message if it's not in view
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Show a success message
function showSuccess(message, duration = 3000) {
    // Remove any existing success message
    const existingSuccess = document.getElementById('successMessage');
    if (existingSuccess) {
        existingSuccess.remove();
    }
    
    // Create success message element
    const successElement = document.createElement('div');
    successElement.id = 'successMessage';
    successElement.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50 flex items-start max-w-sm';
    successElement.innerHTML = `
        <svg class="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <div>
            <p class="font-medium">Success!</p>
            <p class="text-sm">${message}</p>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(successElement);
    
    // Auto-remove after duration
    setTimeout(() => {
        successElement.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => {
            if (successElement.parentNode) {
                successElement.remove();
            }
        }, 300);
    }, duration);
}

// Load classes and subjects from Firebase
async function loadClassesAndSubjects() {
    try {
        // Show loading state
        const classSelect = document.getElementById('examClass');
        const subjectSelect = document.getElementById('examSubject');
        
        if (!classSelect || !subjectSelect) {
            throw new Error('Required select elements not found');
        }
        
        // Set loading state
        classSelect.innerHTML = '<option value="">Loading classes...</option>';
        subjectSelect.innerHTML = '<option value="">Loading subjects...</option>';
        
        // Check if firebaseDB is available
        if (!window.firebaseDB) {
            throw new Error('Firebase is not properly initialized');
        }
        
        // Fetch classes and subjects in parallel
        const [classes, subjects] = await Promise.all([
            firebaseDB.getClasses(),
            firebaseDB.getSubjects()
        ]);
        
        // Populate classes dropdown
        populateDropdown(classSelect, classes, 'name', 'Select a class');
        
        // Populate subjects dropdown
        populateDropdown(subjectSelect, subjects, 'name', 'Select a subject');
        
        console.log('Classes and subjects loaded successfully');
    } catch (error) {
        console.error('Error loading classes and subjects:', error);
        showError('Failed to load classes and subjects. Please try again.');
        
        // Set error state
        const classSelect = document.getElementById('examClass');
        const subjectSelect = document.getElementById('examSubject');
        
        if (classSelect) {
            classSelect.innerHTML = '<option value="">Error loading classes</option>';
        }
        
        if (subjectSelect) {
            subjectSelect.innerHTML = '<option value="">Error loading subjects</option>';
        }
    }
}

// Helper function to populate a dropdown with options
function populateDropdown(selectElement, items, displayField, defaultText) {
    if (!selectElement) return;
    
    // Clear existing options
    selectElement.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = defaultText;
    defaultOption.disabled = true;
    defaultOption.selected = true;
    selectElement.appendChild(defaultOption);
    
    // Add items if available
    if (!Array.isArray(items) || items.length === 0) {
        const noItemsOption = document.createElement('option');
        noItemsOption.value = '';
        noItemsOption.textContent = 'No items available';
        noItemsOption.disabled = true;
        selectElement.appendChild(noItemsOption);
        return;
    }
    
    // Add each item as an option
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id || item.name; // Use ID if available, otherwise use name as value
        option.textContent = item[displayField] || 'Unnamed';
        selectElement.appendChild(option);
    });
}

// Set up event listeners for question form
function setupQuestionFormListeners() {
    // Add option button
    const addOptionBtn = document.getElementById('addOptionBtn');
    if (addOptionBtn) {
        addOptionBtn.addEventListener('click', addOptionField);
    }
    
    // Question type toggle
    const questionTypeRadios = document.querySelectorAll('input[name="questionType"]');
    questionTypeRadios.forEach(radio => {
        radio.addEventListener('change', handleQuestionTypeChange);
    });
    
    // Add question button
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    if (addQuestionBtn) {
        addQuestionBtn.addEventListener('click', handleAddQuestion);
    }
}

// Handle question type change (Multiple Choice/True-False)
function handleQuestionTypeChange(e) {
    const optionsContainer = document.getElementById('optionsContainer');
    const trueFalseContainer = document.getElementById('trueFalseOptions');
    
    if (e.target.value === 'multiple-choice') {
        optionsContainer.style.display = 'block';
        if (trueFalseContainer) trueFalseContainer.style.display = 'none';
        
        // Clear any existing true/false selection
        const trueFalseRadios = document.querySelectorAll('input[name="trueFalseAnswer"]');
        trueFalseRadios.forEach(radio => radio.checked = false);
    } else {
        optionsContainer.style.display = 'none';
        if (trueFalseContainer) trueFalseContainer.style.display = 'block';
        
        // Clear any existing options
        const optionsList = document.getElementById('optionsList');
        if (optionsList) optionsList.innerHTML = '';
    }
}

// Add a new option field for multiple choice questions
function addOptionField(optionText = '', isCorrect = false) {
    const optionsList = document.getElementById('optionsList');
    if (!optionsList) return null;
    
    // Check if we've reached the maximum number of options (4)
    const currentOptions = optionsList.querySelectorAll('.option-group');
    if (currentOptions.length >= 4) {
        showError('Maximum of 4 options allowed per question', 'optionsContainer');
        return null;
    }
    
    const optionId = `option-${Date.now()}`;
    const optionCount = optionsList.children.length;
    
    // Ensure optionText is a string and escape it for HTML
    const safeOptionText = typeof optionText === 'string' 
        ? optionText.replace(/"/g, '&quot;') 
        : '';
    
    const optionDiv = document.createElement('div');
    optionDiv.className = 'flex items-center mb-2 option-group group';
    optionDiv.innerHTML = `
        <input type="radio" name="correctOption" 
               class="mr-2 cursor-pointer" 
               ${isCorrect ? 'checked' : ''}>
        <input type="text" placeholder="Option text" 
               class="flex-1 p-2 border rounded option-text" 
               value="${safeOptionText}"
               required>
        <button type="button" class="ml-2 text-red-600 hover:text-red-800 remove-option opacity-0 group-hover:opacity-100 transition-opacity">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add remove option handler
    const removeBtn = optionDiv.querySelector('.remove-option');
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (optionsList.children.length > 1) {
                optionDiv.remove();
            } else {
                showError('At least one option is required');
            }
        });
    }
    
    // Add click handler to select this option
    optionDiv.addEventListener('click', (e) => {
        if (e.target.type !== 'radio' && e.target.type !== 'text') {
            const radio = optionDiv.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        }
    });
    
    optionsList.appendChild(optionDiv);
    
    // Focus the new option's input
    const newInput = optionDiv.querySelector('.option-text');
    if (newInput) newInput.focus();
    
    return optionDiv;
}

// Handle adding/updating a question
function handleAddQuestion() {
    try {
        // Get form elements
        const questionTextInput = document.getElementById('questionText');
        const questionTypeInput = document.querySelector('input[name="questionType"]:checked');
        const addQuestionBtn = document.getElementById('addQuestionBtn');
        const isEditing = addQuestionBtn && addQuestionBtn.getAttribute('data-editing') === 'true';
        
        // Reset any previous error highlights
        document.querySelectorAll('.border-red-500').forEach(el => el.classList.remove('border-red-500'));
        
        // Validate question text
        if (!questionTextInput || !questionTextInput.value.trim()) {
            showError('Please enter a question', 'questionText');
            questionTextInput?.classList.add('border-red-500');
            questionTextInput?.focus();
            return;
        }
        
        // Validate question type
        if (!questionTypeInput) {
            showError('Please select a question type', 'questionTypeMultiple');
            document.getElementById('questionTypeMultiple')?.focus();
            return;
        }
        
        // Create question object
        const question = {
            id: isEditing && editingQuestionIndex !== null ? questions[editingQuestionIndex].id : `q-${Date.now()}`,
            text: questionTextInput.value.trim(),
            type: questionTypeInput.value,
            options: [],
            correctAnswer: null,
            points: 1, // Will be calculated based on total marks
            updatedAt: new Date().toISOString()
        };
        
        // Process based on question type
        if (questionTypeInput.value === 'multiple-choice') {
            const options = document.querySelectorAll('.option-group');
            
            // Validate minimum options
            if (options.length < 2) {
                showError('Please add at least two options', 'optionsContainer');
                document.getElementById('addOptionBtn')?.classList.add('border-red-500');
                return;
            }
            
            // Process each option
            let hasCorrectAnswer = false;
            let hasEmptyOption = false;
            
            options.forEach((option, index) => {
                const optionInput = option.querySelector('.option-text');
                const optionText = optionInput?.value.trim() || '';
                
                // Check for empty options
                if (!optionText) {
                    hasEmptyOption = true;
                    optionInput?.classList.add('border-red-500');
                    return;
                }
                
                const isCorrect = option.querySelector('input[type="radio"]')?.checked || false;
                if (isCorrect) hasCorrectAnswer = true;
                
                question.options.push({
                    id: option.id || `o-${Date.now()}-${index}`,
                    text: optionText,
                    isCorrect: isCorrect
                });
            });
            
            // Validate no empty options
            if (hasEmptyOption) {
                showError('Option text cannot be empty', 'optionsContainer');
                return;
            }
            
            // Validate correct answer selected
            if (!hasCorrectAnswer) {
                showError('Please select the correct answer', 'optionsContainer');
                return;
            }
            
            // Set correct answer from options
            question.correctAnswer = question.options.findIndex(opt => opt.isCorrect);
            
        } else { // True/False question
            const selectedAnswer = document.querySelector('input[name="trueFalseAnswer"]:checked');
            
            if (!selectedAnswer) {
                showError('Please select an answer (True/False)', 'trueFalseOptions');
                return;
            }
            
            question.correctAnswer = selectedAnswer.value === 'true';
            
            // Add default options for True/False
            question.options = [
                { id: 'true', text: 'True', isCorrect: question.correctAnswer === true },
                { id: 'false', text: 'False', isCorrect: question.correctAnswer === false }
            ];
        }
        
        // Calculate points based on total marks and number of questions
        const totalMarksInput = document.getElementById('examTotalMarks');
        const totalMarks = totalMarksInput ? parseInt(totalMarksInput.value) || 0 : 0;
        
        if (totalMarks > 0) {
            // Distribute points evenly among questions, with any remainder going to the first question
            const basePoints = Math.floor(totalMarks / (questions.length + (isEditing ? 0 : 1)));
            const remainder = totalMarks % (questions.length + (isEditing ? 0 : 1));
            
            // Update points for all questions
            if (!isEditing) {
                // If adding a new question, update points for all questions
                questions.forEach((q, idx) => {
                    questions[idx].points = basePoints + (idx < remainder ? 1 : 0);
                });
                // Set points for the new question
                question.points = basePoints + (questions.length < remainder ? 1 : 0);
            } else {
                // If editing, just update the current question's points
                question.points = basePoints + (editingQuestionIndex < remainder ? 1 : 0);
            }
        }
        
        // Update or add the question
        if (isEditing && editingQuestionIndex !== null) {
            questions[editingQuestionIndex] = question;
            showSuccess('Question updated successfully!');
        } else {
            questions.push(question);
            showSuccess('Question added successfully!');
        }
        
        // Reset form and update UI
        resetQuestionForm();
        updateQuestionsList();
        
        // Scroll to the question in the list
        const questionElement = document.querySelector(`[data-question-id="${question.id}"]`);
        if (questionElement) {
            questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add highlight effect
            questionElement.classList.add('bg-yellow-50', 'transition-colors', 'duration-1000');
            setTimeout(() => {
                questionElement.classList.remove('bg-yellow-50');
            }, 1500);
        }
        
        // Update the total marks based on questions if needed
        updateTotalMarksFromQuestions();
        
    } catch (error) {
        console.error('Error processing question:', error);
        showError(
            'An unexpected error occurred while processing the question. "' + 
            (error.message || 'Please try again.') + '"', 
            'questionForm'
        );
    }
}

/**
 * Updates the total marks input based on the sum of all question points
 * This ensures the total marks always reflect the actual sum of question points
 */
function updateTotalMarksFromQuestions() {
    const totalMarksInput = document.getElementById('examTotalMarks');
    if (!totalMarksInput) return;
    
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
    if (totalPoints > 0) {
        totalMarksInput.value = totalPoints;
        
        // If we have a selected layer, ensure we don't exceed max marks
        const selectedLayer = document.querySelector('input[name="examLayer"]:checked');
        if (selectedLayer) {
            const maxMarks = parseInt(selectedLayer.value);
            if (totalPoints > maxMarks) {
                // If we exceed max marks, show a warning but don't prevent it
                showError(
                    `Total points (${totalPoints}) exceed the maximum marks (${maxMarks}) for this exam layer. ` +
                    'Consider adjusting question points or selecting a different exam layer.',
                    'examTotalMarks'
                );
            }
        }
    }
}

// Delete a question
function deleteQuestion(index) {
    if (index < 0 || index >= questions.length) return;
    
    // Show confirmation dialog
    if (confirm('Are you sure you want to delete this question?')) {
        questions.splice(index, 1);
        updateQuestionsList();
        
        // If we were editing this question, reset the form
        if (editingQuestionIndex === index) {
            resetQuestionForm();
            editingQuestionIndex = null;
            
            const addQuestionBtn = document.getElementById('addQuestionBtn');
            if (addQuestionBtn) {
                addQuestionBtn.textContent = 'Add Question';
                addQuestionBtn.removeAttribute('data-editing');
            }
        }
        
        // Update total marks
        updateTotalMarksFromQuestions();
    }
}

/**
 * Resets the question form to its initial state
 * Clears all fields and resets the form for adding a new question
 */
function resetQuestionForm() {
    try {
        // Reset the form
        const form = document.getElementById('questionForm');
        if (form) {
            form.reset();
        }
        
        // Clear the question text area
        const questionText = document.getElementById('questionText');
        if (questionText) {
            questionText.value = '';
        }
        
        // Reset question type to multiple choice
        const multipleChoiceRadio = document.getElementById('questionTypeMultiple');
        if (multipleChoiceRadio) {
            multipleChoiceRadio.checked = true;
            // Trigger change event to update UI
            const event = new Event('change');
            multipleChoiceRadio.dispatchEvent(event);
        }
        
        // Clear and reset the options list
        const optionsList = document.getElementById('optionsList');
        if (optionsList) {
            optionsList.innerHTML = '';
            // Add two default empty options for multiple choice
            addOptionField('', false);
            addOptionField('', false);
        }
        
        // Reset the true/false answer if visible
        const trueFalseRadios = document.querySelectorAll('input[name="trueFalseAnswer"]');
        if (trueFalseRadios.length > 0) {
            trueFalseRadios[0].checked = true; // Default to 'True'
        }
        
        // Reset the add/update question button
        const addQuestionBtn = document.getElementById('addQuestionBtn');
        if (addQuestionBtn) {
            addQuestionBtn.textContent = 'Add Question';
            addQuestionBtn.removeAttribute('data-editing');
            addQuestionBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            addQuestionBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
        }
        
        // Clear any error messages
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        
        // Remove any error highlights
        document.querySelectorAll('.border-red-500').forEach(el => {
            el.classList.remove('border-red-500');
        });
        
        // Reset the editing index
        editingQuestionIndex = null;
        
        // Set focus to question text
        if (questionText) questionText.focus();
        
    } catch (error) {
        console.error('Error resetting question form:', error);
    }
}

// Update the questions list in the UI
function updateQuestionsList() {
    const questionsList = document.getElementById('questionsList');
    const noQuestionsMessage = document.getElementById('noQuestionsMessage');
    
    if (!questionsList) return;
    
    if (questions.length === 0) {
        if (noQuestionsMessage) noQuestionsMessage.style.display = 'block';
        questionsList.innerHTML = '';
        return;
    }
    
    if (noQuestionsMessage) noQuestionsMessage.style.display = 'none';
    
    // Clear and rebuild the list
    questionsList.innerHTML = '';
    
    questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'p-4 border rounded-lg mb-4 bg-white hover:shadow-md transition-shadow';
        questionElement.setAttribute('data-question-id', question.id);
        
        // Format the question number with proper padding
        const questionNumber = (index + 1).toString().padStart(2, '0');
        
        questionElement.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-start">
                        <span class="mr-2 text-gray-500 text-sm font-medium">${questionNumber}.</span>
                        <h3 class="font-medium text-gray-800">${question.text}</h3>
                    </div>
                    
                    <div class="mt-2 text-sm text-gray-600">
                        <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium ${question.type === 'multiple-choice' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}">
                            ${question.type === 'multiple-choice' ? 'Multiple Choice' : 'True/False'}
                        </span>
                        <span class="ml-2 text-gray-500">
                            ${question.points} ${question.points === 1 ? 'point' : 'points'}
                        </span>
                    </div>
                    
                    ${question.type === 'multiple-choice' ? `
                        <div class="mt-3 space-y-2">
                            ${question.options.map((opt, i) => `
                                <div class="flex items-center">
                                    <div class="w-4 h-4 rounded-full border mr-2 flex-shrink-0 ${opt.isCorrect ? 'border-green-500 bg-green-100' : 'border-gray-300'}">
                                        ${opt.isCorrect ? `
                                            <svg class="w-full h-full text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                            </svg>
                                        ` : ''}
                                    </div>
                                    <span class="text-sm ${opt.isCorrect ? 'text-green-700 font-medium' : 'text-gray-700'}">
                                        ${opt.text}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="mt-3">
                            <p class="text-sm">
                                <span class="text-gray-600">Correct answer:</span>
                                <span class="ml-2 font-medium ${question.correctAnswer ? 'text-green-600' : 'text-blue-600'}">
                                    ${question.correctAnswer ? 'True' : 'False'}
                                </span>
                            </p>
                        </div>
                    `}
                </div>
                
                <div class="flex space-x-2 ml-4">
                    <button type="button" onclick="editQuestion(${index})" 
                            class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            title="Edit question">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button type="button" onclick="deleteQuestion(${index})" 
                            class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title="Delete question">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        questionsList.appendChild(questionElement);
    });
}

// Edit a question
function editQuestion(index) {
    if (index < 0 || index >= questions.length) return;
    
    const question = questions[index];
    const questionText = document.getElementById('questionText');
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    
    if (!questionText || !addQuestionBtn) return;
    
    // Store the editing index
    editingQuestionIndex = index;
    
    // Update the add question button text
    addQuestionBtn.textContent = 'Update Question';
    addQuestionBtn.setAttribute('data-editing', 'true');
    
    // Set question text
    questionText.value = question.text;
    
    // Trigger change event to update UI
    const typeRadio = document.querySelector(`input[value="${question.type}"]`);
    if (typeRadio) {
        typeRadio.checked = true;
        typeRadio.dispatchEvent(new Event('change'));
    }
    
    // Handle different question types
    if (question.type === 'multiple-choice') {
        // Clear existing options
        const optionsList = document.getElementById('optionsList');
        if (optionsList) {
            optionsList.innerHTML = '';
            
            // Add each option
            question.options.forEach((option) => {
                addOptionField(option.text, option.isCorrect);
            });
        }
    } else {
        // For true/false questions
        const trueFalseRadio = document.querySelector(`input[value="${question.correctAnswer}"]`);
        if (trueFalseRadio) trueFalseRadio.checked = true;
    }
    
    // Remove the question from the list
    questions.splice(index, 1);
    updateQuestionsList();
    
    // Scroll to the form
    questionText.scrollIntoView({ behavior: 'smooth' });
}

// Delete a question
function deleteQuestion(index) {
    if (index < 0 || index >= questions.length) return;
    
    // Show confirmation modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 class="text-lg font-medium mb-4">Delete Question</h3>
            <p class="mb-6">Are you sure you want to delete this question? This action cannot be undone.</p>
            <div class="flex justify-end space-x-3">
                <button id="cancelDeleteBtn" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                    Cancel
                </button>
                <button id="confirmDeleteBtn" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                    Delete
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners for the modal buttons
    modal.querySelector('#cancelDeleteBtn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#confirmDeleteBtn').addEventListener('click', () => {
        questions.splice(index, 1);
        updateQuestionsList();
        document.body.removeChild(modal);
    });
}

// Initialize when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeExamCreator().catch(error => {
            console.error('Failed to initialize exam creator:', error);
            showError('Failed to initialize exam creator. Please refresh the page.');
        });
    });
} else {
    initializeExamCreator().catch(error => {
        console.error('Failed to initialize exam creator:', error);
        showError('Failed to initialize exam creator. Please refresh the page.');
    });
}
// const backBtn = document.getElementById('backBtn');
//     if (backBtn) {
//         backBtn.addEventListener('click', (e) => {
//             e.preventDefault();
//             window.location.href = 'index.html';
//         });
//     } else {
//         console.error('Back button not found');
//     }
// // Setup Event Listeners
// function setupEventListeners() {
//     // Back button
    
    
    
//     document.getElementById('saveExamBtn')?.addEventListener('click', saveExam);
    
//     // Question type toggle
//     document.querySelectorAll('input[name="questionType"]').forEach(radio => {
//         radio.addEventListener('change', handleQuestionTypeChange);
//     });
    
//     // Form submission
//     document.getElementById('addQuestionBtn')?.addEventListener('click', handleAddQuestion);
    
//     // Event delegation for dynamic elements
//     document.addEventListener('click', (e) => {
//         const target = e.target.closest('[data-action]');
//         if (!target) return;
        
//         const action = target.getAttribute('data-action');
        
//         switch(action) {
//             case 'add-option':
//                 e.preventDefault();
//                 addOptionField();
//                 break;
//             case 'remove-option':
//                 e.preventDefault();
//                 removeOptionField(target);
//                 break;
//         }
//     });
// }

// // Load initial data (classes and subjects)
// async function loadInitialData() {
//     try {
//         showLoading();
//         console.log('Loading initial data...');
        
//         // First ensure firebaseDB is available
//         if (!window.firebaseDB) {
//             throw new Error('Firebase is not properly initialized');
//         }
        
//         // Load classes and subjects in parallel
//         const [classesData, subjectsData] = await Promise.all([
//             firebaseDB.getClasses(),
//             firebaseDB.getSubjects()
//         ]);
        
//         // Update the global variables
//         classes = Array.isArray(classesData) ? classesData : [];
//         subjects = Array.isArray(subjectsData) ? subjectsData : [];
        
//         console.log('Classes loaded:', classes);
//         console.log('Subjects loaded:', subjects);
        
//         // Populate dropdowns
//         populateClassOptions();
//         populateSubjectOptions();
        
//         // Check if we're editing an existing exam
//         const urlParams = new URLSearchParams(window.location.search);
//         const examId = urlParams.get('id');
        
//         if (examId) {
//             await loadExistingExam(examId);
//         } else {
//             // Initialize with default values for new exam
//             initializeQuestionForm();
//         }
        
//         hideLoading();
//     } catch (error) {
//         console.error('Error loading initial data:', error);
//         showError('Failed to load classes and subjects. Please make sure you are logged in and try again.');
//         hideLoading();
//     }
// }

// // Populate class dropdown
// function populateClassOptions() {
//     try {
//         const classSelect = document.getElementById('examClass');
//         if (!classSelect) {
//             console.error('Class select element not found');
//             return;
//         }
        
//         // Clear existing options except the first one
//         while (classSelect.options.length > 0) {
//             classSelect.remove(0);
//         }
        
//         // Add default option
//         const defaultOption = document.createElement('option');
//         defaultOption.value = '';
//         defaultOption.textContent = 'Select a class';
//         defaultOption.disabled = true;
//         defaultOption.selected = true;
//         classSelect.appendChild(defaultOption);
        
//         if (!Array.isArray(classes) || classes.length === 0) {
//             console.warn('No classes available or classes data is not an array');
//             const noClassOption = document.createElement('option');
//             noClassOption.value = '';
//             noClassOption.textContent = 'No classes available';
//             noClassOption.disabled = true;
//             classSelect.appendChild(noClassOption);
//             return;
//         }
        
//         // Add classes to dropdown
//         classes.forEach(cls => {
//             if (cls && (cls.id || cls.name)) {
//                 const option = document.createElement('option');
//                 option.value = cls.id || cls.name.toLowerCase().replace(/\s+/g, '-');
//                 option.textContent = cls.name || 'Unnamed Class';
//                 if (cls.code) {
//                     option.textContent += ` (${cls.code})`;
//                     option.dataset.code = cls.code;
//                 }
//                 if (cls.name) {
//                     option.dataset.name = cls.name;
//                 }
//                 classSelect.appendChild(option);
//             }
//         });
        
//         console.log('Class options populated:', classes.length, 'classes found');
//     } catch (error) {
//         console.error('Error populating class options:', error);
//         showError('Failed to load classes. Please check your connection and refresh the page.');
//     }
// }

// // Populate subject dropdown
// function populateSubjectOptions() {
//     try {
//         const subjectSelect = document.getElementById('examSubject');
//         if (!subjectSelect) {
//             console.error('Subject select element not found');
//             return;
//         }
        
//         // Clear all existing options
//         while (subjectSelect.options.length > 0) {
//             subjectSelect.remove(0);
//         }
        
//         // Add default option
//         const defaultOption = document.createElement('option');
//         defaultOption.value = '';
//         defaultOption.textContent = 'Select a subject';
//         defaultOption.disabled = true;
//         defaultOption.selected = true;
//         subjectSelect.appendChild(defaultOption);
        
//         if (!Array.isArray(subjects) || subjects.length === 0) {
//             console.warn('No subjects available or subjects data is not an array');
//             const noSubjectOption = document.createElement('option');
//             noSubjectOption.value = '';
//             noSubjectOption.textContent = 'No subjects available';
//             noSubjectOption.disabled = true;
//             subjectSelect.appendChild(noSubjectOption);
//             return;
//         }

//         // Add subjects to dropdown
//         subjects.forEach(subject => {
//             if (subject && subject.id && subject.name) {
//                 const option = document.createElement('option');
//                 option.value = subject.id;
//                 option.textContent = subject.name;
//                 option.dataset.name = subject.name;
//                 subjectSelect.appendChild(option);
//             }
//         });
        
//         console.log('Subject options populated:', subjects.length, 'subjects');
//     } catch (error) {
//         console.error('Error populating subject options:', error);
//         showError('Failed to load subjects. Please refresh the page.');
//     }
// }

// // Load existing exam for editing
// async function loadExistingExam() {
//     try {
//         showLoading();
        
//         const exams = await firebaseDB.getExams();
//         const exam = exams.find(e => e.id === currentExamId);
        
//         if (exam) {
//             // Populate exam details
//             document.getElementById('examTitle').value = exam.title || '';
//             document.getElementById('examDuration').value = exam.duration || 30;
//             document.getElementById('examClass').value = exam.classId || '';
//             document.getElementById('examSubject').value = exam.subjectId || '';
//             document.getElementById('examDescription').value = exam.description || '';
            
//             // Load questions
//             if (exam.questions && exam.questions.length > 0) {
//                 questions = exam.questions;
//                 displayQuestions();
//             }
//         }
        
//         hideLoading();
//     } catch (error) {
//         console.error('Error loading existing exam:', error);
//         showError('Failed to load exam data');
//         hideLoading();
//     }
// }

// // Get question form data
// function getQuestionFormData() {
//     const questionText = document.getElementById('questionText').value.trim();
//     const questionType = document.querySelector('input[name="questionType"]:checked').value;
    
//     if (!questionText) {
//         showError('Please enter a question');
//         return null;
//     }
    
//     // Auto-calculate points based on total marks and number of questions
//     const totalMarks = parseInt(document.getElementById('examTotalMarks').value) || 10;
//     const questionCount = questions.length + 1; // +1 for the current question
//     const basePoints = Math.floor(totalMarks / questionCount);
//     const points = basePoints > 0 ? basePoints : 1; // Ensure at least 1 point
    
//     const question = {
//         text: questionText,
//         type: questionType,
//         points: points,
//         options: [],
//         correctAnswer: null,
//         order: questionCount
//     };
    
//     if (questionType === 'multiple-choice') {
//         const options = [];
//         let hasCorrectAnswer = false;
        
//         document.querySelectorAll('.option-item').forEach((item, index) => {
//             const optionText = item.querySelector('.option-text').value.trim();
//             const isCorrect = item.querySelector('.correct-answer').checked;
            
//             if (optionText) {
//                 const optionId = `opt_${index + 1}`;
//                 options.push({
//                     id: optionId,
//                     text: optionText,
//                     isCorrect: isCorrect
//                 });
                
//                 if (isCorrect) {
//                     question.correctAnswer = optionId;
//                     hasCorrectAnswer = true;
//                 }
//             }
//         });
        
//         if (options.length < 2) {
//             showError('Please add at least 2 options');
//             return null;
//         }
        
//         if (!hasCorrectAnswer) {
//             showError('Please select the correct answer');
//             return null;
//         }
        
//         question.options = options;
//     } else if (questionType === 'trueFalse') {
//         const trueFalseAnswer = document.getElementById('trueFalseAnswer').value;
        
//         if (trueFalseAnswer !== 'true' && trueFalseAnswer !== 'false') {
//             showError('Please select True or False');
//             return null;
//         }
        
//         question.correctAnswer = trueFalseAnswer;
//         question.options = [
//             { id: 'true', text: 'True', isCorrect: trueFalseAnswer === 'true' },
//             { id: 'false', text: 'False', isCorrect: trueFalseAnswer === 'false' }
//         ];
//     }
    
//     return question;
// }

// // Handle adding a new question
// function handleAddQuestion() {
//     const questionData = getQuestionFormData();
//     if (!questionData) return; // Validation failed
    
//     // Add question to the list
//     if (editingQuestionIndex !== null) {
//         // Update existing question
//         questions[editingQuestionIndex] = questionData;
//         editingQuestionIndex = null;
//         showSuccess('Question updated successfully');
//     } else {
//         // Add new question
//         questions.push(questionData);
//         showSuccess('Question added successfully');
//     }
    
//     // Reset form and update display
//     resetQuestionForm();
//     displayQuestions();
// function addOptionField(optionValue = '') {
//     try {
//         const optionsList = document.getElementById('optionsList');
//         if (!optionsList) {
//             console.error('Options list container not found');
//             return;
//         }
        
//         const optionId = `option-${Date.now()}`;
//         const optionHtml = `
//             <div class="flex items-center option-field mb-2" data-option-id="${optionId}">
//                 <input type="text" 
//                        name="option" 
//                        value="${optionValue}" 
//                        placeholder="Enter option text"
//                        class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
//                        required>
//                 <button type="button" 
//                         class="ml-2 p-2 text-red-600 hover:text-red-800 transition-colors"
//                         data-action="remove-option"
//                         title="Remove option">
//                     <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
//                     </svg>
//                 </button>
//             </div>
//         `;
        
//         optionsList.insertAdjacentHTML('beforeend', optionHtml);
        
//         // Focus the new input field
//         const newInput = optionsList.lastElementChild?.querySelector('input');
//         if (newInput) {
//             newInput.focus();
//         }
        
//         // Add event listener for the remove button
//         const removeBtn = optionsList.lastElementChild?.querySelector('[data-action="remove-option"]');
//         if (removeBtn) {
//             removeBtn.addEventListener('click', (e) => {
//                 e.preventDefault();
//                 const optionField = e.target.closest('.option-field');
//                 if (optionField) {
//                     optionField.remove();
//                 }
//             });
//         }
        
//         return optionId;
//     } catch (error) {
//         console.error('Error adding option field:', error);
//         showError('Failed to add option. Please try again.');
//         return null;
//     }
// }

// // Remove an option field
// function removeOptionField(button) {
//     try {
//         if (!button || !(button instanceof Element)) {
//             console.error('Invalid button element provided to removeOptionField');
//             return;
//         }
        
//         const optionField = button.closest('.option-field');
//         if (!optionField) {
//             console.error('Could not find option field to remove');
//             return;
//         }
        
//         const optionsList = document.getElementById('optionsList');
//         if (!optionsList) {
//             console.error('Options list container not found');
//             return;
//         }
        
//         // Store the number of options before removal
//         const optionCount = optionsList.children.length;
        
//         // Remove the option field
//         optionField.remove();
        
//         // If this was the last option, add a new empty one
//         if (optionCount === 1) {
//             addOptionField();
//         }
//     } catch (error) {
//         console.error('Error removing option field:', error);
//         showError('Failed to remove option. Please try again.');
//     }
// }

// // Handle question type change
// function handleQuestionTypeChange() {
//     const questionType = document.querySelector('input[name="questionType"]:checked').value;
//     const optionsContainer = document.getElementById('optionsContainer');
//     const trueFalseContainer = document.getElementById('trueFalseOptions');
    
//     if (questionType === 'trueFalse') {
//         // Hide regular options, show True/False buttons
//         optionsContainer.style.display = 'none';
//         trueFalseContainer.style.display = 'block';
        
//         // Clear any existing options
//         document.getElementById('optionsList').innerHTML = '';
        
//         // Add True/False buttons
//         const trueFalseHTML = `
//             <div class="grid grid-cols-2 gap-4 mt-2">
//                 <button type="button" class="true-false-btn p-4 border-2 border-gray-300 rounded-lg text-center hover:bg-gray-50" 
//                         data-value="true" onclick="selectTrueFalse(this, true)">
//                     <span class="block text-lg font-medium">True</span>
//                 </button>
//                 <button type="button" class="true-false-btn p-4 border-2 border-gray-300 rounded-lg text-center hover:bg-gray-50" 
//                         data-value="false" onclick="selectTrueFalse(this, false)">
//                     <span class="block text-lg font-medium">False</span>
//                 </button>
//             </div>
//             <input type="hidden" id="trueFalseAnswer" value="">
//         `;
        
//         trueFalseContainer.innerHTML = trueFalseHTML;
//     } else {
//         // Show regular options, hide True/False buttons
//         optionsContainer.style.display = 'block';
//         trueFalseContainer.style.display = 'none';
        
//         // Ensure we have at least 2 options for multiple choice
//         const optionsList = document.getElementById('optionsList');
//         if (optionsList.children.length < 2) {
//             // Add two empty options by default
//             for (let i = 0; i < 2; i++) {
//                 addOptionField();
//             }
//         }
//     }
// }

// // Handle True/False selection
// function selectTrueFalse(button, value) {
//     // Remove active class from all buttons
//     document.querySelectorAll('.true-false-btn').forEach(btn => {
//         btn.classList.remove('bg-blue-100', 'border-blue-500');
//         btn.classList.add('border-gray-300', 'hover:border-gray-400');
//     });
    
//     // Add active class to selected button
//     button.classList.add('bg-blue-100', 'border-blue-500');
//     button.classList.remove('border-gray-300', 'hover:border-gray-400');
    
//     // Set the hidden input value
//     document.getElementById('trueFalseAnswer').value = value;
// }

// function handleQuestionSubmit(e) {
//     e.preventDefault();
    
//     const formData = new FormData(e.target);
//     const questionType = formData.get('questionType');
    
//     const questionData = {
//         text: formData.get('questionText'),
//         type: questionType,
//         points: parseInt(formData.get('questionPoints')) || 1,
//         order: editingQuestionIndex !== null ? questions[editingQuestionIndex].order : questions.length + 1
//     };
    
//     if (questionType === 'multiple-choice') {
//         questionData.options = {
//             A: formData.get('optionAText'),
//             B: formData.get('optionBText'),
//             C: formData.get('optionCText'),
//             D: formData.get('optionDText')
//         };
//         questionData.correctAnswer = formData.get('correctAnswer');
        
//         // Validate that all options are filled and correct answer is selected
//         if (!questionData.options.A || !questionData.options.B || !questionData.options.C || !questionData.options.D) {
//             showError('Please fill in all answer options');
//             return;
//         }
//         if (!questionData.correctAnswer) {
//             showError('Please select the correct answer');
//             return;
//         }
//     } else if (questionType === 'true-false') {
//         questionData.correctAnswer = formData.get('trueFalseAnswer');
        
//         if (!questionData.correctAnswer) {
//             showError('Please select the correct answer');
//             return;
//         }
//     }
    
//     // Add or update question
//     if (editingQuestionIndex !== null) {
//         questions[editingQuestionIndex] = questionData;
//         showSuccess('Question updated successfully');
//     } else {
//         questions.push(questionData);
//         showSuccess('Question added successfully');
//     }
    
//     displayQuestions();
//     closeQuestionModal();
// }

// // Display questions in the container
// function displayQuestions() {
//     const container = document.getElementById('questionsList');
//     const noQuestionsMessage = document.getElementById('noQuestionsMessage');
    
//     if (questions.length === 0) {
//         container.innerHTML = '<p id="noQuestionsMessage" class="text-center py-4 text-gray-500">No questions added yet. Add your first question above.</p>';
//         return;
//     }
    
//     container.innerHTML = '';
    
//     questions.forEach((question, index) => {
//         const questionDiv = document.createElement('div');
//         questionDiv.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm';
        
//         let optionsHtml = '';
//         if (question.type === 'multiple-choice') {
//             optionsHtml = `
//                 <div class="mt-3 space-y-2">
//                     <div class="flex items-center">
//                         <span class="w-6 h-6 rounded-full ${question.correctAnswer === 'A' ? 'bg-green-500' : 'bg-gray-200'} flex items-center justify-center text-xs font-bold text-white mr-3">A</span>
//                         <span>${question.options.A}</span>
//                     </div>
//                     <div class="flex items-center">
//                         <span class="w-6 h-6 rounded-full ${question.correctAnswer === 'B' ? 'bg-green-500' : 'bg-gray-200'} flex items-center justify-center text-xs font-bold text-white mr-3">B</span>
//                         <span>${question.options.B}</span>
//                     </div>
//                     <div class="flex items-center">
//                         <span class="w-6 h-6 rounded-full ${question.correctAnswer === 'C' ? 'bg-green-500' : 'bg-gray-200'} flex items-center justify-center text-xs font-bold text-white mr-3">C</span>
//                         <span>${question.options.C}</span>
//                     </div>
//                     <div class="flex items-center">
//                         <span class="w-6 h-6 rounded-full ${question.correctAnswer === 'D' ? 'bg-green-500' : 'bg-gray-200'} flex items-center justify-center text-xs font-bold text-white mr-3">D</span>
//                         <span>${question.options.D}</span>
//                     </div>
//                 </div>
//             `;
//         } else if (question.type === 'true-false') {
//             optionsHtml = `
//                 <div class="mt-3">
//                     <span class="px-3 py-1 rounded-full text-sm font-medium ${question.correctAnswer === 'true' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
//                         Correct Answer: ${question.correctAnswer === 'true' ? 'True' : 'False'}
//                     </span>
//                 </div>
//             `;
//         }
        
//         questionDiv.innerHTML = `
//             <div class="flex justify-between items-start">
//                 <div class="flex-1">
//                     <div class="flex items-center mb-2">
//                         <span class="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-3">
//                             Question ${index + 1}
//                         </span>
//                         <span class="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-3">
//                             ${question.type === 'multiple-choice' ? 'Multiple Choice' : 'True/False'}
//                         </span>
//                         <span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
//                             ${question.points} point${question.points !== 1 ? 's' : ''}
//                         </span>
//                     </div>
//                     <p class="text-gray-800 font-medium mb-2">${question.text}</p>
//                     ${optionsHtml}
//                 </div>
//                 <div class="flex space-x-3">
//                     <button onclick="editQuestion(${index})" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium px-2 py-1 hover:bg-indigo-50 rounded">
//                         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
//                         </svg>
//                     </button>
//                     <button onclick="deleteQuestion(${index})" class="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 hover:bg-red-50 rounded">
//                         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
//                         </svg>
//                     </button>
//                 </div>
//             </div>
//         `;
        
//         container.appendChild(questionDiv);
//     });
// }

// // Question management functions
// function editQuestion(index) {
//     const question = questions[index];
//     editingQuestionIndex = index;
    
//     // Set question text
//     document.getElementById('questionText').value = question.text;
    
//     // Set question type
//     document.querySelector(`input[name="questionType"][value="${question.type}"]`).checked = true;
//     handleQuestionTypeChange();
    
//     if (question.type === 'multiple-choice') {
//         // Set options
//         document.getElementById('optionAText').value = question.options.A;
//         document.getElementById('optionBText').value = question.options.B;
//         document.getElementById('optionCText').value = question.options.C;
//         document.getElementById('optionDText').value = question.options.D;
        
//         // Set correct answer
//         const correctAnswerRadio = document.querySelector(`input[name="correctAnswer"][value="${question.correctAnswer}"]`);
//         if (correctAnswerRadio) {
//             correctAnswerRadio.checked = true;
//         }
//     } else if (question.type === 'true-false') {
//         const trueFalseRadio = document.querySelector(`input[name="trueFalseAnswer"][value="${question.correctAnswer}"]`);
//         if (trueFalseRadio) {
//             trueFalseRadio.checked = true;
//         }
//     }
    
//     // Scroll to question form
//     document.getElementById('questionFormContainer').scrollIntoView({ behavior: 'smooth' });
    
//     // Change button text
//     document.getElementById('addQuestionBtn').textContent = 'Update Question';
// }

// // Reset the question form to its initial state
// function resetQuestionForm() {
//     document.getElementById('questionText').value = '';
//     document.querySelector('input[name="questionType"][value="multiple-choice"]').checked = true;
    
//     // Reset multiple choice options
//     document.getElementById('optionAText').value = '';
//     document.getElementById('optionBText').value = '';
//     document.getElementById('optionCText').value = '';
//     document.getElementById('optionDText').value = '';
    
//     // Reset radio buttons
//     const correctAnswerRadios = document.querySelectorAll('input[name="correctAnswer"]');
//     correctAnswerRadios.forEach(radio => radio.checked = false);
    
//     // Reset true/false options
//     const trueFalseRadios = document.querySelectorAll('input[name="trueFalseAnswer"]');
//     trueFalseRadios.forEach(radio => radio.checked = false);
    
//     // Reset UI to show multiple choice by default
//     document.getElementById('multipleChoiceOptions').classList.remove('hidden');
//     document.getElementById('trueFalseOptions').classList.add('hidden');
    
//     // Reset button text
//     document.getElementById('addQuestionBtn').textContent = 'Add Question';
//     editingQuestionIndex = null;
// }

// // Update points for each question based on total marks
// function updateQuestionPoints() {
//     const totalMarks = parseInt(document.getElementById('examTotalMarks')?.value) || 0;
    
//     if (questions.length > 0 && totalMarks > 0) {
//         const pointsPerQuestion = Math.floor(totalMarks / questions.length);
//         const remainder = totalMarks % questions.length;
        
//         // Distribute points evenly, with any remainder added to the first few questions
//         questions.forEach((q, i) => {
//             q.points = i < remainder ? pointsPerQuestion + 1 : pointsPerQuestion;
//         });
        
//         // Update the display to show the new points
//         displayQuestions();
//     }
// }

// function deleteQuestion(index) {
//     showCustomConfirmation(
//         'Delete Question',
//         'Are you sure you want to delete this question?',
//         (confirmed) => {
//             if (confirmed) {
//                 questions.splice(index, 1);
//                 // Update order for remaining questions
//                 questions.forEach((q, i) => {
//                     q.order = i + 1;
//                 });
//                 displayQuestions();
//                 showSuccess('Question deleted successfully');
//             }
//         }
//     );
// }

// // Save exam function
// async function saveExam() {
//     const form = document.getElementById('examDetailsForm');
//     const formData = new FormData(form);
    
//     // Get exam layer and calculate max marks based on layer
//     const examLayer = document.querySelector('input[name="examLayer"]:checked').value;
//     let maxMarks = 0;
    
//     switch(examLayer) {
//         case 'firstTest':
//             maxMarks = 10;
//             break;
//         case 'secondTest':
//             maxMarks = 30;
//             break;
//         case 'exam':
//             maxMarks = 60;
//             break;
//         default:
//             maxMarks = 10;
//     }
    
//     // Get the selected class and subject details
//     const classSelect = document.getElementById('examClass');
//     const subjectSelect = document.getElementById('examSubject');
    
//     const examData = {
//         title: formData.get('examTitle').trim(),
//         description: formData.get('examDescription').trim(),
//         duration: parseInt(formData.get('examDuration')) || 30,
//         classId: formData.get('examClass'),
//         className: classSelect.options[classSelect.selectedIndex].text,
//         subjectId: formData.get('examSubject'),
//         subjectName: subjectSelect.options[subjectSelect.selectedIndex].text,
//         layer: examLayer,
//         maxMarks: maxMarks,
//         totalMarks: parseInt(document.getElementById('examTotalMarks').value) || maxMarks,
//         questions: [...questions],
//         isActive: true,
//         updatedAt: firebase.firestore.FieldValue.serverTimestamp()
//     };
    
//     // Validate required fields
//     if (!examData.title || !examData.classId || !examData.subjectId) {
//         showError('Please fill in all required fields');
//         return;
//     }
    
//     if (examData.questions.length === 0) {
//         showError('Please add at least one question to the exam');
//         return;
//     }
    
//     // Auto-calculate and update question points based on total marks
//     const totalMarks = examData.totalMarks;
//     const questionCount = examData.questions.length;
//     const basePoints = Math.floor(totalMarks / questionCount);
//     const remainder = totalMarks % questionCount;
    
//     examData.questions = examData.questions.map((q, index) => ({
//         ...q,
//         points: index < remainder ? basePoints + 1 : basePoints
//     }));
    
//     try {
//         showLoading('Saving exam...');
        
//         if (currentExamId) {
//             // Update existing exam
//             await firebaseDB.updateExam(currentExamId, examData);
//             showSuccess('Exam updated successfully!');
//         } else {
//             // Create new exam
//             const examRef = await firebaseDB.addExam({
//                 ...examData,
//                 status: 'draft',
//                 code: generateUniqueExamCode(),
//                 createdAt: firebase.firestore.FieldValue.serverTimestamp()
//             });
//             currentExamId = examRef.id;
//             showSuccess('Exam created successfully!');
//         }
        
//         // Redirect to exam list after a short delay
//         setTimeout(() => {
//             window.location.href = 'admin-management.html';
//         }, 1500);
        
//     } catch (error) {
//         console.error('Error saving exam:', error);
//         showError('Failed to save exam: ' + (error.message || 'Please try again.'));
//     } finally {
//         hideLoading();
//     }
// }

// // Utility Functions
// function showLoading() {
//     document.getElementById('loadingModal').classList.remove('hidden');
// }

// function hideLoading() {
//     document.getElementById('loadingModal').classList.add('hidden');
// }

// function showSuccess(message) {
//     const toast = document.createElement('div');
//     toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
//     toast.textContent = message;
//     document.body.appendChild(toast);
    
//     setTimeout(() => {
//         if (document.body.contains(toast)) {
//             document.body.removeChild(toast);
//         }
//     }, 3000);
// }

// function showError(message) {
//     const toast = document.createElement('div');
//     toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
//     toast.textContent = message;
//     document.body.appendChild(toast);
    
//     setTimeout(() => {
//         if (document.body.contains(toast)) {
//             document.body.removeChild(toast);
//         }
//     }, 5000);
// }

// // Make sure all functions are available in the global scope
// window.initializeExamCreator = initializeExamCreator;
// window.setupEventListeners = setupEventListeners;
// window.loadInitialData = loadInitialData;

// // Initialize the application when the DOM is fully loaded
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', initializeApp);
// } else {
//     // DOMContentLoaded has already fired
//     initializeApp();
// }

// async function initializeApp() {
//     try {
//         console.log('Initializing exam creator...');
        
//         // Initialize the exam creator
//         if (typeof window.initializeExamCreator === 'function') {
//             await window.initializeExamCreator();
//             console.log('Exam creator initialized');
//         } else {
//             throw new Error('initializeExamCreator function not found');
//         }
        
//         // Set up event listeners
//         if (typeof window.setupEventListeners === 'function') {
//             window.setupEventListeners();
            
//             // Load initial data after setting up event listeners
//             if (typeof window.loadInitialData === 'function') {
//                 await window.loadInitialData();
//                 console.log('Initial data loaded');
//             }
//             console.log('Event listeners set up');
//         }
        
//         // Load initial data
//         if (typeof window.loadInitialData === 'function') {
//             await window.loadInitialData();
//             console.log('Initial data loaded');
//         }
        
//         console.log('Application initialized successfully');
//     } catch (error) {
//         console.error('Error initializing application:', error);
//         showError('Failed to initialize application: ' + (error.message || 'Unknown error'));
//     }
// }

// // Initialize the app when the DOM is fully loaded
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', initializeApp);
// } else {
//     // DOMContentLoaded has already fired
//     initializeApp();
// }
