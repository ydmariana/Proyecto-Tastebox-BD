(() => {
  const slides = document.querySelectorAll("#hero .carousel__slide");
  if (slides.length < 2) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let current = 0;

  const show = (i) => {
    slides[current].classList.remove("is-active");
    current = (i + slides.length) % slides.length;
    slides[current].classList.add("is-active");
  };

  if (!reduceMotion) setInterval(() => show(current + 1), window.TasteboxConfig.HERO_CAROUSEL_MS);
})();

(() => {
  const track = document.querySelector(".recipes__track");
  const prev = document.querySelector(".recipes__arrow--prev");
  const next = document.querySelector(".recipes__arrow--next");
  const box = document.getElementById("recipes");
  if (!track) return;
  const { MOBILE_MAX_WIDTH_PX, RECIPE_CAROUSEL_MS } = window.TasteboxConfig;

  const setup = () => {
    const cards = [...track.querySelectorAll(".card")];
    if (!cards.length) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let index = 0;
    let timer = null;

    const perView = () => (window.innerWidth <= MOBILE_MAX_WIDTH_PX ? 1 : 3);
    const maxIndex = () => Math.max(0, cards.length - perView());

    const update = () => {
      index = Math.min(index, maxIndex());
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const step = cards[0].offsetWidth + gap;
      track.style.transform = `translateX(${-index * step}px)`;
    };

    const goNext = () => { index = index >= maxIndex() ? 0 : index + 1; update(); };
    const goPrev = () => { index = index <= 0 ? maxIndex() : index - 1; update(); };

    const start = () => { if (!reduceMotion && !timer && cards.length > perView()) timer = setInterval(goNext, RECIPE_CAROUSEL_MS); };
    const stop = () => { clearInterval(timer); timer = null; };

    prev.addEventListener("click", () => { goPrev(); stop(); start(); });
    next.addEventListener("click", () => { goNext(); stop(); start(); });

    box.addEventListener("mouseenter", stop);
    box.addEventListener("mouseleave", start);
    box.addEventListener("focusin", stop);
    box.addEventListener("focusout", start);

    window.addEventListener("resize", update);
    update();
    start();
  };

  if (track.querySelector(".card")) setup();
  else document.addEventListener("tastebox:recipes-ready", setup, { once: true });
})();
