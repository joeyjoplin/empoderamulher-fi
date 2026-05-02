/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/collateral_pool.json`.
 */
export type CollateralPool = {
  "address": "9DqYSPMWaPBhoJ883KfgiaCiTgCWcZ9qhz4GBQ4CNrTw",
  "metadata": {
    "name": "collateralPool",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "EmpowerFI collateral pool for credit origination"
  },
  "instructions": [
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "depositor",
          "signer": true
        },
        {
          "name": "poolState",
          "docs": [
            "PDA seeds: [POOL_SEED]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "mint",
          "relations": [
            "poolState"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "poolState"
          ]
        },
        {
          "name": "depositorAta",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializePool",
      "discriminator": [
        95,
        180,
        10,
        172,
        84,
        174,
        232,
        40
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "poolState",
          "docs": [
            "PDA seeds: [POOL_SEED]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "vault",
          "docs": [
            "PDA seeds: [POOL_VAULT_SEED] — Token-2022 account owned by pool_state"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "lockCollateral",
      "discriminator": [
        161,
        216,
        135,
        122,
        12,
        104,
        211,
        101
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "poolState",
          "docs": [
            "PDA seeds: [POOL_SEED]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "lockRecord",
          "docs": [
            "PDA seeds: [LOCK_SEED, loan_id.to_le_bytes()]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  99,
                  107
                ]
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
        }
      ]
    },
    {
      "name": "unlockCollateral",
      "discriminator": [
        167,
        213,
        221,
        147,
        129,
        209,
        132,
        190
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "poolState",
          "docs": [
            "PDA seeds: [POOL_SEED]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "lockRecord",
          "docs": [
            "PDA seeds: [LOCK_SEED, loan_id.to_le_bytes()]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  99,
                  107
                ]
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
    }
  ],
  "accounts": [
    {
      "name": "lockRecord",
      "discriminator": [
        157,
        145,
        17,
        26,
        171,
        35,
        61,
        131
      ]
    },
    {
      "name": "poolState",
      "discriminator": [
        247,
        237,
        227,
        245,
        215,
        195,
        222,
        70
      ]
    }
  ],
  "events": [
    {
      "name": "collateralLocked",
      "discriminator": [
        185,
        146,
        119,
        8,
        41,
        179,
        88,
        96
      ]
    },
    {
      "name": "collateralUnlocked",
      "discriminator": [
        195,
        248,
        152,
        155,
        116,
        178,
        189,
        221
      ]
    },
    {
      "name": "poolDeposited",
      "discriminator": [
        148,
        17,
        86,
        50,
        113,
        125,
        70,
        132
      ]
    },
    {
      "name": "poolInitialized",
      "discriminator": [
        100,
        118,
        173,
        87,
        12,
        198,
        254,
        229
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Signer is not the configured pool authority"
    },
    {
      "code": 6001,
      "name": "insufficientAvailableCollateral",
      "msg": "Requested lock exceeds the available (unlocked) collateral"
    },
    {
      "code": 6002,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "collateralLocked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "loanId",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "totalLocked",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "collateralUnlocked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "loanId",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "totalLocked",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "lockRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "loanId",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "poolDeposited",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "totalDeposited",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "poolInitialized",
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
    }
  ],
  "constants": [
    {
      "name": "lockSeed",
      "type": "bytes",
      "value": "[108, 111, 99, 107]"
    },
    {
      "name": "poolSeed",
      "type": "bytes",
      "value": "[112, 111, 111, 108]"
    },
    {
      "name": "poolVaultSeed",
      "type": "bytes",
      "value": "[112, 111, 111, 108, 95, 118, 97, 117, 108, 116]"
    }
  ]
};
