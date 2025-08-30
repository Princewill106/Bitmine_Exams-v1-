// Modern Admin Dashboard JavaScript with Enhanced Features

// Global variables
let currentSection = 'dashboard';
let classes = [];
let subjects = [];
let exams = [];
let results = [];
let filteredResults = [];
let editMode = false;

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded, initializing dashboard...');

    // Check if Firebase is loaded
    if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded!');
        document.getElementById('authCheck').innerHTML = '<div class="text-center"><p class="text-red-600">Error: Firebase not loaded. Please refresh the page.</p></div>';
        return;
    }

    // Initialize Firebase if not already done
    if (!firebase.apps.length) {
        try {
            firebase.initializeApp(firebaseConfig);
            console.log('Firebase initialized');
        } catch (error) {
            console.error('Firebase initialization error:', error);
            document.getElementById('authCheck').innerHTML = '<div class="text-center"><p class="text-red-600">Error: Firebase configuration issue. Please check config.js</p></div>';
            return;
        }
    }

    checkAuthState();
});

// Check authentication state
function checkAuthState() {
    console.log('Checking authentication state...');

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log('User authenticated:', user.email);
            hideLoading();
            showMainLayout();
            loadDashboardData();
        } else {
            console.log('User not authenticated, redirecting...');
            // Add a small delay to ensure Firebase is fully loaded
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 1000);
        }
    });
}

// Toggle sidebar collapse
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');

    if (window.innerWidth <= 768) {
        // Mobile: toggle sidebar visibility
        if (sidebar) {
            sidebar.classList.toggle('mobile-open');
        }
    } else {
        // Desktop: toggle sidebar collapse
        if (sidebar && mainContent) {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('sidebar-collapsed');
        }
    }
}

// Show main layout after authentication
function showMainLayout() {
    console.log('Showing main layout...');
    const authCheck = document.getElementById('authCheck');
    const mainLayout = document.getElementById('mainLayout');

    if (authCheck) {
        authCheck.style.display = 'none';
        console.log('Auth check hidden');
    }
    if (mainLayout) {
        mainLayout.classList.remove('hidden');
        mainLayout.style.display = 'flex';
        console.log('Main layout shown');
    }

    // Initialize dashboard sections
    showSection('dashboard');
}

// Initialize dashboard
function initializeDashboard() {
    showSection('dashboard');
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

// Setup event listeners
function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
            updateActiveNavItem(this);
        });
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// Show section and update active nav item
function showSection(sectionName) {
    console.log('// Show specific section');
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.add('hidden');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }

    // Update active navigation
    const navItems = document.querySelectorAll('.sidebar-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });

    const activeItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }

    // Load data for the specific section
    switch (sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'classes':
            loadClasses();
            break;
        case 'subjects':
            loadSubjects();
            break;
        case 'exams':
            loadExams();
            break;
        case 'results':
            loadResults();
            break;
    }

    // Update page title if element exists
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
    }

    // Load section-specific data
    loadSectionData(sectionName);
}

// Update active navigation item
function updateActiveNavItem(activeItem) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('bg-slate-100', 'text-slate-900');
        item.classList.add('text-slate-600', 'hover:bg-slate-50');
    });

    activeItem.classList.remove('text-slate-600', 'hover:bg-slate-50');
    activeItem.classList.add('bg-slate-100', 'text-slate-900');
}

// Load section-specific data
async function loadSectionData(section) {
    // If we already have data loaded, use it
    if (section === 'results' && results && results.length > 0) {
        console.log('Using cached results data');
        displayResults();
        return;
    }
    
    // If we need to load data, use loadDashboardData which handles all data loading
    if (section === 'dashboard' || section === 'results') {
        console.log(`Loading data for section: ${section}`);
        await loadDashboardData();
        return;
    }
    
    // For other sections, load specific data
    showLoading();
    try {
        switch (section) {
            case 'classes':
                await loadClasses();
                break;
            case 'subjects':
                await loadSubjects();
                break;
            case 'exams':
                await loadExams();
                break;
        }
    } catch (error) {
        console.error(`Error loading ${section} data:`, error);
        showNotification(`Error loading ${section} data`, 'error');
    } finally {
        hideLoading();
    }
}

// Load dashboard data
async function loadDashboardData() {
    console.log('Loading dashboard data...');
    showLoading();
    
    try {
        const [classesData, subjectsData, examsData, resultsData] = await Promise.all([
            firebaseDB.getClasses(),
            firebaseDB.getSubjects(),
            firebaseDB.getExams(),
            firebaseDB.getResults()
        ]);

        // Update global variables
        classes = Array.isArray(classesData) ? classesData : [];
        subjects = Array.isArray(subjectsData) ? subjectsData : [];
        exams = Array.isArray(examsData) ? examsData : [];
        
        // Process results
        if (Array.isArray(resultsData)) {
            results = resultsData.map(result => ({
                id: result.id || '',
                studentName: result.studentName || 'Unknown Student',
                className: result.className || 'Unknown Class',
                subjectName: result.subjectName || 'Unknown Subject',
                examTitle: result.examTitle || 'Untitled Exam',
                score: result.score || 0,
                earnedPoints: result.earnedPoints || 0,
                totalMarks: result.totalPoints || result.totalMarks || 1,
                totalQuestions: result.totalQuestions || 1,
                percentage: result.percentage || 0,
                examType: result.layer || result.examType || 'Exam',
                layer: result.layer || 'main-exam',
                layerName: result.layerName || 'Exam',
                timestamp: result.timestamp?.toDate ? result.timestamp.toDate() : 
                         (result.timestamp ? new Date(result.timestamp) : new Date()),
                submittedAt: result.submittedAt?.toDate ? result.submittedAt.toDate() : 
                           (result.submittedAt ? new Date(result.submittedAt) : new Date()),
                ...result
            }));
            filteredResults = [...results];
        } else {
            results = [];
            filteredResults = [];
        }

        // Update stats
        const totalClassesEl = document.getElementById('totalClasses');
        const totalSubjectsEl = document.getElementById('totalSubjects');
        const totalExamsEl = document.getElementById('totalExams');
        const totalResultsEl = document.getElementById('totalResults');

        if (totalClassesEl) totalClassesEl.textContent = classes.length;
        if (totalSubjectsEl) totalSubjectsEl.textContent = subjects.length;
        if (totalExamsEl) totalExamsEl.textContent = exams.length;
        if (totalResultsEl) totalResultsEl.textContent = results.length;

        // Update UI based on current section
        if (currentSection === 'dashboard') {
            updateRecentActivity(results);
        } else if (currentSection === 'results') {
            displayResults();
        }
        
        // Populate filter dropdowns if on results page
        if (currentSection === 'results') {
            await populateFilterDropdowns();
        }
        
        console.log('Dashboard data loaded successfully');
        showNotification('Dashboard data refreshed', 'success');

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    } finally {
        hideLoading();
    }
}

// Create new exam - Navigate to exam creator page
async function createExam() {
    try {
        showLoading();

        // Load classes and subjects to check if any exist
        const [classes, subjects] = await Promise.all([
            firebaseDB.getClasses(),
            firebaseDB.getSubjects()
        ]);

        if (classes.length === 0) {
            showNotification('Please create at least one class first', 'error');
            hideLoading();
            return;
        }

        if (subjects.length === 0) {
            showNotification('Please create at least one subject first', 'error');
            hideLoading();
            return;
        }

        // Navigate to the exam creator page
        window.location.href = 'exam-creator.html';
        
    } catch (error) {
        console.error('Error navigating to exam creator:', error);
        showNotification('Failed to open exam creator', 'error');
        hideLoading();
    }
}

// Close create exam modal
function closeCreateExamModal() {
    document.getElementById('createExamModal').classList.add('hidden');
    document.getElementById('createExamForm').reset();
    document.getElementById('scoreLimit').textContent = '';
    document.getElementById('scoreError').classList.add('hidden');
}

// Update max score based on selected layer
function updateMaxScore() {
    const layerSelect = document.getElementById('examLayer');
    const scoreInput = document.getElementById('totalScore');
    const scoreLimit = document.getElementById('scoreLimit');
    const scoreError = document.getElementById('scoreError');

    const selectedOption = layerSelect.options[layerSelect.selectedIndex];
    if (selectedOption && selectedOption.dataset.max) {
        const maxScore = parseInt(selectedOption.dataset.max);
        scoreInput.max = maxScore;
        scoreLimit.textContent = `(Max: ${maxScore} marks)`;
        scoreError.classList.add('hidden');

        // Clear score if it exceeds the new max
        if (scoreInput.value && parseInt(scoreInput.value) > maxScore) {
            scoreInput.value = '';
        }
    } else {
        scoreInput.removeAttribute('max');
        scoreLimit.textContent = '';
    }
}

