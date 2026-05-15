const { ethers } = require('ethers');

 //using this since the one provided in constant is not working
const RPC_URL = process.env.ETH_RPC_URL || 'https://ethereum.publicnode.com';
const WETH_ADDRESS = process.env.WETH_CONTRACT_ADDRESS || '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const RPC_TIMEOUT_MS = parseInt(process.env.RPC_TIMEOUT_MS, 10) || 10000;
const MAX_RETRIES = parseInt(process.env.RPC_MAX_RETRIES, 10) || 4;
const RETRY_BASE_DELAY_MS = parseInt(process.env.RPC_RETRY_BASE_DELAY_MS, 10) || 200;

const WETH_ABI = [
    'function totalSupply() view returns (uint256)',
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
];

//can implement caching on the API level in future but an overkill for now.


// adding exponential backoff if the API returns intermittant errors.
async function withExponentialBackoff(fn, maxRetries = MAX_RETRIES, baseDelayMs = RETRY_BASE_DELAY_MS) {
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        } catch (err) {
            attempt++;
            if (attempt > maxRetries) throw err;
            const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100;
            console.warn(`[contractService] RPC attempt ${attempt} failed: ${err.message}. Retrying in ${Math.round(delay)}ms...`);
            await new Promise((res) => setTimeout(res, delay));
        }
    }
}

async function getWethTotalSupply() {
    return withExponentialBackoff(async () => {
        const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
            staticNetwork: true,
            polling: false,
            cacheTimeout: RPC_TIMEOUT_MS,
        });
        const contract = new ethers.Contract(WETH_ADDRESS, WETH_ABI, provider);

        const [totalSupplyRaw, name, symbol, decimals] = await Promise.all([
            contract.totalSupply(),
            contract.name(),
            contract.symbol(),
            contract.decimals(),
        ]);

        const totalSupplyFormatted = ethers.formatUnits(totalSupplyRaw, decimals);

        return {
            contract: WETH_ADDRESS,
            name,
            symbol,
            decimals: Number(decimals),
            totalSupplyRaw: totalSupplyRaw.toString(),
            totalSupply: totalSupplyFormatted,
        };
    });
}

module.exports = { getWethTotalSupply };
