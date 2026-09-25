import Link from "next/link";
import { notFound } from "next/navigation";

const specialties = {
  "substance-use-recovery": {
    title: "Substance Use & Recovery",
    eyebrow: "Recovery support",
    intro: "Substance use rarely exists in a vacuum. It can become intertwined with stress, trauma, anxiety, depression, relationships, work, identity, sleep, physical health, and the ways a person has learned to cope. Good treatment looks beyond the substance itself to understand the full pattern—and to build a recovery plan that can hold up in real life.",
    sections: [
      ["When it is time to take a closer look", [
        "Alcohol, cannabis, prescription medication, or other substance use is beginning to interfere with relationships, work, health, finances, judgment, or peace of mind.",
        "Attempts to cut back have not lasted, or use repeatedly returns during periods of stress, conflict, loneliness, pain, or emotional overload.",
        "A person may be functioning on the outside while privately feeling increasingly controlled by cravings, secrecy, shame, or the effort required to keep everything together.",
        "Family members may also be exhausted, uncertain about boundaries, or unsure how to help without becoming caught in the cycle."
      ]],
      ["A more complete clinical picture", [
        "We look at patterns of use, triggers, motivation, consequences, recovery history, relationships, stressors, strengths, and the environment surrounding change.",
        "Co-occurring concerns such as depression, anxiety, trauma, ADHD, grief, chronic stress, and relationship difficulties deserve attention at the same time rather than being treated as unrelated side issues.",
        "The goal is to understand what the substance has been doing for the person as well as what it has been costing them."
      ]],
      ["Treatment built for sustainable change", [
        "Counseling may focus on motivation, relapse prevention, coping skills, emotional regulation, decision-making, recovery routines, boundaries, accountability, and rebuilding trust.",
        "Goals are individualized. For some people that means abstinence; for others it may begin with reducing harm, clarifying readiness, or strengthening an existing recovery plan.",
        "When appropriate, therapy can work alongside medical care, medication-assisted treatment, peer recovery communities, or higher levels of substance-use treatment."
      ]],
      ["Recovery also changes relationships", [
        "Substance use affects families and partnerships, and recovery often asks everyone involved to learn new ways of communicating and responding.",
        "Family or couples work can help clarify boundaries, reduce enabling patterns, rebuild trust, and create a healthier support system without assigning blame.",
        "Progress is not measured only by whether someone used a substance. It can also include increased honesty, better coping, improved relationships, more reliable decision-making, and a life that feels worth protecting."
      ]]
    ],
    closing: "You do not have to wait for a crisis to take substance use seriously. A thoughtful assessment and an honest conversation can be a strong first step."
  },
  "trauma-therapy": {
    title: "Trauma Therapy",
    eyebrow: "Trauma-informed care",
    intro: "Trauma can change the way a person experiences safety, relationships, memory, emotion, and even their own body. Sometimes the effects are obvious; sometimes they appear years later as anxiety, anger, numbness, avoidance, sleep disruption, substance use, relationship problems, or a persistent sense that the nervous system never fully stands down.",
    sections: [
      ["Trauma does not always look like trauma", [
        "People may experience intrusive memories, nightmares, hypervigilance, startle responses, avoidance, emotional shutdown, dissociation, irritability, guilt, shame, or difficulty trusting others.",
        "Other people primarily notice depression, panic, chronic tension, relationship conflict, concentration problems, or using work, substances, food, screens, or constant activity to stay away from painful internal experiences.",
        "Trauma responses can follow violence, abuse, accidents, medical events, loss, childhood experiences, disasters, betrayal, repeated exposure to danger, or other overwhelming events."
      ]],
      ["Safety and stability come first", [
        "Effective trauma therapy is not simply telling the story over and over. The first work may involve helping the nervous system become more regulated and increasing a person's sense of choice and control.",
        "Treatment should move at a pace that is clinically appropriate and collaborative. A person should understand why an intervention is being used and have a meaningful voice in the process.",
        "Grounding, emotional regulation, sleep, boundaries, coping, and relationship safety may all be part of preparation for deeper trauma processing."
      ]],
      ["Evidence-informed treatment, individualized to the person", [
        "Depending on the individual, therapy may draw from cognitive-behavioral, exposure-based, acceptance-based, mindfulness, skills-focused, or other trauma-informed approaches.",
        "Treatment also considers co-occurring depression, anxiety, substance use, grief, chronic pain, ADHD, or relationship difficulties rather than treating trauma in isolation.",
        "The right approach depends on the person's history, current stability, goals, readiness, support system, and response to treatment."
      ]],
      ["The goal is a larger life—not a smaller memory", [
        "Trauma therapy is not about erasing what happened. It is about reducing the degree to which the past dictates present-day choices, relationships, emotions, and identity.",
        "Progress can mean sleeping more consistently, tolerating reminders with less distress, reconnecting with people, setting healthier boundaries, feeling present in one's body, and reclaiming activities that once felt unsafe or impossible.",
        "For many people, healing also includes replacing shame and self-blame with a more accurate understanding of what their mind and body did to survive."
      ]]
    ],
    closing: "Trauma treatment should be careful, respectful, and purposeful. The work is not to force disclosure—it is to help restore safety, flexibility, and ownership of your life."
  },
  "marriage-family-therapy": {
    title: "Marriage & Family Therapy",
    eyebrow: "Relationships and families",
    intro: "Most relationship problems are not caused by one conversation or one person. They are maintained by patterns: how partners pursue and withdraw, how families manage conflict, how trust is repaired—or not repaired—and how stress, parenting, mental health, substance use, work, extended family, and life transitions reshape the system over time.",
    sections: [
      ["When good people get stuck in bad patterns", [
        "Couples may love each other and still repeat the same argument, misunderstand each other's intentions, withdraw, become defensive, or stop feeling emotionally safe.",
        "Families may become organized around one person's symptoms, conflict, substance use, behavior, or crisis until everyone feels reactive and exhausted.",
        "Parenting differences, blended-family concerns, infidelity, grief, caregiving, finances, intimacy, major transitions, and changing roles can expose vulnerabilities that were easier to manage before."
      ]],
      ["We work with the pattern, not just the argument", [
        "Therapy looks beyond the latest conflict to identify the cycle underneath it: what each person fears, protects, assumes, avoids, and needs.",
        "The purpose is not to decide who is the villain or who is 'right.' It is to make the system visible enough that people can respond differently.",
        "That may include slowing conflict down, improving listening, setting boundaries, making clearer requests, repairing ruptures, and learning how to disagree without damaging the relationship."
      ]],
      ["Couples and families are affected by individual mental health", [
        "Depression, anxiety, ADHD, autism, trauma, substance use, chronic illness, and stress can all alter communication, expectations, emotional availability, and household roles.",
        "A systemic approach helps family members understand the interaction between individual symptoms and relationship patterns without reducing the person to a diagnosis.",
        "When appropriate, work may include couples sessions, family sessions, parent-focused sessions, individual support, or coordination with other treating professionals."
      ]],
      ["What stronger relationships can look like", [
        "Progress is often practical before it is dramatic: fewer escalations, faster repair, clearer boundaries, more reliable follow-through, greater emotional safety, and a better ability to talk about difficult subjects.",
        "Healthy relationships are not conflict-free. They are relationships in which conflict can be understood, managed, and repaired.",
        "The larger goal is to help people build a relationship or family culture that is more honest, flexible, respectful, and resilient."
      ]]
    ],
    closing: "You do not have to wait until a relationship is on the edge of ending. Therapy can be useful whenever the current way of relating is no longer producing the kind of relationship or family life you want."
  },
  "mood-disorders": {
    title: "Mood Disorders",
    eyebrow: "Mood and emotional health",
    intro: "Mood disorders can change the way a person thinks, sleeps, works, relates, makes decisions, and experiences hope. Depression may look like sadness, but it can also look like irritability, exhaustion, withdrawal, numbness, poor concentration, or simply going through the motions. Other mood patterns may involve periods of significant activation, impulsivity, or instability that require careful assessment.",
    sections: [
      ["More than 'feeling down'", [
        "Depression can affect motivation, pleasure, energy, sleep, appetite, concentration, confidence, relationships, and the ability to complete ordinary tasks.",
        "Some people remain highly functional while privately carrying persistent hopelessness, self-criticism, emotional exhaustion, or a sense that life has become mechanical.",
        "Mood concerns may also overlap with anxiety, trauma, ADHD, substance use, grief, relationship stress, medical conditions, or significant life changes."
      ]],
      ["Assessment matters because mood symptoms can have different causes", [
        "Good treatment begins by understanding the pattern: when symptoms started, how long they last, what makes them better or worse, how sleep and energy change, and how functioning is affected.",
        "A careful history can help distinguish among different mood presentations and identify whether medical evaluation, medication consultation, or coordination with another provider may be useful.",
        "Treatment should fit the person's actual presentation rather than assuming every episode of low mood should be approached the same way."
      ]],
      ["Therapy focuses on both relief and function", [
        "Work may include cognitive and behavioral strategies, emotional regulation, problem-solving, behavioral activation, stress management, interpersonal work, mindfulness, and rebuilding routines that support sleep, movement, connection, and meaningful activity.",
        "Therapy can also address the beliefs and relationship patterns that reinforce hopelessness, avoidance, shame, perfectionism, or chronic self-criticism.",
        "When medication is part of care, psychotherapy can complement it by helping the person translate symptom improvement into durable changes in daily life."
      ]],
      ["Progress is measured in life, not just symptoms", [
        "Improvement may mean getting out of bed with less effort, reconnecting with people, functioning more consistently at work, sleeping more predictably, making decisions with greater confidence, or once again being able to experience interest and pleasure.",
        "The goal is not to demand positivity. It is to increase flexibility, functioning, connection, and the ability to respond effectively when mood begins to shift."
      ]]
    ],
    closing: "Mood problems can narrow a person's world gradually. Treatment is about helping that world open back up—with careful assessment, practical tools, and a plan that fits the individual."
  },
  "autism": {
    title: "Autism",
    eyebrow: "Neurodiversity-informed support",
    intro: "Autistic people are not a single clinical type. Strengths, sensory profiles, communication styles, support needs, interests, relationships, and daily challenges vary enormously. Good counseling starts with that individuality and focuses on quality of life—not on teaching someone to hide who they are.",
    sections: [
      ["Why autistic people may seek therapy", [
        "An autistic person may come to counseling for anxiety, depression, burnout, trauma, grief, relationships, identity, workplace or school stress, emotional regulation, loneliness, or major life transitions.",
        "Sensory overload, social demands, uncertainty, executive-function challenges, masking, and repeated misunderstanding by others can create chronic stress even when the person appears to be coping well externally.",
        "Co-occurring ADHD, sleep problems, learning differences, substance use, or other mental health concerns may also shape treatment."
      ]],
      ["A strengths-based and affirming approach", [
        "The goal is not to eliminate autistic traits or train someone to appear neurotypical.",
        "Therapy can help a person understand their own nervous system, identify needs, advocate more effectively, build sustainable routines, strengthen relationships, and reduce the cost of constant masking or overextension.",
        "Interventions should be adapted to the person's communication style, sensory needs, pace of processing, and preferences rather than expecting the person to adapt to a rigid therapy format."
      ]],
      ["Support can include the family system", [
        "Parents, partners, and family members may benefit from learning how autism affects communication, emotional regulation, transitions, expectations, and the experience of stress.",
        "Family work can reduce misinterpretation, clarify support versus overcontrol, improve problem-solving, and create environments that are both respectful and workable.",
        "For children and adolescents, collaboration with schools or other professionals may be useful when educational or developmental needs are part of the picture."
      ]],
      ["What meaningful progress can look like", [
        "Progress may involve less burnout, better recognition of sensory or emotional limits, clearer communication, healthier boundaries, improved self-advocacy, greater self-understanding, and relationships that require less pretending.",
        "For some people, success means developing new skills. For others, it means changing the environment so existing strengths can function more effectively.",
        "The standard should be a more sustainable and authentic life—not simply greater conformity."
      ]]
    ],
    closing: "Autism-informed care should make room for the whole person: strengths, needs, preferences, relationships, identity, and the environments in which everyday life actually happens."
  },
  "adhd": {
    title: "ADHD",
    eyebrow: "Attention and executive functioning",
    intro: "ADHD is often described as a problem with attention, but many people experience it more broadly—as difficulty regulating attention, activation, time, impulses, emotion, working memory, and follow-through. The result can be a frustrating gap between knowing what to do and being able to do it consistently.",
    sections: [
      ["ADHD can affect far more than productivity", [
        "People may struggle with starting tasks, estimating time, shifting attention, remembering details, organizing responsibilities, finishing projects, controlling impulses, or maintaining routines.",
        "Repeated missed deadlines, forgotten commitments, clutter, financial mistakes, relationship conflict, or inconsistent performance can gradually damage confidence.",
        "Emotional reactivity, rejection sensitivity, chronic overwhelm, sleep disruption, anxiety, depression, and shame may become as important clinically as the attention symptoms themselves."
      ]],
      ["Understanding the pattern changes the intervention", [
        "Therapy looks at when executive-function problems appear, what environments make them worse, which strategies have failed, and what strengths or external supports are already working.",
        "ADHD may coexist with anxiety, depression, trauma, autism, learning differences, substance use, or relationship problems, and those interactions can change what treatment needs to emphasize.",
        "For some people, medication evaluation is useful; for others, behavioral and environmental changes are central. Many benefit from a combination."
      ]],
      ["Practical therapy for real-world functioning", [
        "Counseling may focus on task initiation, planning, time awareness, organization, emotional regulation, impulse control, communication, accountability, and designing systems that reduce dependence on memory and willpower.",
        "The most useful strategies are usually specific and external: better cues, smaller steps, clearer routines, fewer points of friction, and environments designed around how the person's brain actually works.",
        "Therapy can also address the accumulated self-criticism that develops when a person has spent years being told they are lazy, careless, unmotivated, or simply not trying hard enough."
      ]],
      ["The goal is consistency without losing individuality", [
        "Successful ADHD treatment is not about turning a creative, energetic, spontaneous person into someone else.",
        "It is about improving control over where attention and effort go, reducing preventable consequences, strengthening relationships, and building a life that depends less on crisis, adrenaline, or last-minute rescue.",
        "Progress often looks like increased reliability, less overwhelm, better recovery after disruptions, and greater confidence in one's ability to manage everyday demands."
      ]]
    ],
    closing: "ADHD treatment should move beyond generic advice. The work is to understand the individual pattern and build practical systems that are realistic enough to survive ordinary life."
  }
} as const;

