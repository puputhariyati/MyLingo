document.addEventListener("DOMContentLoaded", function () {
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

    fetchQuestion();

    let wrongAttempts = 0; // Track wrong attempts
    function fetchQuestion() {
        fetch("/get_question")
            .then(response => response.json())
            .then(data => {
                console.log("Received Data:", data); // Debugging log

                if (data.error) {
                    document.getElementById("question").innerText = "No questions available.";
                } else {
                    document.getElementById("question").innerText = `${data.question}`; //make meaning & translation questions
                    document.getElementById("answer").dataset.correctAnswer = data.correct_answer_normalized;
                    wrongAttempts = 0; // Reset wrong attempts
                }
            })
            .catch(error => {
                console.error("Error fetching question:", error);
                document.getElementById("question").innerText = "Error loading question.";
            });
    }


    document.getElementById("quiz-form").addEventListener("submit", function (event) {
        event.preventDefault();
        checkAnswer();
    });

    function normalizeText(text) {
        return text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim().toLowerCase();
    }

    function checkAnswer() {
        let userAnswer = document.getElementById("answer").value.trim().toLowerCase();
        let correctAnswer = document.getElementById("answer").dataset.correctAnswer.toLowerCase();

    //    const normalizedUserInput = normalizeText(userInput.toLowerCase());
    //    const normalizedCorrectAnswer = normalizeText(correctAnswer.toLowerCase());

        if (userAnswer === correctAnswer) {
            alert("Correct!");
            document.getElementById("answer").value = "";
            fetchQuestion(); // Load next question
        } else {
            wrongAttempts++;
            if (wrongAttempts >= 2) {
                alert(`Wrong 2 times! Moving to next question. Correct answer was: ${correctAnswer}`);
                document.getElementById("answer").value = "";
                fetchQuestion(); // Load next question
            } else {
                alert(`Wrong! Try again. (${2 - wrongAttempts} attempts left)`);
            }
        }
    }

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

});
