/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/marketplace.json`.
 */
export type Marketplace = {
  "address": "2BVJn1DY6Kzni1rXgc1ysZRNPRyKhmWZpyRYSh8x6ouh",
  "metadata": {
    "name": "marketplace",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "EmpowerFI marketplace — authorized B2B payment requests between entrepreneurs"
  },
  "instructions": [
    {
      "name": "cancelRequest",
      "discriminator": [
        65,
        196,
        177,
        247,
        83,
        151,
        33,
        130
      ],
      "accounts": [
        {
          "name": "canceller",
          "signer": true
        },
        {
          "name": "request",
          "docs": [
            "PDA seeds: [PAYMENT_SEED, buyer, provider, nonce_le_bytes]",
            "",
            "Authorisation lives in the `constraint` below — `canceller` must be",
            "either `request.from` (buyer) or `request.to` (provider)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "request.from",
                "account": "paymentRequest"
              },
              {
                "kind": "account",
                "path": "request.to",
                "account": "paymentRequest"
              },
              {
                "kind": "arg",
                "path": "nonce"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "nonce",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createBnplRequest",
      "discriminator": [
        5,
        30,
        31,
        21,
        101,
        238,
        159,
        220
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "provider",
          "docs": [
            "The supplier doesn't sign here; the supplier is paid via the",
            "follow-up `pay_request` call (which the buyer also signs because",
            "they're settling against their own request)."
          ]
        },
        {
          "name": "request",
          "docs": [
            "PDA seeds: [PAYMENT_SEED, buyer, provider, nonce_le_bytes]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "account",
                "path": "provider"
              },
              {
                "kind": "arg",
                "path": "nonce"
              }
            ]
          }
        },
        {
          "name": "plan",
          "docs": [
            "PDA seeds: [BNPL_SEED, payment_request, buyer]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  110,
                  112,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "request"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "nonce",
          "type": "u64"
        },
        {
          "name": "principalAmount",
          "type": "u64"
        },
        {
          "name": "totalRepayable",
          "type": "u64"
        },
        {
          "name": "installmentCount",
          "type": "u8"
        },
        {
          "name": "installmentAmount",
          "type": "u64"
        },
        {
          "name": "firstDueAt",
          "type": "i64"
        },
        {
          "name": "category",
          "type": {
            "defined": {
              "name": "paymentCategory"
            }
          }
        },
        {
          "name": "memo",
          "type": "string"
        }
      ]
    },
    {
      "name": "createPaymentRequest",
      "discriminator": [
        246,
        150,
        103,
        37,
        15,
        36,
        93,
        100
      ],
      "accounts": [
        {
          "name": "provider",
          "writable": true,
          "signer": true
        },
        {
          "name": "buyer",
          "docs": [
            "will sign separately when they call `pay_request`."
          ]
        },
        {
          "name": "request",
          "docs": [
            "PDA seeds: [PAYMENT_SEED, buyer, provider, nonce_le_bytes]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "account",
                "path": "provider"
              },
              {
                "kind": "arg",
                "path": "nonce"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "nonce",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "category",
          "type": {
            "defined": {
              "name": "paymentCategory"
            }
          }
        },
        {
          "name": "memo",
          "type": "string"
        }
      ]
    },
    {
      "name": "payRequest",
      "discriminator": [
        182,
        174,
        240,
        192,
        60,
        83,
        75,
        174
      ],
      "accounts": [
        {
          "name": "buyer",
          "signer": true
        },
        {
          "name": "request",
          "docs": [
            "PDA seeds: [PAYMENT_SEED, buyer, provider, nonce_le_bytes]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "account",
                "path": "request.to",
                "account": "paymentRequest"
              },
              {
                "kind": "arg",
                "path": "nonce"
              }
            ]
          }
        },
        {
          "name": "bnplPlan",
          "docs": [
            "Optional BNPL plan tied to this request. If supplied, must be the",
            "canonical PDA for `(payment_request, buyer)`; the emitted event will",
            "carry `bnpl: true`. Direct-pay callers pass `None`."
          ],
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  110,
                  112,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "request"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "nonce",
          "type": "u64"
        }
      ]
    },
    {
      "name": "recordInstallment",
      "discriminator": [
        211,
        216,
        208,
        51,
        237,
        64,
        8,
        16
      ],
      "accounts": [
        {
          "name": "buyer",
          "signer": true
        },
        {
          "name": "request",
          "docs": [
            "PDA seeds: [PAYMENT_SEED, buyer, provider, nonce_le_bytes]. We bind",
            "it via the seeds rather than passing `provider` separately so a",
            "caller can't trick us into pairing a plan with the wrong request."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "account",
                "path": "request.to",
                "account": "paymentRequest"
              },
              {
                "kind": "arg",
                "path": "nonce"
              }
            ]
          }
        },
        {
          "name": "plan",
          "docs": [
            "PDA seeds: [BNPL_SEED, payment_request, buyer]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  110,
                  112,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "request"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "nonce",
          "type": "u64"
        },
        {
          "name": "installmentIndex",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "bnplPlan",
      "discriminator": [
        136,
        19,
        253,
        51,
        236,
        57,
        71,
        73
      ]
    },
    {
      "name": "paymentRequest",
      "discriminator": [
        27,
        20,
        202,
        96,
        101,
        242,
        124,
        69
      ]
    }
  ],
  "events": [
    {
      "name": "bnplPlanCompleted",
      "discriminator": [
        212,
        234,
        226,
        147,
        33,
        217,
        239,
        28
      ]
    },
    {
      "name": "bnplRequestCreated",
      "discriminator": [
        121,
        186,
        147,
        172,
        227,
        152,
        192,
        194
      ]
    },
    {
      "name": "installmentPaid",
      "discriminator": [
        247,
        32,
        44,
        43,
        84,
        76,
        215,
        84
      ]
    },
    {
      "name": "paymentCancelled",
      "discriminator": [
        137,
        140,
        226,
        59,
        55,
        152,
        253,
        179
      ]
    },
    {
      "name": "paymentCompleted",
      "discriminator": [
        157,
        184,
        146,
        198,
        243,
        50,
        113,
        174
      ]
    },
    {
      "name": "paymentRequestCreated",
      "discriminator": [
        186,
        59,
        96,
        125,
        65,
        88,
        209,
        147
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidStatus",
      "msg": "Payment request is not in the expected status for this operation"
    },
    {
      "code": 6001,
      "name": "unauthorized",
      "msg": "Signer is neither the buyer nor the provider on this request"
    },
    {
      "code": 6002,
      "name": "memoTooLong",
      "msg": "Memo exceeds the maximum allowed length (200 bytes)"
    },
    {
      "code": 6003,
      "name": "invalidAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6004,
      "name": "bnplAlreadyComplete",
      "msg": "BNPL plan is already complete; no further installments accepted"
    },
    {
      "code": 6005,
      "name": "invalidInstallmentOrder",
      "msg": "Installment index does not match the next expected installment for this plan"
    },
    {
      "code": 6006,
      "name": "bnplInstallmentCountOutOfRange",
      "msg": "Installment count must be between 1 and the program's MAX_INSTALLMENTS"
    },
    {
      "code": 6007,
      "name": "bnplFirstDueInPast",
      "msg": "First installment due date must be in the future"
    }
  ],
  "types": [
    {
      "name": "bnplPlan",
      "docs": [
        "On-chain record of a buy-now-pay-later plan opened against a single",
        "`PaymentRequest`. The supplier is paid up-front by the platform (recorded",
        "via the existing `pay_request` instruction); this account tracks what the",
        "buyer still owes and how many installments they've recorded so far.",
        "",
        "1:1 with `PaymentRequest` — `payment_request` is both a field and part of",
        "the PDA seed, so given a payment request you can derive the plan address",
        "deterministically without a secondary lookup."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paymentRequest",
            "docs": [
              "PDA of the `PaymentRequest` this plan is settling."
            ],
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "docs": [
              "Buyer pubkey — also the signer who calls `record_installment`."
            ],
            "type": "pubkey"
          },
          {
            "name": "principalAmount",
            "docs": [
              "What the supplier received up-front (in cents/lamports per the",
              "platform's chosen unit; same unit as `PaymentRequest.amount`)."
            ],
            "type": "u64"
          },
          {
            "name": "totalRepayable",
            "docs": [
              "Sum of all installments — `principal + embedded interest`. Off-chain",
              "pricing computes this; the program just records it."
            ],
            "type": "u64"
          },
          {
            "name": "installmentCount",
            "docs": [
              "Number of scheduled installments. Bounded by `MAX_INSTALLMENTS`."
            ],
            "type": "u8"
          },
          {
            "name": "installmentAmount",
            "docs": [
              "`total_repayable / installment_count` (off-chain computed). Stored so",
              "the indexer can validate per-installment amounts without re-deriving."
            ],
            "type": "u64"
          },
          {
            "name": "paidInstallments",
            "docs": [
              "Counter incremented by `record_installment`. When it reaches",
              "`installment_count`, status flips to `Completed`."
            ],
            "type": "u8"
          },
          {
            "name": "firstDueAt",
            "docs": [
              "Unix timestamp of the first installment due date. Validated to be in",
              "the future at create time."
            ],
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "bnplStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bnplPlanCompleted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "plan",
            "type": "pubkey"
          },
          {
            "name": "totalRepaid",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "bnplRequestCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "plan",
            "type": "pubkey"
          },
          {
            "name": "paymentRequest",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "principalAmount",
            "type": "u64"
          },
          {
            "name": "installmentCount",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bnplStatus",
      "docs": [
        "Lifecycle of a BNPL plan.",
        "",
        "Active → Completed     (last installment recorded via `record_installment`)",
        "↓",
        "Defaulted          (RESERVED — no recovery path implemented in MVP;",
        "never written by current handlers)",
        "",
        "The plan is created in `Active` state by `create_bnpl_request` and stays",
        "there as installments are recorded. When `paid_installments == installment_count`",
        "the handler flips it to `Completed` and emits `BnplPlanCompleted`. The",
        "`Defaulted` variant is in the enum so the recovery flow can ship as a",
        "pure additive change (no on-chain migration), but no MVP code path",
        "transitions into it."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "completed"
          },
          {
            "name": "defaulted"
          }
        ]
      }
    },
    {
      "name": "installmentPaid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "plan",
            "type": "pubkey"
          },
          {
            "name": "installmentIndex",
            "type": "u8"
          },
          {
            "name": "paidInstallments",
            "type": "u8"
          },
          {
            "name": "installmentCount",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "paymentCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "request",
            "type": "pubkey"
          },
          {
            "name": "from",
            "type": "pubkey"
          },
          {
            "name": "to",
            "type": "pubkey"
          },
          {
            "name": "cancelledBy",
            "type": "pubkey"
          },
          {
            "name": "cancelledAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "paymentCategory",
      "docs": [
        "Coarse business category for impact-dashboard aggregation. Intentionally",
        "minimal for the MVP — refine post-hackathon when the marketplace has real",
        "usage signal."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "supplies"
          },
          {
            "name": "packaging"
          },
          {
            "name": "services"
          },
          {
            "name": "other"
          }
        ]
      }
    },
    {
      "name": "paymentCompleted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "request",
            "type": "pubkey"
          },
          {
            "name": "from",
            "type": "pubkey"
          },
          {
            "name": "to",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "paidAt",
            "type": "i64"
          },
          {
            "name": "bnpl",
            "docs": [
              "`true` when the supplier was paid up-front via the BNPL flow",
              "(`create_bnpl_request → pay_request`). `false` for direct pay.",
              "Additive — old indexers that only read the first 5 fields keep",
              "working; new projection logic in `routes/impact.ts` reads this",
              "flag to bucket BNPL events as `marketplace_bnpl_supplier_paid`",
              "instead of plain `marketplace_payment`."
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "paymentRequest",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "from",
            "type": "pubkey"
          },
          {
            "name": "to",
            "type": "pubkey"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "category",
            "type": {
              "defined": {
                "name": "paymentCategory"
              }
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "paymentStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "paidAt",
            "docs": [
              "Unix timestamp set when status transitions to Paid; 0 while Pending or Cancelled."
            ],
            "type": "i64"
          },
          {
            "name": "cancelledAt",
            "docs": [
              "Unix timestamp set when status transitions to Cancelled; 0 otherwise."
            ],
            "type": "i64"
          },
          {
            "name": "memo",
            "type": "string"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "paymentRequestCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "request",
            "type": "pubkey"
          },
          {
            "name": "from",
            "type": "pubkey"
          },
          {
            "name": "to",
            "type": "pubkey"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "category",
            "type": {
              "defined": {
                "name": "paymentCategory"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "paymentStatus",
      "docs": [
        "Lifecycle of a single payment request.",
        "",
        "Pending → Paid       (buyer settles via `pay_request`)",
        "↓",
        "Cancelled        (either party calls `cancel_request` while Pending)",
        "",
        "Once Paid or Cancelled the request is terminal — `pay_request` /",
        "`cancel_request` reject anything that's not Pending. The PDA itself is",
        "kept on-chain (not closed) so the off-chain indexer can reconcile the",
        "final state from the `PaymentCompleted` / `PaymentCancelled` events."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "paid"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "bnplSeed",
      "docs": [
        "PDA seed prefix for BnplPlan accounts. A BnplPlan is 1:1 with a",
        "PaymentRequest and lives under `[BNPL_SEED, payment_request, buyer]`."
      ],
      "type": "bytes",
      "value": "[98, 110, 112, 108]"
    },
    {
      "name": "paymentSeed",
      "type": "bytes",
      "value": "[112, 97, 121, 109, 101, 110, 116]"
    }
  ]
};
