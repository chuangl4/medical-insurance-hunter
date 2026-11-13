import { describe, expect, it } from 'vitest';
import { cleanFindings, toDoctorRecord } from './doctors';

describe('registry records', () => {
  it('keeps the name, primary specialty, and practice locations', () => {
    const record = toDoctorRecord({
      number: '1234567890',
      basic: { first_name: 'TEST', middle_name: '--', last_name: 'DOCTOR', credential: 'M.D.' },
      taxonomies: [
        { desc: 'Other', primary: false },
        { desc: 'Ophthalmology', primary: true },
      ],
      addresses: [
        { address_purpose: 'MAILING', address_1: 'PO BOX 1', city: 'NOWHERE', state: 'WA' },
        { address_purpose: 'LOCATION', address_1: '1 MAIN ST', city: 'TESTVILLE', state: 'WA', telephone_number: '555-0100' },
      ],
    });
    expect(record).toEqual({
      npi: '1234567890',
      name: 'Test Doctor',
      credential: 'MD',
      specialty: 'Ophthalmology',
      locations: ['1 Main St · Testville, WA · 555-0100'],
    });
  });
});

describe('cleaning website findings', () => {
  const request = {
    doctor: { npi: '1234567890', name: 'Test Doctor', credential: '', specialty: '', locations: [] },
    carriers: ['Insurer A', 'Premera Blue Cross'],
    hospitals: [{ id: 'h1', name: 'Hospital One' }],
  };
  it('drops unknown insurers, duplicates, unknown hospitals, and non-web links', () => {
    const check = cleanFindings(
      {
        summary: ' Found it. ',
        clinicName: 'Clinic',
        clinicUrl: 'javascript:alert(1)',
        hospitalId: 'made-up',
        carriers: [
          { carrier: 'Insurer A', finding: 'accepts', detail: 'Individual plans', url: 'https://clinic.example/insurance' },
          { carrier: 'Insurer A', finding: 'does-not-accept', detail: '', url: null },
          { carrier: 'Insurer Z', finding: 'accepts', detail: '', url: null },
        ],
      },
      request,
      false,
      new Date('2026-11-13T00:00:00Z'),
    );
    expect(check).toEqual({
      checkedAt: '2026-11-13T00:00:00.000Z',
      summary: 'Found it.',
      clinicName: 'Clinic',
      clinicUrl: null,
      hospitalId: null,
      carriers: [{ carrier: 'Insurer A', finding: 'accepts', detail: 'Individual plans', url: 'https://clinic.example/insurance' }],
      premeraListed: false,
    });
  });
});
