import { useEffect, useState } from "react";

export function useApiData<T>(
  fetcher: () => Promise<T>,
  fallback: T,
  deps: React.DependencyList = [],
) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetcher()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setUsingFallback(false);
      })
      .catch((e) => {
        if (!alive) return;
        console.warn("[useApiData] API offline, fallback:", e?.message);
        setData(fallback);
        setUsingFallback(true);
        setError(e?.message || "Erreur réseau");
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, usingFallback, setData };
}
