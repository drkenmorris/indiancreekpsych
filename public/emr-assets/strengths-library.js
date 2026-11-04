'use strict';
const STRENGTHS_LIBRARY = {
  "version": "1.0",
  "items": [
    {
      "id": "IC-01-S01",
      "domain": "Self-awareness and insight",
      "type": "strength",
      "label": "Recognizes personal strengths"
    },
    {
      "id": "IC-01-S02",
      "domain": "Self-awareness and insight",
      "type": "strength",
      "label": "Identifies emotional triggers"
    },
    {
      "id": "IC-01-S03",
      "domain": "Self-awareness and insight",
      "type": "strength",
      "label": "Recognizes recurring behavior patterns"
    },
    {
      "id": "IC-01-S04",
      "domain": "Self-awareness and insight",
      "type": "strength",
      "label": "Understands how choices affect outcomes"
    },
    {
      "id": "IC-01-S05",
      "domain": "Self-awareness and insight",
      "type": "strength",
      "label": "Recognizes when additional support is needed"
    },
    {
      "id": "IC-01-N01",
      "domain": "Self-awareness and insight",
      "type": "growth_or_support_need",
      "label": "Difficulty identifying personal strengths"
    },
    {
      "id": "IC-01-N02",
      "domain": "Self-awareness and insight",
      "type": "growth_or_support_need",
      "label": "Difficulty recognizing emotional triggers"
    },
    {
      "id": "IC-01-N03",
      "domain": "Self-awareness and insight",
      "type": "growth_or_support_need",
      "label": "Limited awareness of recurring behavior patterns"
    },
    {
      "id": "IC-01-N04",
      "domain": "Self-awareness and insight",
      "type": "growth_or_support_need",
      "label": "Difficulty connecting choices with outcomes"
    },
    {
      "id": "IC-01-N05",
      "domain": "Self-awareness and insight",
      "type": "growth_or_support_need",
      "label": "Difficulty recognizing a need for support"
    },
    {
      "id": "IC-02-S01",
      "domain": "Emotional awareness and expression",
      "type": "strength",
      "label": "Identifies and names emotions"
    },
    {
      "id": "IC-02-S02",
      "domain": "Emotional awareness and expression",
      "type": "strength",
      "label": "Communicates feelings in understandable ways"
    },
    {
      "id": "IC-02-S03",
      "domain": "Emotional awareness and expression",
      "type": "strength",
      "label": "Recognizes physical signs of emotional stress"
    },
    {
      "id": "IC-02-S04",
      "domain": "Emotional awareness and expression",
      "type": "strength",
      "label": "Distinguishes feelings from actions"
    },
    {
      "id": "IC-02-S05",
      "domain": "Emotional awareness and expression",
      "type": "strength",
      "label": "Expresses vulnerable feelings with trusted people"
    },
    {
      "id": "IC-02-N01",
      "domain": "Emotional awareness and expression",
      "type": "growth_or_support_need",
      "label": "Difficulty identifying or naming emotions"
    },
    {
      "id": "IC-02-N02",
      "domain": "Emotional awareness and expression",
      "type": "growth_or_support_need",
      "label": "Difficulty communicating feelings"
    },
    {
      "id": "IC-02-N03",
      "domain": "Emotional awareness and expression",
      "type": "growth_or_support_need",
      "label": "Difficulty recognizing physical signs of stress"
    },
    {
      "id": "IC-02-N04",
      "domain": "Emotional awareness and expression",
      "type": "growth_or_support_need",
      "label": "Difficulty separating feelings from urges to act"
    },
    {
      "id": "IC-02-N05",
      "domain": "Emotional awareness and expression",
      "type": "growth_or_support_need",
      "label": "Avoids expressing vulnerable feelings despite wanting support"
    },
    {
      "id": "IC-03-S01",
      "domain": "Emotional regulation and distress tolerance",
      "type": "strength",
      "label": "Uses strategies to regulate strong emotions"
    },
    {
      "id": "IC-03-S02",
      "domain": "Emotional regulation and distress tolerance",
      "type": "strength",
      "label": "Tolerates frustration while pursuing goals"
    },
    {
      "id": "IC-03-S03",
      "domain": "Emotional regulation and distress tolerance",
      "type": "strength",
      "label": "Pauses before responding when upset"
    },
    {
      "id": "IC-03-S04",
      "domain": "Emotional regulation and distress tolerance",
      "type": "strength",
      "label": "Recovers after emotional setbacks"
    },
    {
      "id": "IC-03-S05",
      "domain": "Emotional regulation and distress tolerance",
      "type": "strength",
      "label": "Seeks support during overwhelming distress"
    },
    {
      "id": "IC-03-N01",
      "domain": "Emotional regulation and distress tolerance",
      "type": "growth_or_support_need",
      "label": "Difficulty regulating intense emotions"
    },
    {
      "id": "IC-03-N02",
      "domain": "Emotional regulation and distress tolerance",
      "type": "growth_or_support_need",
      "label": "Low tolerance for frustration in identified situations"
    },
    {
      "id": "IC-03-N03",
      "domain": "Emotional regulation and distress tolerance",
      "type": "growth_or_support_need",
      "label": "Difficulty pausing when emotionally activated"
    },
    {
      "id": "IC-03-N04",
      "domain": "Emotional regulation and distress tolerance",
      "type": "growth_or_support_need",
      "label": "Prolonged difficulty recovering after setbacks"
    },
    {
      "id": "IC-03-N05",
      "domain": "Emotional regulation and distress tolerance",
      "type": "growth_or_support_need",
      "label": "Difficulty seeking support when overwhelmed"
    },
    {
      "id": "IC-04-S01",
      "domain": "Stress management and coping",
      "type": "strength",
      "label": "Recognizes early signs of overload"
    },
    {
      "id": "IC-04-S02",
      "domain": "Stress management and coping",
      "type": "strength",
      "label": "Uses effective calming or grounding strategies"
    },
    {
      "id": "IC-04-S03",
      "domain": "Stress management and coping",
      "type": "strength",
      "label": "Adjusts demands when stress increases"
    },
    {
      "id": "IC-04-S04",
      "domain": "Stress management and coping",
      "type": "strength",
      "label": "Uses a range of coping strategies"
    },
    {
      "id": "IC-04-S05",
      "domain": "Stress management and coping",
      "type": "strength",
      "label": "Maintains helpful routines during stress"
    },
    {
      "id": "IC-04-N01",
      "domain": "Stress management and coping",
      "type": "growth_or_support_need",
      "label": "Difficulty recognizing early signs of overload"
    },
    {
      "id": "IC-04-N02",
      "domain": "Stress management and coping",
      "type": "growth_or_support_need",
      "label": "Limited access to effective coping strategies"
    },
    {
      "id": "IC-04-N03",
      "domain": "Stress management and coping",
      "type": "growth_or_support_need",
      "label": "Continues taking on demands despite overload"
    },
    {
      "id": "IC-04-N04",
      "domain": "Stress management and coping",
      "type": "growth_or_support_need",
      "label": "Relies on coping behaviors that create additional problems"
    },
    {
      "id": "IC-04-N05",
      "domain": "Stress management and coping",
      "type": "growth_or_support_need",
      "label": "Difficulty maintaining routines during stress"
    },
    {
      "id": "IC-05-S01",
      "domain": "Self-concept and self-compassion",
      "type": "strength",
      "label": "Describes self in a balanced way"
    },
    {
      "id": "IC-05-S02",
      "domain": "Self-concept and self-compassion",
      "type": "strength",
      "label": "Acknowledges accomplishments"
    },
    {
      "id": "IC-05-S03",
      "domain": "Self-concept and self-compassion",
      "type": "strength",
      "label": "Responds to mistakes with self-compassion"
    },
    {
      "id": "IC-05-S04",
      "domain": "Self-concept and self-compassion",
      "type": "strength",
      "label": "Maintains self-respect during disagreement"
    },
    {
      "id": "IC-05-S05",
      "domain": "Self-concept and self-compassion",
      "type": "strength",
      "label": "Recognizes worth beyond performance or approval"
    },
    {
      "id": "IC-05-N01",
      "domain": "Self-concept and self-compassion",
      "type": "growth_or_support_need",
      "label": "Persistent negative self-evaluation"
    },
    {
      "id": "IC-05-N02",
      "domain": "Self-concept and self-compassion",
      "type": "growth_or_support_need",
      "label": "Difficulty acknowledging accomplishments"
    },
    {
      "id": "IC-05-N03",
      "domain": "Self-concept and self-compassion",
      "type": "growth_or_support_need",
      "label": "Harsh self-criticism after mistakes"
    },
    {
      "id": "IC-05-N04",
      "domain": "Self-concept and self-compassion",
      "type": "growth_or_support_need",
      "label": "Self-worth decreases during disagreement"
    },
    {
      "id": "IC-05-N05",
      "domain": "Self-concept and self-compassion",
      "type": "growth_or_support_need",
      "label": "Self-worth depends heavily on performance or approval"
    },
    {
      "id": "IC-06-S01",
      "domain": "Hope, meaning, and resilience",
      "type": "strength",
      "label": "Identifies meaningful reasons to pursue goals"
    },
    {
      "id": "IC-06-S02",
      "domain": "Hope, meaning, and resilience",
      "type": "strength",
      "label": "Maintains realistic hope for change"
    },
    {
      "id": "IC-06-S03",
      "domain": "Hope, meaning, and resilience",
      "type": "strength",
      "label": "Recognizes past examples of overcoming difficulty"
    },
    {
      "id": "IC-06-S04",
      "domain": "Hope, meaning, and resilience",
      "type": "strength",
      "label": "Adjusts expectations after setbacks"
    },
    {
      "id": "IC-06-S05",
      "domain": "Hope, meaning, and resilience",
      "type": "strength",
      "label": "Identifies sources of purpose"
    },
    {
      "id": "IC-06-N01",
      "domain": "Hope, meaning, and resilience",
      "type": "growth_or_support_need",
      "label": "Difficulty identifying meaningful goals"
    },
    {
      "id": "IC-06-N02",
      "domain": "Hope, meaning, and resilience",
      "type": "growth_or_support_need",
      "label": "Low expectation that change is possible"
    },
    {
      "id": "IC-06-N03",
      "domain": "Hope, meaning, and resilience",
      "type": "growth_or_support_need",
      "label": "Difficulty recognizing past coping successes"
    },
    {
      "id": "IC-06-N04",
      "domain": "Hope, meaning, and resilience",
      "type": "growth_or_support_need",
      "label": "Difficulty adjusting expectations after setbacks"
    },
    {
      "id": "IC-06-N05",
      "domain": "Hope, meaning, and resilience",
      "type": "growth_or_support_need",
      "label": "Reports a reduced sense of purpose"
    },
    {
      "id": "IC-07-S01",
      "domain": "Motivation and engagement",
      "type": "strength",
      "label": "Identifies personally meaningful reasons for change"
    },
    {
      "id": "IC-07-S02",
      "domain": "Motivation and engagement",
      "type": "strength",
      "label": "Participates in collaborative goal setting"
    },
    {
      "id": "IC-07-S03",
      "domain": "Motivation and engagement",
      "type": "strength",
      "label": "Initiates agreed next steps"
    },
    {
      "id": "IC-07-S04",
      "domain": "Motivation and engagement",
      "type": "strength",
      "label": "Practices agreed skills between sessions"
    },
    {
      "id": "IC-07-S05",
      "domain": "Motivation and engagement",
      "type": "strength",
      "label": "Communicates concerns about the treatment or coaching process"
    },
    {
      "id": "IC-07-N01",
      "domain": "Motivation and engagement",
      "type": "growth_or_support_need",
      "label": "Ambivalence about a specific proposed change"
    },
    {
      "id": "IC-07-N02",
      "domain": "Motivation and engagement",
      "type": "growth_or_support_need",
      "label": "Difficulty identifying personally meaningful goals"
    },
    {
      "id": "IC-07-N03",
      "domain": "Motivation and engagement",
      "type": "growth_or_support_need",
      "label": "Difficulty initiating agreed next steps"
    },
    {
      "id": "IC-07-N04",
      "domain": "Motivation and engagement",
      "type": "growth_or_support_need",
      "label": "Difficulty practicing skills between sessions"
    },
    {
      "id": "IC-07-N05",
      "domain": "Motivation and engagement",
      "type": "growth_or_support_need",
      "label": "Difficulty communicating concerns about the process"
    },
    {
      "id": "IC-08-S01",
      "domain": "Thinking flexibility and problem solving",
      "type": "strength",
      "label": "Considers more than one explanation"
    },
    {
      "id": "IC-08-S02",
      "domain": "Thinking flexibility and problem solving",
      "type": "strength",
      "label": "Generates alternative solutions"
    },
    {
      "id": "IC-08-S03",
      "domain": "Thinking flexibility and problem solving",
      "type": "strength",
      "label": "Evaluates evidence before drawing conclusions"
    },
    {
      "id": "IC-08-S04",
      "domain": "Thinking flexibility and problem solving",
      "type": "strength",
      "label": "Tolerates some uncertainty"
    },
    {
      "id": "IC-08-S05",
      "domain": "Thinking flexibility and problem solving",
      "type": "strength",
      "label": "Revises plans when new information emerges"
    },
    {
      "id": "IC-08-N01",
      "domain": "Thinking flexibility and problem solving",
      "type": "growth_or_support_need",
      "label": "Difficulty considering alternative explanations"
    },
    {
      "id": "IC-08-N02",
      "domain": "Thinking flexibility and problem solving",
      "type": "growth_or_support_need",
      "label": "Difficulty generating workable solutions"
    },
    {
      "id": "IC-08-N03",
      "domain": "Thinking flexibility and problem solving",
      "type": "growth_or_support_need",
      "label": "Draws conclusions before checking available evidence"
    },
    {
      "id": "IC-08-N04",
      "domain": "Thinking flexibility and problem solving",
      "type": "growth_or_support_need",
      "label": "Difficulty tolerating uncertainty"
    },
    {
      "id": "IC-08-N05",
      "domain": "Thinking flexibility and problem solving",
      "type": "growth_or_support_need",
      "label": "Difficulty revising plans when circumstances change"
    },
    {
      "id": "IC-09-S01",
      "domain": "Attention, memory, and organization",
      "type": "strength",
      "label": "Sustains attention for relevant tasks with needed supports"
    },
    {
      "id": "IC-09-S02",
      "domain": "Attention, memory, and organization",
      "type": "strength",
      "label": "Uses reminders or memory aids effectively"
    },
    {
      "id": "IC-09-S03",
      "domain": "Attention, memory, and organization",
      "type": "strength",
      "label": "Organizes materials and information"
    },
    {
      "id": "IC-09-S04",
      "domain": "Attention, memory, and organization",
      "type": "strength",
      "label": "Breaks complex tasks into smaller steps"
    },
    {
      "id": "IC-09-S05",
      "domain": "Attention, memory, and organization",
      "type": "strength",
      "label": "Recognizes and reduces distractions"
    },
    {
      "id": "IC-09-N01",
      "domain": "Attention, memory, and organization",
      "type": "growth_or_support_need",
      "label": "Difficulty sustaining attention for relevant tasks"
    },
    {
      "id": "IC-09-N02",
      "domain": "Attention, memory, and organization",
      "type": "growth_or_support_need",
      "label": "Difficulty remembering appointments or agreed tasks"
    },
    {
      "id": "IC-09-N03",
      "domain": "Attention, memory, and organization",
      "type": "growth_or_support_need",
      "label": "Difficulty organizing materials or information"
    },
    {
      "id": "IC-09-N04",
      "domain": "Attention, memory, and organization",
      "type": "growth_or_support_need",
      "label": "Difficulty sequencing multistep tasks"
    },
    {
      "id": "IC-09-N05",
      "domain": "Attention, memory, and organization",
      "type": "growth_or_support_need",
      "label": "Difficulty managing distractions"
    },
    {
      "id": "IC-10-S01",
      "domain": "Planning, time management, and follow-through",
      "type": "strength",
      "label": "Sets realistic priorities"
    },
    {
      "id": "IC-10-S02",
      "domain": "Planning, time management, and follow-through",
      "type": "strength",
      "label": "Estimates time and schedules tasks"
    },
    {
      "id": "IC-10-S03",
      "domain": "Planning, time management, and follow-through",
      "type": "strength",
      "label": "Starts tasks using helpful strategies"
    },
    {
      "id": "IC-10-S04",
      "domain": "Planning, time management, and follow-through",
      "type": "strength",
      "label": "Completes agreed responsibilities"
    },
    {
      "id": "IC-10-S05",
      "domain": "Planning, time management, and follow-through",
      "type": "strength",
      "label": "Balances effort with rest"
    },
    {
      "id": "IC-10-N01",
      "domain": "Planning, time management, and follow-through",
      "type": "growth_or_support_need",
      "label": "Difficulty selecting priorities"
    },
    {
      "id": "IC-10-N02",
      "domain": "Planning, time management, and follow-through",
      "type": "growth_or_support_need",
      "label": "Difficulty estimating time or scheduling tasks"
    },
    {
      "id": "IC-10-N03",
      "domain": "Planning, time management, and follow-through",
      "type": "growth_or_support_need",
      "label": "Difficulty starting intended tasks"
    },
    {
      "id": "IC-10-N04",
      "domain": "Planning, time management, and follow-through",
      "type": "growth_or_support_need",
      "label": "Difficulty completing agreed responsibilities"
    },
    {
      "id": "IC-10-N05",
      "domain": "Planning, time management, and follow-through",
      "type": "growth_or_support_need",
      "label": "Overcommits or continues working beyond sustainable limits"
    },
    {
      "id": "IC-11-S01",
      "domain": "Judgment, decision-making, and impulse control",
      "type": "strength",
      "label": "Considers likely consequences before acting"
    },
    {
      "id": "IC-11-S02",
      "domain": "Judgment, decision-making, and impulse control",
      "type": "strength",
      "label": "Seeks relevant information for decisions"
    },
    {
      "id": "IC-11-S03",
      "domain": "Judgment, decision-making, and impulse control",
      "type": "strength",
      "label": "Delays immediate rewards when helpful"
    },
    {
      "id": "IC-11-S04",
      "domain": "Judgment, decision-making, and impulse control",
      "type": "strength",
      "label": "Recognizes situations that increase impulsive choices"
    },
    {
      "id": "IC-11-S05",
      "domain": "Judgment, decision-making, and impulse control",
      "type": "strength",
      "label": "Uses agreed safeguards for high-consequence decisions"
    },
    {
      "id": "IC-11-N01",
      "domain": "Judgment, decision-making, and impulse control",
      "type": "growth_or_support_need",
      "label": "Difficulty anticipating consequences"
    },
    {
      "id": "IC-11-N02",
      "domain": "Judgment, decision-making, and impulse control",
      "type": "growth_or_support_need",
      "label": "Difficulty gathering relevant information for decisions"
    },
    {
      "id": "IC-11-N03",
      "domain": "Judgment, decision-making, and impulse control",
      "type": "growth_or_support_need",
      "label": "Difficulty delaying immediate rewards"
    },
    {
      "id": "IC-11-N04",
      "domain": "Judgment, decision-making, and impulse control",
      "type": "growth_or_support_need",
      "label": "Makes impulsive choices in identified situations"
    },
    {
      "id": "IC-11-N05",
      "domain": "Judgment, decision-making, and impulse control",
      "type": "growth_or_support_need",
      "label": "Difficulty using agreed safeguards for high-consequence decisions"
    },
    {
      "id": "IC-12-S01",
      "domain": "Communication and self-advocacy",
      "type": "strength",
      "label": "Communicates needs clearly"
    },
    {
      "id": "IC-12-S02",
      "domain": "Communication and self-advocacy",
      "type": "strength",
      "label": "Listens and checks understanding"
    },
    {
      "id": "IC-12-S03",
      "domain": "Communication and self-advocacy",
      "type": "strength",
      "label": "Asks clarifying questions"
    },
    {
      "id": "IC-12-S04",
      "domain": "Communication and self-advocacy",
      "type": "strength",
      "label": "Expresses disagreement respectfully"
    },
    {
      "id": "IC-12-S05",
      "domain": "Communication and self-advocacy",
      "type": "strength",
      "label": "Requests accommodations or assistance"
    },
    {
      "id": "IC-12-N01",
      "domain": "Communication and self-advocacy",
      "type": "growth_or_support_need",
      "label": "Difficulty communicating needs clearly"
    },
    {
      "id": "IC-12-N02",
      "domain": "Communication and self-advocacy",
      "type": "growth_or_support_need",
      "label": "Difficulty listening or checking understanding"
    },
    {
      "id": "IC-12-N03",
      "domain": "Communication and self-advocacy",
      "type": "growth_or_support_need",
      "label": "Difficulty asking clarifying questions"
    },
    {
      "id": "IC-12-N04",
      "domain": "Communication and self-advocacy",
      "type": "growth_or_support_need",
      "label": "Difficulty expressing disagreement constructively"
    },
    {
      "id": "IC-12-N05",
      "domain": "Communication and self-advocacy",
      "type": "growth_or_support_need",
      "label": "Difficulty requesting accommodations or assistance"
    },
    {
      "id": "IC-13-S01",
      "domain": "Boundaries and assertiveness",
      "type": "strength",
      "label": "Identifies personal limits"
    },
    {
      "id": "IC-13-S02",
      "domain": "Boundaries and assertiveness",
      "type": "strength",
      "label": "Communicates limits clearly"
    },
    {
      "id": "IC-13-S03",
      "domain": "Boundaries and assertiveness",
      "type": "strength",
      "label": "Respects others' expressed boundaries"
    },
    {
      "id": "IC-13-S04",
      "domain": "Boundaries and assertiveness",
      "type": "strength",
      "label": "Declines requests when needed"
    },
    {
      "id": "IC-13-S05",
      "domain": "Boundaries and assertiveness",
      "type": "strength",
      "label": "Balances personal needs with responsibilities to others"
    },
    {
      "id": "IC-13-N01",
      "domain": "Boundaries and assertiveness",
      "type": "growth_or_support_need",
      "label": "Difficulty identifying personal limits"
    },
    {
      "id": "IC-13-N02",
      "domain": "Boundaries and assertiveness",
      "type": "growth_or_support_need",
      "label": "Difficulty communicating or maintaining limits"
    },
    {
      "id": "IC-13-N03",
      "domain": "Boundaries and assertiveness",
      "type": "growth_or_support_need",
      "label": "Difficulty recognizing or respecting expressed boundaries"
    },
    {
      "id": "IC-13-N04",
      "domain": "Boundaries and assertiveness",
      "type": "growth_or_support_need",
      "label": "Difficulty declining unwanted requests"
    },
    {
      "id": "IC-13-N05",
      "domain": "Boundaries and assertiveness",
      "type": "growth_or_support_need",
      "label": "Repeatedly sets aside personal needs to avoid disapproval"
    },
    {
      "id": "IC-14-S01",
      "domain": "Relationships and social connection",
      "type": "strength",
      "label": "Develops mutually supportive relationships"
    },
    {
      "id": "IC-14-S02",
      "domain": "Relationships and social connection",
      "type": "strength",
      "label": "Identifies trusted support people"
    },
    {
      "id": "IC-14-S03",
      "domain": "Relationships and social connection",
      "type": "strength",
      "label": "Seeks connection in preferred ways"
    },
    {
      "id": "IC-14-S04",
      "domain": "Relationships and social connection",
      "type": "strength",
      "label": "Accepts help while retaining personal choice"
    },
    {
      "id": "IC-14-S05",
      "domain": "Relationships and social connection",
      "type": "strength",
      "label": "Participates in valued social activities"
    },
    {
      "id": "IC-14-N01",
      "domain": "Relationships and social connection",
      "type": "growth_or_support_need",
      "label": "Difficulty developing desired supportive relationships"
    },
    {
      "id": "IC-14-N02",
      "domain": "Relationships and social connection",
      "type": "growth_or_support_need",
      "label": "Limited access to trusted support people"
    },
    {
      "id": "IC-14-N03",
      "domain": "Relationships and social connection",
      "type": "growth_or_support_need",
      "label": "Withdraws from desired social contact"
    },
    {
      "id": "IC-14-N04",
      "domain": "Relationships and social connection",
      "type": "growth_or_support_need",
      "label": "Difficulty accepting wanted help"
    },
    {
      "id": "IC-14-N05",
      "domain": "Relationships and social connection",
      "type": "growth_or_support_need",
      "label": "Loneliness or unmet need for social connection"
    },
    {
      "id": "IC-15-S01",
      "domain": "Conflict management and perspective taking",
      "type": "strength",
      "label": "Considers others' perspectives"
    },
    {
      "id": "IC-15-S02",
      "domain": "Conflict management and perspective taking",
      "type": "strength",
      "label": "Acknowledges personal contribution to conflict"
    },
    {
      "id": "IC-15-S03",
      "domain": "Conflict management and perspective taking",
      "type": "strength",
      "label": "Uses de-escalation strategies"
    },
    {
      "id": "IC-15-S04",
      "domain": "Conflict management and perspective taking",
      "type": "strength",
      "label": "Collaborates on solutions"
    },
    {
      "id": "IC-15-S05",
      "domain": "Conflict management and perspective taking",
      "type": "strength",
      "label": "Attempts repair after relational conflict"
    },
    {
      "id": "IC-15-N01",
      "domain": "Conflict management and perspective taking",
      "type": "growth_or_support_need",
      "label": "Difficulty considering others' perspectives during conflict"
    },
    {
      "id": "IC-15-N02",
      "domain": "Conflict management and perspective taking",
      "type": "growth_or_support_need",
      "label": "Difficulty identifying personal contribution to conflict"
    },
    {
      "id": "IC-15-N03",
      "domain": "Conflict management and perspective taking",
      "type": "growth_or_support_need",
      "label": "Escalates verbal conflict in identified situations"
    },
    {
      "id": "IC-15-N04",
      "domain": "Conflict management and perspective taking",
      "type": "growth_or_support_need",
      "label": "Difficulty negotiating shared solutions"
    },
    {
      "id": "IC-15-N05",
      "domain": "Conflict management and perspective taking",
      "type": "growth_or_support_need",
      "label": "Difficulty repairing relationships after conflict"
    },
    {
      "id": "IC-16-S01",
      "domain": "Values, identity, culture, and spirituality",
      "type": "strength",
      "label": "Identifies personally important values"
    },
    {
      "id": "IC-16-S02",
      "domain": "Values, identity, culture, and spirituality",
      "type": "strength",
      "label": "Makes choices consistent with stated values"
    },
    {
      "id": "IC-16-S03",
      "domain": "Values, identity, culture, and spirituality",
      "type": "strength",
      "label": "Draws support from cultural identity or community"
    },
    {
      "id": "IC-16-S04",
      "domain": "Values, identity, culture, and spirituality",
      "type": "strength",
      "label": "Draws support from chosen spiritual or secular practices"
    },
    {
      "id": "IC-16-S05",
      "domain": "Values, identity, culture, and spirituality",
      "type": "strength",
      "label": "Expresses identity and preferences with growing confidence"
    },
    {
      "id": "IC-16-N01",
      "domain": "Values, identity, culture, and spirituality",
      "type": "growth_or_support_need",
      "label": "Difficulty clarifying personal values"
    },
    {
      "id": "IC-16-N02",
      "domain": "Values, identity, culture, and spirituality",
      "type": "growth_or_support_need",
      "label": "Distress about a gap between values and choices"
    },
    {
      "id": "IC-16-N03",
      "domain": "Values, identity, culture, and spirituality",
      "type": "growth_or_support_need",
      "label": "Limited access to desired cultural or community supports"
    },
    {
      "id": "IC-16-N04",
      "domain": "Values, identity, culture, and spirituality",
      "type": "growth_or_support_need",
      "label": "Distress involving spiritual beliefs or sources of meaning"
    },
    {
      "id": "IC-16-N05",
      "domain": "Values, identity, culture, and spirituality",
      "type": "growth_or_support_need",
      "label": "Difficulty expressing identity or preferences in current surroundings"
    },
    {
      "id": "IC-17-S01",
      "domain": "Daily living and self-care",
      "type": "strength",
      "label": "Maintains personally appropriate hygiene with needed supports"
    },
    {
      "id": "IC-17-S02",
      "domain": "Daily living and self-care",
      "type": "strength",
      "label": "Obtains and prepares food with needed supports"
    },
    {
      "id": "IC-17-S03",
      "domain": "Daily living and self-care",
      "type": "strength",
      "label": "Maintains a workable home routine"
    },
    {
      "id": "IC-17-S04",
      "domain": "Daily living and self-care",
      "type": "strength",
      "label": "Manages daily responsibilities using available supports"
    },
    {
      "id": "IC-17-S05",
      "domain": "Daily living and self-care",
      "type": "strength",
      "label": "Recognizes when daily living assistance is needed"
    },
    {
      "id": "IC-17-N01",
      "domain": "Daily living and self-care",
      "type": "growth_or_support_need",
      "label": "Difficulty maintaining desired hygiene routines"
    },
    {
      "id": "IC-17-N02",
      "domain": "Daily living and self-care",
      "type": "growth_or_support_need",
      "label": "Difficulty obtaining or preparing food"
    },
    {
      "id": "IC-17-N03",
      "domain": "Daily living and self-care",
      "type": "growth_or_support_need",
      "label": "Difficulty maintaining a workable home routine"
    },
    {
      "id": "IC-17-N04",
      "domain": "Daily living and self-care",
      "type": "growth_or_support_need",
      "label": "Difficulty managing daily responsibilities"
    },
    {
      "id": "IC-17-N05",
      "domain": "Daily living and self-care",
      "type": "growth_or_support_need",
      "label": "Unmet need for assistance with daily living"
    },
    {
      "id": "IC-18-S01",
      "domain": "Sleep, activity, and wellness routines",
      "type": "strength",
      "label": "Maintains a workable sleep routine"
    },
    {
      "id": "IC-18-S02",
      "domain": "Sleep, activity, and wellness routines",
      "type": "strength",
      "label": "Recognizes how sleep affects functioning"
    },
    {
      "id": "IC-18-S03",
      "domain": "Sleep, activity, and wellness routines",
      "type": "strength",
      "label": "Participates in accessible preferred movement"
    },
    {
      "id": "IC-18-S04",
      "domain": "Sleep, activity, and wellness routines",
      "type": "strength",
      "label": "Maintains regular nourishment with needed supports"
    },
    {
      "id": "IC-18-S05",
      "domain": "Sleep, activity, and wellness routines",
      "type": "strength",
      "label": "Balances activity with recovery and rest"
    },
    {
      "id": "IC-18-N01",
      "domain": "Sleep, activity, and wellness routines",
      "type": "growth_or_support_need",
      "label": "Irregular sleep routine affecting functioning"
    },
    {
      "id": "IC-18-N02",
      "domain": "Sleep, activity, and wellness routines",
      "type": "growth_or_support_need",
      "label": "Reports sleep difficulty affecting daytime functioning"
    },
    {
      "id": "IC-18-N03",
      "domain": "Sleep, activity, and wellness routines",
      "type": "growth_or_support_need",
      "label": "Difficulty accessing desired physical activity"
    },
    {
      "id": "IC-18-N04",
      "domain": "Sleep, activity, and wellness routines",
      "type": "growth_or_support_need",
      "label": "Difficulty maintaining regular nourishment"
    },
    {
      "id": "IC-18-N05",
      "domain": "Sleep, activity, and wellness routines",
      "type": "growth_or_support_need",
      "label": "Difficulty balancing activity with rest"
    },
    {
      "id": "IC-19-S01",
      "domain": "Health management and care navigation",
      "type": "strength",
      "label": "Communicates health concerns to appropriate providers"
    },
    {
      "id": "IC-19-S02",
      "domain": "Health management and care navigation",
      "type": "strength",
      "label": "Understands an agreed care plan"
    },
    {
      "id": "IC-19-S03",
      "domain": "Health management and care navigation",
      "type": "strength",
      "label": "Uses medication as agreed when applicable"
    },
    {
      "id": "IC-19-S04",
      "domain": "Health management and care navigation",
      "type": "strength",
      "label": "Discusses treatment concerns or side effects"
    },
    {
      "id": "IC-19-S05",
      "domain": "Health management and care navigation",
      "type": "strength",
      "label": "Coordinates appointments using available supports"
    },
    {
      "id": "IC-19-N01",
      "domain": "Health management and care navigation",
      "type": "growth_or_support_need",
      "label": "Difficulty communicating health concerns"
    },
    {
      "id": "IC-19-N02",
      "domain": "Health management and care navigation",
      "type": "growth_or_support_need",
      "label": "Difficulty understanding an agreed care plan"
    },
    {
      "id": "IC-19-N03",
      "domain": "Health management and care navigation",
      "type": "growth_or_support_need",
      "label": "Difficulty following an agreed medication plan when applicable"
    },
    {
      "id": "IC-19-N04",
      "domain": "Health management and care navigation",
      "type": "growth_or_support_need",
      "label": "Unresolved concerns about treatment or side effects"
    },
    {
      "id": "IC-19-N05",
      "domain": "Health management and care navigation",
      "type": "growth_or_support_need",
      "label": "Difficulty coordinating or accessing appointments"
    },
    {
      "id": "IC-20-S01",
      "domain": "Substance use and recovery supports",
      "type": "strength",
      "label": "Recognizes how substance use affects personal goals"
    },
    {
      "id": "IC-20-S02",
      "domain": "Substance use and recovery supports",
      "type": "strength",
      "label": "Identifies situations associated with unwanted use"
    },
    {
      "id": "IC-20-S03",
      "domain": "Substance use and recovery supports",
      "type": "strength",
      "label": "Uses agreed strategies to reduce substance-related harm"
    },
    {
      "id": "IC-20-S04",
      "domain": "Substance use and recovery supports",
      "type": "strength",
      "label": "Engages preferred recovery or peer supports"
    },
    {
      "id": "IC-20-S05",
      "domain": "Substance use and recovery supports",
      "type": "strength",
      "label": "Seeks help after a return to unwanted use"
    },
    {
      "id": "IC-20-N01",
      "domain": "Substance use and recovery supports",
      "type": "growth_or_support_need",
      "label": "Difficulty recognizing effects of substance use"
    },
    {
      "id": "IC-20-N02",
      "domain": "Substance use and recovery supports",
      "type": "growth_or_support_need",
      "label": "Difficulty identifying situations associated with unwanted use"
    },
    {
      "id": "IC-20-N03",
      "domain": "Substance use and recovery supports",
      "type": "growth_or_support_need",
      "label": "Difficulty implementing agreed harm-reduction strategies"
    },
    {
      "id": "IC-20-N04",
      "domain": "Substance use and recovery supports",
      "type": "growth_or_support_need",
      "label": "Limited access to desired recovery supports"
    },
    {
      "id": "IC-20-N05",
      "domain": "Substance use and recovery supports",
      "type": "growth_or_support_need",
      "label": "Difficulty seeking help after a return to unwanted use"
    },
    {
      "id": "IC-21-S01",
      "domain": "Work, education, and vocational development",
      "type": "strength",
      "label": "Identifies work or educational interests"
    },
    {
      "id": "IC-21-S02",
      "domain": "Work, education, and vocational development",
      "type": "strength",
      "label": "Uses relevant occupational or academic skills"
    },
    {
      "id": "IC-21-S03",
      "domain": "Work, education, and vocational development",
      "type": "strength",
      "label": "Maintains workable attendance with needed supports"
    },
    {
      "id": "IC-21-S04",
      "domain": "Work, education, and vocational development",
      "type": "strength",
      "label": "Requests feedback or learning support"
    },
    {
      "id": "IC-21-S05",
      "domain": "Work, education, and vocational development",
      "type": "strength",
      "label": "Adapts tasks or environment to support performance"
    },
    {
      "id": "IC-21-N01",
      "domain": "Work, education, and vocational development",
      "type": "growth_or_support_need",
      "label": "Uncertainty about work or educational direction"
    },
    {
      "id": "IC-21-N02",
      "domain": "Work, education, and vocational development",
      "type": "growth_or_support_need",
      "label": "Needs skill development for a chosen role"
    },
    {
      "id": "IC-21-N03",
      "domain": "Work, education, and vocational development",
      "type": "growth_or_support_need",
      "label": "Attendance difficulties affecting chosen responsibilities"
    },
    {
      "id": "IC-21-N04",
      "domain": "Work, education, and vocational development",
      "type": "growth_or_support_need",
      "label": "Difficulty obtaining feedback or learning support"
    },
    {
      "id": "IC-21-N05",
      "domain": "Work, education, and vocational development",
      "type": "growth_or_support_need",
      "label": "Mismatch between current demands and available accommodations"
    },
    {
      "id": "IC-22-S01",
      "domain": "Parenting, caregiving, and family roles",
      "type": "strength",
      "label": "Recognizes a dependent's emotional and practical needs"
    },
    {
      "id": "IC-22-S02",
      "domain": "Parenting, caregiving, and family roles",
      "type": "strength",
      "label": "Provides predictable care using available supports"
    },
    {
      "id": "IC-22-S03",
      "domain": "Parenting, caregiving, and family roles",
      "type": "strength",
      "label": "Communicates expectations in developmentally appropriate ways"
    },
    {
      "id": "IC-22-S04",
      "domain": "Parenting, caregiving, and family roles",
      "type": "strength",
      "label": "Seeks caregiving advice or respite when needed"
    },
    {
      "id": "IC-22-S05",
      "domain": "Parenting, caregiving, and family roles",
      "type": "strength",
      "label": "Collaborates with family or other caregivers"
    },
    {
      "id": "IC-22-N01",
      "domain": "Parenting, caregiving, and family roles",
      "type": "growth_or_support_need",
      "label": "Difficulty recognizing a dependent's needs in identified situations"
    },
    {
      "id": "IC-22-N02",
      "domain": "Parenting, caregiving, and family roles",
      "type": "growth_or_support_need",
      "label": "Difficulty maintaining predictable caregiving routines"
    },
    {
      "id": "IC-22-N03",
      "domain": "Parenting, caregiving, and family roles",
      "type": "growth_or_support_need",
      "label": "Difficulty matching expectations to developmental needs"
    },
    {
      "id": "IC-22-N04",
      "domain": "Parenting, caregiving, and family roles",
      "type": "growth_or_support_need",
      "label": "Caregiver strain or limited respite access"
    },
    {
      "id": "IC-22-N05",
      "domain": "Parenting, caregiving, and family roles",
      "type": "growth_or_support_need",
      "label": "Difficulty coordinating responsibilities with other caregivers"
    },
    {
      "id": "IC-23-S01",
      "domain": "Practical resources and environmental supports",
      "type": "strength",
      "label": "Has access to stable and suitable housing"
    },
    {
      "id": "IC-23-S02",
      "domain": "Practical resources and environmental supports",
      "type": "strength",
      "label": "Has access to reliable transportation"
    },
    {
      "id": "IC-23-S03",
      "domain": "Practical resources and environmental supports",
      "type": "strength",
      "label": "Has access to food and essential resources"
    },
    {
      "id": "IC-23-S04",
      "domain": "Practical resources and environmental supports",
      "type": "strength",
      "label": "Has access to needed communication technology"
    },
    {
      "id": "IC-23-S05",
      "domain": "Practical resources and environmental supports",
      "type": "strength",
      "label": "Has access to benefits or financial support when eligible"
    },
    {
      "id": "IC-23-N01",
      "domain": "Practical resources and environmental supports",
      "type": "growth_or_support_need",
      "label": "Housing instability or unsuitable living conditions"
    },
    {
      "id": "IC-23-N02",
      "domain": "Practical resources and environmental supports",
      "type": "growth_or_support_need",
      "label": "Transportation barriers affecting participation"
    },
    {
      "id": "IC-23-N03",
      "domain": "Practical resources and environmental supports",
      "type": "growth_or_support_need",
      "label": "Difficulty meeting food or essential material needs"
    },
    {
      "id": "IC-23-N04",
      "domain": "Practical resources and environmental supports",
      "type": "growth_or_support_need",
      "label": "Limited access to needed communication technology"
    },
    {
      "id": "IC-23-N05",
      "domain": "Practical resources and environmental supports",
      "type": "growth_or_support_need",
      "label": "Financial strain or difficulty obtaining eligible benefits"
    },
    {
      "id": "IC-24-S01",
      "domain": "Life direction, creativity, and growth",
      "type": "strength",
      "label": "Identifies a personally meaningful life direction"
    },
    {
      "id": "IC-24-S02",
      "domain": "Life direction, creativity, and growth",
      "type": "strength",
      "label": "Uses creativity or curiosity to explore possibilities"
    },
    {
      "id": "IC-24-S03",
      "domain": "Life direction, creativity, and growth",
      "type": "strength",
      "label": "Experiments with manageable new behaviors"
    },
    {
      "id": "IC-24-S04",
      "domain": "Life direction, creativity, and growth",
      "type": "strength",
      "label": "Recognizes transferable skills from past experiences"
    },
    {
      "id": "IC-24-S05",
      "domain": "Life direction, creativity, and growth",
      "type": "strength",
      "label": "Reviews progress and adjusts goals"
    },
    {
      "id": "IC-24-N01",
      "domain": "Life direction, creativity, and growth",
      "type": "growth_or_support_need",
      "label": "Uncertainty about desired life direction"
    },
    {
      "id": "IC-24-N02",
      "domain": "Life direction, creativity, and growth",
      "type": "growth_or_support_need",
      "label": "Difficulty exploring alternatives to familiar patterns"
    },
    {
      "id": "IC-24-N03",
      "domain": "Life direction, creativity, and growth",
      "type": "growth_or_support_need",
      "label": "Avoids manageable new experiences despite stated goals"
    },
    {
      "id": "IC-24-N04",
      "domain": "Life direction, creativity, and growth",
      "type": "growth_or_support_need",
      "label": "Difficulty recognizing transferable skills"
    },
    {
      "id": "IC-24-N05",
      "domain": "Life direction, creativity, and growth",
      "type": "growth_or_support_need",
      "label": "Difficulty reviewing progress or adjusting goals"
    }
  ]
};
