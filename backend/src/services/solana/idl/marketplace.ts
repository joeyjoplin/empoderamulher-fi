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
        }
      ],
      "args": [
        {
          "name": "nonce",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
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
    }
  ],
  "types": [
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
      "name": "paymentSeed",
      "type": "bytes",
      "value": "[112, 97, 121, 109, 101, 110, 116]"
    }
  ]
};
