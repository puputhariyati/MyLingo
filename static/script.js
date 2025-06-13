document.addEventListener("DOMContentLoaded", function () {
    console.log("JavaScript loaded!");

    //Login
    let loginButton = document.getElementById("login-button");
    let loginBox = document.getElementById("login-box");
    let closeLogin = document.getElementById("close-login");

    if (loginButton && loginBox) {
        loginButton.addEventListener("click", function () {
            console.log("Login button clicked!");
            loginBox.style.display = "block"; // Show login box
        });

        closeLogin.addEventListener("click", function () {
            loginBox.style.display = "none"; // Hide login box
        });
    } else {
        console.log("Login button or login box NOT found!");
    }

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

    // Update counts when a tag is selected/deselected
    document.querySelectorAll('.tag-filter').forEach(tag => {
        tag.addEventListener('change', function () {
            updateTagCounts();
        });
    });

    document.querySelectorAll(".word-item").forEach(el => console.log(el.dataset.tags));

    function updateTagCounts() {
        let tagCounts = {}; // Store tag-word count

        // Loop through word items and extract tags
        document.querySelectorAll(".word-item").forEach(wordItem => {
            let wordTags = wordItem.dataset.tags ? wordItem.dataset.tags.split(',') : [];

            console.log("Word Tags Found: ", wordTags); // Debugging

            wordTags.forEach(tag => {
                let trimmedTag = tag.trim();
                if (trimmedTag.length > 0) {
                    tagCounts[trimmedTag] = (tagCounts[trimmedTag] || 0) + 1;
                }
            });
        });

        console.log("Final Tag Counts:", tagCounts); // Debugging

        // Update each tag count in the UI
        document.querySelectorAll(".tag-filter").forEach(tag => {
            let tagName = tag.value.trim();
            let countSpan = document.getElementById(`count-${tagName.replace(/\s+/g, '-')}`);
            let wordCount = tagCounts[tagName] || 0;

            if (countSpan) {
                countSpan.innerText = `(${wordCount})`;
            }
        });
    }

    // Run on page load
    document.addEventListener("DOMContentLoaded", updateTagCounts);


    document.getElementById("filterButton").addEventListener("click", function() {
        let tagBox = document.getElementById("tagFilterBox");
        if (tagBox.style.display === "none" || tagBox.style.display === "") {
            tagBox.style.display = "block";
        } else {
            tagBox.style.display = "none";
        }
    });

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


    const toggle = document.getElementById('flag-dropdown-toggle');
    const dropdown = document.getElementById('language-dropdown');

    toggle.addEventListener('click', () => {
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });

    // Close the dropdown if user clicks outside
    document.addEventListener('click', function (e) {
    if (!toggle.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
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
    let tagFilter = document.getElementById("tag-filter");
    let sortFilter = document.getElementById("sort-filter");

    function applyFilters() {
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
    tagFilter.addEventListener("change", applyFilters);
    sortFilter.addEventListener("change", applyFilters);


    // Clear all filters when button is clicked
    document.getElementById('clearFilters').addEventListener('click', function () {
        selectedTags = [];
        document.querySelectorAll('.tag').forEach(tag => tag.classList.remove('selected')); // Remove all highlights
        filterWords();
    });

    const sortButton = document.getElementById('sortButton');
    const sortMenu = document.getElementById('sortMenu');

    // Toggle dropdown on click
    sortButton.addEventListener('click', function (e) {
        e.stopPropagation(); // Prevent click from bubbling up
        sortMenu.style.display = (sortMenu.style.display === 'block') ? 'none' : 'block';
    });

    // Close dropdown if clicked outside
    document.addEventListener('click', function (e) {
        if (!document.getElementById('sort-dropdown').contains(e.target)) {
        sortMenu.style.display = 'none';
        }
    });

    let offset = 20;
    let loading = false;

    async function loadMoreWords() {
      if (loading) return;
      loading = true;
      document.getElementById("loading").style.display = "block";

      const params = new URLSearchParams(window.location.search); // gets existing ?tags&sort
      params.set("offset", offset);
      const res = await fetch(`/load_more_words?${params.toString()}`);

      const data = await res.json();

      const wordList = document.querySelector(".word-list");

      data.forEach(word => {
        const li = document.createElement("li");
        li.className = "word-item";

        // Create the HTML structure that matches the template
        let wordHTML = `
          <strong class="word-title">${word.word}</strong>: ${word.meaning}
          <br> Example: ${word.example}
          <br> Translation: ${word.translation}
          <br>
        `;

        // Add tags with the same structure as in the template
        if (word.tags) {
          wordHTML += word.tags.split(',').map(tag => `
            <a href="?page=1&tag=${tag.trim()}&alphabet=${params.get('alphabet') || ''}&sort=${params.get('sort') || 'newest'}">
              <button class="tag-btn tag">${tag.trim()}</button>
            </a>`).join('');
        }

        li.innerHTML = wordHTML;
        wordList.appendChild(li);
      });

      offset += data.length;
      loading = false;
      document.getElementById("loading").style.display = "none";

      if (data.length < 20) {
        document.getElementById("loading").innerText = "No more words";
        document.querySelector(".word-container").removeEventListener("scroll", handleScroll);
      }
      console.log("Loading more with offset", offset);
      console.log("Request URL:", `/load_more_words?${params.toString()}`);
      console.log("Fetched:", data);
    }

    function handleScroll() {
      const container = document.querySelector(".word-container");
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 100) {
        loadMoreWords();
      }
    }

    document.querySelector(".word-container").addEventListener("scroll", handleScroll);


});
