// Index page functionality

/**
 * Load and render all documents from the API
 */
async function loadDocuments() {
    try {
        const response = await fetch('/api/documents');
        const documents = await response.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        if (documents?.length === 0) {
            fileList.innerHTML = `
                <li class="text-center py-5 text-secondary">
                    <i class="bi bi-file-earmark-text fs-1 d-block mb-2 opacity-25"></i>
                    <span>Noch keine Übungen. Jetzt die erste erstellen!</span>
                </li>`;
            return;
        }

        documents.forEach(doc => {
            const li = document.createElement('li');
            li.className = 'file-item d-flex align-items-center justify-content-between p-2 p-md-3 rounded-2 mb-1';
            li.style.transition = 'background 0.15s';
            li.onmouseover = () => li.style.background = '#f8f9fc';
            li.onmouseout = () => li.style.background = 'transparent';

            const link = document.createElement('a');
            link.href = `/doc/${encodeURIComponent(doc.id)}`;
            link.className = 'd-flex align-items-center gap-2 gap-md-3 text-decoration-none text-dark flex-grow-1';
            
            const iconSpan = document.createElement('span');
            iconSpan.className = 'd-flex align-items-center justify-content-center rounded-2';
            iconSpan.style.cssText = 'width: 36px; height: 36px; background: linear-gradient(135deg, #e0e7ff, #c7d2fe); color: var(--accent);';
            iconSpan.innerHTML = '<i class="bi bi-file-text"></i>';

            const textDiv = document.createElement('div');
            textDiv.className = 'd-flex flex-column';
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'fw-medium';
            titleSpan.textContent = doc.title; // Safe: textContent escapes HTML
            
            const dateSmall = document.createElement('small');
            dateSmall.className = 'text-secondary';
            dateSmall.textContent = doc.creationDate; // Safe: textContent escapes HTML
            
            textDiv.appendChild(titleSpan);
            textDiv.appendChild(dateSmall);
            link.appendChild(iconSpan);
            link.appendChild(textDiv);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-delete text-secondary';
            deleteBtn.innerHTML = '<i class="bi bi-trash3"></i>';
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                deleteDocument(doc.id, doc.title);
            });

            li.appendChild(link);
            li.appendChild(deleteBtn);
            fileList.appendChild(li);
        });
    } catch (error) {
        document.getElementById('fileList').innerHTML = `
            <li class="text-center py-4 text-danger">
                <i class="bi bi-exclamation-circle me-1"></i> Fehler beim Laden der Übungen
            </li>`;
    }
}

/**
 * Create a new document from the input field
 */
async function createDocument() {
    const errorMessage = 'Übung konnte nicht erstellt werden';
    const input = document.getElementById('newFilename');
    const title = input.value.trim();

    if (!title) {
        showStatus('Bitte geben Sie einen Titel ein', 'danger');
        return;
    }

    try {
        const response = await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        const result = await response.json();

        if (response.ok) {
            showStatus(`✅ ${DOMPurify.sanitize(result.document.title)}`, 'success');
            input.value = '';
            loadDocuments();
        } else {
            console.error('Create document error:', result.error);
            showStatus(errorMessage, 'danger');
        }
    } catch (error) {
        console.error('Create document exception:', error);
        showStatus(errorMessage, 'danger');
    }
}

/**
 * Delete a document after confirmation
 * @param {string} id - Document ID
 * @param {string} title - Document title (for confirmation dialog)
 */
async function deleteDocument(id, title) {
    const errorMessage = 'Fehler beim Löschen der Übung';
    if (!confirm(`Möchten Sie "${title}" wirklich löschen?`)) return;

    try {
        const response = await fetch(`/api/documents/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showStatus(`"${DOMPurify.sanitize(title)}" wurde gelöscht`, 'success');
            loadDocuments();
        } else {
            console.error('Delete document error:', (await response.json()).error);
            showStatus(errorMessage, 'danger');
        }
    } catch (error) {
        console.error('Delete document exception:', error);
        showStatus(errorMessage, 'danger');
    }
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {'success'|'danger'|'warning'|'info'} type - Bootstrap alert type
 */
function showStatus(message, type) {
    const status = document.getElementById('status');
    status.className = `alert-toast alert alert-${type} py-2 px-3 shadow-sm`;
    status.textContent = message;
    setTimeout(() => {
        status.className = 'alert-toast';
        status.textContent = '';
    }, 3000);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('newFilename').addEventListener('keypress', e => {
        if (e.key === 'Enter') createDocument();
    });

    document.getElementById('createBtn').addEventListener('click', createDocument);

    loadDocuments();
});
