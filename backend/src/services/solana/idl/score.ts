/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/score.json`.
 */
export type Score = {
  "address": "HiFPcEVC89FHAYTRS5gHMDRGCS8YBMpKrTTcXVqLKP5d",
  "metadata": {
    "name": "score",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "EmpowerFI on-chain Score-as-a-Service (privacy-preserving CNPJ-keyed score)"
  },
  "instructions": [
    {
      "name": "attestScore",
      "discriminator": [
        43,
        103,
        32,
        97,
        108,
        253,
        99,
        3
      ],
      "accounts": [
        {
          "name": "attestor",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "docs": [
            "PDA seeds: [SCORE_CONFIG_SEED]"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  99,
                  111,
                  114,
                  101,
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
          "name": "score",
          "docs": [
            "PDA seeds: [SCORE_SEED, cnpj_hmac]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  99,
                  111,
                  114,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "cnpjHmac"
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
          "name": "cnpjHmac",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "total",
          "type": "u16"
        },
        {
          "name": "breakdown",
          "type": {
            "defined": {
              "name": "scoreBreakdown"
            }
          }
        }
      ]
    },
    {
      "name": "initializeScoreConfig",
      "discriminator": [
        41,
        201,
        105,
        158,
        52,
        56,
        221,
        18
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "docs": [
            "PDA seeds: [SCORE_CONFIG_SEED]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  99,
                  111,
                  114,
                  101,
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
      "args": [
        {
          "name": "attestor",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "revokeScore",
      "discriminator": [
        3,
        246,
        228,
        86,
        146,
        17,
        187,
        2
      ],
      "accounts": [
        {
          "name": "attestor",
          "signer": true
        },
        {
          "name": "config",
          "docs": [
            "PDA seeds: [SCORE_CONFIG_SEED]"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  99,
                  111,
                  114,
                  101,
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
          "name": "score",
          "docs": [
            "PDA seeds: [SCORE_SEED, cnpj_hmac]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  99,
                  111,
                  114,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "cnpjHmac"
              }
            ]
          }
        },
        {
          "name": "recipient",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "cnpjHmac",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "score",
      "discriminator": [
        187,
        110,
        62,
        119,
        232,
        235,
        185,
        90
      ]
    },
    {
      "name": "scoreConfig",
      "discriminator": [
        150,
        113,
        251,
        218,
        0,
        146,
        67,
        39
      ]
    }
  ],
  "events": [
    {
      "name": "scoreAttested",
      "discriminator": [
        152,
        152,
        41,
        97,
        104,
        162,
        33,
        127
      ]
    },
    {
      "name": "scoreConfigInitialized",
      "discriminator": [
        20,
        110,
        40,
        37,
        96,
        126,
        24,
        118
      ]
    },
    {
      "name": "scoreRevoked",
      "discriminator": [
        74,
        225,
        127,
        60,
        169,
        157,
        166,
        110
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Signer is not the configured attestor"
    },
    {
      "code": 6001,
      "name": "scoreOutOfRange",
      "msg": "Score value exceeds the allowed maximum (1000)"
    }
  ],
  "types": [
    {
      "name": "score",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "cnpjHmac",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "totalScore",
            "type": "u16"
          },
          {
            "name": "disciplineScore",
            "type": "u16"
          },
          {
            "name": "organizationScore",
            "type": "u16"
          },
          {
            "name": "cashFlowScore",
            "type": "u16"
          },
          {
            "name": "engagementScore",
            "type": "u16"
          },
          {
            "name": "lastUpdatedAt",
            "type": "i64"
          },
          {
            "name": "attestor",
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
      "name": "scoreAttested",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "cnpjHmac",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "totalScore",
            "type": "u16"
          },
          {
            "name": "attestor",
            "type": "pubkey"
          },
          {
            "name": "lastUpdatedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "scoreBreakdown",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "discipline",
            "type": "u16"
          },
          {
            "name": "organization",
            "type": "u16"
          },
          {
            "name": "cashFlow",
            "type": "u16"
          },
          {
            "name": "engagement",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "scoreConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "attestor",
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
      "name": "scoreConfigInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "attestor",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "scoreRevoked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "cnpjHmac",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "attestor",
            "type": "pubkey"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "scoreConfigSeed",
      "type": "bytes",
      "value": "[115, 99, 111, 114, 101, 95, 99, 111, 110, 102, 105, 103]"
    },
    {
      "name": "scoreSeed",
      "type": "bytes",
      "value": "[115, 99, 111, 114, 101]"
    }
  ]
};
