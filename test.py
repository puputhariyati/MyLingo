import sqlite3
import random

# Function to fetch word pairs from vocab.db
def fetch_word_pairs():
    conn = sqlite3.connect('vocab.db')
    c = conn.cursor()
    c.execute("SELECT word, meaning FROM vocabulary ORDER BY RANDOM() LIMIT 5")  # Fetch 5 random pairs
    word_pairs = c.fetchall()
    conn.close()
    return word_pairs  # Returns a list of (word, meaning) tuples

# Fetch word pairs from the database
word_pairs = fetch_word_pairs()

# Convert the list of tuples into a dictionary for easy lookup
word_dict = dict(word_pairs)

# Extract words and meanings separately
words = list(word_dict.keys())
meanings = list(word_dict.values())

# Shuffle only the meanings to mix up the game
random.shuffle(meanings)

# Game starts
print("Match the words with their correct meanings:")
print("Words:", words)
print("Meanings:", meanings)

# User plays the game
score = 0
for word in words:
    answer = input(f"Enter the meaning for '{word}': ").strip().lower()

    # Correct answer check (case-insensitive)
    correct_meaning = word_dict[word].lower()

    if answer == correct_meaning:
        print("✅ Correct!")
        score += 1
    else:
        print(f"❌ Incorrect! The correct meaning is: {correct_meaning}")

print(f"Game Over! Your score: {score}/{len(words)}")
