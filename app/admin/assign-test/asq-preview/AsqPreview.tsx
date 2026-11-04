'use client';
import Link from 'next/link';
import SevenQuestionForm from '@/app/components/asq/SevenQuestionForm';
import {asqDefinition,asqRoleLabels,type AsqRole} from '@/lib/clinical-tests/asq-forms';
export default function AsqPreview({role='student'}:{role?:AsqRole}){return <main className="asqRecipient"><header className="asqRecipientHeader"><Link href="/admin/assign-test?test=asq">Return to assignment administration</Link><h1>ASQ / ASEQ — {asqRoleLabels[role]} preview</h1><p>This preview shows only the version selected in assignment administration. Recipients receive only their assigned version.</p><p>Fictional preview only. No invitation is sent and no patient response is recorded. To collect responses, send the recipient their individual assignment invitation.</p></header><SevenQuestionForm key={role} definition={asqDefinition(role)} preview onSave={async()=>{}}/></main>;}
