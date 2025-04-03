document.addEventListener("DOMContentLoaded", function () {
    console.log("JavaScript loaded!");

    // Function to filter
    function printTable() {
            window.print();
        }

    // Function to filter words based on selected tags

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

        window.location.href = `/words_table?filter?tag=${tag}&alphabet=${alphabet}&sort=${sort}`;

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