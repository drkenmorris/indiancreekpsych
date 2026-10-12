// src/assessments/autism/items/autismItemsParent.ts
//
// v3 item bank: unified 5-point scale + facets + hybrid tier weights.
// NOTE: We keep exports compatible with older imports where possible.

import type { AutismItem, AutismItemBank, AutismItemDomain, AutismResponseOption } from "../engine/autismScoring";

// 5-point Likert response options (shared across all rater forms)
export const AUTISM_RESPONSE_OPTIONS_5PT: AutismResponseOption[] = [
  { id: "NEVER", label: "Never", score: 0 },
  { id: "RARELY", label: "Rarely", score: 1 },
  { id: "SOMETIMES", label: "Sometimes", score: 2 },
  { id: "OFTEN", label: "Often", score: 3 },
  { id: "ALMOST_ALWAYS", label: "Almost always", score: 4 },
];

function inferFacet(domain: AutismItemDomain, text: string) {
  const t = text.toLowerCase();

  switch (domain) {
    case "SOCIAL_COMMUNICATION":
      if (
        t.includes("eye contact") ||
        t.includes("facial") ||
        t.includes("body language") ||
        t.includes("tone") ||
        t.includes("gesture") ||
        t.includes("nonverbal")
      )
        return "NONVERBAL_COMMUNICATION";
      if (
        t.includes("friend") ||
        t.includes("peer") ||
        t.includes("group") ||
        t.includes("relationship") ||
        t.includes("conversation") ||
        t.includes("small talk")
      )
        return "RELATIONSHIPS";
      return "SOCIAL_RECIPROCITY";

    case "RESTRICTED_REPETITIVE_BEHAVIORS":
      if (
        t.includes("repeat") ||
        t.includes("echolalia") ||
        t.includes("phrases") ||
        t.includes("hand flap") ||
        t.includes("rock") ||
        t.includes("spin") ||
        t.includes("stimm")
      )
        return "STEREOTYPED_MOVEMENTS_SPEECH";
      if (
        t.includes("routine") ||
        t.includes("same way") ||
        t.includes("change") ||
        t.includes("transition") ||
        t.includes("unexpected") ||
        t.includes("rigid")
      )
        return "INSISTENCE_ON_SAMENESS";
      return "FIXATED_INTERESTS";

    case "SENSORY_PROCESSING":
      return "SENSORY_REACTIVITY";

    case "EXECUTIVE_FUNCTION":
      if (
        t.includes("plan") ||
        t.includes("organize") ||
        t.includes("organization") ||
        t.includes("materials") ||
        t.includes("multi-step") ||
        t.includes("steps")
      )
        return "PLANNING_ORGANIZATION";
      if (t.includes("remember") || t.includes("forget") || t.includes("working memory"))
        return "WORKING_MEMORY";
      return "EXECUTIVE_FLEXIBILITY";

    case "EMOTIONAL_REGULATION":
    default:
      if (t.includes("anx") || t.includes("worry") || t.includes("panic") || t.includes("stress"))
        return "ANXIETY_STRESS_TOLERANCE";
      return "EMOTION_REGULATION";
  }
}

function inferTier(text: string): 1 | 2 | 3 {
  const t = text.toLowerCase();
  const high = [
    "stimm",
    "hand flap",
    "rock",
    "spin",
    "echolalia",
    "script",
    "eye contact",
    "sensory overload",
    "meltdown",
    "panic",
    "shutdown",
  ];
  const mid = [
    "routine",
    "change",
    "transition",
    "sarcasm",
    "literal",
    "texture",
    "loud",
    "bright",
    "fixated",
    "special interest",
  ];

  if (high.some((k) => t.includes(k))) return 3;
  if (mid.some((k) => t.includes(k))) return 2;
  return 1;
}

// Domain mapping used in earlier drafts
type ParentItemSeed = { id: string; domain: AutismItemDomain; text: string };

