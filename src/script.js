// Prefix all console logs with [Backloggd+Steam]
(() => {
  const prefix = "[Backloggd+Steam]";
  const originalLog = console.log.bind(console);
  console.log = function (...args) {
    originalLog(prefix, ...args);
  };
})();

// Normalize strings for comparison
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function displayPopup(message, error = false) {
    color = "#135183";
    if (error) {
        message = "❌ " + message;
        color = "#ff7474ff";
    }
    const style = `position:fixed;
    bottom:20px;
    right:20px;
    padding:10px 20px;
    background-color:${color};
    color:white;
    border-radius:5px;
    z-index:10000;
    font-family:Arial,
    sans-serif;
    font-size:14px;
    box-shadow:0 2px 10px rgba(0, 0, 0, 0.5);
    opacity:1;
    transition:opacity 0.5s ease-out;`;

    document.body.innerHTML += `<div
    id="extension-popup"
    style="${style}">
        <img src="https://store.steampowered.com/favicon.ico" width="16" style="vertical-align:middle; margin-right:8px;">
        </img>
        ${message}
    </div>`;

    const popup = document.getElementById("extension-popup");
    setTimeout(() => {
      popup.style.opacity = "0";
      setTimeout(() => popup.remove(), 500);
    }, 3000);
}

// Wait for a DOM element to appear
function waitForElement(selector, timeout = 5000, interval = 200) {
  return new Promise((resolve, reject) => {
    const endTime = Date.now() + timeout;

    function check() {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (Date.now() > endTime) return reject(`Timeout waiting for ${selector}`);
      setTimeout(check, interval);
    }
    check();
  });
}

// Fetch Steam game info from backend
async function getSteamGameInfo(gameName) {
  const url = `https://api.cowokie.dev/steam/game?term=${encodeURIComponent(gameName)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.found) {
      console.log(`The game '${gameName}' wasn't found on Steam.`);
      return null;
    }

    // Vérification du nom avec normalize
    const normalizedTitle = normalize(data.title);
    const normalizedGameName = normalize(gameName);
    console.log("Title found -", data.title);
    console.log("Normalized title -", normalizedTitle);
    console.log("Normalized game name -", normalizedGameName);

    if (!normalizedTitle.includes(normalizedGameName)) {
        console.log(`Title mismatch: '${data.title}' does not match '${gameName}'`);
        throw new Error(`Title mismatch: '${data.title}' does not match '${gameName}'`);
    }

    console.log("Steam data received:", data);
    return data; // { title, appid, link, image }
  } catch (error) {
    console.error("Error fetching Steam data:", error);
    throw error;
  }
}

// Scrap game name from Backloggd page
function scrapGameName() {
  const byDiv = document.getElementsByClassName("filler-text");
  if (!byDiv.length) return null;

  const headerDiv = byDiv[0].parentElement?.parentElement;
  const gameNameDiv = headerDiv?.getElementsByClassName("mb-0")[0];
  if (!gameNameDiv) return null;

  const gameName = gameNameDiv.innerText.trim();
  console.log("Scraped game name:", gameName);
  return gameName;
}

// Add Steam link to page
function addSteamLink(link) {
  if (!link) return;

  console.log("Adding the link to the page.\n");

  const elements = document.querySelectorAll("a");
  const element = [...elements].find((el) => el.textContent.trim() === "IGDB");

  const subelement = element?.parentElement;
  if (subelement) {
    subelement.innerHTML += ` and <a href="${encodeURI(link)}" target="_blank">
      Steam
      <img src="https://store.steampowered.com/favicon.ico" width="20">
    </a>`;
  }
}

// Wait for URL change
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    executeScript();
  }
});
observer.observe(document, { subtree: true, childList: true });

// Main execution
async function executeScript() {
  const regex = /^https:\/\/backloggd.com\/games\/[^/]+\/$/;
  let gameName = "";
  console.log("Checking URL -", lastUrl);

  if (!regex.test(lastUrl)) {
    console.log("URL did not match a game page, script not executed.\n");
    return;
  }

  console.log("URL corresponds to a game page, waiting for DOM...\n");

  try {
    await waitForElement("#game-body");
    console.log("DOM ready, executing script...\n");

    gameName = scrapGameName();
    if (!gameName) {
      console.log("Could not scrape game name, aborting.");
      return;
    }

    const steamData = await getSteamGameInfo(gameName);

    addSteamLink(steamData.link);
    console.log("Steam link added successfully:", steamData.link);
    displayPopup(`${steamData.title} : Steam link added to the page!`);
  } catch (error) {
    console.error(error);
    displayPopup(`${gameName} :  Couldn't add the Steam link to the page.`, true);
  }
}

// Initial execution
executeScript();
