/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/loan_origination.json`.
 */
export type LoanOrigination = {
  "address": "99SfPmytt5sJrmCfvpjiG1WdPMCY9b9iNd8KLVdmBLPU",
  "metadata": {
    "name": "loanOrigination",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "EmpowerFI loan origination program (request, approve, disburse, repay, close)"
  },
  "instructions": [
    {
      "name": "approveLoan",
      "discriminator": [
        223,
        27,
        77,
        138,
        94,
        172,
        21,
        209
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "loanConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  97,
                  110,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "borrower",
          "relations": [
            "loan"
          ]
        },
        {
          "name": "loan",
          "docs": [
            "PDA seeds: [LOAN_SEED, borrower, loan_id.to_le_bytes()]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "arg",
                "path": "loanId"
              }
            ]
          }
        },
        {
          "name": "poolState",
          "writable": true
        },
        {
          "name": "lockRecord",
          "writable": true
        },
        {
          "name": "collateralPoolProgram",
          "address": "9DqYSPMWaPBhoJ883KfgiaCiTgCWcZ9qhz4GBQ4CNrTw"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "loanId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "closeLoan",
      "discriminator": [
        96,
        114,
        111,
        204,
        149,
        228,
        235,
        124
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "loanConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  97,
                  110,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "borrower",
          "relations": [
            "loan"
          ]
        },
        {
          "name": "loan",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "arg",
                "path": "loanId"
              }
            ]
          }
        },
        {
          "name": "poolState",
          "writable": true
        },
        {
          "name": "lockRecord",
          "writable": true
        },
        {
          "name": "collateralPoolProgram",
          "address": "9DqYSPMWaPBhoJ883KfgiaCiTgCWcZ9qhz4GBQ4CNrTw"
        }
      ],
      "args": [
        {
          "name": "loanId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "disburseLoan",
      "discriminator": [
        115,
        159,
        152,
        253,
        201,
        29,
        29,
        174
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "loanConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  97,
                  110,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "borrower",
          "relations": [
            "loan"
          ]
        },
        {
          "name": "loan",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "arg",
                "path": "loanId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "loanId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeLoanConfig",
      "discriminator": [
        164,
        160,
        170,
        75,
        198,
        132,
        254,
        66
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "loanConfig",
          "docs": [
            "PDA seeds: [LOAN_CONFIG_SEED]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  97,
                  110,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "repayInstallment",
      "discriminator": [
        113,
        130,
        233,
        104,
        65,
        2,
        233,
        21
      ],
      "accounts": [
        {
          "name": "borrower",
          "signer": true,
          "relations": [
            "loan",
            "repaymentSchedule"
          ]
        },
        {
          "name": "loan",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "arg",
                "path": "loanId"
              }
            ]
          }
        },
        {
          "name": "repaymentSchedule",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  99,
                  104,
                  101,
                  100,
                  117,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "arg",
                "path": "loanId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "loanId",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "requestLoan",
      "discriminator": [
        120,
        2,
        7,
        7,
        1,
        219,
        235,
        187
      ],
      "accounts": [
        {
          "name": "borrower",
          "writable": true,
          "signer": true
        },
        {
          "name": "loanConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  97,
                  110,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "loan",
          "docs": [
            "PDA seeds: [LOAN_SEED, borrower, loan_id.to_le_bytes()]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "arg",
                "path": "loanId"
              }
            ]
          }
        },
        {
          "name": "repaymentSchedule",
          "docs": [
            "PDA seeds: [SCHEDULE_SEED, borrower, loan_id.to_le_bytes()]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  99,
                  104,
                  101,
                  100,
                  117,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "arg",
                "path": "loanId"
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
          "name": "loanId",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "termMonths",
          "type": "u8"
        },
        {
          "name": "interestRateBps",
          "type": "u16"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "loan",
      "discriminator": [
        20,
        195,
        70,
        117,
        165,
        227,
        182,
        1
      ]
    },
    {
      "name": "loanConfig",
      "discriminator": [
        123,
        130,
        235,
        54,
        45,
        187,
        118,
        220
      ]
    },
    {
      "name": "repaymentSchedule",
      "discriminator": [
        87,
        163,
        152,
        157,
        210,
        78,
        249,
        216
      ]
    }
  ],
  "events": [
    {
      "name": "installmentRepaid",
      "discriminator": [
        44,
        68,
        214,
        11,
        108,
        199,
        78,
        236
      ]
    },
    {
      "name": "loanApproved",
      "discriminator": [
        200,
        165,
        55,
        199,
        125,
        213,
        4,
        243
      ]
    },
    {
      "name": "loanClosed",
      "discriminator": [
        224,
        57,
        252,
        104,
        104,
        185,
        224,
        107
      ]
    },
    {
      "name": "loanConfigInitialized",
      "discriminator": [
        184,
        241,
        226,
        243,
        76,
        4,
        125,
        8
      ]
    },
    {
      "name": "loanDisbursed",
      "discriminator": [
        223,
        190,
        120,
        135,
        68,
        98,
        8,
        248
      ]
    },
    {
      "name": "loanRequested",
      "discriminator": [
        222,
        179,
        241,
        111,
        102,
        135,
        56,
        56
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Signer is not the configured authority"
    },
    {
      "code": 6001,
      "name": "invalidStatus",
      "msg": "Loan is not in the expected status for this operation"
    },
    {
      "code": 6002,
      "name": "amountExceedsRemaining",
      "msg": "Repayment amount exceeds the remaining balance"
    },
    {
      "code": 6003,
      "name": "invalidTerm",
      "msg": "Term in months must be greater than zero"
    },
    {
      "code": 6004,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "installmentRepaid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "loanId",
            "type": "u64"
          },
          {
            "name": "borrower",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "totalRepaid",
            "type": "u64"
          },
          {
            "name": "installmentsPaid",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "loan",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "borrower",
            "type": "pubkey"
          },
          {
            "name": "loanId",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "totalDue",
            "type": "u64"
          },
          {
            "name": "totalRepaid",
            "type": "u64"
          },
          {
            "name": "interestRateBps",
            "type": "u16"
          },
          {
            "name": "termMonths",
            "type": "u8"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "loanStatus"
              }
            }
          },
          {
            "name": "disbursedAt",
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
      "name": "loanApproved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "loanId",
            "type": "u64"
          },
          {
            "name": "borrower",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "loanClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "loanId",
            "type": "u64"
          },
          {
            "name": "borrower",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "loanConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "loanConfigInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "loanDisbursed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "loanId",
            "type": "u64"
          },
          {
            "name": "borrower",
            "type": "pubkey"
          },
          {
            "name": "disbursedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "loanRequested",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "borrower",
            "type": "pubkey"
          },
          {
            "name": "loanId",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "totalDue",
            "type": "u64"
          },
          {
            "name": "termMonths",
            "type": "u8"
          },
          {
            "name": "interestRateBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "loanStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "approved"
          },
          {
            "name": "disbursed"
          },
          {
            "name": "repaid"
          },
          {
            "name": "closed"
          }
        ]
      }
    },
    {
      "name": "poolState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "totalDeposited",
            "type": "u64"
          },
          {
            "name": "totalLocked",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "repaymentSchedule",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "borrower",
            "type": "pubkey"
          },
          {
            "name": "loanId",
            "type": "u64"
          },
          {
            "name": "installmentCount",
            "type": "u8"
          },
          {
            "name": "installmentsPaid",
            "type": "u8"
          },
          {
            "name": "installmentAmount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "bpsDenominator",
      "type": "u64",
      "value": "10000"
    },
    {
      "name": "loanConfigSeed",
      "type": "bytes",
      "value": "[108, 111, 97, 110, 95, 99, 111, 110, 102, 105, 103]"
    },
    {
      "name": "loanSeed",
      "type": "bytes",
      "value": "[108, 111, 97, 110]"
    },
    {
      "name": "scheduleSeed",
      "type": "bytes",
      "value": "[115, 99, 104, 101, 100, 117, 108, 101]"
    }
  ]
};
