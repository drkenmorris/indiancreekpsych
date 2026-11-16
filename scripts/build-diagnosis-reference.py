"""Build non-PHI reference metadata from official CDC XML and a bounded literal-code audit.
Inputs stay outside the repository. Never imports manual criteria or patient data.
Usage: bundled-python scripts/build-diagnosis-reference.py work
"""
import hashlib,json,re,sys,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
work=Path(sys.argv[1]);root=Path(__file__).resolve().parents[1]
catalog=json.loads((root/'lib/emr/diagnosis-catalog.json').read_text());codes={r['code'] for r in catalog['rows']}
source=work/'icd27-tabular.zip'
z=zipfile.ZipFile(source);xml=ET.fromstring(z.read('icd10cm-table-and-index-2027/icd10cm-tabular_-2027.xml'))
scopes={};code_scopes={};titles={'codeFirst':'Code first','useAdditionalCode':'Use additional code','codeAlso':'Code also','excludes1':'Excludes1','excludes2':'Excludes2','sevenChrNote':'Seventh-character instruction','notes':'Coding note'}
def walk(node,inherited,scope):
 name=node.findtext('name') or node.get('id') or scope
 if node.tag=='section':name=node.get('id',scope)
 local=[]
 for kind,title in titles.items():
  for block in node.findall(kind):
   for entry in block.findall('note'):
    text=' '.join(''.join(entry.itertext()).split())
    local.append({'kind':kind,'title':title,'scope':('Chapter '+name if node.tag=='chapter' else name),'text':text})
 scope_id=node.tag+':'+name
 if local:scopes[scope_id]=local
 current=inherited+([scope_id] if local else [])
 code=node.findtext('name')
 if node.tag=='diag' and code in codes and current:code_scopes[code]=current
 for child in node:
  if child.tag in ('chapter','section','diag'):walk(child,current,name)
walk(xml,[],'ICD-10-CM')
used={key for chain in code_scopes.values() for key in chain}
scopes={key:entries for key,entries in scopes.items() if key in used}
output={'version':'ICD-10-CM FY2027','source':'https://ftp.cdc.gov/pub/health_statistics/nchs/Publications/ICD10CM/2027/icd10cm-table-and-index-2027.zip','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'scopes':scopes,'codeScopes':code_scopes}
(root/'lib/emr/diagnosis-coding-notes.json').write_text(json.dumps(output,indent=2)+'\n')
# Only classification pages, not the rest of the manual. The scratch text starts PDF page 40 (index 39).
base='\f'.join((work/'dsm-classification.txt').read_text().split('\f')[1:52])
updates=(work/'apa-update-2025.txt').read_text()
pattern=r'(?<![A-Z0-9])([A-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?)(?![A-Z0-9])'
a=set(re.findall(pattern,base));b=set(re.findall(pattern,updates))
# The official code archive used to build the deployed catalog.
z=zipfile.ZipFile(work/'icd27-codes.zip')
data=z.read('icd10cm-code-descriptions-2027/icd10cm-order-2027.txt').decode('utf-8-sig')
official={l[6:13].strip():(l[14]=='1',l[77:].strip()) for l in data.splitlines()}
missing=[];older=[]
for code in sorted((a|b)-codes):
 meta=official.get(code.replace('.',''))
 item={'code':code,'label':meta[1] if meta else 'No exact current FY2027 entry',
  'references':(['2022 classification'] if code in a else [])+(['APA cumulative updates through September 2025'] if code in b else [])}
 if meta and meta[0]:missing.append(item)
 else:
  item['reason']='Nonterminal category: choose a current specific descendant' if meta else 'Withdrawn code, historical code, or incomplete coding example; not selectable as written'
  item['availableDescendants']=[r['code'] for r in catalog['rows'] if r['code'].replace('.','').startswith(code.replace('.',''))]
  older.append(item)
report={'version':'DSM literal-code coverage audit / 1','checkedOn':'2026-11-15','catalogVersion':catalog['version'],
 'scope':'Literal ICD-10-CM codes in the DSM-5-TR 2022 classification (PDF pages 41–91) plus the cumulative APA September 2025 update. Includes associated medical-condition examples. This is not a diagnosis-name/specifier completeness audit or advice to use historical DSM mappings.',
 'sources':[{'title':'APA DSM-5-TR classification (publisher record)','url':'https://psychiatryonline.org/doi/10.1176/appi.books.9780890425787.x00_Diagnostic_Classification'},
 {'title':'2022 manual used for literal-code comparison','url':'https://www.ncsby.org/sites/default/files/2024-02/DSM%205%20TR.pdf'},
 {'title':'APA cumulative updates through September 2025','url':'https://www.psychiatry.org/getmedia/b68a5776-f88c-45c7-9535-fd219d7aa5cb/APA-DSM5TR-Update-September-2025.pdf'},
 {'title':'Official FY2027 ICD-10-CM descriptions','url':catalog['source']}],
 'comparedCodes':len(a|b),'presentCodes':len((a|b)&codes),'missingCurrentCodes':missing,'historicalOrCategoryCodes':older,
 'sourceHashes':{'manual':hashlib.sha256((work/'dsm5tr.pdf').read_bytes()).hexdigest(),'updates':hashlib.sha256((work/'apa-update-2025.pdf').read_bytes()).hexdigest()}}
(root/'lib/emr/diagnosis-coverage.json').write_text(json.dumps(report,indent=2)+'\n')
print(f'{len(code_scopes)} catalog entries have inherited ICD coding notes; {len(missing)} current referenced codes absent; {len(older)} historical/nonterminal references.')
