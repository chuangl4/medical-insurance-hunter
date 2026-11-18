import type { Plan } from '../domain/types';

/**
 * Washington individual plans sold in King County (rating area 1) for 2027. Catastrophic plans are left out.
 *
 * - Premiums: Washington Insurance Commissioner 2027 rate reports, using the rate for age 21. Other
 *   ages are that rate times the federal age curve, which matched every report checked.
 * - Cascade Care benefits: CHPW 2027 Benefit Highlights. Healthplanfinder says Cascade Care plans at
 *   a metal level share cost sharing, and Premera's Cascade Silver and Bronze summaries match.
 * - Other benefits: each insurer's 2027 Summary of Benefits and Coverage, linked per plan.
 * - Drug tiers beyond generic and preferred brand (nonPreferredBrandRx, specialtyRx): the CHPW 2027 Benefit
 *   Highlights for Cascade Care plans, and Premera's 2027 SBCs for Preferred Gold and Bronze. Added 2026-11-14.
 * - benefits is null where no 2027 summary could be found.
 * - network is null where the source for that plan didn't confirm it. networkNote marks a type taken
 *   from an earlier year's documents.
 *
 * Collected 2026-11-06. Generated from the source documents, so check them before relying on a value.
 */
export const KING_COUNTY_PLANS: Plan[] = [
  {
    "id": "61836WA0050036",
    "carrier": "Ambetter (Coordinated Care)",
    "name": "Ambetter Cascade Select Bronze",
    "metal": "bronze",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": true,
    "counties": [
      "King"
    ],
    "basePremium": 374.46,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/coordinated%20care-indv-rate.pdf",
    "benefits": {
      "deductible": {
        "individual": 7000,
        "family": 14000
      },
      "oopMax": {
        "individual": 11800,
        "family": 23600
      },
      "primary": {
        "kind": "copay",
        "amount": 45,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 32,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.4
      }
    }
  },
  {
    "id": "61836WA0050018",
    "carrier": "Ambetter (Coordinated Care)",
    "name": "Ambetter Cascade Complete Gold",
    "metal": "gold",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 530.55,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/coordinated%20care-indv-rate.pdf",
    "benefits": {
      "deductible": {
        "individual": 1700,
        "family": 3400
      },
      "oopMax": {
        "individual": 7000,
        "family": 14000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 450,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 525,
        "afterDeductible": false,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "61836WA0050038",
    "carrier": "Ambetter (Coordinated Care)",
    "name": "Ambetter Cascade Select Complete Gold",
    "metal": "gold",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": true,
    "counties": [
      "King"
    ],
    "basePremium": 501.35,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/coordinated%20care-indv-rate.pdf",
    "benefits": {
      "deductible": {
        "individual": 1700,
        "family": 3400
      },
      "oopMax": {
        "individual": 7000,
        "family": 14000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 450,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 525,
        "afterDeductible": false,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "61836WA0050016",
    "carrier": "Ambetter (Coordinated Care)",
    "name": "Ambetter Cascade Select Vital Gold",
    "metal": "gold",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": true,
    "counties": [
      "King"
    ],
    "basePremium": 471.97,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/coordinated%20care-indv-rate.pdf",
    "benefits": {
      "deductible": {
        "individual": 2200,
        "family": 4400
      },
      "oopMax": {
        "individual": 11000,
        "family": 22000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 650,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.2
      }
    }
  },
  {
    "id": "61836WA0050022",
    "carrier": "Ambetter (Coordinated Care)",
    "name": "Ambetter Cascade Vital Gold",
    "metal": "gold",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 499.31,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/coordinated%20care-indv-rate.pdf",
    "benefits": {
      "deductible": {
        "individual": 2200,
        "family": 4400
      },
      "oopMax": {
        "individual": 11000,
        "family": 22000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 650,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.2
      }
    }
  },
  {
    "id": "61836WA0050008",
    "carrier": "Ambetter (Coordinated Care)",
    "name": "Ambetter Secure Care 5",
    "metal": "gold",
    "network": "HMO",
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 502.07,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/coordinated%20care-indv-rate.pdf",
    "benefits": {
      "deductible": {
        "individual": 1450,
        "family": 2900
      },
      "oopMax": {
        "individual": 9500,
        "family": 19000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 35,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 3,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "source": "https://api.centene.com/SBC/2027/61836WA0050008-01.pdf",
      "lab": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "brandRx": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "61836WA0050037",
    "carrier": "Ambetter (Coordinated Care)",
    "name": "Ambetter Cascade Select Silver",
    "metal": "silver",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": true,
    "counties": [
      "King"
    ],
    "basePremium": 592.68,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/coordinated%20care-indv-rate.pdf",
    "benefits": {
      "deductible": {
        "individual": 2800,
        "family": 5600
      },
      "oopMax": {
        "individual": 11200,
        "family": 22400
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 25,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      }
    }
  },
  {
    "id": "61836WA0050017",
    "carrier": "Ambetter (Coordinated Care)",
    "name": "Ambetter Cascade Silver",
    "metal": "silver",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 627.7,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/coordinated%20care-indv-rate.pdf",
    "benefits": {
      "deductible": {
        "individual": 2800,
        "family": 5600
      },
      "oopMax": {
        "individual": 11200,
        "family": 22400
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 25,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      }
    }
  },
  {
    "id": "53732WA0790026",
    "carrier": "BridgeSpan",
    "name": "BridgeSpan Cascade Bronze",
    "metal": "bronze",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 490.29,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/bridgespan-ind-rate-2027_4.pdf",
    "benefits": {
      "deductible": {
        "individual": 7000,
        "family": 14000
      },
      "oopMax": {
        "individual": 11800,
        "family": 23600
      },
      "primary": {
        "kind": "copay",
        "amount": 45,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 32,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.4
      }
    }
  },
  {
    "id": "53732WA0790024",
    "carrier": "BridgeSpan",
    "name": "BridgeSpan Cascade Complete Gold",
    "metal": "gold",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 716.82,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/bridgespan-ind-rate-2027_4.pdf",
    "benefits": {
      "deductible": {
        "individual": 1700,
        "family": 3400
      },
      "oopMax": {
        "individual": 7000,
        "family": 14000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 450,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 525,
        "afterDeductible": false,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "53732WA0790030",
    "carrier": "BridgeSpan",
    "name": "BridgeSpan Cascade Vital Gold",
    "metal": "gold",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 633.81,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/bridgespan-ind-rate-2027_4.pdf",
    "benefits": {
      "deductible": {
        "individual": 2200,
        "family": 4400
      },
      "oopMax": {
        "individual": 11000,
        "family": 22000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 650,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.2
      }
    }
  },
  {
    "id": "53732WA0790025",
    "carrier": "BridgeSpan",
    "name": "BridgeSpan Cascade Silver",
    "metal": "silver",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 834.43,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/bridgespan-ind-rate-2027_4.pdf",
    "benefits": {
      "deductible": {
        "individual": 2800,
        "family": 5600
      },
      "oopMax": {
        "individual": 11200,
        "family": 22400
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 25,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      }
    }
  },
  {
    "id": "18581WA0140003",
    "carrier": "Community Health Plan of Washington",
    "name": "CHPW Cascade Select Bronze",
    "metal": "bronze",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": true,
    "counties": [
      "King"
    ],
    "basePremium": 366.72,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/chpw-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 7000,
        "family": 14000
      },
      "oopMax": {
        "individual": 11800,
        "family": 23600
      },
      "primary": {
        "kind": "copay",
        "amount": 45,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 32,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.4
      }
    }
  },
  {
    "id": "18581WA0140001",
    "carrier": "Community Health Plan of Washington",
    "name": "CHPW Cascade Select Complete Gold",
    "metal": "gold",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": true,
    "counties": [
      "King"
    ],
    "basePremium": 508.99,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/chpw-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 1700,
        "family": 3400
      },
      "oopMax": {
        "individual": 7000,
        "family": 14000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 450,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 525,
        "afterDeductible": false,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "18581WA0140004",
    "carrier": "Community Health Plan of Washington",
    "name": "CHPW Cascade Select Vital Gold",
    "metal": "gold",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": true,
    "counties": [
      "King"
    ],
    "basePremium": 474.63,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/chpw-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2200,
        "family": 4400
      },
      "oopMax": {
        "individual": 11000,
        "family": 22000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 650,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.2
      }
    }
  },
  {
    "id": "18581WA0140002",
    "carrier": "Community Health Plan of Washington",
    "name": "CHPW Cascade Select Silver",
    "metal": "silver",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": true,
    "counties": [
      "King"
    ],
    "basePremium": 569.71,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/chpw-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2800,
        "family": 5600
      },
      "oopMax": {
        "individual": 11200,
        "family": 22400
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 25,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      }
    }
  },
  {
    "id": "80473WA1000019",
    "carrier": "Kaiser Permanente",
    "name": "Kaiser Permanente Bronze",
    "metal": "bronze",
    "network": "HMO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 433.42,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/kaiser-foundation-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 6500,
        "family": 13000
      },
      "oopMax": {
        "individual": 9800,
        "family": 19600
      },
      "primary": {
        "kind": "copay",
        "amount": 50,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": true
      },
      "genericRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "source": "https://healthy.kaiserpermanente.org/content/dam/kporg/final/documents/health-plan-documents/summary-of-benefits/wa/individual-family/2027/80473WA1000019-00-en-2027.pdf",
      "lab": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      }
    }
  },
  {
    "id": "80473WA1000017",
    "carrier": "Kaiser Permanente",
    "name": "Kaiser Permanente Bronze HSA",
    "metal": "bronze",
    "network": null,
    "channel": "both",
    "hsaEligible": true,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 434.44,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/kaiser-foundation-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 5500,
        "family": 11000
      },
      "oopMax": {
        "individual": 8550,
        "family": 17100
      },
      "primary": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "specialist": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "genericRx": {
        "kind": "coinsurance",
        "rate": 0.5
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "source": "https://healthy.kaiserpermanente.org/content/dam/kporg/final/documents/health-plan-documents/summary-of-benefits/wa/individual-family/2027/80473WA1000017-01-en-2027.pdf",
      "lab": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.5
      }
    }
  },
  {
    "id": "80473WA1000007",
    "carrier": "Kaiser Permanente",
    "name": "Kaiser Permanente Cascade Bronze",
    "metal": "bronze",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 428.94,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/kaiser-foundation-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 7000,
        "family": 14000
      },
      "oopMax": {
        "individual": 11800,
        "family": 23600
      },
      "primary": {
        "kind": "copay",
        "amount": 45,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 32,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.4
      }
    }
  },
  {
    "id": "80473WA1000020",
    "carrier": "Kaiser Permanente",
    "name": "Kaiser Permanente VisitsPlus Bronze HSA",
    "metal": "bronze",
    "network": null,
    "channel": "both",
    "hsaEligible": true,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 434.63,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/kaiser-foundation-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 6500,
        "family": 13000
      },
      "oopMax": {
        "individual": 11000,
        "family": 22000
      },
      "primary": {
        "kind": "copay",
        "amount": 50,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 90,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "source": "https://healthy.kaiserpermanente.org/content/dam/kporg/final/documents/health-plan-documents/summary-of-benefits/wa/individual-family/2027/80473WA1000020-01-en-2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 85,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 90,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      }
    }
  },
  {
    "id": "80473WA1000005",
    "carrier": "Kaiser Permanente",
    "name": "Kaiser Permanente Cascade Complete Gold",
    "metal": "gold",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 541.8,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/kaiser-foundation-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 1700,
        "family": 3400
      },
      "oopMax": {
        "individual": 7000,
        "family": 14000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 450,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 525,
        "afterDeductible": false,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "80473WA1000011",
    "carrier": "Kaiser Permanente",
    "name": "Kaiser Permanente Cascade Vital Gold",
    "metal": "gold",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 512.79,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/kaiser-foundation-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2200,
        "family": 4400
      },
      "oopMax": {
        "individual": 11000,
        "family": 22000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 650,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.2
      }
    }
  },
  {
    "id": "80473WA1000013",
    "carrier": "Kaiser Permanente",
    "name": "Kaiser Permanente Gold HSA",
    "metal": "gold",
    "network": null,
    "channel": "both",
    "hsaEligible": true,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 507.74,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/kaiser-foundation-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2100,
        "family": 4200
      },
      "oopMax": {
        "individual": 7000,
        "family": 14000
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": true
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": true
      },
      "genericRx": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": true
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "source": "https://healthy.kaiserpermanente.org/content/dam/kporg/final/documents/health-plan-documents/summary-of-benefits/wa/individual-family/2027/80473WA1000013-01-en-2027.pdf",
      "lab": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.2
      }
    }
  },
  {
    "id": "80473WA1000002",
    "carrier": "Kaiser Permanente",
    "name": "Kaiser Permanente VisitsPlus Gold",
    "metal": "gold",
    "network": "HMO",
    "channel": "both",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 527.36,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/kaiser-foundation-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 1000,
        "family": 2000
      },
      "oopMax": {
        "individual": 8000,
        "family": 16000
      },
      "primary": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 45,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "source": "https://healthy.kaiserpermanente.org/content/dam/kporg/final/documents/health-plan-documents/summary-of-benefits/wa/individual-family/2027/80473WA1000002-01-en-2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 45,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "80473WA1000014",
    "carrier": "Kaiser Permanente",
    "name": "Kaiser Permanente VisitsPlus Gold LD",
    "metal": "gold",
    "network": "HMO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 539.13,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/kaiser-foundation-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 500,
        "family": 1000
      },
      "oopMax": {
        "individual": 7800,
        "family": 15600
      },
      "primary": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 45,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "source": "https://healthy.kaiserpermanente.org/content/dam/kporg/final/documents/health-plan-documents/summary-of-benefits/wa/individual-family/2027/80473WA1000014-00-en-2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "80473WA1000006",
    "carrier": "Kaiser Permanente",
    "name": "Kaiser Permanente Cascade Silver",
    "metal": "silver",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 688.28,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/kaiser-foundation-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2800,
        "family": 5600
      },
      "oopMax": {
        "individual": 11200,
        "family": 22400
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 25,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      }
    }
  },
  {
    "id": "80473WA1000018",
    "carrier": "Kaiser Permanente",
    "name": "Kaiser Permanente Silver HSA",
    "metal": "silver",
    "network": null,
    "channel": "off",
    "hsaEligible": true,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 467.52,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/kaiser-foundation-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 3600,
        "family": 7200
      },
      "oopMax": {
        "individual": 8000,
        "family": 16000
      },
      "primary": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "specialist": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "genericRx": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "source": "https://healthy.kaiserpermanente.org/content/dam/kporg/final/documents/health-plan-documents/summary-of-benefits/wa/individual-family/2027/80473WA1000018-00-en-2027.pdf",
      "lab": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      }
    }
  },
  {
    "id": "80473WA1000012",
    "carrier": "Kaiser Permanente",
    "name": "Kaiser Permanente VisitsPlus Silver 4500",
    "metal": "silver",
    "network": "HMO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 455.95,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/kaiser-foundation-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 4500,
        "family": 9000
      },
      "oopMax": {
        "individual": 10250,
        "family": 20500
      },
      "primary": {
        "kind": "copay",
        "amount": 35,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 85,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "source": "https://healthy.kaiserpermanente.org/content/dam/kporg/final/documents/health-plan-documents/summary-of-benefits/wa/individual-family/2027/80473WA1000012-00-en-2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.3
      }
    }
  },
  {
    "id": "80473WA1000004",
    "carrier": "Kaiser Permanente",
    "name": "Kaiser Permanente VisitsPlus Silver HD",
    "metal": "silver",
    "network": "HMO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 474.94,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/kaiser-foundation-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 3000,
        "family": 6000
      },
      "oopMax": {
        "individual": 10000,
        "family": 20000
      },
      "primary": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 85,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 25,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "source": "https://healthy.kaiserpermanente.org/content/dam/kporg/final/documents/health-plan-documents/summary-of-benefits/wa/individual-family/2027/80473WA1000004-00-en-2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      }
    }
  },
  {
    "id": "80473WA1000015",
    "carrier": "Kaiser Permanente",
    "name": "Kaiser Permanente VisitsPlus Silver X",
    "metal": "silver",
    "network": "HMO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 473.27,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/kaiser-foundation-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2500,
        "family": 5000
      },
      "oopMax": {
        "individual": 9500,
        "family": 19000
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 70,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 25,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.35
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.35
      },
      "source": "https://healthy.kaiserpermanente.org/content/dam/kporg/final/documents/health-plan-documents/summary-of-benefits/wa/individual-family/2027/80473WA1000015-00-en-2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.35
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      }
    }
  },
  {
    "id": "84481WA0060007",
    "carrier": "Molina",
    "name": "Molina Cascade Bronze",
    "metal": "bronze",
    "network": "HMO",
    "networkNote": "From Molina's 2025 and 2026 Washington summaries (Plan Type: HMO); its 2027 summaries weren't published when this data was collected. Confirm before enrolling.",
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 451.22,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/molina-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 7000,
        "family": 14000
      },
      "oopMax": {
        "individual": 11800,
        "family": 23600
      },
      "primary": {
        "kind": "copay",
        "amount": 45,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 32,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.4
      }
    }
  },
  {
    "id": "84481WA0060005",
    "carrier": "Molina",
    "name": "Molina Cascade Complete Gold",
    "metal": "gold",
    "network": "HMO",
    "networkNote": "From Molina's 2025 and 2026 Washington summaries (Plan Type: HMO); its 2027 summaries weren't published when this data was collected. Confirm before enrolling.",
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 602.84,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/molina-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 1700,
        "family": 3400
      },
      "oopMax": {
        "individual": 7000,
        "family": 14000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 450,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 525,
        "afterDeductible": false,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "84481WA0060009",
    "carrier": "Molina",
    "name": "Molina Cascade Vital Gold",
    "metal": "gold",
    "network": "HMO",
    "networkNote": "From Molina's 2025 and 2026 Washington summaries (Plan Type: HMO); its 2027 summaries weren't published when this data was collected. Confirm before enrolling.",
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 567.79,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/molina-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2200,
        "family": 4400
      },
      "oopMax": {
        "individual": 11000,
        "family": 22000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 650,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.2
      }
    }
  },
  {
    "id": "84481WA0060006",
    "carrier": "Molina",
    "name": "Molina Cascade Silver",
    "metal": "silver",
    "network": "HMO",
    "networkNote": "From Molina's 2025 and 2026 Washington summaries (Plan Type: HMO); its 2027 summaries weren't published when this data was collected. Confirm before enrolling.",
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 711.72,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/molina-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2800,
        "family": 5600
      },
      "oopMax": {
        "individual": 11200,
        "family": 22400
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 25,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      }
    }
  },
  {
    "id": "49831WA1940007",
    "carrier": "Premera Blue Cross",
    "name": "Premera Blue Cross Cascade Bronze",
    "metal": "bronze",
    "network": "EPO",
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 693.52,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/premera-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 7000,
        "family": 14000
      },
      "oopMax": {
        "individual": 11800,
        "family": 23600
      },
      "primary": {
        "kind": "copay",
        "amount": 45,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 32,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.4
      }
    }
  },
  {
    "id": "49831WA1940003",
    "carrier": "Premera Blue Cross",
    "name": "Premera Blue Cross Preferred Bronze",
    "metal": "bronze",
    "network": "EPO",
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 712.32,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/premera-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 6800,
        "family": 13600
      },
      "oopMax": {
        "individual": 9600,
        "family": 19200
      },
      "primary": {
        "kind": "copay",
        "amount": 50,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": true
      },
      "genericRx": {
        "kind": "copay",
        "amount": 35,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "source": "https://apim.ag.prod.premera.net/api/v1.0/Document/Visitor/PBC%20WA/2027/MCA%20PBC%20WA%20Individual%20FINR%20SBC%20with%20PBC%20WA%20On%20Exchange%20(6adac2f476).pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.45
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.5
      }
    }
  },
  {
    "id": "49831WA1940005",
    "carrier": "Premera Blue Cross",
    "name": "Premera Blue Cross Cascade Complete Gold",
    "metal": "gold",
    "network": "EPO",
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 983.33,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/premera-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 1700,
        "family": 3400
      },
      "oopMax": {
        "individual": 7000,
        "family": 14000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 450,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 525,
        "afterDeductible": false,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "49831WA1940009",
    "carrier": "Premera Blue Cross",
    "name": "Premera Blue Cross Cascade Vital Gold",
    "metal": "gold",
    "network": "EPO",
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 939.32,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/premera-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2200,
        "family": 4400
      },
      "oopMax": {
        "individual": 11000,
        "family": 22000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 650,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.2
      }
    }
  },
  {
    "id": "49831WA1940001",
    "carrier": "Premera Blue Cross",
    "name": "Premera Blue Cross Preferred Gold",
    "metal": "gold",
    "network": "EPO",
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 913.57,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/premera-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 1500,
        "family": 3000
      },
      "oopMax": {
        "individual": 7000,
        "family": 14000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 45,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "source": "https://apim.ag.prod.premera.net/api/v1.0/Document/Visitor/PBC%20WA/2027/MCA%20PBC%20WA%20Individual%20FINR%20SBC%20with%20PBC%20WA%20On%20Exchange%20(6adac2f2f1).pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.45
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.5
      }
    }
  },
  {
    "id": "49831WA1940006",
    "carrier": "Premera Blue Cross",
    "name": "Premera Blue Cross Cascade Silver",
    "metal": "silver",
    "network": "EPO",
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 1150.9,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/premera-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2800,
        "family": 5600
      },
      "oopMax": {
        "individual": 11200,
        "family": 22400
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 25,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      }
    }
  },
  {
    "id": "87718WA2150029",
    "carrier": "Regence BlueShield",
    "name": "Regence BlueShield Bronze 8000",
    "metal": "bronze",
    "network": "EPO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 436.69,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/regence-blueshield-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 8000,
        "family": 16000
      },
      "oopMax": {
        "individual": 12000,
        "family": 24000
      },
      "primary": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 120,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.5
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.5
      },
      "source": "https://www.regence.com/go/2027/SBC/WW/Bronze8000IndividualConnect.pdf",
      "lab": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.5
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.3
      }
    }
  },
  {
    "id": "87718WA2150030",
    "carrier": "Regence BlueShield",
    "name": "Regence BlueShield Bronze Basic 10200",
    "metal": "bronze",
    "network": "EPO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 390.12,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/regence-blueshield-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 10200,
        "family": 20400
      },
      "oopMax": {
        "individual": 12000,
        "family": 24000
      },
      "primary": {
        "kind": "coinsurance",
        "rate": 0.5
      },
      "specialist": {
        "kind": "coinsurance",
        "rate": 0.5
      },
      "genericRx": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.5
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.5
      },
      "source": "https://www.regence.com/go/2027/SBC/WW/BronzeBasic10200IndividualConnect.pdf",
      "lab": {
        "kind": "coinsurance",
        "rate": 0.5
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.5
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.5
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.3
      }
    }
  },
  {
    "id": "87718WA2170028",
    "carrier": "Regence BlueShield",
    "name": "Regence BlueShield Bronze Basic 10K",
    "metal": "bronze",
    "network": "EPO",
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 398.59,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/regence-blueshield-ind-rate-2027.pdf",
    "benefits": null
  },
  {
    "id": "87718WA2170004",
    "carrier": "Regence BlueShield",
    "name": "Regence BlueShield Bronze Essential 9000",
    "metal": "bronze",
    "network": "EPO",
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 426.1,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/regence-blueshield-ind-rate-2027.pdf",
    "benefits": null
  },
  {
    "id": "87718WA2150001",
    "carrier": "Regence BlueShield",
    "name": "Regence BlueShield Bronze Essential 9500",
    "metal": "bronze",
    "network": "EPO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 419.05,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/regence-blueshield-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 9500,
        "family": 19000
      },
      "oopMax": {
        "individual": 12000,
        "family": 24000
      },
      "primary": {
        "kind": "coinsurance",
        "rate": 0.1
      },
      "specialist": {
        "kind": "coinsurance",
        "rate": 0.1
      },
      "genericRx": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.1
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.1
      },
      "source": "https://www.regence.com/go/2027/SBC/WW/BronzeEssential9500IndividualConnect.pdf",
      "introVisits": {
        "count": 4,
        "copay": 60,
        "includesSpecialist": true
      },
      "lab": {
        "kind": "coinsurance",
        "rate": 0.1
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.1
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.1
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.3
      }
    }
  },
  {
    "id": "87718WA2170015",
    "carrier": "Regence BlueShield",
    "name": "Regence Cascade Bronze",
    "metal": "bronze",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 445.86,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/regence-blueshield-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 7000,
        "family": 14000
      },
      "oopMax": {
        "individual": 11800,
        "family": 23600
      },
      "primary": {
        "kind": "copay",
        "amount": 45,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 32,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.4
      }
    }
  },
  {
    "id": "87718WA2150026",
    "carrier": "Regence BlueShield",
    "name": "Regence BlueShield Gold 2400",
    "metal": "gold",
    "network": "EPO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 603.18,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/regence-blueshield-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2400,
        "family": 4800
      },
      "oopMax": {
        "individual": 12000,
        "family": 24000
      },
      "primary": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.1
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.1
      },
      "source": "https://www.regence.com/go/2027/SBC/WW/Gold2400IndividualConnect.pdf",
      "lab": {
        "kind": "coinsurance",
        "rate": 0.1
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.1
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.1
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.2
      }
    }
  },
  {
    "id": "87718WA2170013",
    "carrier": "Regence BlueShield",
    "name": "Regence Cascade Complete Gold",
    "metal": "gold",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 651.85,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/regence-blueshield-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 1700,
        "family": 3400
      },
      "oopMax": {
        "individual": 7000,
        "family": 14000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 450,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 525,
        "afterDeductible": false,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "87718WA2170027",
    "carrier": "Regence BlueShield",
    "name": "Regence Cascade Vital Gold",
    "metal": "gold",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 576.37,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/regence-blueshield-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2200,
        "family": 4400
      },
      "oopMax": {
        "individual": 11000,
        "family": 22000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 650,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.2
      }
    }
  },
  {
    "id": "87718WA2150003",
    "carrier": "Regence BlueShield",
    "name": "Regence BlueShield Silver 5000",
    "metal": "silver",
    "network": "EPO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 495.24,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/regence-blueshield-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 5000,
        "family": 10000
      },
      "oopMax": {
        "individual": 12000,
        "family": 24000
      },
      "primary": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 80,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "source": "https://www.regence.com/go/2027/SBC/WW/Silver5000IndividualConnect.pdf",
      "lab": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.3
      }
    }
  },
  {
    "id": "87718WA2150004",
    "carrier": "Regence BlueShield",
    "name": "Regence BlueShield Silver HSA 4500",
    "metal": "silver",
    "network": "EPO",
    "channel": "off",
    "hsaEligible": true,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 486.07,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/regence-blueshield-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 4500,
        "family": 9000
      },
      "oopMax": {
        "individual": 8500,
        "family": 17000
      },
      "primary": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "specialist": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "genericRx": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "source": "https://www.regence.com/go/2027/SBC/WW/SilverHSA4500IndividualConnect.pdf",
      "lab": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.3
      }
    }
  },
  {
    "id": "87718WA2170014",
    "carrier": "Regence BlueShield",
    "name": "Regence Cascade Silver",
    "metal": "silver",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 758.8,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/regence-blueshield-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2800,
        "family": 5600
      },
      "oopMax": {
        "individual": 11200,
        "family": 22400
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 25,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      }
    }
  },
  {
    "id": "62650WA0020022",
    "carrier": "UnitedHealthcare",
    "name": "UHC Bronze Direct Copay",
    "metal": "bronze",
    "network": "EPO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 565.47,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 0,
        "family": 0
      },
      "oopMax": {
        "individual": 11800,
        "family": 23600
      },
      "primary": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 25,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 2005,
        "afterDeductible": false
      },
      "hospital": {
        "kind": "copay",
        "amount": 3000,
        "afterDeductible": false,
        "perDayMax": 3
      },
      "source": "https://www.uhc.com/ifp/sbc.62650WA0020022-00.en.2027",
      "lab": {
        "kind": "copay",
        "amount": 50,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 200,
        "afterDeductible": false
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      }
    }
  },
  {
    "id": "62650WA0030001",
    "carrier": "UnitedHealthcare",
    "name": "UHC Bronze Direct Value+ (with dental + vision)",
    "metal": "bronze",
    "network": "EPO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 597.64,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 7600,
        "family": 15200
      },
      "oopMax": {
        "individual": 11500,
        "family": 23000
      },
      "primary": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 1000,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "source": "https://www.uhc.com/ifp/sbc.62650WA0030001-00.en.2027",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      }
    }
  },
  {
    "id": "62650WA0020005",
    "carrier": "UnitedHealthcare",
    "name": "UHC Bronze Essential",
    "metal": "bronze",
    "network": "EPO",
    "channel": "both",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 508.81,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 11750,
        "family": 23500
      },
      "oopMax": {
        "individual": 11750,
        "family": 23500
      },
      "primary": {
        "kind": "coinsurance",
        "rate": 0
      },
      "specialist": {
        "kind": "coinsurance",
        "rate": 0
      },
      "genericRx": {
        "kind": "coinsurance",
        "rate": 0
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0
      },
      "source": "https://www.uhc.com/ifp/sbc.62650WA0020005-01.en.2027",
      "lab": {
        "kind": "coinsurance",
        "rate": 0
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0
      }
    }
  },
  {
    "id": "62650WA0020006",
    "carrier": "UnitedHealthcare",
    "name": "UHC Bronze Value",
    "metal": "bronze",
    "network": "EPO",
    "channel": "both",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 568.58,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 7600,
        "family": 15200
      },
      "oopMax": {
        "individual": 11500,
        "family": 23000
      },
      "primary": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 1000,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "source": "https://www.uhc.com/ifp/sbc.62650WA0020006-01.en.2027",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      }
    }
  },
  {
    "id": "62650WA0020023",
    "carrier": "UnitedHealthcare",
    "name": "UHC Bronze Value HSA",
    "metal": "bronze",
    "network": "EPO",
    "channel": "off",
    "hsaEligible": true,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 569.17,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 6300,
        "family": 12600
      },
      "oopMax": {
        "individual": 8200,
        "family": 16400
      },
      "primary": {
        "kind": "copay",
        "amount": 50,
        "afterDeductible": true
      },
      "specialist": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": true
      },
      "genericRx": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": true
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "source": "https://www.uhc.com/ifp/sbc.62650WA0020023-00.en.2027",
      "lab": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.35
      }
    }
  },
  {
    "id": "62650WA0020002",
    "carrier": "UnitedHealthcare",
    "name": "UnitedHealthcare Cascade Bronze",
    "metal": "bronze",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 561.97,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 7000,
        "family": 14000
      },
      "oopMax": {
        "individual": 11800,
        "family": 23600
      },
      "primary": {
        "kind": "copay",
        "amount": 45,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 32,
        "afterDeductible": false
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.4
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.4
      }
    }
  },
  {
    "id": "62650WA0020020",
    "carrier": "UnitedHealthcare",
    "name": "UHC Gold Advantage",
    "metal": "gold",
    "network": "EPO",
    "channel": "both",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 744.56,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 1000,
        "family": 2000
      },
      "oopMax": {
        "individual": 9000,
        "family": 18000
      },
      "primary": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 3,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 500,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 1500,
        "afterDeductible": true,
        "perDayMax": 3
      },
      "source": "https://www.uhc.com/ifp/sbc.62650WA0020020-01.en.2027",
      "lab": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": true
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "62650WA0030003",
    "carrier": "UnitedHealthcare",
    "name": "UHC Gold Direct Advantage+ (with dental + vision)",
    "metal": "gold",
    "network": "EPO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 773.65,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 1000,
        "family": 2000
      },
      "oopMax": {
        "individual": 9000,
        "family": 18000
      },
      "primary": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 3,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 500,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 1500,
        "afterDeductible": true,
        "perDayMax": 3
      },
      "source": "https://www.uhc.com/ifp/sbc.62650WA0030003-00.en.2027",
      "lab": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": true
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "62650WA0020029",
    "carrier": "UnitedHealthcare",
    "name": "UHC Gold Direct Copay",
    "metal": "gold",
    "network": "EPO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 756.54,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 0,
        "family": 0
      },
      "oopMax": {
        "individual": 7000,
        "family": 14000
      },
      "primary": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 45,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 1205,
        "afterDeductible": false
      },
      "hospital": {
        "kind": "copay",
        "amount": 1200,
        "afterDeductible": false,
        "perDayMax": 3
      },
      "source": "https://www.uhc.com/ifp/sbc.62650WA0020029-00.en.2027",
      "lab": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": false
      },
      "brandRx": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "62650WA0020028",
    "carrier": "UnitedHealthcare",
    "name": "UHC Gold Value HSA",
    "metal": "gold",
    "network": "EPO",
    "channel": "off",
    "hsaEligible": true,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 729,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 3500,
        "family": 7000
      },
      "oopMax": {
        "individual": 4000,
        "family": 8000
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": true
      },
      "specialist": {
        "kind": "copay",
        "amount": 50,
        "afterDeductible": true
      },
      "genericRx": {
        "kind": "copay",
        "amount": 3,
        "afterDeductible": true
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "source": "https://www.uhc.com/ifp/sbc.62650WA0020028-00.en.2027",
      "lab": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "brandRx": {
        "kind": "coinsurance",
        "rate": 0.2
      }
    }
  },
  {
    "id": "62650WA0020001",
    "carrier": "UnitedHealthcare",
    "name": "UnitedHealthcare Cascade Complete Gold",
    "metal": "gold",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 758.47,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 1700,
        "family": 3400
      },
      "oopMax": {
        "individual": 7000,
        "family": 14000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 450,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 525,
        "afterDeductible": false,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "62650WA0020008",
    "carrier": "UnitedHealthcare",
    "name": "UnitedHealthcare Cascade Vital Gold",
    "metal": "gold",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 713.01,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2200,
        "family": 4400
      },
      "oopMax": {
        "individual": 11000,
        "family": 22000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 650,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.2
      }
    }
  },
  {
    "id": "62650WA0020025",
    "carrier": "UnitedHealthcare",
    "name": "UHC Basic Silver",
    "metal": "silver",
    "network": "EPO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 637.92,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2800,
        "family": 5600
      },
      "oopMax": {
        "individual": 11200,
        "family": 22400
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 25,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 805,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://www.uhc.com/ifp/sbc.62650WA0020025-00.en.2027",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "62650WA0020017",
    "carrier": "UnitedHealthcare",
    "name": "UHC Silver Copay Focus",
    "metal": "silver",
    "network": "EPO",
    "channel": "both",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 900.69,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 0,
        "family": 0
      },
      "oopMax": {
        "individual": 11800,
        "family": 23600
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 900,
        "afterDeductible": false
      },
      "hospital": {
        "kind": "copay",
        "amount": 2500,
        "afterDeductible": false,
        "perDayMax": 3
      },
      "source": "https://www.uhc.com/ifp/sbc.62650WA0020017-01.en.2027",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 275,
        "afterDeductible": false
      },
      "brandRx": {
        "kind": "copay",
        "amount": 85,
        "afterDeductible": true
      }
    }
  },
  {
    "id": "62650WA0020027",
    "carrier": "UnitedHealthcare",
    "name": "UHC Silver Direct Copay",
    "metal": "silver",
    "network": "EPO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 642.13,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 0,
        "family": 0
      },
      "oopMax": {
        "individual": 11800,
        "family": 23600
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 900,
        "afterDeductible": false
      },
      "hospital": {
        "kind": "copay",
        "amount": 2500,
        "afterDeductible": false,
        "perDayMax": 3
      },
      "source": "https://www.uhc.com/ifp/sbc.62650WA0020027-00.en.2027",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 275,
        "afterDeductible": false
      },
      "brandRx": {
        "kind": "copay",
        "amount": 85,
        "afterDeductible": true
      }
    }
  },
  {
    "id": "62650WA0030002",
    "carrier": "UnitedHealthcare",
    "name": "UHC Silver Direct Copay+ (with dental + vision)",
    "metal": "silver",
    "network": "EPO",
    "channel": "off",
    "hsaEligible": false,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 671.15,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 0,
        "family": 0
      },
      "oopMax": {
        "individual": 11800,
        "family": 23600
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 900,
        "afterDeductible": false
      },
      "hospital": {
        "kind": "copay",
        "amount": 2500,
        "afterDeductible": false,
        "perDayMax": 3
      },
      "source": "https://www.uhc.com/ifp/sbc.62650WA0030002-00.en.2027",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 275,
        "afterDeductible": false
      },
      "brandRx": {
        "kind": "copay",
        "amount": 85,
        "afterDeductible": true
      }
    }
  },
  {
    "id": "62650WA0020024",
    "carrier": "UnitedHealthcare",
    "name": "UHC Silver Value HSA",
    "metal": "silver",
    "network": "EPO",
    "channel": "off",
    "hsaEligible": true,
    "cascadeCare": false,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 624.81,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 4000,
        "family": 8000
      },
      "oopMax": {
        "individual": 8500,
        "family": 17000
      },
      "primary": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": true
      },
      "specialist": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": true
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": true
      },
      "er": {
        "kind": "coinsurance",
        "rate": 0.25
      },
      "hospital": {
        "kind": "coinsurance",
        "rate": 0.25
      },
      "source": "https://www.uhc.com/ifp/sbc.62650WA0020024-00.en.2027",
      "lab": {
        "kind": "coinsurance",
        "rate": 0.25
      },
      "diagnostic": {
        "kind": "coinsurance",
        "rate": 0.25
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.25
      },
      "brandRx": {
        "kind": "copay",
        "amount": 35,
        "afterDeductible": true
      }
    }
  },
  {
    "id": "62650WA0020003",
    "carrier": "UnitedHealthcare",
    "name": "UnitedHealthcare Cascade Silver",
    "metal": "silver",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 899.9,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/uhc-oregon-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2800,
        "family": 5600
      },
      "oopMax": {
        "individual": 11200,
        "family": 22400
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 25,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      }
    }
  },
  {
    "id": "12435WA0010001",
    "carrier": "Wellpoint",
    "name": "Wellpoint Cascade Complete Gold",
    "metal": "gold",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 524.89,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/wellpoint-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 1700,
        "family": 3400
      },
      "oopMax": {
        "individual": 7000,
        "family": 14000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 450,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 525,
        "afterDeductible": false,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 60,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 100,
        "afterDeductible": false
      }
    }
  },
  {
    "id": "12435WA0010002",
    "carrier": "Wellpoint",
    "name": "Wellpoint Cascade Vital Gold",
    "metal": "gold",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 491.27,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/wellpoint-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2200,
        "family": 4400
      },
      "oopMax": {
        "individual": 11000,
        "family": 22000
      },
      "primary": {
        "kind": "copay",
        "amount": 15,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 10,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 650,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "lab": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 30,
        "afterDeductible": false
      },
      "scan": {
        "kind": "copay",
        "amount": 300,
        "afterDeductible": true
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "coinsurance",
        "rate": 0.2
      },
      "specialtyRx": {
        "kind": "coinsurance",
        "rate": 0.2
      }
    }
  },
  {
    "id": "12435WA0010003",
    "carrier": "Wellpoint",
    "name": "Wellpoint Cascade Silver",
    "metal": "silver",
    "network": null,
    "channel": "on",
    "hsaEligible": false,
    "cascadeCare": true,
    "publicOption": false,
    "counties": [
      "King"
    ],
    "basePremium": 629.42,
    "ratesSource": "https://www.insurance.wa.gov/sites/default/files/2026-09/wellpoint-ind-rate-2027.pdf",
    "benefits": {
      "deductible": {
        "individual": 2800,
        "family": 5600
      },
      "oopMax": {
        "individual": 11200,
        "family": 22400
      },
      "primary": {
        "kind": "copay",
        "amount": 20,
        "afterDeductible": false
      },
      "specialist": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "genericRx": {
        "kind": "copay",
        "amount": 25,
        "afterDeductible": false
      },
      "er": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true
      },
      "hospital": {
        "kind": "copay",
        "amount": 800,
        "afterDeductible": true,
        "perDayMax": 5
      },
      "source": "https://individualandfamily.chpw.org/wp-content/uploads/cascade-select/content/member/CS_Benefit_Highlights_2027.pdf",
      "introVisits": {
        "count": 2,
        "copay": 1,
        "includesSpecialist": false
      },
      "lab": {
        "kind": "copay",
        "amount": 40,
        "afterDeductible": false
      },
      "diagnostic": {
        "kind": "copay",
        "amount": 65,
        "afterDeductible": false
      },
      "scan": {
        "kind": "coinsurance",
        "rate": 0.3
      },
      "brandRx": {
        "kind": "copay",
        "amount": 75,
        "afterDeductible": false
      },
      "nonPreferredBrandRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      },
      "specialtyRx": {
        "kind": "copay",
        "amount": 250,
        "afterDeductible": true
      }
    }
  }
];

/** When the plan list, premiums and benefits were collected. */
export const PLANS_COLLECTED = '2026-11-06';
