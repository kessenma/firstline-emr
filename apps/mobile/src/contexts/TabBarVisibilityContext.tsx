// apps/mobile/src/contexts/TabBarVisibilityContext.tsx
// Context to control tab bar visibility for immersive screens like thread detail

import React, { createContext, useContext, useState, useCallback } from 'react';

interface TabBarVisibilityContextType {
  isTabBarVisible: boolean;
  hideTabBar: () => void;
  showTabBar: () => void;
}

const TabBarVisibilityContext = createContext<TabBarVisibilityContextType>({
  isTabBarVisible: true,
  hideTabBar: () => {},
  showTabBar: () => {},
});

export const useTabBarVisibility = () => useContext(TabBarVisibilityContext);

export const TabBarVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);

  const hideTabBar = useCallback(() => {
    setIsTabBarVisible(false);
  }, []);

  const showTabBar = useCallback(() => {
    setIsTabBarVisible(true);
  }, []);

  return (
    <TabBarVisibilityContext.Provider
      value={{ isTabBarVisible, hideTabBar, showTabBar }}
    >
      {children}
    </TabBarVisibilityContext.Provider>
  );
};
