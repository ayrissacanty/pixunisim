/* Sets the app-wide look before anything else loads. The Pixar 3D-animated-film look is the default; tools/build_netlify.py injects this as the first script of every shipped page. */
(function () {
  var LOOK = "pixar";
  window.UNIFY_LOOK = LOOK;
  document.documentElement.setAttribute("data-look", LOOK);
  if (LOOK === "pixar") {
    var CS = document.currentScript;
    var l = document.createElement("link"); l.rel = "stylesheet";
    l.href = CS && CS.src ? CS.src.replace(/look\.js.*$/, "pixar-ui.css") : "pixar-ui.css";
    document.head.appendChild(l);
  }
})();