const rawItems: ParentItemSeed[] = [
  { id: "P001", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child gets upset when plans or routines change suddenly." },
  { id: "P002", domain: "SOCIAL_COMMUNICATION", text: "My child sometimes misses hints that someone wants to end a conversation." },
  { id: "P003", domain: "SENSORY_PROCESSING", text: "My child is more sensitive than others to bright lights, loud sounds, or strong smells." },
  { id: "P004", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child likes to talk a lot about specific interests." },
  { id: "P005", domain: "EXECUTIVE_FUNCTION", text: "My child has difficulty keeping track of belongings or school materials." },
  { id: "P006", domain: "SOCIAL_COMMUNICATION", text: "My child often finds sarcasm or jokes confusing." },
  { id: "P007", domain: "EMOTIONAL_REGULATION", text: "My child needs extra time to calm down after becoming upset." },
  { id: "P008", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child prefers doing things the same way every time." },
  { id: "P009", domain: "SOCIAL_COMMUNICATION", text: "My child struggles to understand what someone is feeling based on facial expressions." },
  { id: "P010", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child notices patterns that others do not." },
  { id: "P011", domain: "EMOTIONAL_REGULATION", text: "My child worries about making mistakes in social situations." },
  { id: "P012", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child arranges or organizes objects in particular ways." },
  { id: "P013", domain: "SENSORY_PROCESSING", text: "My child becomes overwhelmed in crowded or noisy environments." },
  { id: "P014", domain: "SOCIAL_COMMUNICATION", text: "My child loses track of conversations when multiple people are talking." },
  { id: "P015", domain: "EMOTIONAL_REGULATION", text: "My child has a strong sense of fairness and becomes upset when things feel unfair." },
  { id: "P016", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child talks excessively about favorite interests." },
  { id: "P017", domain: "EMOTIONAL_REGULATION", text: "My child gets frustrated when others do not follow rules or instructions." },
  { id: "P018", domain: "EXECUTIVE_FUNCTION", text: "My child has difficulty quickly shifting from one task to another." },
  { id: "P019", domain: "EMOTIONAL_REGULATION", text: "My child avoids tasks that feel unpredictable or unfamiliar." },
  { id: "P020", domain: "EXECUTIVE_FUNCTION", text: "My child forgets steps in multi-step tasks." },
  { id: "P021", domain: "SOCIAL_COMMUNICATION", text: "My child has trouble understanding implied or indirect communication." },
  { id: "P022", domain: "SOCIAL_COMMUNICATION", text: "My child’s facial expressions do not always match their feelings." },
  { id: "P023", domain: "SENSORY_PROCESSING", text: "My child reacts strongly to certain textures of clothing or food." },
  { id: "P024", domain: "SOCIAL_COMMUNICATION", text: "My child has difficulty making or keeping friends." },
  { id: "P025", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child repeats phrases or lines from shows or videos." },
  { id: "P026", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child becomes deeply absorbed in preferred activities and may not notice others." },
  { id: "P027", domain: "EMOTIONAL_REGULATION", text: "My child takes longer than peers to recover from disappointment." },
  { id: "P028", domain: "SOCIAL_COMMUNICATION", text: "My child often doesn’t realize when someone is bored or annoyed." },
  { id: "P029", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child becomes panicked or shut down when things change unexpectedly." },
  { id: "P030", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child learns everything possible about a few specific interests." },
  { id: "P031", domain: "SOCIAL_COMMUNICATION", text: "My child often misunderstands expectations unless stated clearly." },
  { id: "P032", domain: "EMOTIONAL_REGULATION", text: "My child feels anxious about saying the wrong thing socially." },
  { id: "P033", domain: "SENSORY_PROCESSING", text: "My child is uncomfortable with unexpected physical contact." },
  { id: "P034", domain: "EXECUTIVE_FUNCTION", text: "My child needs reminders to start or finish daily tasks." },
  { id: "P035", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child becomes irritated when familiar routines are changed." },
  { id: "P036", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child relies on predictable routines to feel safe." },
  { id: "P037", domain: "SENSORY_PROCESSING", text: "My child is startled or distressed by sudden loud noises." },
  { id: "P038", domain: "SOCIAL_COMMUNICATION", text: "My child has difficulty recognizing joking versus seriousness." },
  { id: "P039", domain: "SOCIAL_COMMUNICATION", text: "My child often prefers to play or work alone." },
  { id: "P040", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child repeats certain movements (e.g., pacing, rocking, tapping)." },
  { id: "P041", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child prefers schedules and clear plans." },
  { id: "P042", domain: "SOCIAL_COMMUNICATION", text: "My child struggles to understand what others want without direct instructions." },
  { id: "P043", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child gets mentally “stuck” on ideas and has difficulty letting go." },
  { id: "P044", domain: "EMOTIONAL_REGULATION", text: "My child acts anxious when trying new things." },
  { id: "P045", domain: "SOCIAL_COMMUNICATION", text: "My child doesn’t seem to know how to naturally join conversations." },
  { id: "P046", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child has strong memory or knowledge in areas of interest." },
  { id: "P047", domain: "EMOTIONAL_REGULATION", text: "My child’s emotional reactions can be stronger than expected." },
  { id: "P048", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child needs things done in very specific ways." },
  { id: "P049", domain: "SOCIAL_COMMUNICATION", text: "My child sometimes talks over others without realizing it." },
  { id: "P050", domain: "EMOTIONAL_REGULATION", text: "My child avoids activities where embarrassment is possible." },
  { id: "P051", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child lines up or organizes items in repetitive patterns." },
  { id: "P052", domain: "EXECUTIVE_FUNCTION", text: "My child forgets instructions unless they are written or repeated several times." },
  { id: "P053", domain: "SOCIAL_COMMUNICATION", text: "My child sometimes speaks in an unusual or flat tone." },
  { id: "P054", domain: "SENSORY_PROCESSING", text: "My child prefers to eat a narrow range of foods." },
  { id: "P055", domain: "EMOTIONAL_REGULATION", text: "My child takes a long time to emotionally recover once upset." },
  { id: "P056", domain: "SOCIAL_COMMUNICATION", text: "Group work or group play is stressful for my child." },
  { id: "P057", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child prefers clear rules and structure." },
  { id: "P058", domain: "SENSORY_PROCESSING", text: "My child is very sensitive to strong smells." },
  { id: "P059", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child repeats questions even after hearing the answer." },
  { id: "P060", domain: "SOCIAL_COMMUNICATION", text: "My child gets confused by fast-paced conversations." },
  { id: "P061", domain: "EXECUTIVE_FUNCTION", text: "My child frequently loses items." },
  { id: "P062", domain: "EXECUTIVE_FUNCTION", text: "My child understands best when instructions are broken into steps." },
  { id: "P063", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child becomes upset when plans change without warning." },
  { id: "P064", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child becomes hyper-focused on interests and ignores unrelated tasks." },
  { id: "P065", domain: "SOCIAL_COMMUNICATION", text: "My child has difficulty knowing an appropriate distance to stand near others." },
  { id: "P066", domain: "SOCIAL_COMMUNICATION", text: "My child often finds humor confusing unless obvious." },
  { id: "P067", domain: "SOCIAL_COMMUNICATION", text: "My child strongly prefers clear expectations." },
  { id: "P068", domain: "SOCIAL_COMMUNICATION", text: "My child struggles to recognize when someone wants to be their friend." },
  { id: "P069", domain: "SENSORY_PROCESSING", text: "My child avoids certain fabrics, textures, or materials." },
  { id: "P070", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child becomes upset when personal items are moved or rearranged." },
  { id: "P071", domain: "SOCIAL_COMMUNICATION", text: "My child doesn’t always realize when they’ve hurt someone’s feelings." },
  { id: "P072", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child talks about preferred interests repeatedly." },
  { id: "P073", domain: "EMOTIONAL_REGULATION", text: "My child becomes anxious when unsure what will happen next." },
  { id: "P074", domain: "SOCIAL_COMMUNICATION", text: "My child often takes things literally." },
  { id: "P075", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child becomes stressed by even small changes." },
  { id: "P076", domain: "EXECUTIVE_FUNCTION", text: "My child needs support to stay organized." },
  { id: "P077", domain: "EMOTIONAL_REGULATION", text: "My child becomes overwhelmed when multiple things are happening at once." },
  { id: "P078", domain: "EXECUTIVE_FUNCTION", text: "My child forgets what was just said unless repeated." },
  { id: "P079", domain: "SOCIAL_COMMUNICATION", text: "My child prefers solitary activities." },
  { id: "P080", domain: "SOCIAL_COMMUNICATION", text: "My child has difficulty matching their facial expressions to emotions." },
  { id: "P081", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child focuses intensely on details." },
  { id: "P082", domain: "EMOTIONAL_REGULATION", text: "My child may shut down or withdraw when overwhelmed." },
  { id: "P083", domain: "EXECUTIVE_FUNCTION", text: "My child learns best with clear, structured teaching." },
  { id: "P084", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child frequently brings conversations back to preferred interests." },
  { id: "P085", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child offers creative or unusual solutions to problems." },
  { id: "P086", domain: "SOCIAL_COMMUNICATION", text: "My child finds it difficult to rephrase things when misunderstood." },
  { id: "P087", domain: "SENSORY_PROCESSING", text: "My child is uncomfortable with unexpected touch." },
  { id: "P088", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child uses routines to manage emotions and stress." },
  { id: "P089", domain: "SOCIAL_COMMUNICATION", text: "My child struggles to understand indirect requests or hints." },
  { id: "P090", domain: "EXECUTIVE_FUNCTION", text: "My child avoids asking for help, even when needed." },
  { id: "P091", domain: "SENSORY_PROCESSING", text: "My child is bothered by certain repetitive or background noises." },
  { id: "P092", domain: "EMOTIONAL_REGULATION", text: "My child is anxious in unfamiliar social situations." },
  { id: "P093", domain: "EXECUTIVE_FUNCTION", text: "My child has difficulty staying organized without guidance." },
  { id: "P094", domain: "EXECUTIVE_FUNCTION", text: "My child sometimes forgets important parts of instructions." },
  { id: "P095", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child prefers stability and predictability." },
  { id: "P096", domain: "EMOTIONAL_REGULATION", text: "My child behaves differently when overstimulated or overwhelmed." },
  { id: "P097", domain: "SOCIAL_COMMUNICATION", text: "My child wishes social interaction came easier." },
  { id: "P098", domain: "SENSORY_PROCESSING", text: "Certain voices or sounds upset my child." },
  { id: "P099", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child thinks deeply about topics of interest." },
  { id: "P100", domain: "SOCIAL_COMMUNICATION", text: "My child finds interacting with same-age peers more difficult than adults or younger children." },
  { id: "P101", domain: "SOCIAL_COMMUNICATION", text: "My child avoids eye contact without meaning to." },
  { id: "P102", domain: "SOCIAL_COMMUNICATION", text: "My child behaves consistently across situations." },
  { id: "P103", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child learns rapidly when deeply interested." },
  { id: "P104", domain: "SENSORY_PROCESSING", text: "My child becomes overwhelmed in busy classrooms." },
  { id: "P105", domain: "SOCIAL_COMMUNICATION", text: "My child often misses social cues or signals." },
  { id: "P106", domain: "SOCIAL_COMMUNICATION", text: "My child avoids group activities because they feel stressful." },
  { id: "P107", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child gets stuck on thoughts or ideas." },
  { id: "P108", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child relies on routines for emotional stability." },
  { id: "P109", domain: "EXECUTIVE_FUNCTION", text: "My child needs prompting to complete daily self-care or tasks." },
  { id: "P110", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child strongly prefers to follow given instructions precisely." },
  { id: "P111", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child becomes distressed when unable to engage in preferred interests." },
  { id: "P112", domain: "SOCIAL_COMMUNICATION", text: "My child struggles to interpret tone of voice." },
  { id: "P113", domain: "SENSORY_PROCESSING", text: "My child reacts strongly to certain food textures." },
  { id: "P114", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child thinks creatively in areas of interest." },
  { id: "P115", domain: "SOCIAL_COMMUNICATION", text: "Teamwork or group tasks are difficult for my child." },
  { id: "P116", domain: "SOCIAL_COMMUNICATION", text: "My child often misses or misreads social cues." },
  { id: "P117", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child feels safer when routines are predictable." },
  { id: "P118", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child struggles to adapt when plans change." },
  { id: "P119", domain: "SOCIAL_COMMUNICATION", text: "My child sometimes speaks with an unusual tone or rhythm." },
  { id: "P120", domain: "EMOTIONAL_REGULATION", text: "My child needs quiet time to calm down." },
  { id: "P121", domain: "SENSORY_PROCESSING", text: "My child avoids large gatherings or overstimulating environments." },
  { id: "P122", domain: "EXECUTIVE_FUNCTION", text: "My child has difficulty remembering multi-step directions." },
  { id: "P123", domain: "SOCIAL_COMMUNICATION", text: "My child often doesn't notice whether someone is paying attention." },
  { id: "P124", domain: "EMOTIONAL_REGULATION", text: "My child becomes irritated when interrupted." },
  { id: "P125", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child’s interests are very absorbing and intense." },
  { id: "P126", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child prefers regular schedules." },
  { id: "P127", domain: "SOCIAL_COMMUNICATION", text: "My child often seems confused by other people’s behavior." },
  { id: "P128", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child becomes extremely focused on topics they enjoy." },
  { id: "P129", domain: "SOCIAL_COMMUNICATION", text: "My child uses very literal, precise language." },
  { id: "P130", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child becomes upset when items are moved or reorganized." },
  { id: "P131", domain: "SOCIAL_COMMUNICATION", text: "My child struggles to understand expectations without explicit instruction." },
  { id: "P132", domain: "EXECUTIVE_FUNCTION", text: "My child gets overwhelmed when too many tasks are given at once." },
  { id: "P133", domain: "SENSORY_PROCESSING", text: "My child prefers quiet or minimally stimulating environments." },
  { id: "P134", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child shows creativity when working independently." },
  { id: "P135", domain: "SOCIAL_COMMUNICATION", text: "My child sometimes misunderstands instructions from teachers." },
  { id: "P136", domain: "EMOTIONAL_REGULATION", text: "My child’s emotional reactions may be intense when stressed." },
  { id: "P137", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child strongly prefers having the same routine each day." },
  { id: "P138", domain: "EMOTIONAL_REGULATION", text: "My child feels anxious or unsure during social interactions." },
  { id: "P139", domain: "SOCIAL_COMMUNICATION", text: "My child has difficulty recognizing joking or teasing." },
  { id: "P140", domain: "SOCIAL_COMMUNICATION", text: "My child may ignore others unintentionally." },
  { id: "P141", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child prefers doing tasks in their own way." },
  { id: "P142", domain: "RESTRICTED_REPETITIVE_BEHAVIORS", text: "My child becomes deeply absorbed in personal interests." },
  { id: "P143", domain: "SENSORY_PROCESSING", text: "Sensory overload sometimes causes my child to want to leave a situation." },
  { id: "P144", domain: "SOCIAL_COMMUNICATION", text: "My child is often confused by the social behavior of others." },
];

export const AUTISM_ITEMS_PARENT: AutismItem[] = rawItems.map((it) => ({
  ...it,
  rater: "Parent",
  facet: inferFacet(it.domain, it.text),
  isScorable: true,
  reverseKey: false,
  tierWeight: inferTier(it.text),
  coreWeighted: it.domain === "SOCIAL_COMMUNICATION" || it.domain === "RESTRICTED_REPETITIVE_BEHAVIORS",
}));

export const AUTISM_PARENT_ITEM_BANK: AutismItemBank = {
  id: "AUTISM_PARENT",
  rater: "Parent",
  items: AUTISM_ITEMS_PARENT,
  responseOptions: AUTISM_RESPONSE_OPTIONS_5PT,
};

// Back-compat aliases used by older UI code
export const AUTISM_PARENT_ITEMS = AUTISM_ITEMS_PARENT;
export const autismItemsParent = AUTISM_PARENT_ITEM_BANK;

export default AUTISM_PARENT_ITEM_BANK;
