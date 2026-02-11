const STORAGE_KEY = "gh_reviewer_shortlist";

function render(list) {
  const container = document.getElementById("list");
  const empty = document.getElementById("empty");

  container.innerHTML = "";

  if (list.length === 0) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  list.sort((a, b) => a.username.localeCompare(b.username, undefined, { sensitivity: "base" }));

  list.forEach((reviewer) => {
    const row = document.createElement("div");
    row.className = "reviewer";

    const img = document.createElement("img");
    img.src = reviewer.avatarUrl || "";
    img.alt = reviewer.username;

    const info = document.createElement("div");
    info.className = "reviewer-info";

    const username = document.createElement("span");
    username.className = "reviewer-username";
    username.textContent = reviewer.username;

    const name = document.createElement("span");
    name.className = "reviewer-name";
    name.textContent = reviewer.displayName || "";

    info.appendChild(username);
    if (reviewer.displayName) info.appendChild(name);

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.title = "Remove from favorites";
    removeBtn.textContent = "\u00D7";
    removeBtn.addEventListener("click", async () => {
      const current = await getShortlist();
      const updated = current.filter((r) => r.userId !== reviewer.userId);
      await saveShortlist(updated);
      render(updated);
    });

    row.appendChild(img);
    row.appendChild(info);
    row.appendChild(removeBtn);
    container.appendChild(row);
  });
}

function getShortlist() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (data) => {
      resolve(data[STORAGE_KEY] || []);
    });
  });
}

function saveShortlist(list) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: list }, resolve);
  });
}

getShortlist().then(render);
