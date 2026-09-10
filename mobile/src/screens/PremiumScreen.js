import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, S, withOpacity } from '../theme';
import { PLANS, PREMIUM_PERKS, FREE_DAILY_AI_LIMIT, useEntitlements } from '../entitlements';

export default function PremiumScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isPremium, plan, usesLeft, activatePremium, deactivatePremium } = useEntitlements();
  const [selected, setSelected] = useState('yearly');
  const [busy, setBusy] = useState(false);

  async function subscribe() {
    setBusy(true);
    // TODO: подключить RevenueCat (react-native-purchases):
    //   const { customerInfo } = await Purchases.purchasePackage(pkg);
    //   if (customerInfo.entitlements.active['premium']) await activatePremium(selected);
    // Пока — локальная активация для теста интерфейса и гейтинга.
    await new Promise(r => setTimeout(r, 600));
    await activatePremium(selected);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setBusy(false);
    Alert.alert('Готово', 'Premium активирован. (Тестовый режим — оплата ещё не подключена.)');
  }

  function restore() {
    // TODO: Purchases.restorePurchases()
    Alert.alert('Восстановление покупок', 'Оплата ещё не подключена — восстанавливать нечего.');
  }

  if (isPremium) {
    return (
      <View style={[s.page, { paddingTop: insets.top }]}>
        <Header navigation={navigation} />
        <View style={s.activeWrap}>
          <Text style={s.crown}>👑</Text>
          <Text style={s.activeTitle}>Premium активен</Text>
          <Text style={s.activeSub}>Тариф: {PLANS[plan]?.title || '—'}. Все функции без ограничений.</Text>
          <TouchableOpacity style={s.linkBtn} onPress={() => { deactivatePremium(); }}>
            <Text style={s.linkBtnText}>Отключить (тест)</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.page, { paddingTop: insets.top }]}>
      <Header navigation={navigation} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }}>
        <Text style={s.hero}>👑</Text>
        <Text style={s.title}>КарьерГид Premium</Text>
        <Text style={s.sub}>
          На бесплатном тарифе — {FREE_DAILY_AI_LIMIT} ИИ-запроса в день
          {usesLeft !== Infinity ? ` (сегодня осталось ${usesLeft})` : ''}. Premium снимает все лимиты.
        </Text>

        <View style={s.perks}>
          {PREMIUM_PERKS.map((p, i) => (
            <View key={i} style={s.perkRow}>
              <Text style={s.check}>✓</Text>
              <Text style={s.perkText}>{p}</Text>
            </View>
          ))}
        </View>

        <View style={s.plans}>
          {Object.values(PLANS).map(pl => {
            const active = selected === pl.id;
            return (
              <TouchableOpacity key={pl.id} style={[s.plan, active && s.planActive]} onPress={() => setSelected(pl.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.planTitle, active && s.planTitleActive]}>{pl.title}</Text>
                  {pl.note ? <Text style={s.planNote}>{pl.note}</Text> : null}
                </View>
                <Text style={[s.planPrice, active && s.planTitleActive]}>{pl.price}<Text style={s.planPer}>{pl.per}</Text></Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={[S.btn, S.btnPrimary, { marginTop: 20 }]} onPress={subscribe} disabled={busy}>
          <Text style={S.btnText}>{busy ? 'Оформляю...' : 'Оформить Premium'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.restore} onPress={restore}>
          <Text style={s.restoreText}>Восстановить покупки</Text>
        </TouchableOpacity>
        <Text style={s.legal}>
          Оплата спишется через магазин приложений. Подписка продлевается автоматически, отменить можно в настройках аккаунта магазина.
        </Text>
      </ScrollView>
    </View>
  );
}

function Header({ navigation }) {
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={s.back}>← Назад</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  back: { color: C.muted, fontSize: 14, fontWeight: '600' },
  hero: { fontSize: 52, textAlign: 'center', marginBottom: 8 },
  title: { color: C.text, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  sub: { color: C.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  perks: { marginTop: 24, gap: 12 },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  check: { color: C.primary, fontSize: 15, fontWeight: '900', marginTop: 1 },
  perkText: { color: C.text, fontSize: 14, lineHeight: 20, flex: 1 },
  plans: { marginTop: 26, gap: 10 },
  plan: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border },
  planActive: { borderColor: C.primary, backgroundColor: withOpacity(C.primary, 0.12) },
  planTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  planTitleActive: { color: C.primary },
  planNote: { color: C.success, fontSize: 12, fontWeight: '600', marginTop: 2 },
  planPrice: { color: C.text, fontSize: 16, fontWeight: '800' },
  planPer: { color: C.muted, fontSize: 12, fontWeight: '600' },
  restore: { alignItems: 'center', paddingVertical: 14 },
  restoreText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  legal: { color: C.faint, fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 8 },
  activeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  crown: { fontSize: 60, marginBottom: 12 },
  activeTitle: { color: C.text, fontSize: 22, fontWeight: '900' },
  activeSub: { color: C.muted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  linkBtn: { marginTop: 24, paddingVertical: 10, paddingHorizontal: 18 },
  linkBtnText: { color: C.faint, fontSize: 13, fontWeight: '600' },
});
