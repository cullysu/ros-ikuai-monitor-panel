(function () {
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  ready(function () {
    document.body.classList.add("ik-legacy-shell-ready");

    document.querySelectorAll("[data-section]").forEach(function (node) {
      node.addEventListener("click", function () {
        document.querySelectorAll("[data-section].is-active").forEach(function (active) {
          active.classList.remove("is-active");
        });
        node.classList.add("is-active");
      });
    });

    document.querySelectorAll("[data-quick-search-open]").forEach(function (button) {
      button.addEventListener("click", function () {
        document.body.dataset.quickSearchRequested = "true";
      });
    });

    document.querySelectorAll("[data-readonly-info-open]").forEach(function (button) {
      button.addEventListener("click", function () {
        document.body.dataset.readonlyInfoRequested = "true";
      });
    });
  });
})();
