"use client";

import { useEffect } from "react";

// Radix dialogs/selects/popovers portal to document.body, outside this
// layout's DOM subtree, so a class on a wrapper div never reaches them.
// Toggling the class on <body> itself while this layout is mounted is the
// only way to theme portaled content consistently across the admin area.
export function AdminThemeScope() {
  useEffect(() => {
    document.body.classList.add("admin-theme");
    return () => {
      document.body.classList.remove("admin-theme");
    };
  }, []);

  return null;
}
