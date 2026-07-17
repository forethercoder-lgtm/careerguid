export const C = {
  bg:       '#0a0a1a',
  bg2:      '#111128',
  surface:  'rgba(255,255,255,0.06)',
  border:   'rgba(255,255,255,0.1)',
  primary:  '#6366f1',
  secondary:'#8b5cf6',
  accent:   '#f59e0b',
  success:  '#10b981',
  danger:   '#ef4444',
  text:     '#f1f5f9',
  muted:    '#94a3b8',
  faint:    '#475569',
};

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
