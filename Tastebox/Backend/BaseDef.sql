
SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';


CREATE SCHEMA IF NOT EXISTS `tasteBox` DEFAULT CHARACTER SET utf8 ;
USE `tasteBox` ;

CREATE TABLE IF NOT EXISTS `tasteBox`.`subscription` (
  `id_subscription` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(45) NOT NULL,
  `price` INT UNSIGNED NOT NULL DEFAULT 0,
  `features` TEXT NULL,
  `monthly_recipe_limit` INT UNSIGNED NULL,
  `trial_days` INT UNSIGNED NULL,
  PRIMARY KEY (`id_subscription`))
ENGINE = InnoDB;


CREATE TABLE IF NOT EXISTS `tasteBox`.`user` (
  `email` VARCHAR(45) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `id_user` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role` TINYINT(0) NOT NULL,
  `subscription_id_subscription` INT UNSIGNED NOT NULL,
  `username` VARCHAR(30) NULL,
  `full_name` VARCHAR(60) NULL,
  `address` VARCHAR(100) NULL,
  `phone` VARCHAR(20) NULL,
  `photo` MEDIUMTEXT NULL,
  `subscription_started_at` DATETIME NULL,
  `subscription_renews_at` DATETIME NULL,
  `subscription_expires_at` DATETIME NULL,
  PRIMARY KEY (`id_user`),
  UNIQUE INDEX `e-mail_UNIQUE` (`email` ASC) VISIBLE,
  INDEX `fk_user_subscription1_idx` (`subscription_id_subscription` ASC) VISIBLE,
  CONSTRAINT `fk_user_subscription1`
    FOREIGN KEY (`subscription_id_subscription`)
    REFERENCES `tasteBox`.`subscription` (`id_subscription`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


CREATE TABLE IF NOT EXISTS `tasteBox`.`recipe` (
  `id_recipe` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(45) NOT NULL,
  `difficulty_level` INT UNSIGNED NOT NULL,
  `cuisine_type` VARCHAR(45) NOT NULL,
  `description` TEXT NOT NULL,
  `preparation_date` DATETIME NOT NULL,
  `minutes` INT UNSIGNED NOT NULL DEFAULT 0,
  `image` VARCHAR(255) NULL,
  `verified` TINYINT NOT NULL DEFAULT 0,
  `is_premium` TINYINT NOT NULL DEFAULT 0,
  `ingredients` TEXT NULL,
  PRIMARY KEY (`id_recipe`))
ENGINE = InnoDB;


CREATE TABLE IF NOT EXISTS `tasteBox`.`review` (
  `id_review` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `date` DATE NOT NULL,
  `tags` VARCHAR(45) NULL,
  `comments` VARCHAR(255) NULL,
  `rating` TINYINT UNSIGNED NULL,
  `cook_it_again` TINYINT(0) NOT NULL,
  `user_id_user` INT UNSIGNED NOT NULL,
  `recipe_id_recipe` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_review`),
  INDEX `fk_Review_User1_idx` (`user_id_user` ASC) VISIBLE,
  INDEX `fk_Review_Recipe1_idx` (`recipe_id_recipe` ASC) VISIBLE,
  CONSTRAINT `fk_Review_User1`
    FOREIGN KEY (`user_id_user`)
    REFERENCES `tasteBox`.`user` (`id_user`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Review_Recipe1`
    FOREIGN KEY (`recipe_id_recipe`)
    REFERENCES `tasteBox`.`recipe` (`id_recipe`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


CREATE TABLE IF NOT EXISTS `tasteBox`.`save_recipes` (
  `recipe_id_recipe` INT UNSIGNED NOT NULL,
  `user_id_user` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`recipe_id_recipe`, `user_id_user`),
  INDEX `fk_Recipe_has_User_User1_idx` (`user_id_user` ASC) VISIBLE,
  INDEX `fk_Recipe_has_User_Recipe1_idx` (`recipe_id_recipe` ASC) VISIBLE,
  CONSTRAINT `fk_Recipe_has_User_Recipe1`
    FOREIGN KEY (`recipe_id_recipe`)
    REFERENCES `tasteBox`.`recipe` (`id_recipe`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Recipe_has_User_User1`
    FOREIGN KEY (`user_id_user`)
    REFERENCES `tasteBox`.`user` (`id_user`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


CREATE TABLE IF NOT EXISTS `tasteBox`.`collection` (
  `id_collection` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(40) NOT NULL,
  `image` MEDIUMTEXT NULL,
  `user_id_user` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_collection`),
  UNIQUE INDEX `uq_collection_user_name` (`user_id_user` ASC, `name` ASC) VISIBLE,
  CONSTRAINT `fk_collection_user1`
    FOREIGN KEY (`user_id_user`)
    REFERENCES `tasteBox`.`user` (`id_user`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


CREATE TABLE IF NOT EXISTS `tasteBox`.`collection_recipes` (
  `collection_id_collection` INT UNSIGNED NOT NULL,
  `recipe_id_recipe` INT UNSIGNED NOT NULL,
  `added_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`collection_id_collection`, `recipe_id_recipe`),
  INDEX `fk_collection_recipes_recipe1_idx` (`recipe_id_recipe` ASC) VISIBLE,
  CONSTRAINT `fk_collection_recipes_collection1`
    FOREIGN KEY (`collection_id_collection`)
    REFERENCES `tasteBox`.`collection` (`id_collection`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_collection_recipes_recipe1`
    FOREIGN KEY (`recipe_id_recipe`)
    REFERENCES `tasteBox`.`recipe` (`id_recipe`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;

INSERT INTO subscription (name, price, features, monthly_recipe_limit, trial_days)
VALUES ('Gratuito', 0, 'Acceso limitado a recetas al mes\nGuardar recetas en tu colección\nDejar reseñas', 25, 12);

INSERT INTO subscription (name, price, features, monthly_recipe_limit, trial_days)
VALUES ('Premium', 26000, 'Recetas ilimitadas\nCaja de ingredientes semanales\nSeguimiento de hábitos completo', NULL, NULL);


INSERT INTO recipe (name, difficulty_level, cuisine_type, description, minutes, image, verified, is_premium, ingredients, preparation_date)
SELECT t.name, t.difficulty_level, t.cuisine_type, t.description, t.minutes, t.image, t.verified, t.is_premium, t.ingredients, NOW()
FROM (
  SELECT 'Tortilla española' AS name, 1 AS difficulty_level, 'Desayunos' AS cuisine_type, 'La tortilla española es un plato tradicional a base de papas, huevo y cebolla, cocinada a fuego lento hasta lograr una textura jugosa por dentro y dorada por fuera. Perfecta para un desayuno abundante o incluso como acompañamiento en cualquier comida.' AS description, 15 AS minutes, 'desayunos/tortilla-espanola.jpg' AS image, 1 AS verified, 0 AS is_premium, '5 huevos grandes\n4 papas medianas\n1 cebolla mediana\nAceite de oliva (200 ml)\nSal\nPimienta' AS ingredients
  UNION ALL SELECT 'Pancakes', 1, 'Desayunos', 'Esponjosos, dorados y listos en minutos. Los pancakes son el desayuno perfecto para empezar el fin de semana, y combinan con miel, frutas, mantequilla o la cobertura que prefieras.', 10, 'desayunos/pancakes.jpg', 1, 0, '1 ½ tazas de harina de trigo\n3 ½ cucharaditas de polvo de hornear\n1 cucharadita de sal\n1 cucharada de azúcar\n1 ¼ tazas de leche\n1 huevo\n3 cucharadas de mantequilla derretida'
  UNION ALL SELECT 'Caldo de costilla', 3, 'Desayunos', 'Un caldo reconfortante, típico de las mañanas colombianas. La costilla de res se cocina lentamente con papa, cebolla y cilantro hasta lograr un sabor profundo, ideal para los días fríos o para recuperar energías.', 35, 'desayunos/caldo-de-costilla.jpg', 0, 0, '1 kg de costilla de res\n3 papas medianas\n2 ramas de cebolla larga\n1 manojo de cilantro\n2 dientes de ajo\nComino\nSal\n2 litros de agua'
  UNION ALL SELECT 'Pan de banano', 1, 'Desayunos', 'Un pan húmedo y aromático que aprovecha los bananos maduros. Se hornea en una sola tarea, dura varios días y es ideal para el desayuno, la onces o acompañar un café.', 20, 'desayunos/pan-de-banano.jpg', 0, 0, '3 bananos muy maduros\n2 tazas de harina de trigo\n1 cucharadita de bicarbonato\n½ cucharadita de sal\n½ taza de azúcar\n2 huevos\n⅓ de taza de mantequilla derretida\n½ taza de nueces (opcional)'
  UNION ALL SELECT 'Pudín de chía', 1, 'Desayunos', 'Un desayuno fresco que se prepara la noche anterior: las semillas de chía absorben la leche y quedan con textura cremosa. Se sirve con frutos rojos y un toque de menta.', 10, 'desayunos/pudin-de-chia.jpg', 0, 0, '¼ de taza de semillas de chía\n1 taza de leche de almendras\n1 cucharada de miel\n½ cucharadita de esencia de vainilla\nFrutos rojos para servir\nHojas de menta'
  UNION ALL SELECT 'Arepa de huevo', 3, 'Desayunos', 'Una arepa frita y crujiente de la costa colombiana, rellena de carne molida y un huevo que se cocina dentro de la masa. Contundente, dorada y perfecta para un desayuno especial.', 25, 'desayunos/arepa-de-huevo.jpg', 0, 0, '2 tazas de harina de maíz precocida\n1 ½ tazas de agua tibia\n1 cucharadita de sal\n4 huevos\n200 g de carne molida\n½ cebolla picada\nAceite para freír'
  UNION ALL SELECT 'Arepa paisa', 1, 'Desayunos', 'La arepa paisa lleva todo lo que hace especial el desayuno antioqueño: chicharrón crocante, hogao casero, huevo y aguacate sobre una arepa recién asada. Contundente y perfecta para empezar el día con mucha energía.', 15, 'desayunos/arepa-paisa.png', 1, 0, '4 arepas de maíz\n200 g de chicharrón\n1 taza de hogao\n4 huevos\n1 aguacate\nSal'
  UNION ALL SELECT 'Tamal peruano', 3, 'Desayunos', 'Masa suave de maíz rellena de cerdo, aceitunas y huevo, envuelta en hoja de plátano y cocida al vapor. Un desayuno tradicional del Perú, aromático y muy reconfortante.', 30, 'desayunos/tamal.png', 0, 0, '500 g de maíz molido\n300 g de carne de cerdo\n3 cucharadas de pasta de ají amarillo\n2 huevos duros\nAceitunas negras\n100 g de manteca\nHojas de plátano\nSal'
  UNION ALL SELECT 'Tostadas francesas', 1, 'Desayunos', 'Pan remojado en una mezcla de huevo, leche y canela, dorado en la sartén hasta quedar crujiente por fuera y suave por dentro. Una forma deliciosa de aprovechar el pan del día anterior.', 15, 'desayunos/tostadas.png', 0, 0, '6 rebanadas de pan\n3 huevos\n½ taza de leche\n1 cucharadita de canela\n1 cucharada de mantequilla\nMiel o azúcar glas para servir'
  UNION ALL SELECT 'Chilaquiles verdes', 3, 'Desayunos', 'Totopos de maíz bañados en una salsa verde de tomatillo y chile, terminados con crema y queso fresco. Un desayuno mexicano con carácter, ideal para quienes disfrutan los sabores intensos.', 30, 'desayunos/chilaquiles-verdes.jpg', 1, 0, '12 tortillas de maíz\n8 tomatillos\n2 chiles serranos\n½ cebolla\n1 manojo de cilantro\nCrema\nQueso fresco\nAceite para freír'
  UNION ALL SELECT 'Batido vegano', 1, 'Desayunos', 'Un batido cremoso, sin productos de origen animal y cargado de antioxidantes. Los arándanos y el banano le dan dulzor natural, y la chía aporta fibra y saciedad para toda la mañana.', 10, 'desayunos/batido-vegano.jpg', 1, 0, '1 taza de arándanos\n1 banano congelado\n1 taza de leche de almendras\n1 cucharada de semillas de chía\n1 cucharadita de sirope de agave'
  UNION ALL SELECT 'Changua', 1, 'Desayunos', 'La changua es un desayuno tradicional de Boyacá y Cundinamarca: una sopa suave de leche con huevo, cebolla larga y cilantro, servida con pan. Sencilla, calentita y perfecta para las mañanas frías.', 15, 'desayunos/changua.jpg', 0, 0, '2 tazas de leche\n2 tazas de agua\n4 huevos\n3 ramas de cebolla larga\n1 manojo de cilantro\n4 panes del día anterior\nSal'
  UNION ALL SELECT 'Huevos pericos', 1, 'Desayunos', 'Receta de desayunos lista en 10 minutos.', 10, 'desayunos/huevos-pericos.jpg', 0, 0, NULL
  UNION ALL SELECT 'Calentado paisa', 1, 'Desayunos', 'Receta de desayunos lista en 15 minutos.', 15, 'desayunos/calentado-paisa.jpg', 0, 0, NULL
  UNION ALL SELECT 'Avena con frutas', 1, 'Desayunos', 'Receta de desayunos lista en 10 minutos.', 10, 'desayunos/avena-con-frutas.jpg', 0, 0, NULL
  UNION ALL SELECT 'Huevos rancheros', 3, 'Desayunos', 'Receta de desayunos lista en 25 minutos.', 25, 'desayunos/huevos-rancheros.jpg', 1, 0, NULL
  UNION ALL SELECT 'Arepa boyacense', 1, 'Desayunos', 'Receta de desayunos lista en 15 minutos.', 15, 'desayunos/arepa-boyacense.jpg', 1, 0, NULL
  UNION ALL SELECT 'Omelette', 1, 'Desayunos', 'Receta de desayunos lista en 10 minutos.', 10, 'desayunos/omelette-de-queso.jpg', 0, 0, NULL
  UNION ALL SELECT 'Waffles', 1, 'Desayunos', 'Receta de desayunos lista en 20 minutos.', 20, 'desayunos/waffles.jpg', 0, 0, NULL
  UNION ALL SELECT 'Granola casera', 1, 'Desayunos', 'Receta de desayunos lista en 25 minutos.', 25, 'desayunos/granola-casera.jpg', 0, 0, NULL
  UNION ALL SELECT 'Sándwich de huevo', 1, 'Desayunos', 'Receta de desayunos lista en 10 minutos.', 10, 'desayunos/sandwich-de-huevo.jpg', 0, 0, NULL
  UNION ALL SELECT 'Almojábana', 1, 'Desayunos', 'Receta de desayunos lista en 30 minutos.', 30, 'desayunos/almojabana.jpg', 0, 1, NULL
  UNION ALL SELECT 'Empanadas', 3, 'Desayunos', 'Receta de desayunos lista en 40 minutos.', 40, 'desayunos/empanadas.jpg', 0, 1, NULL
  UNION ALL SELECT 'Pan de chocolate', 1, 'Desayunos', 'Receta de desayunos lista en 35 minutos.', 35, 'desayunos/pan-de-chocolate.jpg', 0, 1, NULL
  UNION ALL SELECT 'Bandeja paisa', 5, 'Almuerzos', 'Receta de almuerzos lista en 90 minutos.', 90, 'almuerzos/bandeja-paisa.jpg', 1, 0, NULL
  UNION ALL SELECT 'Ajiaco santafereño', 5, 'Almuerzos', 'Receta de almuerzos lista en 75 minutos.', 75, 'almuerzos/ajiaco-santafereno.jpg', 1, 0, NULL
  UNION ALL SELECT 'Sancocho antioqueño', 5, 'Almuerzos', 'Receta de almuerzos lista en 120 minutos.', 120, 'almuerzos/sancocho-antioqueno.jpg', 1, 0, NULL
  UNION ALL SELECT 'Tacos al pastor', 3, 'Almuerzos', 'Receta de almuerzos lista en 40 minutos.', 40, 'almuerzos/tacos-al-pastor.jpg', 1, 0, NULL
  UNION ALL SELECT 'Espagueti a la carbonara', 3, 'Almuerzos', 'Receta de almuerzos lista en 25 minutos.', 25, 'almuerzos/espagueti-a-la-carbonara.jpg', 0, 0, NULL
  UNION ALL SELECT 'Lasaña', 3, 'Almuerzos', 'Receta de almuerzos lista en 75 minutos.', 75, 'almuerzos/lasagna.jpg', 1, 0, NULL
  UNION ALL SELECT 'Arroz chaufa', 3, 'Almuerzos', 'Receta de almuerzos lista en 35 minutos.', 35, 'almuerzos/arroz-chaufa.jpg', 1, 0, NULL
  UNION ALL SELECT 'Burritos', 1, 'Almuerzos', 'Receta de almuerzos lista en 30 minutos.', 30, 'almuerzos/burritos.jpg', 0, 0, NULL
  UNION ALL SELECT 'Hamburguesa de carne', 1, 'Almuerzos', 'Receta de almuerzos lista en 25 minutos.', 25, 'almuerzos/hamburguesa-de-carne.jpg', 1, 0, NULL
  UNION ALL SELECT 'Ramen', 3, 'Almuerzos', 'Receta de almuerzos lista en 40 minutos.', 40, 'almuerzos/ramen.jpg', 1, 0, NULL
  UNION ALL SELECT 'Raviolis', 5, 'Almuerzos', 'Receta de almuerzos lista en 60 minutos.', 60, 'almuerzos/raviolis.jpg', 0, 0, NULL
  UNION ALL SELECT 'Crema de auyama', 1, 'Almuerzos', 'Receta de almuerzos lista en 30 minutos.', 30, 'almuerzos/crema-auyama.jpg', 1, 0, NULL
  UNION ALL SELECT 'Sushi', 3, 'Almuerzos', 'Receta de almuerzos lista en 15 minutos.', 15, 'home/sushi.jpeg', 0, 0, NULL
  UNION ALL SELECT 'Kibbeh', 5, 'Almuerzos', 'Receta de almuerzos lista en 60 minutos.', 60, 'almuerzos/kibbeh.jpg', 0, 1, NULL
  UNION ALL SELECT 'Mansaf', 5, 'Almuerzos', 'Receta de almuerzos lista en 150 minutos.', 150, 'almuerzos/mansaf.jpg', 0, 1, NULL
  UNION ALL SELECT 'Sopa de espinaca', 1, 'Almuerzos', 'Receta de almuerzos lista en 25 minutos.', 25, 'almuerzos/sopa-espinaca.jpg', 0, 1, NULL
  UNION ALL SELECT 'Patacones con hogao', 1, 'Snacks', 'Receta de snacks lista en 25 minutos.', 25, 'snacks/patacones-con-hogao.jpg', 1, 0, NULL
  UNION ALL SELECT 'Quesadillas', 1, 'Snacks', 'Receta de snacks lista en 15 minutos.', 15, 'snacks/quesadillas.jpg', 0, 0, NULL
  UNION ALL SELECT 'Papa rellena', 3, 'Snacks', 'Receta de snacks lista en 45 minutos.', 45, 'snacks/papa-rellena.jpg', 1, 0, NULL
  UNION ALL SELECT 'Churros', 1, 'Snacks', 'Receta de snacks lista en 30 minutos.', 30, 'snacks/churros.jpg', 1, 0, NULL
  UNION ALL SELECT 'Buñuelos', 3, 'Snacks', 'Receta de snacks lista en 45 minutos.', 45, 'snacks/bunuelos.jpg', 1, 0, NULL
  UNION ALL SELECT 'Aborrajados', 3, 'Snacks', 'Receta de snacks lista en 30 minutos.', 30, 'snacks/aborrajados.jpg', 1, 0, NULL
  UNION ALL SELECT 'Chipá', 1, 'Snacks', 'Receta de snacks lista en 35 minutos.', 35, 'snacks/chipa.jpg', 0, 0, NULL
  UNION ALL SELECT 'Choripán', 1, 'Snacks', 'Receta de snacks lista en 20 minutos.', 20, 'snacks/choripan.jpg', 1, 0, NULL
  UNION ALL SELECT 'Chicharrones', 3, 'Snacks', 'Receta de snacks lista en 40 minutos.', 40, 'snacks/chicharrones.jpg', 0, 0, NULL
  UNION ALL SELECT 'Dorilocos', 1, 'Snacks', 'Receta de snacks lista en 10 minutos.', 10, 'snacks/dorilocos.jpg', 0, 0, NULL
  UNION ALL SELECT 'Elotes preparados', 1, 'Snacks', 'Receta de snacks lista en 15 minutos.', 15, 'snacks/elotes-preparados.jpg', 1, 0, NULL
  UNION ALL SELECT 'Humitas', 3, 'Snacks', 'Receta de snacks lista en 50 minutos.', 50, 'snacks/humitas.jpg', 0, 0, NULL
  UNION ALL SELECT 'Cocadas', 1, 'Snacks', 'Receta de snacks lista en 30 minutos.', 30, 'snacks/cocadas.jpg', 0, 1, NULL
  UNION ALL SELECT 'Medialunas', 3, 'Snacks', 'Receta de snacks lista en 90 minutos.', 90, 'snacks/medialunas.jpg', 0, 1, NULL
  UNION ALL SELECT 'Nuggets', 1, 'Snacks', 'Receta de snacks lista en 25 minutos.', 25, 'snacks/nuggets.jpg', 0, 1, NULL
  UNION ALL SELECT 'Pizza margarita', 3, 'Cenas', 'Receta de cenas lista en 50 minutos.', 50, 'cenas/pizza-margarita.jpg', 1, 0, NULL
  UNION ALL SELECT 'Pollo a la parmesana', 3, 'Cenas', 'Receta de cenas lista en 40 minutos.', 40, 'cenas/pollo-a-la-parmesana.jpg', 1, 0, NULL
  UNION ALL SELECT 'Fajitas de carne', 1, 'Cenas', 'Receta de cenas lista en 30 minutos.', 30, 'cenas/fajitas-de-carne.jpg', 1, 0, NULL
  UNION ALL SELECT 'Milanesa napolitana', 3, 'Cenas', 'Receta de cenas lista en 45 minutos.', 45, 'cenas/milanesa-napolitana.jpg', 1, 0, NULL
  UNION ALL SELECT 'Penne al pesto', 1, 'Cenas', 'Receta de cenas lista en 20 minutos.', 20, 'cenas/pasta-al-pesto.jpg', 0, 0, NULL
  UNION ALL SELECT 'Shawarma', 3, 'Cenas', 'Receta de cenas lista en 35 minutos.', 35, 'cenas/shawarma.jpg', 1, 0, NULL
  UNION ALL SELECT 'Calzone', 3, 'Cenas', 'Receta de cenas lista en 45 minutos.', 45, 'cenas/calzone.jpg', 0, 0, NULL
  UNION ALL SELECT 'Cazuela de frijoles', 3, 'Cenas', 'Receta de cenas lista en 60 minutos.', 60, 'cenas/cazuela-de-frijoles.jpg', 1, 0, NULL
  UNION ALL SELECT 'Crepes de pollo y champiñones', 3, 'Cenas', 'Receta de cenas lista en 35 minutos.', 35, 'cenas/crepes-pollo-y-champinones.jpg', 0, 0, NULL
  UNION ALL SELECT 'Flautas de pollo', 1, 'Cenas', 'Receta de cenas lista en 30 minutos.', 30, 'cenas/flautas-de-pollo.jpg', 0, 0, NULL
  UNION ALL SELECT 'Gringas al pastor', 3, 'Cenas', 'Receta de cenas lista en 30 minutos.', 30, 'cenas/gringas-al-pastor.jpg', 0, 0, NULL
  UNION ALL SELECT 'Pastel de papa', 3, 'Cenas', 'Receta de cenas lista en 60 minutos.', 60, 'cenas/pastel-de-papa.jpg', 1, 0, NULL
  UNION ALL SELECT 'Dolmas', 5, 'Cenas', 'Receta de cenas lista en 75 minutos.', 75, 'cenas/dolmas.jpg', 0, 1, NULL
  UNION ALL SELECT 'Bruschettas', 1, 'Cenas', 'Receta de cenas lista en 15 minutos.', 15, 'cenas/bruschettas.jpg', 0, 1, NULL
  UNION ALL SELECT 'Salchipapa', 1, 'Cenas', 'Receta de cenas lista en 20 minutos.', 20, 'cenas/salchipapa.jpg', 0, 1, NULL
  UNION ALL SELECT 'Sopa de lentejas', 1, 'Sopas', 'Receta de sopas lista en 40 minutos.', 40, 'sopas/sopa-de-lentejas.jpg', 0, 0, NULL
  UNION ALL SELECT 'Sopa de tomate', 1, 'Sopas', 'Receta de sopas lista en 30 minutos.', 30, 'sopas/sopa-de-tomate.jpg', 0, 0, NULL
  UNION ALL SELECT 'Minestrone', 3, 'Sopas', 'Receta de sopas lista en 45 minutos.', 45, 'sopas/minestrone.jpg', 0, 0, NULL
  UNION ALL SELECT 'Caldo de gallina', 3, 'Sopas', 'Receta de sopas lista en 75 minutos.', 75, 'sopas/caldo-de-gallina.jpg', 1, 0, NULL
  UNION ALL SELECT 'Puchero argentino', 5, 'Sopas', 'Receta de sopas lista en 120 minutos.', 120, 'sopas/puchero-argentino.jpg', 1, 0, NULL
  UNION ALL SELECT 'Sopa de albóndigas', 3, 'Sopas', 'Receta de sopas lista en 50 minutos.', 50, 'sopas/sopa-de-albondigas.jpg', 1, 0, NULL
  UNION ALL SELECT 'Crema de brócoli', 1, 'Sopas', 'Receta de sopas lista en 30 minutos.', 30, 'sopas/crema-de-brocoli.jpg', 0, 0, NULL
  UNION ALL SELECT 'Caldo de pescado', 3, 'Sopas', 'Receta de sopas lista en 40 minutos.', 40, 'sopas/caldo-de-pescado.jpg', 0, 0, NULL
  UNION ALL SELECT 'Mondongo', 5, 'Sopas', 'Receta de sopas lista en 150 minutos.', 150, 'sopas/mondongo.jpg', 0, 0, NULL
  UNION ALL SELECT 'Carbonada criolla', 3, 'Sopas', 'Receta de sopas lista en 90 minutos.', 90, 'sopas/carbonada-criolla.jpg', 1, 0, NULL
  UNION ALL SELECT 'Shambar', 3, 'Sopas', 'Receta de sopas lista en 60 minutos.', 60, 'sopas/shambar.jpg', 0, 0, NULL
  UNION ALL SELECT 'Sopa de fideos', 1, 'Sopas', 'Receta de sopas lista en 20 minutos.', 20, 'sopas/sopa-de-fideos.jpg', 0, 0, NULL
  UNION ALL SELECT 'Ajiaco', 5, 'Sopas', 'Receta de sopas lista en 75 minutos.', 75, 'almuerzos/ajiaco-santafereno.jpg', 1, 1, NULL
  UNION ALL SELECT 'Crema de zapallo', 1, 'Sopas', 'Receta de sopas lista en 30 minutos.', 30, 'almuerzos/crema-auyama.jpg', 1, 1, NULL
  UNION ALL SELECT 'Sancocho trifásico', 5, 'Sopas', 'Receta de sopas lista en 120 minutos.', 120, 'almuerzos/sancocho-antioqueno.jpg', 1, 1, NULL
  UNION ALL SELECT 'Ensalada caprese', 1, 'Ensaladas', 'Receta de ensaladas lista en 10 minutos.', 10, 'ensalada/ensalada-caprese.jpg', 0, 0, NULL
  UNION ALL SELECT 'Ensalada de quinoa', 1, 'Ensaladas', 'Receta de ensaladas lista en 25 minutos.', 25, 'ensalada/ensalada-de-quinoa.jpg', 1, 0, NULL
  UNION ALL SELECT 'Ensalada de palta', 1, 'Ensaladas', 'Receta de ensaladas lista en 10 minutos.', 10, 'ensalada/ensalada-de-palta.jpg', 0, 0, NULL
  UNION ALL SELECT 'Ensalada de atún', 1, 'Ensaladas', 'Receta de ensaladas lista en 15 minutos.', 15, 'ensalada/ensalada-de-atun.jpg', 1, 0, NULL
  UNION ALL SELECT 'Ensalada panzanella', 1, 'Ensaladas', 'Receta de ensaladas lista en 20 minutos.', 20, 'ensalada/ensalada-panzanella.jpg', 1, 0, NULL
  UNION ALL SELECT 'Ensalada de frutas', 1, 'Ensaladas', 'Receta de ensaladas lista en 10 minutos.', 10, 'ensalada/ensalada-de-frutas.jpg', 1, 0, NULL
  UNION ALL SELECT 'Ensalada de frijoles negros', 1, 'Ensaladas', 'Receta de ensaladas lista en 15 minutos.', 15, 'ensalada/ensalada-de-frijoles-negros.jpg', 1, 0, NULL
  UNION ALL SELECT 'Ensalada de mango', 1, 'Ensaladas', 'Receta de ensaladas lista en 15 minutos.', 15, 'ensalada/ensalada-de-mango.jpg', 0, 0, NULL
  UNION ALL SELECT 'Ensalada de palmitos', 1, 'Ensaladas', 'Receta de ensaladas lista en 10 minutos.', 10, 'ensalada/ensalada-de-palmitos.jpg', 0, 0, NULL
  UNION ALL SELECT 'Ensalada de papa', 1, 'Ensaladas', 'Receta de ensaladas lista en 30 minutos.', 30, 'ensalada/ensalada-de-papa.jpg', 0, 0, NULL
  UNION ALL SELECT 'Ensalada de remolacha', 1, 'Ensaladas', 'Receta de ensaladas lista en 20 minutos.', 20, 'ensalada/ensalada-de-remolacha.jpg', 0, 0, NULL
  UNION ALL SELECT 'Ensalada de zanahoria', 1, 'Ensaladas', 'Receta de ensaladas lista en 10 minutos.', 10, 'ensalada/ensalada-de-zanahoria.jpg', 0, 0, NULL
  UNION ALL SELECT 'Ensalada mexicana de pollo', 1, 'Ensaladas', 'Receta de ensaladas lista en 25 minutos.', 25, 'ensalada/ensalada-mexicana-de-pollo.jpg', 0, 1, NULL
  UNION ALL SELECT 'Ensalada rusa', 1, 'Ensaladas', 'Receta de ensaladas lista en 30 minutos.', 30, 'ensalada/ensalada-rusa.jpg', 0, 1, NULL
  UNION ALL SELECT 'Solterito arequipeño', 3, 'Ensaladas', 'Receta de ensaladas lista en 30 minutos.', 30, 'ensalada/solterito-arequipeno.jpg', 1, 1, NULL
  UNION ALL SELECT 'Ceviche de camarón', 3, 'Pescados', 'Receta de pescados lista en 30 minutos.', 30, 'pescados/ceviche-de-camaron.jpg', 1, 0, NULL
  UNION ALL SELECT 'Mojarra frita', 3, 'Pescados', 'Receta de pescados lista en 40 minutos.', 40, 'pescados/mojarra-frita.jpg', 1, 0, NULL
  UNION ALL SELECT 'Paella de mariscos', 5, 'Pescados', 'Receta de pescados lista en 70 minutos.', 70, 'pescados/paella.jpg', 1, 0, NULL
  UNION ALL SELECT 'Pescado en papillote', 3, 'Pescados', 'Receta de pescados lista en 30 minutos.', 30, 'pescados/pescado-en-papillote.jpg', 0, 0, NULL
  UNION ALL SELECT 'Tacos de pescado', 1, 'Pescados', 'Receta de pescados lista en 30 minutos.', 30, 'pescados/tacos-de-pescado.jpg', 1, 0, NULL
  UNION ALL SELECT 'Pescado zarandeado', 3, 'Pescados', 'Receta de pescados lista en 45 minutos.', 45, 'pescados/pescado-zarandeado.jpg', 1, 0, NULL
  UNION ALL SELECT 'Buñuelos de bacalao', 3, 'Pescados', 'Receta de pescados lista en 40 minutos.', 40, 'pescados/bunuelos-de-bacalao.jpg', 1, 0, NULL
  UNION ALL SELECT 'Empanadas de pescado', 3, 'Pescados', 'Receta de pescados lista en 45 minutos.', 45, 'pescados/empanadas-pescado.jpg', 0, 0, NULL
  UNION ALL SELECT 'Meluzzo al pomodoro', 1, 'Pescados', 'Receta de pescados lista en 25 minutos.', 25, 'pescados/meluzzo-al-pomodoro.jpg', 0, 0, NULL
  UNION ALL SELECT 'Merluza a la romana', 1, 'Pescados', 'Receta de pescados lista en 25 minutos.', 25, 'pescados/merluza-a-la-romana.jpg', 0, 0, NULL
  UNION ALL SELECT 'Pacú a la parrilla', 3, 'Pescados', 'Receta de pescados lista en 40 minutos.', 40, 'pescados/pacu-a-la-parrila.jpg', 0, 0, NULL
  UNION ALL SELECT 'Pejerrey frito', 1, 'Pescados', 'Receta de pescados lista en 25 minutos.', 25, 'pescados/pejerrey-frito.jpg', 0, 0, NULL
  UNION ALL SELECT 'Parihuela', 5, 'Pescados', 'Receta de pescados lista en 60 minutos.', 60, 'pescados/parihuela.jpg', 1, 1, NULL
  UNION ALL SELECT 'Pescado a la diabla', 3, 'Pescados', 'Receta de pescados lista en 30 minutos.', 30, 'pescados/pescado-a-la-diabla.jpg', 0, 1, NULL
  UNION ALL SELECT 'Tikin xic', 3, 'Pescados', 'Receta de pescados lista en 60 minutos.', 60, 'pescados/tikin-xic.jpg', 0, 1, NULL
  UNION ALL SELECT 'Churrasco', 3, 'Carnes', 'Receta de carnes lista en 30 minutos.', 30, 'carnes/churrasco.jfif', 1, 0, NULL
  UNION ALL SELECT 'Lomo saltado', 3, 'Carnes', 'Receta de carnes lista en 35 minutos.', 35, 'carnes/lomo-saltado.jfif', 1, 0, NULL
  UNION ALL SELECT 'Costillas BBQ', 5, 'Carnes', 'Receta de carnes lista en 150 minutos.', 150, 'carnes/costillitas-bbq.jfif', 1, 0, NULL
  UNION ALL SELECT 'Pollo parmesano', 3, 'Carnes', 'Receta de carnes lista en 40 minutos.', 40, 'cenas/pollo-a-la-parmesana.jpg', 1, 0, NULL
  UNION ALL SELECT 'Puchero de res', 5, 'Carnes', 'Receta de carnes lista en 120 minutos.', 120, 'sopas/puchero-argentino.jpg', 1, 0, NULL
  UNION ALL SELECT 'Fajitas de res', 1, 'Carnes', 'Receta de carnes lista en 30 minutos.', 30, 'cenas/fajitas-de-carne.jpg', 1, 0, NULL
  UNION ALL SELECT 'Milanesa gratinada', 3, 'Carnes', 'Receta de carnes lista en 45 minutos.', 45, 'cenas/milanesa-napolitana.jpg', 1, 0, NULL
  UNION ALL SELECT 'Carbonada de res', 3, 'Carnes', 'Receta de carnes lista en 90 minutos.', 90, 'sopas/carbonada-criolla.jpg', 1, 0, NULL
  UNION ALL SELECT 'Sobrebarriga en salsa', 5, 'Carnes', 'Receta de carnes lista en 120 minutos.', 120, 'carnes/sobrebarriga-en-salsa.jfif', 1, 0, NULL
  UNION ALL SELECT 'Hamburguesa casera', 1, 'Carnes', 'Receta de carnes lista en 25 minutos.', 25, 'almuerzos/hamburguesa-de-carne.jpg', 1, 0, NULL
  UNION ALL SELECT 'Espaguetis a la boloñesa', 1, 'Pastas', 'Receta de pastas lista en 40 minutos.', 40, 'pastas/espaguetis-a-la-bolognesa.jfif', 1, 0, NULL
  UNION ALL SELECT 'Fettuccine Alfredo', 1, 'Pastas', 'Receta de pastas lista en 25 minutos.', 25, 'pastas/fetuccini-alfredo.jfif', 1, 0, NULL
  UNION ALL SELECT 'Lasaña clásica', 3, 'Pastas', 'Receta de pastas lista en 75 minutos.', 75, 'almuerzos/lasagna.jpg', 1, 0, NULL
  UNION ALL SELECT 'Carbonara', 3, 'Pastas', 'Receta de pastas lista en 25 minutos.', 25, 'almuerzos/espagueti-a-la-carbonara.jpg', 0, 0, NULL
  UNION ALL SELECT 'Pasta con champiñones', 1, 'Pastas', 'Receta de pastas lista en 25 minutos.', 25, 'pastas/pasta-con-champinones.jfif', 0, 0, NULL
  UNION ALL SELECT 'Spaghetti aglio e olio', 1, 'Pastas', 'Receta de pastas lista en 20 minutos.', 20, 'pastas/spaguetti-aglio-e-olio.jfif', 1, 0, NULL
  UNION ALL SELECT 'Penne arrabbiata', 1, 'Pastas', 'Receta de pastas lista en 20 minutos.', 20, 'pastas/penne-arrabbiata.jfif', 0, 0, NULL
  UNION ALL SELECT 'Ravioles de espinaca', 5, 'Pastas', 'Receta de pastas lista en 60 minutos.', 60, 'almuerzos/raviolis.jpg', 0, 0, NULL
  UNION ALL SELECT 'Macarrones con queso', 1, 'Pastas', 'Receta de pastas lista en 25 minutos.', 25, 'pastas/macarrones-con-queso.jfif', 1, 0, NULL
  UNION ALL SELECT 'Pasta al pesto', 1, 'Pastas', 'Receta de pastas lista en 20 minutos.', 20, 'cenas/pasta-al-pesto.jpg', 0, 0, NULL
  UNION ALL SELECT 'Pasta primavera', 1, 'Pastas', 'Receta de pastas lista en 25 minutos.', 25, 'pastas/pasta-primavera.jfif', 0, 0, NULL
  UNION ALL SELECT 'Ñoquis de papa', 3, 'Pastas', 'Receta de pastas lista en 50 minutos.', 50, 'pastas/noquis-de-papa.jfif', 0, 0, NULL
  UNION ALL SELECT 'Torta de vainilla', 1, 'Esponjados', 'Receta de esponjados lista en 55 minutos.', 55, 'esponjados/torta-de-vainilla.jpg', 1, 0, NULL
  UNION ALL SELECT 'Ponqué de banano', 1, 'Esponjados', 'Receta de esponjados lista en 60 minutos.', 60, 'desayunos/pan-de-banano.jpg', 1, 0, NULL
  UNION ALL SELECT 'Red velvet', 5, 'Esponjados', 'Receta de esponjados lista en 80 minutos.', 80, 'esponjados/red-velvet.jpg', 1, 0, NULL
  UNION ALL SELECT 'Torta de zanahoria', 3, 'Esponjados', 'Receta de esponjados lista en 65 minutos.', 65, 'esponjados/torta-de-zanahoria.jpg', 1, 0, NULL
  UNION ALL SELECT 'Torta de limón', 1, 'Esponjados', 'Receta de esponjados lista en 55 minutos.', 55, 'esponjados/torta-de-limon.jpg', 0, 0, NULL
  UNION ALL SELECT 'Ponqué marmoleado', 3, 'Esponjados', 'Receta de esponjados lista en 60 minutos.', 60, 'esponjados/ponque-marmoleado.jpg', 1, 0, NULL
  UNION ALL SELECT 'Cheesecake de fresa', 3, 'Esponjados', 'Receta de esponjados lista en 90 minutos.', 90, 'esponjados/cheesecake-de-fresa.jpg', 1, 0, NULL
  UNION ALL SELECT 'Torta tres leches', 3, 'Esponjados', 'Receta de esponjados lista en 70 minutos.', 70, 'esponjados/torta-tres-leches.jpg', 1, 0, NULL
  UNION ALL SELECT 'Brazo de reina', 5, 'Esponjados', 'Receta de esponjados lista en 60 minutos.', 60, 'esponjados/brazo-de-reina.jpg', 0, 0, NULL
  UNION ALL SELECT 'Waffles esponjosos', 1, 'Esponjados', 'Receta de esponjados lista en 25 minutos.', 25, 'desayunos/pancakes.jpg', 1, 0, NULL
  UNION ALL SELECT 'Torta de chocolate', 1, 'Esponjados', 'Receta de esponjados lista en 60 minutos.', 60, 'brownies.jpeg', 1, 0, NULL
  UNION ALL SELECT 'Torta de coco', 3, 'Esponjados', 'Receta de esponjados lista en 65 minutos.', 65, 'esponjados/torta-de-coco.jpg', 0, 0, NULL
  UNION ALL SELECT 'Pan de bono', 3, 'Horneados', 'Receta de horneados lista en 40 minutos.', 40, 'horneados/pan-de-bono.jpg', 1, 0, NULL
  UNION ALL SELECT 'Galletas de chips de chocolate', 1, 'Horneados', 'Receta de horneados lista en 25 minutos.', 25, 'horneados/galletas-de-chips-de-chocolate.jpg', 1, 0, NULL
  UNION ALL SELECT 'Brownies', 1, 'Horneados', 'Receta de horneados lista en 15 minutos.', 15, 'brownies.jpeg', 0, 0, NULL
  UNION ALL SELECT 'Empanadas horneadas', 3, 'Horneados', 'Receta de horneados lista en 45 minutos.', 45, 'empanada.jpg', 0, 0, NULL
  UNION ALL SELECT 'Pan de yuca', 1, 'Horneados', 'Receta de horneados lista en 35 minutos.', 35, 'snacks/chipa.jpg', 1, 0, NULL
  UNION ALL SELECT 'Croissants', 5, 'Horneados', 'Receta de horneados lista en 180 minutos.', 180, 'snacks/medialunas.jpg', 0, 0, NULL
  UNION ALL SELECT 'Muffins de arándanos', 1, 'Horneados', 'Receta de horneados lista en 30 minutos.', 30, 'horneados/muffins-de-arandanos.jpg', 1, 0, NULL
  UNION ALL SELECT 'Galletas de avena', 1, 'Horneados', 'Receta de horneados lista en 25 minutos.', 25, 'horneados/galletas-de-avena.jpg', 0, 0, NULL
  UNION ALL SELECT 'Roscón', 3, 'Horneados', 'Receta de horneados lista en 90 minutos.', 90, 'horneados/roscon.jpg', 0, 0, NULL
  UNION ALL SELECT 'Almojábanas', 3, 'Horneados', 'Receta de horneados lista en 40 minutos.', 40, 'desayunos/almojabana.jpg', 1, 0, NULL
  UNION ALL SELECT 'Pie de limón', 3, 'Horneados', 'Receta de horneados lista en 70 minutos.', 70, 'horneados/pie-de-limon.jpg', 1, 0, NULL
  UNION ALL SELECT 'Bowl de quinoa', 1, 'Dietéticos', 'Receta de dietéticos lista en 25 minutos.', 25, 'ensalada/ensalada-de-quinoa.jpg', 1, 0, NULL
  UNION ALL SELECT 'Tortilla de claras', 1, 'Dietéticos', 'Receta de dietéticos lista en 10 minutos.', 10, 'desayunos/tortilla-espanola.jpg', 0, 0, NULL
  UNION ALL SELECT 'Pancakes de avena', 1, 'Dietéticos', 'Receta de dietéticos lista en 15 minutos.', 15, 'desayunos/pancakes.jpg', 1, 0, NULL
  UNION ALL SELECT 'Wrap de pollo light', 1, 'Dietéticos', 'Receta de dietéticos lista en 20 minutos.', 20, 'cenas/shawarma.jpg', 0, 0, NULL
  UNION ALL SELECT 'Sopa de verduras light', 1, 'Dietéticos', 'Receta de dietéticos lista en 30 minutos.', 30, 'sopas/minestrone.jpg', 0, 0, NULL
  UNION ALL SELECT 'Pollo al horno con vegetales', 1, 'Dietéticos', 'Receta de dietéticos lista en 40 minutos.', 40, 'dietetico/pollo-al-horno-con-vegetales.jfif', 1, 0, NULL
  UNION ALL SELECT 'Galletas de avena sin azúcar', 1, 'Dietéticos', 'Receta de dietéticos lista en 25 minutos.', 25, 'dietetico/galletas-de-avena.jfif', 0, 0, NULL
  UNION ALL SELECT 'Brownie de frijol negro', 3, 'Dietéticos', 'Receta de dietéticos lista en 40 minutos.', 40, 'brownies.jpeg', 1, 0, NULL
  UNION ALL SELECT 'Gelatina de fruta', 1, 'Dietéticos', 'Receta de dietéticos lista en 15 minutos.', 15, 'dietetico/gelatina-de-frutas.jfif', 0, 0, NULL
  UNION ALL SELECT 'Vasitos de chía con frutos rojos', 1, 'Dietéticos', 'Receta de dietéticos lista en 10 minutos.', 10, 'desayunos/pudin-de-chia.jpg', 1, 0, NULL
  UNION ALL SELECT 'Pan de almendras', 3, 'Dietéticos', 'Receta de dietéticos lista en 50 minutos.', 50, 'dietetico/pan-de-almendras.jfif', 0, 0, NULL
  UNION ALL SELECT 'Helado de banano', 1, 'Dietéticos', 'Receta de dietéticos lista en 10 minutos.', 10, 'dietetico/helado-banano.jfif', 1, 0, NULL
  UNION ALL SELECT 'Bowl de yogurt con frutas', 3, 'Dietéticos', 'Receta de dietéticos lista en 10 minutos.', 10, 'dietetico/bowl-yogurt-con-frutas.jpg', 0, 0, NULL
  UNION ALL SELECT 'Pudín sin azúcar', 1, 'Dietéticos', 'Receta de dietéticos lista en 20 minutos.', 20, 'dietetico/pudin-sin-azucar.jpg', 0, 0, NULL
  UNION ALL SELECT 'Natilla', 3, 'Navidad', 'Receta de navidad lista en 50 minutos.', 50, 'navidad/natilla.jpg', 1, 0, NULL
  UNION ALL SELECT 'Pavo relleno', 5, 'Navidad', 'Receta de navidad lista en 240 minutos.', 240, 'dietetico/pollo-al-horno-con-vegetales.jfif', 1, 0, NULL
  UNION ALL SELECT 'Pernil de cerdo', 5, 'Navidad', 'Receta de navidad lista en 180 minutos.', 180, 'carnes/bondiola-de-cerdo.jfif', 0, 0, NULL
  UNION ALL SELECT 'Pan de jamón', 5, 'Navidad', 'Receta de navidad lista en 120 minutos.', 120, 'horneados/roscon-de-bocadillo.jfif', 1, 0, NULL
  UNION ALL SELECT 'Tamales', 5, 'Navidad', 'Receta de navidad lista en 120 minutos.', 120, 'desayunos/tamal.png', 1, 0, NULL
  UNION ALL SELECT 'Galletas de jengibre', 1, 'Navidad', 'Receta de navidad lista en 35 minutos.', 35, 'dietetico/galletas-de-avena.jfif', 1, 0, NULL
  UNION ALL SELECT 'Ponche navideño', 1, 'Navidad', 'Receta de navidad lista en 30 minutos.', 30, 'navidad/ponche-navideno.jpg', 0, 0, NULL
  UNION ALL SELECT 'Torta negra', 5, 'Navidad', 'Receta de navidad lista en 120 minutos.', 120, 'horneados/torta-negra-envinada.jfif', 1, 0, NULL
  UNION ALL SELECT 'Hojuelas', 3, 'Navidad', 'Receta de navidad lista en 40 minutos.', 40, 'snacks/churros.jpg', 0, 0, NULL
  UNION ALL SELECT 'Arroz navideño', 3, 'Navidad', 'Receta de navidad lista en 50 minutos.', 50, 'almuerzos/arroz-chaufa.jpg', 0, 0, NULL
  UNION ALL SELECT 'Lechona', 5, 'Navidad', 'Receta de navidad lista en 300 minutos.', 300, 'carnes/pulled-pork.jfif', 1, 0, NULL
  UNION ALL SELECT 'Lentejas de la suerte', 1, 'Año nuevo', 'Receta de año nuevo lista en 45 minutos.', 45, 'sopas/sopa-de-lentejas.jpg', 1, 0, NULL
  UNION ALL SELECT 'Pollo en salsa de champiñones', 3, 'Año nuevo', 'Receta de año nuevo lista en 50 minutos.', 50, 'cenas/crepes-pollo-y-champinones.jpg', 1, 0, NULL
  UNION ALL SELECT 'Ensalada de año nuevo', 1, 'Año nuevo', 'Receta de año nuevo lista en 20 minutos.', 20, 'ensalada/ensalada-panzanella.jpg', 0, 0, NULL
  UNION ALL SELECT 'Torta de frutos secos', 3, 'Año nuevo', 'Receta de año nuevo lista en 70 minutos.', 70, 'brownies.jpeg', 0, 0, NULL
  UNION ALL SELECT 'Salmón glaseado', 3, 'Año nuevo', 'Receta de año nuevo lista en 35 minutos.', 35, 'dietetico/pescado-al-horno.jfif', 1, 0, NULL
  UNION ALL SELECT 'Tartaletas de frutas', 3, 'Año nuevo', 'Receta de año nuevo lista en 50 minutos.', 50, 'esponjados/cheesecake-de-arandanos.jfif', 0, 0, NULL
  UNION ALL SELECT 'Brochetas de camarón', 3, 'Año nuevo', 'Receta de año nuevo lista en 25 minutos.', 25, 'pescados/pescado-zarandeado.jpg', 1, 0, NULL
  UNION ALL SELECT 'Cóctel de camarones', 1, 'Año nuevo', 'Receta de año nuevo lista en 20 minutos.', 20, 'pescados/ceviche-de-camaron.jpg', 0, 0, NULL
  UNION ALL SELECT 'Mini quiches', 3, 'Año nuevo', 'Receta de año nuevo lista en 45 minutos.', 45, 'dietetico/torta-espinaca.jfif', 0, 0, NULL
  UNION ALL SELECT 'Pasabocas de queso', 1, 'Año nuevo', 'Receta de año nuevo lista en 15 minutos.', 15, 'snacks/aborrajados.jpg', 1, 0, NULL
  UNION ALL SELECT 'Copa de postre', 1, 'Año nuevo', 'Receta de año nuevo lista en 20 minutos.', 20, 'ensalada/ensalada-de-frutas.jpg', 0, 0, NULL
  UNION ALL SELECT 'Galletas fantasma', 1, 'Halloween', 'Receta de halloween lista en 30 minutos.', 30, 'horneados/alfajor.jfif', 1, 0, NULL
  UNION ALL SELECT 'Pastel de calabaza', 3, 'Halloween', 'Receta de halloween lista en 75 minutos.', 75, 'horneados/pastel-de-elote.jfif', 1, 0, NULL
  UNION ALL SELECT 'Dedos de bruja', 1, 'Halloween', 'Receta de halloween lista en 30 minutos.', 30, 'horneados/panderos.jfif', 0, 0, NULL
  UNION ALL SELECT 'Manzanas acarameladas', 1, 'Halloween', 'Receta de halloween lista en 25 minutos.', 25, 'halloween/manzanas-acarameladas.jpg', 0, 0, NULL
  UNION ALL SELECT 'Galletas de calabaza', 1, 'Halloween', 'Receta de halloween lista en 30 minutos.', 30, 'dietetico/galletas-de-avena.jfif', 0, 0, NULL
  UNION ALL SELECT 'Gelatina de gusanos', 1, 'Halloween', 'Receta de halloween lista en 20 minutos.', 20, 'dietetico/gelatina-de-frutas.jfif', 0, 0, NULL
  UNION ALL SELECT 'Pizza momia', 1, 'Halloween', 'Receta de halloween lista en 25 minutos.', 25, 'cenas/pizza-margarita.jpg', 0, 0, NULL
  UNION ALL SELECT 'Cupcakes de telaraña', 3, 'Halloween', 'Receta de halloween lista en 45 minutos.', 45, 'esponjados/torta-red-velvet.jfif', 1, 0, NULL
  UNION ALL SELECT 'Palomitas de colores', 1, 'Halloween', 'Receta de halloween lista en 15 minutos.', 15, 'halloween/palomitas-de-colores.jpg', 0, 0, NULL
  UNION ALL SELECT 'Sopa de calabaza', 1, 'Halloween', 'Receta de halloween lista en 35 minutos.', 35, 'almuerzos/crema-auyama.jpg', 1, 0, NULL
  UNION ALL SELECT 'Ponche de bruja', 1, 'Halloween', 'Receta de halloween lista en 10 minutos.', 10, 'halloween/ponche-de-bruja.jpg', 0, 0, NULL
  UNION ALL SELECT 'Brownies de murciélago', 3, 'Halloween', 'Receta de halloween lista en 40 minutos.', 40, 'brownies.jpeg', 0, 0, NULL
  UNION ALL SELECT 'Fresas con chocolate', 1, 'San valentín', 'Receta de san valentín lista en 20 minutos.', 20, 'esponjados/brazo-de-reina.jfif', 1, 0, NULL
  UNION ALL SELECT 'Filete con salsa de vino tinto', 3, 'San valentín', 'Receta de san valentín lista en 40 minutos.', 40, 'carnes/bife-de-chorizo.jfif', 1, 0, NULL
  UNION ALL SELECT 'Risotto de champiñones', 3, 'San valentín', 'Receta de san valentín lista en 45 minutos.', 45, 'pastas/pasta-con-champinones.jfif', 0, 0, NULL
  UNION ALL SELECT 'Tarta de frambuesa', 3, 'San valentín', 'Receta de san valentín lista en 70 minutos.', 70, 'esponjados/cheesecake-de-arandanos.jfif', 1, 0, NULL
  UNION ALL SELECT 'Pasta en salsa rosa', 1, 'San valentín', 'Receta de san valentín lista en 25 minutos.', 25, 'pastas/penne-arrabbiata.jfif', 0, 0, NULL
  UNION ALL SELECT 'Tiramisú', 3, 'San valentín', 'Receta de san valentín lista en 40 minutos.', 40, 'esponjados/semifreddo-de-cafe.jfif', 1, 0, NULL
  UNION ALL SELECT 'Cupcakes de corazón', 3, 'San valentín', 'Receta de san valentín lista en 45 minutos.', 45, 'esponjados/torta-red-velvet.jfif', 0, 0, NULL
  UNION ALL SELECT 'Mousse de chocolate', 1, 'San valentín', 'Receta de san valentín lista en 30 minutos.', 30, 'esponjados/Semifreddo-de-chocolate.jfif', 1, 0, NULL
  UNION ALL SELECT 'Camarones al ajillo', 1, 'San valentín', 'Receta de san valentín lista en 20 minutos.', 20, 'sanvalentin/camarones-al-ajillo.jpg', 0, 0, NULL
  UNION ALL SELECT 'Ensalada de fresas', 1, 'San valentín', 'Receta de san valentín lista en 15 minutos.', 15, 'ensalada/ensalada-de-frutas.jpg', 0, 0, NULL
  UNION ALL SELECT 'Panqueques de corazón', 1, 'San valentín', 'Receta de san valentín lista en 20 minutos.', 20, 'desayunos/pancakes.jpg', 1, 0, NULL
  UNION ALL SELECT 'Fondue de chocolate', 1, 'San valentín', 'Receta de san valentín lista en 20 minutos.', 20, 'brownies.jpeg', 1, 0, NULL
  UNION ALL SELECT 'Batido de fresa', 1, 'Batidos', 'Receta de batidos lista en 5 minutos.', 5, 'desayunos/batido-vegano.jpg', 1, 0, NULL
  UNION ALL SELECT 'Batido verde', 1, 'Batidos', 'Receta de batidos lista en 5 minutos.', 5, 'batidos/batido-verde.jpg', 1, 0, NULL
  UNION ALL SELECT 'Batido de mango', 1, 'Batidos', 'Receta de batidos lista en 5 minutos.', 5, 'batidos/batido-de-mango.jpg', 0, 0, NULL
  UNION ALL SELECT 'Batido de avena y banano', 1, 'Batidos', 'Receta de batidos lista en 5 minutos.', 5, 'batidos/batido-de-avena-y-banano.jpg', 0, 0, NULL
  UNION ALL SELECT 'Batido de piña y jengibre', 1, 'Batidos', 'Receta de batidos lista en 5 minutos.', 5, 'batidos/batido-de-pina-y-jengibre.jpg', 0, 0, NULL
  UNION ALL SELECT 'Batido de espinaca y manzana', 1, 'Batidos', 'Receta de batidos lista en 5 minutos.', 5, 'batidos/batido-de-espinaca-y-manzana.jpg', 1, 0, NULL
  UNION ALL SELECT 'Batido proteico', 1, 'Batidos', 'Receta de batidos lista en 5 minutos.', 5, 'batidos/batido-proteico.jpg', 1, 0, NULL
  UNION ALL SELECT 'Batido de mora', 1, 'Batidos', 'Receta de batidos lista en 5 minutos.', 5, 'desayunos/batido-vegano.jpg', 0, 0, NULL
  UNION ALL SELECT 'Smoothie bowl', 1, 'Batidos', 'Receta de batidos lista en 10 minutos.', 10, 'desayunos/pudin-de-chia.jpg', 1, 0, NULL
  UNION ALL SELECT 'Batido de papaya', 1, 'Batidos', 'Receta de batidos lista en 5 minutos.', 5, 'batidos/batido-de-papaya.jpg', 0, 0, NULL
  UNION ALL SELECT 'Batido de chocolate y maní', 1, 'Batidos', 'Receta de batidos lista en 5 minutos.', 5, 'batidos/batido-de-chocolate-y-mani.jpg', 0, 0, NULL
  UNION ALL SELECT 'Batido tropical', 1, 'Batidos', 'Receta de batidos lista en 5 minutos.', 5, 'batidos/batido-tropical.jpg', 0, 0, NULL
  UNION ALL SELECT 'Malteada de vainilla', 1, 'Malteadas', 'Receta de malteadas lista en 5 minutos.', 5, 'malteadas/malteada-de-vainilla.jpg', 1, 0, NULL
  UNION ALL SELECT 'Malteada de chocolate', 1, 'Malteadas', 'Receta de malteadas lista en 5 minutos.', 5, 'malteadas/malteada-de-chocolate.jpg', 1, 0, NULL
  UNION ALL SELECT 'Malteada de oreo', 1, 'Malteadas', 'Receta de malteadas lista en 5 minutos.', 5, 'malteadas/malteada-de-oreo.jpg', 1, 0, NULL
  UNION ALL SELECT 'Malteada de fresa', 1, 'Malteadas', 'Receta de malteadas lista en 5 minutos.', 5, 'malteadas/malteada-de-fresa.jpg', 0, 0, NULL
  UNION ALL SELECT 'Malteada de caramelo', 1, 'Malteadas', 'Receta de malteadas lista en 5 minutos.', 5, 'malteadas/malteada-de-caramelo.jpg', 0, 0, NULL
  UNION ALL SELECT 'Malteada de galleta', 1, 'Malteadas', 'Receta de malteadas lista en 5 minutos.', 5, 'malteadas/malteada-de-galleta.jpg', 0, 0, NULL
  UNION ALL SELECT 'Malteada de café', 1, 'Malteadas', 'Receta de malteadas lista en 5 minutos.', 5, 'malteadas/malteada-de-cafe.jpg', 0, 0, NULL
  UNION ALL SELECT 'Malteada de arequipe', 1, 'Malteadas', 'Receta de malteadas lista en 5 minutos.', 5, 'malteadas/malteada-de-arequipe.jpg', 1, 0, NULL
  UNION ALL SELECT 'Malteada de brownie', 1, 'Malteadas', 'Receta de malteadas lista en 10 minutos.', 10, 'malteadas/malteada-de-brownie.jpg', 0, 0, NULL
  UNION ALL SELECT 'Malteada de banano', 1, 'Malteadas', 'Receta de malteadas lista en 5 minutos.', 5, 'malteadas/malteada-de-banano.jpg', 0, 0, NULL
  UNION ALL SELECT 'Malteada de mantequilla de maní', 1, 'Malteadas', 'Receta de malteadas lista en 5 minutos.', 5, 'malteadas/malteada-de-mantequilla-de-mani.jpg', 0, 0, NULL
  UNION ALL SELECT 'Malteada de menta', 1, 'Malteadas', 'Receta de malteadas lista en 5 minutos.', 5, 'malteadas/malteada-de-menta.jpg', 0, 0, NULL
  UNION ALL SELECT 'Jugo de naranja', 1, 'Jugos', 'Receta de jugos lista en 5 minutos.', 5, 'jugos/jugo-de-naranja.jpg', 1, 0, NULL
  UNION ALL SELECT 'Limonada de coco', 1, 'Jugos', 'Receta de jugos lista en 10 minutos.', 10, 'jugos/limonada-de-coco.jpg', 1, 0, NULL
  UNION ALL SELECT 'Jugo de maracuyá', 1, 'Jugos', 'Receta de jugos lista en 5 minutos.', 5, 'jugos/jugo-de-maracuya.jpg', 0, 0, NULL
  UNION ALL SELECT 'Jugo verde detox', 1, 'Jugos', 'Receta de jugos lista en 10 minutos.', 10, 'jugos/jugo-verde-detox.jpg', 1, 0, NULL
  UNION ALL SELECT 'Jugo de mandarina', 1, 'Jugos', 'Receta de jugos lista en 5 minutos.', 5, 'jugos/jugo-de-mandarina.jpg', 0, 0, NULL
  UNION ALL SELECT 'Limonada de hierbabuena', 1, 'Jugos', 'Receta de jugos lista en 10 minutos.', 10, 'jugos/limonada-de-hierbabuena.jpg', 1, 0, NULL
  UNION ALL SELECT 'Jugo de lulo', 1, 'Jugos', 'Receta de jugos lista en 5 minutos.', 5, 'jugos/jugo-de-lulo.jpg', 1, 0, NULL
  UNION ALL SELECT 'Jugo de piña y menta', 1, 'Jugos', 'Receta de jugos lista en 5 minutos.', 5, 'jugos/jugo-de-pina-y-menta.jpg', 0, 0, NULL
  UNION ALL SELECT 'Jugo de zanahoria', 1, 'Jugos', 'Receta de jugos lista en 5 minutos.', 5, 'jugos/jugo-de-zanahoria.jpg', 0, 0, NULL
  UNION ALL SELECT 'Jugo de guanábana', 1, 'Jugos', 'Receta de jugos lista en 5 minutos.', 5, 'jugos/jugo-de-guanabana.jpg', 0, 0, NULL
  UNION ALL SELECT 'Limonada cerezada', 1, 'Jugos', 'Receta de jugos lista en 10 minutos.', 10, 'jugos/limonada-cerezada.jpg', 1, 0, NULL
  UNION ALL SELECT 'Jugo de sandía', 1, 'Jugos', 'Receta de jugos lista en 5 minutos.', 5, 'jugos/jugo-de-sandia.jpg', 0, 0, NULL
) AS t
WHERE NOT EXISTS (SELECT 1 FROM recipe r WHERE r.name = t.name);
