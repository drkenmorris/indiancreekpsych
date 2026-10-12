// src/selfesteem/selfEsteemItemBank.ts

export type LikertValue = 0 | 1 | 2 | 3;

export type LikertItem = {
  id: number; // 1..138
  text: string;
};

export type ForcedChoiceItem = {
  id: string; // "FC-1" .. "FC-10"
  a: string;
  b: string;
};

export const SELF_ESTEEM_LIKERT_ITEMS: LikertItem[] = [
  { id: 1, text: "Even on my worst days, I believe I still matter as a person." },
  { id: 2, text: "I don’t need to earn the right to exist or take up space." },
  { id: 3, text: "My value feels stable even when others are disappointed in me." },
  { id: 4, text: "I can respect myself even when I’ve made mistakes." },
  { id: 5, text: "When I’m not productive, I still feel like I have worth." },
  { id: 6, text: "I believe I deserve basic kindness from myself." },
  { id: 7, text: "My worth does not depend on being impressive." },
  { id: 8, text: "If I were no longer “useful,” I believe I would still be worthy of love." },

  { id: 9, text: "I can admit flaws without attacking myself." },
  { id: 10, text: "I can look at my past choices without feeling permanent shame." },
  { id: 11, text: "I treat myself the way I would treat someone I care about." },
  { id: 12, text: "I can hold two truths: “I messed up” and “I’m still okay.”" },
  { id: 13, text: "When I fall short, I can recover without spiraling." },
  { id: 14, text: "I allow myself to be a work in progress." },
  { id: 15, text: "I can accept compliments without immediately rejecting them." },
  { id: 16, text: "I can name my strengths without feeling arrogant." },

  { id: 17, text: "I trust myself to learn what I don’t yet know." },
  { id: 18, text: "I usually believe I can handle problems as they arise." },
  { id: 19, text: "I can make decisions without needing constant reassurance." },
  { id: 20, text: "I feel capable of navigating hard conversations." },
  { id: 21, text: "I can tolerate uncertainty without collapsing." },
  { id: 22, text: "I take on challenges even if I might not excel immediately." },
  { id: 23, text: "If I fail, I can try again without feeling humiliated." },
  { id: 24, text: "I generally trust my judgment." },

  { id: 25, text: "I can say “no” without feeling like a bad person." },
  { id: 26, text: "I don’t over-explain my boundaries to earn permission." },
  { id: 27, text: "I notice when someone repeatedly crosses my limits." },
  { id: 28, text: "I would rather disappoint someone than betray myself." },
  { id: 29, text: "I can ask for what I need without shame." },
  { id: 30, text: "I can end relationships that are consistently harmful." },
  { id: 31, text: "I don’t tolerate disrespect just to keep peace." },
  { id: 32, text: "I feel entitled to protect my time and energy." },

  { id: 33, text: "My choices influence my life more than my circumstances do." },
  { id: 34, text: "When something isn’t working, I can adjust my approach." },
  { id: 35, text: "I can take small steps even when motivation is low." },
  { id: 36, text: "I believe I can improve my situation with consistent effort." },
  { id: 37, text: "I feel responsible for my life without feeling blamed for everything." },
  { id: 38, text: "I can recover after setbacks and still take action." },
  { id: 39, text: "I don’t need to feel ready before I begin." },
  { id: 40, text: "When I feel stuck, I look for options rather than resignation." },

  { id: 41, text: "I can approve of myself even if others don’t." },
  { id: 42, text: "I don’t need praise to know I did something worthwhile." },
  { id: 43, text: "I can hold my ground when someone disagrees with me." },
  { id: 44, text: "My mood doesn’t depend heavily on others’ reactions to me." },
  { id: 45, text: "I can be misunderstood without panicking." },
  { id: 46, text: "I can tolerate someone being upset with me without fixing it immediately." },
  { id: 47, text: "I don’t change my values to keep people from leaving." },
  { id: 48, text: "I can enjoy my life without needing anyone to “witness” it." },

  { id: 49, text: "When I feel shame, I can move toward repair instead of hiding." },
  { id: 50, text: "I can apologize without feeling annihilated." },
  { id: 51, text: "I can separate “I did something wrong” from “I am wrong.”" },
  { id: 52, text: "I can receive feedback without feeling attacked." },
  { id: 53, text: "I can name what I’m feeling without needing to blame someone." },
  { id: 54, text: "When I feel exposed, I can still stay present." },
  { id: 55, text: "I can ask for forgiveness without demanding it." },
  { id: 56, text: "I can forgive myself after making amends." },

  { id: 57, text: "I can accept help without feeling weak or indebted." },
  { id: 58, text: "I can receive kindness without needing to repay it immediately." },
  { id: 59, text: "I can let others do things for me without losing dignity." },
  { id: 60, text: "I feel comfortable being cared for." },
  { id: 61, text: "I don’t have to be the “strong one” all the time." },
  { id: 62, text: "I can ask for support before I’m at a breaking point." },
  { id: 63, text: "I can share burdens without feeling like a burden." },
  { id: 64, text: "I believe I’m worth investing in." },

  { id: 65, text: "I can rest without feeling guilty." },
  { id: 66, text: "I believe joy is allowed, not only earned." },
  { id: 67, text: "I can enjoy accomplishments without quickly moving the goalpost." },
  { id: 68, text: "I believe my life has value beyond achievements." },
  { id: 69, text: "I can be content without needing to prove myself." },
  { id: 70, text: "I don’t have to suffer to be “good enough.”" },
  { id: 71, text: "I can enjoy simple pleasures without self-judgment." },
  { id: 72, text: "I treat self-care as responsible, not selfish." },

  { id: 73, text: "If I’m not meeting others’ needs, I feel like I’m failing as a person." },
  { id: 74, text: "I feel anxious when people are not pleased with me." },
  { id: 75, text: "I feel most valuable when someone relies on me." },
  { id: 76, text: "I often earn love by being useful rather than being known." },
  { id: 77, text: "When I say no, I expect people to reject me." },
  { id: 78, text: "I can’t relax unless I’m sure everyone is okay with me." },

  { id: 79, text: "If I can’t do something well, I’d rather not do it at all." },
  { id: 80, text: "Mistakes feel like evidence that I’m not good enough." },
  { id: 81, text: "I hide weaknesses because they feel unacceptable." },
  { id: 82, text: "I rarely feel satisfied with my performance." },
  { id: 83, text: "I replay failures in my mind long after they’re over." },
  { id: 84, text: "I feel like I must be exceptional to be valued." },

  { id: 85, text: "Other people’s success makes me question my own worth." },
  { id: 86, text: "I often feel behind in life no matter what I achieve." },
  { id: 87, text: "I frequently abandon my needs to keep others comfortable." },
  { id: 88, text: "I feel powerless to change important parts of my life." },
  { id: 89, text: "I accept situations that hurt me because I don’t think I deserve better." },
  { id: 90, text: "I struggle to describe who I am apart from my roles for others." },

  { id: 91, text: "I have never said something unkind about someone, even once." },
  { id: 92, text: "I always handle conflict perfectly." },
  { id: 93, text: "I never feel jealous or insecure." },
  { id: 94, text: "I have never avoided a responsibility in my life." },
  { id: 95, text: "I am calm and patient in every situation." },
  { id: 96, text: "I have never regretted anything I’ve done." },

  { id: 97, text: "Nothing I do ever works out, no matter what." },
  { id: 98, text: "I have no strengths at all." },
  { id: 99, text: "I am a complete failure as a person." },
  { id: 100, text: "I never feel happy—ever." },
  { id: 101, text: "Every relationship I’ve had has been a disaster because of me." },
  { id: 102, text: "My future is hopeless regardless of what I try." },

  { id: 103, text: "I have gone for years without sleeping at all." },
  { id: 104, text: "I can read other people’s minds." },
  { id: 105, text: "I have never needed food or water." },
  { id: 106, text: "I am able to be in two places at the same time." },
  { id: 107, text: "I have lived my entire life without making a single mistake." },
  { id: 108, text: "My thoughts are always identical from one day to the next." },

  { id: 109, text: "I answered these items honestly, even if some were uncomfortable." },
  { id: 110, text: "I held back from answering honestly to protect my image." },
  { id: 111, text: "I tried to present myself in the best possible light." },
  { id: 112, text: "I tried to emphasize how badly I feel." },
  { id: 113, text: "Some of my answers were guesses rather than true reflections." },
  { id: 114, text: "I was consistent and attentive throughout the questionnaire." },

  { id: 115, text: "When I violate my own values, I believe repair is possible." },
  { id: 116, text: "Guilt helps guide me; it does not define me." },
  { id: 117, text: "I can face my moral failures without losing respect for myself." },
  { id: 118, text: "I believe accountability and self-worth can coexist." },
  { id: 119, text: "I can make amends without feeling permanently stained." },
  { id: 120, text: "I believe people are more than their worst actions—including me." },

  { id: 121, text: "Physical limitations do not reduce my worth as a person." },
  { id: 122, text: "I treat my body with respect even when it disappoints me." },
  { id: 123, text: "Illness or injury does not make me feel defective." },
  { id: 124, text: "I can accept my body without needing it to perform perfectly." },
  { id: 125, text: "I believe my body deserves care, not punishment." },
  { id: 126, text: "Aging or physical change does not threaten my sense of value." },

  { id: 127, text: "My sense of worth remains intact during major life disruptions." },
  { id: 128, text: "Stress does not fundamentally change how I view myself." },
  { id: 129, text: "I recover my self-respect after emotional setbacks." },
  { id: 130, text: "My worth feels continuous, not fragile." },
  { id: 131, text: "Even prolonged difficulty does not erase my sense of value." },
  { id: 132, text: "My self-esteem does not depend on things going well." },

  { id: 133, text: "I can appreciate others’ success without feeling diminished." },
  { id: 134, text: "When others excel, I do not assume I am failing." },
  { id: 135, text: "I notice envy without needing to justify it." },
  { id: 136, text: "I do not feel morally superior to protect my self-worth." },
  { id: 137, text: "I rarely resent others for having what I want." },
  { id: 138, text: "Others’ advantages do not invalidate my own value." },
];

