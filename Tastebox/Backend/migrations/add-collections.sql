USE `tasteBox`;

CREATE TABLE IF NOT EXISTS `collection` (
  `id_collection` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(40) NOT NULL,
  `image` MEDIUMTEXT NULL,
  `user_id_user` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_collection`),
  UNIQUE INDEX `uq_collection_user_name` (`user_id_user` ASC, `name` ASC) VISIBLE,
  CONSTRAINT `fk_collection_user1`
    FOREIGN KEY (`user_id_user`)
    REFERENCES `user` (`id_user`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `collection_recipes` (
  `collection_id_collection` INT UNSIGNED NOT NULL,
  `recipe_id_recipe` INT UNSIGNED NOT NULL,
  `added_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), 
  PRIMARY KEY (`collection_id_collection`, `recipe_id_recipe`),
  INDEX `fk_collection_recipes_recipe1_idx` (`recipe_id_recipe` ASC) VISIBLE,
  CONSTRAINT `fk_collection_recipes_collection1`
    FOREIGN KEY (`collection_id_collection`)
    REFERENCES `collection` (`id_collection`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_collection_recipes_recipe1`
    FOREIGN KEY (`recipe_id_recipe`)
    REFERENCES `recipe` (`id_recipe`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;
