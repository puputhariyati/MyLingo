document.addEventListener("DOMContentLoaded", function () {
    let firstSelection = null;
    let matchTimeout = null;

    document.getElementById("filterButton").addEventListener("click", function() {
        let tagBox = document.getElementById("tagFilterBox");
        if (tagBox.style.display === "none" || tagBox.style.display === "") {
            tagBox.style.display = "block";
        } else {
            tagBox.style.display = "none";
        }
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
                        resetSelection();
                    }, 3000);
                } else {  // Ensure second selection is a different button
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
                            // ✅ Reset firstSelection properly AFTER removing elements
                            firstSelection = null;
                        }, 3000);
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

    function updatePairs(matchedWord) {
        console.log("Updating pairs for:", matchedWord);
        fetch('/update_pairs', {
            method: 'POST',
            body: JSON.stringify({ word: matchedWord }),
            headers: { "Content-Type": "application/json" }
        })
        .then(response => response.json())
        .then(data => {
            console.log("New pairs received:", data.new_pairs);

            document.querySelectorAll(".match-btn").forEach(btn => {
                if (btn.dataset.value === matchedWord) {
                    btn.remove();
                }
            });
            refreshUI(data.new_pairs);
        })
        .catch(error => console.error("Error updating pairs:", error));
    }

    function refreshUI(newPairs) {
        const meaningsDiv = document.getElementById("meanings");
        const wordsDiv = document.getElementById("words");

        meaningsDiv.innerHTML = "";
        wordsDiv.innerHTML = "";

        newPairs.forEach(pair => {
            let meaningBtn = document.createElement("button");
            meaningBtn.classList.add("match-btn");
            meaningBtn.dataset.type = "meaning";
            meaningBtn.dataset.value = pair[1];
            meaningBtn.dataset.lang = "en-US"; // English meanings
            meaningBtn.innerText = pair[1];

            let wordBtn = document.createElement("button");
            wordBtn.classList.add("match-btn");
            wordBtn.dataset.type = "word";
            wordBtn.dataset.value = pair[1];
            wordBtn.dataset.lang = "fr-FR"; // French words
            wordBtn.innerText = pair[0];

            meaningsDiv.appendChild(meaningBtn);
            wordsDiv.appendChild(wordBtn);
        });

        attachClickEvents(); // Re-attach event listeners to new buttons
    }

    attachClickEvents();
});
