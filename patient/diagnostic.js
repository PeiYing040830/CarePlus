// Default conditions mapping
const defaultConditions = {
    'Fever': 'Common Cold, Flu, Infection',
    'Cough': 'Common Cold, Bronchitis, Pneumonia, Asthma',
    'Headache': 'Migraine, Tension Headache, Dehydration',
    'Sore Throat': 'Strep Throat, Tonsillitis, Common Cold',
    'Fatigue': 'Anemia, Hypothyroidism, Sleep Disorder',
    'Nausea': 'Food Poisoning, Gastroenteritis, Pregnancy',
    'Dizziness': 'Vertigo, Low Blood Pressure, Dehydration',
    'Body Ache': 'Flu, Muscle Strain, Viral Infection',
    'Runny Nose': 'Allergies, Common Cold, Sinus Infection',
    'Shortness of Breath': 'Asthma, Bronchitis, Pneumonia',
    'Chest Pain': 'Angina, Heart Attack, Acid Reflux',
    'Stomach Pain': 'Gastritis, Food Poisoning, Ulcer',
    'Loss of Appetite': 'Infection, Depression, Digestive Disorder',
    'Vomiting': 'Gastroenteritis, Food Poisoning, Migraine',
    'Diarrhea': 'Gastroenteritis, Food Poisoning, IBS',
    'Rash': 'Allergic Reaction, Chickenpox, Measles'
};

// Category recommendations based on symptom
const categoryRecommendations = {
    'Fever': 'General',
    'Cough': 'Respiratory',
    'Headache': 'Neurological',
    'Sore Throat': 'Respiratory',
    'Fatigue': 'General',
    'Nausea': 'Gastrointestinal',
    'Dizziness': 'Neurological',
    'Body Ache': 'Musculoskeletal',
    'Runny Nose': 'Respiratory',
    'Shortness of Breath': 'Respiratory',
    'Chest Pain': 'Cardiovascular',
    'Stomach Pain': 'Gastrointestinal',
    'Loss of Appetite': 'General',
    'Vomiting': 'Gastrointestinal',
    'Diarrhea': 'Gastrointestinal',
    'Rash': 'Dermatological'
};

document.addEventListener('DOMContentLoaded', function() {
    initializeDiagnosticManagement();
    initializeAutoFill();
});

function initializeDiagnosticManagement() {
    // Add scope form
    const addForm = document.getElementById('addScopeForm');
    if (addForm) {
        addForm.addEventListener('submit', handleAddScope);
    }

    // Edit scope form
    const editForm = document.getElementById('editScopeForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditScope);
    }

    // Close modal on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeEditModal();
        }
    });
}

// Initialize auto-fill functionality
function initializeAutoFill() {
    // Add form auto-fill
    const addSymptomInput = document.querySelector('#addScopeForm input[name="symptom_name"]');
    const addConditionsField = document.querySelector('#addScopeForm textarea[name="possible_conditions"]');
    const addCategoryField = document.querySelector('#addScopeForm select[name="category"]');

    if (addSymptomInput && addConditionsField) {
        // Auto-fill on blur (when user leaves the field)
        addSymptomInput.addEventListener('blur', function() {
            autoFillConditions(this.value.trim(), addConditionsField, addCategoryField);
        });

        // Also provide real-time suggestions as user types
        addSymptomInput.addEventListener('input', function() {
            showSuggestions(this.value.trim(), this);
        });
    }

    // Edit form auto-fill
    const editSymptomInput = document.querySelector('#editScopeForm input[name="symptom_name"]');
    const editConditionsField = document.querySelector('#editScopeForm textarea[name="possible_conditions"]');
    const editCategoryField = document.querySelector('#editScopeForm select[name="category"]');

    if (editSymptomInput && editConditionsField) {
        editSymptomInput.addEventListener('blur', function() {
            // Only auto-fill if the conditions field is empty
            if (!editConditionsField.value.trim()) {
                autoFillConditions(this.value.trim(), editConditionsField, editCategoryField);
            }
        });

        editSymptomInput.addEventListener('input', function() {
            showSuggestions(this.value.trim(), this);
        });
    }
}

