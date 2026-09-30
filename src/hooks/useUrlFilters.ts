import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

/* Filtres de liste stockés dans l'URL (?depot=…&type=…) : une vue filtrée
   survit au rechargement et peut être partagée par lien.
   `debounced` = valeurs à utiliser pour interroger l'API (la recherche texte
   attend 300 ms après la dernière frappe). */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();
  const values = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ""])) as Record<K, string>;

  const set = (key: K, value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });

  const clear = () =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      keys.forEach((k) => next.delete(k));
      return next;
    }, { replace: true });

  const serialized = keys.map((k) => values[k]).join("\u0000");
  const [debounced, setDebounced] = useState(values);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(values), 300);
    return () => clearTimeout(id);
  }, [serialized]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = keys.filter((k) => values[k] !== "").length;
  return { values, debounced, set, clear, active };
}
