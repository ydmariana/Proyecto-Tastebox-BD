(() => {
  "use strict";

  const normalize = (text) => String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const keyOf = (subscription) => {
    const name = normalize(subscription.name);
    if (/premium/.test(name)) return "premium";
    if (/gratu/.test(name)) return "gratuito";
    return "other";
  };

  const splitFeatures = (features) => (features ? String(features).split("\n").map((line) => line.trim()).filter(Boolean) : []);

  const toNullableNumber = (value) => (value === null || value === undefined ? null : Number(value));

  const toPlan = (subscription) => ({
    id: subscription.id_subscription,
    key: keyOf(subscription),
    name: subscription.name,
    price: Number(subscription.price) || 0,
    features: splitFeatures(subscription.features),
    monthlyRecipeLimit: toNullableNumber(subscription.monthly_recipe_limit),
    trialDays: toNullableNumber(subscription.trial_days),
  });

  const unique = (plans) => {
    const byKey = new Map();
    [...plans].sort((a, b) => a.id - b.id).forEach((plan) => {
      const groupKey = plan.key === "other" ? "other:" + normalize(plan.name) : plan.key;
      const existing = byKey.get(groupKey);
      if (existing) existing.ids.push(plan.id);
      else byKey.set(groupKey, { ...plan, ids: [plan.id] });
    });
    return [...byKey.values()].sort((a, b) => a.price - b.price);
  };

  let cachedPlans = null;

  const list = async () => {
    if (!cachedPlans) {
      cachedPlans = window.TasteboxApi.getSubscriptions()
        .then((rows) => unique(rows.map(toPlan)))
        .catch((error) => { cachedPlans = null; throw error; });
    }
    return cachedPlans;
  };

  const getCurrentSubscription = async () => {
    const current = window.TasteboxSession.get();
    if (!current) return null;
    const [user, plans] = await Promise.all([window.TasteboxApi.getUser(current.id), list()]);
    window.TasteboxSession.update({ subscriptionId: user.subscription_id_subscription });
    const plan = plans.find((candidate) => candidate.ids.includes(user.subscription_id_subscription)) || null;
    return { user, plan };
  };

  const getCurrent = async () => {
    const subscription = await getCurrentSubscription();
    return subscription ? subscription.plan : null;
  };

  const isPaid = (plan) => Boolean(plan && plan.price > 0);

  window.TasteboxPlans = { list, getCurrent, getCurrentSubscription, isPaid };
})();
