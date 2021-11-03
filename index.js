const { Requester, Validator } = require('@chainlink/external-adapter')
const { ethers } = require('ethers')
const ProducerABI = require('./abis/Producer.json')
require('dotenv').config()

// Define custom error scenarios for the API.
// Return true for the adapter to retry.
const customError = (data) => {
   if (data.Response === 'Error') return true
   return false
}

const gasOpts = { gasLimit: '0x7a1200', gasPrice: '0x5d21dba00' }

const customParams = {
   chunkId: ['chunkId'], 
}

function getProducerContract() {
   const producerAddress = process.env.PRODUCER_ADDRESS
   const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_HOST)
   const producerInterface = new ethers.utils.Interface(ProducerABI.abi)
   const Producer = new ethers.Contract(producerAddress, producerInterface, provider)
   return Producer
}

function getGlobalVRF(producer) {
   // getGlobalVRF()
}
function getChunkSize(producer) {
   // getChunkSize()
}
//function getMaxProducers(producer) {}

function getProducerVRF(producer, producerId) {
   // getValue(producerId)
}

async function createRequest(input, callback)  {
  // The Validator helps you validate the Chainlink request data
   const validator = new Validator(input, customParams)
   if (validator.error) throw validator.error
   const jobRunID = validator.validated.id

   const chunkId = validator.validated.chunkId 

   const url = `http://localhost:8888/random/`

   const Producer = getProducerContract()

   console.log(result)
   
   const params = {
   }
   const config = {
      url,
      params
   }

   Requester.request(config, customError)
      .then(response => {

         response.data.result = Requester.validateResultNumber(response.data.count, [])
         console.log(response.data.result)
         callback(response.status, Requester.success(jobRunID, response))
      })
      .catch(error => {
         callback(500, Requester.errored(jobRunID, error))
      })
}
module.exports.createRequest = createRequest
