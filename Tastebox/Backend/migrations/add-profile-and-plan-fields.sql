USE `tasteBox`;

ALTER TABLE `user`
  ADD COLUMN `username` VARCHAR(30) NULL AFTER `email`,
  ADD COLUMN `full_name` VARCHAR(60) NULL AFTER `username`,
  ADD COLUMN `address` VARCHAR(100) NULL AFTER `full_name`,
  ADD COLUMN `phone` VARCHAR(20) NULL AFTER `address`,
  ADD COLUMN `photo` MEDIUMTEXT NULL AFTER `phone`,
  ADD COLUMN `subscription_started_at` DATETIME NULL AFTER `subscription_id_subscription`,
  ADD COLUMN `subscription_renews_at` DATETIME NULL AFTER `subscription_started_at`,
  ADD COLUMN `subscription_expires_at` DATETIME NULL AFTER `subscription_renews_at`;

ALTER TABLE `subscription`
  ADD COLUMN `price` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `name`,
  ADD COLUMN `features` TEXT NULL AFTER `price`,
  ADD COLUMN `monthly_recipe_limit` INT UNSIGNED NULL AFTER `features`,
  ADD COLUMN `trial_days` INT UNSIGNED NULL AFTER `monthly_recipe_limit`;

UPDATE `subscription`
SET price = 0,
    features = 'Acceso limitado a recetas al mes\nGuardar recetas en tu colección\nDejar reseñas',
    monthly_recipe_limit = 25,
    trial_days = 12
WHERE name = 'Gratuito';

UPDATE `subscription`
SET price = 26000,
    features = 'Recetas ilimitadas\nCaja de ingredientes semanales\nSeguimiento de hábitos completo',
    monthly_recipe_limit = NULL,
    trial_days = NULL
WHERE name = 'Premium';

UPDATE `user` u
JOIN `subscription` s ON s.id_subscription = u.subscription_id_subscription
SET u.subscription_started_at = NOW(),
    u.subscription_renews_at = IF(s.price > 0, DATE_ADD(NOW(), INTERVAL 1 MONTH), NULL),
    u.subscription_expires_at = IF(s.price > 0, NULL, DATE_ADD(NOW(), INTERVAL IFNULL(s.trial_days, 12) DAY))
WHERE u.subscription_started_at IS NULL;
