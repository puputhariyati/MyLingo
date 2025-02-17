document.addEventListener("DOMContentLoaded", function () {
    let firstSelection = null;
    let matchTimeout = null;

    function speakText(text, lang) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            speechSynthesis.speak(utterance);
        } else {
            console.log("Speech synthesis not supported in this browser.");
        }
    }

    function attachClickEvents() {
        document.querySelectorAll(".match-btn").forEach(button => {
            button.addEventListener("click", function () {
                if (this.classList.contains("correct") || this.disabled) return;

                // Get language attribute and speak
                const lang = this.dataset.lang || "en-US"; // Default to English
                const text = this.innerText; // Fix: Use innerText instead of dataset.value

                console.log(`Speaking "${text}" in "${lang}"`); // Debugging - Now correctly logs the word
                speakText(text, lang);

                if (!firstSelection) {
                    firstSelection = this;
                    firstSelection.classList.add("selected");

                    matchTimeout = setTimeout(() => {
                        resetSelection();
                    }, 3000);
                } else {
                    console.log("First selected:", firstSelection.dataset.value);
                    console.log("Second selected:", this.dataset.value);

                    if (firstSelection.dataset.value.trim().normalize("NFC") === this.dataset.value.trim().normalize("NFC")) {
                        firstSelection.classList.add("correct");
                        this.classList.add("correct");

                        firstSelection.disabled = true;
                        this.disabled = true;

                        // Remove matched pair from UI and fetch new pair
                        setTimeout(() => {
                            firstSelection.remove();
                            this.remove();
                            updatePairs(firstSelection.innerText);
                        }, 5000);
                    } else {
                        firstSelection.classList.add("wrong");
                        this.classList.add("wrong");

                        setTimeout(() => {
                            firstSelection.classList.remove("wrong");
                            this.classList.remove("wrong");
                        }, 3000);
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
        });
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
