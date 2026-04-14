export const OMAN_BANK_LIST: Array<{ name: string; swift: string }> = [
  { name: 'Ahlibank SAOG',                              swift: 'AUBOOMRU'    },
  { name: 'Ahli Islamic Bank',                          swift: 'AUBOOMRUALH' },
  { name: 'AL Izz Islamic Bank',                        swift: 'IZZBOMRU'    },
  { name: 'Bank Dhofar S.A.O.G.',                       swift: 'BDOFOMRU'    },
  { name: 'Bank Muscat',                                swift: 'BMUSOMRX'    },
  { name: 'Bank Muscat Islamic Meethaq',                swift: 'BMUSOMRXISL' },
  { name: 'Bank Meli Iran',                             swift: 'MELIOMRX'    },
  { name: 'Bank Nizwa',                                 swift: 'BNZWOMRX'    },
  { name: 'Bank of Barooda, Greater Muttrah Branch',    swift: 'BARBOMMX'    },
  { name: 'Bank of Beirut',                             swift: 'BABEOMRX'    },
  { name: 'Bank Saderat Iran',                          swift: 'BSIROMRX'    },
  { name: 'Bank Sohar',                                 swift: 'BSHROMRU'    },
  { name: 'Bank Sohar Islamic Window',                  swift: 'BSHROMRUISL' },
  { name: 'Habib Bank',                                 swift: 'HABBOMRX'    },
  { name: 'HSBC Middle East',                           swift: 'BBMEOMRX'    },
  { name: 'Maisarah Islamic Banking',                   swift: 'BDOFOMRUMIB' },
  { name: 'National Bank of Abu Dhabi',                 swift: 'NBADOMRX'    },
  { name: 'National Bank of Oman',                      swift: 'NBOMOMRX'    },
  { name: 'Muzn Islamic Banking',                       swift: 'NBOMOMRXIBS' },
  { name: 'Oman Arab Bank',                             swift: 'OMABOMRU'    },
  { name: 'AL Yusr Islamic Banking',                    swift: 'OMABOMRUYSR' },
  { name: 'Oman Development Bank',                      swift: 'ODBLOMRX'    },
  { name: 'Oman Housing Bank',                          swift: 'OHBLOMRX'    },
  { name: 'OMAN INTERNATIONAL BANK',                   swift: 'OIBAOMMX'    },
  { name: 'State Bank of India',                        swift: 'SBINOMRX'    },
  { name: 'Standard Chartered Bank',                    swift: 'SCBLOMRX'    },
  { name: 'Qatar National Bank',                        swift: 'QNBAOMRX'    },
];

/** Normalize a string: lowercase, strip dots, collapse whitespace */
function norm(s: string) {
  return s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

/** Resolve SWIFT code from any bank name variant (partial match, dots/spaces ignored) */
export function resolveSwift(bankName: string | null | undefined): string {
  if (!bankName) return '';
  const n = norm(bankName);
  // 1. Exact name match first
  const exact = OMAN_BANK_LIST.find((b) => norm(b.name) === n);
  if (exact) return exact.swift;
  // 2. Partial match
  const partial = OMAN_BANK_LIST.find((b) => n.includes(norm(b.name)) || norm(b.name).includes(n));
  return partial?.swift ?? '';
}