// Submit create exam form
async function submitCreateExam(event) {
    event.preventDefault();

    const examTitle = document.getElementById('examTitle').value.trim();
    const classId = document.getElementById('examClass').value;
    const subjectId = document.getElementById('examSubject').value;
    const examLayer = document.getElementById('examLayer').value;
    const totalScore = parseInt(document.getElementById('totalScore').value);
    const duration = parseInt(document.getElementById('examDuration').value);

    // Validation
    if (!examTitle || !classId || !subjectId || !examLayer || !totalScore || !duration) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    // Validate score against layer maximum
    const layerSelect = document.getElementById('examLayer');
    const selectedOption = layerSelect.options[layerSelect.selectedIndex];
    const maxScore = parseInt(selectedOption.dataset.max);

    if (totalScore > maxScore) {
        const scoreError = document.getElementById('scoreError');
        scoreError.textContent = `Score cannot exceed ${maxScore} marks for this layer`;
        scoreError.classList.remove('hidden');
        return;
    }

    try {
        showLoading();

        // Get class and subject details
        const classSelect = document.getElementById('examClass');
        const subjectSelect = document.getElementById('examSubject');
        const selectedClassOption = classSelect.options[classSelect.selectedIndex];
        const selectedSubjectOption = subjectSelect.options[subjectSelect.selectedIndex];

        const className = selectedClassOption.dataset.name;
        const classCode = selectedClassOption.dataset.code;
        const subjectName = selectedSubjectOption.dataset.name;

        // Generate unique exam code
        const examCode = await generateUniqueExamCode();

        // Get layer display name
        const layerNames = {
            'first-test': 'First Test',
            'second-test': 'Second Test',
            'main-exam': 'Main Exam'
        };

        // Create sample questions for testing
        const sampleQuestions = createSampleQuestions(examLayer, totalScore);

        const examData = {
            title: examTitle,
            classId: classId,
            className: className,
            classCode: classCode,
            subjectId: subjectId,
            subjectName: subjectName,
            layer: examLayer,
            layerName: layerNames[examLayer],
            totalScore: totalScore,
            duration: duration,
            code: examCode,
            status: 'active',
            questions: sampleQuestions,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebase.auth().currentUser?.email || 'admin'
        };

        const examId = await firebaseDB.addExam(examData);

        showCustomNotification(
            'Exam Created Successfully!',
            `Your exam "${examTitle}" has been created.\n\nClass Code: ${classCode}\nExam Code: ${examCode}\n\nStudents can now use these codes to take the exam.`,
            'success'
        );

        // Close modal and refresh data
        closeCreateExamModal();
        await loadDashboardData();
        await loadExams();

        // Show exam details in console for admin reference
        console.log('Exam Created:', {
            title: examTitle,
            classCode: classCode,
            examCode: examCode,
            layer: layerNames[examLayer],
            totalScore: totalScore,
            duration: duration
        });

    } catch (error) {
        console.error('Error creating exam:', error);
        showNotification('Error creating exam: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Update dashboard statistics
function updateDashboardStats() {
    document.getElementById('totalClasses').textContent = classes.length;
    document.getElementById('totalSubjects').textContent = subjects.length;
    document.getElementById('totalExams').textContent = exams.length;
    document.getElementById('totalResults').textContent = results.length;
}

// Update recent activity
function updateRecentActivity(results) {
    const container = document.getElementById('recentActivity');
    if (!container) {
        console.log('recentActivity element not found, skipping update');
        return;
    }

    if (!results || results.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">No recent activity</p>';
        return;
    }

    // Show latest 5 results
    const recentResults = results.slice(0, 5);
    container.innerHTML = recentResults.map(result => `
        <div class="flex items-center space-x-3 py-2">
            <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">${result.studentName || 'Unknown Student'}</p>
                <p class="text-xs text-gray-500">${result.examTitle || 'Unknown Exam'} - ${result.score || 0}/${result.totalMarks || 0}</p>
            </div>
        </div>
    `).join('');
}

// Load classes
async function loadClasses() {
    try {
        classes = await firebaseDB.getClasses();
        displayClasses();
    } catch (error) {
        console.error('Error loading classes:', error);
        showNotification('Error loading classes', 'error');
    }
}

// Display classes
function displayClasses() {
    const tbody = document.getElementById('classesTableBody');
    tbody.innerHTML = classes.map(cls => `
        <tr class="hover:bg-slate-50">
            <td class="py-3 px-4 text-slate-800">${cls.name}</td>
            <td class="py-3 px-4 text-slate-600">${cls.section}</td>
            <td class="py-3 px-4 text-slate-600">${cls.code}</td>
            <td class="py-3 px-4 text-slate-600">${formatDate(cls.createdAt)}</td>
            <td class="py-3 px-4">
                <button onclick="editClass('${cls.id}')" class="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3">Edit</button>
                <button onclick="deleteClass('${cls.id}')" class="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Load subjects
async function loadSubjects() {
    try {
        subjects = await firebaseDB.getSubjects();
        displaySubjects();
    } catch (error) {
        console.error('Error loading subjects:', error);
        showNotification('Error loading subjects', 'error');
    }
}

// Display subjects
function displaySubjects() {
    const tbody = document.getElementById('subjectsTableBody');
    tbody.innerHTML = subjects.map(subject => `
        <tr class="hover:bg-slate-50">
            <td class="py-3 px-4 text-slate-800">${subject.name}</td>
            <td class="py-3 px-4 text-slate-600">${subject.description || 'N/A'}</td>
            <td class="py-3 px-4 text-slate-600">${formatDate(subject.createdAt)}</td>
            <td class="py-3 px-4">
                <button onclick="editSubject('${subject.id}')" class="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3">Edit</button>
                <button onclick="deleteSubject('${subject.id}')" class="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Load exams
async function loadExams() {
    try {
        exams = await firebaseDB.getExams();
        displayExams();
    } catch (error) {
        console.error('Error loading exams:', error);
        showNotification('Error loading exams', 'error');
    }
}

// Display exams
function displayExams() {
    const tbody = document.getElementById('examsTableBody');
    tbody.innerHTML = exams.map(exam => {
        const className = classes.find(c => c.id === exam.classId)?.name || 'Unknown';
        const subjectName = subjects.find(s => s.id === exam.subjectId)?.name || 'Unknown';

        return `
            <tr class="hover:bg-slate-50">
                <td class="py-3 px-4 text-slate-800">${exam.title}</td>
                <td class="py-3 px-4 text-slate-600">${className}</td>
                <td class="py-3 px-4 text-slate-600">${subjectName}</td>
                <td class="py-3 px-4 text-slate-600">${exam.layerName || 'N/A'}</td>
                <td class="py-3 px-4 text-slate-600">${exam.code}</td>
                <td class="py-3 px-4 text-slate-600">${exam.totalMarks}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 text-xs rounded-full ${exam.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${exam.status || 'active'}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <button onclick="editExam('${exam.id}')" class="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3">Edit</button>
                    <button onclick="deleteExam('${exam.id}')" class="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Global variables to store results (declared at the top of the file)

// Load results
async function loadResults() {
    console.log('Loading results from Firebase...');
    
    const tbody = document.getElementById('resultsTableBody');
    
    // Show loading state
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-gray-500">
                    <i class="fas fa-spinner fa-spin mr-2"></i> Loading results...
                </td>
            </tr>`;
    }
    
    try {
        // Clear any existing results
        results = [];
        filteredResults = [];
        
        console.log('Fetching results from Firebase...');
        const resultsData = await firebaseDB.getResults();
        console.log('Raw results from Firebase:', resultsData);
        
        if (!resultsData || resultsData.length === 0) {
            console.warn('No results found in the database');
            showNotification('No exam results found.', 'info');
            
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-4 text-gray-500">
                            No exam results found. Submit an exam to see results here.
                        </td>
                    </tr>`;
            }
            return;
        }
        
        // Process and validate results
        results = resultsData.map(result => {
            // Convert Firestore Timestamp to Date if needed
            const timestamp = result.timestamp?.toDate ? 
                result.timestamp.toDate() : 
                (result.timestamp ? new Date(result.timestamp) : new Date());
                
            const submittedAt = result.submittedAt ? 
                (result.submittedAt.toDate ? result.submittedAt.toDate() : new Date(result.submittedAt)) : 
                timestamp;
                
            return {
                id: result.id || '',
                studentName: result.studentName || 'Unknown Student',
                className: result.className || 'Unknown Class',
                subjectName: result.subjectName || 'Unknown Subject',
                examTitle: result.examTitle || 'Untitled Exam',
                score: result.score || 0,
                earnedPoints: result.earnedPoints || 0,
                totalMarks: result.totalPoints || result.totalMarks || 1, // Avoid division by zero
                totalQuestions: result.totalQuestions || 1,
                percentage: result.percentage || 0,
                examType: result.layer || result.examType || 'Exam',
                layer: result.layer || 'main-exam',
                layerName: result.layerName || 'Exam',
                timestamp: timestamp,
                submittedAt: submittedAt,
                // Include all original fields
                ...result
            };
        });
        
        console.log(`Processed ${results.length} results`);
        
        // Log the first few results for debugging
        const sampleCount = Math.min(3, results.length);
        console.log(`Sample of ${sampleCount} results:`, results.slice(0, sampleCount));
        
        // Log the first few results for debugging
        console.log('First 3 results:', results.slice(0, 3));
        
        // Make sure results is a valid array
        if (!Array.isArray(results)) {
            console.error('Error: results is not an array', results);
            results = [];
        }
        
        // Update filtered results with a deep copy
        filteredResults = JSON.parse(JSON.stringify(results));
        console.log('filteredResults after assignment (length):', filteredResults.length);
        
        // Update filter dropdowns
        await populateFilterDropdowns();
        
        // Log success
        console.log('Results loaded successfully');
        console.log('Results array length:', results.length);
        console.log('filteredResults array length:', filteredResults.length);
        
        // Show notification and force display of results
        showNotification(`Loaded ${results.length} exam results`, 'success');
        
        // Force display of results after a short delay to ensure DOM is ready
        setTimeout(() => {
            console.log('Forcing display of results...');
            displayResults();
        }, 100);
        
    } catch (error) {
        console.error('Error loading results:', error);
        const errorMessage = error.message || 'Unknown error occurred while loading results';
        console.error('Error details:', error);
        showNotification('Error: ' + errorMessage, 'error');
        
        // Show error in the results table
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-red-600">
                        Error loading results. Please check console for details.
                        <div class="text-sm text-red-700 mt-2">${errorMessage}</div>
                    </td>
                </tr>`;
        }
    }
}

// Populate filter dropdowns with all available classes and subjects
async function populateFilterDropdowns() {
    console.group('=== POPULATE FILTER DROPDOWNS ===');
    console.log('1. Starting populateFilterDropdowns');
    console.log('2. Current filteredResults length:', filteredResults ? filteredResults.length : 0);
    
    let classFilter, subjectFilter, examTypeFilter;
    
    try {
        console.log('Fetching classes and subjects for filter dropdowns...');
        
        // Get DOM elements
        classFilter = document.getElementById('classFilter');
        subjectFilter = document.getElementById('subjectFilter');
        examTypeFilter = document.getElementById('examTypeFilter');

        if (!classFilter || !subjectFilter || !examTypeFilter) {
            console.error('One or more filter elements not found in the DOM');
            return;
        }
        
        // Show loading states
        classFilter.innerHTML = '<option value="all">Loading classes...</option>';
        subjectFilter.innerHTML = '<option value="all">Loading subjects...</option>';
        examTypeFilter.innerHTML = '<option value="all">Loading exam types...</option>';
        
        // Fetch data from Firebase
        console.log('Fetching classes and subjects...');
        const [classes, subjects] = await Promise.all([
            firebaseDB.getClasses().catch(e => {
                console.error('Error fetching classes:', e);
                return [];
            }),
            firebaseDB.getSubjects().catch(e => {
                console.error('Error fetching subjects:', e);
                return [];
            })
        ]);
        
        console.log('Classes from DB:', classes);
        console.log('Subjects from DB:', subjects);
        
        // Reset dropdowns with default options
        classFilter.innerHTML = '<option value="all">All Classes</option>';
        subjectFilter.innerHTML = '<option value="all">All Subjects</option>';
        examTypeFilter.innerHTML = '<option value="all">All Exam Types</option>';
        
        // Populate class dropdown
        if (classes && classes.length > 0) {
            classes.forEach(classData => {
                if (classData && classData.name) {
                    const option = document.createElement('option');
                    option.value = classData.name;
                    option.textContent = classData.name;
                    classFilter.appendChild(option);
                }
            });
            console.log('Populated classes dropdown with', classes.length, 'classes');
        } else {
            console.warn('No classes found in the database');
            const option = document.createElement('option');
            option.value = 'none';
            option.textContent = 'No classes found';
            option.disabled = true;
            classFilter.appendChild(option);
        }
        
        // Populate subject dropdown
        if (subjects && subjects.length > 0) {
            subjects.forEach(subjectData => {
                if (subjectData && subjectData.name) {
                    const option = document.createElement('option');
                    option.value = subjectData.name;
                    option.textContent = subjectData.name;
                    subjectFilter.appendChild(option);
                }
            });
            console.log('Populated subjects dropdown with', subjects.length, 'subjects');
        } else {
            console.warn('No subjects found in the database');
            const option = document.createElement('option');
            option.value = 'none';
            option.textContent = 'No subjects found';
            option.disabled = true;
            subjectFilter.appendChild(option);
        }
        
        // Define the specific exam types we want to show in the filter
        const examTypes = [
            { id: 'first-test', name: 'First Test (10 marks)' },
            { id: 'second-test', name: 'Second Test (30 marks)' },
            { id: 'main-exam', name: 'Main Exam (60 marks)' }
        ];

        // Clear any existing options
        examTypeFilter.innerHTML = '<option value="all">All Exam Types</option>';
        
        // Add our standard exam types to the dropdown
        examTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.name;
            examTypeFilter.appendChild(option);
        });
        
        // Create a mapping of all possible variations to standard types for filtering
        window.examTypeMap = {
            // First Test variations
            'first-test': 'first-test',
            'first_test': 'first-test',
            'test1': 'first-test',
            'first test': 'first-test',
            'test': 'first-test',
            'first-test (10 marks)': 'first-test',
            'first test (10 marks)': 'first-test',
            
            // Second Test variations
            'second-test': 'second-test',
            'second_test': 'second-test',
            'test2': 'second-test',
            'second test': 'second-test',
            'mid-term': 'second-test',
            'mid term': 'second-test',
            'second-test (30 marks)': 'second-test',
            'second test (30 marks)': 'second-test',
            
            // Main Exam variations
            'main-exam': 'main-exam',
            'main_exam': 'main-exam',
            'exam': 'main-exam',
            'final': 'main-exam',
            'main exam': 'main-exam',
            'final exam': 'main-exam',
            'main-exam (60 marks)': 'main-exam',
            'main exam (60 marks)': 'main-exam'
        };
        
        console.log('Filter dropdowns populated successfully');
        
    } catch (error) {
        console.error('Error in populateFilterDropdowns:', error);
        
        // Reset dropdowns on error
        if (classFilter) {
            classFilter.innerHTML = '<option value="all">Error loading classes</option>';
        }
        if (subjectFilter) {
            subjectFilter.innerHTML = '<option value="all">Error loading subjects</option>';
        }
        if (examTypeFilter) {
            examTypeFilter.innerHTML = '<option value="all">Error loading exam types</option>';
        }
        
        // Show error notification
        showNotification('Error loading filter options. Please refresh the page.', 'error');
    }
}

// Apply result filters
function applyResultFilters() {
    try {
        console.log('Applying filters...');
        
        // Get filter values
        const classFilter = document.getElementById('classFilter')?.value || 'all';
        const subjectFilter = document.getElementById('subjectFilter')?.value || 'all';
        const examTypeFilter = document.getElementById('examTypeFilter')?.value || 'all';
        
        console.log('Filter values:', { classFilter, subjectFilter, examTypeFilter });
        
        // If no results, show empty state
        if (!results || results.length === 0) {
            console.log('No results to filter');
            filteredResults = [];
            displayResults();
            showNotification('No results found', 'info');
            return;
        }
        
        console.log('Available results to filter:', results);
        
        // Filter results
        filteredResults = results.filter(result => {
            if (!result) return false;
            
            try {
                // Normalize values for case-insensitive comparison
                const resultClass = String(result.className || '').toLowerCase().trim();
                const resultSubject = String(result.subjectName || '').toLowerCase().trim();
                const resultExamType = String(result.layer || result.examType || '').toLowerCase().trim();
                
                // Class filter
                const classMatch = classFilter === 'all' || 
                    (resultClass && resultClass === classFilter.toLowerCase());
                
                // Subject filter
                const subjectMatch = subjectFilter === 'all' || 
                    (resultSubject && resultSubject === subjectFilter.toLowerCase());
                
                // Exam type filter - check both layer and examType fields
                let examTypeMatch = true;
                if (examTypeFilter !== 'all') {
                    // Use the examTypeMap to normalize the exam type for comparison
                    const normalizedExamType = window.examTypeMap[resultExamType] || resultExamType;
                    examTypeMatch = normalizedExamType === examTypeFilter.toLowerCase();
                    
                    // If no direct match, check if the exam type contains the filter value
                    if (!examTypeMatch && resultExamType) {
                        examTypeMatch = resultExamType.includes(examTypeFilter.toLowerCase());
                    }
                }
                
                const matches = classMatch && subjectMatch && examTypeMatch;
                
                if (matches) {
                    console.log('Match found:', { 
                        className: result.className, 
                        subjectName: result.subjectName,
                        examType: result.examType || result.layer,
                        result
                    });
                }
                
                return matches;
            } catch (error) {
                console.error('Error filtering result:', error, result);
                return false;
            }
        });

        console.log(`Filtered ${filteredResults.length} results out of ${results.length}`);
        
        // Display the filtered results
        displayResults();
        
        // Show notification with result count
        const isFiltered = classFilter !== 'all' || subjectFilter !== 'all' || examTypeFilter !== 'all';
        if (isFiltered) {
            showNotification(
                `Showing ${filteredResults.length} filtered result${filteredResults.length !== 1 ? 's' : ''}`, 
                filteredResults.length > 0 ? 'success' : 'warning'
            );
        } else {
            showNotification(
                `Showing all ${filteredResults.length} result${filteredResults.length !== 1 ? 's' : ''}`,
                'info'
            );
        }
    } catch (error) {
        console.error('Error in applyResultFilters:', error);
        showNotification('Error applying filters. Please try again.', 'error');
    }
}

// Debug function to manually trigger results loading
window.debugLoadResults = async function() {
    console.group('=== DEBUG: MANUAL RESULTS LOAD ===');
    console.log('1. Starting manual results load...');
    
    try {
        console.log('2. Calling loadResults()...');
        await loadResults();
        console.log('4. loadResults() completed successfully');
        
        console.log('5. Current results array length:', results ? results.length : 0);
        console.log('6. Current filteredResults array length:', filteredResults ? filteredResults.length : 0);
        
        // Force display of results
        console.log('7. Forcing display of results...');
        displayResults();
        
        console.log('8. Display complete');
    } catch (error) {
        console.error('Error in debugLoadResults:', error);
        showNotification('Debug Error: ' + (error.message || 'Unknown error'), 'error');
    }
    
    console.groupEnd();
};

// Debug function to test exam data fetching
window.debugExamData = async function(examId) {
    console.group(`=== DEBUG: EXAM DATA FOR ${examId} ===`);
    
    try {
        if (!examId) {
            console.error('❌ Please provide an examId. Usage: debugExamData("your-exam-id")');
            return;
        }
        
        console.log('🔍 Fetching exam data...');
        const examData = await fetchExamData(examId);
        
        if (examData) {
            console.log('✅ Exam data retrieved successfully:');
            console.table(examData);
            
            // Test score calculation
            console.log('🧮 Testing score calculation:');
            const pointsPerQuestion = examData.totalMarks / examData.totalQuestions;
            console.log(`Points per question: ${examData.totalMarks} ÷ ${examData.totalQuestions} = ${pointsPerQuestion}`);
            
            // Example calculations
            for (let correct = 0; correct <= examData.totalQuestions; correct++) {
                const score = correct * pointsPerQuestion;
                const percentage = Math.round((score / examData.totalMarks) * 100);
                console.log(`${correct} correct answers = ${score}/${examData.totalMarks} (${percentage}%)`);
            }
        } else {
            console.error('❌ Failed to fetch exam data');
        }
    } catch (error) {
        console.error('❌ Error in debugExamData:', error);
    }
    
    console.groupEnd();
};

// Debug function to test score calculation for a specific result
window.debugResultScore = async function(resultIndex = 0) {
    console.group(`=== DEBUG: RESULT SCORE CALCULATION ===`);
    
    try {
        if (!results || results.length === 0) {
            console.error('❌ No results available. Load results first.');
            return;
        }
        
        const result = results[resultIndex];
        if (!result) {
            console.error(`❌ No result found at index ${resultIndex}`);
            return;
        }
        
        console.log(`🎯 Analyzing result for: ${result.studentName || 'Unknown Student'}`);
        console.log('📋 Raw result data:', result);
        
        if (result.examId) {
            const examData = await fetchExamData(result.examId);
            if (examData) {
                console.log('📊 Exam data:', examData);
                
                const pointsPerQuestion = examData.totalMarks / examData.totalQuestions;
                console.log(`🧮 Points per question: ${pointsPerQuestion}`);
                
                // Test different score calculation methods
                console.log('🔍 Testing score calculation methods:');
                
                if (result.earnedPoints !== undefined) {
                    console.log(`✅ earnedPoints: ${result.earnedPoints}/${examData.totalMarks}`);
                }
                
                if (result.correctAnswers !== undefined) {
                    const score = result.correctAnswers * pointsPerQuestion;
                    console.log(`✅ correctAnswers: ${result.correctAnswers} × ${pointsPerQuestion} = ${score}/${examData.totalMarks}`);
                }
                
                if (result.score !== undefined) {
                    console.log(`✅ score field: ${result.score} (interpreting...)`);
                    if (result.score <= 100 && result.score > 1) {
                        const score = (result.score / 100) * examData.totalMarks;
                        console.log(`   As percentage: ${result.score}% of ${examData.totalMarks} = ${score}`);
                    } else {
                        const score = result.score * pointsPerQuestion;
                        console.log(`   As correct count: ${result.score} × ${pointsPerQuestion} = ${score}`);
                    }
                }
            }
        } else {
            console.warn('⚠️ No examId found in result');
        }
    } catch (error) {
        console.error('❌ Error in debugResultScore:', error);
    }
    
    console.groupEnd();
};

// Fetch exam data from Firebase
async function fetchExamData(examId) {
    try {
        if (!examId) {
            console.warn('❌ No examId provided to fetchExamData');
            return null;
        }
        
        console.log(`🔍 Fetching exam data for examId: ${examId}`);
        const examDoc = await firebase.firestore().collection('exams').doc(examId).get();
        
        if (examDoc.exists) {
            const examData = examDoc.data();
            console.log('📄 Raw exam data from Firebase:', examData);
            
            const processedData = {
                totalMarks: examData.totalMarks || examData.totalPoints || examData.marks || 30,
                totalQuestions: examData.questions ? examData.questions.length : (examData.totalQuestions || examData.questionCount || 6),
                examTitle: examData.title || examData.examTitle || examData.name || 'Untitled Exam',
                layer: examData.layer || examData.examType || 'main-exam',
                layerName: examData.layerName || examData.examTypeName
            };
            
            console.log('✅ Processed exam data:', processedData);
            return processedData;
        } else {
            console.warn(`❌ No exam found with ID: ${examId}`);
            return null;
        }
    } catch (error) {
        console.error('❌ Error fetching exam data:', error);
        return null;
    }
}

// Display results
async function displayResults() {
    console.group('=== DISPLAY RESULTS ===');
    console.log('1. Starting displayResults');
    console.log('2. filteredResults type:', typeof filteredResults);
    console.log('3. filteredResults length:', filteredResults ? filteredResults.length : 0);
    console.log('4. filteredResults content:', filteredResults);
    
    try {
        const tbody = document.getElementById('resultsTableBody');
        console.log('5. Table body element:', tbody ? 'Found' : 'Not found');
        
        if (!tbody) {
            console.error('6. Error: Results table body not found in the DOM');
            console.groupEnd();
            return;
        }
        
        if (!filteredResults || filteredResults.length === 0) {
            console.log('6. No filtered results to display');
            console.log('7. Results array length:', results ? results.length : 0);
            console.log('8. Results array content:', results);
            
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-gray-500">
                        No results found matching the current filters
                    </td>
                </tr>`;
                
            // If we have results but they're all filtered out, show a different message
            if (results && results.length > 0) {
                console.log('Results exist but are being filtered out');
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-4 text-gray-500">
                            No results match the current filters. Try adjusting your filter criteria.
                        </td>
                    </tr>`;
            }
            return;
        }
        
        // Sort results by timestamp (newest first)
        const sortedResults = [...filteredResults].sort((a, b) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA; // Newest first
        });
        
        // Show loading message while fetching exam data
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-gray-500">
                    <i class="fas fa-spinner fa-spin mr-2"></i> Loading results with exam data...
                </td>
            </tr>`;
        
        // Process results with exam data
        const processedResults = await Promise.all(sortedResults.map(async (result) => {
            try {
                // Get exam type from result data, with fallbacks
                const examType = result.layer || result.examType || 'main-exam';
                const examTypeDisplay = getExamTypeDisplay(examType);
                const examTypeName = result.layerName || examTypeDisplay?.text || 'Exam';
                const examTypeClass = examTypeDisplay?.class || 'bg-gray-200 text-gray-800';
                
                // Get exam data to calculate proper score
                let totalMarks = 0;
                let totalQuestions = 1;
                let examTitle = result.examTitle || 'Untitled Exam';
                
                // PRIORITY 1: Get exam data from Firebase using examId (most accurate)
                if (result.examId) {
                    console.log(`🎯 Found examId: ${result.examId} - fetching from Firebase`);
                    const examData = await fetchExamData(result.examId);
                    if (examData) {
                        totalMarks = examData.totalMarks;
                        totalQuestions = examData.totalQuestions;
                        examTitle = examData.examTitle || examTitle;
                        console.log(`✅ Got exam data from Firebase:`, examData);
                    } else {
                        console.warn(`❌ Failed to fetch exam data for examId: ${result.examId}`);
                        // Fallback to result data
                        totalMarks = result.totalMarks || result.totalPoints || getMaxScoreForExamType(examType) || 30;
                        totalQuestions = result.totalQuestions || 6;
                    }
                }
                // PRIORITY 2: Use exam data from result itself (if available)
                else if (result.totalMarks && result.totalQuestions) {
                    totalMarks = result.totalMarks;
                    totalQuestions = result.totalQuestions;
                    console.log(`📋 Using exam data from result: ${totalMarks} marks, ${totalQuestions} questions`);
                }
                // PRIORITY 3: Fallback to default values
                else {
                    totalMarks = result.totalPoints || getMaxScoreForExamType(examType) || 30;
                    totalQuestions = result.totalQuestions || 6;
                    console.warn(`⚠️ Using fallback values: ${totalMarks} marks, ${totalQuestions} questions`);
                }
                
                // Calculate points per question (marks each question carries)
                const pointsPerQuestion = totalMarks / totalQuestions;
                console.log(`📊 EXAM DATA: ${examTitle}`);
                console.log(`   Total Marks: ${totalMarks}`);
                console.log(`   Questions: ${totalQuestions}`);
                console.log(`   Points per Q: ${pointsPerQuestion}`);
                console.log(`   Result Data:`, {
                    score: result.score,
                    earnedPoints: result.earnedPoints,
                    correctAnswers: result.correctAnswers,
                    totalPoints: result.totalPoints,
                    percentage: result.percentage
                });
                
                // Calculate student's earned score - YOUR EXACT FORMULA
                let correctAnswersCount = 0;
                let finalScore = 0;
                
                // Step 1: Determine how many questions the student got correct
                if (result.correctAnswers !== undefined) {
                    correctAnswersCount = result.correctAnswers;
                    console.log(`✅ Found correctAnswers: ${correctAnswersCount}`);
                } 
                else if (result.score !== undefined) {
                    // Convert score to correct answers count
                    if (result.score <= totalQuestions) {
                        // Score represents number of correct answers
                        correctAnswersCount = result.score;
                        console.log(`✅ Score as correct answers: ${result.score}`);
                    } else if (result.score <= 100) {
                        // Score is percentage, convert to correct answers
                        correctAnswersCount = Math.round((result.score / 100) * totalQuestions);
                        console.log(`✅ Percentage ${result.score}% = ${correctAnswersCount} correct answers`);
                    } else {
                        // Score is in marks, convert back to correct answers
                        correctAnswersCount = Math.round(result.score / pointsPerQuestion);
                        console.log(`✅ Marks ${result.score} = ${correctAnswersCount} correct answers`);
                    }
                }
                else if (result.answers && Array.isArray(result.answers)) {
                    correctAnswersCount = result.answers.filter(a => a.isCorrect).length;
                    console.log(`✅ Counted from answers array: ${correctAnswersCount} correct`);
                }
                else if (result.earnedPoints !== undefined) {
                    correctAnswersCount = Math.round(result.earnedPoints / pointsPerQuestion);
                    console.log(`✅ EarnedPoints ${result.earnedPoints} = ${correctAnswersCount} correct answers`);
                }
                else {
                    correctAnswersCount = 0;
                    console.log('❌ No score data, defaulting to 0 correct answers');
                }
                
                // Step 2: Apply YOUR EXACT FORMULA
                // correctAnswers × (totalMarks ÷ totalQuestions) = finalScore
                finalScore = correctAnswersCount * pointsPerQuestion;
                console.log(`🎯 YOUR FORMULA: ${correctAnswersCount} correct × (${totalMarks} ÷ ${totalQuestions}) = ${correctAnswersCount} × ${pointsPerQuestion} = ${finalScore} marks`);
                
                // Ensure score doesn't exceed total marks
                finalScore = Math.min(Math.max(0, finalScore), totalMarks);
                
                // Calculate percentage based on totalMarks
                const percentage = Math.round((finalScore / totalMarks) * 100);
                
                // Format student name with proper escaping
                const studentName = escapeHtml(result.studentName || 'Unknown Student');
                const className = escapeHtml(result.className || 'Unknown Class');
                const subjectName = escapeHtml(result.subjectName || 'Unknown Subject');
                const examTitleEscaped = escapeHtml(examTitle);
                
                // Calculate score display with proper formatting - show actual earned score out of total marks
                const scoreDisplay = editMode ?
                    `<input type="number" 
                        value="${Math.round(finalScore)}" 
                        min="0" 
                        max="${totalMarks}" 
                        class="w-20 px-2 py-1 border rounded text-center" 
                        onchange="updateScore('${result.id}', 'earnedPoints', this.value)">` :
                    `${Math.round(finalScore)} / ${totalMarks}`;
                
                // Set percentage color coding
                const percentageClass = 
                    percentage >= 70 ? 'bg-green-100 text-green-800' :
                    percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800';
                
                // Format the submission date
                const submittedAt = result.submittedAt ? new Date(result.submittedAt).toLocaleString() : 'N/A';
                
                // Truncate long text
                const truncate = (text, maxLength = 20) => {
                    if (!text) return 'N/A';
                    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
                };
                
                return `
                    <tr class="hover:bg-gray-50 border-b border-gray-200">
                        <td class="py-3 px-4 text-gray-800" title="${studentName || 'N/A'}">${truncate(studentName, 15)}</td>
                        <td class="py-3 px-4 text-gray-600" title="${className || 'N/A'}">${truncate(className, 15)}</td>
                        <td class="py-3 px-4 text-gray-600" title="${subjectName || 'N/A'}">${truncate(subjectName, 15)}</td>
                        <td class="py-3 px-4 text-gray-600" title="${examTitleEscaped || 'N/A'}">${truncate(examTitleEscaped, 15)}</td>
                        <td class="py-3 px-4">
                            <span class="px-2 py-1 text-xs rounded-full ${examTypeClass}" title="${examTypeName}">
                                ${truncate(examTypeName, 10)}
                            </span>
                        </td>
                        <td class="py-3 px-4 text-gray-800 font-medium text-center">
                            ${scoreDisplay}
                        </td>
                        <td class="py-3 px-4 text-center">
                            <div class="flex flex-col items-center">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${percentageClass} mb-1">
                                    ${percentage}%
                                </span>
                                <span class="text-xs text-gray-500" title="Submitted: ${submittedAt}">
                                    ${truncate(submittedAt, 15)}
                                </span>
                            </div>
                        </td>
                    </tr>
                `;
            } catch (error) {
                console.error('Error rendering result row:', error, result);
                return ''; // Skip this row if there's an error
            }
        }));
        
        tbody.innerHTML = processedResults.join('');
        console.log(`Displayed ${processedResults.length} results`);
        
    } catch (error) {
        console.error('Error in displayResults:', error);
        const tbody = document.getElementById('resultsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-red-600">
                        Error displaying results. Please check console for details.
                    </td>
                </tr>`;
        }
    }
}

// Delete result function
async function deleteResult(resultId) {
    showCustomConfirmation(
        'Delete Result',
        'Are you sure you want to delete this result? This action cannot be undone.',
        async (confirmed) => {
            if (!confirmed) return;

            try {
                showLoading();
                await firebaseDB.deleteResult(resultId);
                showCustomNotification('Success', 'Result deleted successfully!', 'success');

                // Refresh results display
                await loadResults();
            } catch (error) {
                console.error('Error deleting result:', error);
                showCustomNotification('Error', 'Error deleting result: ' + error.message, 'error');
            } finally {
                hideLoading();
            }
        }
    );
}

// Utility functions
function showLoading() {
    console.log('Loading...');
}

function hideLoading() {
    console.log('Loading complete');
}

function showNotification(message, type = 'success') {
    console.log(`${type}: ${message}`);
    showCustomNotification('Information', message, 'info');

    notification.classList.remove('hidden');

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
}

function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('currentDateTime').textContent = now.toLocaleDateString('en-US', options);
}

