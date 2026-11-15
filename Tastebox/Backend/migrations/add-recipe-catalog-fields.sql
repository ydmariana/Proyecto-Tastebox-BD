USE `tasteBox`;

ALTER TABLE `recipe`
  ADD COLUMN `minutes` INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN `image` VARCHAR(255) NULL,        
  ADD COLUMN `verified` TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN `is_premium` TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN `ingredients` TEXT NULL,             
  MODIFY COLUMN `description` TEXT NOT NULL;       
