"use client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/** Compatibility adapter for legacy ConscienceOS screeners.
 * Refuses arbitrary external navigation and maps original /dev paths to the
 * Indian Creek admin-only testing workspace.
 */
export function useNavigate() {
  const router = useRouter();
  return useCallback((destination: string | number) => {
    if (typeof destination === "number") {
      if (destination === -1) router.back();
      return;
    }
    if (destination.startsWith("/cogswitch")) {
      router.push("/clinical-tests" + destination);
    } else if (destination.startsWith("/dev/")) {
      router.push("/clinical-tests" + destination);
    } else if (destination === "/dev/level1") {
      router.push("/clinical-tests/dev/level1");
    } else if (destination === "/cseq") {
      router.push("/clinical-tests/cseq");
    } else if (destination === "/cseq-results") {
      router.push("/clinical-tests/cseq/results");
    } else if (destination.startsWith("/clinical-tests/")) {
      router.push(destination);
    } else {
      router.push("/clinical-tests");
    }
  }, [router]);
}
