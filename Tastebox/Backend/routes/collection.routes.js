const router = require('express').Router();
const dao = require('../dao/collection.dao');

router.get('/user/:userId', dao.getByUser);
router.get('/:id', dao.getById);
router.post('/', dao.create);
router.put('/:id', dao.update);
router.delete('/:id', dao.remove);
router.post('/:id/recipes', dao.addRecipe);
router.delete('/:id/recipes/:recipeId', dao.removeRecipe);

module.exports = router;
