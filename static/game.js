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

//                let lang = this.dataset.lang || "en-US";
                let text = this.innerText;

//                console.log(`Button clicked: ${text} (${lang})`);
                console.log(`Button clicked: ${text}`);
//                speakText(text, lang);

                if (this.classList.contains("correct") || this.disabled) return;

                if (!firstSelection) {
                    firstSelection = this;
                    firstSelection.classList.add("selected");

                    matchTimeout = setTimeout(() => {
                        resetSelection();
                    }, 3000);
                } else {
                    if (firstSelection.dataset.value.trim().normalize("NFC") === this.dataset.value.trim().normalize("NFC")) {
                        firstSelection.classList.add("correct");
                        this.classList.add("correct");

                        firstSelection.disabled = true;
                        this.disabled = true;

                        correctMatch(); // ✅ Update the score properly

                        setTimeout(() => {
                            updatePairs(firstSelection.dataset.value.trim()); // ✅ Fetch new pairs before removing
                        }, 500);
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
        firstSelection = null;
    }

    function updatePairs(matchedWord) {
    console.log("Matched word being sent:", matchedWord);
    if (!matchedWord) {
        console.error("Error: Matched word is undefined or empty!");
        return;
    }
        fetch("/update_pairs", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ matched_word: matchedWord })  // Make sure this sends correctly
        })
        .then(response => response.json())
        .then(data => {
            console.log("Updated pairs:", data);  // Debugging
            refreshUI(data.words.map((word, i) => [word, data.meanings[i]]));
        })
        .catch(error => console.error("Error updating pairs:", error));
    }


    function refreshUI(newPairs) {
        const meaningsDiv = document.getElementById("meanings");
        const wordsDiv = document.getElementById("words");

        meaningsDiv.innerHTML = "";
        wordsDiv.innerHTML = "";

        setTimeout(() => {  // Small delay to ensure UI refresh
            newPairs.forEach(pair => {
                let meaningBtn = document.createElement("button");
                meaningBtn.classList.add("match-btn");
                meaningBtn.dataset.type = "meaning";
                meaningBtn.dataset.value = pair[1];
//                meaningBtn.dataset.lang = "en-US";
                meaningBtn.innerText = pair[1];

                let wordBtn = document.createElement("button");
                wordBtn.classList.add("match-btn");
                wordBtn.dataset.type = "word";
                wordBtn.dataset.value = pair[1];  // Fix here!
//                wordBtn.dataset.lang = "fr-FR";
                wordBtn.innerText = pair[0];

                meaningsDiv.appendChild(meaningBtn);
                wordsDiv.appendChild(wordBtn);
            });

            attachClickEvents();  // Ensure buttons get event listeners
        }, 100);
    }

    attachClickEvents();
});