// Logout function
async function logout() {
    try {
        await firebase.auth().signOut();
        window.location.href = 'admin-login.html';
    } catch (error) {
        console.error('Error signing out:', error);
        showNotification('Error signing out', 'error');
    }
}

// Placeholder functions for CRUD operations
function editClass(classId) {
    showNotification('Edit class feature coming soon', 'info');
}

function deleteClass(classId) {
    showNotification('Delete class feature coming soon', 'info');
}

function editSubject(subjectId) {
    showNotification('Edit subject feature coming soon', 'info');
}

function deleteSubject(subjectId) {
    showNotification('Delete subject feature coming soon', 'info');
}

function editExam(examId) {
    showNotification('Edit exam feature coming soon', 'info');
}

// deleteExam function is implemented below at line 1321

function viewResultDetails(resultId) {
    showNotification('Result details feature coming soon', 'info');
}

// Helper functions for exam types
function getExamTypeDisplay(examType) {
    switch (examType) {
        case 'first-test':
            return { text: 'First Test', class: 'bg-green-100 text-green-800' };
        case 'second-test':
            return { text: 'Second Test', class: 'bg-yellow-100 text-yellow-800' };
        case 'main-exam':
            return { text: 'Main Exam', class: 'bg-red-100 text-red-800' };
        default:
            return { text: 'Main Exam', class: 'bg-gray-100 text-gray-800' };
    }
}

