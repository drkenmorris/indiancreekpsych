import type { AssessmentItem } from "./rdiiTypes";

/**
 * RDII Form A (Self-report)
 * - Items are designed to use a hybrid frequency-anchored agreement scale (Likert6).
 * - reverse: true indicates the item should be reverse-keyed in scoring.
 */
export const rdiiItemsFormA: AssessmentItem[] = [
  // Domain I — Love Integrity (1–40)
  // I1_REGULATION_PATIENCE (1–5)
  { id: 1, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I1_REGULATION_PATIENCE", reverse: false, text: "I stay emotionally steady, even when my partner is upset with me." },
  { id: 2, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I1_REGULATION_PATIENCE", reverse: true,  text: "When my partner upsets me, I react quickly and say things I later regret." },
  { id: 3, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I1_REGULATION_PATIENCE", reverse: false, text: "I can pause and think before I respond during conflict." },
  { id: 4, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I1_REGULATION_PATIENCE", reverse: true,  text: "Small problems with my partner often turn into big arguments because I get overwhelmed." },
  { id: 5, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I1_REGULATION_PATIENCE", reverse: false, text: "Even when I’m stressed, I try to respond with patience instead of intensity." },

  // I2_KINDNESS (6–10)
  { id: 6,  form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I2_KINDNESS", reverse: false, text: "I speak to my partner with warmth and kindness most of the time." },
  { id: 7,  form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I2_KINDNESS", reverse: true,  text: "When I’m frustrated, I can become sharp, sarcastic, or cutting toward my partner." },
  { id: 8,  form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I2_KINDNESS", reverse: false, text: "I look for ways to make my partner’s day easier or better." },
  { id: 9,  form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I2_KINDNESS", reverse: true,  text: "I ignore my partner’s needs when I feel my own needs aren’t being met." },
  { id: 10, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I2_KINDNESS", reverse: false, text: "I show care through small, consistent actions (helping, checking in, encouragement)." },

  // I3_HUMILITY (11–15)
  { id: 11, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I3_HUMILITY", reverse: false, text: "I can admit when I am wrong without needing to defend myself." },
  { id: 12, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I3_HUMILITY", reverse: true,  text: "I find it hard to apologize unless my partner apologizes first." },
  { id: 13, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I3_HUMILITY", reverse: false, text: "I can accept feedback from my partner without turning it into a fight." },
  { id: 14, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I3_HUMILITY", reverse: true,  text: "I need to be ‘right’ in conflicts, even when it damages the relationship." },
  { id: 15, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I3_HUMILITY", reverse: false, text: "I try to understand my partner’s point of view even when I disagree." },

  // I4_HONOR_RESPECT (16–20)
  { id: 16, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I4_HONOR_RESPECT", reverse: false, text: "I treat my partner with respect, even when I’m angry." },
  { id: 17, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I4_HONOR_RESPECT", reverse: true,  text: "I say or do things that shame my partner when I’m upset." },
  { id: 18, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I4_HONOR_RESPECT", reverse: false, text: "I avoid insulting, mocking, or humiliating my partner." },
  { id: 19, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I4_HONOR_RESPECT", reverse: true,  text: "I bring up my partner’s weaknesses or past failures in arguments." },
  { id: 20, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I4_HONOR_RESPECT", reverse: false, text: "I make an effort to speak about my partner in a positive way to others." },

  // I5_INTEGRITY_TRUTH (21–25)
  { id: 21, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I5_INTEGRITY_TRUTH", reverse: false, text: "I am honest with my partner, even when it’s uncomfortable." },
  { id: 22, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I5_INTEGRITY_TRUTH", reverse: true,  text: "I hide things from my partner to avoid conflict or consequences." },
  { id: 23, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I5_INTEGRITY_TRUTH", reverse: false, text: "I try to solve problems with clarity and truth, not distortion or blame." },
  { id: 24, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I5_INTEGRITY_TRUTH", reverse: true,  text: "I twist facts or leave out details to make my side look better." },
  { id: 25, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I5_INTEGRITY_TRUTH", reverse: false, text: "I can own my part in problems without minimizing it." },

  // I6_MERCY_NO_SCOREKEEPING (26–30)
  { id: 26, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I6_MERCY_NO_SCOREKEEPING", reverse: false, text: "I try to forgive rather than keep a running list of my partner’s wrongs." },
  { id: 27, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I6_MERCY_NO_SCOREKEEPING", reverse: true,  text: "I bring up old hurts during new conflicts." },
  { id: 28, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I6_MERCY_NO_SCOREKEEPING", reverse: false, text: "I can let go of smaller offenses instead of storing them up." },
  { id: 29, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I6_MERCY_NO_SCOREKEEPING", reverse: true,  text: "I use past mistakes as leverage to win arguments." },
  { id: 30, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I6_MERCY_NO_SCOREKEEPING", reverse: false, text: "I focus on repair and moving forward more than punishment or payback." },

  // I7_PROTECTIVE_LOYALTY (31–35)
  { id: 31, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I7_PROTECTIVE_LOYALTY", reverse: false, text: "I protect my partner’s dignity in public and in private." },
  { id: 32, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I7_PROTECTIVE_LOYALTY", reverse: true,  text: "I vent about my partner to others in a way that damages respect for them." },
  { id: 33, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I7_PROTECTIVE_LOYALTY", reverse: false, text: "I try to be a safe place for my partner emotionally." },
  { id: 34, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I7_PROTECTIVE_LOYALTY", reverse: true,  text: "I threaten the relationship (leaving, divorce, abandonment) during arguments." },
  { id: 35, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I7_PROTECTIVE_LOYALTY", reverse: false, text: "I stand up for the relationship when outside pressures try to undermine it." },

  // I8_ENDURING_COMMITMENT (36–40)
  { id: 36, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I8_ENDURING_COMMITMENT", reverse: false, text: "I am committed to the long-term health of this relationship." },
  { id: 37, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I8_ENDURING_COMMITMENT", reverse: true,  text: "When things get hard, I mentally check out rather than work through it." },
  { id: 38, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I8_ENDURING_COMMITMENT", reverse: false, text: "I keep working on the relationship even when it feels difficult or slow." },
  { id: 39, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I8_ENDURING_COMMITMENT", reverse: true,  text: "I stay mainly because of fear of consequences, not because I want to." },
  { id: 40, form: "FORM_A_SELF", domain: "I_LOVE_INTEGRITY", subscale: "I8_ENDURING_COMMITMENT", reverse: false, text: "I try to build something healthy with my partner, not just survive." },

  // Domain II — Positive Bonding (41–75)
  // II1_SECURE_BASE (41–45)
  { id: 41, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II1_SECURE_BASE", reverse: false, text: "I feel emotionally safe with my partner." },
  { id: 42, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II1_SECURE_BASE", reverse: true,  text: "I often feel like I have to walk on eggshells with my partner." },
  { id: 43, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II1_SECURE_BASE", reverse: false, text: "My partner is a steady source of support when life is stressful." },
  { id: 44, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II1_SECURE_BASE", reverse: true,  text: "I worry that my partner will turn on me or withdraw when I need them." },
  { id: 45, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II1_SECURE_BASE", reverse: false, text: "I can be vulnerable with my partner without fearing it will be used against me." },

  // II2_ADMIRATION_FONDNESS (46–50)
  { id: 46, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II2_ADMIRATION_FONDNESS", reverse: false, text: "I genuinely admire qualities in my partner." },
  { id: 47, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II2_ADMIRATION_FONDNESS", reverse: true,  text: "I struggle to think of positive things about my partner when I’m upset." },
  { id: 48, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II2_ADMIRATION_FONDNESS", reverse: false, text: "I feel fondness and affection toward my partner in everyday moments." },
  { id: 49, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II2_ADMIRATION_FONDNESS", reverse: true,  text: "I frequently focus on what is wrong with my partner rather than what is right." },
  { id: 50, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II2_ADMIRATION_FONDNESS", reverse: false, text: "I express appreciation for my partner on a regular basis." },

  // II3_EMOTIONAL_INTIMACY (51–55)
  { id: 51, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II3_EMOTIONAL_INTIMACY", reverse: false, text: "We talk openly about feelings and personal experiences." },
  { id: 52, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II3_EMOTIONAL_INTIMACY", reverse: true,  text: "We avoid meaningful conversations because it feels unsafe or pointless." },
  { id: 53, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II3_EMOTIONAL_INTIMACY", reverse: false, text: "I feel emotionally connected to my partner." },
  { id: 54, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II3_EMOTIONAL_INTIMACY", reverse: true,  text: "I feel emotionally alone even when we are together." },
  { id: 55, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II3_EMOTIONAL_INTIMACY", reverse: false, text: "We share inner thoughts instead of just logistics and tasks." },

  // II4_ENJOYMENT_FRIENDSHIP (56–60)
  { id: 56, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II4_ENJOYMENT_FRIENDSHIP", reverse: false, text: "We enjoy spending time together." },
  { id: 57, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II4_ENJOYMENT_FRIENDSHIP", reverse: true,  text: "Time together often feels tense, boring, or draining." },
  { id: 58, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II4_ENJOYMENT_FRIENDSHIP", reverse: false, text: "We can laugh together and have fun." },
  { id: 59, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II4_ENJOYMENT_FRIENDSHIP", reverse: true,  text: "We rarely do enjoyable activities together anymore." },
  { id: 60, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II4_ENJOYMENT_FRIENDSHIP", reverse: false, text: "We show interest in each other’s daily life (friends, work, goals)." },

  // II5_SHARED_MEANING_TEAM (61–65)
  { id: 61, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II5_SHARED_MEANING_TEAM", reverse: false, text: "We function like a team when facing problems." },
  { id: 62, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II5_SHARED_MEANING_TEAM", reverse: true,  text: "It often feels like we are opponents rather than teammates." },
  { id: 63, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II5_SHARED_MEANING_TEAM", reverse: false, text: "We share values or life direction that helps us stay aligned." },
  { id: 64, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II5_SHARED_MEANING_TEAM", reverse: true,  text: "We are not aligned on what matters most, and it creates ongoing friction." },
  { id: 65, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II5_SHARED_MEANING_TEAM", reverse: false, text: "We make important decisions together in a respectful way." },

  // II6_DEDICATION_WANT_TO (66–70)
  { id: 66, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II6_DEDICATION_WANT_TO", reverse: false, text: "I stay in this relationship because I want to, not because I have to." },
  { id: 67, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II6_DEDICATION_WANT_TO", reverse: true,  text: "If circumstances were easier, I would seriously consider leaving." },
  { id: 68, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II6_DEDICATION_WANT_TO", reverse: false, text: "I feel a genuine desire to invest in the relationship." },
  { id: 69, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II6_DEDICATION_WANT_TO", reverse: true,  text: "I feel trapped in this relationship more than I feel committed to it." },
  { id: 70, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II6_DEDICATION_WANT_TO", reverse: false, text: "I want this relationship to thrive, not just continue." },

  // II7_GROWTH_SUPPORT (71–75)
  { id: 71, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II7_GROWTH_SUPPORT", reverse: false, text: "My partner supports my personal growth (goals, health, healing)." },
  { id: 72, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II7_GROWTH_SUPPORT", reverse: true,  text: "I feel discouraged from growing because it upsets or threatens my partner." },
  { id: 73, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II7_GROWTH_SUPPORT", reverse: false, text: "We encourage each other to become better, not smaller." },
  { id: 74, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II7_GROWTH_SUPPORT", reverse: true,  text: "We sabotage each other’s progress through criticism, jealousy, or control." },
  { id: 75, form: "FORM_A_SELF", domain: "II_POSITIVE_BONDING", subscale: "II7_GROWTH_SUPPORT", reverse: false, text: "We can talk about change and growth without it turning into a threat." },

  // Domain III — Negative Bonding (76–120)
  // III1_TRAUMA_BONDING_INTERMITTENT (76–80)
  { id: 76, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III1_TRAUMA_BONDING_INTERMITTENT", reverse: false, text: "Our relationship swings between intense closeness and painful conflict." },
  { id: 77, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III1_TRAUMA_BONDING_INTERMITTENT", reverse: true,  text: "We have a stable relationship without major emotional highs and lows." },
  { id: 78, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III1_TRAUMA_BONDING_INTERMITTENT", reverse: false, text: "After we fight, the makeup or relief can feel addictive." },
  { id: 79, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III1_TRAUMA_BONDING_INTERMITTENT", reverse: false, text: "The good moments make it hard to accept how bad the relationship can get." },
  { id: 80, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III1_TRAUMA_BONDING_INTERMITTENT", reverse: false, text: "I stay partly because I keep hoping the ‘good version’ of the relationship will come back." },

  // III2_ATTACHMENT_ANXIETY (81–85)
  { id: 81, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III2_ATTACHMENT_ANXIETY", reverse: false, text: "I get anxious when my partner is distant or less responsive." },
  { id: 82, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III2_ATTACHMENT_ANXIETY", reverse: true,  text: "I can tolerate space in the relationship without feeling threatened." },
  { id: 83, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III2_ATTACHMENT_ANXIETY", reverse: false, text: "I often worry my partner will leave me or replace me." },
  { id: 84, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III2_ATTACHMENT_ANXIETY", reverse: false, text: "I find myself seeking reassurance repeatedly." },
  { id: 85, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III2_ATTACHMENT_ANXIETY", reverse: true,  text: "I generally feel secure that my partner is emotionally available to me." },

  // III3_IDENTITY_FUSION (86–90)
  { id: 86, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III3_IDENTITY_FUSION", reverse: false, text: "My identity feels tightly tied to this relationship." },
  { id: 87, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III3_IDENTITY_FUSION", reverse: true,  text: "I can imagine a meaningful life for myself even without this relationship." },
  { id: 88, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III3_IDENTITY_FUSION", reverse: false, text: "The idea of ending the relationship feels like losing part of myself." },
  { id: 89, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III3_IDENTITY_FUSION", reverse: false, text: "I struggle to make decisions without considering how my partner will react." },
  { id: 90, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III3_IDENTITY_FUSION", reverse: false, text: "Even when I’m unhappy, I feel I ‘need’ this relationship to be okay." },

  // III4_FEAR_OBLIGATION_GUILT (91–95)
  { id: 91, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III4_FEAR_OBLIGATION_GUILT", reverse: false, text: "I stay partly because I feel guilty about what leaving would do to my partner." },
  { id: 92, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III4_FEAR_OBLIGATION_GUILT", reverse: true,  text: "I feel free to make relationship decisions based on what is healthy, not guilt." },
  { id: 93, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III4_FEAR_OBLIGATION_GUILT", reverse: false, text: "I feel a strong obligation to stay, even if the relationship is harming me." },
  { id: 94, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III4_FEAR_OBLIGATION_GUILT", reverse: false, text: "I worry I would be seen as a failure or a bad person if I left." },
  { id: 95, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III4_FEAR_OBLIGATION_GUILT", reverse: false, text: "I stay partly because I fear the judgment of others." },

  // III5_FINANCIAL_PRACTICAL_DEPENDENCY (96–100)
  { id: 96, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III5_FINANCIAL_PRACTICAL_DEPENDENCY", reverse: false, text: "Money, housing, or practical needs strongly affect whether I can leave this relationship." },
  { id: 97, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III5_FINANCIAL_PRACTICAL_DEPENDENCY", reverse: true,  text: "I could realistically support myself if I needed to live separately." },
  { id: 98, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III5_FINANCIAL_PRACTICAL_DEPENDENCY", reverse: false, text: "I stay partly because separating would be financially overwhelming." },
  { id: 99, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III5_FINANCIAL_PRACTICAL_DEPENDENCY", reverse: false, text: "Logistics (kids, schedules, health, transportation) make leaving feel impossible." },
  { id: 100, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III5_FINANCIAL_PRACTICAL_DEPENDENCY", reverse: true,  text: "If the relationship ended, I would have a workable plan for living arrangements and finances." },

  // III6_SOCIAL_FAMILY_PRESSURE_REPUTATION (101–105)
  { id: 101, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III6_SOCIAL_FAMILY_PRESSURE_REPUTATION", reverse: false, text: "Family, community, or religious expectations strongly influence whether I stay." },
  { id: 102, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III6_SOCIAL_FAMILY_PRESSURE_REPUTATION", reverse: true,  text: "I feel free to make relationship decisions without fear of social backlash." },
  { id: 103, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III6_SOCIAL_FAMILY_PRESSURE_REPUTATION", reverse: false, text: "I worry about what others would think if the relationship ended." },
  { id: 104, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III6_SOCIAL_FAMILY_PRESSURE_REPUTATION", reverse: false, text: "I stay partly to protect my reputation or avoid embarrassment." },
  { id: 105, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III6_SOCIAL_FAMILY_PRESSURE_REPUTATION", reverse: false, text: "I feel pressure to ‘make it work’ even when it’s unhealthy." },

  // III7_CHILDREN_PARENTING_TIES (106–110)
  { id: 106, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III7_CHILDREN_PARENTING_TIES", reverse: false, text: "I stay partly because of the children or parenting responsibilities." },
  { id: 107, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III7_CHILDREN_PARENTING_TIES", reverse: true,  text: "I believe I could co-parent effectively even if we were not together." },
  { id: 108, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III7_CHILDREN_PARENTING_TIES", reverse: false, text: "I worry that leaving would harm the children emotionally or practically." },
  { id: 109, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III7_CHILDREN_PARENTING_TIES", reverse: false, text: "I stay partly because I want the children to have an intact home." },
  { id: 110, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III7_CHILDREN_PARENTING_TIES", reverse: true,  text: "I can separate my relationship decisions from guilt about parenting." },

  // III8_FEAR_INTIMIDATION_COERCIVE_CONTROL (111–115)
  { id: 111, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III8_FEAR_INTIMIDATION_COERCIVE_CONTROL", reverse: false, text: "I sometimes feel afraid of my partner’s anger or reactions." },
  { id: 112, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III8_FEAR_INTIMIDATION_COERCIVE_CONTROL", reverse: true,  text: "I feel safe disagreeing with my partner without fear of retaliation." },
  { id: 113, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III8_FEAR_INTIMIDATION_COERCIVE_CONTROL", reverse: false, text: "My partner uses threats, intimidation, or pressure to get their way." },
  { id: 114, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III8_FEAR_INTIMIDATION_COERCIVE_CONTROL", reverse: false, text: "I change my behavior to avoid setting my partner off." },
  { id: 115, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III8_FEAR_INTIMIDATION_COERCIVE_CONTROL", reverse: false, text: "I feel controlled (money, time, friends, access to information, or choices)." },

  // III9_HOPE_COLLAPSE_LEARNED_HELPLESSNESS (116–120)
  { id: 116, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III9_HOPE_COLLAPSE_LEARNED_HELPLESSNESS", reverse: false, text: "I’ve tried to improve things many times, but it rarely lasts." },
  { id: 117, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III9_HOPE_COLLAPSE_LEARNED_HELPLESSNESS", reverse: true,  text: "When we work on issues, we usually see real and lasting improvement." },
  { id: 118, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III9_HOPE_COLLAPSE_LEARNED_HELPLESSNESS", reverse: false, text: "I often feel hopeless about the relationship changing." },
  { id: 119, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III9_HOPE_COLLAPSE_LEARNED_HELPLESSNESS", reverse: false, text: "I stay partly because I feel too worn down to start over." },
  { id: 120, form: "FORM_A_SELF", domain: "III_NEGATIVE_BONDING", subscale: "III9_HOPE_COLLAPSE_LEARNED_HELPLESSNESS", reverse: false, text: "Over time, I’ve started accepting problems that I once would not have accepted." },

  // Domain IV — Relational Damage Patterns (121–145)
  // IV1_CRITICISM (121–125)
  { id: 121, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV1_CRITICISM", reverse: false, text: "I criticize my partner’s character (not just their behavior) when I’m upset." },
  { id: 122, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV1_CRITICISM", reverse: true,  text: "When I raise concerns, I focus on specific behaviors rather than attacking who my partner is." },
  { id: 123, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV1_CRITICISM", reverse: false, text: "My partner says I complain in a way that feels like a personal attack." },
  { id: 124, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV1_CRITICISM", reverse: false, text: "I use words like “always” or “never” when I’m describing my partner’s problems." },
  { id: 125, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV1_CRITICISM", reverse: true,  text: "I can bring up problems gently without blame or harshness." },

  // IV2_CONTEMPT (126–130)
  { id: 126, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV2_CONTEMPT", reverse: false, text: "I use sarcasm, mockery, or eye-rolling when talking to my partner." },
  { id: 127, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV2_CONTEMPT", reverse: true,  text: "Even when I’m angry, I avoid treating my partner as inferior or stupid." },
  { id: 128, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV2_CONTEMPT", reverse: false, text: "I feel disgust or strong disrespect toward my partner." },
  { id: 129, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV2_CONTEMPT", reverse: false, text: "I use ridicule or put-downs to express my anger." },
  { id: 130, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV2_CONTEMPT", reverse: true,  text: "I can stay respectful even when I strongly disagree." },

  // IV3_DEFENSIVENESS (131–135)
  { id: 131, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV3_DEFENSIVENESS", reverse: false, text: "When my partner brings up a concern, I often feel attacked and defend myself." },
  { id: 132, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV3_DEFENSIVENESS", reverse: true,  text: "I can take responsibility for my part without blaming my partner." },
  { id: 133, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV3_DEFENSIVENESS", reverse: false, text: "I respond to my partner’s complaints by explaining why it’s not my fault." },
  { id: 134, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV3_DEFENSIVENESS", reverse: false, text: "I counter-attack with my own complaints instead of listening first." },
  { id: 135, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV3_DEFENSIVENESS", reverse: true,  text: "I can listen first before trying to explain myself." },

  // IV4_STONEWALLING_WITHDRAWAL (136–140)
  { id: 136, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV4_STONEWALLING_WITHDRAWAL", reverse: false, text: "I shut down or go silent during conflict." },
  { id: 137, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV4_STONEWALLING_WITHDRAWAL", reverse: true,  text: "I stay engaged in difficult conversations instead of withdrawing." },
  { id: 138, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV4_STONEWALLING_WITHDRAWAL", reverse: false, text: "My partner says I ‘check out’ when things get tense." },
  { id: 139, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV4_STONEWALLING_WITHDRAWAL", reverse: false, text: "I avoid conflict by physically leaving, ignoring, or refusing to talk." },
  { id: 140, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV4_STONEWALLING_WITHDRAWAL", reverse: true,  text: "I can take a break and come back to the conversation in a reasonable time." },

  // IV5_REPAIR_FAILURE (141–145)
  { id: 141, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV5_REPAIR_FAILURE", reverse: false, text: "When conflict starts, it’s hard for us to “turn it around” once things go negative." },
  { id: 142, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV5_REPAIR_FAILURE", reverse: false, text: "Even when one of us tries to repair, it often gets rejected or ignored." },
  { id: 143, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV5_REPAIR_FAILURE", reverse: false, text: "Apologies in our relationship often don’t lead to real change." },
  { id: 144, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV5_REPAIR_FAILURE", reverse: false, text: "When we try to resolve conflict, it often circles back to the same fight." },
  { id: 145, form: "FORM_A_SELF", domain: "IV_RELATIONAL_DAMAGE_PATTERNS", subscale: "IV5_REPAIR_FAILURE", reverse: false, text: "After we try to repair, the same fight tends to restart or stay “open” for days." },

  // Domain V — Process (146–165)
  // V1_PROCESS_NEGATIVE (146–150)
  { id: 146, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V1_PROCESS_NEGATIVE", reverse: false, text: "Our disagreements escalate quickly." },
  { id: 147, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V1_PROCESS_NEGATIVE", reverse: false, text: "We interrupt, talk over each other, or compete to be heard." },
  { id: 148, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V1_PROCESS_NEGATIVE", reverse: false, text: "We repeat the same arguments without getting to solutions." },
  { id: 149, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V1_PROCESS_NEGATIVE", reverse: false, text: "We often argue about how we argue." },
  { id: 150, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V1_PROCESS_NEGATIVE", reverse: false, text: "Conflict leaves one or both of us emotionally flooded (overwhelmed, shut down, or enraged)." },

  // V2_PROCESS_POSITIVE (151–155)
  { id: 151, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V2_PROCESS_POSITIVE", reverse: false, text: "We can bring up problems gently instead of harshly." },
  { id: 152, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V2_PROCESS_POSITIVE", reverse: true,  text: "Once we start arguing, it usually gets worse and stays worse." },
  { id: 153, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V2_PROCESS_POSITIVE", reverse: false, text: "We can validate each other’s feelings even when we disagree." },
  { id: 154, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V2_PROCESS_POSITIVE", reverse: false, text: "We can calm down and de-escalate before the conflict gets out of control." },
  { id: 155, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V2_PROCESS_POSITIVE", reverse: false, text: "We can compromise or collaborate on solutions." },

  // V2_PROCESS_POSITIVE continued (156–160)
  { id: 156, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V2_PROCESS_POSITIVE", reverse: false, text: "We can repair after conflict and reconnect emotionally." },
  { id: 157, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V2_PROCESS_POSITIVE", reverse: false, text: "We can take a break during conflict and return to finish the conversation." },
  { id: 158, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V2_PROCESS_POSITIVE", reverse: false, text: "We can accept influence from each other rather than staying rigid." },
  { id: 159, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V2_PROCESS_POSITIVE", reverse: false, text: "We can discuss problems without attacking each other." },
  { id: 160, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V2_PROCESS_POSITIVE", reverse: false, text: "We can end conflict with a clear next step rather than confusion." },

  // V3_PROCESS_FOCUSED (161–165)
  { id: 161, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V3_PROCESS_FOCUSED", reverse: false, text: "When we have a conflict, we can stay on one issue instead of dragging in old topics." },
  { id: 162, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V3_PROCESS_FOCUSED", reverse: true,  text: "We get pulled into side arguments and lose track of what we were trying to solve." },
  { id: 163, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V3_PROCESS_FOCUSED", reverse: false, text: "We can name the pattern (like “we’re escalating” or “we’re stuck”) and pause to reset." },
  { id: 164, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V3_PROCESS_FOCUSED", reverse: false, text: "We have a workable process for hard talks (take turns, summarize, and agree on one next step)." },
  { id: 165, form: "FORM_A_SELF", domain: "V_PROCESS", subscale: "V3_PROCESS_FOCUSED", reverse: false, text: "Even when things are tense, we can keep the discussion structured and respectful." },

  // Domain VI — Safety & Power (example starter; keep expanding later)
  // VI1_POWER_EQUITY_RESPECT
  { id: 166, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: false, text: "In our relationship, both people’s needs matter." },
{ id: 167, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: true,  text: "I sometimes hold back my true thoughts because I worry there will be backlash or punishment." },
  { id: 168, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: true,  text: "In our relationship, one person uses threats (leaving, money, kids, reputation) to get their way." },
  { id: 169, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: true,  text: "I feel like I have to “walk on eggshells” to avoid setting my partner off." },
  { id: 170, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: false, text: "When I set a boundary, my partner usually respects it even if they don’t like it." },
  { id: 171, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: true,  text: "My partner monitors, interrogates, or checks up on me in ways that feel controlling." },
  { id: 172, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: true,  text: "If I disagree with my partner, I worry it will turn into a bigger problem later." },
  { id: 173, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: false, text: "In our relationship, both people are allowed to say “no” without being punished for it." },
  { id: 174, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: true,  text: "My partner uses guilt, pressure, or anger to push me past my boundaries." },
  { id: 175, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: false, text: "I can bring up concerns without being mocked, dismissed, or shut down." },
  { id: 176, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: true,  text: "When I try to set limits, my partner becomes intimidating (tone, posture, threats, or escalation)." },
{ id: 177, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: true,  text: "I avoid certain topics because I know my partner will react harshly or explode." },
  { id: 178, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: true,  text: "My partner tries to control who I spend time with, where I go, or how I use my time." },
  { id: 179, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: false, text: "I feel free to make normal personal choices (friends, hobbies, routines) without needing permission." },
  { id: 180, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: true,  text: "Money or resources are used as leverage (withholding, controlling access, or threatening financial harm)." },
  { id: 181, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: false, text: "When there is a disagreement, we can reach a decision without one person forcing the outcome." },
 { id: 182, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: true, text: "My partner uses anger, silence, or emotional withdrawal to make me give in." },
  { id: 183, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: false, text: "Important decisions in our relationship are made with input from both of us." },
  { id: 184, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: true, text: "I sometimes feel that keeping the peace is more important than speaking honestly." },
  { id: 185, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: false, text: "Both partners in this relationship have equal dignity and voice." },
  { id: 186, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: true, text: "When disagreements happen, I often feel pressured to surrender my position just to end the conflict." },
 { id: 187, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: false, text: "I feel physically and emotionally safe expressing disagreement with my partner." },
  { id: 188, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: true, text: "My partner sometimes intimidates me through tone, posture, or aggressive behavior." },
  { id: 189, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: true, text: "I sometimes feel that my partner's needs and preferences automatically take priority over mine." },
  { id: 190, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: false, text: "In our relationship, both partners are able to influence decisions that affect us." },
  { id: 191, form: "FORM_A_SELF", domain: "VI_SAFETY_POWER", subscale: "VI1_POWER_EQUITY_RESPECT", reverse: true, text: "I sometimes comply with what my partner wants mainly to avoid conflict or retaliation." },
{ id: 192, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII1_HOPE_FOR_CHANGE", reverse: false, text: "I still believe our relationship can improve if both of us are willing to work on it." },
  { id: 193, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII1_HOPE_FOR_CHANGE", reverse: true, text: "No matter what we try, the same problems seem to come back again." },
  { id: 194, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII1_HOPE_FOR_CHANGE", reverse: false, text: "I can imagine a future where our relationship is healthier and more satisfying." },
  { id: 195, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII1_HOPE_FOR_CHANGE", reverse: true, text: "Most of the time I feel like meaningful change in this relationship is unlikely." },
  { id: 196, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII1_HOPE_FOR_CHANGE", reverse: false, text: "There are still moments that remind me why this relationship might be worth continuing." },
{ id: 197, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII2_EXIT_READINESS", reverse: true,  text: "Even when things are bad, I feel strongly committed to staying in this relationship." },
  { id: 198, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII2_EXIT_READINESS", reverse: false, text: "I have seriously considered what it would look like to separate or end the relationship." },
  { id: 199, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII2_EXIT_READINESS", reverse: false, text: "I feel emotionally more “checked out” than I used to be." },
  { id: 200, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII2_EXIT_READINESS", reverse: false, text: "If nothing changed in this relationship over the next year, I would likely want to leave." },
  { id: 201, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII2_EXIT_READINESS", reverse: true,  text: "I have little or no interest in leaving this relationship." },
{ id: 202, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII2_EXIT_READINESS", reverse: false, text: "I sometimes imagine what life would be like if I were no longer in this relationship." },
  { id: 203, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII2_EXIT_READINESS", reverse: true, text: "Leaving this relationship is something I rarely or never think about." },
  { id: 204, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII2_EXIT_READINESS", reverse: false, text: "There are times when I feel emotionally prepared to walk away from this relationship." },
  { id: 205, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII2_EXIT_READINESS", reverse: false, text: "Part of me feels that the relationship may already be coming to an end." },
  { id: 206, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII2_EXIT_READINESS", reverse: true, text: "Despite the problems, I feel strongly motivated to keep trying to make the relationship work." },

 { id: 207, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII3_ENTRAPMENT_CONSTRAINTS", reverse: false, text: "Practical concerns (money, housing, logistics) make it difficult for me to consider leaving this relationship." },
  { id: 208, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII3_ENTRAPMENT_CONSTRAINTS", reverse: false, text: "The impact on children or family members makes leaving feel almost impossible." },
  { id: 209, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII3_ENTRAPMENT_CONSTRAINTS", reverse: false, text: "I sometimes stay in this relationship because starting over feels too overwhelming." },
  { id: 210, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII3_ENTRAPMENT_CONSTRAINTS", reverse: true,  text: "If the relationship truly became unhealthy for me, I would feel capable of leaving." },
  { id: 211, form: "FORM_A_SELF", domain: "VII_HOPE_COLLAPSE", subscale: "VII3_ENTRAPMENT_CONSTRAINTS", reverse: false, text: "My sense of identity or life stability feels strongly tied to staying in this relationship." },
{ id: 212, form: "FORM_A_SELF", domain: "VAL_VALIDITY", subscale: "VAL1_RESPONSE_STYLE", reverse: true,  text: "In our relationship, I never say anything I regret." },
  { id: 213, form: "FORM_A_SELF", domain: "VAL_VALIDITY", subscale: "VAL1_RESPONSE_STYLE", reverse: true,  text: "My partner has never made me feel disrespected." },
  { id: 214, form: "FORM_A_SELF", domain: "VAL_VALIDITY", subscale: "VAL1_RESPONSE_STYLE", reverse: true,  text: "No matter what happens, I stay completely calm during conflict." },
  { id: 215, form: "FORM_A_SELF", domain: "VAL_VALIDITY", subscale: "VAL1_RESPONSE_STYLE", reverse: false, text: "I answered these questions carefully and honestly, even when the answer was uncomfortable." },
  { id: 216, form: "FORM_A_SELF", domain: "VAL_VALIDITY", subscale: "VAL1_RESPONSE_STYLE", reverse: false, text: "I may have answered some items based on how I wish things were, not how they usually are." },
  { id: 217, form: "FORM_A_SELF", domain: "VAL_VALIDITY", subscale: "VAL1_RESPONSE_STYLE", reverse: true,  text: "Our relationship problems are entirely my partner’s fault." },
  { id: 218, form: "FORM_A_SELF", domain: "VAL_VALIDITY", subscale: "VAL1_RESPONSE_STYLE", reverse: true,  text: "Our relationship is basically perfect, with little or nothing that needs improvement." },];
