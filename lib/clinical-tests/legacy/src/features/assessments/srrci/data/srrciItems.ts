import type { SRRCIItem } from "../types/srrciTypes";

export const srrciItems: SRRCIItem[] = [
  // =====================================================
  // CLINICAL REGULATION / DYSREGULATION DOMAINS
  // =====================================================

  // Cognitive Sexual Preoccupation — CSP
  { id: "SRRCI_001", itemNumber: 1, text: "Sexual thoughts interrupt my concentration during ordinary activities.", domain: "CSP", category: "clinical" },
  { id: "SRRCI_002", itemNumber: 2, text: "I have difficulty redirecting my attention once sexual thoughts become active.", domain: "CSP", category: "clinical" },
  { id: "SRRCI_003", itemNumber: 3, text: "Sexual fantasy becomes more intrusive when I am stressed, bored, or emotionally unsettled.", domain: "CSP", category: "clinical" },
  { id: "SRRCI_004", itemNumber: 4, text: "I spend more mental energy on sexual thoughts than I believe is healthy for me.", domain: "CSP", category: "clinical" },
  { id: "SRRCI_005", itemNumber: 5, text: "Sexual thoughts sometimes interfere with my ability to be emotionally present with others.", domain: "CSP", category: "clinical" },
  { id: "SRRCI_006", itemNumber: 6, text: "I find myself planning or anticipating sexual stimulation when I should be focused elsewhere.", domain: "CSP", category: "clinical" },

  // Urge Dyscontrol & Compulsivity — UDC
  { id: "SRRCI_007", itemNumber: 7, text: "I act on sexual urges even after deciding that I should not.", domain: "UDC", category: "clinical" },
  { id: "SRRCI_008", itemNumber: 8, text: "Once sexually triggered, I have difficulty slowing down my behavior.", domain: "UDC", category: "clinical" },
  { id: "SRRCI_009", itemNumber: 9, text: "I repeatedly break sexual limits that I previously set for myself.", domain: "UDC", category: "clinical" },
  { id: "SRRCI_010", itemNumber: 10, text: "I continue sexual behavior longer than I originally intended.", domain: "UDC", category: "clinical" },
  { id: "SRRCI_011", itemNumber: 11, text: "In sexually charged moments, my judgment becomes weaker than I expect.", domain: "UDC", category: "clinical" },
  { id: "SRRCI_012", itemNumber: 12, text: "My sexual behavior sometimes feels driven rather than freely chosen.", domain: "UDC", category: "clinical" },

  // Emotional Regulation Through Sexuality — ERTS
  { id: "SRRCI_013", itemNumber: 13, text: "Sexual stimulation temporarily relieves emotional distress.", domain: "ERTS", category: "clinical" },
  { id: "SRRCI_014", itemNumber: 14, text: "I become more sexually driven when I feel lonely, rejected, or emotionally hurt.", domain: "ERTS", category: "clinical" },
  { id: "SRRCI_015", itemNumber: 15, text: "Sexual fantasy helps me avoid emotions that I do not want to face.", domain: "ERTS", category: "clinical" },
  { id: "SRRCI_016", itemNumber: 16, text: "I seek sexual stimulation when I feel anxious, empty, angry, or overwhelmed.", domain: "ERTS", category: "clinical" },
  { id: "SRRCI_017", itemNumber: 17, text: "Sexual behavior sometimes functions more like emotional medication than intimacy.", domain: "ERTS", category: "clinical" },
  { id: "SRRCI_018", itemNumber: 18, text: "Emotional conflict increases my desire for sexual relief or distraction.", domain: "ERTS", category: "clinical" },

  // Escalation & Novelty Seeking — ENS
  { id: "SRRCI_019", itemNumber: 19, text: "Sexual experiences that once satisfied me now feel less stimulating.", domain: "ENS", category: "clinical" },
  { id: "SRRCI_020", itemNumber: 20, text: "I seek stronger, newer, or more intense sexual stimulation than I used to.", domain: "ENS", category: "clinical" },
  { id: "SRRCI_021", itemNumber: 21, text: "I have crossed sexual boundaries that I previously believed I would not cross.", domain: "ENS", category: "clinical" },
  { id: "SRRCI_022", itemNumber: 22, text: "I become restless when sexual experiences feel too predictable.", domain: "ENS", category: "clinical" },
  { id: "SRRCI_023", itemNumber: 23, text: "My sexual interests have moved toward greater intensity over time.", domain: "ENS", category: "clinical" },
  { id: "SRRCI_024", itemNumber: 24, text: "Novelty sometimes matters more to me than emotional connection.", domain: "ENS", category: "clinical" },

  // Secrecy & Relational Damage — SRD
  { id: "SRRCI_025", itemNumber: 25, text: "I conceal aspects of my sexual behavior from people who would be affected by knowing.", domain: "SRD", category: "clinical" },
  { id: "SRRCI_026", itemNumber: 26, text: "Sexual secrecy has damaged trust in one or more relationships.", domain: "SRD", category: "clinical" },
  { id: "SRRCI_027", itemNumber: 27, text: "I minimize sexual behavior when confronted about it.", domain: "SRD", category: "clinical" },
  { id: "SRRCI_028", itemNumber: 28, text: "I maintain separate sexual or emotional worlds that others do not fully know about.", domain: "SRD", category: "clinical" },
  { id: "SRRCI_029", itemNumber: 29, text: "I avoid honest conversations about sexual behavior because I fear consequences.", domain: "SRD", category: "clinical" },
  { id: "SRRCI_030", itemNumber: 30, text: "My sexual behavior has created emotional distance in a relationship.", domain: "SRD", category: "clinical" },

  // Functional Impairment — FI
  { id: "SRRCI_031", itemNumber: 31, text: "Sexual urges or behavior interfere with work, sleep, responsibilities, or productivity.", domain: "FI", category: "clinical" },
  { id: "SRRCI_032", itemNumber: 32, text: "I lose meaningful time because of sexual behavior, fantasy, or sexual media.", domain: "FI", category: "clinical" },
  { id: "SRRCI_033", itemNumber: 33, text: "Sexual behavior sometimes disrupts my daily schedule or long-term goals.", domain: "FI", category: "clinical" },
  { id: "SRRCI_034", itemNumber: 34, text: "I have neglected important responsibilities because of sexual preoccupation.", domain: "FI", category: "clinical" },
  { id: "SRRCI_035", itemNumber: 35, text: "Sexual behavior has created practical problems that I later regretted.", domain: "FI", category: "clinical" },
  { id: "SRRCI_036", itemNumber: 36, text: "Sexual preoccupation has reduced my emotional, professional, or relational stability.", domain: "FI", category: "clinical" },

  // Values Conflict & Shame — VCS
  { id: "SRRCI_037", itemNumber: 37, text: "My sexual behavior sometimes conflicts with my values, beliefs, or commitments.", domain: "VCS", category: "clinical" },
  { id: "SRRCI_038", itemNumber: 38, text: "I feel guilt, shame, or self-disappointment after certain sexual choices.", domain: "VCS", category: "clinical" },
  { id: "SRRCI_039", itemNumber: 39, text: "I sometimes feel trapped between what I desire and who I want to be.", domain: "VCS", category: "clinical" },
  { id: "SRRCI_040", itemNumber: 40, text: "Shame sometimes leads me back into the very sexual pattern I regret.", domain: "VCS", category: "clinical" },
  { id: "SRRCI_041", itemNumber: 41, text: "I judge myself harshly because of some sexual impulses or behaviors.", domain: "VCS", category: "clinical" },
  { id: "SRRCI_042", itemNumber: 42, text: "I have difficulty reconciling my sexual behavior with my desired identity.", domain: "VCS", category: "clinical" },

  // Risk & Safety Disregard — RSD
  { id: "SRRCI_043", itemNumber: 43, text: "I take sexual risks that could harm my relationships, health, reputation, or stability.", domain: "RSD", category: "clinical" },
  { id: "SRRCI_044", itemNumber: 44, text: "In sexually charged moments, I downplay consequences that would normally concern me.", domain: "RSD", category: "clinical" },
  { id: "SRRCI_045", itemNumber: 45, text: "I have made sexual decisions impulsively and later considered them reckless.", domain: "RSD", category: "clinical" },
  { id: "SRRCI_046", itemNumber: 46, text: "Sexual excitement can override my usual caution.", domain: "RSD", category: "clinical" },
  { id: "SRRCI_047", itemNumber: 47, text: "I have continued sexual behavior even when I knew it could seriously hurt me or someone else.", domain: "RSD", category: "clinical" },
  { id: "SRRCI_048", itemNumber: 48, text: "When sexually activated, I may ignore boundaries that I usually respect.", domain: "RSD", category: "clinical" },

  // Pornography & Digital Compulsion — PDC
  { id: "SRRCI_049", itemNumber: 49, text: "I spend more time with sexual media or online sexual content than I intended.", domain: "PDC", category: "clinical" },
  { id: "SRRCI_050", itemNumber: 50, text: "I return to digital sexual content after deciding to stop or limit it.", domain: "PDC", category: "clinical" },
  { id: "SRRCI_051", itemNumber: 51, text: "Online sexual stimulation sometimes substitutes for emotional closeness.", domain: "PDC", category: "clinical" },
  { id: "SRRCI_052", itemNumber: 52, text: "I use pornography, sexting, sexual media, or online sexual interaction to change my emotional state.", domain: "PDC", category: "clinical" },
  { id: "SRRCI_053", itemNumber: 53, text: "I lose track of time while engaged with digital sexual content.", domain: "PDC", category: "clinical" },
  { id: "SRRCI_054", itemNumber: 54, text: "Digital sexual stimulation has become more important to me than I would like.", domain: "PDC", category: "clinical" },

  // Relapse & Recovery Instability — RRI
  { id: "SRRCI_055", itemNumber: 55, text: "I repeatedly return to sexual patterns I intended to change.", domain: "RRI", category: "clinical" },
  { id: "SRRCI_056", itemNumber: 56, text: "My sexual behavior follows a cycle of urge, action, regret, and renewed commitment.", domain: "RRI", category: "clinical" },
  { id: "SRRCI_057", itemNumber: 57, text: "Periods of improvement are often followed by return to old sexual habits.", domain: "RRI", category: "clinical" },
  { id: "SRRCI_058", itemNumber: 58, text: "Stress increases my likelihood of returning to sexual behaviors I intended to avoid.", domain: "RRI", category: "clinical" },
  { id: "SRRCI_059", itemNumber: 59, text: "Willpower alone has not been enough to maintain the sexual boundaries I want.", domain: "RRI", category: "clinical" },
  { id: "SRRCI_060", itemNumber: 60, text: "I sometimes feel stuck in repetitive sexual cycles.", domain: "RRI", category: "clinical" },

  // Attachment & Emotional Dependency — AED
  { id: "SRRCI_061", itemNumber: 61, text: "Sexual closeness strongly affects my sense of emotional security.", domain: "AED", category: "clinical" },
  { id: "SRRCI_062", itemNumber: 62, text: "I become sexually vulnerable when I fear rejection or abandonment.", domain: "AED", category: "clinical" },
  { id: "SRRCI_063", itemNumber: 63, text: "Feeling sexually desired helps me feel emotionally safe.", domain: "AED", category: "clinical" },
  { id: "SRRCI_064", itemNumber: 64, text: "When intimacy feels uncertain, I may seek sexual reassurance.", domain: "AED", category: "clinical" },
  { id: "SRRCI_065", itemNumber: 65, text: "Sexual rejection can feel like emotional rejection to me.", domain: "AED", category: "clinical" },
  { id: "SRRCI_066", itemNumber: 66, text: "I sometimes use sexuality to maintain closeness or prevent distance.", domain: "AED", category: "clinical" },

  // Validation & Identity Sexuality — VIS
  { id: "SRRCI_067", itemNumber: 67, text: "Sexual attention strongly affects my self-esteem.", domain: "VIS", category: "clinical" },
  { id: "SRRCI_068", itemNumber: 68, text: "Being desired makes me feel more powerful, attractive, or important.", domain: "VIS", category: "clinical" },
  { id: "SRRCI_069", itemNumber: 69, text: "I sometimes pursue sexual attention more for validation than connection.", domain: "VIS", category: "clinical" },
  { id: "SRRCI_070", itemNumber: 70, text: "Sexual rejection can significantly affect how I see myself.", domain: "VIS", category: "clinical" },
  { id: "SRRCI_071", itemNumber: 71, text: "Sexual affirmation can temporarily repair my mood or self-worth.", domain: "VIS", category: "clinical" },
  { id: "SRRCI_072", itemNumber: 72, text: "I feel emotionally elevated when I am sexually pursued or admired.", domain: "VIS", category: "clinical" },

  // Trauma, Numbing & Dissociation — TND
  { id: "SRRCI_073", itemNumber: 73, text: "Sexual behavior can temporarily disconnect me from emotional pain.", domain: "TND", category: "clinical" },
  { id: "SRRCI_074", itemNumber: 74, text: "Some sexual behavior feels more like escape than connection.", domain: "TND", category: "clinical" },
  { id: "SRRCI_075", itemNumber: 75, text: "I sometimes feel emotionally detached during sexual experiences.", domain: "TND", category: "clinical" },
  { id: "SRRCI_076", itemNumber: 76, text: "Sexual stimulation can numb uncomfortable feelings.", domain: "TND", category: "clinical" },
  { id: "SRRCI_077", itemNumber: 77, text: "Unresolved emotional wounds can increase my sexual urges.", domain: "TND", category: "clinical" },
  { id: "SRRCI_078", itemNumber: 78, text: "Sexual behavior sometimes helps me avoid memories, grief, or emotional vulnerability.", domain: "TND", category: "clinical" },

  // Obsessive / Ritualized Sexuality — ORS
  { id: "SRRCI_079", itemNumber: 79, text: "Certain sexual routines feel difficult to interrupt once started.", domain: "ORS", category: "clinical" },
  { id: "SRRCI_080", itemNumber: 80, text: "I feel tension or agitation when sexual habits are disrupted.", domain: "ORS", category: "clinical" },
  { id: "SRRCI_081", itemNumber: 81, text: "Sexual thoughts sometimes loop repeatedly in my mind.", domain: "ORS", category: "clinical" },
  { id: "SRRCI_082", itemNumber: 82, text: "I experience internal pressure to complete certain sexual behaviors.", domain: "ORS", category: "clinical" },
  { id: "SRRCI_083", itemNumber: 83, text: "Some sexual behavior feels driven by tension reduction rather than enjoyment.", domain: "ORS", category: "clinical" },
  { id: "SRRCI_084", itemNumber: 84, text: "I may repeat sexual behaviors even when the experience is no longer satisfying.", domain: "ORS", category: "clinical" },

  // =====================================================
  // HEALTHY SEXUAL REGULATION
  // =====================================================

  { id: "SRRCI_085", itemNumber: 85, text: "I can redirect sexual thoughts when they appear at inconvenient times.", domain: "HR", category: "healthy_regulation" },
  { id: "SRRCI_086", itemNumber: 86, text: "I can experience sexual desire without feeling controlled by it.", domain: "HR", category: "healthy_regulation" },
  { id: "SRRCI_087", itemNumber: 87, text: "My sexual choices generally align with my values and commitments.", domain: "HR", category: "healthy_regulation" },
  { id: "SRRCI_088", itemNumber: 88, text: "I can tolerate sexual frustration without acting destructively.", domain: "HR", category: "healthy_regulation" },
  { id: "SRRCI_089", itemNumber: 89, text: "I can be honest about sexual needs without pressuring or manipulating others.", domain: "HR", category: "healthy_regulation" },
  { id: "SRRCI_090", itemNumber: 90, text: "I can enjoy sexuality while still protecting my responsibilities, relationships, and judgment.", domain: "HR", category: "healthy_regulation" },
  { id: "SRRCI_091", itemNumber: 91, text: "I can respect another person’s boundaries even when I feel sexually disappointed.", domain: "HR", category: "healthy_regulation" },
  { id: "SRRCI_092", itemNumber: 92, text: "My sexual life feels integrated with the rest of my life rather than separate from it.", domain: "HR", category: "healthy_regulation" },
  { id: "SRRCI_093", itemNumber: 93, text: "I can experience strong sexual desire without assuming it means something is wrong with me.", domain: "HR", category: "healthy_regulation" },
  { id: "SRRCI_094", itemNumber: 94, text: "I can pause and consider consequences before acting on a sexual impulse.", domain: "HR", category: "healthy_regulation" },
  { id: "SRRCI_095", itemNumber: 95, text: "I can use non-sexual coping skills when I am lonely, anxious, rejected, or overwhelmed.", domain: "HR", category: "healthy_regulation" },
  { id: "SRRCI_096", itemNumber: 96, text: "I can maintain sexual honesty without either hiding my desires or forcing them on someone else.", domain: "HR", category: "healthy_regulation" },

  // =====================================================
  // RELATIONAL / COMPATIBILITY DOMAINS
  // =====================================================

  // Partner Desire Alignment — PDA
  { id: "SRRCI_097", itemNumber: 97, text: "I feel genuine sexual desire toward my current or most recent partner.", domain: "PDA", category: "compatibility", compatibilityDimension: "partner_desire" },
  { id: "SRRCI_098", itemNumber: 98, text: "I prefer sexual intimacy with my partner over seeking sexual attention elsewhere.", domain: "PDA", category: "compatibility", compatibilityDimension: "partner_desire" },
  { id: "SRRCI_099", itemNumber: 99, text: "My attraction to my partner remains meaningful even during ordinary daily life.", domain: "PDA", category: "compatibility", compatibilityDimension: "partner_desire" },
  { id: "SRRCI_100", itemNumber: 100, text: "I often compare my partner sexually to other people in a way that reduces my desire for my partner.", domain: "PDA", category: "compatibility", reverseScored: true, compatibilityDimension: "partner_desire" },
  { id: "SRRCI_101", itemNumber: 101, text: "When my relationship feels emotionally healthy, my sexual desire for my partner increases.", domain: "PDA", category: "compatibility", compatibilityDimension: "partner_desire" },
  { id: "SRRCI_102", itemNumber: 102, text: "I feel sexually disconnected from my partner even when the relationship appears stable.", domain: "PDA", category: "compatibility", reverseScored: true, compatibilityDimension: "partner_desire" },

  // Desired Frequency Alignment — DFA
  { id: "SRRCI_103", itemNumber: 103, text: "I prefer sexual intimacy to occur frequently in a committed relationship.", domain: "DFA", category: "compatibility", compatibilityDimension: "frequency" },
  { id: "SRRCI_104", itemNumber: 104, text: "I feel frustrated when sexual frequency is lower than I desire.", domain: "DFA", category: "compatibility", compatibilityDimension: "frequency" },
  { id: "SRRCI_105", itemNumber: 105, text: "I can remain emotionally stable even when sexual frequency is temporarily lower than I prefer.", domain: "DFA", category: "compatibility", compatibilityDimension: "frequency" },
  { id: "SRRCI_106", itemNumber: 106, text: "A mismatch in sexual frequency would become a major relationship stressor for me.", domain: "DFA", category: "compatibility", compatibilityDimension: "frequency" },
  { id: "SRRCI_107", itemNumber: 107, text: "I would rather have less frequent sex that feels emotionally connected than frequent sex that feels disconnected.", domain: "DFA", category: "compatibility", compatibilityDimension: "frequency" },
  { id: "SRRCI_108", itemNumber: 108, text: "If my partner rarely initiated sex, I would likely feel unwanted.", domain: "DFA", category: "compatibility", compatibilityDimension: "frequency" },

  // Adventure & Novelty Orientation — ANO
  { id: "SRRCI_109", itemNumber: 109, text: "I value sexual adventure, variety, or creativity in a long-term relationship.", domain: "ANO", category: "compatibility", compatibilityDimension: "novelty" },
  { id: "SRRCI_110", itemNumber: 110, text: "I prefer sexual routines that feel emotionally safe and predictable.", domain: "ANO", category: "compatibility", reverseScored: true, compatibilityDimension: "novelty" },
  { id: "SRRCI_111", itemNumber: 111, text: "I would feel limited if my partner had very little interest in sexual variety.", domain: "ANO", category: "compatibility", compatibilityDimension: "novelty" },
  { id: "SRRCI_112", itemNumber: 112, text: "I can enjoy sexual novelty without needing it to keep escalating.", domain: "ANO", category: "compatibility", compatibilityDimension: "novelty" },
  { id: "SRRCI_113", itemNumber: 113, text: "I am open to discussing fantasies or preferences respectfully with my partner.", domain: "ANO", category: "compatibility", compatibilityDimension: "novelty" },
  { id: "SRRCI_114", itemNumber: 114, text: "Too much novelty pressure would make me feel unsafe or objectified.", domain: "ANO", category: "compatibility", reverseScored: true, compatibilityDimension: "novelty" },

  // Sexual Communication Capacity — SCC
  { id: "SRRCI_115", itemNumber: 115, text: "I can talk openly with a partner about sexual needs without becoming defensive.", domain: "SCC", category: "compatibility", compatibilityDimension: "communication" },
  { id: "SRRCI_116", itemNumber: 116, text: "I avoid sexual conversations because they feel embarrassing, shameful, or risky.", domain: "SCC", category: "compatibility", reverseScored: true, compatibilityDimension: "communication" },
  { id: "SRRCI_117", itemNumber: 117, text: "I can listen to sexual feedback without interpreting it as rejection.", domain: "SCC", category: "compatibility", compatibilityDimension: "communication" },
  { id: "SRRCI_118", itemNumber: 118, text: "I can clearly express sexual boundaries and preferences.", domain: "SCC", category: "compatibility", compatibilityDimension: "communication" },
  { id: "SRRCI_119", itemNumber: 119, text: "When sexual dissatisfaction appears, I prefer honest discussion over silence or resentment.", domain: "SCC", category: "compatibility", compatibilityDimension: "communication" },
  { id: "SRRCI_120", itemNumber: 120, text: "I shut down or withdraw when sexual issues need to be discussed.", domain: "SCC", category: "compatibility", reverseScored: true, compatibilityDimension: "communication" },
  { id: "SRRCI_121", itemNumber: 121, text: "I can ask for clarification when I do not understand a partner’s sexual needs.", domain: "SCC", category: "compatibility", compatibilityDimension: "communication" },

  // Boundary & Exclusivity Alignment — BEA
  { id: "SRRCI_122", itemNumber: 122, text: "I strongly value exclusivity and clear boundaries in a committed relationship.", domain: "BEA", category: "compatibility", compatibilityDimension: "boundaries" },
  { id: "SRRCI_123", itemNumber: 123, text: "I believe online sexual secrecy can seriously damage trust.", domain: "BEA", category: "compatibility", compatibilityDimension: "boundaries" },
  { id: "SRRCI_124", itemNumber: 124, text: "I need my partner and me to agree clearly about pornography, flirting, and online sexual behavior.", domain: "BEA", category: "compatibility", compatibilityDimension: "boundaries" },
  { id: "SRRCI_125", itemNumber: 125, text: "I am comfortable with flexible or negotiated sexual boundaries if both partners honestly agree.", domain: "BEA", category: "compatibility", compatibilityDimension: "boundaries" },
  { id: "SRRCI_126", itemNumber: 126, text: "I would feel betrayed if my partner hid sexual communication with someone else.", domain: "BEA", category: "compatibility", compatibilityDimension: "boundaries" },
  { id: "SRRCI_127", itemNumber: 127, text: "I tend to assume boundaries are understood without needing direct discussion.", domain: "BEA", category: "compatibility", reverseScored: true, compatibilityDimension: "boundaries" },
  { id: "SRRCI_128", itemNumber: 128, text: "I can negotiate sexual boundaries without treating the conversation as rejection.", domain: "BEA", category: "compatibility", compatibilityDimension: "boundaries" },

  // Affection & Emotional Intimacy — AEI
  { id: "SRRCI_129", itemNumber: 129, text: "Non-sexual affection is important for my sexual openness.", domain: "AEI", category: "compatibility", compatibilityDimension: "affection" },
  { id: "SRRCI_130", itemNumber: 130, text: "I need emotional warmth, reassurance, or tenderness around sexual intimacy.", domain: "AEI", category: "compatibility", compatibilityDimension: "affection" },
  { id: "SRRCI_131", itemNumber: 131, text: "I can separate sexual desire from emotional closeness.", domain: "AEI", category: "compatibility", reverseScored: true, compatibilityDimension: "affection" },
  { id: "SRRCI_132", itemNumber: 132, text: "Physical touch outside of sex helps me feel loved.", domain: "AEI", category: "compatibility", compatibilityDimension: "affection" },
  { id: "SRRCI_133", itemNumber: 133, text: "After sexual intimacy, emotional connection or closeness matters to me.", domain: "AEI", category: "compatibility", compatibilityDimension: "affection" },
  { id: "SRRCI_134", itemNumber: 134, text: "A lack of affection can reduce my sexual desire.", domain: "AEI", category: "compatibility", compatibilityDimension: "affection" },

  // Sexual Self-Confidence & Vulnerability — SCV
  { id: "SRRCI_135", itemNumber: 135, text: "I can be sexually vulnerable with a partner I trust.", domain: "SCV", category: "compatibility", compatibilityDimension: "confidence" },
  { id: "SRRCI_136", itemNumber: 136, text: "Fear of rejection makes it difficult for me to initiate sexual closeness.", domain: "SCV", category: "compatibility", reverseScored: true, compatibilityDimension: "confidence" },
  { id: "SRRCI_137", itemNumber: 137, text: "I feel generally comfortable communicating what I enjoy sexually.", domain: "SCV", category: "compatibility", compatibilityDimension: "confidence" },
  { id: "SRRCI_138", itemNumber: 138, text: "Body image or performance concerns interfere with my sexual confidence.", domain: "SCV", category: "compatibility", reverseScored: true, compatibilityDimension: "confidence" },
  { id: "SRRCI_139", itemNumber: 139, text: "I can handle sexual feedback without feeling humiliated.", domain: "SCV", category: "compatibility", compatibilityDimension: "confidence" },
  { id: "SRRCI_140", itemNumber: 140, text: "I avoid sexual expression because I fear being judged.", domain: "SCV", category: "compatibility", reverseScored: true, compatibilityDimension: "confidence" },

  // Partner Satisfaction & Fulfillment — PSF
  { id: "SRRCI_141", itemNumber: 141, text: "I feel sexually fulfilled in my current or most recent relationship.", domain: "PSF", category: "compatibility", compatibilityDimension: "satisfaction" },
  { id: "SRRCI_142", itemNumber: 142, text: "I feel wanted by my partner.", domain: "PSF", category: "compatibility", compatibilityDimension: "satisfaction" },
  { id: "SRRCI_143", itemNumber: 143, text: "I carry unresolved sexual disappointment or resentment in my relationship.", domain: "PSF", category: "compatibility", reverseScored: true, compatibilityDimension: "satisfaction" },
  { id: "SRRCI_144", itemNumber: 144, text: "My sexual relationship feels emotionally reciprocal.", domain: "PSF", category: "compatibility", compatibilityDimension: "satisfaction" },
  { id: "SRRCI_145", itemNumber: 145, text: "I often feel that my sexual needs matter less than my partner’s needs.", domain: "PSF", category: "compatibility", reverseScored: true, compatibilityDimension: "satisfaction" },
  { id: "SRRCI_146", itemNumber: 146, text: "I believe my partner and I can improve sexual satisfaction together.", domain: "PSF", category: "compatibility", compatibilityDimension: "satisfaction" },

  // Sexual Initiative Reciprocity — SIRS
  { id: "SRRCI_147", itemNumber: 147, text: "I prefer both partners to initiate sexual closeness at times.", domain: "SIRS", category: "compatibility", compatibilityDimension: "initiative" },
  { id: "SRRCI_148", itemNumber: 148, text: "I feel hurt if I am usually the only one initiating intimacy.", domain: "SIRS", category: "compatibility", compatibilityDimension: "initiative" },
  { id: "SRRCI_149", itemNumber: 149, text: "I am comfortable initiating sexual closeness when I desire it.", domain: "SIRS", category: "compatibility", compatibilityDimension: "initiative" },
  { id: "SRRCI_150", itemNumber: 150, text: "I tend to wait for my partner to initiate even when I want closeness.", domain: "SIRS", category: "compatibility", reverseScored: true, compatibilityDimension: "initiative" },
  { id: "SRRCI_151", itemNumber: 151, text: "I can decline intimacy respectfully without creating emotional punishment.", domain: "SIRS", category: "compatibility", compatibilityDimension: "initiative" },
  { id: "SRRCI_152", itemNumber: 152, text: "Repeated sexual rejection would likely make me withdraw emotionally.", domain: "SIRS", category: "compatibility", reverseScored: true, compatibilityDimension: "initiative" },

  // Relational Resilience — RRS
  { id: "SRRCI_153", itemNumber: 153, text: "My partner and I can recover after difficult conversations about intimacy.", domain: "RRS", category: "compatibility", compatibilityDimension: "resilience" },
  { id: "SRRCI_154", itemNumber: 154, text: "I am willing to negotiate sexual differences rather than treat them as personal attacks.", domain: "RRS", category: "compatibility", compatibilityDimension: "resilience" },
  { id: "SRRCI_155", itemNumber: 155, text: "When sexual disappointment happens, I can stay respectful and connected.", domain: "RRS", category: "compatibility", compatibilityDimension: "resilience" },
  { id: "SRRCI_156", itemNumber: 156, text: "I believe sexual compatibility can improve through honesty, patience, and mutual effort.", domain: "RRS", category: "compatibility", compatibilityDimension: "resilience" },
  { id: "SRRCI_157", itemNumber: 157, text: "I become resentful quickly when sexual needs are not met.", domain: "RRS", category: "compatibility", reverseScored: true, compatibilityDimension: "resilience" },
  { id: "SRRCI_158", itemNumber: 158, text: "I can separate a temporary sexual mismatch from the overall worth of the relationship.", domain: "RRS", category: "compatibility", compatibilityDimension: "resilience" },
  { id: "SRRCI_159", itemNumber: 159, text: "I can stay collaborative when my partner’s sexual pace differs from mine.", domain: "RRS", category: "compatibility", compatibilityDimension: "resilience" },
  { id: "SRRCI_160", itemNumber: 160, text: "Sexual conflict tends to make me question the entire relationship.", domain: "RRS", category: "compatibility", reverseScored: true, compatibilityDimension: "resilience" },

  // =====================================================
  // COUPLE-DYNAMICS / PARTNER-COMPARISON READY ITEMS
  // Kept under compatibility category to preserve current typing.
  // =====================================================

  { id: "SRRCI_161", itemNumber: 161, text: "My partner and I seem to want sexual closeness at similar times or under similar emotional conditions.", domain: "DFA", category: "compatibility", compatibilityDimension: "frequency" },
  { id: "SRRCI_162", itemNumber: 162, text: "I can tell the difference between my partner rejecting sex and my partner rejecting me as a person.", domain: "AED", category: "clinical" },
  { id: "SRRCI_163", itemNumber: 163, text: "When my partner wants more sexual closeness than I do, I can respond with care rather than irritation.", domain: "RRS", category: "compatibility", compatibilityDimension: "resilience" },
  { id: "SRRCI_164", itemNumber: 164, text: "When I want more sexual closeness than my partner does, I can express that need without pressuring them.", domain: "SCC", category: "compatibility", compatibilityDimension: "communication" },
  { id: "SRRCI_165", itemNumber: 165, text: "Differences in sexual desire can make me feel insecure about the relationship.", domain: "AED", category: "clinical" },
  { id: "SRRCI_166", itemNumber: 166, text: "My partner and I can discuss sexual differences before they turn into resentment.", domain: "SCC", category: "compatibility", compatibilityDimension: "communication" },
  { id: "SRRCI_167", itemNumber: 167, text: "I need sexual intimacy to include signs of affection, care, or emotional regard.", domain: "AEI", category: "compatibility", compatibilityDimension: "affection" },
  { id: "SRRCI_168", itemNumber: 168, text: "I can accept that my partner’s desire may operate differently from mine without assuming bad motives.", domain: "RRS", category: "compatibility", compatibilityDimension: "resilience" },
  { id: "SRRCI_169", itemNumber: 169, text: "I would struggle in a relationship where my partner viewed sexual boundaries very differently than I do.", domain: "BEA", category: "compatibility", compatibilityDimension: "boundaries" },
  { id: "SRRCI_170", itemNumber: 170, text: "I can participate in sexual problem-solving without needing one person to be blamed.", domain: "RRS", category: "compatibility", compatibilityDimension: "resilience" },
  { id: "SRRCI_171", itemNumber: 171, text: "I am more likely to desire sex when I feel emotionally respected in the relationship.", domain: "AEI", category: "compatibility", compatibilityDimension: "affection" },
  { id: "SRRCI_172", itemNumber: 172, text: "If my partner’s sexual style differs from mine, I can become curious rather than immediately critical.", domain: "ANO", category: "compatibility", compatibilityDimension: "novelty" },
  { id: "SRRCI_173", itemNumber: 173, text: "I can recognize when sexual conflict is really about loneliness, control, rejection, or fear.", domain: "ERTS", category: "clinical" },
  { id: "SRRCI_174", itemNumber: 174, text: "My partner and I are likely to repair sexual misunderstandings when both of us feel emotionally safe.", domain: "RRS", category: "compatibility", compatibilityDimension: "resilience" },
  { id: "SRRCI_175", itemNumber: 175, text: "I can discuss sexual dissatisfaction without threatening the relationship or withdrawing affection.", domain: "SCC", category: "compatibility", compatibilityDimension: "communication" },
  { id: "SRRCI_176", itemNumber: 176, text: "A partner’s sexual needs can feel like demands even when they are expressed respectfully.", domain: "BEA", category: "compatibility", reverseScored: true, compatibilityDimension: "boundaries" },

  // =====================================================
  // VALIDITY & RESPONSE INTEGRITY
  // =====================================================

  // Faking Good / Virtue Presentation — FG
  { id: "SRRCI_177", itemNumber: 177, text: "I have never hidden anything sexual from anyone.", domain: "FG", category: "validity" },
  { id: "SRRCI_178", itemNumber: 178, text: "I have always exercised perfect control over every sexual impulse.", domain: "FG", category: "validity" },
  { id: "SRRCI_179", itemNumber: 179, text: "I have never had a sexual thought that conflicted with my values.", domain: "FG", category: "validity" },
  { id: "SRRCI_180", itemNumber: 180, text: "I have never regretted any sexual decision.", domain: "FG", category: "validity" },
  { id: "SRRCI_181", itemNumber: 181, text: "I am completely honest about all sexual matters at all times.", domain: "FG", category: "validity" },
  { id: "SRRCI_182", itemNumber: 182, text: "I have never felt sexually tempted in a situation where temptation would be inappropriate.", domain: "FG", category: "validity" },
  { id: "SRRCI_183", itemNumber: 183, text: "No one has ever misunderstood, questioned, or disagreed with my sexual boundaries or choices.", domain: "FG", category: "validity" },
  { id: "SRRCI_184", itemNumber: 184, text: "Every sexual conversation I have ever had has been perfectly mature and respectful.", domain: "FG", category: "validity" },

  // Faking Bad / Exaggeration — FB
  { id: "SRRCI_185", itemNumber: 185, text: "Sexual urges control every part of my life.", domain: "FB", category: "validity" },
  { id: "SRRCI_186", itemNumber: 186, text: "I am incapable of resisting any sexual impulse whatsoever.", domain: "FB", category: "validity" },
  { id: "SRRCI_187", itemNumber: 187, text: "Every sexual decision I make becomes destructive.", domain: "FB", category: "validity" },
  { id: "SRRCI_188", itemNumber: 188, text: "I feel consumed by sexuality every waking hour.", domain: "FB", category: "validity" },
  { id: "SRRCI_189", itemNumber: 189, text: "My sexual behavior has destroyed nearly everything important in my life.", domain: "FB", category: "validity" },
  { id: "SRRCI_190", itemNumber: 190, text: "I completely lose all self-control whenever sexual thoughts occur.", domain: "FB", category: "validity" },
  { id: "SRRCI_191", itemNumber: 191, text: "There is no situation in which I can make a wise sexual decision.", domain: "FB", category: "validity" },
  { id: "SRRCI_192", itemNumber: 192, text: "Sexual issues make it impossible for me to function in any relationship.", domain: "FB", category: "validity" },

  // Contradiction / Inconsistency — CI
  { id: "SRRCI_193", itemNumber: 193, text: "I rarely think about sex unexpectedly.", domain: "CI", category: "validity", reverseScored: true, validityPairId: "CI_PAIR_001" },
  { id: "SRRCI_194", itemNumber: 194, text: "Sexual thoughts frequently interrupt my concentration.", domain: "CI", category: "validity", validityPairId: "CI_PAIR_001" },

  { id: "SRRCI_195", itemNumber: 195, text: "I strongly value emotional closeness in sexual relationships.", domain: "CI", category: "validity", validityPairId: "CI_PAIR_002" },
  { id: "SRRCI_196", itemNumber: 196, text: "Emotional closeness is not important to me in sexual relationships.", domain: "CI", category: "validity", reverseScored: true, validityPairId: "CI_PAIR_002" },

  { id: "SRRCI_197", itemNumber: 197, text: "I can discuss sexual needs with a partner when necessary.", domain: "CI", category: "validity", validityPairId: "CI_PAIR_003" },
  { id: "SRRCI_198", itemNumber: 198, text: "I avoid all conversations about sexual needs no matter how important they are.", domain: "CI", category: "validity", reverseScored: true, validityPairId: "CI_PAIR_003" },

  { id: "SRRCI_199", itemNumber: 199, text: "I can respect sexual boundaries even when disappointed.", domain: "CI", category: "validity", validityPairId: "CI_PAIR_004" },
  { id: "SRRCI_200", itemNumber: 200, text: "When sexually disappointed, I cannot respect boundaries.", domain: "CI", category: "validity", reverseScored: true, validityPairId: "CI_PAIR_004" },
];

