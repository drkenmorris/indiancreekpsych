// src/asq/parentItems.ts

export type InformantType = "parent" | "self" | "teacher";

export type ParentConstruct =
  | "SOCIAL"
  | "COMMUNICATION"
  | "RRB"
  | "SENSORY"
  | "EXEC"
  | "EMO";

export interface AsqItem {
  id: number;
  text: string;
  construct: ParentConstruct;
  informant: InformantType;
}

export const parentItems: AsqItem[] = [
  { id: 1, text: "My child gets upset when plans or routines change suddenly.", construct: "RRB", informant: "parent" },
  { id: 2, text: "My child sometimes misses hints that someone wants to end a conversation.", construct: "SOCIAL", informant: "parent" },
  { id: 3, text: "My child is more sensitive than others to bright lights, loud sounds, or strong smells.", construct: "SENSORY", informant: "parent" },
  { id: 4, text: "My child likes to talk a lot about specific interests.", construct: "RRB", informant: "parent" },
  { id: 5, text: "My child has difficulty keeping track of belongings or school materials.", construct: "EXEC", informant: "parent" },
  { id: 6, text: "My child often finds sarcasm or jokes confusing.", construct: "COMMUNICATION", informant: "parent" },
  { id: 7, text: "My child needs extra time to calm down after becoming upset.", construct: "EMO", informant: "parent" },
  { id: 8, text: "My child prefers doing things the same way every time.", construct: "RRB", informant: "parent" },
  { id: 9, text: "My child struggles to understand what someone is feeling based on facial expressions.", construct: "SOCIAL", informant: "parent" },
  { id: 10, text: "My child notices patterns that others do not.", construct: "RRB", informant: "parent" },

  { id: 11, text: "My child worries about making mistakes in social situations.", construct: "EMO", informant: "parent" },
  { id: 12, text: "My child arranges or organizes objects in particular ways.", construct: "RRB", informant: "parent" },
  { id: 13, text: "My child becomes overwhelmed in crowded or noisy environments.", construct: "SENSORY", informant: "parent" },
  { id: 14, text: "My child loses track of conversations when multiple people are talking.", construct: "COMMUNICATION", informant: "parent" },
  { id: 15, text: "My child has a strong sense of fairness and becomes upset when things feel unfair.", construct: "EMO", informant: "parent" },
  { id: 16, text: "My child talks excessively about favorite interests.", construct: "RRB", informant: "parent" },
  { id: 17, text: "My child gets frustrated when others do not follow rules or instructions.", construct: "EMO", informant: "parent" },
  { id: 18, text: "My child has difficulty quickly shifting from one task to another.", construct: "EXEC", informant: "parent" },
  { id: 19, text: "My child avoids tasks that feel unpredictable or unfamiliar.", construct: "EMO", informant: "parent" },
  { id: 20, text: "My child forgets steps in multi-step tasks.", construct: "EXEC", informant: "parent" },

  { id: 21, text: "My child has trouble understanding implied or indirect communication.", construct: "COMMUNICATION", informant: "parent" },
  { id: 22, text: "My child’s facial expressions do not always match their feelings.", construct: "SOCIAL", informant: "parent" },
  { id: 23, text: "My child reacts strongly to certain textures of clothing or food.", construct: "SENSORY", informant: "parent" },
  { id: 24, text: "My child has difficulty making or keeping friends.", construct: "SOCIAL", informant: "parent" },
  { id: 25, text: "My child repeats phrases or lines from shows or videos.", construct: "RRB", informant: "parent" },
  { id: 26, text: "My child becomes deeply absorbed in preferred activities and may not notice others.", construct: "RRB", informant: "parent" },
  { id: 27, text: "My child takes longer than peers to recover from disappointment.", construct: "EMO", informant: "parent" },
  { id: 28, text: "My child often doesn’t realize when someone is bored or annoyed.", construct: "SOCIAL", informant: "parent" },
  { id: 29, text: "My child becomes panicked or shut down when things change unexpectedly.", construct: "RRB", informant: "parent" },
  { id: 30, text: "My child learns everything possible about a few specific interests.", construct: "RRB", informant: "parent" },

  { id: 31, text: "My child often misunderstands expectations unless stated clearly.", construct: "COMMUNICATION", informant: "parent" },
  { id: 32, text: "My child feels anxious about saying the wrong thing socially.", construct: "EMO", informant: "parent" },
  { id: 33, text: "My child is uncomfortable with unexpected physical contact.", construct: "SENSORY", informant: "parent" },
  { id: 34, text: "My child needs reminders to start or finish daily tasks.", construct: "EXEC", informant: "parent" },
  { id: 35, text: "My child becomes irritated when familiar routines are changed.", construct: "RRB", informant: "parent" },
  { id: 36, text: "My child relies on predictable routines to feel safe.", construct: "RRB", informant: "parent" },
  { id: 37, text: "My child is startled or distressed by sudden loud noises.", construct: "SENSORY", informant: "parent" },
  { id: 38, text: "My child has difficulty recognizing joking versus seriousness.", construct: "COMMUNICATION", informant: "parent" },
  { id: 39, text: "My child often prefers to play or work alone.", construct: "SOCIAL", informant: "parent" },
  { id: 40, text: "My child repeats certain movements (e.g., pacing, rocking, tapping).", construct: "RRB", informant: "parent" },

  { id: 41, text: "My child prefers schedules and clear plans.", construct: "RRB", informant: "parent" },
  { id: 42, text: "My child struggles to understand what others want without direct instructions.", construct: "COMMUNICATION", informant: "parent" },
  { id: 43, text: "My child gets mentally stuck on ideas and has difficulty letting go.", construct: "RRB", informant: "parent" },
  { id: 44, text: "My child acts anxious when trying new things.", construct: "EMO", informant: "parent" },
  { id: 45, text: "My child doesn’t seem to know how to naturally join conversations.", construct: "SOCIAL", informant: "parent" },
  { id: 46, text: "My child has strong memory or knowledge in areas of interest.", construct: "RRB", informant: "parent" },
  { id: 47, text: "My child’s emotional reactions can be stronger than expected.", construct: "EMO", informant: "parent" },
  { id: 48, text: "My child needs things done in very specific ways.", construct: "RRB", informant: "parent" },
  { id: 49, text: "My child sometimes talks over others without realizing it.", construct: "COMMUNICATION", informant: "parent" },
  { id: 50, text: "My child avoids activities where embarrassment is possible.", construct: "EMO", informant: "parent" },
  { id: 51, text: "My child lines up or organizes items in repetitive patterns.", construct: "RRB", informant: "parent" },
  { id: 52, text: "My child forgets instructions unless they are written or repeated several times.", construct: "EXEC", informant: "parent" },
  { id: 53, text: "My child sometimes speaks in an unusual or flat tone.", construct: "COMMUNICATION", informant: "parent" },
  { id: 54, text: "My child prefers to eat a narrow range of foods.", construct: "SENSORY", informant: "parent" },
  { id: 55, text: "My child takes a long time to emotionally recover once upset.", construct: "EMO", informant: "parent" },
  { id: 56, text: "Group work or group play is stressful for my child.", construct: "SOCIAL", informant: "parent" },
  { id: 57, text: "My child prefers clear rules and structure.", construct: "RRB", informant: "parent" },
  { id: 58, text: "My child is very sensitive to strong smells.", construct: "SENSORY", informant: "parent" },
  { id: 59, text: "My child repeats questions even after hearing the answer.", construct: "RRB", informant: "parent" },
  { id: 60, text: "My child gets confused by fast-paced conversations.", construct: "COMMUNICATION", informant: "parent" },

  { id: 61, text: "My child frequently loses items.", construct: "EXEC", informant: "parent" },
  { id: 62, text: "My child understands best when instructions are broken into steps.", construct: "EXEC", informant: "parent" },
  { id: 63, text: "My child becomes upset when plans change without warning.", construct: "RRB", informant: "parent" },
  { id: 64, text: "My child becomes hyper-focused on interests and ignores unrelated tasks.", construct: "RRB", informant: "parent" },
  { id: 65, text: "My child has difficulty knowing an appropriate distance to stand near others.", construct: "SOCIAL", informant: "parent" },
  { id: 66, text: "My child often finds humor confusing unless obvious.", construct: "COMMUNICATION", informant: "parent" },
  { id: 67, text: "My child strongly prefers clear expectations.", construct: "RRB", informant: "parent" },
  { id: 68, text: "My child struggles to recognize when someone wants to be their friend.", construct: "SOCIAL", informant: "parent" },
  { id: 69, text: "My child avoids certain fabrics, textures, or materials.", construct: "SENSORY", informant: "parent" },
  { id: 70, text: "My child becomes upset when personal items are moved or rearranged.", construct: "RRB", informant: "parent" },

  { id: 71, text: "My child doesn’t always realize when they’ve hurt someone’s feelings.", construct: "SOCIAL", informant: "parent" },
  { id: 72, text: "My child talks about preferred interests repeatedly.", construct: "RRB", informant: "parent" },
  { id: 73, text: "My child becomes anxious when unsure what will happen next.", construct: "EMO", informant: "parent" },
  { id: 74, text: "My child often takes things literally.", construct: "COMMUNICATION", informant: "parent" },
  { id: 75, text: "My child becomes stressed by even small changes.", construct: "RRB", informant: "parent" },
  { id: 76, text: "My child needs support to stay organized.", construct: "EXEC", informant: "parent" },
  { id: 77, text: "My child becomes overwhelmed when multiple things are happening at once.", construct: "EMO", informant: "parent" },
  { id: 78, text: "My child forgets what was just said unless repeated.", construct: "EXEC", informant: "parent" },
  { id: 79, text: "My child prefers solitary activities.", construct: "SOCIAL", informant: "parent" },
  { id: 80, text: "My child has difficulty matching facial expressions to emotions.", construct: "SOCIAL", informant: "parent" },

  { id: 81, text: "My child focuses intensely on details.", construct: "RRB", informant: "parent" },
  { id: 82, text: "My child may shut down or withdraw when overwhelmed.", construct: "EMO", informant: "parent" },
  { id: 83, text: "My child learns best with clear, structured teaching.", construct: "EXEC", informant: "parent" },
  { id: 84, text: "My child frequently brings conversations back to preferred interests.", construct: "RRB", informant: "parent" },
  { id: 85, text: "My child offers creative or unusual solutions to problems.", construct: "RRB", informant: "parent" },
  { id: 86, text: "My child finds it difficult to rephrase things when misunderstood.", construct: "COMMUNICATION", informant: "parent" },
  { id: 87, text: "My child is uncomfortable with unexpected touch.", construct: "SENSORY", informant: "parent" },
  { id: 88, text: "My child uses routines to manage emotions and stress.", construct: "RRB", informant: "parent" },
  { id: 89, text: "My child struggles to understand indirect requests or hints.", construct: "COMMUNICATION", informant: "parent" },
  { id: 90, text: "My child avoids asking for help even when needed.", construct: "EXEC", informant: "parent" },

  { id: 91, text: "My child is bothered by repetitive or background noises.", construct: "SENSORY", informant: "parent" },
  { id: 92, text: "My child is anxious in unfamiliar social situations.", construct: "EMO", informant: "parent" },
  { id: 93, text: "My child has difficulty staying organized without guidance.", construct: "EXEC", informant: "parent" },
  { id: 94, text: "My child sometimes forgets important parts of instructions.", construct: "EXEC", informant: "parent" },
  { id: 95, text: "My child prefers stability and predictability.", construct: "RRB", informant: "parent" },
  { id: 96, text: "My child behaves differently when overstimulated or overwhelmed.", construct: "EMO", informant: "parent" },
  { id: 97, text: "My child wishes social interaction came easier.", construct: "SOCIAL", informant: "parent" },
  { id: 98, text: "Certain voices or sounds upset my child.", construct: "SENSORY", informant: "parent" },
  { id: 99, text: "My child thinks deeply about topics of interest.", construct: "RRB", informant: "parent" },
  { id: 100, text: "My child finds interacting with same-age peers difficult.", construct: "SOCIAL", informant: "parent" },

  { id: 101, text: "My child avoids eye contact without meaning to.", construct: "SOCIAL", informant: "parent" },
  { id: 102, text: "My child behaves consistently across situations.", construct: "SOCIAL", informant: "parent" },
  { id: 103, text: "My child learns rapidly when deeply interested.", construct: "RRB", informant: "parent" },
  { id: 104, text: "My child becomes overwhelmed in busy classrooms.", construct: "SENSORY", informant: "parent" },
  { id: 105, text: "My child often misses social cues or signals.", construct: "SOCIAL", informant: "parent" },
  { id: 106, text: "My child avoids group activities because they feel stressful.", construct: "SOCIAL", informant: "parent" },
  { id: 107, text: "My child gets stuck on thoughts or ideas.", construct: "RRB", informant: "parent" },
  { id: 108, text: "My child relies on routines for emotional stability.", construct: "RRB", informant: "parent" },
  { id: 109, text: "My child needs prompting to complete daily tasks.", construct: "EXEC", informant: "parent" },
  { id: 110, text: "My child prefers to follow instructions precisely.", construct: "RRB", informant: "parent" },

  { id: 111, text: "My child becomes distressed when unable to engage in preferred interests.", construct: "RRB", informant: "parent" },
  { id: 112, text: "My child struggles to interpret tone of voice.", construct: "COMMUNICATION", informant: "parent" },
  { id: 113, text: "My child reacts strongly to certain food textures.", construct: "SENSORY", informant: "parent" },
  { id: 114, text: "My child thinks creatively in areas of interest.", construct: "RRB", informant: "parent" },
  { id: 115, text: "Teamwork or group tasks are difficult for my child.", construct: "SOCIAL", informant: "parent" },
  { id: 116, text: "My child often misreads social cues.", construct: "SOCIAL", informant: "parent" },
  { id: 117, text: "My child feels safer when routines are predictable.", construct: "RRB", informant: "parent" },
  { id: 118, text: "My child struggles to adapt when plans change.", construct: "RRB", informant: "parent" },
  { id: 119, text: "My child sometimes speaks with an unusual rhythm or tone.", construct: "COMMUNICATION", informant: "parent" },
  { id: 120, text: "My child needs quiet time to calm down.", construct: "EMO", informant: "parent" },

  { id: 121, text: "My child avoids overstimulating environments.", construct: "SENSORY", informant: "parent" },
  { id: 122, text: "My child has difficulty remembering multi-step directions.", construct: "EXEC", informant: "parent" },
  { id: 123, text: "My child often doesn’t notice whether someone is paying attention.", construct: "SOCIAL", informant: "parent" },
  { id: 124, text: "My child becomes irritated when interrupted.", construct: "EMO", informant: "parent" },
  { id: 125, text: "My child’s interests are very absorbing and intense.", construct: "RRB", informant: "parent" },
  { id: 126, text: "My child prefers regular schedules.", construct: "RRB", informant: "parent" },
  { id: 127, text: "My child often seems confused by other people’s behavior.", construct: "SOCIAL", informant: "parent" },
  { id: 128, text: "My child becomes extremely focused on topics they enjoy.", construct: "RRB", informant: "parent" },
  { id: 129, text: "My child uses very literal, precise language.", construct: "COMMUNICATION", informant: "parent" },
  { id: 130, text: "My child becomes upset when items are reorganized.", construct: "RRB", informant: "parent" },

  { id: 131, text: "My child struggles to understand expectations without explicit instruction.", construct: "COMMUNICATION", informant: "parent" },
  { id: 132, text: "My child gets overwhelmed when too many tasks are given.", construct: "EXEC", informant: "parent" },
  { id: 133, text: "My child prefers quiet or minimally stimulating environments.", construct: "SENSORY", informant: "parent" },
  { id: 134, text: "My child shows creativity when working independently.", construct: "RRB", informant: "parent" },
  { id: 135, text: "My child sometimes misunderstands instructions from teachers.", construct: "COMMUNICATION", informant: "parent" },
  { id: 136, text: "My child’s emotional reactions may be intense when stressed.", construct: "EMO", informant: "parent" },
  { id: 137, text: "My child strongly prefers having the same routine each day.", construct: "RRB", informant: "parent" },
  { id: 138, text: "My child feels anxious during social interactions.", construct: "EMO", informant: "parent" },
  { id: 139, text: "My child has difficulty recognizing joking or teasing.", construct: "COMMUNICATION", informant: "parent" },
  { id: 140, text: "My child may ignore others unintentionally.", construct: "SOCIAL", informant: "parent" },

  { id: 141, text: "My child prefers doing tasks in their own way.", construct: "RRB", informant: "parent" },
  { id: 142, text: "My child becomes deeply absorbed in personal interests.", construct: "RRB", informant: "parent" },
  { id: 143, text: "Sensory overload sometimes causes my child to want to leave a situation.", construct: "SENSORY", informant: "parent" },
  { id: 144, text: "My child is often confused by the social behavior of others.", construct: "SOCIAL", informant: "parent" }
];

{/*}

  // 51–144 continue identically structured
  // ✅ For brevity in this message, the remaining items are INCLUDED
  // ✅ Your local copy should paste the full continuation below

  { id: 144, text: "My child is often confused by the social behavior of others.", construct: "SOCIAL", informant: "parent" }
];
*/}