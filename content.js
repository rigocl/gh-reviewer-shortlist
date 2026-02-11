(function () {
  "use strict";

  const STORAGE_KEY = "gh_reviewer_shortlist";
  let activeObservers = [];
  let storageMutex = Promise.resolve();
  let rebuildGeneration = 0;

  function withStorageLock(fn) {
    storageMutex = storageMutex.then(fn, fn);
    return storageMutex;
  }

  function getShortlist() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(STORAGE_KEY, (data) => {
        if (chrome.runtime.lastError) return resolve([]);
        const list = data[STORAGE_KEY];
        if (!Array.isArray(list)) return resolve([]);
        resolve(list.filter((r) => r && typeof r.userId === "string" && typeof r.username === "string"));
      });
    });
  }

  function saveShortlist(list) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [STORAGE_KEY]: list }, () => {
        if (chrome.runtime.lastError) console.warn("ghrs: storage write failed", chrome.runtime.lastError);
        resolve();
      });
    });
  }

  function extractReviewerData(label) {
    const checkbox = label.querySelector('input[name="reviewer_user_ids[]"]');
    const username = label.querySelector(".js-username");
    const description = label.querySelector(".js-description");
    const avatar = label.querySelector(".js-avatar");
    if (!checkbox || !username) return null;
    return {
      userId: checkbox.value,
      username: username.textContent.trim(),
      displayName: description ? description.textContent.trim() : "",
      avatarUrl: avatar ? avatar.src : "",
    };
  }

  const CHECK_PATH = "M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z";
  const STAR_FILLED_PATH = "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z";
  const STAR_OUTLINE_PATH = "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z";

  function makeSvg(pathD, classes) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("aria-hidden", "true");
    if (classes) svg.setAttribute("class", classes);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathD);
    svg.appendChild(path);
    return svg;
  }

  function createStarButton(isStarred) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ghrs-star-btn" + (isStarred ? " ghrs-starred" : "");
    btn.setAttribute("aria-label", isStarred ? "Remove from favorites" : "Add to favorites");
    btn.appendChild(makeSvg(isStarred ? STAR_FILLED_PATH : STAR_OUTLINE_PATH));
    return btn;
  }

  function createStarButtonWithHandler(data, isStarred, filterableContainer) {
    const star = createStarButton(isStarred);
    star.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      withStorageLock(async () => {
        const current = await getShortlist();
        const idx = current.findIndex((r) => r.userId === data.userId);
        const nowStarred = idx < 0;
        if (idx >= 0) {
          current.splice(idx, 1);
        } else {
          current.push(data);
        }
        await saveShortlist(current);
        star.replaceWith(createStarButtonWithHandler(data, nowStarred, filterableContainer));
        rebuildFavoritesSection(filterableContainer);
      });
    });
    return star;
  }

  function buildFavoriteLabel(reviewer) {
    const label = document.createElement("label");
    label.className = "select-menu-item text-normal ghrs-shortlist-item";
    label.setAttribute("role", "menuitemcheckbox");
    label.setAttribute("aria-checked", "false");
    label.setAttribute("tabindex", "0");
    label.dataset.ghrsUserId = reviewer.userId;

    const checkSvg = makeSvg(CHECK_PATH, "octicon octicon-check select-menu-item-icon");
    checkSvg.setAttribute("version", "1.1");
    label.appendChild(checkSvg);

    const input = document.createElement("input");
    input.style.display = "none";
    input.type = "checkbox";
    input.value = reviewer.userId;
    label.appendChild(input);

    const gravatar = document.createElement("div");
    gravatar.className = "select-menu-item-gravatar";
    const img = document.createElement("img");
    img.setAttribute("src", reviewer.avatarUrl || "");
    img.setAttribute("alt", "");
    img.setAttribute("size", "20");
    img.className = "avatar-small mr-1 avatar avatar-user";
    gravatar.appendChild(img);
    label.appendChild(gravatar);

    const textDiv = document.createElement("div");
    textDiv.className = "select-menu-item-text lh-condensed";
    const heading = document.createElement("span");
    heading.className = "select-menu-item-heading";
    const usernameSpan = document.createElement("span");
    usernameSpan.className = "js-username";
    usernameSpan.textContent = reviewer.username;
    const descSpan = document.createElement("span");
    descSpan.className = "description";
    descSpan.textContent = reviewer.displayName || "";
    heading.appendChild(usernameSpan);
    heading.appendChild(document.createTextNode(" "));
    heading.appendChild(descSpan);
    textDiv.appendChild(heading);
    label.appendChild(textDiv);

    return label;
  }

  function syncCheckboxes(wrapper, filterableContainer) {
    const shortlistItems = wrapper.querySelectorAll(".ghrs-shortlist-item");
    const realItems = filterableContainer.querySelectorAll(
      'label.select-menu-item:not(.ghrs-shortlist-item)'
    );

    shortlistItems.forEach((slItem) => {
      const userId = slItem.dataset.ghrsUserId;
      const slCheckbox = slItem.querySelector('input[type="checkbox"]');
      const realLabel = Array.from(realItems).find(
        (l) => l.querySelector('input[name="reviewer_user_ids[]"]')?.value === userId
      );

      if (realLabel) {
        const realCheckbox = realLabel.querySelector('input[name="reviewer_user_ids[]"]');
        slCheckbox.checked = realCheckbox.checked;
        slItem.setAttribute("aria-checked", String(realCheckbox.checked));

        slItem.addEventListener("click", (e) => {
          if (e.target.closest(".ghrs-star-btn")) return;
          e.preventDefault();
          e.stopPropagation();
          realLabel.click();
          setTimeout(() => {
            slCheckbox.checked = realCheckbox.checked;
            slItem.setAttribute("aria-checked", String(realCheckbox.checked));
          }, 50);
        });

        const observer = new MutationObserver(() => {
          slCheckbox.checked = realCheckbox.checked;
          slItem.setAttribute("aria-checked", String(realCheckbox.checked));
        });
        observer.observe(realLabel, { attributes: true, attributeFilter: ["aria-checked"] });
        activeObservers.push(observer);
      } else {
        slItem.classList.add("ghrs-shortlist-item--unavailable");
        slItem.setAttribute("title", "Not available for this repository");
      }
    });
  }

  function cleanupInjection(filterableContainer) {
    activeObservers.forEach((o) => o.disconnect());
    activeObservers = [];
    rebuildGeneration++;
    const menuList = filterableContainer.closest(".select-menu-list");
    if (menuList) {
      const existing = menuList.querySelector(".ghrs-favorites-wrapper");
      if (existing) existing.remove();
    }
    filterableContainer.querySelectorAll(".ghrs-star-btn").forEach((el) => el.remove());
    delete filterableContainer.dataset.ghrsInjected;
  }

  async function injectShortlist(filterableContainer) {
    if (filterableContainer.dataset.ghrsInjected) return;
    filterableContainer.dataset.ghrsInjected = "true";

    const shortlist = await getShortlist();
    const starredIds = new Set(shortlist.map((r) => r.userId));

    const realLabels = filterableContainer.querySelectorAll(
      'label.select-menu-item:not(.ghrs-shortlist-item)'
    );
    realLabels.forEach((label) => {
      if (label.querySelector(".ghrs-star-btn")) return;
      const data = extractReviewerData(label);
      if (!data || !data.userId) return;

      const starred = starredIds.has(data.userId);
      const star = createStarButtonWithHandler(data, starred, filterableContainer);
      label.style.position = "relative";
      label.appendChild(star);
    });

    rebuildFavoritesSection(filterableContainer);
  }

  async function rebuildFavoritesSection(filterableContainer) {
    activeObservers.forEach((o) => o.disconnect());
    activeObservers = [];

    const menuList = filterableContainer.closest(".select-menu-list");
    if (!menuList) return;

    // bump generation so any in-flight rebuild from a previous call becomes stale
    const myGeneration = ++rebuildGeneration;

    const shortlist = await getShortlist();

    // if another rebuild started while we awaited, bail out
    if (myGeneration !== rebuildGeneration) return;

    // remove any existing wrapper
    const existing = menuList.querySelector(".ghrs-favorites-wrapper");
    if (existing) existing.remove();

    if (shortlist.length === 0) return;

    shortlist.sort((a, b) => a.username.localeCompare(b.username, undefined, { sensitivity: "base" }));

    // build everything in a single wrapper div, then insert once (atomic)
    const wrapper = document.createElement("div");
    wrapper.className = "ghrs-favorites-wrapper";

    const divider = document.createElement("div");
    divider.className = "select-menu-divider ghrs-shortlist-divider";
    divider.textContent = "Favorites";
    wrapper.appendChild(divider);

    shortlist.forEach((reviewer) => {
      wrapper.appendChild(buildFavoriteLabel(reviewer));
    });

    menuList.insertBefore(wrapper, filterableContainer);

    syncCheckboxes(wrapper, filterableContainer);
  }

  function init() {
    const mainObserver = new MutationObserver(() => {
      const container = document.querySelector('[data-filterable-for="review-filter-field"]');
      if (container && !container.dataset.ghrsInjected) {
        const labels = container.querySelectorAll("label.select-menu-item");
        if (labels.length > 0) {
          injectShortlist(container);
        }
      }

      const details = document.getElementById("reviewers-select-menu");
      if (details && !details.dataset.ghrsWatching) {
        details.dataset.ghrsWatching = "true";
        details.addEventListener("toggle", () => {
          if (details.open) {
            const c = details.querySelector('[data-filterable-for="review-filter-field"]');
            if (!c) return;
            cleanupInjection(c);
            const labels = c.querySelectorAll("label.select-menu-item");
            if (labels.length > 0) {
              injectShortlist(c);
            }
            setTimeout(() => {
              if (!c.dataset.ghrsInjected) {
                const retryLabels = c.querySelectorAll("label.select-menu-item");
                if (retryLabels.length > 0) injectShortlist(c);
              }
            }, 500);
          }
        });
      }
    });

    mainObserver.observe(document.body, { childList: true, subtree: true });

    function resetInjection() {
      document.querySelectorAll('[data-filterable-for="review-filter-field"]').forEach((c) => {
        delete c.dataset.ghrsInjected;
      });
      const details = document.getElementById("reviewers-select-menu");
      if (details) delete details.dataset.ghrsWatching;
    }

    document.addEventListener("turbo:load", resetInjection);
    document.addEventListener("turbo:render", resetInjection);
    document.addEventListener("pjax:end", resetInjection);
  }

  init();
})();
