document.addEventListener("DOMContentLoaded", function () {
    console.log("JavaScript loaded!");

    let tagLists = {}; // Object to store tags separately for each form

    function addTag(event, formType) {
        if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();

            let tagInput = document.getElementById(`tag-input-${formType}`);
            let tagContainer = document.getElementById(`tag-container-${formType}`);

            let tagText = tagInput.value.trim();
            if (tagText) {
                if (!tagLists[formType]) {
                    tagLists[formType] = [];
                }

                if (!tagLists[formType].includes(tagText)) {
                    tagLists[formType].push(tagText);

                    let tagElement = document.createElement("span");
                    tagElement.classList.add("tag");
                    tagElement.textContent = tagText;
                    tagElement.onclick = function () {
                        tagLists[formType] = tagLists[formType].filter(tag => tag !== tagText);
                        tagElement.remove();
                        updateHiddenTags(formType);
                    };

                    tagContainer.appendChild(tagElement);
                    tagInput.value = "";
                    updateHiddenTags(formType);
                }
            }
        }
    }

    function updateHiddenTags(formType) {
        let hiddenInput = document.getElementById(`tags-hidden-${formType}`);
        if (hiddenInput) {
            hiddenInput.value = tagLists[formType].join(",");
        }
    }

    // Expose function to window
    window.addTag = addTag;

    function toggleEdit(wordId) {
        let editForm = document.getElementById("editForm" + wordId);

        // Hide all other edit forms
        document.querySelectorAll("[id^='editForm']").forEach(form => {
            if (form.id !== "editForm" + wordId) {
                form.style.display = "none";
            }
        });

        // Toggle the selected edit form
        if (editForm.style.display === "none" || editForm.style.display === "") {
            editForm.style.display = "block";
        } else {
            editForm.style.display = "none";
        }
    }

    // Expose toggleEdit function globally
    window.toggleEdit = toggleEdit;

    // Load existing tags in edit mode
    document.querySelectorAll("input[id^='tags-hidden-edit']").forEach(hiddenInput => {
        let formType = hiddenInput.id.replace("tags-hidden-", ""); // Extract the form identifier
        let existingTags = hiddenInput.value.split(",").map(tag => tag.trim()).filter(tag => tag);

        tagLists[formType] = existingTags;
        let tagContainer = document.getElementById(`tag-container-${formType}`);

        existingTags.forEach(tagText => {
            let tagElement = document.createElement("span");
            tagElement.classList.add("tag");
            tagElement.textContent = tagText;
            tagElement.onclick = function () {
                tagLists[formType] = tagLists[formType].filter(tag => tag !== tagText);
                tagElement.remove();
                updateHiddenTags(formType);
            };
            tagContainer.appendChild(tagElement);
        });
    });

    let selectedTags = [];

    document.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', function () {
            const tagText = this.textContent.trim();

            if (selectedTags.includes(tagText)) {
                // Remove tag if already selected
                selectedTags = selectedTags.filter(t => t !== tagText);
                this.classList.remove('selected'); // Remove highlight
            } else {
                // Add tag if not selected
                selectedTags.push(tagText);
                this.classList.add('selected'); // Highlight selected tag
            }

            filterWords();
        });
    });

    // Function to filter words based on selected tags
    function filterWords() {
        document.querySelectorAll('.word-item').forEach(item => {
            const itemTags = Array.from(item.querySelectorAll('.tag')).map(t => t.textContent.trim());

            // Check if the item contains all selected tags
            const matchesAllTags = selectedTags.every(tag => itemTags.includes(tag));

            // Show or hide the word item
            item.style.display = matchesAllTags || selectedTags.length === 0 ? 'block' : 'none';
        });

        // Show/Hide "Clear Filters" button
        document.getElementById('clearFilters').style.display = selectedTags.length > 0 ? 'inline-block' : 'none';
    }

    // Additional Filters (Alphabet, Sort)
    let alphabetFilter = document.getElementById("alphabet-filter");
    let tagFilter = document.getElementById("tag-filter");
    let sortFilter = document.getElementById("sort-filter");

    function applyFilters() {
        let alphabet = "{{ selected_alphabet }}";  // Preserve alphabet filter
        let tag = "{{ selected_tag }}";  // Preserve selected tag
        let sort = document.getElementById("sort-filter").value;

        let wordItems = document.querySelectorAll(".word-item");
        let filteredWords = [...wordItems];

        // Alphabet Filter
        if (alphabet) {
            filteredWords = filteredWords.filter(item => {
                let wordText = item.querySelector(".word-title").textContent.trim();
                return wordText.charAt(0).toUpperCase() === alphabet;
            });
        }

        // Tag Filter (Exact Match)
        if (tag) {
            filteredWords = filteredWords.filter(item => {
                let tags = Array.from(item.querySelectorAll(".tag")).map(t => t.textContent.trim());
                return tags.includes(tag);
            });
        }

        // Sort Filter
        if (sort === "newest") {
            filteredWords.sort((a, b) => new Date(b.dataset.date) - new Date(a.dataset.date));
        } else if (sort === "oldest") {
            filteredWords.sort((a, b) => new Date(a.dataset.date) - new Date(b.dataset.date));
        } else if (sort === "alphabet") {
            filteredWords.sort((a, b) => a.querySelector(".word-title").textContent.trim().localeCompare(b.querySelector(".word-title").textContent.trim()));
        }

        // Hide all words first
        wordItems.forEach(item => item.style.display = "none");

        // Show filtered results
        filteredWords.forEach(item => item.style.display = "block");

        window.location.href = `/filter?tag=${tag}&alphabet=${alphabet}&sort=${sort}`;

    }

    // Event Listeners for Filters
    alphabetFilter.addEventListener("change", applyFilters);
    tagFilter.addEventListener("change", applyFilters);
    sortFilter.addEventListener("change", applyFilters);


    // Clear all filters when button is clicked
    document.getElementById('clearFilters').addEventListener('click', function () {
        selectedTags = [];
        document.querySelectorAll('.tag').forEach(tag => tag.classList.remove('selected')); // Remove all highlights
        filterWords();
    });


});
