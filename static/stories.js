const stories = [
  {
    title: "The Grumpy Fisherman",
    image: "/static/images/the_grumpy_fisherman.png",
    pages: [
      { image: "/static/images/the_grumpy_fisherman.png", text: "Once upon a time, in a quiet village, a grumpy fisherman lived by the sea." },
      { image: "page2.jpg", text: "Though he had a loyal dog and a kind cat, he rarely smiled." },
      { image: "page3.jpg", text: "One day, the dog jumped into the water to fetch his lost net." },
      { image: "page4.jpg", text: "The cat meowed from the shore. The fisherman finally smiled, realizing he was never alone." }
    ]
  }
];

let currentStoryIndex = null;
let currentPageIndex = 0;

// DOM elements
const storyListEl = document.getElementById("story-list");
const nextButton = document.getElementById("next-button");

// Setup story list
function populateStoryList() {
  storyListEl.innerHTML = "";
  stories.forEach((story, index) => {
    const li = document.createElement("li");
    li.textContent = story.title;
    li.onclick = () => startStory(index);
    storyListEl.appendChild(li);
  });
}

// Start story
function startStory(index) {
  currentStoryIndex = index;
  currentPageIndex = 0;

  updatePages(); // IMPORTANT: must be called to update image and text
}


// Updates both left and right page
function updatePages() {
  const story = stories[currentStoryIndex];
  const leftPage = story.pages[currentPageIndex];
  const rightPage = story.pages[currentPageIndex + 1];

  // Buttons
  nextButton.textContent =
    currentPageIndex + 2 >= story.pages.length ? "Back to Content" : "Next →";
}


// Next
function goToNextPage() {
  console.log("Next button clicked"); // for testing
  if (currentStoryIndex === null) {
    startStory(0); // Start first story
    return;
  }

  const story = stories[currentStoryIndex];
  if (currentPageIndex + 1 < story.pages.length) {
    currentPageIndex += 1;
    flipBookAnimation();
    updatePages();
  } else {
    // Back to story list
    currentStoryIndex = null;
    currentPageIndex = 0;
    nextButton.textContent = "Next →";
  }
}

// Previous
function goToPreviousPage() {
  if (currentPageIndex >= 2) {
    currentPageIndex -= 2;
    flipBookAnimation();
    updatePages();
  }
}

// Flip animation
function flipBookAnimation() {
  document.querySelector(".left-page").style.transform = "rotateY(-5deg)";
  document.querySelector(".right-page").style.transform = "rotateY(5deg)";
  setTimeout(() => {
    document.querySelector(".left-page").style.transform = "rotateY(0deg)";
    document.querySelector(".right-page").style.transform = "rotateY(0deg)";
  }, 400);
}

// Initialize
populateStoryList();