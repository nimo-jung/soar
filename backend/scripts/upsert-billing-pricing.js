#!/usr/bin/env node
/*
 * Upsert billing pricing policies for soar_admin.
 *
 * Usage examples:
 *   node scripts/upsert-billing-pricing.js
 *   BILLING_LITE_BASE_FEE=99 BILLING_PREMIUM_BASE_FEE=299 node scripts/upsert-billing-pricing.js
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

const backendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendRoot, '..');

const envPaths = [
  path.join(backendRoot, '.env'),
  path.join(repoRoot, '.env.dev'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'soar',
  password: process.env.DB_PASSWORD || 'soarpassword',
  database: process.env.DB_NAME || 'soar_admin',
};

const defaults = {
  LITE: {
    baseFee: 99,
    includedEps: 120,
    epsOveragePer100: 7.5,
    storageOveragePerGb: 1.4,
    logPerMillion: 1.9,
    currency: 'USD',
  },
  PREMIUM: {
    baseFee: 299,
    includedEps: 500,
    epsOveragePer100: 5.8,
    storageOveragePerGb: 1.1,
    logPerMillion: 1.4,
    currency: 'USD',
  },
  ENTERPRISE: {
    baseFee: 899,
    includedEps: 1500,
    epsOveragePer100: 3.8,
    storageOveragePerGb: 0.8,
    logPerMillion: 0.9,
    currency: 'USD',
  },
};

function readNumber(key, fallback) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readString(key, fallback) {
  const raw = process.env[key];
  if (!raw) {
    return fallback;
  }
  return String(raw).toUpperCase();
}

function resolveTier(tier, cfg) {
  return {
    tierCode: tier,
    baseFee: readNumber(`BILLING_${tier}_BASE_FEE`, cfg.baseFee),
    includedEps: readNumber(`BILLING_${tier}_INCLUDED_EPS`, cfg.includedEps),
    epsOveragePer100: readNumber(`BILLING_${tier}_EPS_OVERAGE_PER_100`, cfg.epsOveragePer100),
    storageOveragePerGb: readNumber(`BILLING_${tier}_STORAGE_OVERAGE_PER_GB`, cfg.storageOveragePerGb),
    logPerMillion: readNumber(`BILLING_${tier}_LOG_PER_MILLION`, cfg.logPerMillion),
    currency: readString(`BILLING_${tier}_CURRENCY`, cfg.currency),
  };
}

async function main() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const items = Object.entries(defaults).map(([tier, cfg]) => resolveTier(tier, cfg));

    for (const item of items) {
      await connection.query(
        `
        INSERT INTO billing_pricing_policies
          (tier_code, base_fee, included_eps, eps_overage_per_100, storage_overage_per_gb, log_per_million, currency)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          base_fee = VALUES(base_fee),
          included_eps = VALUES(included_eps),
          eps_overage_per_100 = VALUES(eps_overage_per_100),
          storage_overage_per_gb = VALUES(storage_overage_per_gb),
          log_per_million = VALUES(log_per_million),
          currency = VALUES(currency)
        `,
        [
          item.tierCode,
          item.baseFee,
          item.includedEps,
          item.epsOveragePer100,
          item.storageOveragePerGb,
          item.logPerMillion,
          item.currency,
        ],
      );
    }

    const [rows] = await connection.query(
      `SELECT tier_code, base_fee, included_eps, eps_overage_per_100, storage_overage_per_gb, log_per_million, currency
       FROM billing_pricing_policies
       ORDER BY tier_code ASC`,
    );

    console.log('[billing-pricing] upsert completed');
    console.table(rows);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('[billing-pricing] failed:', error.message);
  process.exit(1);
});
