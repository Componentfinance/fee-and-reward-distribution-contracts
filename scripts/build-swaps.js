const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const { ethers } = require('hardhat');

const usdc = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

const usdp = '0x1456688345527bE1f37E9e627DA0837D6f08C925'
const usdt = '0xdac17f958d2ee523a2206206994597c13d831ec7'
const dai = '0x6b175474e89094c44da98b954eedeac495271d0f'
const susd = '0x57ab1ec28d129707052df4df418d58a2d46d5f51'

const poolUSDC = '0x49519631B404E06ca79C9C7b0dC91648D86F08db'
const poolDAI = '0x6477960dd932d29518d7e8087d5ea3d11e606068'

const cmpDeployerAddr = '0x45fE418D510594F7110963A0241B8E2962c97358'

async function main() {

    const d = await ethers.getContractAt("Distribution", '0x2532d45794b76B93700265243b4424F45AD33091')

    await ethers.provider.send("hardhat_impersonateAccount", [cmpDeployerAddr])
    const cmpDeployer = await ethers.getSigner(cmpDeployerAddr)

    const swaps = []
    const balances = {}

    let preswapsCount = 0

    for (const tokenAddr of [dai, susd, usdt, usdp, usdc]) {
        const token = await ethers.getContractAt("IERC20", tokenAddr)
        balances[tokenAddr] = await token.balanceOf(d.address)

        // uncomment this when 0x6477960dd932d29518d7e8087d5ea3d11e606068 becomes balanced
        // if ([dai, susd].includes(tokenAddr)) {
        //     preswapsCount ++
        //     swaps.push([tokenAddr, usdp, poolDAI, balances[tokenAddr]])
        // }
    }

    const usdpResults = await d.connect(cmpDeployer).callStatic.viewDistribution(swaps, 0);

    swaps.push([usdt, usdc, poolUSDC, balances[usdt]])

    console.table(Object.keys(balances).map(token => ({
        token,
        balance: balances[token].toString(),
    })))

    const usdpAmount = usdpResults.swapResults_.reduce((acc, curr) => acc.add(curr), balances[usdp])

    swaps.push([usdp, usdc, poolUSDC, usdpAmount])

    const usdcResults = await d.connect(cmpDeployer).callStatic.viewDistribution(swaps, 0);

    const usdcAmount = usdcResults.swapResults_.slice(preswapsCount).reduce((acc, curr) => acc.add(curr), balances[usdc])

    const final = await d.connect(cmpDeployer).callStatic.viewDistribution(swaps, usdcAmount, /*'368149771471172408667'*/);

    console.log('swaps:')
    console.log(JSON.stringify(swaps.map(x => {
        x[3] = x[3].toString();
        return x;
    })))

    console.log('usdcAmount:', usdcAmount.toString())
    console.log('minCmpAmount: ', final.minCmpAmount_.toString())
}


main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
