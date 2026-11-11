# EMR backend module parity — source hash audit (2026-11-09)

**Outcome: 20 of 20 shared Python/JSON engine modules are byte-identical.** The prior blocker that the Vercel file-content API truncated source payloads is resolved for **file parity**. This is not proof that live and prototype workflows operate identically: app routes, frontend scripts, provider authorization, database storage and deployment configuration can differ.

## Exact comparison method

- Prototype source is production-target Vercel deployment `dpl_Gj1RKHg8knexKoTdx5do1dYA2BSZ` (project `emr-workflow-demo`), under its source tree `src/engine/modules/*`.
- Its deployment file tree returns each source file's 40-character `uid`, which is the **raw SHA-1 digest of the bytes**. This interpretation was independently verified against the full, retrievable `clinical.py` body.
- Live code is `drkenmorris/indiancreekpsych`, GitHub `main:emr_engine/modules/*` as fetched on 2026-11-09. The complete GitHub UTF-8 text was re-encoded as UTF-8 and SHA-1 hashed. Both digest and length were computed for the full file, not Vercel's truncated payload.
- Each of the 20 raw SHA-1 digests exactly matched its prototype `uid`. This establishes byte equality for all 20 named shared files **at the examined revisions**, without relying on the truncated download.
- SHA-1 here is used as a source-file identity/checksum comparison, **not** as a clinical record integrity or cryptographic trust control.

| Shared module | Source SHA-1 (both) | Match |
| --- | --- | --- |
| `billing.py` | `15ccc9bbd74c185f5940856dba5b5e88c6e92128` | identical |
| `biopsychosocial.py` | `6b4e92c4b3f567a0fb7e194566d511d483ee5970` | identical |
| `bps_consolidation.py` | `33394eb840dc478da8c3c84ab8e05c352ce57d65` | identical |
| `clinical.py` | `910061437cdb1facd163724d65620718014a37bd` | identical |
| `developmental_personal.py` | `0a80db5f6e367d2831cc2d9835fbd51da1bfb989` | identical |
| `family_origin.py` | `44db45c747e3150c6109b0b156e281f2c45fc95b` | identical |
| `groups.py` | `297740826f06d2129e9cb597f3c0eeede2bc25ad` | identical |
| `legal_forms.json` | `8126c40831c1ce4afbc42972b2a53345b5175af9` | identical |
| `legal_routing.py` | `86cb65cf19f25c0df71737c22f727077ef6a493e` | identical |
| `legal_routing_definition.json` | `e26c5032a0eb07c9edad762c7fc47e31ed991243` | identical |
| `legal_routing_help.json` | `50026c7d6682351565e7d44409067c505328d47c` | identical |
| `library.py` | `35805c53adc9552fdbac3e16a04f6f4935ceb814` | identical |
| `medical_substance.py` | `41f7b3b83af5fcb9e8aeac0be849eee0f0006b93` | identical |
| `medical_substance_definition.json` | `e0cbbede5b5b3065cf5ebf700e1d16ddb018c481` | identical |
| `patients.py` | `4c3c84d5bd5815d23996ac30a7f53982a7e8501e` | identical |
| `planning.py` | `5e7bbaff2b7aa16ed7363b807a07a1b1826f0d1a` | identical |
| `questionnaires.py` | `6ec8410400e7300cdb17039711eef722c0e46074` | identical |
| `trauma_history.py` | `ae8b23030c81a9c011fbbf3db73e1d12fc41c6bf` | identical |
| `trauma_history_definition.json` | `6faca586ece75ae39cf659a1465167e038eb6c93` | identical |
| `workspaces.py` | `7d1abd7c8334b61e682a7f0f588fa77e82f4b786` | identical |

## Integration implications

1. The 20 shared Python/JSON module bodies need **no blind copy** from the prototype. A copy would add no functionality and could jeopardize live production.
2. Both copies of `groups.py` are the same **synthetic** engine implementation. The new protected `/emr/groups` Supabase-backed module on the integration branch is a new live-safe feature, not a migration of prototype chart data.
3. The prototype-only `engine/modules/providers.py` and `api/providers.py` are **excluded** from replacement consideration. They are not shared live modules and the synthetic provider vault must not be imported.
4. Remaining functional differences must be investigated in the previously found **six differing shared frontend assets**, separately deployed backend/API wrappers, Supabase schema, patient workflows and browser behavior. Hash matches do not prove E2E behavior equivalence.
5. The 34-area feature matrix remains a **preliminary functional disposition**, not 34 passing acceptance tests. Scheduler, MFA, central UUIDs, patient history and existing administrator security remain protected.

## Separate group chart time fix in the integration branch

The `/emr/groups` prototype-to-live adaptation now reads the actual practice timezone from protected `appointment_settings`, rather than deriving an instant from the clinician's browser timezone or hardcoding America/Chicago. It rejects missing/duplicated daylight-saving wall times and API timestamps without an explicit UTC offset. This is **branch code** awaiting CI and authenticated nonproduction acceptance.

**Release status:** No production merge or Vercel production deployment authorized by this audit. Nonproduction migration test, authenticated browser acceptance, individual group note links, billed encounters, and full chart/workflow checks are still outstanding.

## Additional deployed-source checks: ten shared frontend assets plus synthetic store

The same Vercel raw-SHA-1 method was applied to the ten files under `src/public/*` versus `main:public/emr-assets/*`. The result independently confirms the previously observed **4 byte-identical** and **6 differing** frontend assets:

| Frontend asset | Source bytes identical? | Integration rule |
| --- | --- | --- |
| `app.js` | No | Retain production central UUID and protected workspace |
| `index.html` | No | Retain production routes |
| `menu-completion.js` | **Yes** | No replacement necessary |
| `module-menu.js` | No | Retain live managed libraries |
| `navigation-menus.js` | No | Retain live logout/account routing |
| `navigation.js` | **Yes** | No replacement necessary |
| `patients.js` | No | Retain central patient precedence |
| `planner.js` | **Yes** | No replacement necessary |
| `providers.js` | No | Do not replace live administrator/session model |
| `style.css` | **Yes** | No replacement necessary |

The prototype's `engine/store.py` and production `emr_engine/store.py` are **not** byte-identical (prototype SHA-1 `c78294624cc972e34bab190f0a9589977bd6a431`; production SHA-1 `92d415a92cadb09ea02d0f740f18d36ec580cfde`). Both refer to synthetic workflow storage; this comparison **does not establish** that it is the active production database. The actual patient record authority remains the protected Supabase stack and must not be displaced by either synthetic store.

**Total completed shared source-file comparisons this audit: 31** (20 shared engine module bodies, 10 shared frontend files, 1 synthetic engine store). **Identical: 24. Different: 7.** These are verified source-file comparisons, not a count of fully integrated clinical features.
