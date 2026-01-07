// Document API client for content operations
class DocumentApi {
    constructor(documentId) {
        this.documentId = documentId;
        this.content = null;
    }

    async loadContent() {
        try {
            const response = await fetch(`/api/data/${this.documentId}`);
            if (response.ok) {
                const data = await response.json();
                this.content = data.content || {};
                return this.content;
            }
        } catch (error) {
            console.error('Failed to load content:', error);
            alert('Fehler beim Laden der Aufgabe');
        }
        return {};
    }

    async saveContent(updates) {
        try {
            // Merge updates with existing content
            this.content = { ...this.content, ...updates };

            const response = await fetch(`/api/data/${this.documentId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.content),
            });
            return response.ok;
        } catch (error) {
            console.error('Failed to save content:', error);
            return false;
        }
    }

    async submitReview() {
        const response = await fetch(`/api/content/review/${this.documentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            throw new Error('Failed to submit for review');
        }
    }
}

// Wait for the DOM to be fully loaded before executing code
document.addEventListener('DOMContentLoaded', async () => {
    // Get document ID from meta tag
    const documentId = document.querySelector('meta[name="document-id"]')?.content;
    if (!documentId) {
        console.error('Document ID not found');
        redirectToHomepage();
        return;
    }

    const api = new DocumentApi(documentId);

    const taskTextarea = document.getElementById('task-input');
    const contentTextarea = document.getElementById('content-input');
    const submitBtn = document.getElementById('submit-btn');

    if (!taskTextarea || !contentTextarea || !submitBtn) {
        console.error('Required elements not found in the DOM');
        redirectToHomepage();
        return;
    }

    const content = await api.loadContent();

    // Initialize form with saved content
    taskTextarea.value = content.task || '';
    contentTextarea.value = content.submissionText || '';

    trackWrittenWordsCount();

    const feedbackSection = initFeedbackSection(content);

    submitBtn.addEventListener('click', () => reviewOnClick());

    if (feedbackSection) {
        makeDocumentReadonly();
    } else {
        enableAutosave(taskTextarea, 'task');
        enableAutosave(contentTextarea, 'submissionText');
        trackTextareaInput(contentTextarea);
    }

    function redirectToHomepage() {
        alert('Ein Fehler ist aufgetreten. Sie werden zurück zur Startseite geleitet.');
        window.location.href = '/';
    }

    function trackWrittenWordsCount() {
        const setWrittenWordsCount = () => {
            const wordCountElement = document.getElementById('word-count');
            const wordCount = countWords(contentTextarea.value);
            wordCountElement.textContent = `${wordCount}`;
        }

        setWrittenWordsCount();


        contentTextarea.addEventListener('input', () => {
            setWrittenWordsCount();
        });
    }

    function initFeedbackSection(content) {
        const { reviewScore, reviewFeedback, correction } = content;

        if (reviewScore === null || !reviewFeedback || !correction) {
            return null;
        }

        const feedbackSection = document.getElementById('review-section');
        feedbackSection.hidden = false;

        const reviewScoreSpan = document.getElementById('review-score');
        const reviewFeedbackSpan = document.getElementById('review-feedback');
        const reviewReadonlyCorrectionSpan = document.getElementById('review-readonly-correction');
        const reviewEditableCorrectionTextarea = document.getElementById('review-editable-correction');

        enableAutosave(reviewEditableCorrectionTextarea, 'correction');

        reviewScoreSpan.textContent = reviewScore;
        reviewFeedbackSpan.textContent = reviewFeedback;

        renderReadonlyReview(correction, reviewReadonlyCorrectionSpan);
        reviewEditableCorrectionTextarea.value = correction;
        reviewEditableCorrectionTextarea.hidden = true;

        reviewReadonlyCorrectionSpan.addEventListener('click', () => {
            reviewReadonlyCorrectionSpan.hidden = true;
            reviewEditableCorrectionTextarea.hidden = false;
            reviewEditableCorrectionTextarea.focus({preventScroll: true});
        });

        let timeout;

        [{ eventType: 'blur', delay: 500 }, { eventType: 'input', delay: 30000 }].forEach(({ eventType, delay }) => {

            reviewEditableCorrectionTextarea.addEventListener(eventType, () => {
                clearTimeout(timeout);

                timeout = setTimeout(() => {
                    const updatedText = reviewEditableCorrectionTextarea.value;

                    renderReadonlyReview(updatedText, reviewReadonlyCorrectionSpan);

                    reviewReadonlyCorrectionSpan.hidden = false;
                    reviewEditableCorrectionTextarea.hidden = true;
                }, delay);
            });
        });

        feedbackSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        return feedbackSection;
    }

    function renderReadonlyReview(text, container) {
        // Escape HTML first
        let escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');

        // Regex to match --..-- and ++...++
        const regex = /--(.*?)--|\+\+(.*?)\+\+/g;

        // Replace matches with HTML spans
        const html = escaped.replace(regex, (_, removed, added) => {
            if (removed !== undefined) {
                return `<span class="bg-removed px-1 rounded">${removed}</span>`;
            } else if (added !== undefined) {
                return `<span class="bg-added px-1 rounded">${added}</span>`;
            }
            return '';
        });

        // Sanitize with DOMPurify - only allow safe tags/attributes
        container.innerHTML = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['span', 'br'],
            ALLOWED_ATTR: ['class']
        });
    }


    function makeDocumentReadonly() {
        taskTextarea.disabled = true;
        contentTextarea.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Erneut korrigieren';
        submitBtn.disabled = false;
    }

    function countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    function isTextReviewable() {
        return countWords(contentTextarea.value) >= 100;
    }

    function enableAutosave(textarea, field) {
        let saveTimeout;

        textarea.addEventListener('input', function () {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                const success = await api.saveContent({ [field]: textarea.value });
                if (!success) {
                    alert('Die automatische Speicherung ist fehlgeschlagen.');
                    console.error(`Failed to save content for ${field}`);
                }
            }, 500);
        });
    }


    function trackTextareaInput(textarea) {
        textarea.addEventListener('input', () => {
            if (!isTextReviewable()) {
                submitBtn.disabled = true;
                return;
            } else {
                submitBtn.disabled = false;
            }
        });
    }

    async function reviewOnClick() {
        if (!isTextReviewable()) {
            console.error('Not enough words to submit for review');
            return;
        }

        onContentBeingReviewed();

        try {
            await api.submitReview();
            onContentFinishedReview();
        } catch (error) {
            console.error('Error while submitting content for review:', error);
            onContentFailedReview();
        }
    }

    function onContentBeingReviewed() {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loader"></span> Bitte warten...';
        submitBtn.classList.add('loading');

        // Disable textareas during reviewing
        taskTextarea.disabled = true;
        contentTextarea.disabled = true;

        const reviewSection = document.getElementById('review-section');
        if (reviewSection) {
            reviewSection.hidden = true;
        }
    }

    function onContentFinishedReview() {
        window.location.reload();
    }

    function onContentFailedReview() {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Erneut versuchen';
        submitBtn.classList.remove('loading');

        // Re-enable textareas
        taskTextarea.disabled = false;
        contentTextarea.disabled = false;
    }
});