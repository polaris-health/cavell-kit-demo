/**
 * Fictional records shaped like the real tool results — same keys, same order, same nullability.
 * No `showing` key: the backend omits its range when a short list is returned whole, from the top.
 */
const mockMcpRecords = {
	allergies: {
		allergies: [
			{
				resource_id: 'mock-allergy-1',
				substance: 'Amoxicilline',
				type: 'allergy',
				categories: 'medication',
				criticality: 'HIGH',
				clinical_status: 'ACTIVE',
				verification_status: 'CONFIRMED',
				reactions: 'Urticaria, angio-oedeem (SEVERE)',
				onset_date: '2018-04-12',
				last_occurrence: '2021-09-03',
				atc_code: 'J01CA04',
				cnk_code: null,
				note: 'Vermijd alle penicillines.',
			},
			{
				resource_id: 'mock-allergy-2',
				substance: 'Huisstofmijt',
				type: 'allergy',
				categories: 'environment',
				criticality: 'LOW',
				clinical_status: 'ACTIVE',
				verification_status: 'UNCONFIRMED',
				reactions: 'Rhinitis (MILD)',
				onset_date: '2015-03-01',
				last_occurrence: null,
				atc_code: null,
				cnk_code: null,
				note: null,
			},
		],
	},
	familyHistory: {
		family_history: [
			{
				resource_id: 'mock-family-1',
				relation: 'Vader',
				sex: 'male',
				born_date: '1948-06-22',
				deceased: true,
				deceased_age: 71,
				conditions: 'Myocardinfarct (66 j.), Diabetes type 2',
				note: null,
			},
			{
				resource_id: 'mock-family-2',
				relation: 'Zus',
				sex: 'female',
				born_date: '1979-11-30',
				deceased: false,
				deceased_age: null,
				conditions: 'Coeliakie',
				note: 'Diagnose op volwassen leeftijd.',
			},
		],
	},
	contactPersons: {
		contact_persons: [
			{
				resource_id: 'mock-contact-1',
				name: 'Marieke Vermeulen',
				relationship: 'Echtgenote',
				type: 'Contactpersoon bij noodgeval',
				phone: '+32 470 00 00 01',
				email: 'marieke.vermeulen@example.be',
				gender: 'female',
				date_of_birth: '1981-02-14',
				active: true,
			},
			{
				resource_id: 'mock-contact-2',
				name: 'Joris Vermeulen',
				relationship: 'Zoon',
				type: 'Contactpersoon',
				phone: '+32 470 00 00 02',
				email: null,
				gender: 'male',
				date_of_birth: '2006-08-09',
				active: true,
			},
		],
	},
	consents: {
		consents: [
			{
				resource_id: 'mock-consent-1',
				scope: 'patient-privacy',
				status: 'ACTIVE',
				decision: 'permit',
				date: '2023-01-17',
				valid_from: '2023-01-17',
				valid_until: null,
				categories: 'eHealth informed consent',
			},
			{
				resource_id: 'mock-consent-2',
				scope: 'research',
				status: 'INACTIVE',
				decision: 'deny',
				date: '2024-05-06',
				valid_from: '2024-05-06',
				valid_until: '2025-05-06',
				categories: 'Deelname aan observationeel onderzoek',
			},
		],
	},
}

export default mockMcpRecords