// Auto-fill conditions based on symptom name
function autoFillConditions(symptomName, conditionsField, categoryField) {
    if (!symptomName) return;

    // Case-insensitive matching
    const matchedKey = Object.keys(defaultConditions).find(
        key => key.toLowerCase() === symptomName.toLowerCase()
    );

    if (matchedKey) {
        const conditions = defaultConditions[matchedKey];

        // Only auto-fill if field is empty
        if (!conditionsField.value.trim()) {
            conditionsField.value = conditions;

            // Add visual feedback
            conditionsField.style.backgroundColor = '#e8f5e9';
            setTimeout(() => {
                conditionsField.style.backgroundColor = '';
            }, 1000);

            // Show success message
            showInlineMessage(conditionsField, '✓ Auto-filled common conditions', 'success');
        }

        // Auto-fill category if available and field is empty/default
        if (categoryField && categoryRecommendations[matchedKey]) {
            if (!categoryField.value || categoryField.value === '') {
                categoryField.value = categoryRecommendations[matchedKey];

                categoryField.style.backgroundColor = '#e8f5e9';
                setTimeout(() => {
                    categoryField.style.backgroundColor = '';
                }, 1000);
            }
        }
    }
}

// Show inline suggestions while typing
function showSuggestions(input, inputElement) {
    // Remove existing suggestions
    const existingSuggestions = document.querySelector('.symptom-suggestions');
    if (existingSuggestions) {
        existingSuggestions.remove();
    }

    if (!input || input.length < 2) return;

    // Find matching symptoms
    const matches = Object.keys(defaultConditions).filter(
        symptom => symptom.toLowerCase().includes(input.toLowerCase())
    );

    if (matches.length === 0) return;

    // Create suggestions dropdown
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'symptom-suggestions';
    suggestionsDiv.style.cssText = `
        position: absolute;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
        margin-top: 2px;
    `;

    matches.forEach(symptom => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = symptom;
        item.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
            transition: background 0.2s;
        `;

        item.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f5f5f5';
        });

        item.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'white';
        });

        item.addEventListener('click', function() {
            inputElement.value = symptom;
            suggestionsDiv.remove();

            // Trigger blur to auto-fill
            inputElement.dispatchEvent(new Event('blur'));
        });

        suggestionsDiv.appendChild(item);
    });

    // Position and add to DOM
    const inputRect = inputElement.getBoundingClientRect();
    suggestionsDiv.style.left = inputRect.left + 'px';
    suggestionsDiv.style.top = (inputRect.bottom + window.scrollY) + 'px';
    suggestionsDiv.style.width = inputRect.width + 'px';

    document.body.appendChild(suggestionsDiv);

    // Close suggestions when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeSuggestions(e) {
            if (!suggestionsDiv.contains(e.target) && e.target !== inputElement) {
                suggestionsDiv.remove();
                document.removeEventListener('click', closeSuggestions);
            }
        });
    }, 100);
}

// Show inline message near field
function showInlineMessage(element, message, type) {
    const existingMessage = element.parentElement.querySelector('.inline-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `inline-message inline-message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        font-size: 0.85rem;
        margin-top: 4px;
        padding: 4px 8px;
        border-radius: 4px;
        animation: fadeIn 0.3s ease;
        color: ${type === 'success' ? '#2e7d32' : '#1976d2'};
        background: ${type === 'success' ? '#e8f5e9' : '#e3f2fd'};
    `;

    element.parentElement.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// Handle add scope form submission
async function handleAddScope(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    formData.append('action', 'add_symptom_scope');

    // Disable submit button
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Adding...';

    try {
        const response = await fetch('diagnostic.html', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        if (data.success) {
            showAlert('✓ Symptom scope added successfully!', 'success');
            e.target.reset();

            // Reload page after 1 second to show new scope
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showAlert('✖ ' + (data.message || 'Error adding symptom scope'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('✖ Network error. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
    }
}

// Handle edit scope form submission
async function handleEditScope(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    formData.append('action', 'update_symptom_scope');

    // Disable submit button
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Updating...';

    try {
        const response = await fetch('diagnostic.html', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        if (data.success) {
            showAlert('✓ Symptom scope updated successfully!', 'success');
            closeEditModal();

            // Reload page after 1 second to show updated scope
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showAlert('✖ ' + (data.message || 'Error updating symptom scope'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('✖ Network error. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
    }
}

// Edit scope - load data into modal
async function editScope(scopeId) {
    const modal = document.getElementById('editModal');
    modal.classList.add('show');

    // Show loading state
    const modalBody = modal.querySelector('.modal-body');
    const originalContent = modalBody.innerHTML;
    modalBody.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div><p>Loading scope data...</p></div>';

    try {
        const formData = new FormData();
        formData.append('action', 'get_symptom_scope');
        formData.append('scope_id', scopeId);

        const response = await fetch('diagnostic.html', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        // Restore original content
        modalBody.innerHTML = originalContent;

        if (data.success) {
            const scope = data.scope;

            // Populate form fields
            document.getElementById('edit_scope_id').value = scope.scope_id;
            document.getElementById('edit_symptom_name').value = scope.symptom_name;
            document.getElementById('edit_category').value = scope.category;
            document.getElementById('edit_possible_conditions').value = scope.possible_conditions || '';
            document.getElementById('edit_urgency_level').value = scope.urgency_level;
            document.getElementById('edit_warning_keywords').value = scope.warning_keywords || '';
            document.getElementById('edit_guidance').value = scope.guidance || '';
            document.getElementById('edit_recommended_specialization').value = scope.recommended_specialization || '';
            document.getElementById('edit_is_active').checked = scope.is_active == 1;

            // Re-initialize auto-fill for edit form
            initializeAutoFill();
        } else {
            showAlert('✖ ' + (data.message || 'Error loading symptom scope'), 'error');
            closeEditModal();
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('✖ Network error. Please try again.', 'error');
        closeEditModal();
    }
}

// Delete scope with confirmation
async function deleteScope(scopeId) {
    // Show confirmation dialog
    if (!confirm('⚠️ Are you sure you want to delete this symptom scope?\n\nThis action cannot be undone and will affect how the system responds to symptoms.')) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'delete_symptom_scope');
        formData.append('scope_id', scopeId);

        const response = await fetch('diagnostic.html', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        if (data.success) {
            showAlert('✓ Symptom scope deleted successfully!', 'success');

            // Reload page after 1 second
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showAlert('✖ ' + (data.message || 'Error deleting symptom scope'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('✖ Network error. Please try again.', 'error');
    }
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.classList.remove('show');

    // Reset form
    const form = document.getElementById('editScopeForm');
    if (form) {
        form.reset();
    }
}

// Show alert message
function showAlert(message, type) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());

    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    // Add animation class
    alert.style.animation = 'slideDown 0.3s ease';

    // Insert at top of first card body
    const firstCardBody = document.querySelector('.card-body');
    if (firstCardBody) {
        firstCardBody.insertBefore(alert, firstCardBody.firstChild);

        // Scroll to alert
        alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
        alert.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

// Add spinner and animation styles dynamically if not present
if (!document.getElementById('spinner-styles')) {
    const style = document.createElement('style');
    style.id = 'spinner-styles';
    style.textContent = `
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid var(--primary, #667eea);
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

        @keyframes slideUp {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(-10px);
            }
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-5px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Utility function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

// Export functions for global access
window.editScope = editScope;
window.deleteScope = deleteScope;
window.closeEditModal = closeEditModal;
