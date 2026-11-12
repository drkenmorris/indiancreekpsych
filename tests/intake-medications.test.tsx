import React,{useState} from 'react';import {afterEach,expect,test} from 'vitest';import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import IntakeMedications from '@/app/components/IntakeMedications';import {emptyMedication,validateMedications,validateMedicationAllergies} from '@/lib/patient/medications';import {intakeSections} from '@/lib/patient/intake';
afterEach(cleanup);function Harness(){const[value,setValue]=useState('');return <><IntakeMedications value={value} onChange={setValue}/><output data-testid="value">{value}</output></>;}
test('page 6 exclusively medications; general medical fields retained on page 7',()=>{expect(intakeSections[5].title).toBe('Medications');expect(intakeSections[5].fields.map(f=>f[0])).toEqual(['medication_entries','medication_allergy_status','medication_allergy_notes','medications_current']);expect(intakeSections[6].fields[0][2]).toBe('medical-substance');});
test('EMR fields, exclusive benefit checkboxes, current/end clearing and repeatability',()=>{render(<Harness/>);for(const label of ['Medication','Medication Status','Dosage','Frequency','Start Date','End Date','Prescribing Physician'])expect(screen.getByLabelText(label)).toBeTruthy();fireEvent.change(screen.getByLabelText('End Date'),{target:{value:'2020-01-01'}});fireEvent.change(screen.getByLabelText('Medication Status'),{target:{value:'Current'}});expect((screen.getByLabelText('End Date') as HTMLInputElement).disabled).toBe(true);expect((screen.getByLabelText('End Date') as HTMLInputElement).value).toBe('');fireEvent.click(screen.getByLabelText('Beneficial'));fireEvent.click(screen.getByLabelText('Not beneficial'));expect((screen.getByLabelText('Beneficial') as HTMLInputElement).checked).toBe(false);fireEvent.click(screen.getByLabelText('Not beneficial'));expect(JSON.parse(screen.getByTestId('value').textContent!)[0].benefit).toBe('');fireEvent.click(screen.getByRole('button',{name:'Add another medication'}));expect(screen.getAllByLabelText('Medication')).toHaveLength(2);});
test('read-only review renders text without edit controls',()=>{render(<IntakeMedications value={JSON.stringify([{...emptyMedication(),medication:'Fictional medication',status:'Current',benefit:'Beneficial'}])} readOnly/>);expect(screen.getByText('Fictional medication')).toBeTruthy();expect(screen.queryByRole('button')).toBeNull();});
test('validation accepts blank drafts and rejects contradictory allergy/date/benefit data',()=>{expect(validateMedications('',true)).toBeNull();expect(validateMedications(JSON.stringify([{...emptyMedication(),dosage:'Draft'}]),true)).toContain('name');expect(validateMedications(JSON.stringify([{...emptyMedication(),benefit:'Both'}]),false)).toBeTruthy();expect(validateMedicationAllergies('Medication allergies reported','')).toBeTruthy();expect(validateMedicationAllergies('No known medication allergies','Rash')).toBeTruthy();});

test('brand search offers labeled strengths and preserves the patient-reported dose',async()=>{
 render(<Harness/>);
 fireEvent.change(screen.getByLabelText('Dosage'),{target:{value:'Half a tablet'}});
 fireEvent.change(screen.getByLabelText('Medication'),{target:{value:'Zoloft'}});
 const product=await screen.findByRole('option',{name:'sertraline 50 MG Oral Tablet [Zoloft]'});
 expect(screen.getByRole('option',{name:'sertraline 100 MG Oral Tablet [Zoloft]'})).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Available strengths and forms'),{target:{value:product.textContent}});
 const [saved]=JSON.parse(screen.getByTestId('value').textContent!);
 expect(saved.medication).toBe(product.textContent);
 expect(saved.dosage).toBe('Half a tablet');
 fireEvent.change(screen.getByLabelText('Medication'),{target:{value:'My unlisted supplement 250 mg'}});
 expect(screen.getByLabelText('Medication')).toHaveProperty('value','My unlisted supplement 250 mg');
 expect(screen.getByLabelText('Available strengths and forms')).toHaveProperty('disabled',true);
});
