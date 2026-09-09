import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { C, withOpacity } from '../theme';

const CATS = { documents: '📄', languages: '🗣', universities: '🏫', essays: '✍️', study: '📚', finances: '💰', other: '📌' };

function TaskRow({ task, onToggle, onDelete, onFindLocal }) {
  function renderDeleteAction() {
    return (
      <TouchableOpacity style={s.swipeDelete} onPress={() => onDelete(task)}>
        <Text style={s.swipeDeleteIcon}>🗑</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable renderRightActions={renderDeleteAction} overshootRight={false}>
      <TouchableOpacity style={s.row} onPress={() => onToggle(task.id)}>
        <View style={[s.avatar, task.done && s.avatarDone]}>
          <Text style={s.avatarEmoji}>{task.done ? '✅' : (CATS[task.category] || '📌')}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.rowTitle, task.done && s.rowTitleDone]}>{task.title}</Text>
          {task.note ? <Text style={s.rowSubtitle} numberOfLines={1}>{task.note}</Text> : null}
        </View>
        {onFindLocal && (
          <TouchableOpacity onPress={() => onFindLocal(task)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.rowAction}>📍</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
}

export default memo(TaskRow, (prev, next) =>
  prev.task === next.task && prev.onToggle === next.onToggle && prev.onDelete === next.onDelete && prev.onFindLocal === next.onFindLocal
);

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.bg },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: withOpacity(C.primary, 0.15), alignItems: 'center', justifyContent: 'center' },
  avatarDone: { backgroundColor: withOpacity(C.success, 0.15) },
  avatarEmoji: { fontSize: 19 },
  rowTitle: { color: C.text, fontSize: 15, fontWeight: '600' },
  rowTitleDone: { textDecorationLine: 'line-through', color: C.muted },
  rowSubtitle: { color: C.muted, fontSize: 12, marginTop: 2 },
  rowAction: { fontSize: 18, padding: 4 },
  swipeDelete: { backgroundColor: C.danger, justifyContent: 'center', alignItems: 'center', width: 72 },
  swipeDeleteIcon: { fontSize: 22 },
});
