const RECIPE_DETAILS = {
  "Tortilla española": {
    description: "La tortilla española es un plato tradicional a base de papas, huevo y cebolla, cocinada a fuego lento hasta lograr una textura jugosa por dentro y dorada por fuera. Perfecta para un desayuno abundante o incluso como acompañamiento en cualquier comida.",
    ingredients: ["5 huevos grandes", "4 papas medianas", "1 cebolla mediana", "Aceite de oliva (200 ml)", "Sal", "Pimienta"],
    reviews: [
      { user: "Usuario777", date: "2026-08-20", rating: 4.5, text: "Me encanta la receta, es fácil de hacer. Lo único es que sabe mejor sin cebolla :)", cook: true, tags: ["#tradicional", "#casero"] },
      { user: "UsuarioMiMi", date: "2026-08-21", rating: 5, text: "Una receta clásica y sencilla. A todos les encantó. Sin duda la volvería a preparar.", cook: true, tags: ["#clásica", "#sencilla"] },
      { user: "Camila_R", date: "2026-08-15", rating: 4, text: "Muy rica, la hice para el desayuno del domingo y se acabó en minutos.", cook: true, tags: ["#casera"] },
      { user: "DonCarlos", date: "2026-08-02", rating: 4, text: "Quedó buena, aunque me tomó más tiempo del indicado.", cook: true, tags: ["#clásica"] },
    ],
  },
  "Pancakes": {
    description: "Esponjosos, dorados y listos en minutos. Los pancakes son el desayuno perfecto para empezar el fin de semana, y combinan con miel, frutas, mantequilla o la cobertura que prefieras.",
    ingredients: ["1 ½ tazas de harina de trigo", "3 ½ cucharaditas de polvo de hornear", "1 cucharadita de sal", "1 cucharada de azúcar", "1 ¼ tazas de leche", "1 huevo", "3 cucharadas de mantequilla derretida"],
    reviews: [],
  },
  "Caldo de costilla": {
    description: "Un caldo reconfortante, típico de las mañanas colombianas. La costilla de res se cocina lentamente con papa, cebolla y cilantro hasta lograr un sabor profundo, ideal para los días fríos o para recuperar energías.",
    ingredients: ["1 kg de costilla de res", "3 papas medianas", "2 ramas de cebolla larga", "1 manojo de cilantro", "2 dientes de ajo", "Comino", "Sal", "2 litros de agua"],
    reviews: [],
  },
  "Pan de banano": {
    description: "Un pan húmedo y aromático que aprovecha los bananos maduros. Se hornea en una sola tarea, dura varios días y es ideal para el desayuno, la onces o acompañar un café.",
    ingredients: ["3 bananos muy maduros", "2 tazas de harina de trigo", "1 cucharadita de bicarbonato", "½ cucharadita de sal", "½ taza de azúcar", "2 huevos", "⅓ de taza de mantequilla derretida", "½ taza de nueces (opcional)"],
    reviews: [],
  },
  "Pudín de chía": {
    description: "Un desayuno fresco que se prepara la noche anterior: las semillas de chía absorben la leche y quedan con textura cremosa. Se sirve con frutos rojos y un toque de menta.",
    ingredients: ["¼ de taza de semillas de chía", "1 taza de leche de almendras", "1 cucharada de miel", "½ cucharadita de esencia de vainilla", "Frutos rojos para servir", "Hojas de menta"],
    reviews: [],
  },
  "Arepa de huevo": {
    description: "Una arepa frita y crujiente de la costa colombiana, rellena de carne molida y un huevo que se cocina dentro de la masa. Contundente, dorada y perfecta para un desayuno especial.",
    ingredients: ["2 tazas de harina de maíz precocida", "1 ½ tazas de agua tibia", "1 cucharadita de sal", "4 huevos", "200 g de carne molida", "½ cebolla picada", "Aceite para freír"],
    reviews: [],
  },
  "Arepa paisa": {
    description: "La arepa paisa lleva todo lo que hace especial el desayuno antioqueño: chicharrón crocante, hogao casero, huevo y aguacate sobre una arepa recién asada. Contundente y perfecta para empezar el día con mucha energía.",
    ingredients: ["4 arepas de maíz", "200 g de chicharrón", "1 taza de hogao", "4 huevos", "1 aguacate", "Sal"],
    reviews: [],
  },
  "Tamal peruano": {
    description: "Masa suave de maíz rellena de cerdo, aceitunas y huevo, envuelta en hoja de plátano y cocida al vapor. Un desayuno tradicional del Perú, aromático y muy reconfortante.",
    ingredients: ["500 g de maíz molido", "300 g de carne de cerdo", "3 cucharadas de pasta de ají amarillo", "2 huevos duros", "Aceitunas negras", "100 g de manteca", "Hojas de plátano", "Sal"],
    reviews: [],
  },
  "Tostadas francesas": {
    description: "Pan remojado en una mezcla de huevo, leche y canela, dorado en la sartén hasta quedar crujiente por fuera y suave por dentro. Una forma deliciosa de aprovechar el pan del día anterior.",
    ingredients: ["6 rebanadas de pan", "3 huevos", "½ taza de leche", "1 cucharadita de canela", "1 cucharada de mantequilla", "Miel o azúcar glas para servir"],
    reviews: [],
  },
  "Chilaquiles verdes": {
    description: "Totopos de maíz bañados en una salsa verde de tomatillo y chile, terminados con crema y queso fresco. Un desayuno mexicano con carácter, ideal para quienes disfrutan los sabores intensos.",
    ingredients: ["12 tortillas de maíz", "8 tomatillos", "2 chiles serranos", "½ cebolla", "1 manojo de cilantro", "Crema", "Queso fresco", "Aceite para freír"],
    reviews: [],
  },
  "Batido vegano": {
    description: "Un batido cremoso, sin productos de origen animal y cargado de antioxidantes. Los arándanos y el banano le dan dulzor natural, y la chía aporta fibra y saciedad para toda la mañana.",
    ingredients: ["1 taza de arándanos", "1 banano congelado", "1 taza de leche de almendras", "1 cucharada de semillas de chía", "1 cucharadita de sirope de agave"],
    reviews: [],
  },
  "Changua": {
    description: "La changua es un desayuno tradicional de Boyacá y Cundinamarca: una sopa suave de leche con huevo, cebolla larga y cilantro, servida con pan. Sencilla, calentita y perfecta para las mañanas frías.",
    ingredients: ["2 tazas de leche", "2 tazas de agua", "4 huevos", "3 ramas de cebolla larga", "1 manojo de cilantro", "4 panes del día anterior", "Sal"],
    reviews: [],
  },
};