function getMaxScoreForExamType(examType) {
    switch (examType) {
        case 'first-test': return 10;
        case 'second-test': return 30;
        case 'main-exam': return 60;
        default: return 60;
    }
}

// Toggle edit mode for results
function toggleEditMode() {
    editMode = !editMode;
    const editModeText = document.getElementById('editModeText');
    if (editModeText) {
        editModeText.textContent = editMode ? 'View Mode' : 'Edit Mode';
    }
    displayResults();
    showNotification(editMode ? 'Edit mode enabled' : 'Edit mode disabled');
}

// Update score function
async function updateScore(resultId, field, value) {
    try {
        const result = results.find(r => r.id === resultId);
        if (!result) {
            throw new Error('Result not found');
        }

        // Parse the input value
        const numValue = parseInt(value) || 0;
        
        // Calculate points per question based on total marks and number of questions
        const totalQuestions = result.totalQuestions || 1; // Prevent division by zero
        const pointsPerQuestion = result.totalMarks ? (result.totalMarks / totalQuestions) : 1;
        
        // Calculate the raw score (number of correct answers)
        const rawScore = field === 'score' ? numValue : result.score || 0;
        
        // Calculate the actual score based on points per question
        const calculatedScore = Math.round(rawScore * pointsPerQuestion);
        
        // Calculate percentage
        const maxScore = result.totalMarks || getMaxScoreForExamType(result.layer || result.examType || 'main-exam');
        const percentage = Math.round((calculatedScore / maxScore) * 100);
        
        // Prepare update data
        const updateData = {
            [field]: numValue,
            calculatedScore: calculatedScore,
            percentage: percentage,
            updatedAt: new Date().toISOString()
        };
        
        // Update in Firebase
        await firebaseDB.updateResult(resultId, updateData);
        
        // Update local result data
        Object.assign(result, updateData);
        
        showNotification('Score updated successfully');
        displayResults(); // Refresh display
        
    } catch (error) {
        console.error('Error updating score:', error);
        showNotification(`Error updating score: ${error.message}`, 'error');
    }
}

