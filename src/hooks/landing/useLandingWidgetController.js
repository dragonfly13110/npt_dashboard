import { useState, useCallback } from 'react';

export default function useLandingWidgetController() {
  const [activeWidgetKey, setActiveWidgetKey] = useState(null);

  const openWidget = useCallback((key) => {
    setActiveWidgetKey(key);
  }, []);

  const closeWidget = useCallback(() => {
    setActiveWidgetKey(null);
  }, []);

  return {
    activeWidgetKey,
    openWidget,
    closeWidget,
  };
}
