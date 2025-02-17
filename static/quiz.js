let wrongAttempts = 0; // Track wrong attempts

document.addEventListener("DOMContentLoaded", function () {
    fetchQuestion();
});

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
