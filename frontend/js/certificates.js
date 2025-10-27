async function loadMyCertificates() {
    try {
        const response = await apiCall('/certificates/my-certificates');
        const certificates = response.certificates || [];
        
        displayCertificates(certificates);
    } catch (error) {
        console.error('Certificates load error:', error);
    }
}

function displayCertificates(certificates) {
    const certificatesHTML = `
        <div class="certificates-container">
            <h2>My Certificates</h2>
            
            ${certificates.length === 0 ? `
                <div class="empty-state">
                    <p>🎓 No certificates yet. Complete a course to earn your first certificate!</p>
                </div>
            ` : `
                <div class="certificates-grid">
                    ${certificates.map(cert => `
                        <div class="certificate-card">
                            <div class="certificate-preview">
                                <div class="certificate-badge">🎓</div>
                                <h3>${cert.title}</h3>
                                <p class="certificate-category">${cert.category}</p>
                                <p class="certificate-instructor">Instructor: ${cert.instructor_first_name} ${cert.instructor_last_name}</p>
                                <p class="certificate-date">Issued: ${new Date(cert.issue_date).toLocaleDateString()}</p>
                            </div>
                            <div class="certificate-actions">
                                <button onclick="viewCertificate('${cert.certificate_number}')" class="btn-primary">View Certificate</button>
                                <button onclick="downloadCertificate('${cert.certificate_number}')" class="btn-secondary">Download PDF</button>
                                <button onclick="shareCertificate('${cert.certificate_number}')" class="btn-secondary">Share</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
    
    document.getElementById('certificates-section').innerHTML = certificatesHTML;
}

function viewCertificate(certificateNumber) {
    const certificateHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="certificate-modal" onclick="event.stopPropagation()">
                <div class="certificate-view">
                    <div class="certificate-border">
                        <div class="certificate-content">
                            <div class="certificate-header">
                                <h1>Certificate of Completion</h1>
                                <div class="certificate-logo">LearnFlow</div>
                            </div>
                            
                            <div class="certificate-body">
                                <p class="certificate-text">This is to certify that</p>
                                <h2 class="certificate-name" id="certStudentName">Loading...</h2>
                                <p class="certificate-text">has successfully completed the course</p>
                                <h3 class="certificate-course" id="certCourseName">Loading...</h3>
                                <p class="certificate-text">on</p>
                                <p class="certificate-date" id="certIssueDate">Loading...</p>
                            </div>
                            
                            <div class="certificate-footer">
                                <div class="certificate-signature">
                                    <div class="signature-line"></div>
                                    <p id="certInstructorName">Instructor Name</p>
                                </div>
                                <div class="certificate-number">
                                    <p>Certificate No: ${certificateNumber}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <button onclick="closeModal()" class="modal-close">×</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', certificateHTML);
    
    // Fetch certificate details
    fetch(`${API_BASE}/certificates/verify/${certificateNumber}`)
        .then(res => res.json())
        .then(data => {
            const cert = data.certificate;
            document.getElementById('certStudentName').textContent = `${cert.student_first_name} ${cert.student_last_name}`;
            document.getElementById('certCourseName').textContent = cert.course_title;
            document.getElementById('certIssueDate').textContent = new Date(cert.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            document.getElementById('certInstructorName').textContent = `${cert.instructor_first_name} ${cert.instructor_last_name}`;
        });
}

function downloadCertificate(certificateNumber) {
    // In production, you'd generate a PDF here
    showNotification('PDF download will be available soon!', 'info');
}

function shareCertificate(certificateNumber) {
    const shareURL = `${window.location.origin}/verify-certificate?cert=${certificateNumber}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'My LearnFlow Certificate',
            text: 'Check out my certificate from LearnFlow!',
            url: shareURL
        });
    } else {
        navigator.clipboard.writeText(shareURL);
        showNotification('Certificate link copied to clipboard!', 'success');
    }
}
