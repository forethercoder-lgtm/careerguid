export const C = {
  bg:       '#0b141a',
  bg2:      '#202c33',
  surface:  '#1f2c34',
  border:   'rgba(255,255,255,0.08)',
  primary:  '#00a884',
  secondary:'#005c4b',
  accent:   '#00a884',
  success:  '#25d366',
  danger:   '#f15c6d',
  text:     '#e9edef',
  muted:    '#8696a0',
  faint:    '#667781',
};

export function withOpacity(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const S = {
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: C.primary,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    color: C.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  label: {
    color: C.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    color: C.text,
    fontSize: 24,
    fontWeight: '800',
  },
  sub: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
  },
};
