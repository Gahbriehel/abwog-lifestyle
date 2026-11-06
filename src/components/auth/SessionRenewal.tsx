"use client";

import { useEffect } from "react";
import { renewSession } from "@/app/actions";

/** Renders nothing; extends the member's 30-day session each time the home page opens. */
export function SessionRenewal() {
  useEffect(() => {
    void renewSession();
  }, []);
  return null;
}
