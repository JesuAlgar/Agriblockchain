const hre = require('hardhat');

async function main() {
  const AgriEvents = await hre.ethers.getContractFactory('AgriEvents');
  const contract = await AgriEvents.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log('AgriEvents deployed to:', address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
