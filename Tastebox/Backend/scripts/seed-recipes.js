const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIFFICULTY_BY_LABEL = { Fácil: 1, Intermedio: 3, Difícil: 5 };
const CATALOG_GROUPS = ['featured', 'more', 'premium'];
const NAME_MAX_LENGTH = 45;
const DESCRIPTION_MAX_LENGTH = 5000;

const readDataConstant = (directory, fileName, constantName) => {
  const code = fs.readFileSync(path.join(directory, fileName), 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${code}\n;globalThis.__value = ${constantName};`, sandbox);
  return sandbox.__value;
};

const shorten = (text, maxLength) => (text.length <= maxLength ? text : `${text.slice(0, maxLength - 3).trimEnd()}...`);

const buildDescription = (name, categoryLabel, minutes, details) => {
  const detail = details[name];
  if (detail && detail.description) return shorten(detail.description, DESCRIPTION_MAX_LENGTH);
  return shorten(`Receta de ${categoryLabel.toLowerCase()} lista en ${minutes} minutos.`, DESCRIPTION_MAX_LENGTH);
};

const buildIngredients = (name, details) => {
  const list = details[name] && details[name].ingredients;
  return Array.isArray(list) && list.length ? list.join('\n') : null;
};

const collectRecipes = (categories, details) => {
  const recipes = new Map();
  const skipped = [];
  Object.values(categories).forEach((category) => CATALOG_GROUPS.forEach((group) => {
    (category[group] || []).forEach(([name, level, minutes, , verified, image]) => {
      if (recipes.has(name)) return;
      if (name.length > NAME_MAX_LENGTH || !DIFFICULTY_BY_LABEL[level]) {
        skipped.push(name);
        return;
      }
      recipes.set(name, {
        name,
        difficulty_level: DIFFICULTY_BY_LABEL[level],
        cuisine_type: category.label,
        description: buildDescription(name, category.label, minutes, details),
        minutes: Number(minutes) || 0,
        image: image || null,
        verified: verified ? 1 : 0,
        is_premium: group === 'premium' ? 1 : 0,
        ingredients: buildIngredients(name, details),
      });
    });
  }));
  return { recipes: [...recipes.values()], skipped };
};

const readDataDirectory = () => {
  const flagIndex = process.argv.indexOf('--data');
  const relative = flagIndex > -1 ? process.argv[flagIndex + 1] : 'data';
  return path.resolve(__dirname, relative);
};

const run = async () => {
  const dryRun = process.argv.includes('--dry-run');
  const directory = readDataDirectory();
  const categories = readDataConstant(directory, 'categoryData.js', 'CATEGORIES');
  const details = readDataConstant(directory, 'recipeData.js', 'RECIPE_DETAILS');
  const { recipes, skipped } = collectRecipes(categories, details);

  const db = require('../services/mysql.service');
  try {
    const [existing] = await db.query('SELECT name, minutes, image, ingredients FROM recipe');
    const existingByName = new Map(existing.map((row) => [row.name, row]));
    const pending = recipes.filter((recipe) => !existingByName.has(recipe.name));
    const incomplete = recipes.filter((recipe) => {
      const row = existingByName.get(recipe.name);
      return row && Number(row.minutes) === 0 && row.image === null && row.ingredients === null;
    });

    if (!dryRun) {
      for (const recipe of pending) {
        await db.query(
          `INSERT INTO recipe (name, difficulty_level, cuisine_type, description, minutes, image, verified, is_premium, ingredients, preparation_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [recipe.name, recipe.difficulty_level, recipe.cuisine_type, recipe.description, recipe.minutes, recipe.image, recipe.verified, recipe.is_premium, recipe.ingredients],
        );
      }
      for (const recipe of incomplete) {
        await db.query(
          `UPDATE recipe SET description = ?, minutes = ?, image = ?, verified = ?, is_premium = ?, ingredients = ?
           WHERE name = ? AND minutes = 0 AND image IS NULL AND ingredients IS NULL`,
          [recipe.description, recipe.minutes, recipe.image, recipe.verified, recipe.is_premium, recipe.ingredients, recipe.name],
        );
      }
    }
    console.log(JSON.stringify({
      dryRun,
      inCatalog: recipes.length,
      alreadyInDatabase: recipes.length - pending.length,
      inserted: dryRun ? 0 : pending.length,
      wouldInsert: dryRun ? pending.length : 0,
      completed: dryRun ? 0 : incomplete.length,
      wouldComplete: dryRun ? incomplete.length : 0,
      skippedInvalid: skipped,
    }, null, 2));
  } finally {
    await db.end();
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error('No se pudo cargar el catálogo:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { collectRecipes, DIFFICULTY_BY_LABEL };
