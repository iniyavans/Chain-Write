const { Web3 } = require('web3');
const { HttpProvider } = require('web3-providers-http');
require('dotenv').config();

const providerURL = process.env.RPC_PROVIDER_URL;

// An instance of Web3 connected to the Ethereum network through HttpProvider.
const web3 = new Web3(new HttpProvider(providerURL));

async function fetchGasPrice() {
    try {

        const contractAddress = process.env.CONTRACT_ADDRESS;

        const contractABI = require('./contractABI.json');

        const contract = new web3.eth.Contract(contractABI, contractAddress);

        const arg1 = "0x18EcE9562468e10a4a21BD552A9CE11673Cc2FcD"; // Contract Address.
        const arg2 = ["0x84281bCeF8Bd174c4AF7747807BDf037B4a49880", "0xbe9C80fAc4724B4F2e54Dc4E414aEB9Fd165Bf5b"]; // User Wallet Address.
        const arg3 = [100000000000000000, 200000000000000000];

        const functionData = contract.methods.distributeTokens(arg1, arg2, arg3).encodeABI();

        const gasLimit = await web3.eth.estimateGas({
            from: process.env.ADMIN_WALLET_ADDRESS,
            to: process.env.CONTRACT_ADDRESS,
            data: functionData,
        });

        console.log("Total Gas Limit:", gasLimit)

        // Fetching the current gas price asynchronously
        const gasPrice = await web3.eth.getGasPrice();
        console.log("Current Gas Price (in wei):", gasPrice);

        // Converting gas price from wei to gwei for readability
        const gasPriceInGwei = web3.utils.fromWei(gasPrice, 'gwei');
        console.log("Current Gas Price (in gwei):", gasPriceInGwei);
    } catch (error) {
        console.error("Error fetching gas price:", error);
    }
}

fetchGasPrice();