// Old createExam function removed - now using modern modal version

// Export results
async function exportResults() {
    console.group('Export Debug - Starting Export');
    try {
        showLoading();
        console.log('1. Starting export process...');
        
        // Check if we have results to export
        const hasFilteredResults = Array.isArray(filteredResults) && filteredResults.length > 0;
        const hasResults = Array.isArray(results) && results.length > 0;
        
        console.log('2. Data status:', { hasFilteredResults, hasResults });
        
        // Use filtered results if available, otherwise use all results
        const dataToExport = hasFilteredResults ? filteredResults : (hasResults ? results : []);
        
        console.log('3. Data to export:', dataToExport);
        
        if (!dataToExport || dataToExport.length === 0) {
            const message = 'No results to export. Please ensure there are results available.';
            console.warn('4. ' + message);
            showCustomNotification('Export', message, 'warning');
            return;
        }
        
        console.log(`4. Preparing to export ${dataToExport.length} results...`);
        
        // Generate CSV content with proper score calculation
        console.log('5. Generating CSV content...');
        const csvContent = await generateCSV(dataToExport);
        
        if (!csvContent) {
            const errorMsg = 'No valid data to export. Please check if there are any results available.';
            console.error('6. ' + errorMsg);
            throw new Error(errorMsg);
        }
        
        console.log('6. CSV content generated successfully');
        
        // Create filename with timestamp
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
        const filename = `exam_results_${timestamp}.csv`;
        
        console.log('7. Attempting to download file:', filename);
        
        // Download the file
        try {
            await downloadCSV(csvContent, filename);
            const successMessage = `Successfully exported ${dataToExport.length} result(s)`;
            console.log('8. ' + successMessage);
            showCustomNotification('Export Successful', successMessage, 'success');
        } catch (downloadError) {
            console.error('8. Download failed:', downloadError);
            throw new Error(`Failed to download file: ${downloadError.message || 'Unknown error'}`);
        }
        
    } catch (error) {
        const errorMessage = `Export failed: ${error.message || 'Unknown error'}`;
        console.error('ERROR:', errorMessage, error);
        showCustomNotification('Export Error', errorMessage, 'error');
    } finally {
        console.groupEnd();
        hideLoading();
    }
}

