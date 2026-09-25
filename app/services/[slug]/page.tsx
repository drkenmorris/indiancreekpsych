import Link from "next/link";
import { notFound } from "next/navigation";

const specialties = {
  "substance-use-recovery": {
    title: "Substance Use & Recovery",
    eyebrow: "Recovery support",
    intro: "Substance use can affect health, relationships, work, decision-making, and a person's sense of control. Counseling can provide a structured place to understand patterns, strengthen recovery supports, and work toward sustainable change.",
    sections: [
      ["What counseling may address", ["Alcohol or drug use that is creating problems", "Relapse patterns and recovery planning", "Triggers, cravings, and high-risk situations", "Relationships affected by substance use", "Shame, guilt, grief, and identity in recovery", "Building routines and supports that strengthen long-term change"]],
      ["A practical, individualized approach", ["Treatment is shaped around the person rather than a single label.", "Goals may include reducing harm, establishing or maintaining abstinence, rebuilding relationships, improving coping, or strengthening an existing recovery plan.", "When appropriate, counseling can complement medical care, peer recovery support, or other treatment services."]],
    ],
  },
  "trauma-therapy": {
    title: "Trauma Therapy",
    eyebrow: "Trauma-informed care",
    intro: "Difficult or overwhelming experiences can continue to affect the nervous system, relationships, mood, sleep, concentration, and sense of safety long after an event has ended. Trauma therapy is paced to the individual and focused on building stability as well as understanding what happened.",
    sections: [
      ["Common reasons people seek trauma-focused counseling", ["Distressing memories or reminders", "Avoidance, hypervigilance, or feeling constantly on guard", "Emotional numbness or disconnection", "Sleep problems and recurring distress", "Relationship difficulties after traumatic experiences", "Trauma connected with loss, violence, accidents, abuse, or other overwhelming events"]],
      ["How the work may unfold", ["Therapy may begin with stabilization, coping skills, and understanding trauma responses.", "The pace should be collaborative rather than forcing disclosure before a person is ready.", "The larger goal is not simply to revisit the past, but to reduce its control over present-day life."]],
    ],
  },
  "marriage-family-therapy": {
    title: "Marriage & Family Therapy",
    eyebrow: "Relationships and families",
    intro: "Relationships are systems: when communication, trust, boundaries, roles, or expectations become strained, the effects often spread through the entire household. Marriage and family therapy focuses on patterns between people as well as the concerns each person brings individually.",
    sections: [
      ["Issues counseling may address", ["Communication breakdown", "Recurring conflict", "Trust and relationship repair", "Parenting and co-parenting challenges", "Changing family roles and life transitions", "Boundaries with extended family", "Stress related to mental health, substance use, or neurodivergence within the family"]],
      ["A collaborative process", ["The aim is not to assign blame, but to identify patterns that keep the relationship stuck.", "Sessions may focus on clearer communication, healthier conflict, practical agreements, emotional understanding, and rebuilding connection.", "Depending on the situation, work may involve couples, parents, family members, or a combination of individual and joint sessions."]],
    ],
  },
  "mood-disorders": {
    title: "Mood Disorders",
    eyebrow: "Mood and emotional health",
    intro: "Changes in mood can affect motivation, sleep, concentration, relationships, work, and the ability to enjoy daily life. Counseling can help people understand these patterns, build coping strategies, and make practical changes that support greater stability.",
    sections: [
      ["Concerns that may bring someone to counseling", ["Persistent sadness or loss of interest", "Anxiety and chronic worry", "Irritability or emotional reactivity", "Low motivation or difficulty functioning", "Sleep or energy disruption", "Difficulty managing stress", "Periods of significant mood change that affect relationships or daily responsibilities"]],
      ["What therapy can focus on", ["Recognizing patterns in thoughts, behavior, relationships, and routines", "Strengthening coping and emotional regulation", "Improving communication and support systems", "Identifying practical changes that make daily life more manageable", "Coordinating with medical providers when medication evaluation or other medical care is appropriate"]],
    ],
  },
  "autism": {
    title: "Autism",
    eyebrow: "Neurodiversity-informed support",
    intro: "Autistic people may seek counseling for many of the same reasons as anyone else, while also navigating communication differences, sensory experiences, social expectations, identity, relationships, and environments that are not always designed with neurodivergent people in mind.",
    sections: [
      ["Areas counseling may support", ["Stress and emotional regulation", "Relationships and communication", "Autistic identity and self-understanding", "Sensory and environmental stress", "Burnout and overwhelm", "Life transitions, work, school, and family concerns", "Co-occurring anxiety, depression, ADHD, or other concerns"]],
      ["Respectful care", ["The goal is not to erase autistic traits or force a person to appear neurotypical.", "Counseling can focus on quality of life, self-advocacy, communication, coping, relationships, and practical supports.", "For families, therapy can also help build understanding and more effective ways of supporting one another."]],
    ],
  },
  "adhd": {
    title: "ADHD",
    eyebrow: "Attention and executive functioning",
    intro: "ADHD can affect attention, organization, time management, impulse control, emotional regulation, relationships, and follow-through. Counseling can help translate an understanding of ADHD into practical strategies that fit real daily life.",
    sections: [
      ["Common areas of difficulty", ["Starting or finishing tasks", "Organization and time management", "Forgetfulness and inconsistent follow-through", "Impulsivity", "Emotional reactivity", "Relationship strain", "Shame or frustration after years of struggling with expectations"]],
      ["What counseling may help with", ["Developing realistic systems and routines", "Breaking large tasks into workable steps", "Improving emotional regulation and communication", "Understanding patterns that create repeated problems", "Reducing self-defeating cycles and strengthening self-advocacy", "Coordinating with medical providers when medication evaluation is part of the treatment plan"]],
    ],
  },
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
            <Link className="primaryButton" href="/#contact">Request information</Link>
            <Link className="secondaryButton" href="/#services">View all services</Link>
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

          <aside className="specialtyNote">
            <strong>Individualized care matters.</strong>
            <p>
              Information on this page is educational and does not provide a diagnosis or replace an
              individualized clinical evaluation. Counseling recommendations depend on each person&apos;s
              needs, history, goals, and circumstances.
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
