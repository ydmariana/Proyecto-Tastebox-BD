require('dotenv').config();
const express = require('express');
const subscriptionRoutes = require('./routes/subscription.routes');
const userRoutes = require('./routes/user.routes');
const recipeRoutes = require('./routes/recipe.routes');
const reviewRoutes = require('./routes/review.routes');
const saveRecipeRoutes = require('./routes/saverecipe.routes');
const collectionRoutes = require('./routes/collection.routes');
const sessionRoutes = require('./routes/session.routes');

const PORT = Number(process.env.PORT) || 5000;
const COLLECTIONS_BODY_LIMIT = '2mb';
const USERS_BODY_LIMIT = '300kb';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
console.log('Orígenes permitidos:', ALLOWED_ORIGINS);
const api = express();

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const isAllowedOrigin = (origin) => ALLOWED_ORIGINS.includes(origin)
  || (process.env.NODE_ENV !== 'production' && LOCAL_ORIGIN.test(origin));

const allowCrossOrigin = (req, res, next) => {
  const origin = req.get('Origin');
  if (origin && isAllowedOrigin(origin)) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      Vary: 'Origin',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
};

api.use(allowCrossOrigin);
api.use('/collections', express.json({ limit: COLLECTIONS_BODY_LIMIT }));
api.use('/users', express.json({ limit: USERS_BODY_LIMIT }));
api.use(express.json());

api.use('/subscriptions', subscriptionRoutes);
api.use('/users', userRoutes);
api.use('/sessions', sessionRoutes);
api.use('/recipes', recipeRoutes);
api.use('/reviews', reviewRoutes);
api.use('/saved-recipes', saveRecipeRoutes);
api.use('/collections', collectionRoutes);

api.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'La petición es demasiado grande (¿la imagen pesa mucho?)' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  res.status(500).json({ error: 'Error interno del servidor' });
});

if (require.main === module) {
  api.listen(PORT, () => {
    console.log(`Server running in http://localhost:${PORT}`);
  });
}

module.exports = api;