export function generateStaticParams() {
  return Object.keys(specialties).map((slug) => ({ slug }));
}

export default async function SpecialtyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const specialty = specialties[slug as keyof typeof specialties];

  if (!specialty) notFound();

  return (
    <div className="icp-shell">
      <header className="icp-top-menu">
        <div className="icp-top-menu-left">
          <Link className="icp-brand" href="/">
            <span className="icp-brand-mark">IC</span>
            <span className="icp-brand-copy"><strong>Indian Creek</strong><small>Psychological Services</small></span>
          </Link>
        </div>
        <div className="icp-top-menu-right">
          <span className="icp-top-tagline">{specialty.title}</span>
        </div>
      </header>

      <main className="icp-shell-center specialtyPage">
        <section className="specialtyHero">
          <p className="eyebrow">{specialty.eyebrow}</p>
          <h1>{specialty.title}</h1>
          <p>{specialty.intro}</p>
          <div className="heroActions">
            <Link className="primaryButton" href="/#contact">Start a conversation</Link>
            <Link className="secondaryButton" href="/#services">Explore other specialties</Link>
          </div>
        </section>

        <section className="specialtyContent">
          {specialty.sections.map(([heading, items]) => (
            <article className="specialtySection" key={heading}>
              <h2>{heading}</h2>
              <ul>
                {items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          ))}

          <aside className="specialtyPremiumNote">
            <p className="eyebrow">Individualized care</p>
            <h2>Clinical depth without losing the human being.</h2>
            <p>{specialty.closing}</p>
          </aside>

          <aside className="specialtyNote">
            <strong>Educational information, not a diagnosis.</strong>
            <p>
              The information on this page is intended to help you understand common concerns and
              treatment considerations. Individual recommendations require a clinical evaluation
              that considers your history, symptoms, goals, strengths, risks, and circumstances.
            </p>
          </aside>
        </section>
      </main>

      <nav className="icp-bottom-menu" aria-label="Specialty navigation">
        <Link href="/">Home</Link>
        <Link href="/#services">Services</Link>
        <Link href="/#contact">Contact</Link>
        <Link href="/login">Login</Link>
        <Link href="/register">Register</Link>
      </nav>
    </div>
  );
}
