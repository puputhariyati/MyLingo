from flask import Flask, render_template, jsonify, request, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, logout_user, current_user, login_required
from flask_dance.contrib.google import make_google_blueprint, google
from models import User
import sqlite3
import unicodedata
import random
import re  # <-- Ensure regex module is imported
import math  # Ensure math is imported

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SECRET_KEY'] = 'your_secret_key'
db = SQLAlchemy(app)

login_manager = LoginManager()
login_manager.login_view = "google.login"
login_manager.init_app(app)

# Configure Google OAuth
google_bp = make_google_blueprint(
    client_id="YOUR_GOOGLE_CLIENT_ID",
    client_secret="YOUR_GOOGLE_CLIENT_SECRET",
    redirect_url="/google_login/callback",
    scope=["profile", "email"]
)
app.register_blueprint(google_bp, url_prefix="/google_login")

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route("/google_login/callback")
def google_login():
    if not google.authorized:
        return redirect(url_for("google.login"))

    resp = google.get("/oauth2/v2/userinfo")
    if resp.ok:
        user_info = resp.json()
        email = user_info["email"]
        username = user_info["name"]

        # Check if user exists
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(username=username, email=email)
            db.session.add(user)
            db.session.commit()

        login_user(user)
        flash(f"Welcome, {username}!", "success")
        return redirect(url_for("index"))
    else:
        flash("Google login failed.", "danger")
        return redirect(url_for("index"))

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=current_user)


# Initialize Database
def init_db():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()

    # Create the table if it doesn't exist
    c.execute('''CREATE TABLE IF NOT EXISTS vocabulary (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    word TEXT NOT NULL,
                    meaning TEXT,
                    example TEXT,
                    translation TEXT,
                    tags TEXT)''')  # <-- Removed "language" and "source", added "tags"

    # Check existing columns
    c.execute("PRAGMA table_info(vocabulary);")
    columns = [col[1] for col in c.fetchall()]

    # Add missing columns if necessary
    if "translation" not in columns:
        c.execute("ALTER TABLE vocabulary ADD COLUMN translation TEXT;")
    if "tags" not in columns:  # <-- Ensure "tags" column exists
        c.execute("ALTER TABLE vocabulary ADD COLUMN tags TEXT;")

    conn.commit()
    conn.close()


def remove_accents(input_str: object) -> object:
    if not isinstance(input_str, str):  # Ensure it's a string
        return ""  # Return empty string instead of None
    return ''.join(
        c for c in unicodedata.normalize('NFKD', input_str)
        if unicodedata.category(c) != 'Mn'
    )


init_db()


# Database connection function
def get_db():
    # conn = sqlite3.connect("database.db")
    # conn.row_factory = sqlite3.Row  # Enables dictionary-like access
    # return conn
    db = sqlite3.connect('database.db')
    db.row_factory = sqlite3.Row
    return db


@app.route('/')
def index():
    db = get_db()
    cursor = db.cursor()

    # Start building query
    query = "SELECT * FROM vocabulary"
    conditions = []

    # Get filters from request args
    selected_tags = request.args.getlist("tags")
    selected_sort = request.args.get("sort", "newest")

    # Apply filters
    if selected_tags:
        tag_conditions = " AND ".join(f"tags LIKE '%{tag}%'" for tag in selected_tags)
        conditions.append(f"({tag_conditions})")

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    # Apply sorting
    if selected_sort == "oldest":
        query += " ORDER BY id ASC"
    elif selected_sort == "alphabet":
        query += " ORDER BY word ASC"
    else:  # Default: newest
        query += " ORDER BY id DESC"

    # Apply limit after WHERE and ORDER BY
    query += " LIMIT 20 OFFSET 0"

    # Now execute full query
    cursor.execute(query)
    words = cursor.fetchall()

    # Count total words (no need to include LIMIT in count)
    count_query = "SELECT COUNT(*) FROM vocabulary"
    if conditions:
        count_query += " WHERE " + " AND ".join(conditions)
    cursor.execute(count_query)
    total_words = cursor.fetchone()[0]

    # Fetch unique tags
    cursor.execute("SELECT tags FROM vocabulary")
    all_tags = cursor.fetchall()

    tag_count = {}
    tag_set = set()

    for row in all_tags:
        if row["tags"]:
            tag_list = [tag.strip() for tag in row["tags"].split(",") if tag.strip()]
            for tag in tag_list:
                tag_set.add(tag)
                tag_count[tag] = tag_count.get(tag, 0) + 1

    db.close()

    return render_template(
        'index.html',
        words=words,
        tags=sorted(tag_set),
        tag_count=tag_count,
        selected_tags=selected_tags,
        selected_sort=selected_sort,
    )