export const SELF_ESTEEM_FORCED_CHOICE: ForcedChoiceItem[] = [
  {
    id: "FC-1",
    a: "I feel valuable even when I am not contributing anything.",
    b: "I feel most like myself when I am being useful to others.",
  },
  {
    id: "FC-2",
    a: "My worth feels stable regardless of how others respond to me.",
    b: "My worth increases when others appreciate or rely on me.",
  },
  {
    id: "FC-3",
    a: "Being matters more to me than being effective.",
    b: "Being effective matters more to me than simply being.",
  },
  {
    id: "FC-4",
    a: "I would rather be authentic than universally liked.",
    b: "I would rather maintain harmony than risk rejection.",
  },
  {
    id: "FC-5",
    a: "I can tolerate disapproval if I know I acted in alignment with myself.",
    b: "I struggle when people are disappointed in me, even if I acted reasonably.",
  },
  {
    id: "FC-6",
    a: "Failure tells me what to adjust.",
    b: "Failure tells me something important about who I am.",
  },
  {
    id: "FC-7",
    a: "My identity remains intact when I fall short.",
    b: "My identity feels threatened when I fall short.",
  },
  {
    id: "FC-8",
    a: "Rest is a legitimate human need.",
    b: "Rest should be earned through productivity.",
  },
  {
    id: "FC-9",
    a: "Joy does not need justification.",
    b: "Joy feels best when it follows effort or sacrifice.",
  },
  {
    id: "FC-10",
    a: "Letting others help me strengthens connection.",
    b: "Letting others help me risks dependence or weakness.",
  },
];