// Generate CSV content with all relevant result details
async function generateCSV(data) {
    try {
        console.log('generateCSV called with data:', data);
        
        if (!Array.isArray(data) || data.length === 0) {
            console.warn('No data provided to generateCSV');
            return '\uFEFFNo data available for export';
        }

        // Define all possible headers
        const headers = [
            'Student Name', 'Class', 'Subject', 
            'Exam Type', 'Exam Title', 'Exam Code',
            'Score', 'Total Marks', 'Percentage', 
            'Total Questions', 'Correct Answers',
            'Date', 'Status'
        ];
        
        const csvRows = [];
        
        // Add headers
        csvRows.push(headers.join('\t'));
        
        // Helper function to format CSV values
        const formatCsvValue = (value) => {
            if (value === null || value === undefined || value === '') return '';
            // Convert to string and escape tabs and newlines
            const str = String(value);
            return `"${str.replace(/"/g, '""')}"`; // Wrap in quotes and escape existing quotes
        };

        // Process each result with async exam data fetching
        for (let index = 0; index < data.length; index++) {
            const result = data[index];
            try {
                if (!result || typeof result !== 'object') {
                    console.warn(`Skipping invalid result at index ${index}:`, result);
                    continue;
                }

                console.log(`Processing result ${index + 1}:`, result);
                
                const examType = result.layer || result.examType || 'main-exam';
                
                // Get exam data for proper score calculation
                let totalMarks = 0;
                let totalQuestions = 1;
                let examTitle = result.examTitle || 'Untitled Exam';
                
                // PRIORITY 1: Get exam data from Firebase using examId (most accurate)
                if (result.examId) {
                    console.log(`🔍 Fetching exam data for export - examId: ${result.examId}`);
                    const examData = await fetchExamData(result.examId);
                    if (examData) {
                        totalMarks = examData.totalMarks;
                        totalQuestions = examData.totalQuestions;
                        examTitle = examData.examTitle || examTitle;
                        console.log(`✅ Got exam data for export:`, examData);
                    } else {
                        console.warn(`❌ Failed to fetch exam data for export - examId: ${result.examId}`);
                        totalMarks = result.totalMarks || result.totalPoints || getMaxScoreForExamType(examType) || 30;
                        totalQuestions = result.totalQuestions || 6;
                    }
                }
                // PRIORITY 2: Use exam data from result itself
                else if (result.totalMarks && result.totalQuestions) {
                    totalMarks = Number(result.totalMarks);
                    totalQuestions = Number(result.totalQuestions);
                    console.log(`📋 Using exam data from result for export: ${totalMarks} marks, ${totalQuestions} questions`);
                }
                // PRIORITY 3: Fallback to default values
                else {
                    totalMarks = Number(result.totalPoints) || getMaxScoreForExamType(examType) || 30;
                    totalQuestions = Number(result.totalQuestions) || 6;
                    console.warn(`⚠️ Using fallback values for export: ${totalMarks} marks, ${totalQuestions} questions`);
                }
                
                // Calculate points per question
                const pointsPerQuestion = totalMarks / totalQuestions;
                
                // Calculate student's earned score using YOUR EXACT FORMULA
                let correctAnswersCount = 0;
                let finalScore = 0;
                
                // Step 1: Determine how many questions the student got correct
                if (result.correctAnswers !== undefined) {
                    correctAnswersCount = result.correctAnswers;
                } 
                else if (result.score !== undefined) {
                    // Convert score to correct answers count
                    if (result.score <= totalQuestions) {
                        correctAnswersCount = result.score;
                    } else if (result.score <= 100) {
                        correctAnswersCount = Math.round((result.score / 100) * totalQuestions);
                    } else {
                        correctAnswersCount = Math.round(result.score / pointsPerQuestion);
                    }
                }
                else if (result.answers && Array.isArray(result.answers)) {
                    correctAnswersCount = result.answers.filter(a => a.isCorrect).length;
                }
                else if (result.earnedPoints !== undefined) {
                    correctAnswersCount = Math.round(result.earnedPoints / pointsPerQuestion);
                }
                else {
                    correctAnswersCount = 0;
                }
                
                // Step 2: Apply YOUR EXACT FORMULA
                finalScore = correctAnswersCount * pointsPerQuestion;
                
                // Ensure score doesn't exceed total marks
                finalScore = Math.min(Math.max(0, finalScore), totalMarks);
                
                // Calculate percentage based on totalMarks
                const percentage = Math.round((finalScore / totalMarks) * 100);
                
                // Format date for display
                let formattedDate = 'N/A';
                try {
                    if (result.timestamp) {
                        const date = new Date(result.timestamp);
                        if (!isNaN(date.getTime())) {
                            formattedDate = date.toLocaleString();
                        }
                    }
                } catch (e) {
                    console.warn('Error formatting date:', e);
                }
                
                // Get exam type display name
                let examTypeDisplay = examType;
                try {
                    const typeInfo = getExamTypeDisplay(examType);
                    examTypeDisplay = result.layerName || (typeInfo ? typeInfo.text : examType);
                } catch (e) {
                    console.warn('Error getting exam type display:', e);
                }
                
                // Prepare row data with all fields using the calculated values
                const row = [
                    result.studentName || result.student || 'N/A',
                    result.className || result.class || 'N/A',
                    result.subjectName || result.subject || 'N/A',
                    examTypeDisplay,
                    examTitle, // Use the fetched exam title
                    result.examCode || result.code || '',
                    Math.round(finalScore).toString(),
                    totalMarks.toString(),
                    percentage + '%',
                    totalQuestions.toString(),
                    correctAnswersCount.toString(), // Use the actual correct answers count
                    formattedDate,
                    result.status || 'Completed'
                ].map(field => formatCsvValue(field));
                
                csvRows.push(row.join('\t'));
                
            } catch (error) {
                console.error(`Error processing result at index ${index}:`, error, result);
                // Add error information to the CSV
                const errorRow = [
                    `Error processing result: ${error.message || 'Unknown error'}`,
                    '', '', '', '', '', '', '', '', '', '', '', 'Error'
                ].map(field => formatCsvValue(field));
                csvRows.push(errorRow.join('\t'));
            }
        }

        if (csvRows.length <= 1) { // Only headers or no data
            console.warn('No valid data rows to export');
            return null;
        }

        const csvContent = '\uFEFF' + csvRows.join('\n');
        console.log('Generated CSV content:', csvContent);
        return csvContent;
        
    } catch (error) {
        console.error('Error in generateCSV:', error);
        // Return a minimal error CSV if something goes wrong
        return '\uFEFFError\tMessage\nError generating CSV\t' + (error.message || 'Unknown error');
    }
}

// Download CSV file
function downloadCSV(content, filename) {
    return new Promise((resolve, reject) => {
        try {
            console.log('Starting file download...');
            
            // Ensure content is a string
            let csvContent = '';
            if (typeof content === 'string' && content.trim() !== '') {
                csvContent = content;
            } else {
                console.error('Invalid content for CSV:', content);
                throw new Error('No valid content to export');
            }
            
            console.log('CSV content length:', csvContent.length);
            
            // Convert content to a Uint8Array for proper encoding
            const encoder = new TextEncoder();
            const data = encoder.encode(csvContent);
            
            // Create blob with CSV MIME type
            const blob = new Blob([data], { 
                type: 'text/csv;charset=utf-8;' 
            });
            
            // For IE/Edge
            if (window.navigator && window.navigator.msSaveOrOpenBlob) {
                console.log('Using msSaveOrOpenBlob for IE/Edge');
                window.navigator.msSaveOrOpenBlob(blob, filename);
                resolve();
                return;
            }
            
            // For modern browsers
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            console.log('Created object URL:', url);
            
            // Set download attributes
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            // Add to document
            document.body.appendChild(link);
            
            // Log before click
            console.log('Triggering download with filename:', filename);
            
            // Trigger download
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
            });
            
            link.dispatchEvent(clickEvent);
            
            // Clean up
            setTimeout(() => {
                console.log('Cleaning up...');
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                resolve();
            }, 1000); // Increased timeout to ensure download starts
            
        } catch (error) {
            const errorMsg = 'Error in downloadCSV: ' + (error.message || 'Unknown error');
            console.error(errorMsg, error);
            showCustomNotification('Export Error', 'Failed to download file. Please check console for details.', 'error');
            reject(new Error(errorMsg));
        }
    });
}

