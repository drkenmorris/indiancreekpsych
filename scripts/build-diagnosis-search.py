"""Build the bounded reference index from locally downloaded official sources.
Usage: python scripts/build-diagnosis-search.py work
Requires beautifulsoup4 and pypdf. No patient data or APA full text is indexed.
"""
import hashlib,json,re,sys
from pathlib import Path
from bs4 import BeautifulSoup
from pypdf import PdfReader
root=Path(sys.argv[1])
nimh='https://www.nimh.nih.gov/health/publications/generalized-anxiety-disorder-gad'
icd='https://www.cms.gov/files/document/fy-2027-icd-10-cm-coding-guidelines.pdf'
apa='https://www.psychiatry.org/getmedia/b68a5776-f88c-45c7-9535-fd219d7aa5cb/APA-DSM5TR-Update-September-2025.pdf'
rows=[]
soup=BeautifulSoup((root/'nimh-gad.html').read_text(),'html.parser')
# Restrict extraction to the publication, excluding navigation, images, and footers.
for heading in soup.find_all('h2',id=re.compile('^part_')):
    if heading.get_text(' ',strip=True) in ['For more information','Reprints']: continue
    text=[]
    for sibling in heading.next_siblings:
        if getattr(sibling,'name',None)=='h2': break
        if getattr(sibling,'name',None) in ['p','ul','ol','h3']:
            text.append(sibling.get_text(' ',strip=True))
        elif getattr(sibling,'name',None) in ['html','body','div']:
            text.extend(node.get_text(' ',strip=True) for node in sibling.find_all(['p','ul','ol','h3']) if not node.find_parent(['ul','ol']))
    if text: rows.append(dict(id=heading['id'],source='nimh',title=heading.get_text(' ',strip=True),text='\n\n'.join(text),url=nimh+'#'+heading['id'],page=None,kind='text'))
assert len(rows)==9, f'Unexpected NIMH structure: {len(rows)} sections'
reader=PdfReader(root/'icd27-guidelines.pdf')
assert len(reader.pages)==121
for number,page in enumerate(reader.pages,1):
    text=page.extract_text()
    # Preserve the full page, including qualifications and running headers.
    text=re.sub(r'[ \t]+',' ',text).strip()
    rows.append(dict(id=f'icd-{number}',source='icd',title=f'FY 2027 ICD-10-CM guidelines — page {number}',text=text,url=icd+f'#page={number}',page=number,kind='text'))
# Independently authored navigation labels, not copied criteria or APA passages.
topics=[(6,'Multiple sclerosis coding changes'),(6,'Other specified bipolar disorder criteria changes'),(7,'Other specified depressive disorder criteria changes'),(7,'Other specified somatic symptom disorder criteria changes'),(8,'Other specified feeding and eating disorder criteria changes'),(8,'Other specified insomnia criteria changes'),(8,'Other specified delirium criteria changes'),(9,'Culture, racism and discrimination discussion changes'),(9,'Cyclothymic disorder differential diagnosis changes'),(10,'Substance use disorder severity and specifier changes'),(10,'Alcohol use disorder specifier changes'),(10,'Inhalant use disorder specifier changes'),(11,'Sedative, hypnotic and anxiolytic use disorder discussion changes'),(11,'Religious or spiritual problem discussion changes')]
for i,(page,title) in enumerate(topics): rows.append(dict(id=f'apa-{i}',source='apa',title=title,text='Topic link to the September 2025 APA update. Open the publisher PDF to read this material in context with DSM-5-TR.',url=apa+f'#page={page}',page=page,kind='topic'))
result=dict(checkedOn='2026-11-16',sources=[dict(id='nimh',title='NIMH: Generalized anxiety disorder',url=nimh,coverage='Publication text; images excluded. This is an educational overview, not the full DSM criteria.',attribution='Source: National Institute of Mental Health. Revised 2025. Public-domain publication text.'),dict(id='icd',title='CDC/CMS: FY 2027 coding guidelines',url=icd,coverage='Searchable text from all 121 pages. Effective October 1, 2026–September 30, 2027.',attribution='Source: CMS and CDC/NCHS, ICD-10-CM Official Guidelines for Coding and Reporting, FY 2027. Available free on the agency websites. Use does not imply endorsement by CDC, CMS, HHS, or the United States Government.'),dict(id='apa',title='APA: September 2025 DSM-5-TR update',url=apa,coverage='September 2025 topic links only; the full APA document and DSM manual are not searched or reproduced.',attribution='APA publication remains on the publisher website. Read the supplement together with DSM-5-TR.')],documents=rows,inputSha256={name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in ['nimh-gad.html','icd27-guidelines.pdf']})
assert all(row['text'].strip() for row in rows), 'Empty extracted reference entry'
Path('lib/emr/diagnosis-search-index.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(f'Built {len(rows)} entries: 9 NIMH sections, 121 guideline pages, 14 APA topic links')
