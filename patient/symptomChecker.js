document.addEventListener('DOMContentLoaded', function() {
    initializeSymptomChecker();
});

function initializeSymptomChecker() {
    // Character counter
    const symptomsTextarea = document.getElementById('symptoms');
    const charCount = document.getElementById('charCount');
    const charCounter = document.querySelector('.char-counter');

    if (symptomsTextarea && charCount) {
        symptomsTextarea.addEventListener('input', function() {
            const length = this.value.length;
            charCount.textContent = length;

            if (length > 900) {
                charCounter.classList.add('danger');
                charCounter.classList.remove('warning');
            } else if (length > 800) {
                charCounter.classList.add('warning');
                charCounter.classList.remove('danger');
            } else {
                charCounter.classList.remove('warning', 'danger');
            }
        });
    }

    // Common symptoms selection
    const symptomChips = document.querySelectorAll('.symptom-chip');
    symptomChips.forEach(chip => {
        chip.addEventListener('click', function() {
            this.classList.toggle('selected');
            updateSymptomsFromChips();
        });
    });

    // Form submission
    const form = document.getElementById('symptomForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
}

// Update symptoms textarea from selected chips
function updateSymptomsFromChips() {
    const selectedChips = document.querySelectorAll('.symptom-chip.selected');
    const symptomsTextarea = document.getElementById('symptoms');

    if (selectedChips.length > 0 && symptomsTextarea) {
        const symptoms = Array.from(selectedChips).map(chip => chip.dataset.symptom);
        const currentText = symptomsTextarea.value.trim();

        // Only update if textarea is empty or append symptoms
        if (!currentText) {
            symptomsTextarea.value = 'I am experiencing: ' + symptoms.join(', ') + '. ';
        } else {
            // Check if symptoms are already mentioned
            const symptomsToAdd = symptoms.filter(s => !currentText.toLowerCase().includes(s.toLowerCase()));
            if (symptomsToAdd.length > 0) {
                symptomsTextarea.value = currentText + ' ' + symptomsToAdd.join(', ');
            }
        }

        // Trigger input event to update character counter
        symptomsTextarea.dispatchEvent(new Event('input'));
    }
}

function updateHistoryListDynamically(data, originalSymptoms) {
    const historyList = document.getElementById('historyList');
    const emptyState = document.getElementById('emptyState');

    // Hide empty state if it's there
    if (emptyState) {
        emptyState.style.display = 'none';
    }

    // Show the historyList if it was hidden
    if (historyList) {
        historyList.style.display = 'flex';
        historyList.style.flexDirection = 'column';
    } else {
        location.reload();
        return;
    }

    // Increment Stats Counters
    const statId = `count-${data.urgency}`;
    const statElement = document.getElementById(statId);
    if (statElement) {
        statElement.textContent = parseInt(statElement.textContent) + 1;
    }

    // Create the New History Item HTML
    const newItem = document.createElement('div');
    newItem.className = 'recent-check-item';
    newItem.style.animation = 'fadeIn 0.5s ease-out';

    // Truncate symptoms for display
    const displaySymptoms = originalSymptoms.length > 120 ?
                            originalSymptoms.substring(0, 120) + '...' :
                            originalSymptoms;

    // FIX APPLIED HERE: Changed data.check_id to data.symptom_check_id
    newItem.innerHTML = `
        <div class="check-header">
            <div class="check-date">
                📅 Just Now
            </div>
            <span class="urgency-badge urgency-${data.urgency}">
                ${data.urgency.toUpperCase()}
            </span>
        </div>
        ${data.matched_symptom_names ? `
            <div style="margin-bottom: 0.8rem;">
                <small style="color: #666; font-weight: 600;">🔍 Detected: </small>
                <small style="color: #26a69a; font-weight: 500;">
                    ${escapeHtml(data.matched_symptom_names)}
                </small>
            </div>
        ` : ''}
        <div class="check-symptoms">
            ${escapeHtml(displaySymptoms)}
        </div>
        <button class="btn btn-outline btn-sm" onclick="viewCheck(${data.symptom_check_id})">
            👁️ View Details
        </button>
    `;

    // Prepend to the top of the list
    historyList.insertBefore(newItem, historyList.firstChild);
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();

    const symptoms = document.getElementById('symptoms').value.trim();
    const duration = document.getElementById('duration').value.trim();
    const age = document.getElementById('age').value;
    const additional = document.getElementById('additional').value.trim();

    if (!symptoms) {
        showAlert('Please describe your symptoms', 'error');
        return;
    }

    if (!duration) {
        showAlert('Please specify how long you have had these symptoms', 'error');
        return;
    }

    // Disable submit button and show processing
    const submitBtn = document.getElementById('submitBtn');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳</span> Processing...';

    try {
        const formData = new FormData();
        formData.append('action', 'check_symptoms');
        formData.append('symptoms', symptoms);
        formData.append('duration', duration);
        formData.append('age', age);
        formData.append('additional_info', additional);

        const response = await fetch(window.location.pathname, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response.');
        }

        const data = await response.json();

        if (data.success) {
            displayResults(data);
            updateHistoryListDynamically(data, symptoms);

            const resultsContainer = document.getElementById('resultsContainer');
            if (resultsContainer) {
                resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            showAlert('✓ Screening saved. This is a prototype rule-based result.', 'success');
        } else {
            showAlert(data.message || 'Error processing your request', 'error');
        }
    } catch (error) {
        console.error('Error details:', error);
        showAlert(error.message || 'Unable to save symptoms. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
    }
}

// View detailed check
async function viewCheck(symptom_check_id) {
    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalBody');

    if (!modal || !modalBody) return;

    modalBody.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="spinner"></div><p>Loading details...</p></div>';
    modal.classList.add('show');

    try {
        const formData = new FormData();
        formData.append('action', 'view_check');
        formData.append('check_id', symptom_check_id);

        const response = await fetch(window.location.pathname, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        if (data.success) {
            const check = data.check;

            let urgencyClass = 'urgency-routine';
            let urgencyText = 'Routine Care';
            if (check.urgency_level === 'unassessed') urgencyText = 'Not assessed';
            let urgencyIcon = '✅';

            if (check.urgency_level === 'urgent') {
                urgencyClass = 'urgency-urgent';
                urgencyText = 'Urgent Care';
                urgencyIcon = '⚠️';
            } else if (check.urgency_level === 'emergency') {
                urgencyClass = 'urgency-emergency';
                urgencyText = 'Emergency';
                urgencyIcon = '🚨';
            }

            modalBody.innerHTML = `
                <div style="margin-bottom: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 1rem;">
                        <span class="urgency-indicator ${urgencyClass}">
                            ${urgencyIcon} ${urgencyText}
                        </span>
                        <span style="color: #6b7280; font-size: 0.95rem;">
                            📅 ${formatDateTime(check.created_at)}
                        </span>
                    </div>

                    <div class="detail-info-box">
                        <strong>🩺 Symptoms Described:</strong>
                        <p>${escapeHtml(check.symptoms)}</p>
                    </div>

                    ${check.duration ? `
                        <div class="detail-info-box">
                            <strong>⏱️ Duration:</strong>
                            <p>${escapeHtml(check.duration)}</p>
                        </div>
                    ` : ''}

                    ${check.age ? `
                        <div class="detail-info-box">
                            <strong>👤 Age:</strong>
                            <p>${check.age} years old</p>
                        </div>
                    ` : ''}

                    ${check.additional_info ? `
                        <div class="detail-info-box">
                            <strong>📋 Additional Information:</strong>
                            <p>${escapeHtml(check.additional_info)}</p>
                        </div>
                    ` : ''}
                </div>

                <div style="border-top: 2px solid #e5e7eb; padding-top: 25px;">
                    <h3 style="color: #1f2937; margin-bottom: 20px; font-size: 1.3rem;">
                        💊 Rule-based Screening
                    </h3>
                    <div class="ai-response">
                        ${formatMarkdown(check.response)}
                    </div>
                </div>

                <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="window.location.href='appointment.html'" style="flex: 1; min-width: 200px;">
                        📅 Book an Appointment
                    </button>
                </div>
            `;
        } else {
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <p style="font-size: 3rem; margin-bottom: 15px;">⚠️</p>
                    <p style="font-size: 1.2rem; font-weight: 600;">${escapeHtml(data.message || 'Error loading details')}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <p style="font-size: 3rem; margin-bottom: 15px;">❌</p>
                <p style="font-size: 1.2rem; font-weight: 600;">Network error. Please try again.</p>
            </div>
        `;
    }
}

// Display results
function displayResults(data) {
    const resultsContainer = document.getElementById('resultsContainer');

    if (!resultsContainer) return;

    // Determine urgency styling
    let urgencyClass = 'urgency-routine';
    let urgencyText = '✅ Routine Care';
    let urgencyIcon = 'ℹ️';
    let urgencyMessage = 'Routine rule matched. This does not rule out serious illness.';

    if (data.urgency === 'urgent') {
        urgencyClass = 'urgency-urgent';
        urgencyText = '⚠️ Urgent - Seek Medical Attention Soon';
        urgencyIcon = '⚠️';
        urgencyMessage = 'Contact a healthcare professional promptly for assessment.';
    } else if (data.urgency === 'emergency') {
        urgencyClass = 'urgency-emergency';
        urgencyText = '🚨 Emergency - Seek Immediate Medical Attention';
        urgencyIcon = '🚨';
        urgencyMessage = 'Call emergency services (999) or go to the nearest emergency room immediately!';
    }

    if (data.urgency === 'unassessed') { urgencyText = 'Not assessed'; urgencyMessage = 'No matching rule was found. A healthcare professional should assess these symptoms.'; }
    // Show detected scopes count
    let scopesInfo = '';
    if (data.detected_scopes && data.detected_scopes > 0) {
        scopesInfo = `<div style="background: rgba(38, 166, 154, 0.1); padding: 0.8rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.95rem;">
            <strong>🔍 Matched ${data.detected_scopes} symptom scope${data.detected_scopes > 1 ? 's' : ''} from our database</strong>
        </div>`;
    }

    // Create results HTML
    const resultsHTML = `
        <div class="results-card">
            <div class="results-header">
                <h3 class="results-title">
                    <span>💊</span> Rule-based Screening Results
                </h3>
                <div class="urgency-indicator ${urgencyClass}">
                    ${urgencyIcon} ${urgencyText}
                </div>
            </div>

            ${scopesInfo}

            <div class="urgency-message ${urgencyClass}">
                <strong>${urgencyMessage}</strong>
            </div>

            <div class="ai-response">
                ${formatMarkdown(data.response)}
            </div>

            <div class="results-disclaimer">
                <strong>⚠️ Important Reminder:</strong> This symptom checker is for informational purposes only and is not a medical diagnosis. It does not replace professional medical advice. If symptoms are serious or concerning, seek medical care immediately.
            </div>

            <div class="results-actions">
                <button class="btn btn-primary" onclick="window.location.href='appointment.html'">
                    <span>📅</span> Book Appointment
                </button>
                <button class="btn btn-outline" onclick="resetForm()">
                    <span>🔄</span> New Check
                </button>
            </div>
        </div>
    `;

    resultsContainer.innerHTML = resultsHTML;
    resultsContainer.classList.add('show');
}

// Format markdown-style text to HTML
function formatMarkdown(text) {
    let html = text;

    // Convert **bold** to <strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert ### headers
    html = html.replace(/^###\s+(.+)$/gm, function(match, title) {
        return `<h4 style="margin-top: 1.5rem; margin-bottom: 0.8rem; font-size: 1.1rem; color: #0d9488; font-weight: 700;">${title}</h4>`;
    });

    // Convert ## headers
    html = html.replace(/^##\s+(.+)$/gm, function(match, title) {
        return `<h3 style="margin-top: 2rem; margin-bottom: 1rem; font-size: 1.3rem; color: #1f2937; padding-top: 1.5rem; border-top: 2px solid #e5e7eb; font-weight: 600;">${title}</h3>`;
    });

    // Convert # headers
    html = html.replace(/^#\s+(.+)$/gm, '<h2 style="display:none;">$1</h2>');

    // Convert bullet points
    html = html.replace(/^\*\s+(.+)$/gm, '<li>$1</li>');

    // Wrap consecutive list items
    html = html.replace(/(<li>.*?<\/li>\s*)+/gs, function(match) {
        return '<ul style="margin: 1rem 0; padding-left: 1.5rem; line-height: 1.8;">' + match + '</ul>';
    });

    // Convert line breaks to paragraphs
    const lines = html.split('\n');
    let result = [];
    let inParagraph = false;
    let paragraphContent = '';

    for (let line of lines) {
        line = line.trim();

        if (!line) {
            if (inParagraph && paragraphContent) {
                result.push(`<p style="margin: 0.8rem 0; line-height: 1.6;">${paragraphContent}</p>`);
                paragraphContent = '';
                inParagraph = false;
            }
            continue;
        }

        if (line.startsWith('<h') || line.startsWith('<ul') || line.startsWith('<ol') || line.startsWith('<li')) {
            if (inParagraph && paragraphContent) {
                result.push(`<p style="margin: 0.8rem 0; line-height: 1.6;">${paragraphContent}</p>`);
                paragraphContent = '';
                inParagraph = false;
            }
            result.push(line);
        } else {
            if (inParagraph) {
                paragraphContent += ' ' + line;
            } else {
                paragraphContent = line;
                inParagraph = true;
            }
        }
    }

    if (inParagraph && paragraphContent) {
        result.push(`<p style="margin: 0.8rem 0; line-height: 1.6;">${paragraphContent}</p>`);
    }

    html = result.join('\n');
    return html;
}

// Close modal
function closeModal() {
    const modal = document.getElementById('detailModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Close modal on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Reset form
function resetForm() {
    const form = document.getElementById('symptomForm');
    if (form) {
        form.reset();
    }

    // Clear selected chips
    document.querySelectorAll('.symptom-chip.selected').forEach(chip => {
        chip.classList.remove('selected');
    });

    // Hide results
    const resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer) {
        resultsContainer.classList.remove('show');
        resultsContainer.innerHTML = '';
    }

    // Update character counter
    const charCount = document.getElementById('charCount');
    if (charCount) {
        charCount.textContent = '0';
    }

    const charCounter = document.querySelector('.char-counter');
    if (charCounter) {
        charCounter.classList.remove('warning', 'danger');
    }

    // Focus on symptoms textarea
    const symptomsTextarea = document.getElementById('symptoms');
    if (symptomsTextarea) {
        symptomsTextarea.focus();
    }

    // Scroll to top of form
    const symptomForm = document.getElementById('symptomForm');
    if (symptomForm) {
        symptomForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.temp-alert');
    existingAlerts.forEach(alert => alert.remove());

    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} temp-alert`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10001;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;

    if (type === 'success') {
        alert.style.background = '#d4edda';
        alert.style.color = '#155724';
        alert.style.borderLeft = '4px solid #28a745';
    } else if (type === 'error') {
        alert.style.background = '#f8d7da';
        alert.style.color = '#721c24';
        alert.style.borderLeft = '4px solid #dc3545';
    }

    alert.textContent = message;
    document.body.appendChild(alert);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        alert.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

// Format date and time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add animation styles if not present
if (!document.getElementById('symptom-checker-animations')) {
    const style = document.createElement('style');
    style.id = 'symptom-checker-animations';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }

        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Export functions for global access
window.viewCheck = viewCheck;
window.closeModal = closeModal;
window.resetForm = resetForm;
