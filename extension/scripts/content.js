// @ts-check

// Run the script
addCoAuthorsButtonToMergeForm();
// Re-run the script when navigating between pages
document.addEventListener('turbo:render', addCoAuthorsButtonToMergeForm);

/** Create the UI for adding co-authors. */
function createCoAuthorsUI() {
	const banner = document.createElement('div');
	banner.setAttribute('aria-live', 'polite');
	banner.classList.add('color-fg-subtle');

	let bannerTimeout;
	/**
	 * Display a temporary status update about the progress adding co-authors.
	 * @param {string} msg The message to display
	 * @param {'subtle' | 'success' | 'danger'} color The status color to use.
	 */
	const displayStatus = (msg, color = 'subtle') => {
		clearTimeout(bannerTimeout);
		banner.textContent = msg;
		banner.className = `color-fg-${color}`;
		bannerTimeout = setTimeout(() => (banner.textContent = ''), 5000);
	};

	const button = document.createElement('button');
	button.textContent = 'Add Co-authors';
	button.classList.add('Button', 'Button--secondary', 'Button--small');
	button.type = 'button';
	button.addEventListener('click', async () => {
		displayStatus('Loading co-authors…');
		try {
			const { message, count } = await getCoAuthors();
			const textArea = /** @type {HTMLTextAreaElement | null} */ (
				document.querySelector('textarea[name="commit_message"]')
			);
			if (!textArea) throw new Error('Couldn’t find commit message <textarea>');
			textArea.value = (textArea.value + '\n\n' + message).trim();

			if (count === 0) {
				displayStatus('Found no co-authors to add');
			} else {
				displayStatus(`Added ${count} co-author${count === 1 ? '' : 's'}`, 'success');
			}
		} catch (error) {
			console.error('Error adding co-authors:', error);
			displayStatus('Something went wrong.', 'danger');
		}
	});
	// Build container
	const container = document.createElement('div');
	container.classList.add('d-flex', 'flex-items-center', 'gap-2');
	container.append(button);
	container.append(banner);
	return container;
}

/** Get participants for the current PR and generate `Co-authored-by` messages for them. */
async function getCoAuthors() {
	const [, owner, repo, _pull, id] = window.location.pathname.split('/');
	const pullNumber = parseInt(id || '', 10);

	const [prData, commentsData] = await Promise.all([
		fetchGitHubAPI(`/repos/${owner}/${repo}/pulls/${pullNumber}`),
		fetchGitHubAPI(`/repos/${owner}/${repo}/pulls/${pullNumber}/comments`),
	]);

	const participants = /** @type {Map<string, { name: string; email: string }>} */ (new Map());

	// Add commenters
	for (const comment of commentsData) {
		// Skip bot comments
		if (comment.user.type === 'Bot') continue;
		// Skip PR author
		if (comment.user.login === prData.user.login) continue;
		// Add commenters
		if (!participants.has(comment.user.login)) {
			participants.set(comment.user.login, {
				name: comment.user.name || comment.user.login,
				email: `${comment.user.id}+${comment.user.login}@users.noreply.github.com`,
			});
		}
	}

	const lines = Array.from(participants.values()).map(
		(p) => `Co-authored-by: ${p.name} <${p.email}>`
	);
	return { message: lines.join('\n'), count: lines.length };
}

/**
 * Simple wrapper around `fetch()` for making GitHub API requests, e.g. `fetchGitHubAPI('/repos/withastro')`.
 * Throws an error if the fetch does not succeed.
 * @param {string} endpoint GitHub API endpoint to fetch
 */
async function fetchGitHubAPI(endpoint) {
	const response = await fetch(`https://api.github.com${endpoint}`, {
		headers: { Accept: 'application/vnd.github.v3+json' },
	});
	if (!response.ok) {
		throw new Error(`GitHub API request failed: ${response.statusText}`);
	}
	return response.json();
}

/**
 * Create and add the co-authors button.
 * @param {HTMLElement} root Element to search within and add the co-authors button to.
 */
function addCoAuthorsButton(root) {
	const commitTitleInput = root.querySelector('input[name="commit_title"]');
	if (!commitTitleInput || root.querySelector('[data-coauthors-button]')) {
		return;
	}
	const button = createCoAuthorsUI();
	button.setAttribute('data-coauthors-button', '');
	commitTitleInput.insertAdjacentElement('afterend', button);
}

/**
 * Look for the PR merge form and add monitor it to add the co-authors button when possible.
 */
function addCoAuthorsButtonToMergeForm() {
	const element = /** @type {HTMLDivElement | null} */ (
		document.querySelector('.discussion-timeline-actions')
	);
	if (!element) return;

	const observer = new MutationObserver(() => {
		addCoAuthorsButton(element);
	});
	observer.observe(element, { subtree: true, childList: true });
	addCoAuthorsButton(element);
}
