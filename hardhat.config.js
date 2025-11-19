require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const {
  SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com',
  SEPOLIA_PRIVATE_KEY,
  ETHERSCAN_API_KEY = ''
} = process.env;

module.exports = {
  solidity: '0.8.24',
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: SEPOLIA_PRIVATE_KEY ? [SEPOLIA_PRIVATE_KEY] : [],
      chainId: 11155111
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  }
};
