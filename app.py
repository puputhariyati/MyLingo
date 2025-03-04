from flask import Flask, render_template, jsonify, request, redirect, url_for, flash, session
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
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
login_manager.init_app(app)
login_manager.login_view = 'login'

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        # Check if the username already exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash('Username already exists. Please choose another one.', 'danger')
            return redirect(url_for('signup'))

        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(username=username, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

        # Automatically log in the user
        login_user(new_user)
        flash('Account created successfully! You are now logged in.', 'success')
        return redirect(url_for('index'))  # Redirect to homepage

    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            flash('Logged in successfully!', 'success')
            return redirect(url_for('index'))  # Redirect to homepage
        else:
            flash('Invalid username or password.', 'danger')
    return redirect(url_for('index'))  # Redirect to homepage


@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=current_user)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))


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
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row  # Enables dictionary-like access
    return conn


@app.route('/')
def index():
    db = get_db()
    cursor = db.cursor()

    # Get filters from request args
    selected_alphabet = request.args.get("alphabet", "")
    selected_tags = request.args.getlist("tags")
    selected_sort = request.args.get("sort", "newest")
    page = int(request.args.get("page", 1))  # Default to page 1
    words_per_page = 20  # Limit words per page

    # Fetch all words
    query = "SELECT * FROM vocabulary"
    conditions = []

    # Apply filters
    if selected_alphabet:
        conditions.append(f"word LIKE '{selected_alphabet}%'")

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

    # Count total words
    cursor.execute(query)
    total_words = len(cursor.fetchall())

    # Apply pagination
    offset = (page - 1) * words_per_page
    query += f" LIMIT {words_per_page} OFFSET {offset}"
    cursor.execute(query)
    words = cursor.fetchall()

    # Pagination variables
    total_pages = math.ceil(total_words / words_per_page)

    # Fetch unique tags
    cursor.execute("SELECT tags FROM vocabulary")
    all_tags = cursor.fetchall()
    tag_set = set()
    for row in all_tags:
        if row["tags"]:
            tag_list = [tag.strip() for tag in row["tags"].split(",") if tag.strip()]
            tag_set.update(tag_list)

    db.close()

    return render_template(
        'index.html',
        words=words,
        tags=sorted(tag_set),  # ✅ Ensure tag_set is defined
        selected_alphabet=selected_alphabet,
        selected_tags=selected_tags,
        selected_sort=selected_sort,
        page=page,  # ✅ Fixed missing comma
        total_pages=total_pages
    )


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
    tags = get_all_tags()  # Ensure this function fetches tags
    selected_tag = request.args.getlist('tags')
    meanings, words, word_dict = get_game_data(selected_tag)  # Modify logic to apply filtering

    # Ensure exactly 5 pairs are selected
    selected_pairs = random.sample(list(word_dict.items()), min(5, len(word_dict)))

    # Extract words & meanings from selected pairs
    words = [pair[0] for pair in selected_pairs]
    meanings = [pair[1] for pair in selected_pairs]

    # Shuffle words and meanings separately to prevent alignment
    random.shuffle(words)
    random.shuffle(meanings)

    return render_template('game.html',
                           tags=tags,
                           selected_tag=selected_tag,
                           meanings=meanings,
                           words=words,
                           word_dict=word_dict)


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


@app.route("/update_pairs", methods=["POST"])
def update_pairs():
    global active_pairs, all_pairs
    tags = get_all_tags()  # Ensure this function fetches tags
    selected_tag = request.args.getlist('tags')
    meanings, words, word_dict = get_game_data(selected_tag)  # Modify logic to apply filtering
    data = request.get_json()
    matched_word = data.get("matched_word")

    # Fetch updated words from database
    meanings, words, word_dict = get_game_data()

    print(f"🔹 Matched word received: {matched_word}")  # Debugging

    before_removal = list(active_pairs)  # Before state
    active_pairs = [pair for pair in active_pairs if
                    pair[0] != matched_word and pair[1] != matched_word]  # Remove matched pair

    print(f"✅ Before removal: {before_removal}")
    print(f"✅ After removal: {active_pairs}")

    # Add new pair if available
    if all_pairs:
        new_pair = all_pairs.pop(0)
        active_pairs.append(new_pair)
        print(f"✅ Added new pair: {new_pair}")
        print(f"✅ Updated active pairs: {active_pairs}")

    # 🔥 Ensure active_pairs contains max 5 pairs only
    active_pairs = active_pairs[:5]

    return jsonify(new_pairs=active_pairs)


@app.route("/quiz")
def quiz():
    return render_template("quiz.html")


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


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
