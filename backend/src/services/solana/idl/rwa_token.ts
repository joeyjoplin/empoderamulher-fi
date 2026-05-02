/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/rwa_token.json`.
 */
export type RwaToken = {
  "address": "CwVqgcBCZtGPYtCrvkFfLpBwhEXLvsb8Cr3KMsiyK655",
  "metadata": {
    "name": "rwaToken",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "EmpowerFI RWA token (Token-2022 with controlled mint)"
  },
  "instructions": [
    {
      "name": "burnRwa",
      "discriminator": [
        251,
        87,
        212,
        205,
        163,
        97,
        197,
        91
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "tokenConfig",
          "docs": [
            "PDA seeds: [TOKEN_CONFIG_SEED]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  119,
                  97,
                  95,
                  116,
                  111,
                  107,
                  101,
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
          "name": "mint",
          "writable": true,
          "relations": [
            "tokenConfig"
          ]
        },
        {
          "name": "fromAta",
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
      "name": "initializeTokenConfig",
      "discriminator": [
        60,
        14,
        114,
        86,
        25,
        84,
        93,
        149
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenConfig",
          "docs": [
            "PDA seeds: [TOKEN_CONFIG_SEED]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  119,
                  97,
                  95,
                  116,
                  111,
                  107,
                  101,
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
          "name": "mint",
          "docs": [
            "Token-2022 Mint with the TokenConfig PDA as mint and freeze authority."
          ],
          "writable": true,
          "signer": true
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
      "args": [
        {
          "name": "decimals",
          "type": "u8"
        }
      ]
    },
    {
      "name": "mintRwa",
      "discriminator": [
        113,
        187,
        15,
        206,
        117,
        139,
        168,
        102
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "tokenConfig",
          "docs": [
            "PDA seeds: [TOKEN_CONFIG_SEED]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  119,
                  97,
                  95,
                  116,
                  111,
                  107,
                  101,
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
          "name": "mint",
          "writable": true,
          "relations": [
            "tokenConfig"
          ]
        },
        {
          "name": "recipientAta",
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
    }
  ],
  "accounts": [
    {
      "name": "tokenConfig",
      "discriminator": [
        92,
        73,
        255,
        43,
        107,
        51,
        117,
        101
      ]
    }
  ],
  "events": [
    {
      "name": "rwaTokenBurned",
      "discriminator": [
        19,
        117,
        231,
        234,
        33,
        39,
        221,
        11
      ]
    },
    {
      "name": "rwaTokenMinted",
      "discriminator": [
        1,
        237,
        204,
        243,
        57,
        201,
        121,
        34
      ]
    },
    {
      "name": "tokenConfigInitialized",
      "discriminator": [
        216,
        229,
        55,
        155,
        204,
        69,
        244,
        40
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
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "rwaTokenBurned",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "from",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "rwaTokenMinted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "tokenConfig",
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
            "name": "totalSupply",
            "type": "u64"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tokenConfigInitialized",
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
            "name": "decimals",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "tokenConfigSeed",
      "type": "bytes",
      "value": "[114, 119, 97, 95, 116, 111, 107, 101, 110, 95, 99, 111, 110, 102, 105, 103]"
    }
  ]
};
