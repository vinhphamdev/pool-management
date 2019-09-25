/* eslint-disable no-restricted-syntax */
import Web3 from 'web3'
import abiDecoder from 'abi-decoder'

import BPool from '../../../balancer-core/out/BPool_meta.json'
import TestToken from '../../../external-contracts/TestToken.json'

export async function getParams(provider, contractAddress) {
    const { web3Provider } = provider
    const web3 = new Web3(web3Provider)
    const { defaultAccount } = web3Provider.eth

    const bPool = new web3.eth.Contract(BPool.output.abi, contractAddress, { from: defaultAccount })

    const manager = await bPool.methods.getManager().call()
    const fee = await bPool.methods.getFee().call()
    const numTokens = await bPool.methods.getNumTokens().call()
    const isPaused = await bPool.methods.isPaused().call()

    const result = {
        fee,
        manager,
        numTokens,
        isPaused
    }
    return {
        result: 'success',
        data: result

    }
}

export async function getTokenParams(provider, contractAddress) {
    const { web3Provider } = provider
    const web3 = new Web3(web3Provider)
    const { defaultAccount } = web3Provider.eth

    const bPool = new web3.eth.Contract(BPool.output.abi, contractAddress, { from: defaultAccount })

    abiDecoder.addABI(BPool.output.abi)

    const bindSig = '0xe4e1e53800000000000000000000000000000000000000000000000000000000'
    const setParamsSig = '0x7ff1055200000000000000000000000000000000000000000000000000000000'

    // Get a list of successful token binds by checking the calls. We'll assume the code is correct
    // TODO: Sanity check - Make sure that failed tx don't create a log
    const eventName = 'LOG_CALL'
    const bindEvents = await bPool.getPastEvents(eventName, {
        filter: { sig: bindSig },
        fromBlock: 0,
        toBlock: 'latest'
    })

    const setParamsEvents = await bPool.getPastEvents(eventName, {
        filter: { sig: setParamsSig },
        fromBlock: 0,
        toBlock: 'latest'
    })

    const tokenData = {}

    // Add all tokens from Binds
    for (const event of bindEvents) {
        const decodedData = abiDecoder.decodeMethod(event.returnValues.data)

        const token = decodedData.params[0].value
        const balance = decodedData.params[1].value.toString()
        const weight = decodedData.params[2].value.toString()

        // console.log(decodedData)

        tokenData[token] = {
            balance, weight
        }
    }

    // Update from setParams
    for (const event of setParamsEvents) {
        const decodedData = abiDecoder.decodeMethod(event.returnValues.data)

        const token = decodedData.params[0].value
        const balance = decodedData.params[1].value.toString()
        const weight = decodedData.params[2].value.toString()

        // console.log(decodedData)

        tokenData[token] = {
            balance, weight
        }
    }

    // Update token data with actual balances
    Object.keys(tokenData).forEach(async (key) => {
        const tokenContract = new web3.eth.Contract(TestToken.abi, key, { from: defaultAccount })
        tokenData[key].balance = await tokenContract.methods.balanceOf(contractAddress).call()
    })

    return {
        result: 'success',
        data: tokenData
    }
}

export async function bindToken(provider, contractAddress, token, balance, weight) {
    const { web3Provider } = provider
    const web3 = new Web3(web3Provider)
    const { defaultAccount } = web3Provider.eth
    const bPool = new web3.eth.Contract(
        BPool.output.abi,
        contractAddress,
        {
            from: defaultAccount
        })

    const tokenContract = new web3.eth.Contract(TestToken.abi, token, { from: defaultAccount })

    const { BN } = web3.utils

    try {
        // const balanceBN = new BN(balance)

        // const currentApproval = await tokenContract.methods.allowance(defaultAccount, contractAddress).call()

        // const currentApprovalBN = new BN(currentApproval)
        // let approveTx

        // // If current approval is less than the balance, approve more tokens
        // if (currentApproval < balance) {
        //     approveTx = await tokenContract.methods.approve(contractAddress, balanceBN.sub(currentApprovalBN).toString()).send()
        // }


        const approveTx = await tokenContract.methods.approve(contractAddress, balance).send()
        const bindTx = await bPool.methods.bind(token, balance, weight).send()

        const result = {
            contractAddress,
            approveTx,
            bindTx
        }

        return {
            result: 'success',
            data: result
        }
    } catch (e) {
        // Dispatch Failure
        return {
            result: 'failure',
            error: e
        }
    }
}

export async function setTokenParams(provider, contractAddress, token, balance, weight) {
    const { web3Provider } = provider
    const web3 = new Web3(web3Provider)
    const { defaultAccount } = web3Provider.eth
    const { BN } = web3.utils

    const bPool = new web3.eth.Contract(
        BPool.output.abi,
        contractAddress,
        {
            from: defaultAccount
        })
    const tokenContract = new web3.eth.Contract(TestToken.abi, token, { from: defaultAccount })

    try {
        // const balanceBN = new BN(balance)

        // const currentApproval = await tokenContract.methods.allowance(defaultAccount, contractAddress).call()
        // const contractBalance = await tokenContract.methods.balanceOf(contractAddress).call()

        // const currentApprovalBN = new BN(currentApproval)
        // const contractBalanceBN = new BN(contractBalance)

        // let approveTx

        // if (contractBalanceBN < balanceBN) {
        //     const balanceDifferenceBN = balanceBN.sub(contractBalanceBN)
        //     const balanceDifference = balanceDifferenceBN.toString()
        //     if (currentApprovalBN < balanceDifference) {
        //         // Approve overrides the previous approval
        //         approveTx = await tokenContract.methods.approve(contractAddress, balanceDifference).send()
        //     }
        // }


        // You can make multiple calls in here and dispatch each individually
        const approveTx = await tokenContract.methods.approve(contractAddress, balance).send()
        const bindTx = await bPool.methods.setParams(token, balance, weight).send()

        // Dispatch Success
        return {
            result: 'success',
            data: {
                contractAddress,
                approveTx,
                bindTx
            }
        }
    } catch (e) {
        // Dispatch Failure
        return {
            result: 'failure',
            data: { contractAddress, error: e }
        }
    }
}

export async function swapExactAmountIn(provider, contractAddress, Ti, Ai, To, Lo, LP) {
    const { web3Provider } = provider
    const web3 = new Web3(web3Provider)
    const { defaultAccount } = web3Provider.eth

    const bPool = new web3.eth.Contract(
        BPool.output.abi,
        contractAddress,
        {
            from: defaultAccount
        })
    const tokenIn = new web3.eth.Contract(TestToken.abi, Ti, { from: defaultAccount })

    try {
        await tokenIn.methods.approve(contractAddress, Ai).send()
        await bPool.methods.swap_ExactAmountIn(Ti, Ai, To, Lo, LP).send()

        // Dispatch Success
        return {
            result: 'success'
        }
    } catch (e) {
        // Dispatch Failure
        return {
            result: 'failure',
            data: { error: e }
        }
    }
}