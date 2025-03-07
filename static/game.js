document.addEventListener("DOMContentLoaded", function () {
    let firstSelection = null;
    let matchTimeout = null;

    document.getElementById("filterButton").addEventListener("click", function() {
        let tagBox = document.getElementById("tagFilterBox");
        tagBox.style.display = (tagBox.style.display === "none" || tagBox.style.display === "") ? "block" : "none";
    });

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

    document.getElementById("tagDropdown")?.addEventListener("change", function () {
        let selectedTag = this.value;

        fetch(`/get_words_by_tag?tag=${selectedTag}`)
            .then(response => response.json())
            .then(data => {
                refreshUI(data.new_pairs);
            })
            .catch(error => console.error("Error fetching words:", error));
    });

    // Function to count total tags dynamically
    function updateTagCounts() {
        let tags = document.querySelectorAll(".tag-filter"); // Select all checkboxes
        document.getElementById("total-tags").innerText = `Total Tags: ${tags.length}`;

        let tagCounts = {}; // Object to store tag-word count

        // Loop through all word items
        document.querySelectorAll(".word-item").forEach(wordItem => {
            let wordTags = wordItem.dataset.tags ? wordItem.dataset.tags.split(',') : [];

            wordTags.forEach(tag => {
                let trimmedTag = tag.trim();
                if (trimmedTag) {
                    tagCounts[trimmedTag] = (tagCounts[trimmedTag] || 0) + 1;
                }
            });
        });

        // Update each tag count
        tags.forEach(tag => {
            let tagName = tag.value;
            let countSpan = document.getElementById(`count-${tagName.replace(/\s+/g, '-')}`);
            let wordCount = tagCounts[tagName] || 0;

            if (countSpan) {
                countSpan.innerText = `(${wordCount})`;
            }
        });
    }

    // Run on page load
    document.addEventListener("DOMContentLoaded", updateTagCounts);




//    function speakText(text, lang = "en-US") {
//        console.log(`Speaking: ${text} | Language: ${lang}`);
//
//        if ('speechSynthesis' in window) {
//            let utterance = new SpeechSynthesisUtterance(text);
//            utterance.lang = lang;
//            speechSynthesis.speak(utterance);
//        } else {
//            console.log("Speech synthesis not supported in this browser.");
//        }
//    }

    let score = 0;
    let highScore = localStorage.getItem("highScore") || 0; // Retrieve stored high score
    document.getElementById("score").innerText = `Score: ${score}`;
    document.getElementById("highScore").innerText = `High Score: ${highScore}`;

    function correctMatch() {
        score += 1;
        document.getElementById("score").innerText = `Score: ${score}`;

        if (score > highScore) {
            highScore = score;
            localStorage.setItem("highScore", highScore);
            document.getElementById("highScore").innerText = `High Score: ${highScore}`;
        }
    }

    function attachClickEvents() {
        document.querySelectorAll(".match-btn").forEach(button => {
            button.addEventListener("click", function () {

                //Prevents users from clicking on already matched or disabled buttons.
                if (this.classList.contains("correct") || this.disabled) return;

                const text = this.innerText;
                console.log(`Button clicked: ${text}`);

                if (!firstSelection) {
                    firstSelection = this;
                    firstSelection.classList.add("selected");
                    console.log("First selected:", firstSelection.dataset.value);
                    matchTimeout = setTimeout(() => {
//                        resetSelection();
                    }, 3000);
                } else if (firstSelection !== this){  // Ensure second selection is a different button
                    console.log("Second selected:", this.dataset.value);

                    // ✅ Ensure firstSelection exists before accessing dataset
                    if (firstSelection.dataset.value.trim().normalize("NFC") === this.dataset.value.trim().normalize("NFC")){
                        firstSelection.classList.add("correct");
                        this.classList.add("correct");

                        firstSelection.disabled = true;
                        this.disabled = true;

                        // For Scoring
                        correctMatch();

                        // ✅ Remove both elements after a short delay
                        setTimeout(() => {
                            let firstSelectionStored = firstSelection; // Store the reference before reset
                            let secondSelectionStored = this; // Store second selection reference

                            console.log("👉 First selection:", firstSelectionStored ? firstSelectionStored.innerText : "Already null");
                            console.log("👉 Second selection:", this ? this.innerText : "Already null");
                            if (firstSelection) {
                                firstSelection.parentNode.removeChild(firstSelectionStored); // Alternative removal ✅
                            }
                            if (this) {
                                this.parentNode.removeChild(this); // Alternative removal ✅
                            }

                            updatePair(firstSelectionStored ? firstSelectionStored.innerText : ""); // Handle potential null

                            // ✅ Reset firstSelection properly AFTER removing elements
                            firstSelection = null;

                        }, 1000);
                    } else {
                        firstSelection.classList.add("wrong");
                        this.classList.add("wrong");

                        setTimeout(() => {
                            firstSelection.classList.remove("wrong");
                            this.classList.remove("wrong");
                        }, 1000);
                    }
                    clearTimeout(matchTimeout);
                    resetSelection();
                }
            });
        });
    }

    function resetSelection() {
        document.querySelectorAll(".selected").forEach(btn => btn.classList.remove("selected"));
    }

    let Pairs = [];  // Ensure this is defined globally

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function updatePair(matchedWord) {
        console.log("Updating pair for:", matchedWord);
        fetch('/update_pair', {
            method: 'POST',
            body: JSON.stringify({ word: matchedWord }),  // Fix the key here
            headers: { "Content-Type": "application/json" }
        })
        .then(response => response.json())
        .then(data => {
            console.log("New pairs received:", data.new_pair);

            // Remove only the matched buttons
            document.querySelectorAll(".match-btn").forEach(btn => {
                if (btn.dataset.value === matchedWord) {
                    btn.remove();
                }
            });

            // Only update UI with new pair (instead of replacing everything)
            if (data.new_pair.length > 0) {
                addNewPairToUI(data.new_pair[data.new_pair.length - 1]);  // Add the last new pair
            }
            // Shuffle the word list after updating
            shuffleArray(Pairs);
        })
        .catch(error => console.error("Error updating pairs:", error));
    }

    // ✅ Function to add new pairs dynamically without resetting the whole UI
    function addNewPairToUI(pair) {
        const meaningsDiv = document.getElementById("meanings");
        const wordsDiv = document.getElementById("words");

        let meaningBtn = document.createElement("button");
        meaningBtn.classList.add("match-btn");
        meaningBtn.dataset.type = "meaning";
        meaningBtn.dataset.value = pair[1];
        meaningBtn.dataset.lang = "en-US";
        meaningBtn.innerText = pair[1];

        let wordBtn = document.createElement("button");
        wordBtn.classList.add("match-btn");
        wordBtn.dataset.type = "word";
        wordBtn.dataset.value = pair[1];  // Fix the dataset value
        wordBtn.dataset.lang = "fr-FR";
        wordBtn.innerText = pair[0];

        meaningsDiv.appendChild(meaningBtn);
        wordsDiv.appendChild(wordBtn);

        attachClickEvents();  // Re-attach events

        // ✅ Shuffle buttons after adding
        shuffleElements(meaningsDiv);
        shuffleElements(wordsDiv);
    }

    function shuffleElements(parent) {
        let elements = Array.from(parent.children);
        elements.sort(() => Math.random() - 0.5);
        elements.forEach(el => parent.appendChild(el));
    }

    attachClickEvents();
});
