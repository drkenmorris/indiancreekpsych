"use client";
import CogSwitchHome from "@/lib/clinical-tests/legacy/src/features/cogswitch/views/CogSwitchHome";
import CogSwitchAssessment from "@/lib/clinical-tests/legacy/src/features/cogswitch/views/CogSwitchAssessment";
import CogSwitchBriefing from "@/lib/clinical-tests/legacy/src/features/cogswitch/views/CogSwitchBriefing";
import CogSwitchTraining from "@/lib/clinical-tests/legacy/src/features/cogswitch/views/CogSwitchTraining";
import CogSwitchResults from "@/lib/clinical-tests/legacy/src/features/cogswitch/views/CogSwitchResults";
import CogSwitchReports from "@/lib/clinical-tests/legacy/src/features/cogswitch/views/CogSwitchReports";
import CogSwitchSettings from "@/lib/clinical-tests/legacy/src/features/cogswitch/views/CogSwitchSettings";
export default function CogSwitchWorkspace({view}:{view:string}){
 switch(view){
  case "assessment":return <CogSwitchAssessment/>;
  case "briefing":return <CogSwitchBriefing/>;
  case "training":return <CogSwitchTraining/>;
  case "results":return <CogSwitchResults/>;
  case "reports":return <CogSwitchReports/>;
  case "settings":return <CogSwitchSettings/>;
  default:return <CogSwitchHome/>;
 }
}
