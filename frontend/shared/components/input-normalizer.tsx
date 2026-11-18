"use client";
import { useEffect } from "react";
export default function InputNormalizer() {
  useEffect(() => {
    const change = (event: Event) => {
      const input = event.target;
      if (
        !(input instanceof HTMLInputElement) ||
        ![
          "phone",
          "recipient_phone",
          "emergency_phone",
          "national_id",
          "code",
        ].includes(input.name)
      )
        return;
      const value = input.value
        .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
        .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632));
      if (value !== input.value) input.value = value;
    };
    document.addEventListener("input", change, true);
    document.addEventListener("change", change, true);
    document.addEventListener("blur", change, true);
    return () => {
      document.removeEventListener("input", change, true);
      document.removeEventListener("change", change, true);
      document.removeEventListener("blur", change, true);
    };
  }, []);
  return null;
}
