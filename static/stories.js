let currentPageIndex = 0;

const coverPages = document.getElementById("cover-pages");
const storyPages = document.getElementById("story-pages");

const storyLeftText = document.getElementById("story-text-left");
const storyRightText = document.getElementById("story-text-right");

// Get all story contents from hidden HTML
const storyContents = Array.from(document.querySelectorAll("#hidden-story-pages .story-content"));

function goToNextPage() {
  if (currentPageIndex === 0) {
    coverPages.style.display = "none";
    storyPages.style.display = "flex";
    currentPageIndex = 1;
    updatePages();
  } else if (currentPageIndex + 1 < storyContents.length) {
    currentPageIndex += 2;
    updatePages();
  } else {
    // No more pages, back to cover
    storyPages.style.display = "none";
    coverPages.style.display = "flex";
    currentPageIndex = 0;
  }
}

function goToPreviousPage() {
  if (currentPageIndex === 1) {
    storyPages.style.display = "none";
    coverPages.style.display = "flex";
    currentPageIndex = 0;
  } else if (currentPageIndex >= 2) {
    currentPageIndex -= 2;
    updatePages();
  }
}

function updatePages() {
  storyLeftText.innerHTML = storyContents[currentPageIndex]?.innerHTML || "";
  storyRightText.innerHTML = storyContents[currentPageIndex + 1]?.innerHTML || "";
}
