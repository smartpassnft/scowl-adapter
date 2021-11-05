const { Requester, Validator } = require('@chainlink/external-adapter')
const { ethers } = require('ethers')
const ProducerABI = require('./abis/Producer.json')
const axios = require('axios')
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

async function getGlobalVRF(producer) {
   const globalVRF = await producer.getGlobalVRF(gasOpts)
   return globalVRF 
}
async function getChunkSize(producer) {
   const chunkSize = await producer.getChunkSize(gasOpts)
   return chunkSize.toNumber()
}
async function getProducerVRF(producer, producerId) {
   const producerVRF = await producer.getValue(producerId, gasOpts)
   return producerVRF
}
//function getMaxProducers(producer) {}

const MAX_UINT256 = ethers.BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")

function createUrl(hexNum) {
   return `http://localhost:8888/random/${hexNum}`
}

function getRandom(x,y) {
   return (x.mul(y)).mod(MAX_UINT256)
}


async function createRequest(input, callback)  {
  // The Validator helps you validate the Chainlink request data
   const validator = new Validator(input, customParams)
   if (validator.error) throw validator.error
   const jobRunID = validator.validated.id

   const chunkId = validator.validated.data.chunkId 
   const Producer = getProducerContract()
   const chunkSize = await getChunkSize(Producer)
   const start = chunkId * chunkSize
   const end = start + chunkSize

   const globalVRF = await getGlobalVRF(Producer)
   const words = []
   var url;
   for (var i = start; i < end; i++ ) {

      // get producer VRF
      var prodVRF
      try { // assumes empty produce implies all past are empty (not minted) as well
         prodVRF = await getProducerVRF(Producer, i)
      } catch {
         console.log("Producer ", i, " does not exist")
         break;
      }

      // get random number from scowldb
      var random = getRandom(globalVRF, prodVRF)
      var config = {
         url: createUrl(random),
      }
      var response
      try {
         response = await axios(config)
      } catch (error) { 
         throw new AdapterError({ message: error.message, cause: error })
      }
      if (response.data.error) {
         const message = `Could not retrieve valid data: ${JSON.stringify(response.data)}`
         logger.error(message)
         const cause = response.data.error 
         throw new AdapterError({ message, cause })
      }

      // aggreate words
      words.push(response.data.word)
   }

   // build response
   const produced = words.length
   const wordBytes = words.join(',')
   var resp = { 
      jobRunID,
      data: { 
         result: {
            produced,
            words: wordBytes
         }
      },
      status: 200
   }

   callback(resp.status, Requester.success(jobRunID, resp))

}
module.exports.createRequest = createRequest
