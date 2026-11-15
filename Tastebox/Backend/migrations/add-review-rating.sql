USE `tasteBox`;
ALTER TABLE `review` ADD COLUMN `rating` TINYINT UNSIGNED NULL AFTER `comments`;
