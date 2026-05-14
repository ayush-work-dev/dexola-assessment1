const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const { getWethTotalSupply } = require('./config/contractService');
const killPort = require('kill-port');

require('dotenv').config();

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;

const checkPort = async (port, maxPort = 65535) => {

    if (port > maxPort) {
        throw new Error("No available ports found");
    }

    try {
        await killPort(port, "tcp");
        await killPort(port, "udp");
        return port;
    } catch (err) {
        return checkPort(port + 1, maxPort);
    }
};

(async () => {
    const safePort = await checkPort(PORT);
    const getPort = (await import('get-port')).default; // dynamic import
    const final_port = await getPort({ port: safePort });

    console.log(`Port ${final_port} is free. Ready to start server.`);

    // Middleware
    app.use(cors({ origin: `http://localhost:${final_port}` }));
    app.use(express.json());
    app.use(morgan('dev'));

    // Routes
    app.use('/api/items', require('./routes/items'));
    app.use('/api/stats', require('./routes/stats'));

    require('./config/dbHandler.js').connect();

    /**
     * @route    GET /api/v1/wethApiTest
     * @desc     Reads live token data (name, symbol, decimals, totalSupply) from the WETH smart contract on Ethereum mainnet
     * @author   Ayush
     * @access   public
     * @param    {Request}  req  - Express request object. No body or query params required.
     * @param    {Response} res  - Express response object.
     * @returns  {JSON}          { success: true, data: { contract, name, symbol, decimals, totalSupplyRaw, totalSupply } }
     * @throws   500 if the RPC provider is unreachable or the contract call fails
     *
     * @example
     * // Example request
     * curl http://localhost:3001/api/v1/wethApiTest
     *
     * // Example response
     * {
     *   "success": true,
     *   "data": {
     *     "contract": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
     *     "name": "Wrapped Ether",
     *     "symbol": "WETH",
     *     "decimals": 18,
     *     "totalSupplyRaw": "2166590294786816150758416",
     *     "totalSupply": "2166590.294786816150758416"
     *   }
     * }
     */
    app.get('/api/v1/wethApiTest', async (req, res) => {
        try {
            const data = await getWethTotalSupply();
            console.log('[wethApiTest] Fetched WETH data from Ethereum mainnet:', data);
            res.json({ success: true, data });
        } catch (err) {
            console.error('[wethApiTest] Error fetching contract data:', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
        app.use(express.static('client/build'));
        app.get('*', (req, res) => {
            res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
        });
    }

    // Start server
    app.listen(final_port, () => {
        console.log(`Backend running on http://localhost:${final_port}`);
    });
})();