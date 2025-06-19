// Main JavaScript file for LifeDrop website

// Global variables
let currentUser = null;
let currentTestimonialIndex = 0;
let currentAdminTab = 'donors';
let adminData = [];
let authToken = localStorage.getItem('authToken');

// API Base URL
const API_BASE_URL = window.location.origin + '/api';

// Initialize the website when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeWebsite();
});

// Initialize all website functionality
function initializeWebsite() {
    setupNavigation();
    setupAuth();
    setupContactForm();
    setupLoginModal();
    setupAdminPanel();
    generateBloodTypes();
    generateDonationCenters();
    generateTestimonials();
    setupTestimonialSlider();
    setupWhyDonateInteractions();
    setupStatsCounter();
    setupImpactCalculator();
    setCurrentYear();
    
    // Check if user is already logged in
    if (authToken) {
        currentUser = { token: authToken };
        updateAuthUI();
    }
}

// Navigation functionality
function setupNavigation() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // Handle admin login link
            if (href === '#' && this.id === 'auth-link') {
                e.preventDefault();
                if (currentUser) {
                    showAdminPanel();
                } else {
                    showLoginModal();
                }
                return;
            }

            // Handle section links
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // Update navigation based on scroll position
    window.addEventListener('scroll', updateActiveNavLink);
}

// Update active navigation link based on scroll position
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    let currentSection = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.offsetHeight;

        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
            currentSection = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + currentSection) {
            link.classList.add('active');
        }
    });
}

// Authentication setup
function setupAuth() {
    // Update UI based on current auth state
    updateAuthUI();
}

// Update UI based on authentication state
function updateAuthUI() {
    const authLink = document.getElementById('auth-link');

    if (currentUser && authToken) {
        authLink.textContent = 'Admin Panel';
        authLink.onclick = showAdminPanel;
    } else {
        authLink.textContent = 'Admin Login';
        authLink.onclick = showLoginModal;
    }
}

// Contact form functionality
function setupContactForm() {
    const form = document.getElementById('contact-form');
    const userTypeSelect = document.getElementById('userType');
    const receiverFields = document.getElementById('receiver-fields');
    const urgencyField = document.getElementById('urgency');
    const hospitalField = document.getElementById('hospital');

    // Show/hide receiver-specific fields
    userTypeSelect.addEventListener('change', function () {
        if (this.value === 'receiver') {
            receiverFields.style.display = 'block';
            urgencyField.required = true;
            hospitalField.required = true;
        } else {
            receiverFields.style.display = 'none';
            urgencyField.required = false;
            hospitalField.required = false;
        }
    });

    // Handle form submission
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        await submitContactForm();
    });
}

// Submit contact form to backend
async function submitContactForm() {
    const form = document.getElementById('contact-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const submitText = document.getElementById('submit-text');
    const messagesDiv = document.getElementById('form-messages');

    // Show loading state
    submitText.textContent = 'Submitting...';
    submitBtn.disabled = true;

    try {
        // Get form data
        const formData = new FormData(form);
        const data = {};

        formData.forEach((value, key) => {
            data[key] = value;
        });

        // Determine endpoint based on user type
        const endpoint = data.userType === 'donor' ? '/donors' : '/receivers';

        // Submit to backend
        const response = await fetch(API_BASE_URL + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            // Show success message
            showMessage('✅ Submission successful!', 'success');

            // Show certificate button for donors
            if (data.userType === 'donor') {
                const certBtn = document.createElement('button');
                certBtn.textContent = 'View Certificate';
                certBtn.className = 'btn btn-success';
                certBtn.style.marginTop = '1rem';
                certBtn.onclick = () => openCertificate(data.name, data.bloodType, data.preferredDate);
                messagesDiv.appendChild(certBtn);
            }

            // Reset form
            form.reset();
            document.getElementById('receiver-fields').style.display = 'none';
        } else {
            throw new Error(result.error || 'Submission failed');
        }

    } catch (error) {
        console.error('Error submitting form:', error);
        showMessage('❌ ' + error.message, 'error');
    } finally {
        // Reset button state
        submitText.textContent = 'Submit';
        submitBtn.disabled = false;
    }
}

// Show message to user
function showMessage(message, type) {
    const messagesDiv = document.getElementById('form-messages');
    messagesDiv.innerHTML = `<div class="${type}-message">${message}</div>`;

    // Clear message after 5 seconds
    setTimeout(() => {
        messagesDiv.innerHTML = '';
    }, 5000);
}

// Login modal functionality
function setupLoginModal() {
    const modal = document.getElementById('login-modal');
    const closeBtn = modal.querySelector('.close-modal');
    const form = document.getElementById('login-form');

    // Close modal when clicking X or outside
    closeBtn.addEventListener('click', hideLoginModal);
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            hideLoginModal();
        }
    });

    // Handle login form submission
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        await handleLogin();
    });
}

