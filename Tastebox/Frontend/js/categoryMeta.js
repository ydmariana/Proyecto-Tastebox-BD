(() => {
  "use strict";

  const CATEGORIES = {
    "breakfast": { label: "Desayunos", icon: "fa-solid fa-egg", intro: "¡Un gran día siempre empieza con un gran desayuno al estilo tastebox! Comenzar el día con un buen desayuno no solo te da energía, sino que también ayuda a regular tu metabolismo y a mantener niveles estables de azúcar en la sangre. Incluir alimentos nutritivos desde temprano favorece mejores hábitos alimenticios y te prepara físico y mentalmente para afrontar el resto del día." },
    "lunch": { label: "Almuerzos", icon: "fa-solid fa-utensils", intro: "El almuerzo es el plato fuerte del día. Aquí encuentras recetas completas y balanceadas, desde clásicos de la cocina colombiana hasta opciones de otras partes del mundo, para que cada mediodía sea una comida que realmente disfrutes y te dé energía para toda la tarde." },
    "snacks": { label: "Snacks", icon: "fa-solid fa-cookie-bite", intro: "Para esos antojos entre comidas, nada mejor que un snack hecho en casa. Descubre bocados rápidos, crocantes y llenos de sabor, ideales para compartir en una reunión o para acompañar tu película favorita." },
    "dinner": { label: "Cenas", icon: "fa-solid fa-moon", intro: "Cerrar el día con una cena ligera y sabrosa ayuda a descansar mejor. Estas recetas son fáciles de preparar, no te quitan mucho tiempo y te permiten terminar la jornada en familia con algo caliente y reconfortante." },
    "soups": { label: "Sopas", icon: "fa-solid fa-bowl-food", intro: "Una buena sopa abraza desde la primera cucharada. Reunimos caldos, cremas y sopas tradicionales que reconfortan, alimentan y se pueden preparar con ingredientes sencillos que ya tienes en casa." },
    "salads": { label: "Ensaladas", icon: "fa-solid fa-leaf", intro: "Frescas, coloridas y llenas de nutrientes. Las ensaladas pueden ser mucho más que un acompañamiento: combinadas con proteínas, granos y buenos aderezos se convierten en un plato principal completo y delicioso." },
    "fish": { label: "Pescados", icon: "fa-solid fa-fish", intro: "Los pescados y mariscos aportan proteína de calidad y grasas saludables. Aprende a prepararlos al horno, a la plancha o en cazuela, con técnicas sencillas que respetan su sabor y su textura." },
    "meats": { label: "Carnes", icon: "fa-solid fa-drumstick-bite", intro: "Jugosas, doradas y llenas de sabor. Desde cortes a la parrilla hasta guisos que se cocinan lentamente, estas recetas de carnes te ayudan a lograr platos fuertes dignos de un día especial." },
    "pasta": { label: "Pastas", icon: "fa-solid fa-wheat-awn", intro: "La pasta es sinónimo de comida en familia. Encuentra salsas cremosas, frescas y tradicionales para acompañar espagueti, penne, lasaña y más, listas en pocos minutos." },
    "cakes": { label: "Esponjados", icon: "fa-solid fa-cake-candles", intro: "Suaves, esponjosos y perfectos para celebrar. Aquí están las tortas y ponqués que alegran cualquier cumpleaños o tarde de café, con trucos para que te queden altos y húmedos." },
    "baked": { label: "Horneados", icon: "fa-solid fa-bread-slice", intro: "El aroma del horno recién encendido lo dice todo. Galletas, panes y pasteles caseros para quienes disfrutan amasar, hornear y compartir algo hecho con las propias manos." },
    "healthy": { label: "Dietéticos", icon: "fa-solid fa-apple-whole", intro: "Comer rico y cuidarte sí es posible. Recetas con menos azúcar, más fibra y porciones equilibradas, pensadas para quienes buscan una alimentación consciente sin renunciar al sabor." },
    "christmas": { label: "Navidad", icon: "fa-solid fa-tree", intro: "La Navidad se disfruta mejor alrededor de la mesa. Prepara los platos y dulces tradicionales de la temporada, desde la natilla y los buñuelos hasta la cena de Nochebuena." },
    "new-year": { label: "Año nuevo", icon: "fa-solid fa-champagne-glasses", intro: "Recibe el año con una mesa que brille. Ideas para brindar, picar y celebrar la medianoche, con recetas fáciles de adelantar para que tú también disfrutes de la fiesta." },
    "halloween": { label: "Halloween", icon: "fa-solid fa-ghost", intro: "¡Dulce o truco! Recetas divertidas y un poco tenebrosas para sorprender a grandes y pequeños, con decoraciones sencillas que convierten cualquier plato en parte de la fiesta." },
    "valentines": { label: "San valentín", icon: "fa-solid fa-heart", intro: "El amor también se cocina. Platos románticos y postres para compartir en pareja o con quienes más quieres, pensados para lucirte sin pasar horas en la cocina." },
    "smoothies": { label: "Batidos", icon: "fa-solid fa-blender", intro: "Cargados de fruta, vitaminas y energía. Los batidos son perfectos para empezar la mañana o recuperarte después de entrenar, y se preparan en menos de cinco minutos." },
    "milkshakes": { label: "Malteadas", icon: "fa-solid fa-glass-water", intro: "Cremosas, frías y muy antojables. Prepara malteadas de tus sabores favoritos con pocos ingredientes y una licuadora, ideales para consentirte en una tarde calurosa." },
    "juices": { label: "Jugos", icon: "fa-solid fa-martini-glass-citrus", intro: "Refrescantes y naturales. Desde jugos clásicos hasta combinaciones tropicales y limonadas especiales, para hidratarte con el sabor de la fruta fresca." },
  };

  const normalize = (text) => String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const DEFAULT_ICON = "fa-solid fa-utensils";

  const byKey = (key) => (Object.prototype.hasOwnProperty.call(CATEGORIES, key) ? { key, ...CATEGORIES[key] } : null);

  const forRecipe = (recipe) => {
    const wanted = normalize(recipe.cuisine_type);
    const key = Object.keys(CATEGORIES).find((k) => normalize(CATEGORIES[k].label) === wanted);
    return key ? { key, ...CATEGORIES[key] } : { key: "", label: recipe.cuisine_type, icon: DEFAULT_ICON, intro: "" };
  };

  window.TasteboxCategories = { all: CATEGORIES, byKey, forRecipe, DEFAULT_ICON };
})();
