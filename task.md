# i18n wiring — translate ALL screens

## Done
- i18n.tsx: added all keys to en/sw/fr
- reports.tsx ✅
- search.tsx ✅
- timeline.tsx ✅
- life.tsx ✅
- diary.tsx ✅
- goals.tsx ✅

## In progress
- habits.tsx (has "Check-ins · last 7 days", diff empty subtitle)

## TODO
- notes.tsx
- (tabs)/index.tsx
- (tabs)/money.tsx
- (tabs)/plan.tsx
- (tabs)/ai.tsx
- (auth)/sign-in.tsx

## Then
- bunx tsc --noEmit (0 errors)
- restart dev server tmux mob port 4300
- verify bundle has swahili word
- deliver

## COMPLETE
All 13 screens wired with useT(). tsc 0 errors. Bundle HTTP 200, contains sw+fr strings. Done.
