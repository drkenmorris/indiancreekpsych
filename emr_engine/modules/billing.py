"""Canonical draft claim and two local demo adapters. No EDI/transport implementation."""
import csv
import io
import json

ADAPTERS = {'demo-json-v1': 'Canonical JSON preview', 'demo-csv-v1': 'Flat CSV preview'}


def claim(encounter, patient):
    return {'schema': 'emr-demo-claim/1', 'synthetic': True, 'status': 'draft',
            'encounter_id': encounter['id'], 'patient_id': patient['id'],
            'service_date': encounter['service_date'], 'procedure': encounter['procedure'],
            'diagnosis': encounter['diagnosis'], 'charge_cents': encounter['charge_cents'],
            'currency': 'USD', 'provider': 'Demo Clinician', 'payer': 'Synthetic Payer',
            'note_id': encounter['note_id']}


def preview(value, adapter):
    if adapter not in ADAPTERS:
        raise ValueError('Unknown adapter.')
    if not value.get('synthetic') or type(value.get('charge_cents')) is not int or value['charge_cents'] <= 0:
        raise ValueError('A positive synthetic charge is required.')
    if adapter == 'demo-json-v1':
        output = json.dumps(value, indent=2)
    else:
        buf = io.StringIO(newline='')
        fields = ['encounter_id', 'patient_id', 'service_date', 'procedure', 'diagnosis', 'charge_cents', 'currency']
        writer = csv.DictWriter(buf, fieldnames=fields, extrasaction='ignore', lineterminator='\n')
        writer.writeheader()
        writer.writerow(value)
        output = buf.getvalue()
    return {'adapter': adapter, 'output': output, 'transport_enabled': False,
            'readiness': 'LOCAL PREVIEW ONLY — not an 837P or clearinghouse accepted file',
            'blockers': ['No clearinghouse companion guide configured or acceptance test completed.',
                         'Provider, subscriber, coverage and payer identifiers are synthetic/incomplete.',
                         'No enrollment, transport, acknowledgment or remittance integration.']}