function shuffleItems(items: SRRCIItem[]): SRRCIItem[] {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = shuffled[i];
    const replacement = shuffled[j];

    if (current && replacement) {
      shuffled[i] = replacement;
      shuffled[j] = current;
    }
  }

  return shuffled;
}

function hasPairSpacingViolation(
  items: SRRCIItem[],
  minimumDistance: number,
): boolean {
  const pairPositions = new Map<string, number[]>();

  items.forEach((item, index) => {
    if (!item.validityPairId) return;

    const existing = pairPositions.get(item.validityPairId) ?? [];
    pairPositions.set(item.validityPairId, [...existing, index]);
  });

  for (const positions of pairPositions.values()) {
    if (positions.length < 2) continue;

    const sorted = [...positions].sort((a, b) => a - b);

    for (let i = 1; i < sorted.length; i += 1) {
      if (Math.abs(sorted[i] - sorted[i - 1]) < minimumDistance) {
        return true;
      }
    }
  }

  return false;
}

function hasDomainClumpingViolation(
  items: SRRCIItem[],
  maxSequentialSameDomain: number,
): boolean {
  let streak = 1;

  for (let i = 1; i < items.length; i += 1) {
    if (items[i].domain === items[i - 1].domain) {
      streak += 1;

      if (streak > maxSequentialSameDomain) {
        return true;
      }
    } else {
      streak = 1;
    }
  }

  return false;
}

export function getRandomizedSRRCIItems(): SRRCIItem[] {
  const minimumPairDistance = 24;
  const maxSequentialSameDomain = 2;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = shuffleItems(srrciItems);

    const hasSpacingProblem = hasPairSpacingViolation(
      candidate,
      minimumPairDistance,
    );

    const hasClumpingProblem = hasDomainClumpingViolation(
      candidate,
      maxSequentialSameDomain,
    );

    if (!hasSpacingProblem && !hasClumpingProblem) {
      return candidate;
    }
  }

  return shuffleItems(srrciItems);
}
