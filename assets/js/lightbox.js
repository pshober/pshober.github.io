/* Tiny vanilla lightbox for gallery figures. No dependencies.
   Any element with [data-lightbox] (and a child <img>) becomes clickable;
   uses data-full for the large image and data-cap for the caption. */
(function () {
  "use strict";
  var items = document.querySelectorAll("[data-lightbox]");
  if (!items.length) return;

  var box = document.createElement("div");
  box.className = "lightbox";
  box.innerHTML =
    '<button class="lightbox__close" aria-label="Close">&times;</button>' +
    '<img alt="">' +
    '<div class="lightbox__cap"></div>';
  document.body.appendChild(box);

  var bImg = box.querySelector("img");
  var bCap = box.querySelector(".lightbox__cap");

  function open(full, cap, alt) {
    bImg.src = full;
    bImg.alt = alt || "";
    bCap.textContent = cap || "";
    box.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function close() {
    box.classList.remove("is-open");
    document.body.style.overflow = "";
    bImg.src = "";
  }

  items.forEach(function (el) {
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    function trigger() {
      var img = el.querySelector("img");
      open(el.getAttribute("data-full") || (img && img.src),
           el.getAttribute("data-cap"),
           img && img.alt);
    }
    el.addEventListener("click", trigger);
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trigger(); }
    });
  });

  box.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
})();