// Show login modal
function showLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
}

// Hide login modal
function hideLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('login-messages').innerHTML = '';
}

// Handle admin login
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const messagesDiv = document.getElementById('login-messages');

    try {
        const response = await fetch(API_BASE_URL + '/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok) {
            // Store auth token
            authToken = result.token;
            localStorage.setItem('authToken', authToken);
            currentUser = result.user;
            
            hideLoginModal();
            updateAuthUI();
            showAdminPanel();
        } else {
            throw new Error(result.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        messagesDiv.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

// Admin panel functionality
function setupAdminPanel() {
    const donorsTab = document.getElementById('donors-tab');
    const receiversTab = document.getElementById('receivers-tab');
    const exportBtn = document.getElementById('export-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Tab switching
    donorsTab.addEventListener('click', () => switchAdminTab('donors'));
    receiversTab.addEventListener('click', () => switchAdminTab('receivers'));

    // Export functionality
    exportBtn.addEventListener('click', exportToCSV);

    // Logout functionality
    logoutBtn.addEventListener('click', handleLogout);
}

// Show admin panel
function showAdminPanel() {
    if (!currentUser || !authToken) {
        showLoginModal();
        return;
    }

    document.getElementById('main-content').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    loadAdminData();
}

// Hide admin panel
function hideAdminPanel() {
    document.getElementById('main-content').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'none';
}

// Switch admin tab
function switchAdminTab(tab) {
    currentAdminTab = tab;

    // Update tab buttons
    document.getElementById('donors-tab').classList.toggle('active', tab === 'donors');
    document.getElementById('receivers-tab').classList.toggle('active', tab === 'receivers');

    // Load data for selected tab
    loadAdminData();
}

// Load admin data from backend
async function loadAdminData() {
    const loadingDiv = document.getElementById('admin-loading');
    const dataDiv = document.getElementById('admin-data');

    loadingDiv.style.display = 'block';
    dataDiv.innerHTML = '';

    try {
        const response = await fetch(API_BASE_URL + '/' + currentAdminTab, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            adminData = await response.json();
            displayAdminData();
        } else {
            throw new Error('Failed to load data');
        }
    } catch (error) {
        console.error('Error loading admin data:', error);
        dataDiv.innerHTML = '<div class="error-message">Error loading data. Please try again.</div>';
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// Display admin data in table format
function displayAdminData() {
    const dataDiv = document.getElementById('admin-data');

    if (adminData.length === 0) {
        dataDiv.innerHTML = '<p>No data available</p>';
        return;
    }

    // Get all unique keys from the data
    const keys = [...new Set(adminData.flatMap(Object.keys))];
    const excludeKeys = ['_id', '__v', 'password'];
    const displayKeys = keys.filter(key => !excludeKeys.includes(key));

    // Create table
    let tableHTML = '<table class="admin-table"><thead><tr>';
    displayKeys.forEach(key => {
        tableHTML += `<th>${formatColumnName(key)}</th>`;
    });
    tableHTML += '<th>Actions</th></tr></thead><tbody>';

    // Add data rows
    adminData.forEach(item => {
        tableHTML += '<tr>';
        displayKeys.forEach(key => {
            let value = item[key] || '';

            // Format date values
            if (key.includes('Date') || key.includes('At')) {
                value = new Date(value).toLocaleString();
            }

            tableHTML += `<td>${String(value)}</td>`;
        });
        
        // Add action buttons
        tableHTML += `<td>
            <select onchange="updateStatus('${item._id}', this.value)" class="status-select">
                <option value="${item.status}" selected>${item.status}</option>
                ${currentAdminTab === 'donors' ? 
                    '<option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>' :
                    '<option value="pending">Pending</option><option value="matched">Matched</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option>'
                }
            </select>
        </td>`;
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table>';
    dataDiv.innerHTML = tableHTML;
}

// Update status function
async function updateStatus(id, status) {
    try {
        const response = await fetch(API_BASE_URL + '/' + currentAdminTab + '/' + id, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            // Reload data to reflect changes
            loadAdminData();
        } else {
            throw new Error('Failed to update status');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Failed to update status. Please try again.');
    }
}

// Format column names for display
function formatColumnName(name) {
    return name
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/Id$/, 'ID');
}

// Export data to CSV
function exportToCSV() {
    if (adminData.length === 0) {
        alert('No data to export');
        return;
    }

    // Convert data to CSV format
    const keys = Object.keys(adminData[0]);
    let csvContent = keys.join(',') + '\n';

    adminData.forEach(item => {
        const row = keys.map(key => {
            let value = item[key] || '';

            // Format date values
            if (key.includes('Date') || key.includes('At')) {
                value = new Date(value).toISOString();
            }

            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }

            return value;
        });
        csvContent += row.join(',') + '\n';
    });

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentAdminTab}_data.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Handle admin logout
async function handleLogout() {
    try {
        // Clear local storage
        localStorage.removeItem('authToken');
        authToken = null;
        currentUser = null;
        
        // Update UI
        updateAuthUI();
        hideAdminPanel();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Generate blood types section
function generateBloodTypes() {
    const container = document.getElementById('blood-types-grid');

    bloodTypes.forEach(bloodType => {
        const card = document.createElement('div');
        card.className = 'blood-type-card';

        card.innerHTML = `
            <div class="blood-type-title">${bloodType.type}</div>
            <p class="blood-type-description">${bloodType.description}</p>
            <div class="compatibility-section">
                <h4 class="compatibility-title">Can Donate To:</h4>
                <div class="compatibility-tags">
                    ${bloodType.canDonateTo.map(type =>
            `<span class="compatibility-tag donate-tag">${type}</span>`
        ).join('')}
                </div>
            </div>
            <div class="compatibility-section">
                <h4 class="compatibility-title">Can Receive From:</h4>
                <div class="compatibility-tags">
                    ${bloodType.canReceiveFrom.map(type =>
            `<span class="compatibility-tag receive-tag">${type}</span>`
        ).join('')}
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

// Generate donation centers section
function generateDonationCenters() {
    const container = document.getElementById('centers-grid');

    donationCenters.forEach(center => {
        const card = document.createElement('div');
        card.className = 'center-card';

        card.innerHTML = `
            <h3 class="center-name">${center.name}</h3>
            <p class="center-info">${center.address}</p>
            <p class="center-info">${center.phone}</p>
            <p class="center-info">${center.hours}</p>
        `;

        container.appendChild(card);
    });
}

// Generate testimonials section
function generateTestimonials() {
    const slider = document.getElementById('testimonials-slider');
    const dots = document.getElementById('testimonials-dots');

    testimonials.forEach((testimonial, index) => {
        // Create testimonial slide
        const slide = document.createElement('div');
        slide.className = `testimonial-slide ${index === 0 ? 'active' : ''}`;

        slide.innerHTML = `
            <div class="testimonial-card">
                <div class="testimonial-header">
                    <img src="${testimonial.image}" alt="${testimonial.name}" class="testimonial-image">
                    <div class="testimonial-info">
                        <h3 class="testimonial-name">${testimonial.name}</h3>
                        <p class="testimonial-donations">${testimonial.donatedTimes} time donor</p>
                    </div>
                </div>
                <blockquote class="testimonial-quote">"${testimonial.quote}"</blockquote>
            </div>
        `;

        slider.appendChild(slide);

        // Create dot for navigation
        const dot = document.createElement('button');
        dot.className = `dot ${index === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => goToTestimonial(index));
        dots.appendChild(dot);
    });
}

// Setup testimonial slider functionality
function setupTestimonialSlider() {
    // Auto-advance testimonials every 5 seconds
    setInterval(() => {
        currentTestimonialIndex = (currentTestimonialIndex + 1) % testimonials.length;
        showTestimonial(currentTestimonialIndex);
    }, 5000);
}

// Go to specific testimonial
function goToTestimonial(index) {
    currentTestimonialIndex = index;
    showTestimonial(index);
}

// Show specific testimonial
function showTestimonial(index) {
    const slides = document.querySelectorAll('.testimonial-slide');
    const dots = document.querySelectorAll('.dot');

    // Hide all slides and deactivate all dots
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    // Show current slide and activate current dot
    if (slides[index]) slides[index].classList.add('active');
    if (dots[index]) dots[index].classList.add('active');
}

// Setup Why Donate interactive features
function setupWhyDonateInteractions() {
    const reasonCards = document.querySelectorAll('.interactive-card');
    
    reasonCards.forEach(card => {
        const learnMoreBtn = card.querySelector('.learn-more-btn');
        
        learnMoreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const reason = card.getAttribute('data-reason');
            showDetailedInfo(reason);
        });
    });
}

// Show detailed information modal
function showDetailedInfo(reason) {
    const modal = document.getElementById('info-modal');
    const content = document.getElementById('info-modal-content');
    
    const detailedInfo = {
        'save-lives': {
            title: '🤝 Save Lives - The Ultimate Impact',
            content: `
                <h3>How One Donation Saves Three Lives</h3>
                <p>When you donate blood, it's separated into different components:</p>
                <ul>
                    <li><strong>Red Blood Cells:</strong> Help patients with anemia, blood loss from trauma or surgery</li>
                    <li><strong>Platelets:</strong> Essential for cancer patients and those with bleeding disorders</li>
                    <li><strong>Plasma:</strong> Used for burn victims, shock patients, and immune deficiencies</li>
                </ul>
                <div class="stat-highlight">
                    <h4>Real Impact Numbers:</h4>
                    <p>• Every 2 seconds, someone in the US needs blood<br>
                    • 1 donation can save up to 3 lives<br>
                    • 38,000 blood donations are needed daily<br>
                    • Only 3% of eligible people donate annually</p>
                </div>
                <p><strong>Your donation could be the difference between life and death for someone's loved one.</strong></p>
            `
        },
        'improve-health': {
            title: '💓 Improve Health - Benefits for You',
            content: `
                <h3>Health Benefits of Blood Donation</h3>
                <p>Donating blood isn't just good for recipients - it's good for you too!</p>
                <ul>
                    <li><strong>Cardiovascular Health:</strong> Regular donation may reduce risk of heart disease</li>
                    <li><strong>Iron Balance:</strong> Helps prevent iron overload, reducing oxidative stress</li>
                    <li><strong>Free Health Screening:</strong> Get checked for blood pressure, pulse, temperature, and hemoglobin</li>
                    <li><strong>Calorie Burn:</strong> Donating blood burns approximately 650 calories</li>
                </ul>
                <div class="stat-highlight">
                    <h4>Medical Benefits:</h4>
                    <p>• Stimulates production of new blood cells<br>
                    • May reduce risk of cancer<br>
                    • Helps maintain healthy liver function<br>
                    • Free mini-physical with every donation</p>
                </div>
                <p><strong>Feel good while doing good - it's a win-win for your health!</strong></p>
            `
        },
        'community-impact': {
            title: '👥 Community Impact - Strengthening Together',
            content: `
                <h3>Building a Stronger Community</h3>
                <p>Your donation creates ripple effects throughout the community:</p>
                <ul>
                    <li><strong>Emergency Preparedness:</strong> Ensures hospitals are ready for disasters and accidents</li>
                    <li><strong>Cancer Treatment:</strong> Many cancer patients need regular transfusions</li>
                    <li><strong>Surgical Support:</strong> Complex surgeries require blood products on standby</li>
                    <li><strong>Chronic Conditions:</strong> Patients with sickle cell disease need regular transfusions</li>
                </ul>
                <div class="stat-highlight">
                    <h4>Community Statistics:</h4>
                    <p>• 1 in 7 people entering a hospital needs blood<br>
                    • Blood cannot be manufactured - only donated<br>
                    • Donated blood has a shelf life of 42 days<br>
                    • Your community depends on volunteer donors</p>
                </div>
                <p><strong>Be the hero your community needs - every donation matters!</strong></p>
            `
        },
        'quick-easy': {
            title: '💧 Quick & Easy - Simple Process',
            content: `
                <h3>The Donation Process - Step by Step</h3>
                <p>Donating blood is simpler than you think:</p>
                <ol>
                    <li><strong>Registration (5 minutes):</strong> Check-in and provide ID</li>
                    <li><strong>Health Screening (10 minutes):</strong> Quick questionnaire and mini-physical</li>
                    <li><strong>Donation (8-10 minutes):</strong> The actual blood collection</li>
                    <li><strong>Refreshments (10 minutes):</strong> Relax and enjoy snacks</li>
                </ol>
                <div class="stat-highlight">
                    <h4>Time Investment:</h4>
                    <p>• Total time: 45-60 minutes<br>
                    • Actual donation: 8-10 minutes<br>
                    • Frequency: Every 56 days<br>
                    • Preparation: Eat well, stay hydrated</p>
                </div>
                <h4>What to Expect:</h4>
                <p>• Comfortable, sterile environment<br>
                • Trained medical professionals<br>
                • All equipment is sterile and single-use<br>
                • Minimal discomfort - like a quick pinch</p>
                <p><strong>Less than an hour of your time can save three lives!</strong></p>
            `
        }
    };
    
    const info = detailedInfo[reason];
    if (info) {
        content.innerHTML = `
            <h2>${info.title}</h2>
            ${info.content}
            <div style="margin-top: 2rem; text-align: center;">
                <button class="btn btn-primary" onclick="document.getElementById('info-modal').style.display='none'; document.querySelector('#contact').scrollIntoView({behavior: 'smooth'});">
                    Schedule Donation Now
                </button>
            </div>
        `;
        modal.style.display = 'flex';
    }
}

// Setup stats counter animation
function setupStatsCounter() {
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStats();
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const statsContainer = document.querySelector('.stats-container');
    if (statsContainer) {
        observer.observe(statsContainer);
    }
}

// Animate statistics counter
function animateStats() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    statNumbers.forEach(stat => {
        const target = parseInt(stat.getAttribute('data-target'));
        const duration = 2000; // 2 seconds
        const increment = target / (duration / 16); // 60fps
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            stat.textContent = Math.floor(current).toLocaleString();
        }, 16);
    });
}

// Setup impact calculator
function setupImpactCalculator() {
    const frequencySelect = document.getElementById('donation-frequency');
    const livesSavedSpan = document.getElementById('lives-saved');
    const pintsDonatedSpan = document.getElementById('pints-donated');
    
    if (frequencySelect) {
        frequencySelect.addEventListener('change', updateImpactCalculation);
        updateImpactCalculation(); // Initial calculation
    }
}

// Update impact calculation
function updateImpactCalculation() {
    const frequency = parseInt(document.getElementById('donation-frequency').value);
    const livesSaved = frequency * 3; // 3 lives per donation
    const pintsDonated = frequency;
    
    // Animate the numbers
    animateNumber('lives-saved', livesSaved);
    animateNumber('pints-donated', pintsDonated);
}

// Animate number change
function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    const currentValue = parseInt(element.textContent) || 0;
    const increment = (targetValue - currentValue) / 20;
    let current = currentValue;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
            current = targetValue;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
    }, 50);
}

// Setup modal close functionality
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-modal')) {
        e.target.closest('.modal').style.display = 'none';
    }
    
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Set current year in footer
function setCurrentYear() {
    document.getElementById('current-year').textContent = new Date().getFullYear();
}

// Open certificate in new window
function openCertificate(name, bloodType, date) {
    const certificateUrl = `certificate.html?name=${encodeURIComponent(name)}&bloodType=${encodeURIComponent(bloodType)}&date=${encodeURIComponent(date)}`;
    window.open(certificateUrl, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
}

// Legacy function for PDF generation (keeping for compatibility)
function generateCertificate(name, bloodType, date) {
    openCertificate(name, bloodType, date);
}

// Utility function to handle errors
function handleError(error, context) {
    console.error(`Error in ${context}:`, error);

    // Show user-friendly error message
    const message = error.message || 'An unexpected error occurred';
    alert(`Error: ${message}`);
}

// Make updateStatus function globally available
window.updateStatus = updateStatus;

// Initialize everything when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWebsite);
} else {
    initializeWebsite();
}