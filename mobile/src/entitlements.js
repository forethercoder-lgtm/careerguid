import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getJSON, setJSON } from './storage';

// Лимиты бесплатного тарифа
export const FREE_DAILY_AI_LIMIT = 3;

// Тарифы Premium (реальную оплату подключим через RevenueCat — см. PremiumScreen)
export const PLANS = {
  monthly: { id: 'monthly', title: 'Месяц', price: '990 ₽', per: '/мес' },
  yearly: { id: 'yearly', title: 'Год', price: '6 900 ₽', per: '/год', note: 'экономия 42%' },
};

// Что даёт Premium
export const PREMIUM_PERKS = [
  'Безлимит ИИ-запросов (ориентация, подбор вузов, стипендии)',
  'Разбор мотивационного эссе без ограничений',
  'Разбивка плана на дни без лимита',
  'Приоритетная скорость ответов ИИ',
  'Поддержка разработки приложения',
];

const KEY_PREMIUM = 'premium';
const KEY_USAGE = 'ai_usage';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

const EntitlementsContext = createContext(null);

export function EntitlementsProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [premium, setPremium] = useState({ active: false, plan: null, since: null });
  const [usage, setUsage] = useState({ date: todayStr(), count: 0 });

  useEffect(() => {
    (async () => {
      const p = await getJSON(KEY_PREMIUM);
      if (p) setPremium(p);
      const u = await getJSON(KEY_USAGE);
      if (u && u.date === todayStr()) setUsage(u);
      else await setJSON(KEY_USAGE, { date: todayStr(), count: 0 });
      setReady(true);
    })();
  }, []);

  const isPremium = premium.active;
  const usesLeft = isPremium ? Infinity : Math.max(0, FREE_DAILY_AI_LIMIT - usage.count);
  const canUseAi = isPremium || usesLeft > 0;

  // Вызывать ПОСЛЕ успешного ИИ-запроса. Возвращает false, если лимит уже исчерпан.
  const recordAiUse = useCallback(async () => {
    if (isPremium) return true;
    const cur = usage.date === todayStr() ? usage : { date: todayStr(), count: 0 };
    if (cur.count >= FREE_DAILY_AI_LIMIT) return false;
    const next = { date: cur.date, count: cur.count + 1 };
    setUsage(next);
    await setJSON(KEY_USAGE, next);
    return true;
  }, [isPremium, usage]);

  const activatePremium = useCallback(async (planId) => {
    const next = { active: true, plan: planId, since: todayStr() };
    setPremium(next);
    await setJSON(KEY_PREMIUM, next);
  }, []);

  const deactivatePremium = useCallback(async () => {
    const next = { active: false, plan: null, since: null };
    setPremium(next);
    await setJSON(KEY_PREMIUM, next);
  }, []);

  return (
    <EntitlementsContext.Provider
      value={{ ready, isPremium, plan: premium.plan, usesLeft, canUseAi, recordAiUse, activatePremium, deactivatePremium }}
    >
      {children}
    </EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) throw new Error('useEntitlements must be used within EntitlementsProvider');
  return ctx;
}
