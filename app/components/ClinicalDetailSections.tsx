import type { ClinicalDetail } from "../content/clinical-detail";

export default function ClinicalDetailSections({ detail }: { detail: ClinicalDetail }) {
  return <>
    <section className="clinicalStory" aria-label="Understanding and treatment">
      <div className="clinicalStoryIntro"><p className="eyebrow">A clearer understanding</p><h2>Thoughtful care begins with understanding the whole picture.</h2><p>Every individual and family has a different history, set of strengths, and definition of progress. These details explain what a thoughtful clinical conversation may involve.</p></div>
      <div className="clinicalStoryGrid">
        <article><span>01 / Understand</span><h3>What you may notice</h3><p>{detail.recognize}</p></article>
        <article><span>02 / Plan</span><h3>How we approach care</h3><p>{detail.approach}</p></article>
        <article><span>03 / Practice</span><h3>What the work may look like</h3><p>{detail.experience}</p></article>
        <article><span>04 / Consider</span><h3>Important clinical considerations</h3><p>{detail.considerations}</p></article>
      </div>
    </section>
    <section className="clinicalQuestions"><p className="eyebrow">A place to begin</p><h2>Questions worth exploring together</h2><ul>{detail.questions.map(q=><li key={q}>{q}</li>)}</ul><p className="clinicalQuestionsFoot">You do not need to arrive with all the answers. These are starting points for a collaborative conversation.</p></section>
  </>;
}
