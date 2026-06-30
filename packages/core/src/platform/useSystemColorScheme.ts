"use client";

import { useEffect, useState } from "react";

export function useSystemColorScheme(): "light" | "dark" {
  const [scheme, setScheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    setScheme(query.matches ? "dark" : "light");
    const listener = (e: MediaQueryListEvent) =>
      setScheme(e.matches ? "dark" : "light");
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return scheme;
}
