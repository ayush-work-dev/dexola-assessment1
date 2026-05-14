const { ethers } = require('ethers');

 //using this since the one provided in constant is not working
const RPC_URL = process.env.ETH_RPC_URL || 'https://ethereum.publicnode.com';
const WETH_ADDRESS = process.env.WETH_CONTRACT_ADDRESS || '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const RPC_TIMEOUT_MS = parseInt(process.env.RPC_TIMEOUT_MS, 10) || 10000;

const WETH_ABI = [
    'function totalSupply() view returns (uint256)',
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
];

//can implement caching on the API level in future but an overkill for now.

async function getWethTotalSupply() {
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
}

module.exports = { getWethTotalSupply };
