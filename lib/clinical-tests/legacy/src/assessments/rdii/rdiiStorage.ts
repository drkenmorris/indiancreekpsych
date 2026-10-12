import { RDII_META } from "./rdiiMeta";
import type { FormType } from "./rdiiTypes";

export function rdiiStorageKey(
  instanceId: string,
  form: FormType
) {
  return `RDII:${RDII_META.version}:${instanceId}:${form}`;
}