// Portfolio — shared behavior (all pages link this one script)
//
// Currently handles: rendering the projects list on projects.html from
// data/projects.json. No content exists yet (Milestone 31 is scaffold-only,
// per the decision document §11) so this renders gracefully with an empty
// array.

function renderProjects(projects) {
  const list = document.getElementById("projects-list");
  const empty = document.getElementById("projects-empty");
  if (!list) {
    // Not on the projects page — nothing to do.
    return;
  }

  if (!Array.isArray(projects) || projects.length === 0) {
    if (empty) {
      empty.hidden = false;
    }
    return;
  }

  if (empty) {
    empty.hidden = true;
  }

  const fragment = document.createDocumentFragment();
  for (const project of projects) {
    const item = document.createElement("li");

    const title = document.createElement("h3");
    title.textContent = project.title || "Untitled project";
    item.appendChild(title);

    if (project.description) {
      const desc = document.createElement("p");
      desc.textContent = project.description;
      item.appendChild(desc);
    }

    if (project.url) {
      const link = document.createElement("a");
      link.href = project.url;
      link.textContent = "View project";
      item.appendChild(link);
    }

    fragment.appendChild(item);
  }
  list.appendChild(fragment);
}

function loadProjects() {
  const list = document.getElementById("projects-list");
  if (!list) {
    // Only fetch on pages that actually render the list.
    return;
  }

  fetch("data/projects.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load projects.json: " + response.status);
      }
      return response.json();
    })
    .then(renderProjects)
    .catch((err) => {
      console.error(err);
      const empty = document.getElementById("projects-empty");
      if (empty) {
        empty.hidden = false;
        empty.textContent = "Projects could not be loaded right now.";
      }
    });
}

document.addEventListener("DOMContentLoaded", loadProjects);