@app.route('/load_more_words')
def load_more_words():
    db = get_db()
    cursor = db.cursor()

    offset = int(request.args.get("offset", 0))
    # Handle both 'tag' (singular) and 'tags' (plural) parameters
    selected_tags = request.args.getlist("tags")
    tag = request.args.get("tag")
    if tag and tag not in selected_tags:
        selected_tags.append(tag)
    selected_sort = request.args.get("sort", "newest")

    query = "SELECT * FROM vocabulary"
    conditions = []

    if selected_tags:
        tag_conditions = " AND ".join(f"tags LIKE '%{tag}%'" for tag in selected_tags)
        conditions.append(f"({tag_conditions})")

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    if selected_sort == "oldest":
        query += " ORDER BY id ASC"
    elif selected_sort == "alphabet":
        query += " ORDER BY word ASC"
    else:
        query += " ORDER BY id DESC"

    query += f" LIMIT 20 OFFSET {offset}"

    cursor.execute(query)
    rows = cursor.fetchall()
    db.close()

    return jsonify([
        {
            "id": row["id"],
            "word": row["word"],
            "meaning": row["meaning"],
            "example": row["example"],
            "translation": row["translation"],
            "tags": row["tags"]
        }
        for row in rows
    ])




@app.route('/search')
def search_word():
    query = request.args.get('query', '')  # Search query
    page = request.args.get('page', 1, type=int)  # Page number (default to 1)
    alphabet = request.args.get('alphabet', '')
    tag = request.args.get('tag', '')
    sort = request.args.get('sort', 'newest')

    query_normalized = remove_accents(query.lower())

    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row  # ✅ Return dictionaries instead of tuples
    c = conn.cursor()
    c.execute("SELECT * FROM vocabulary")
    words = c.fetchall()
    conn.close()

    filtered_words = [
        word for word in words
        if query_normalized in remove_accents(word["word"].lower())
        or query_normalized in remove_accents(word["meaning"].lower())
    ]

    words = filtered_words  # Fetch words based on filters
    total_pages = (len(words) // 20) + (1 if len(words) % 20 > 0 else 0)  # Calculate pages

    return render_template('index.html', words=words, page=page, total_pages=total_pages, selected_alphabet=alphabet,
                           selected_tag=tag, selected_sort=sort)


@app.route('/add', methods=['POST'])
def add_word():
    word = request.form['word']
    meaning = request.form['meaning']
    example = request.form['example']
    translation = request.form['translation']
    tags = request.form['tags']  # This is now a comma-separated string

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("INSERT INTO vocabulary (word, meaning, example, translation, tags) VALUES (?, ?, ?, ?, ?)",
                   (word, meaning, example, translation, tags))
    conn.commit()
    conn.close()
    return redirect(url_for('index'))


@app.route('/filter')
def filter_words():
    tag = request.args.get('tag', '')  # Default to empty string if not provided
    page = request.args.get('page', 1, type=int)  # Get current page
    alphabet = request.args.get('alphabet', '')  # Get alphabet filter
    sort = request.args.get('sort', 'newest')  # Get sorting option

    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row  # ✅ Return dictionaries
    c = conn.cursor()

    # Build query dynamically based on filters
    query = "SELECT * FROM vocabulary WHERE 1=1"
    params = []

    if tag:
        query += " AND tags LIKE ?"
        params.append('%' + tag + '%')

    if alphabet:
        query += " AND word LIKE ?"
        params.append(alphabet + '%')

    # Apply sorting
    if sort == "newest":
        query += " ORDER BY id DESC"
    elif sort == "oldest":
        query += " ORDER BY id ASC"
    elif sort == "alphabet":
        query += " ORDER BY word ASC"

    c.execute(query, params)
    words = c.fetchall()
    conn.close()

    # Pagination setup
    total_pages = (len(words) // 20) + (1 if len(words) % 20 > 0 else 0)
    words = words[(page - 1) * 20: page * 20]  # Slice words for pagination

    return render_template('index.html',
                           words=words,
                           page=page,
                           total_pages=total_pages,
                           selected_alphabet=alphabet,
                           selected_tag=tag,
                           selected_sort=sort)


@app.route("/edit", methods=["POST"])
def edit_word():
    word_id = request.form.get("id")
    word = request.form.get("word")
    meaning = request.form.get("meaning")
    example = request.form.get("example")
    translation = request.form.get("translation")
    tags = request.form.get("tags")

    print(f"📝 Editing word ID: {word_id}, Word: {word}, Meaning: {meaning}, "
          f"Example: {example}, Translation: {translation}, Tags: {tags}")

    if not word_id:
        print("❌ No ID provided for editing!")
        return redirect(url_for("index"))

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "UPDATE vocabulary SET word=?, meaning=?, example=?, translation=?, tags=? WHERE id=?",
        (word, meaning, example, translation, tags, word_id),
    )
    db.commit()
    db.close()

    print("✅ Word successfully updated!")
    return redirect(url_for("index"))


@app.route("/delete", methods=["POST"])
def delete_word():
    word_id = request.form.get("id")

    db = get_db()
    cursor = db.cursor()
    cursor.execute("DELETE FROM vocabulary WHERE id=?", (word_id,))
    db.commit()
    db.close()

    return redirect(url_for("index"))


# Load ALL vocabulary pairs once (not just 5)
def load_all_pairs():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute("SELECT word, meaning FROM vocabulary ORDER BY RANDOM()")
    all_pairs = c.fetchall()
    conn.close()
    return all_pairs


# Store all pairs and active pairs
all_pairs = load_all_pairs()
active_pairs = []  # Start empty, will fill dynamically


@app.route('/game')  # Register the route
def game():
    db = get_db()
    cursor = db.cursor()

    tags = get_all_tags()  # Get all available tags
    selected_tag = request.args.getlist('tags')# Get selected tags from request
    meanings, words, word_dict = get_game_data(selected_tag)  # Modify logic to apply filtering

    # Fetch words filtered by selected tags
    if selected_tag:
        tag_conditions = " OR ".join(f"tags LIKE '%{tag}%'" for tag in selected_tag)
        query = f"SELECT word, meaning, tags FROM vocabulary WHERE {tag_conditions}"
    else:
        query = "SELECT word, meaning, tags FROM vocabulary"  # Fetch all if no filter is applied

    cursor.execute(query)
    all_tags = cursor.fetchall()

    tag_count = {}  # Dictionary to store tag counts
    tag_set = set()

    # Ensure exactly 5 pairs are selected
    selected_pairs = random.sample(list(word_dict.items()), min(5, len(word_dict)))

    # Extract words & meanings from selected pairs
    words = [pair[0] for pair in selected_pairs]
    meanings = [pair[1] for pair in selected_pairs]

    # Shuffle words and meanings separately to prevent alignment
    random.shuffle(words)
    random.shuffle(meanings)

    for row in all_tags:
        if row["tags"]:
            tag_list = [tag.strip() for tag in row["tags"].split(",") if tag.strip()]
            for tag in tag_list:
                tag_set.add(tag)
                tag_count[tag] = tag_count.get(tag, 0) + 1  # Count occurrences

    return render_template('game.html',
                           tags=tags,
                           selected_tag=selected_tag,
                           meanings=meanings,
                           words=words,
                           word_dict=word_dict,
                           tag_count=tag_count)


@app.route('/get_all_tags')  # Fix incorrect route
def get_all_tags():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT tags FROM vocabulary")
    all_tags = cursor.fetchall()
    conn.close()

    tag_set = set()

    for row in all_tags:
        if row["tags"]:
            tag_list = [tag.strip() for tag in row["tags"].split(",") if tag.strip()]
            tag_set.update(tag_list)

    return sorted(tag_set)


def get_game_data(selected_tags=None):
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    query = "SELECT word, meaning FROM vocabulary"
    params = []

    if selected_tags:
        tag_conditions = " OR ".join(["tags LIKE ?" for _ in selected_tags])
        query += f" WHERE {tag_conditions}"
        params = [f"%{tag}%" for tag in selected_tags]

    cursor.execute(query, params)
    words_data = cursor.fetchall()
    conn.close()

    word_dict = {row["word"]: row["meaning"] for row in words_data}

    words = list(word_dict.keys())
    meanings = list(word_dict.values())
    random.shuffle(meanings)
    random.shuffle(words)

    return meanings, words, word_dict


@app.route("/update_pair", methods=["POST"])
def update_pair():
    global active_pairs, all_pairs
    tags = get_all_tags()  # Ensure this function fetches tags
    selected_tag = request.args.getlist('tags')
    meanings, words, word_dict = get_game_data(selected_tag)  # Modify logic to apply filtering

    data = request.get_json()
    matched_word = data.get("matchedWord")
    print(f"🔥 Received match request: {matched_word}")
    print(f"🔍 Active pairs before update: {active_pairs}")

    # Find the matched pair
    matched_pair = None
    for pair in active_pairs:
        if matched_word in pair:  # Check both elements in the tuple
            matched_pair = pair
            break

    if matched_pair:
        active_pairs.remove(matched_pair)
        print(f"✅ Removed pair: {matched_pair}")

    # **REPLACE the removed pair with a new one**
    if all_pairs:
        new_pair = all_pairs.pop(0)
        active_pairs.append(new_pair)
        print(f"🚀 Added new pair: {new_pair}")
    else:
        print("⚠️ No more pairs available in all_pairs!")

    return jsonify(success=True,
                   new_pair=active_pairs,
                   tags=tags,
                   selected_tag=selected_tag,
                   meanings=meanings,
                   words=words,
                   word_dict=word_dict
                   )


@app.route("/quiz")
def quiz():
    db = get_db()
    cursor = db.cursor()

    tags = get_all_tags()  # Get all available tags
    selected_tag = request.args.getlist('tags')# Get selected tags from request
    meanings, words, word_dict = get_game_data(selected_tag)  # Modify logic to apply filtering

    # Fetch words filtered by selected tags
    if selected_tag:
        tag_conditions = " OR ".join(f"tags LIKE '%{tag}%'" for tag in selected_tag)
        query = f"SELECT word, meaning, tags FROM vocabulary WHERE {tag_conditions}"
    else:
        query = "SELECT word, meaning, tags FROM vocabulary"  # Fetch all if no filter is applied

    cursor.execute(query)
    all_tags = cursor.fetchall()

    tag_count = {}  # Dictionary to store tag counts
    tag_set = set()

    for row in all_tags:
        if row["tags"]:
            tag_list = [tag.strip() for tag in row["tags"].split(",") if tag.strip()]
            for tag in tag_list:
                tag_set.add(tag)
                tag_count[tag] = tag_count.get(tag, 0) + 1  # Count occurrences

    return render_template('quiz.html',
                           tags=tags,
                           selected_tag=selected_tag,
                           meanings=meanings,
                           words=words,
                           word_dict=word_dict,
                           tag_count=tag_count
                           )


# Function to get a random word from the database
def get_random_word():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute("SELECT word, meaning, translation, example FROM vocabulary ORDER BY RANDOM() LIMIT 1")
    word = c.fetchone()
    conn.close()

    if word:
        return {"word": word[0], "meaning": word[1], "translation": word[2], "example": word[3]}
    return None


@app.route("/get_question", methods=["GET"])
def get_question():
    word_data = get_random_word()
    if not word_data:
        return jsonify({"error": "No words found in the database"}), 500

    question_type = random.choice(["meaning", "translation"])  # Pick meaning or translation
    question = word_data.get(question_type, "Unknown")  # ✅ Use .get() to avoid KeyError

    # ✅ Correct answer logic:
    if question_type == "meaning":
        correct_answer = word_data["word"]  # User must guess the word
    else:  # question_type == "translation"
        correct_answer = word_data["example"]  # User must guess the meaning

    return jsonify({
        "question_type": question_type,  # ✅ Helps debug
        "question": question,
        "correct_answer": correct_answer,  # ✅ Send the correct answer
        "correct_answer_normalized": remove_accents(correct_answer.lower())  # Send normalized answer
    })


# Route to check the answer
@app.route("/check_answer", methods=["POST"])
def remove_accents(input_str: object) -> object:
    if not isinstance(input_str, str):  # Ensure it's a string
        return ""  # Return empty string instead of None

    text = ''.join(
        c for c in unicodedata.normalize('NFKD', input_str)
        if unicodedata.category(c) != 'Mn'
    )

    text = re.sub(r'[^\w\s]', '', text)  # <-- Remove punctuation

    return text


def check_answer():
    data = request.json
    user_answer = data.get("answer", "").strip().lower()
    correct_answer = data.get("correct_answer", "").strip().lower()

    user_answer_normalized = remove_accents(user_answer)
    correct_answer_normalized = remove_accents(correct_answer)

    # Ignore punctuation, but don't remove it permanently
    user_answer_normalized = re.sub(r'[^\w\s\']', '', user_answer_normalized)  # Keeps apostrophes
    correct_answer_normalized = re.sub(r'[^\w\s\']', '', correct_answer_normalized)

    return jsonify({"correct": user_answer_normalized == correct_answer_normalized})

@app.route('/stories')
def stories():
    return render_template('stories.html')


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