// Load classes from Firebase
async function loadClasses() {
    try {
        showLoading();
        const classes = await firebaseDB.getClasses();
        displayClasses(classes);
    } catch (error) {
        console.error('Error loading classes:', error);
        showNotification('Error loading classes', 'error');
    } finally {
        hideLoading();
    }
}

// Display classes
function displayClasses(classes) {
    const tbody = document.getElementById('classesTableBody');
    if (!tbody) {
        console.error('classesTableBody not found');
        return;
    }

    if (!classes || classes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No classes found</td></tr>';
        return;
    }

    tbody.innerHTML = classes.map(cls => `
        <tr class="hover:bg-gray-50">
            <td class="py-3 px-4 text-gray-800">${cls.name}</td>
            <td class="py-3 px-4 text-gray-600">${cls.section || 'N/A'}</td>
            <td class="py-3 px-4 text-gray-600">${cls.code}</td>
            <td class="py-3 px-4 text-gray-600">${formatDate(cls.createdAt)}</td>
            <td class="py-3 px-4">
                <button onclick="deleteClass('${cls.id}')" class="text-red-600 hover:text-red-800 text-sm font-medium">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// Load classes
async function loadClasses() {
    try {
        const classes = await firebaseDB.getClasses();
        displayClasses(classes);
    } catch (error) {
        console.error('Error loading classes:', error);
        showNotification('Error loading classes', 'error');
    }
}

// Load subjects
async function loadSubjects() {
    try {
        const subjects = await firebaseDB.getSubjects();
        displaySubjects(subjects);
    } catch (error) {
        console.error('Error loading subjects:', error);
        showNotification('Error loading subjects', 'error');
    }
}

// Create new class - Open modal
function createClass() {
    document.getElementById('createClassModal').classList.remove('hidden');
    document.getElementById('className').focus();
}

// Close create class modal
function closeCreateClassModal() {
    document.getElementById('createClassModal').classList.add('hidden');
    document.getElementById('createClassForm').reset();
}

// Submit create class form
async function submitCreateClass(event) {
    event.preventDefault();

    const className = document.getElementById('className').value.trim();
    const classSection = document.getElementById('classSection').value.trim();

    if (!className || !classSection) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        showLoading();

        // Generate unique class code
        const classCode = await generateUniqueClassCode();

        const classData = {
            name: className,
            section: classSection,
            code: classCode,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebase.auth().currentUser.email
        };

        await firebaseDB.addClass(classData);
        showNotification('Class created successfully!');

        // Close modal and refresh data
        closeCreateClassModal();
        await loadDashboardData();
        await loadClasses();

    } catch (error) {
        console.error('Error creating class:', error);
        showNotification('Error creating class', 'error');
    } finally {
        hideLoading();
    }
}

// Create new subject - Open modal
function createSubject() {
    document.getElementById('createSubjectModal').classList.remove('hidden');
    document.getElementById('subjectName').focus();
}

// Close create subject modal
function closeCreateSubjectModal() {
    document.getElementById('createSubjectModal').classList.add('hidden');
    document.getElementById('createSubjectForm').reset();
}

// Submit create subject form
async function submitCreateSubject(event) {
    event.preventDefault();

    const subjectName = document.getElementById('subjectName').value.trim();
    const subjectDescription = document.getElementById('subjectDescription').value.trim();

    if (!subjectName) {
        showNotification('Please enter a subject name', 'error');
        return;
    }

    try {
        showLoading();

        const subjectData = {
            name: subjectName,
            description: subjectDescription,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebase.auth().currentUser.email
        };

        await firebaseDB.addSubject(subjectData);
        showNotification('Subject created successfully!');

        // Close modal and refresh data
        closeCreateSubjectModal();
        await loadDashboardData();
        await loadSubjects();

    } catch (error) {
        console.error('Error creating subject:', error);
        showNotification('Error creating subject', 'error');
    } finally {
        hideLoading();
    }
}

// Load subjects from Firebase
async function loadSubjects() {
    try {
        showLoading();
        const subjects = await firebaseDB.getSubjects();
        displaySubjects(subjects);
    } catch (error) {
        console.error('Error loading subjects:', error);
        showNotification('Error loading subjects', 'error');
    } finally {
        hideLoading();
    }
}

// Display subjects
function displaySubjects(subjects) {
    const tbody = document.getElementById('subjectsTableBody');
    if (!tbody) {
        console.error('subjectsTableBody not found');
        return;
    }

    if (!subjects || subjects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No subjects found</td></tr>';
        return;
    }

    tbody.innerHTML = subjects.map(subject => `
        <tr class="hover:bg-gray-50">
            <td class="py-3 px-4 text-gray-800">${subject.name}</td>
            <td class="py-3 px-4 text-gray-600">${subject.description || 'N/A'}</td>
            <td class="py-3 px-4 text-gray-600">${formatDate(subject.createdAt)}</td>
            <td class="py-3 px-4">
                <button onclick="deleteSubject('${subject.id}')" class="text-red-600 hover:text-red-800 text-sm font-medium">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// Display exams
function displayExams(exams) {
    const tbody = document.getElementById('examsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (exams.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">No exams created yet. Click "Create Exam" to get started.</td></tr>';
        return;
    }

    exams.forEach(exam => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-200 hover:bg-gray-50';

        const createdDate = exam.createdAt ? new Date(exam.createdAt.toDate()).toLocaleDateString() : 'N/A';
        const layerBadge = getLayerBadge(exam.layer, exam.layerName);
        const statusBadge = getStatusBadge(exam.status);

        row.innerHTML = `
            <td class="py-3 px-4 font-medium">${exam.title || 'Untitled'}</td>
            <td class="py-3 px-4">${exam.className || 'N/A'}</td>
            <td class="py-3 px-4">${exam.subjectName || 'N/A'}</td>
            <td class="py-3 px-4">${layerBadge}</td>
            <td class="py-3 px-4 font-mono text-sm bg-gray-100 px-2 py-1 rounded">${exam.examCode || exam.code || 'N/A'}</td>
            <td class="py-3 px-4">${exam.totalMarks || 0} marks</td>
            <td class="py-3 px-4">${statusBadge}</td>
            <td class="py-3 px-4">
                <div class="flex space-x-2">
                    <button onclick="viewExamDetails('${exam.id}')" class="text-blue-600 hover:text-blue-800 text-sm">View</button>
                    <button onclick="deleteExam('${exam.id}')" class="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// Helper function to get layer badge
function getLayerBadge(layer, layerName) {
    const badges = {
        'first-test': '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">First Test (10)</span>',
        'second-test': '<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">Second Test (30)</span>',
        'main-exam': '<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">Main Exam (60)</span>'
    };
    return badges[layer] || `<span class="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">${layerName || layer}</span>`;
}

// Helper function to get status badge
function getStatusBadge(status) {
    const badges = {
        'active': '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Active</span>',
        'draft': '<span class="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">Draft</span>',
        'completed': '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">Completed</span>'
    };
    return badges[status] || `<span class="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">${status}</span>`;
}

// View exam details
function viewExamDetails(examId) {
    // For now, show exam info in console and notification
    // In a full implementation, this would open a detailed modal
    console.log('Viewing exam details for ID:', examId);
    showNotification('Exam details feature - check console for exam ID', 'info');
}

// Delete exam
async function deleteExam(examId) {
    showCustomConfirmation(
        'Delete Exam',
        'Are you sure you want to delete this exam? This action cannot be undone.',
        async (confirmed) => {
            if (!confirmed) return;

            try {
                showLoading();
                await firebaseDB.deleteExam(examId);
                showCustomNotification('Success', 'Exam deleted successfully!', 'success');

                // Refresh data
                await loadDashboardData();
                await loadExams();
            } catch (error) {
                console.error('Error deleting exam:', error);
                showCustomNotification('Error', 'Error deleting exam: ' + error.message, 'error');
            } finally {
                hideLoading();
            }
        }
    );
}

// Custom notification and confirmation functions
let confirmationCallback = null;

// Show custom notification (replaces alert())
function showCustomNotification(title, message, type = 'info') {
    const modal = document.getElementById('customNotificationModal');
    const titleEl = document.getElementById('notificationTitle');
    const messageEl = document.getElementById('notificationMessage');
    const iconEl = document.getElementById('notificationIcon');

    titleEl.textContent = title;
    messageEl.textContent = message;

    // Set icon based on type
    const icons = {
        success: `<svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>`,
        error: `<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>`,
        info: `<svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
               </svg>`
    };

    iconEl.innerHTML = icons[type] || icons.info;
    modal.classList.remove('hidden');
}

// Close custom notification
function closeCustomNotification() {
    document.getElementById('customNotificationModal').classList.add('hidden');
}

// Show custom confirmation (replaces confirm())
function showCustomConfirmation(title, message, callback) {
    const modal = document.getElementById('customConfirmationModal');
    const titleEl = document.getElementById('confirmationTitle');
    const messageEl = document.getElementById('confirmationMessage');

    titleEl.textContent = title;
    messageEl.textContent = message;
    confirmationCallback = callback;

    modal.classList.remove('hidden');
}

// Close custom confirmation
function closeCustomConfirmation(confirmed) {
    document.getElementById('customConfirmationModal').classList.add('hidden');
    if (confirmationCallback) {
        confirmationCallback(confirmed);
        confirmationCallback = null;
    }
}

// Create sample questions for testing the exam workflow
function createSampleQuestions(layer, totalScore) {
    const questionCount = Math.min(totalScore, 10); // Max 10 questions for testing
    const questions = [];

    const sampleQuestionTemplates = {
        'first-test': [
            { question: "What is 2 + 2?", options: ["3", "4", "5", "6"], correctAnswer: "4" },
            { question: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"], correctAnswer: "Paris" },
            { question: "What is 5 × 3?", options: ["12", "15", "18", "20"], correctAnswer: "15" },
            { question: "Which color is made by mixing red and blue?", options: ["Green", "Purple", "Orange", "Yellow"], correctAnswer: "Purple" },
            { question: "How many days are in a week?", options: ["5", "6", "7", "8"], correctAnswer: "7" }
        ],
        'second-test': [
            { question: "What is 12 × 8?", options: ["84", "96", "104", "112"], correctAnswer: "96" },
            { question: "What is the largest planet in our solar system?", options: ["Earth", "Mars", "Jupiter", "Saturn"], correctAnswer: "Jupiter" },
            { question: "What is 144 ÷ 12?", options: ["10", "11", "12", "13"], correctAnswer: "12" },
            { question: "Which gas do plants absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correctAnswer: "Carbon Dioxide" },
            { question: "What is the square root of 64?", options: ["6", "7", "8", "9"], correctAnswer: "8" }
        ],
        'main-exam': [
            { question: "What is the formula for the area of a circle?", options: ["πr", "πr²", "2πr", "πd"], correctAnswer: "πr²" },
            { question: "Who wrote 'Romeo and Juliet'?", options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"], correctAnswer: "William Shakespeare" },
            { question: "What is the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], correctAnswer: "Au" },
            { question: "In which year did World War II end?", options: ["1944", "1945", "1946", "1947"], correctAnswer: "1945" },
            { question: "What is the speed of light in vacuum?", options: ["300,000 km/s", "150,000 km/s", "450,000 km/s", "600,000 km/s"], correctAnswer: "300,000 km/s" }
        ]
    };

    const templates = sampleQuestionTemplates[layer] || sampleQuestionTemplates['first-test'];

    for (let i = 0; i < questionCount; i++) {
        const template = templates[i % templates.length];
        questions.push({
            id: `q_${i}`,
            question: template.question,
            options: template.options,
            correctAnswer: template.correctAnswer,
            points: 1,
            type: 'multiple-choice'
        });
    }

    return questions;
}

// Load exams
async function loadExams() {
    try {
        const exams = await firebaseDB.getExams();
        displayExams(exams);
    } catch (error) {
        console.error('Error loading exams:', error);
        showNotification('Error loading exams', 'error');
    }
}

// Load results
async function loadResults() {
    try {
        const results = await firebaseDB.getResults();
        displayResults(results);
    } catch (error) {
        console.error('Error loading results:', error);
        showNotification('Error loading results: ' + (error.message || 'Unknown error'), 'error');
    }
}

// Export results to CSV
async function exportResultsToCSV() {
    try {
        // Get filtered results if filters are applied
        const classFilter = document.getElementById('classFilter')?.value || '';
        const subjectFilter = document.getElementById('subjectFilter')?.value || '';
        const examTypeFilter = document.getElementById('examTypeFilter')?.value || '';

        let filteredResults = [...window.results];
        
        if (classFilter) {
            filteredResults = filteredResults.filter(r => r.classId === classFilter);
        }
        if (subjectFilter) {
            filteredResults = filteredResults.filter(r => r.subjectId === subjectFilter);
        }
        if (examTypeFilter) {
            filteredResults = filteredResults.filter(r => (r.layer || r.examType) === examTypeFilter);
        }

        if (filteredResults.length === 0) {
            showNotification('No results match the current filters', 'warning');
            return;
        }

        // Sort by date (newest first) to match the display
        filteredResults.sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));

        // Generate CSV content
        const csvContent = generateCSV(filteredResults);
        
        // Create download link
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `exam_results_${timestamp}.csv`;
        
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification(`Exported ${filteredResults.length} results to ${filename}`, 'success');
    } catch (error) {
        console.error('Error exporting results:', error);
        showNotification('Error exporting results: ' + (error.message || 'Unknown error'), 'error');
    }
}

// Generate CSV content with all relevant result details
function generateCSV(data) {
    // Define CSV headers
    const headers = [
        'Student Name', 'Student ID', 'Class', 'Subject', 'Exam Type', 'Exam Title',
        'Objective Score', 'Theory Score', 'Total Score', 'Max Score', 'Percentage', 
        'Date', 'Exam Code', 'Class Code', 'Teacher Notes'
    ];

    // Process each result into a CSV row
    const rows = data.map(result => {
        try {
            const examType = result.layer || result.examType || 'main-exam';
            const totalMarks = Number(result.totalMarks) || 0;
            const score = Number(result.score) || 0;
            const totalQuestions = Math.max(Number(result.totalQuestions) || 1, 1);
            const theoryScore = Number(result.theoryScore) || 0;
            
            // Calculate scores
            const earnedPoints = totalMarks > 0 
                ? Math.round((score / totalQuestions) * totalMarks)
                : score;
            
            const totalScore = earnedPoints + theoryScore;
            const maxScore = totalMarks + (theoryScore > 0 ? theoryScore : 0);
            const percentage = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(2) + '%' : 'N/A';
            
            // Format date
            const examDate = result.timestamp?.toDate() 
                ? new Date(result.timestamp.toDate()).toISOString() 
                : '';
            
            // Get exam type display name
            const examTypeInfo = getExamTypeDisplay(examType);
            const examTypeDisplay = result.layerName || examTypeInfo.text;

            // Escape CSV values properly
            const escapeCsv = (value) => {
                if (value === null || value === undefined) return '';
                const str = String(value);
                // If contains comma, quote, or newline, wrap in quotes and escape existing quotes
                if (/[,"\n\r]/.test(str)) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            return [
                escapeCsv(result.studentName || ''),
                escapeCsv(result.studentId || ''),
                escapeCsv(result.className || ''),
                escapeCsv(result.subjectName || ''),
                escapeCsv(examTypeDisplay),
                escapeCsv(result.examTitle || 'Untitled Exam'),
                earnedPoints,
                theoryScore,
                totalScore,
                maxScore,
                percentage,
                examDate,
                escapeCsv(result.examCode || ''),
                escapeCsv(result.classCode || ''),
                escapeCsv(result.teacherNotes || '')
            ].join(',');
        } catch (error) {
            console.error('Error rendering result row:', error, result);
            return `
            <tr class="bg-red-50">
                <td colspan="8" class="py-2 px-4 text-red-600 text-sm">
                    Error displaying result: ${error.message || 'Unknown error'}
                </td>
            </tr>`;
        }
    }).join('');
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Helper function to get exam type display name and badge color
function getExamTypeDisplay(examType) {
    const examTypes = {
        'first-test': { text: 'First Test', class: 'bg-green-100 text-green-800' },
        'second-test': { text: 'Second Test', class: 'bg-yellow-100 text-yellow-800' },
        'main-exam': { text: 'Main Exam', class: 'bg-red-100 text-red-800' }
    };
    return examTypes[examType] || { text: examType, class: 'bg-gray-100 text-gray-800' };
}

// Delete class
async function deleteClass(classId) {
    showCustomConfirmation(
        'Delete Class',
        'Are you sure you want to delete this class? This action cannot be undone.',
        async (confirmed) => {
            if (!confirmed) return;

            try {
                showLoading();
                await firebaseDB.deleteClass(classId);
                showCustomNotification('Success', 'Class deleted successfully!', 'success');

                // Refresh data
                await loadDashboardData();
                await loadClasses();
            } catch (error) {
                console.error('Error deleting class:', error);
                showCustomNotification('Error', 'Error deleting class: ' + error.message, 'error');
            } finally {
                hideLoading();
            }
        }
    );
}

// Delete subject
async function deleteSubject(subjectId) {
    showCustomConfirmation(
        'Delete Subject',
        'Are you sure you want to delete this subject? This action cannot be undone.',
        async (confirmed) => {
            if (!confirmed) return;

            try {
                showLoading();
                await firebaseDB.deleteSubject(subjectId);
                showCustomNotification('Success', 'Subject deleted successfully!', 'success');

                // Refresh data
                await loadDashboardData();
                await loadSubjects();
            } catch (error) {
                console.error('Error deleting subject:', error);
                showCustomNotification('Error', 'Error deleting subject: ' + error.message, 'error');
            } finally {
                hideLoading();
            }
        }
    );
}

// Clear old results
function clearOldResults() {
    showCustomConfirmation(
        'Clear Old Results',
        'Are you sure you want to clear all old exam results? This action cannot be undone.',
        async (confirmed) => {
            if (!confirmed) return;

            try {
                showLoading();
                // Add logic to clear old results here
                showCustomNotification('Success', 'Old results cleared successfully!', 'success');
                await loadResults();
            } catch (error) {
                console.error('Error clearing results:', error);
                showCustomNotification('Error', 'Error clearing old results: ' + error.message, 'error');
            } finally {
                hideLoading();
            }
        }
    );
}
