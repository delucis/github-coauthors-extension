// @ts-check

async function loadOptions() {
  const settings = await getSettings();

  /** @type {HTMLInputElement!} */ (
    document.getElementById("stripExistingCoAuthors")
  ).checked = settings.stripExistingCoAuthors;
}

/** @param {SubmitEvent} event */
async function handleSubmit(event) {
  if (!(event.target instanceof HTMLFormElement)) return;
  event.preventDefault();
  const data = new FormData(event.target);

  const stripExistingCoAuthors = data.get("stripExistingCoAuthors") === "on";

  await saveSettings({ stripExistingCoAuthors });
}

document.addEventListener("DOMContentLoaded", loadOptions);
document.querySelector("form")?.addEventListener("submit", handleSubmit);
