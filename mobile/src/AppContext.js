import { createContext, useContext } from 'react';

// { token, user, onboarding } — общие данные сессии для всех вкладок
export const AppContext = createContext({});
export const useApp = () => useContext(AppContext);
