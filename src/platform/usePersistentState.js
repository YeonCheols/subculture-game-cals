import { useEffect, useState } from "react";
import { readPreference, writePreference } from "./storage";

export function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    readPreference(key, initialValue).then((saved) => {
      if (active) { setValue(saved); setHydrated(true); }
    });
    return () => { active = false; };
  }, [key]);

  useEffect(() => {
    if (hydrated) writePreference(key, value).catch((error) => console.error(`설정을 저장하지 못했습니다: ${key}`, error));
  }, [hydrated, key, value]);

  return [value, setValue, hydrated];
}
