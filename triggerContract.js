const { Web3 } = require('web3');
const { HttpProvider } = require('web3-providers-http');
require('dotenv').config();
const cron = require('node-cron');

// Custom replacer function to handle BigInt serialization
function replacer(key, value) {
    if (typeof value === 'bigint') {
        return value.toString(); // Convert BigInt to string
    }
    return value;
}

const triggerContractFunction = async (providerURL, contractAddress, account, privateKey, contractABI, contractParams) => {
    // Web3 instance with extended timeout settings
    const providerOptions = {
        transactionBlockTimeout: 100,
        transactionPollingTimeout: 480,
    };
    const web3 = new Web3(new HttpProvider(providerURL, providerOptions));

    // Initialize contract instance
    const contract = new web3.eth.Contract(contractABI, contractAddress);

    try {
        const nonce = await web3.eth.getTransactionCount(account, 'latest');

        const { functionName, ...args } = contractParams;
        const contractMethod = contract.methods[functionName];
        if (!contractMethod) {
            throw new Error(`Function ${functionName} not found in contract.`);
        }

        // Encode contract call data
        const functionData = contractMethod(...Object.values(args)).encodeABI();

        // Estimate gas as BigInt to ensure compatibility in calculations
        const gasLimit = BigInt(await web3.eth.estimateGas({
            from: account,
            to: contractAddress,
            data: functionData,
        }));

        // Get current gas price
        const gasPrice = BigInt(await web3.eth.getGasPrice());

        // Set transaction parameters with gas adjustments
        const tx = {
            from: account,
            to: contractAddress,
            gas: Number(gasLimit * 4n), // Multiply gas limit by 4 for safety
            maxPriorityFeePerGas: BigInt(web3.utils.toWei('25', 'gwei')),
            maxFeePerGas: gasPrice,
            data: functionData,
            nonce: nonce,
        };

        // Sign and send transaction
        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        return { success: true, receipt };
    } catch (error) {
        // Only return a JSON error response
        const errorResponse = {
            success: false,
            message: `Execution is reverted with a contract.`,
            reason: error.reason || error.message || "Unknown error",
            details: {
                code: error.code,
                data: error.data,
                cause: error.cause,
                signature: error.signature,
                receipt: error.receipt,
            }
        };
        return errorResponse;
    }
};

// Load environment variables
const providerURL = process.env.RPC_PROVIDER_URL;
const contractAddress = process.env.CONTRACT_ADDRESS;
const account = process.env.ADMIN_WALLET_ADDRESS;
const privateKey = process.env.ADMIN_PRIVATE_KEY;
const contractABI = require('./contractABI.json');

// Contract parameters
const contractParams = {
    functionName: 'distributeTokens',
    tokenAddress: "0x18EcE9562468e10a4a21BD552A9CE11673Cc2FcD",
    recipients: ["0x84281bCeF8Bd174c4AF7747807BDf037B4a49880", "0xbe9C80fAc4724B4F2e54Dc4E414aEB9Fd165Bf5b"],
    amounts: [100000000000000000n, 200000000000000000n] // Use BigInt by appending 'n'
};

// Run the function and await the response
(async () => {
    const response = await triggerContractFunction(providerURL, contractAddress, account, privateKey, contractABI, contractParams);
    console.log('Response:', JSON.stringify(response, replacer, 2));
})();

// Uncomment the following to run this function every day at midnight
// cron.schedule('0 0 * * *', async () => {
//     try {
//         const response = await triggerContractFunction(providerURL, contractAddress, account, privateKey, contractABI, contractParams);
//         console.log('Scheduled task response:', JSON.stringify(response, replacer, 2));
//     } catch (error) {
//         console.error('Scheduled task error:', error);
//     }
// });
